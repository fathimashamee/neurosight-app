from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    mobile: str | None = None
    role: str = "Clinician"
    status: bool = True

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str
    mobile: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str | None
    role: str
    mobile: str | None
    status: bool = True
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    status: bool | None = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
