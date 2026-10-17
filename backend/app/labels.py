"""What to call a product's two option fields, depending on the kind of business.

Inside the database they are always called `size` and `colour` (so the CSV format and the
API never change). Only the WORDS shown to people change: a cafe asks for a Size and a Type
(Hot / Iced), a clothing shop asks for a Size and a Colour.
"""

LABELS = {
    "Clothing":    {"first": "Size",   "second": "Colour"},
    "Cafe":        {"first": "Size",   "second": "Type"},
    "Salon":       {"first": "Option", "second": "Style"},
    "Electronics": {"first": "Model",  "second": "Colour"},
    "Other":       {"first": "Option", "second": "Variant"},
}


def labels_for(business_type: str) -> dict:
    return LABELS.get(business_type, LABELS["Other"])
