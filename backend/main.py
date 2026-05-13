import os
from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
from agent import process_customer_message
from database import update_product_stock, update_ticket_status, get_ticket_by_id, add_product, update_order_status, get_order_by_id, delete_product
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="Omni-Agent API")

# CORS Settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında tüm kökenlere izin veriyoruz
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twilio Client (Gerekirse doğrudan mesaj atmak için)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID else None

@app.get("/")
def read_root():
    return {"message": "Omni-Agent Backend Çalışıyor!"}

@app.post("/api/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Twilio'dan gelen WhatsApp mesajlarını yakalayan endpoint.
    Twilio, form verisi (application/x-www-form-urlencoded) gönderir.
    """
    form_data = await request.form()
    
    sender = form_data.get("From", "")  # Örn: 'whatsapp:+905551234567'
    message_body = form_data.get("Body", "")
    
    customer_phone = sender.replace("whatsapp:", "").strip()
    profile_name = form_data.get("ProfileName", "")
    
    if not message_body:
        return PlainTextResponse("Boş mesaj alınamaz.", status_code=400)

    print(f"[{customer_phone}] Gelen Mesaj: {message_body}")
    
    # 1. Gemini Agent'a sor
    agent_response = process_customer_message(message_body, customer_phone, profile_name)
    
    # 2. Twilio'ya yanıt ver (TwiML kullanarak)
    twiml_response = MessagingResponse()
    twiml_response.message(agent_response)
    
    return PlainTextResponse(str(twiml_response), media_type="application/xml")

# Admin Endpoints
@app.patch("/api/admin/products/{product_id}/stock")
async def admin_update_stock(product_id: str, data: dict):
    new_stock = data.get("stock_quantity")
    if new_stock is None:
        return {"status": "error", "message": "stock_quantity gerekli."}
    return update_product_stock(product_id, int(new_stock))

@app.post("/api/admin/products")
async def admin_add_product(data: dict):
    name = data.get("name")
    price = data.get("price")
    stock_quantity = data.get("stock_quantity")
    
    if not name or price is None or stock_quantity is None:
        return {"status": "error", "message": "name, price ve stock_quantity alanları zorunludur."}
        
    return add_product(name, float(price), int(stock_quantity))

@app.delete("/api/admin/products/{product_id}")
async def admin_delete_product(product_id: str):
    return delete_product(product_id)

@app.patch("/api/admin/tickets/{ticket_id}/status")
async def admin_update_ticket_status(ticket_id: str, data: dict):
    new_status = data.get("status")
    if not new_status:
        return {"status": "error", "message": "status gerekli."}
    
    # 1. Update DB
    result = update_ticket_status(ticket_id, new_status)
    
    # 2. If status is "çözüldü", send WhatsApp notification
    if result["status"] == "success" and new_status == "çözüldü":
        ticket_data = get_ticket_by_id(ticket_id)
        if ticket_data["status"] == "success":
            phone = ticket_data["ticket"]["customer_phone"]
            if twilio_client:
                try:
                    message_text = f"Merhaba, destek talebiniz çözüldü olarak işaretlendi. Teşekkür ederiz! ✅"
                    twilio_client.messages.create(
                        from_='whatsapp:+14155238886',  # Sandbox number or your Twilio number
                        body=message_text,
                        to=f'whatsapp:{phone}'
                    )
                    print(f"[Admin] Bildirim gönderildi: {phone}")
                except Exception as e:
                    print(f"[Admin] Bildirim gönderme hatası: {e}")
            else:
                print("[Admin] Twilio client yapılandırılmamış, bildirim gönderilemedi.")
                
    return result

@app.patch("/api/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, data: dict):
    new_status = data.get("status")
    if not new_status:
        return {"status": "error", "message": "status gerekli."}
    
    # 1. Update DB
    result = update_order_status(order_id, new_status)
    
    # 2. Send WhatsApp notification
    if result["status"] == "success":
        order_data = get_order_by_id(order_id)
        if order_data["status"] == "success":
            phone = order_data["order"]["customer_phone"]
            order_number = order_data["order"]["order_number"]
            if twilio_client:
                try:
                    message_text = f"Merhaba! {order_number} numaralı siparişinizin durumu güncellendi: *{new_status.upper()}* 📦"
                    if new_status == "kargoda":
                        message_text += "\nEn kısa sürede elinizde olacaktır."
                    elif new_status == "teslim edildi":
                        message_text = f"Harika haber! {order_number} numaralı siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler! ✅"
                    
                    twilio_client.messages.create(
                        from_='whatsapp:+14155238886',
                        body=message_text,
                        to=f'whatsapp:{phone}'
                    )
                    print(f"[Admin] Sipariş bildirimi gönderildi: {phone}")
                except Exception as e:
                    print(f"[Admin] Sipariş bildirim hatası: {e}")
                
    return result

# WebSocket gibi ek bileşenler Admin Paneli için daha sonra eklenebilir.
