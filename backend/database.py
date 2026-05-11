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

def get_ticket_by_id(ticket_id: str) -> dict:
    """Gets a specific ticket by its ID."""
    try:
        response = supabase.table("tickets").select("*").eq("id", ticket_id).execute()
        if response.data:
            return {"status": "success", "ticket": response.data[0]}
        return {"status": "not_found", "message": "Ticket bulunamadı."}
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

def update_product_stock(product_id: str, new_stock: int) -> dict:
    """Updates the stock quantity of a product."""
    try:
        response = supabase.table("products").update({"stock_quantity": new_stock}).eq("id", product_id).execute()
        if response.data:
            return {"status": "success", "product": response.data[0]}
        return {"status": "error", "message": "Stok güncellenemedi."}
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

def update_ticket_status(ticket_id: str, new_status: str) -> dict:
    """Updates the status of a support ticket."""
    try:
        response = supabase.table("tickets").update({"status": new_status}).eq("id", ticket_id).execute()
        if response.data:
            return {"status": "success", "ticket": response.data[0]}
        return {"status": "error", "message": "Bilet durumu güncellenemedi."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def place_order(customer_phone: str, product_name: str, quantity: int = 1) -> dict:
    """Places an order, decrements stock, and records the order."""
    try:
        # 1. Find the product
        product_response = supabase.table("products").select("*").ilike("name", f"%{product_name}%").execute()
        product_data = product_response.data
        
        # Ensure quantity is an integer
        quantity = int(quantity)
        
        if not product_data:
            return {"status": "not_found", "message": f"{product_name} isimli ürün bulunamadı."}
        
        product = product_data[0]
        product_id = product["id"]
        current_stock = product.get("stock_quantity") or product.get("stock", 0)
        price = product.get("price", 0)
        
        # 2. Check stock
        if current_stock < quantity:
            return {"status": "insufficient_stock", "message": f"Üzgünüm, stokta sadece {current_stock} adet {product_name} var."}
        
        # 3. Decrement stock
        new_stock = int(current_stock - quantity)
        supabase.table("products").update({"stock_quantity": new_stock}).eq("id", product_id).execute()
        
        # 4. Create order
        import random
        order_number = f"ORD-{random.randint(1000, 9999)}"
        total_amount = float(price) * quantity
        
        # Details formatted for cargo_tracking (temporary hack until proper columns added)
        order_details = f"Ürün: {product_name}, Adet: {quantity}"
        
        order_response = supabase.table("orders").insert({
            "order_number": order_number,
            "customer_phone": customer_phone,
            "status": "pending",
            "total_amount": total_amount,
            "cargo_tracking": order_details
        }).execute()
        
        if order_response.data:
            return {
                "status": "success", 
                "message": f"Siparişiniz başarıyla alındı! Sipariş No: {order_number}",
                "order": order_response.data[0]
            }
        return {"status": "error", "message": "Sipariş oluşturulurken bir hata oluştu."}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
