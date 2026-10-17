from pydantic import BaseModel, Field, field_validator


class TestChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class TestChatOut(BaseModel):
    reply: str
