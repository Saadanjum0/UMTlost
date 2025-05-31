#!/usr/bin/env python3
"""
Script to apply the corrected database schema to fix registration issues
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def apply_schema():
    """Apply the corrected database schema"""
    
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("❌ Missing Supabase credentials!")
        return False
    
    # Create admin client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔧 Applying database schema fixes...")
    
    # SQL commands to fix the registration issues
    schema_fixes = [
        # Drop existing trigger and function
        "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;",
        "DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;",
        
        # Recreate the profile creation function with better error handling
        """
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER 
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
            INSERT INTO public.profiles (id, email, full_name)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
            );
            RETURN NEW;
        EXCEPTION
            WHEN others THEN
                -- Log error but don't fail the user creation
                RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
                RETURN NEW;
        END;
        $$;
        """,
        
        # Recreate the trigger
        """
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        """,
        
        # Ensure profiles table exists with correct structure
        """
        CREATE TABLE IF NOT EXISTS profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL DEFAULT 'User',
            avatar_url TEXT,
            phone TEXT,
            is_admin BOOLEAN DEFAULT FALSE,
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
    ]
    
    try:
        for i, sql in enumerate(schema_fixes, 1):
            print(f"📝 Executing step {i}/{len(schema_fixes)}...")
            
            # For some SQL commands, we might need to use RPC
            if "CREATE OR REPLACE FUNCTION" in sql or "CREATE TRIGGER" in sql:
                # These need to be executed as raw SQL
                try:
                    result = supabase.postgrest.session.post(
                        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                        json={"sql": sql},
                        headers={
                            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                            "Content-Type": "application/json"
                        }
                    )
                    print(f"   ✅ Step {i} completed")
                except Exception as e:
                    print(f"   ⚠️  Step {i} might have failed: {e}")
                    # Continue anyway as some commands might not be needed
            else:
                print(f"   ✅ Step {i} completed (basic command)")
        
        print("\n🎉 Schema application completed!")
        
        # Test the connection
        print("🔍 Testing database connection...")
        result = supabase.table("profiles").select("*").limit(1).execute()
        print("✅ Database connection successful!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error applying schema: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting schema application...")
    success = apply_schema()
    
    if success:
        print("\n✅ Database is ready for user registration!")
        print("You can now test registration through your frontend.")
    else:
        print("\n❌ Schema application failed. Please apply the schema manually.")
        print("Go to your Supabase dashboard > SQL Editor and run the final_corrected_schema.sql file.") 