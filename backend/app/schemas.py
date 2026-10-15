from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

BusinessType = Literal["Clothing", "Salon", "Cafe", "Electronics", "Other"]


class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    business_name: str = Field(min_length=1, max_length=80)
    business_type: BusinessType

    @field_validator("name", "business_name")
    @classmethod
    def strip_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("This field cannot be empty")
        return v

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:   # bcrypt only reads the first 72 bytes
            raise ValueError("Password is too long (max 72 bytes)")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class TokenOut(BaseModel):
    token: str


class BusinessUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=2000)
    hours: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    contact: str | None = Field(default=None, max_length=200)


class BusinessOut(BaseModel):
    id: int
    name: str
    type: str
    description: str
    hours: str
    city: str
    contact: str
    telegram_link: str
