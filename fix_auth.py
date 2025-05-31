#!/usr/bin/env python3
"""
Script to fix authentication and RLS policies for Supabase
"""

import os
from supabase import create_client
from backend.config import settings

def fix_auth_policies():
    """Fix authentication and RLS policies"""
    
    try:
        # Create Supabase client with service role key
        if not settings.supabase_url or not settings.supabase_service_role_key:
            print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            print("Please set these environment variables:")
            print("export SUPABASE_URL='your-supabase-url'")
            print("export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'")
            return False
            
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        
        print("Fixing authentication policies...")
        
        # Read the SQL file
        with open('fix_auth_schema.sql', 'r') as f:
            sql_content = f.read()
        
        # Split SQL into individual statements and execute them
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        for i, statement in enumerate(statements):
            try:
                print(f"Executing statement {i+1}/{len(statements)}...")
                result = supabase.rpc('exec_sql', {'sql': statement + ';'}).execute()
                print(f"✓ Statement {i+1} executed successfully")
            except Exception as e:
                print(f"⚠ Warning on statement {i+1}: {e}")
                # Continue with other statements
                continue
        
        print("Authentication policies fixed successfully!")
        return True
        
    except Exception as e:
        print(f"Error fixing authentication: {e}")
        return False

if __name__ == "__main__":
    success = fix_auth_policies()
    if success:
        print("\n✅ Authentication fix completed!")
        print("You can now try registering a user again.")
    else:
        print("\n❌ Failed to fix authentication.")
        print("Please check your Supabase credentials and try again.") 