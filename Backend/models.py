from pydantic import BaseModel
from typing import List
from datetime import datetime


class SignupRequest(BaseModel):
    email: str
    password: str
    name:str
    last_name :str
    gender : str
    age : str

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class RoomCreate(BaseModel):
    OwnerName: str
    RoomPurpose: str
    Latitude: float
    Longitude: float
    DistanceAllowed: float
    
class PurposeDescription(BaseModel):
    Heading: str
    Value: str

class RoomResponseModel(BaseModel):
    RoomID: str
    UserID: int
    OwnerName: str
    RoomPurpose: str
    Latitude: float
    Longitude: float
    DistanceAllowed: float
    PurposeDescriptions: List[PurposeDescription]


class RoomResponseModel_two(BaseModel):
    RoomID: str
    UserID: int
    OwnerName: str
    RoomPurpose: str
    Latitude: float
    Longitude: float
    DistanceAllowed: float
    DistanceFromUser: float
    
class RoomResponseModel_three(BaseModel):
    RoomID: str
    UserID: int
    OwnerName: str
    RoomPurpose: str
    IsAdmin: bool

class UserResponseModel(BaseModel):
    UserID: int
    Name: str
    Gender: str
    Age: int


class RoomPurposeModel(BaseModel):
    Room_ID: str
    Purpose_Description_Heading: str
    Purpose_Description_Value: str


class PostChatModel(BaseModel):
    RoomID: str
    Chat: str

class ChatData(BaseModel):
    Username: str
    Message: str
    Timestamp: datetime