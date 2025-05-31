from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import logging
from pathlib import Path
import uuid
from datetime import datetime, date
import os
import aiofiles
from PIL import Image
import io

# Import our custom modules
from config import settings
from database import get_supabase, get_supabase_admin
from models import *

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Lost & Found Portal API",
    description="API for UMT Lost & Found Portal",
    version="1.0.0"
)

# Create API router
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from Supabase JWT"""
    try:
        supabase = get_supabase()
        
        # Get user from token
        user = supabase.auth.get_user(credentials.credentials)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", user.user.id).execute()
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        return profile_response.data[0]
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# Optional authentication (for public endpoints)
async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(credentials)
    except:
        return None

# Health check
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Authentication endpoints
@api_router.post("/auth/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """Register a new user"""
    try:
        supabase = get_supabase()
        
        # Check if email is university email (basic validation)
        if not request.email.endswith('@umt.edu'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please use your university email address"
            )
        
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "full_name": request.full_name
                }
            }
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
        
        # Get created profile
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            user=UserProfile(**profile_response.data[0])
        )
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login user"""
    try:
        supabase = get_supabase()
        
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            user=UserProfile(**profile_response.data[0])
        )
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

@api_router.get("/auth/me", response_model=UserProfile)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get current user profile"""
    return UserProfile(**current_user)

# Items endpoints
@api_router.get("/items", response_model=ItemListResponse)
async def get_items(
    type: Optional[ItemType] = Query(None, description="Filter by item type"),
    category: Optional[ItemCategory] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    urgency: Optional[UrgencyLevel] = Query(None, description="Filter by urgency"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    has_reward: Optional[bool] = Query(None, description="Filter items with rewards"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(12, ge=1, le=50, description="Items per page")
):
    """Get list of items with filtering and pagination"""
    try:
        supabase = get_supabase()
        
        # Build query
        query = supabase.table("items").select("""
            *,
            profiles!items_user_id_fkey(full_name, email)
        """).eq("status", "active")
        
        # Apply filters
        if type:
            query = query.eq("type", type.value)
        if category:
            query = query.eq("category", category.value)
        if location:
            query = query.ilike("location", f"%{location}%")
        if urgency:
            query = query.eq("urgency", urgency.value)
        if has_reward:
            query = query.gt("reward", 0) if has_reward else query.eq("reward", 0)
        if search:
            query = query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
        
        # Get total count
        count_response = query.execute()
        total = len(count_response.data) if count_response.data else 0
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        response = query.execute()
        
        # Transform data
        items = []
        for item_data in response.data:
            item_dict = item_data.copy()
            if item_data.get("profiles"):
                item_dict["owner_name"] = item_data["profiles"]["full_name"]
                item_dict["owner_email"] = item_data["profiles"]["email"]
                del item_dict["profiles"]
            items.append(Item(**item_dict))
        
        return ItemListResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            has_next=offset + per_page < total,
            has_prev=page > 1
        )
        
    except Exception as e:
        logger.error(f"Error fetching items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching items"
        )

@api_router.get("/items/{item_id}", response_model=Item)
async def get_item(item_id: str):
    """Get single item by ID"""
    try:
        supabase = get_supabase()
        
        # Increment view count
        supabase.rpc("increment_item_view_count", {"item_uuid": item_id}).execute()
        
        # Get item with owner info
        response = supabase.table("items").select("""
            *,
            profiles!items_user_id_fkey(full_name, email)
        """).eq("id", item_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        item_data = response.data[0]
        if item_data.get("profiles"):
            item_data["owner_name"] = item_data["profiles"]["full_name"]
            item_data["owner_email"] = item_data["profiles"]["email"]
            del item_data["profiles"]
        
        return Item(**item_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching item"
        )

@api_router.post("/items", response_model=Item)
async def create_item(item: ItemCreate, current_user = Depends(get_current_user)):
    """Create a new item"""
    try:
        supabase = get_supabase()
        
        item_data = item.dict()
        item_data["user_id"] = current_user["id"]
        
        response = supabase.table("items").insert(item_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create item"
            )
        
        created_item = response.data[0]
        created_item["owner_name"] = current_user["full_name"]
        created_item["owner_email"] = current_user["email"]
        
        return Item(**created_item)
        
    except Exception as e:
        logger.error(f"Error creating item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating item: {str(e)}"
        )

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_update: ItemUpdate, current_user = Depends(get_current_user)):
    """Update an item"""
    try:
        supabase = get_supabase()
        
        # Check if user owns the item
        existing_item = supabase.table("items").select("user_id").eq("id", item_id).execute()
        if not existing_item.data or existing_item.data[0]["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this item"
            )
        
        # Update item
        update_data = {k: v for k, v in item_update.dict().items() if v is not None}
        response = supabase.table("items").update(update_data).eq("id", item_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        updated_item = response.data[0]
        updated_item["owner_name"] = current_user["full_name"]
        updated_item["owner_email"] = current_user["email"]
        
        return Item(**updated_item)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating item: {str(e)}"
        )

# File upload endpoint
@api_router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile = File(...), current_user = Depends(get_current_user)):
    """Upload an image for an item"""
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read and validate image
        content = await file.read()
        try:
            image = Image.open(io.BytesIO(content))
            image.verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1].lower()
        filename = f"{current_user['id']}/{uuid.uuid4()}.{file_extension}"
        
        # Upload to Supabase Storage
        supabase = get_supabase()
        storage_response = supabase.storage.from_("item-images").upload(filename, content)
        
        if storage_response.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to upload image"
            )
        
        # Get public URL
        public_url = supabase.storage.from_("item-images").get_public_url(filename)
        
        return ImageUploadResponse(
            url=public_url,
            public_url=public_url,
            path=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error uploading image"
        )

# Dashboard endpoint
@api_router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(current_user = Depends(get_current_user)):
    """Get user dashboard data"""
    try:
        supabase = get_supabase()
        
        # Get user's items
        items_response = supabase.table("items").select("*").eq("user_id", current_user["id"]).execute()
        user_items = items_response.data or []
        
        # Get claim requests for user's items
        claims_response = supabase.table("claim_requests").select("""
            *,
            items!claim_requests_item_id_fkey(title),
            profiles!claim_requests_claimer_id_fkey(full_name, email)
        """).in_("item_id", [item["id"] for item in user_items]).execute()
        
        claim_requests = []
        for claim_data in claims_response.data or []:
            claim_dict = claim_data.copy()
            if claim_data.get("items"):
                claim_dict["item_title"] = claim_data["items"]["title"]
                del claim_dict["items"]
            if claim_data.get("profiles"):
                claim_dict["claimer_name"] = claim_data["profiles"]["full_name"]
                claim_dict["claimer_email"] = claim_data["profiles"]["email"]
                del claim_dict["profiles"]
            claim_requests.append(ClaimRequest(**claim_dict))
        
        # Calculate stats
        total_items = len(user_items)
        recovered_items = len([item for item in user_items if item["status"] == "resolved"])
        helping_others = len([item for item in user_items if item["type"] == "found"])
        success_rate = (recovered_items / total_items * 100) if total_items > 0 else 0
        
        stats = DashboardStats(
            total_items_posted=total_items,
            items_recovered=recovered_items,
            helping_others=helping_others,
            success_rate=round(success_rate, 1)
        )
        
        # Transform recent items
        recent_items = []
        for item_data in user_items[:5]:  # Last 5 items
            item_data["owner_name"] = current_user["full_name"]
            item_data["owner_email"] = current_user["email"]
            recent_items.append(Item(**item_data))
        
        return DashboardData(
            stats=stats,
            recent_items=recent_items,
            claim_requests=claim_requests
        )
        
    except Exception as e:
        logger.error(f"Error fetching dashboard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching dashboard data"
        )

# Claim endpoints
@api_router.post("/claims", response_model=ClaimRequest)
async def create_claim_request(claim: ClaimRequestCreate, current_user = Depends(get_current_user)):
    """Create a claim request for an item"""
    try:
        supabase = get_supabase()
        
        # Check if item exists and is active
        item_response = supabase.table("items").select("*").eq("id", claim.item_id).execute()
        if not item_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        item = item_response.data[0]
        if item["user_id"] == current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot claim your own item"
            )
        
        if item["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item is not available for claiming"
            )
        
        # Create claim request
        claim_data = claim.dict()
        claim_data["claimer_id"] = current_user["id"]
        
        response = supabase.table("claim_requests").insert(claim_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create claim request"
            )
        
        created_claim = response.data[0]
        created_claim["claimer_name"] = current_user["full_name"]
        created_claim["claimer_email"] = current_user["email"]
        created_claim["item_title"] = item["title"]
        
        # Create notification for item owner
        supabase.rpc("create_notification", {
            "p_user_id": item["user_id"],
            "p_title": "New Claim Request",
            "p_message": f"Someone wants to claim your {item['type']} item: {item['title']}",
            "p_type": "item_claimed",
            "p_related_item_id": claim.item_id,
            "p_related_claim_id": created_claim["id"]
        }).execute()
        
        return ClaimRequest(**created_claim)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating claim: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error creating claim: {str(e)}"
        )

# Admin dependency
async def get_admin_user(current_user = Depends(get_current_user)):
    """Check if current user is admin"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Admin endpoints
