from supabase import create_client, Client
from typing import Optional
import logging
from config import settings

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.client: Optional[Client] = None
        self.service_client: Optional[Client] = None
    
    def get_client(self) -> Client:
        """Get Supabase client with anon key (for frontend operations)"""
        if not self.client:
            if not settings.supabase_url or not settings.supabase_anon_key:
                raise ValueError("Supabase URL and ANON KEY must be set in environment variables")
            
            self.client = create_client(
                settings.supabase_url,
                settings.supabase_anon_key
            )
            logger.info("Supabase client initialized")
        
        return self.client
    
    def get_service_client(self) -> Client:
        """Get Supabase client with service role key (for backend operations)"""
        if not self.service_client:
            if not settings.supabase_url or not settings.supabase_service_role_key:
                raise ValueError("Supabase URL and SERVICE ROLE KEY must be set in environment variables")
            
            self.service_client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            logger.info("Supabase service client initialized")
        
        return self.service_client

# Global instance
supabase_client = SupabaseClient()

def get_supabase() -> Client:
    """Dependency to get Supabase client"""
    return supabase_client.get_client()

def get_supabase_admin() -> Client:
    """Dependency to get Supabase service client for admin operations"""
    return supabase_client.get_service_client() 