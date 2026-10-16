import csv
import io
import math

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_business
from ..models import Business, Product, Variant
from ..schemas_catalog import ProductIn, ProductOut, ProductUpdate

router = APIRouter(prefix="/api/products", tags=["products"])

MAX_PRODUCTS = 500
CSV_HEADERS = ["name", "price", "category", "size", "colour", "stock"]
CSV_MAX_BYTES = 1_000_000
CSV_MAX_ROWS = 2000


def product_out(p: Product) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "price": p.price,
        "category": p.category,
        "variants": [{"size": v.size, "colour": v.colour, "stock": v.stock} for v in p.variants],
    }


def get_owned_product(db: Session, business: Business, product_id: int) -> Product:
    """Load a product ONLY if it belongs to the logged-in business."""
    p = db.get(Product, product_id)
    if p is None or p.business_id != business.id:
        raise HTTPException(status_code=404, detail="Product not found.")
    return p


def name_taken(db: Session, business_id: int, name: str, exclude_id: int | None = None) -> bool:
    q = select(Product.id).where(
        Product.business_id == business_id, func.lower(Product.name) == name.lower()
    )
    if exclude_id is not None:
        q = q.where(Product.id != exclude_id)
    return db.scalar(q) is not None


def count_products(db: Session, business_id: int) -> int:
    return db.scalar(select(func.count(Product.id)).where(Product.business_id == business_id)) or 0


@router.get("", response_model=list[ProductOut])
def list_products(business: Business = Depends(get_current_business), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Product)
        .where(Product.business_id == business.id)
        .options(selectinload(Product.variants))
        .order_by(Product.id.desc())
    ).all()
    return [product_out(p) for p in rows]


@router.post("", response_model=ProductOut)
def create_product(
    data: ProductIn,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    if count_products(db, business.id) >= MAX_PRODUCTS:
        raise HTTPException(status_code=400, detail=f"Product limit reached ({MAX_PRODUCTS}).")
    if name_taken(db, business.id, data.name):
        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists. Edit it to add more sizes or colours.",
        )
    product = Product(
        business_id=business.id,
        name=data.name,
        price=data.price,
        category=data.category,
        variants=[Variant(size=v.size, colour=v.colour, stock=v.stock) for v in data.variants],
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_out(product)


# NOTE: /upload is defined before /{product_id} routes on purpose.
@router.post("/upload")
def upload_products(
    file: UploadFile = File(...),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    raw = file.file.read(CSV_MAX_BYTES + 1)
    if len(raw) > CSV_MAX_BYTES:
        raise HTTPException(status_code=400, detail="File is too large (max 1 MB).")
    if not raw.strip():
        raise HTTPException(status_code=400, detail="The selected CSV file is empty.")

    try:
        text = raw.decode("utf-8-sig")        # utf-8, also removes Excel's invisible BOM
    except UnicodeDecodeError:
        text = raw.decode("cp1252", errors="replace")   # older Excel files

    rows = list(csv.reader(io.StringIO(text)))
    header = [h.strip().lower() for h in rows[0]] if rows else []
    if header[: len(CSV_HEADERS)] != CSV_HEADERS:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV headers. Required headers: name,price,category,size,colour,stock",
        )
    if len(rows) - 1 > CSV_MAX_ROWS:
        raise HTTPException(status_code=400, detail=f"Too many rows (max {CSV_MAX_ROWS}).")

    # All of this business's products, by lowercase name, so same-name rows merge.
    existing = db.scalars(
        select(Product)
        .where(Product.business_id == business.id)
        .options(selectinload(Product.variants))
    ).all()
    by_name = {p.name.lower(): p for p in existing}

    touched: set[str] = set()
    imported_variants = 0
    rejected: list[dict] = []

    for number, row in enumerate(rows[1:], start=2):   # row 1 is the header
        if not any(cell.strip() for cell in row):
            continue                                    # skip blank lines silently
        if len(row) < 6:
            rejected.append({"row": number, "reason": f"Expected 6 columns, found {len(row)}"})
            continue

        name, price_raw, category, size, colour, stock_raw = (c.strip() for c in row[:6])

        if not name:
            rejected.append({"row": number, "reason": "Missing product name"}); continue
        if len(name) > 120:
            rejected.append({"row": number, "reason": "Product name is too long"}); continue
        if len(category) > 60 or len(size) > 20 or len(colour) > 40:
            rejected.append({"row": number, "reason": "Category, size or colour is too long"}); continue

        cleaned = price_raw.replace("₹", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
        try:
            price = float(cleaned)
        except ValueError:
            rejected.append({"row": number, "reason": "Price is not a number"}); continue
        if not math.isfinite(price) or price < 0 or price > 10_000_000:
            rejected.append({"row": number, "reason": "Price is out of range"}); continue

        try:
            stock = int(stock_raw) if stock_raw else 0
        except ValueError:
            rejected.append({"row": number, "reason": "Stock is not a whole number"}); continue
        if stock < 0 or stock > 1_000_000:
            rejected.append({"row": number, "reason": "Stock is out of range"}); continue

        size = size or "Standard"
        colour = colour or "Default"
        key = name.lower()
        product = by_name.get(key)

        if product is None:
            if len(by_name) >= MAX_PRODUCTS:
                rejected.append({"row": number, "reason": f"Product limit reached ({MAX_PRODUCTS})"}); continue
            product = Product(business_id=business.id, name=name, price=price, category=category or "Imported")
            db.add(product)
            by_name[key] = product

        # same size+colour again -> update its stock instead of duplicating
        match = next(
            (v for v in product.variants if v.size.lower() == size.lower() and v.colour.lower() == colour.lower()),
            None,
        )
        if match:
            match.stock = stock
        else:
            product.variants.append(Variant(size=size, colour=colour, stock=stock))

        touched.add(key)
        imported_variants += 1

    db.commit()
    return {
        "imported_products": len(touched),
        "imported_variants": imported_variants,
        "rejected_rows": rejected,
    }


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    product = get_owned_product(db, business, product_id)
    changes = data.model_dump(exclude_unset=True)

    if changes.get("name") is not None:
        new_name = changes["name"].strip()
        if not new_name:
            raise HTTPException(status_code=422, detail="Product name cannot be empty")
        if name_taken(db, business.id, new_name, exclude_id=product.id):
            raise HTTPException(status_code=409, detail="Another product already has this name.")
        product.name = new_name
    if changes.get("price") is not None:
        product.price = changes["price"]
    if changes.get("category") is not None:
        product.category = changes["category"].strip()
    if changes.get("variants") is not None:
        # replace the whole list: what the owner sees is exactly what is saved
        product.variants = [
            Variant(size=v["size"].strip(), colour=v["colour"].strip(), stock=v["stock"])
            for v in changes["variants"]
        ]

    db.commit()
    db.refresh(product)
    return product_out(product)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db),
):
    product = get_owned_product(db, business, product_id)
    db.delete(product)
    db.commit()
    return {"ok": True}   # JSON body on purpose: the frontend always parses a JSON reply