@api_router.get("/admin/stats")
async def get_admin_stats(admin_user = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    try:
        supabase = get_supabase_admin()
        
        # Get user count
        users_response = supabase.table("profiles").select("id", count="exact").execute()
        total_users = users_response.count
        
        # Get items count by status
        items_response = supabase.table("items").select("status", count="exact").execute()
        active_items = len([item for item in items_response.data if item["status"] == "active"])
        resolved_items = len([item for item in items_response.data if item["status"] == "resolved"])
        
        # Get pending claims
        claims_response = supabase.table("claim_requests").select("status", count="exact").eq("status", "pending").execute()
        pending_claims = claims_response.count
        
        # Calculate success rate
        total_items = len(items_response.data)
        success_rate = (resolved_items / total_items * 100) if total_items > 0 else 0
        
        return {
            "total_users": total_users,
            "active_items": active_items,
            "resolved_items": resolved_items,
            "pending_claims": pending_claims,
            "success_rate": round(success_rate, 1),
            "total_items": total_items
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching admin statistics"
        )

@api_router.get("/admin/items")
async def get_admin_items(
    status: Optional[str] = Query(None),
    flagged_only: bool = Query(False),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin_user = Depends(get_admin_user)
):
    """Get all items for admin review"""
    try:
        supabase = get_supabase_admin()
        
        query = supabase.table("items").select("""
            *,
            profiles!items_user_id_fkey(full_name, email)
        """)
        
        if status:
            query = query.eq("status", status)
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        response = query.execute()
        
        # Transform data
        items = []
        for item_data in response.data:
            item_dict = item_data.copy()
            if item_data.get("profiles"):
                item_dict["owner_name"] = item_data["profiles"]["full_name"]
                item_dict["owner_email"] = item_data["profiles"]["email"]
                del item_dict["profiles"]
            items.append(item_dict)
        
        return {
            "items": items,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching items"
        )

@api_router.get("/admin/claims")
async def get_admin_claims(
    status: Optional[str] = Query("pending"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin_user = Depends(get_admin_user)
):
    """Get all claim requests for admin review"""
    try:
        supabase = get_supabase_admin()
        
        query = supabase.table("claim_requests").select("""
            *,
            items!claim_requests_item_id_fkey(title, type),
            claimer:profiles!claim_requests_claimer_id_fkey(full_name, email),
            owner:items!claim_requests_item_id_fkey(profiles!items_user_id_fkey(full_name, email))
        """)
        
        if status:
            query = query.eq("status", status)
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        response = query.execute()
        
        # Transform data
        claims = []
        for claim_data in response.data:
            claim_dict = claim_data.copy()
            if claim_data.get("items"):
                claim_dict["item_title"] = claim_data["items"]["title"]
                claim_dict["item_type"] = claim_data["items"]["type"]
            if claim_data.get("claimer"):
                claim_dict["claimer_name"] = claim_data["claimer"]["full_name"]
                claim_dict["claimer_email"] = claim_data["claimer"]["email"]
            # Clean up nested objects
            claim_dict.pop("items", None)
            claim_dict.pop("claimer", None)
            claim_dict.pop("owner", None)
            claims.append(claim_dict)
        
        return {
            "claims": claims,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin claims: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching claims"
        )

@api_router.put("/admin/claims/{claim_id}")
async def update_claim_status(
    claim_id: str,
    claim_update: ClaimRequestUpdate,
    admin_user = Depends(get_admin_user)
):
    """Update claim status (admin action)"""
    try:
        supabase = get_supabase_admin()
        
        update_data = claim_update.dict()
        response = supabase.table("claim_requests").update(update_data).eq("id", claim_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Claim not found"
            )
        
        # Get claim details for notification
        claim = response.data[0]
        
        # Create notification for claimer
        if claim_update.status == ClaimStatus.APPROVED:
            supabase.rpc("create_notification", {
                "p_user_id": claim["claimer_id"],
                "p_title": "Claim Approved",
                "p_message": "Your claim request has been approved by admin.",
                "p_type": "claim_approved",
                "p_related_claim_id": claim_id
            }).execute()
        elif claim_update.status == ClaimStatus.REJECTED:
            supabase.rpc("create_notification", {
                "p_user_id": claim["claimer_id"],
                "p_title": "Claim Rejected",
                "p_message": "Your claim request has been rejected by admin.",
                "p_type": "claim_rejected",
                "p_related_claim_id": claim_id
            }).execute()
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating claim: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating claim: {str(e)}"
        )

@api_router.put("/admin/items/{item_id}/status")
async def update_item_status_admin(
    item_id: str,
    new_status: ItemStatus,
    admin_user = Depends(get_admin_user)
):
    """Update item status (admin action)"""
    try:
        supabase = get_supabase_admin()
        
        response = supabase.table("items").update({"status": new_status.value}).eq("id", item_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating item status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating item status: {str(e)}"
        )

@api_router.get("/admin/users")
async def get_admin_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin_user = Depends(get_admin_user)
):
    """Get all users for admin management"""
    try:
        supabase = get_supabase_admin()
        
        query = supabase.table("profiles").select("*")
        
        if search:
            query = query.or_(f"full_name.ilike.%{search}%,email.ilike.%{search}%")
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        response = query.execute()
        
        return {
            "users": response.data,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching users"
        )

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    is_admin: bool,
    admin_user = Depends(get_admin_user)
):
    """Update user admin status"""
    try:
        supabase = get_supabase_admin()
        
        response = supabase.table("profiles").update({"is_admin": is_admin}).eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating user role: {str(e)}"
        )

