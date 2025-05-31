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
import time

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

# Helper function to get full name
def get_full_name(user_data):
    """Get full name from user data"""
    first_name = user_data.get("first_name", "")
    last_name = user_data.get("last_name", "")
    if first_name and last_name:
        return f"{first_name} {last_name}"
    elif first_name:
        return first_name
    else:
        return "User"

def get_full_name_from_profile(profile_data):
    """Get full name from profile data safely"""
    if not profile_data:
        return "Unknown"
    first_name = profile_data.get("first_name", "")
    last_name = profile_data.get("last_name", "")
    if first_name and last_name:
        return f"{first_name} {last_name}".strip()
    elif first_name:
        return first_name.strip()
    elif last_name:
        return last_name.strip()
    else:
        return "Unknown"

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user from Supabase JWT"""
    try:
        supabase = get_supabase()
        supabase_admin = get_supabase_admin()  # Use admin client for profile access
        
        # Get user from token
        user = supabase.auth.get_user(credentials.credentials)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        # Get user profile using admin client
        profile_response = supabase_admin.table("profiles").select("*").eq("id", user.user.id).execute()
        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile_data = profile_response.data[0]
        # Add email to profile data
        profile_data["email"] = user.user.email
        
        return profile_data
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
@api_router.post("/auth/register", response_model=dict)
async def register(request: RegisterRequest):
    """Register a new user"""
    try:
        supabase = get_supabase()
        supabase_admin = get_supabase_admin()  # Use admin client for profile creation
        
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
        
        # Create profile manually if needed
        user_id = auth_response.user.id
        
        # Wait for trigger to complete and check if profile exists
        time.sleep(0.5)
        
        profile_response = supabase_admin.table("profiles").select("*").eq("id", user_id).execute()
        
        if not profile_response.data:
            # Profile not created by trigger, create manually using admin client
            profile_data = {
                "id": user_id,
                "first_name": request.full_name.split()[0] if request.full_name else "User",
                "last_name": " ".join(request.full_name.split()[1:]) if len(request.full_name.split()) > 1 else "",
                "user_type": "STUDENT",
                "account_status": "ACTIVE",
                "email_verified": False
            }
            
            try:
                supabase_admin.table("profiles").insert(profile_data).execute()
                logger.info(f"Profile created manually for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to create profile: {e}")
                # Continue anyway as user is created in auth
        
        # Return success regardless of session status
        return {
            "success": True,
            "message": "Registration successful! You can now log in.",
            "user_id": user_id,
            "email": request.email,
            "requires_confirmation": auth_response.session is None
        }
        
    except HTTPException:
        raise
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
        supabase_admin = get_supabase_admin()  # Use admin client for profile access
        
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Get user profile using admin client
        profile_response = supabase_admin.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        if not profile_response.data:
            # Profile doesn't exist, create it
            profile_data = {
                "id": auth_response.user.id,
                "first_name": auth_response.user.user_metadata.get("full_name", "User").split()[0],
                "last_name": " ".join(auth_response.user.user_metadata.get("full_name", "").split()[1:]) if len(auth_response.user.user_metadata.get("full_name", "").split()) > 1 else "",
                "user_type": "STUDENT",
                "account_status": "ACTIVE",
                "email_verified": False
            }
            
            create_response = supabase_admin.table("profiles").insert(profile_data).execute()
            if create_response.data:
                profile_data = create_response.data[0]
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user profile"
                )
        else:
            profile_data = profile_response.data[0]
        
        # Add email to profile data for the response
        profile_data["email"] = auth_response.user.email
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            user=UserProfile(**profile_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login failed. Please check your credentials."
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
    """Get list of items from both lost_items and found_items tables with filtering and pagination"""
    try:
        supabase = get_supabase()
        all_items = []
        
        # Fetch from lost_items table if not filtering for found items only
        if not type or type == ItemType.LOST:
            lost_query = supabase.table("lost_items").select("""
                *,
                categories!lost_items_category_id_fkey(name),
                locations!lost_items_location_id_fkey(name),
                profiles!lost_items_user_id_fkey(first_name, last_name, email)
            """).eq("status", "ACTIVE")
            
            # Apply filters for lost items
            if category:
                # Get category ID first
                cat_response = supabase.table("categories").select("id").eq("name", category.value.title()).execute()
                if cat_response.data:
                    lost_query = lost_query.eq("category_id", cat_response.data[0]["id"])
            
            if location:
                # Get location ID first
                loc_response = supabase.table("locations").select("id").ilike("name", f"%{location}%").execute()
                if loc_response.data:
                    location_ids = [loc["id"] for loc in loc_response.data]
                    lost_query = lost_query.in_("location_id", location_ids)
            
            if urgency:
                lost_query = lost_query.eq("urgency", urgency.value.upper())
            
            if has_reward:
                lost_query = lost_query.gt("reward_amount", 0) if has_reward else lost_query.eq("reward_amount", 0)
            
            if search:
                lost_query = lost_query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
            
            lost_response = lost_query.execute()
            
            # Transform lost items to unified format
            for item_data in lost_response.data:
                unified_item = {
                    "id": item_data["id"],
                    "type": "lost",
                    "user_id": item_data["user_id"],
                    "title": item_data["title"],
                    "description": item_data["description"],
                    "category": item_data["categories"]["name"].lower() if item_data.get("categories") else "other",
                    "location": item_data["locations"]["name"] if item_data.get("locations") else "Unknown",
                    "images": [],  # Add image handling later
                    "image": "/api/placeholder/400/300",  # Default placeholder image
                    "reward": item_data.get("reward_amount", 0) or 0,
                    "urgency": item_data["urgency"].lower(),
                    "date_lost": item_data.get("date_lost"),
                    "time_lost": item_data.get("time_lost"),
                    "contact_preference": item_data["contact_method"].lower(),
                    "status": item_data["status"].lower(),
                    "created_at": item_data["created_at"],
                    "updated_at": item_data["updated_at"],
                    "owner_name": get_full_name_from_profile(item_data.get("profiles")),
                    "owner_email": item_data["profiles"]["email"] if item_data.get("profiles") else "Unknown"
                }
                all_items.append(Item(**unified_item))
        
        # Fetch from found_items table if not filtering for lost items only
        if not type or type == ItemType.FOUND:
            found_query = supabase.table("found_items").select("""
                *,
                categories!found_items_category_id_fkey(name),
                locations!found_items_location_id_fkey(name),
                profiles!found_items_user_id_fkey(first_name, last_name, email)
            """).eq("status", "AVAILABLE")
            
            # Apply filters for found items
            if category:
                # Get category ID first
                cat_response = supabase.table("categories").select("id").eq("name", category.value.title()).execute()
                if cat_response.data:
                    found_query = found_query.eq("category_id", cat_response.data[0]["id"])
            
            if location:
                # Get location ID first
                loc_response = supabase.table("locations").select("id").ilike("name", f"%{location}%").execute()
                if loc_response.data:
                    location_ids = [loc["id"] for loc in loc_response.data]
                    found_query = found_query.in_("location_id", location_ids)
            
            if search:
                found_query = found_query.or_(f"title.ilike.%{search}%,description.ilike.%{search}%")
            
            found_response = found_query.execute()
            
            # Transform found items to unified format
            for item_data in found_response.data:
                unified_item = {
                    "id": item_data["id"],
                    "type": "found",
                    "user_id": item_data["user_id"],
                    "title": item_data["title"],
                    "description": item_data["description"],
                    "category": item_data["categories"]["name"].lower() if item_data.get("categories") else "other",
                    "location": item_data["locations"]["name"] if item_data.get("locations") else "Unknown",
                    "images": [],  # Add image handling later
                    "image": "/api/placeholder/400/300",  # Default placeholder image
                    "reward": 0,  # Found items don't have rewards
                    "urgency": "medium",  # Default urgency for found items
                    "date_lost": item_data.get("date_found"),  # Use date_found as date_lost for consistency
                    "time_lost": item_data.get("time_found"),
                    "contact_preference": item_data["contact_method"].lower(),
                    "status": "active" if item_data["status"].lower() == "available" else item_data["status"].lower(),
                    "created_at": item_data["created_at"],
                    "updated_at": item_data["updated_at"],
                    "owner_name": get_full_name_from_profile(item_data.get("profiles")),
                    "owner_email": item_data["profiles"]["email"] if item_data.get("profiles") else "Unknown"
                }
                all_items.append(Item(**unified_item))
        
        # Sort by created_at (newest first)
        all_items.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply pagination
        total = len(all_items)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_items = all_items[start:end]
        
        return ItemListResponse(
            items=paginated_items,
            total=total,
            page=page,
            per_page=per_page,
            has_next=end < total,
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
            profiles!items_user_id_fkey(first_name, last_name, email)
        """).eq("id", item_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        item_data = response.data[0]
        if item_data.get("profiles"):
            item_data["owner_name"] = get_full_name_from_profile(item_data["profiles"])
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
    """Create a new item in the appropriate table (lost_items or found_items)"""
    try:
        supabase = get_supabase()  # Use regular client for main operations
        supabase_admin = get_supabase_admin()  # Use admin client for categories/locations
        
        # Determine which table to use based on item type
        if item.type == ItemType.LOST:
            table_name = "lost_items"
            date_field = "date_lost"
            time_field = "time_lost"
        else:  # ItemType.FOUND
            table_name = "found_items"
            date_field = "date_found"
            time_field = "time_found"
        
        # Prepare basic item data
        item_data = {
            "user_id": current_user["id"],
            "title": item.title,
            "description": item.description,
            "contact_method": item.contact_preference.upper(),
            "contact_info": current_user["email"],
        }
        
        # Add urgency only for lost items (found_items table doesn't have urgency column)
        if item.type == ItemType.LOST:
            item_data["urgency"] = item.urgency.value.upper()
        
        # Handle date and time
        if item.date_lost:
            item_data[date_field] = item.date_lost.isoformat()
        if item.time_lost:
            item_data[time_field] = item.time_lost
        
        # Handle reward for lost items only
        if item.type == ItemType.LOST and item.reward:
            item_data["reward_amount"] = item.reward
        
        # Handle category - find or create
        try:
            category_response = supabase_admin.table("categories").select("id").eq("name", item.category.value.title()).execute()
            if category_response.data:
                item_data["category_id"] = category_response.data[0]["id"]
            else:
                # Use default category if not found
                default_cat_response = supabase_admin.table("categories").select("id").eq("name", "Other").execute()
                if default_cat_response.data:
                    item_data["category_id"] = default_cat_response.data[0]["id"]
                else:
                    # Create Other category as fallback
                    new_category = {
                        "name": "Other",
                        "description": "Miscellaneous items",
                        "icon": "help-circle",
                        "color": "#6B7280"
                    }
                    category_create_response = supabase_admin.table("categories").insert(new_category).execute()
                    if category_create_response.data:
                        item_data["category_id"] = category_create_response.data[0]["id"]
        except Exception as e:
            logger.error(f"Category handling error: {e}")
            # Skip category if there's an error
            pass
        
        # Handle location - find or create
        try:
            location_response = supabase_admin.table("locations").select("id").eq("name", item.location).execute()
            if location_response.data:
                item_data["location_id"] = location_response.data[0]["id"]
            else:
                # Create location if it doesn't exist
                new_location = {
                    "name": item.location,
                    "building": item.location,
                    "description": f"Location: {item.location}"
                }
                location_create_response = supabase_admin.table("locations").insert(new_location).execute()
                if location_create_response.data:
                    item_data["location_id"] = location_create_response.data[0]["id"]
        except Exception as e:
            logger.error(f"Location handling error: {e}")
            # Skip location if there's an error
            pass
        
        # Add found-item specific fields
        if item.type == ItemType.FOUND:
            item_data["current_location"] = item.location
            item_data["condition_notes"] = "Good condition"
        
        logger.info(f"Attempting to insert into {table_name} with data: {item_data}")
        
        # Insert into the appropriate table
        response = supabase.table(table_name).insert(item_data).execute()
        
        if not response.data:
            logger.error(f"No data returned from {table_name} insert")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create item - no data returned"
            )
        
        created_item = response.data[0]
        logger.info(f"Successfully created item: {created_item}")
        
        # Convert back to unified Item format for response
        unified_item = {
            "id": created_item["id"],
            "type": item.type.value,
            "user_id": created_item["user_id"],
            "title": created_item["title"],
            "description": created_item["description"],
            "category": item.category.value,
            "location": item.location,
            "images": item.images or [],
            "image": item.images[0] if item.images else "/api/placeholder/400/300",  # First image for display
            "reward": created_item.get("reward_amount", 0) or 0,
            "urgency": created_item.get("urgency", "medium").lower() if item.type == ItemType.LOST else "medium",
            "date_lost": created_item.get(date_field),
            "time_lost": created_item.get(time_field),
            "contact_preference": created_item.get("contact_method", "email").lower(),
            "status": "active" if created_item.get("status", "active").lower() == "available" else created_item.get("status", "active").lower(),
            "created_at": created_item["created_at"],
            "updated_at": created_item["updated_at"],
            "owner_name": get_full_name(current_user),
            "owner_email": current_user["email"]
        }
        
        # Convert date string back to date object if present
        if unified_item.get("date_lost") and isinstance(unified_item["date_lost"], str):
            from datetime import datetime
            try:
                unified_item["date_lost"] = datetime.fromisoformat(unified_item["date_lost"]).date()
            except:
                pass  # Keep as string if conversion fails
        
        return Item(**unified_item)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating item: {str(e)}")
        logger.error(f"Item data attempted: {locals().get('item_data', 'Not available')}")
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
        update_data = {k: v for k, v in item_update.model_dump().items() if v is not None}
        response = supabase.table("items").update(update_data).eq("id", item_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        updated_item = response.data[0]
        updated_item["owner_name"] = get_full_name(current_user)
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
    """Upload an image for an item - supports all common image formats"""
    try:
        # Validate file type - support all common image formats
        allowed_types = [
            "image/jpeg", "image/jpg", "image/png", "image/gif", 
            "image/webp", "image/bmp", "image/tiff", "image/svg+xml"
        ]
        
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file.content_type}. Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG"
            )
        
        # Check file size (max 10MB)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size too large. Maximum size is 10MB"
            )
        
        # Validate and process image
        try:
            # Reset file pointer for PIL
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Resize if too large (max 1920x1920)
            max_size = (1920, 1920)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save optimized image
            output = io.BytesIO()
            image_format = 'JPEG' if file.content_type in ['image/jpeg', 'image/jpg'] else 'PNG'
            image.save(output, format=image_format, quality=85, optimize=True)
            content = output.getvalue()
            
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupted image file"
            )
        
        # Generate unique filename with proper extension
        file_extension = 'jpg' if file.content_type in ['image/jpeg', 'image/jpg'] else 'png'
        if file.filename and '.' in file.filename:
            original_ext = file.filename.split('.')[-1].lower()
            if original_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff']:
                file_extension = original_ext
        
        filename = f"{current_user['id']}/{uuid.uuid4()}.{file_extension}"
        
        # Upload to Supabase Storage
        supabase = get_supabase()
        
        try:
            # Try to upload the file
            storage_response = supabase.storage.from_("item-images").upload(filename, content, {
                "content-type": file.content_type,
                "upsert": False
            })
            
            # Check for upload errors
            if hasattr(storage_response, 'error') and storage_response.error:
                logger.error(f"Supabase storage error: {storage_response.error}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to upload image: {storage_response.error.message if hasattr(storage_response.error, 'message') else 'Unknown error'}"
                )
            
        except Exception as e:
            logger.error(f"Storage upload error: {str(e)}")
            # If upload fails, try with a different filename (in case of conflict)
            filename = f"{current_user['id']}/{uuid.uuid4()}-{int(time.time())}.{file_extension}"
            try:
                storage_response = supabase.storage.from_("item-images").upload(filename, content, {
                    "content-type": file.content_type,
                    "upsert": True
                })
                if hasattr(storage_response, 'error') and storage_response.error:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to upload image to storage"
                    )
            except Exception as retry_error:
                logger.error(f"Retry upload failed: {str(retry_error)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to upload image after retry"
                )
        
        # Get public URL
        try:
            public_url_response = supabase.storage.from_("item-images").get_public_url(filename)
            public_url = public_url_response
            
            # Ensure we have a valid URL
            if not public_url or not isinstance(public_url, str):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate public URL for uploaded image"
                )
            
        except Exception as e:
            logger.error(f"Error getting public URL: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get public URL for uploaded image"
            )
        
        logger.info(f"Successfully uploaded image: {filename} -> {public_url}")
        
        return ImageUploadResponse(
            url=public_url,
            public_url=public_url,
            path=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error uploading image: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error during image upload"
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
            profiles!claim_requests_claimer_id_fkey(first_name, last_name, email)
        """).in_("item_id", [item["id"] for item in user_items]).execute()
        
        claim_requests = []
        for claim_data in claims_response.data or []:
            claim_dict = claim_data.copy()
            if claim_data.get("items"):
                claim_dict["item_title"] = claim_data["items"]["title"]
                del claim_dict["items"]
            if claim_data.get("profiles"):
                claim_dict["claimer_name"] = get_full_name_from_profile(claim_data["profiles"])
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
            item_data["owner_name"] = get_full_name(current_user)
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
        claim_data = claim.model_dump()
        claim_data["claimer_id"] = current_user["id"]
        
        response = supabase.table("claim_requests").insert(claim_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create claim request"
            )
        
        created_claim = response.data[0]
        created_claim["claimer_name"] = get_full_name(current_user)
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
            profiles!items_user_id_fkey(first_name, last_name, email)
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
                item_dict["owner_name"] = get_full_name_from_profile(item_data["profiles"])
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
            claimer:profiles!claim_requests_claimer_id_fkey(first_name, last_name, email),
            owner:items!claim_requests_item_id_fkey(profiles!items_user_id_fkey(first_name, last_name, email))
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
                claim_dict["claimer_name"] = get_full_name_from_profile(claim_data["claimer"])
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
        
        update_data = claim_update.model_dump()
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
            query = query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%,email.ilike.%{search}%")
        
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
            owner:profiles!disputes_owner_id_fkey(first_name, last_name, email)
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
                profiles!items_user_id_fkey(first_name, last_name, email)
            """).eq("flagged", True).execute()
            
            for item in items_response.data:
                flagged_items.append({
                    "id": item["id"],
                    "type": "item",
                    "title": item["title"],
                    "user": get_full_name_from_profile(item["profiles"]) if item.get("profiles") else "Unknown",
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
