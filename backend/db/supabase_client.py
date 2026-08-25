from supabase import create_client, Client
from config import get_settings

settings = get_settings()

if not settings.supabase_url or not settings.supabase_key:
    # Handle gracefully for tests or pre-setup
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing. Supabase client won't work.")
    supabase = None
else:
    supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