@api_router.get("/admin/disputes")
async def get_admin_disputes(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin_user = Depends(get_admin_user)
):
    """Get all disputes for admin review"""
    try:
        supabase = get_supabase_admin()
        
        # For now, we'll create a disputes table structure
        # This would need to be added to the schema
        query = supabase.table("disputes").select("""
            *,
            items!disputes_item_id_fkey(title, type),
            owner:profiles!disputes_owner_id_fkey(full_name, email)
        """)
        
        if status:
            query = query.eq("status", status)
        if priority:
            query = query.eq("priority", priority)
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.order("created_at", desc=True).range(offset, offset + per_page - 1)
        
        response = query.execute()
        
        return {
            "disputes": response.data,
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin disputes: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching disputes"
        )

@api_router.put("/admin/disputes/{dispute_id}")
async def update_dispute_status(
    dispute_id: str,
    action: str,
    note: Optional[str] = None,
    admin_user = Depends(get_admin_user)
):
    """Update dispute status and add admin notes"""
    try:
        supabase = get_supabase_admin()
        
        update_data = {
            "status": action,
            "last_activity": datetime.utcnow().isoformat(),
            "admin_notes": note
        }
        
        if action == "resolve":
            update_data["resolved_at"] = datetime.utcnow().isoformat()
            update_data["resolved_by"] = admin_user["id"]
        
        response = supabase.table("disputes").update(update_data).eq("id", dispute_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dispute not found"
            )
        
        # Create notifications for involved parties
        dispute = response.data[0]
        if action == "resolve":
            # Notify all parties about resolution
            supabase.rpc("create_notification", {
                "p_user_id": dispute["owner_id"],
                "p_title": "Dispute Resolved",
                "p_message": f"The dispute regarding your item has been resolved by admin.",
                "p_type": "dispute_resolved",
                "p_related_dispute_id": dispute_id
            }).execute()
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating dispute: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error updating dispute: {str(e)}"
        )

