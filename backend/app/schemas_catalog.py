from pydantic import BaseModel, Field, field_validator


class VariantIn(BaseModel):
    size: str = Field(default="", max_length=20)
    colour: str = Field(default="", max_length=40)
    stock: int = Field(default=0, ge=0, le=1_000_000)

    @field_validator("size", "colour")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    price: float = Field(ge=0, le=10_000_000)
    category: str = Field(default="", max_length=60)
    variants: list[VariantIn] = Field(default_factory=list, max_length=100)

    @field_validator("name", "category")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v:
            raise ValueError("Product name cannot be empty")
        return v


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    price: float | None = Field(default=None, ge=0, le=10_000_000)
    category: str | None = Field(default=None, max_length=60)
    variants: list[VariantIn] | None = Field(default=None, max_length=100)


class VariantOut(BaseModel):
    size: str
    colour: str
    stock: int


class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    category: str
    variants: list[VariantOut]


class FaqIn(BaseModel):
    question: str = Field(min_length=3, max_length=300)
    answer: str = Field(min_length=1, max_length=2000)

    @field_validator("question", "answer")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field cannot be empty")
        return v


class FaqOut(BaseModel):
    id: int
    question: str
    answer: str


class FaqGenerateIn(BaseModel):
    text: str = Field(min_length=20, max_length=6000)
