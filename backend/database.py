import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing in .env file.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_order_status(customer_phone: str) -> dict:
    """Gets the order status for a given customer phone number."""
    try:
        response = supabase.table("orders").select("*").eq("customer_phone", customer_phone).execute()
        data = response.data
        if data:
            return {"status": "success", "orders": data}
        return {"status": "not_found", "message": "Bu telefon numarasına ait sipariş bulunamadı."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_product_inventory(product_name: str) -> dict:
    """Gets the inventory for a given product name (case-insensitive search)."""
    try:
        response = supabase.table("products").select("*").ilike("name", f"%{product_name}%").execute()
        data = response.data
        if data:
            return {"status": "success", "products": data}
        return {"status": "not_found", "message": f"{product_name} isimli ürün bulunamadı."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def create_ticket(customer_phone: str, issue_description: str) -> dict:
    """Creates a new support ticket."""
    try:
        response = supabase.table("tickets").insert({
            "customer_phone": customer_phone,
            "issue_description": issue_description,
            "status": "açık"
        }).execute()
        
        data = response.data
        if data:
            return {"status": "success", "ticket": data[0]}
        return {"status": "error", "message": "Destek talebi oluşturulamadı."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