@api_router.post("/admin/items/{item_id}/moderate")
async def moderate_item(
    item_id: str,
    action: str,  # approve, reject, flag, archive
    note: Optional[str] = None,
    admin_user = Depends(get_admin_user)
):
    """Moderate an item with admin actions and notes"""
    try:
        supabase = get_supabase_admin()
        
        # Get current item
        item_response = supabase.table("items").select("*").eq("id", item_id).execute()
        if not item_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        item = item_response.data[0]
        
        # Update item status based on action
        update_data = {
            "moderation_status": action,
            "moderated_at": datetime.utcnow().isoformat(),
            "moderated_by": admin_user["id"],
            "moderation_notes": note
        }
        
        if action == "approve":
            update_data["status"] = "active"
        elif action == "reject":
            update_data["status"] = "rejected"
        elif action == "archive":
            update_data["status"] = "archived"
        elif action == "flag":
            update_data["flagged"] = True
            update_data["flag_reason"] = note
        
        response = supabase.table("items").update(update_data).eq("id", item_id).execute()
        
        # Create notification for item owner
        notification_messages = {
            "approve": "Your item has been approved and is now visible to other users.",
            "reject": "Your item submission has been rejected. Please review community guidelines.",
            "archive": "Your item has been archived by admin.",
            "flag": "Your item has been flagged for review. Please contact support if you have questions."
        }
        
        if action in notification_messages:
            supabase.rpc("create_notification", {
                "p_user_id": item["user_id"],
                "p_title": f"Item {action.title()}d",
                "p_message": notification_messages[action],
                "p_type": f"item_{action}",
                "p_related_item_id": item_id
            }).execute()
        
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error moderating item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error moderating item: {str(e)}"
        )

