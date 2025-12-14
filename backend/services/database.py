import os
from supabase import create_client, Client

class DatabaseService:
    def __init__(self):
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        if url and key and "your_supabase_url_here" not in url:
            try:
                self.supabase: Client = create_client(url, key)
            except Exception as e:
                self.supabase = None
                print(f"Warning: Failed to initialize Supabase: {e}")
        else:
            self.supabase = None
            print("Warning: Supabase credentials not found or invalid.")

    def get_client(self) -> Client:
        return self.supabase
