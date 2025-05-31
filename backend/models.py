from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime, date
from enum import Enum
from pydantic import validator

# Enums for better type safety
class ItemType(str, Enum):
    LOST = "lost"
    FOUND = "found"

class ItemCategory(str, Enum):
    ELECTRONICS = "electronics"
    BAGS = "bags"
    JEWELRY = "jewelry"
    CLOTHING = "clothing"
    PERSONAL = "personal"
    BOOKS = "books"
    SPORTS = "sports"
    OTHER = "other"

class UrgencyLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ItemStatus(str, Enum):
    ACTIVE = "active"
    CLAIMED = "claimed"
    RESOLVED = "resolved"
    ARCHIVED = "archived"

class ClaimStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"

# User Models
class UserProfile(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    student_id: Optional[str] = None
    employee_id: Optional[str] = None
    phone_number: Optional[str] = None
    user_type: str = "STUDENT"
    account_status: str = "ACTIVE"
    profile_image_url: Optional[str] = None
    bio: Optional[str] = None
    email_verified: bool = False
    last_login: Optional[datetime] = None
    preferences: Optional[dict] = None
    stats: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_admin: Optional[bool] = False
    full_name: Optional[str] = None

    @validator('full_name', always=True)
    def set_full_name(cls, v, values):
        if v is None:
            first_name = values.get('first_name', '')
            last_name = values.get('last_name', '')
            return f"{first_name} {last_name}".strip()
        return v

    @validator('is_admin', always=True)
    def set_is_admin(cls, v, values):
        if v is None:
            user_type = values.get('user_type', 'STUDENT')
            return user_type == 'ADMIN'
        return v

    @property
    def avatar_url(self) -> Optional[str]:
        return self.profile_image_url

class UserProfileCreate(BaseModel):
    email: str
    full_name: str
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

# Item Models
class ItemBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=2000)
    category: ItemCategory
    location: str = Field(..., min_length=2, max_length=100)
    images: List[str] = Field(default_factory=list)
    reward: Optional[int] = Field(default=0, ge=0)
    urgency: UrgencyLevel = UrgencyLevel.MEDIUM

class ItemCreate(ItemBase):
    type: ItemType
    date_lost: Optional[date] = None
    time_lost: Optional[str] = None
    contact_preference: Literal["email", "phone"] = "email"

class ItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    category: Optional[ItemCategory] = None
    location: Optional[str] = Field(None, min_length=2, max_length=100)
    reward: Optional[int] = Field(None, ge=0)
    urgency: Optional[UrgencyLevel] = None
    status: Optional[ItemStatus] = None

class Item(ItemBase):
    id: str
    type: ItemType
    user_id: str
    date_lost: Optional[date] = None
    time_lost: Optional[str] = None
    status: ItemStatus = ItemStatus.ACTIVE
    created_at: datetime
    updated_at: datetime
    
    # Frontend compatibility
    image: Optional[str] = None  # First image for display
    
    # Computed fields
    owner_name: Optional[str] = None
    owner_email: Optional[str] = None

# Claim Request Models
class ClaimRequestBase(BaseModel):
    message: str = Field(..., min_length=10, max_length=1000)

class ClaimRequestCreate(ClaimRequestBase):
    item_id: str

class ClaimRequest(ClaimRequestBase):
    id: str
    item_id: str
    claimer_id: str
    status: ClaimStatus = ClaimStatus.PENDING
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    claimer_name: Optional[str] = None
    claimer_email: Optional[str] = None
    item_title: Optional[str] = None

class ClaimRequestUpdate(BaseModel):
    status: ClaimStatus
    admin_notes: Optional[str] = None

# Response Models
class ItemListResponse(BaseModel):
    items: List[Item]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool

class DashboardStats(BaseModel):
    total_items_posted: int
    items_recovered: int
    helping_others: int
    success_rate: float

class DashboardData(BaseModel):
    stats: DashboardStats
    recent_items: List[Item]
    claim_requests: List[ClaimRequest]

# Search and Filter Models
class ItemSearchParams(BaseModel):
    search: Optional[str] = None
    category: Optional[ItemCategory] = None
    location: Optional[str] = None
    urgency: Optional[UrgencyLevel] = None
    has_reward: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=12, ge=1, le=50)

# Authentication Models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

# File Upload Models
class ImageUploadResponse(BaseModel):
    url: str
    public_url: str
    path: str

# Messaging Models
class MessageBase(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)

class MessageCreate(MessageBase):
    claim_request_id: str

class Message(MessageBase):
    id: str
    claim_request_id: str
    sender_id: str
    is_read: bool = False
    created_at: datetime
    
    # Computed fields
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None

class ConversationResponse(BaseModel):
    claim_request: ClaimRequest
    messages: List[Message]
    item: Item
    participants: List[UserProfile]

class ConversationListResponse(BaseModel):
    conversations: List[dict]  # Simplified conversation data for list view
    total: int 