@api_router.get("/admin/flagged")
async def get_flagged_content(
    type: Optional[str] = Query(None, description="Filter by content type: item, claim, user"),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    admin_user = Depends(get_admin_user)
):
    """Get all flagged content for admin review"""
    try:
        supabase = get_supabase_admin()
        
        # Get flagged items
        flagged_items = []
        if not type or type == "item":
            items_response = supabase.table("items").select("""
                *,
                profiles!items_user_id_fkey(full_name, email)
            """).eq("flagged", True).execute()
            
            for item in items_response.data:
                flagged_items.append({
                    "id": item["id"],
                    "type": "item",
                    "title": item["title"],
                    "user": item["profiles"]["full_name"] if item.get("profiles") else "Unknown",
                    "email": item["profiles"]["email"] if item.get("profiles") else "Unknown",
                    "reason": item.get("flag_reason", "No reason provided"),
                    "flagged_by": "Admin/System",
                    "created_at": item["created_at"],
                    "severity": "high" if item.get("urgency") == "high" else "medium",
                    "action_required": True,
                    "report_count": 1
                })
        
        # Apply filters
        if severity:
            flagged_items = [item for item in flagged_items if item["severity"] == severity]
        
        # Apply pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_items = flagged_items[start:end]
        
        return {
            "flagged_content": paginated_items,
            "total": len(flagged_items),
            "page": page,
            "per_page": per_page
        }
        
    except Exception as e:
        logger.error(f"Error fetching flagged content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching flagged content"
        )

