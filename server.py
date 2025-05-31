# Authentication endpoints
@api_router.post("/auth/register", response_model=dict)
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
        
        # Create profile manually if needed
        user_id = auth_response.user.id
        
        # Wait for trigger to complete and check if profile exists
        import time
        time.sleep(0.5)
        
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if not profile_response.data:
            # Profile not created by trigger, create manually
            profile_data = {
                "id": user_id,
                "email": request.email,
                "full_name": request.full_name,
                "is_admin": False,
                "is_verified": False
            }
            
            try:
                supabase.table("profiles").insert(profile_data).execute()
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
        
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        if auth_response.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please confirm your email address before logging in"
            )
        
        # Get user profile
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).execute()
        
        if not profile_response.data:
            # Profile doesn't exist, create it
            profile_data = {
                "id": auth_response.user.id,
                "email": request.email,
                "full_name": auth_response.user.user_metadata.get("full_name", "User"),
                "is_admin": False,
                "is_verified": False
            }
            
            create_response = supabase.table("profiles").insert(profile_data).execute()
            if create_response.data:
                profile_response.data = create_response.data
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user profile"
                )
        
        return LoginResponse(
            access_token=auth_response.session.access_token,
            user=UserProfile(**profile_response.data[0])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login failed. Please check your credentials."
        ) 