@api_router.post("/admin/flagged/{content_id}/action")
async def handle_flagged_content(
    content_id: str,
    action: str,  # approve, remove, escalate
    content_type: str,  # item, claim, user
    note: Optional[str] = None,
    admin_user = Depends(get_admin_user)
):
    """Take action on flagged content"""
    try:
        supabase = get_supabase_admin()
        
        if content_type == "item":
            if action == "approve":
                # Remove flag and approve item
                response = supabase.table("items").update({
                    "flagged": False,
                    "flag_reason": None,
                    "status": "active",
                    "moderated_by": admin_user["id"],
                    "moderation_notes": note
                }).eq("id", content_id).execute()
            elif action == "remove":
                # Archive/remove the item
                response = supabase.table("items").update({
                    "status": "removed",
                    "moderated_by": admin_user["id"],
                    "moderation_notes": note
                }).eq("id", content_id).execute()
        
        # Create audit log entry
        supabase.table("admin_actions").insert({
            "admin_id": admin_user["id"],
            "action": action,
            "content_type": content_type,
            "content_id": content_id,
            "notes": note,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        return {"success": True, "action": action}
        
    except Exception as e:
        logger.error(f"Error handling flagged content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error handling flagged content: {str(e)}"
        )

@api_router.get("/admin/analytics")
async def get_admin_analytics(
    timeframe: str = Query("7d", description="Time frame: 1d, 7d, 30d, 90d"),
    admin_user = Depends(get_admin_user)
):
    """Get analytics data for admin dashboard"""
    try:
        supabase = get_supabase_admin()
        
        # Calculate date range
        from datetime import timedelta
        end_date = datetime.utcnow()
        days = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}
        start_date = end_date - timedelta(days=days.get(timeframe, 7))
        
        # Get various metrics
        analytics = {}
        
        # User registrations over time
        users_response = supabase.table("profiles").select("created_at").gte(
            "created_at", start_date.isoformat()
        ).execute()
        analytics["new_users"] = len(users_response.data)
        
        # Items posted over time
        items_response = supabase.table("items").select("created_at, type, status").gte(
            "created_at", start_date.isoformat()
        ).execute()
        analytics["new_items"] = len(items_response.data)
        analytics["lost_items"] = len([i for i in items_response.data if i["type"] == "lost"])
        analytics["found_items"] = len([i for i in items_response.data if i["type"] == "found"])
        
        # Claims and success rates
        claims_response = supabase.table("claim_requests").select("created_at, status").gte(
            "created_at", start_date.isoformat()
        ).execute()
        analytics["new_claims"] = len(claims_response.data)
        analytics["approved_claims"] = len([c for c in claims_response.data if c["status"] == "approved"])
        
        # Platform health metrics
        total_items = supabase.table("items").select("id", count="exact").execute().count
        active_items = supabase.table("items").select("id", count="exact").eq("status", "active").execute().count
        flagged_items = supabase.table("items").select("id", count="exact").eq("flagged", True).execute().count
        
        analytics["platform_health"] = {
            "total_items": total_items,
            "active_items": active_items,
            "flagged_items": flagged_items,
            "health_score": max(0, 100 - (flagged_items / max(total_items, 1) * 100))
        }
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching analytics data"
        )

@api_router.post("/admin/bulk-action")
async def bulk_admin_action(
    item_ids: List[str],
    action: str,  # approve, reject, archive, flag
    note: Optional[str] = None,
    admin_user = Depends(get_admin_user)
):
    """Perform bulk actions on multiple items"""
    try:
        supabase = get_supabase_admin()
        
        results = []
        for item_id in item_ids:
            try:
                # Apply action to each item
                update_data = {
                    "moderated_by": admin_user["id"],
                    "moderated_at": datetime.utcnow().isoformat(),
                    "moderation_notes": note
                }
                
                if action == "approve":
                    update_data["status"] = "active"
                elif action == "reject":
                    update_data["status"] = "rejected"
                elif action == "archive":
                    update_data["status"] = "archived"
                elif action == "flag":
                    update_data["flagged"] = True
                    update_data["flag_reason"] = note
                
                response = supabase.table("items").update(update_data).eq("id", item_id).execute()
                
                if response.data:
                    results.append({"item_id": item_id, "success": True})
                else:
                    results.append({"item_id": item_id, "success": False, "error": "Item not found"})
                    
            except Exception as e:
                results.append({"item_id": item_id, "success": False, "error": str(e)})
        
        # Log bulk action
        supabase.table("admin_actions").insert({
            "admin_id": admin_user["id"],
            "action": f"bulk_{action}",
            "content_type": "items",
            "content_id": ",".join(item_ids),
            "notes": note,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        
        successful_count = len([r for r in results if r["success"]])
        
        return {
            "success": True,
            "processed": len(item_ids),
            "successful": successful_count,
            "failed": len(item_ids) - successful_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error performing bulk action: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error performing bulk action: {str(e)}"
        )

# Include router in app
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Lost & Found Portal API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
