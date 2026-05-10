import os
from fastapi import FastAPI, Request, Form, BackgroundTasks
from fastapi.responses import PlainTextResponse
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
from agent import process_customer_message
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Omni-Agent API")

# Twilio Client (Gerekirse doğrudan mesaj atmak için)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
# twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID else None

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
    
    # Telefon numarasını temizle
    customer_phone = sender.replace("whatsapp:", "").strip()
    
    if not message_body:
        return PlainTextResponse("Boş mesaj alınamaz.", status_code=400)

    print(f"[{customer_phone}] Gelen Mesaj: {message_body}")
    
    # 1. Gemini Agent'a sor
    agent_response = process_customer_message(message_body, customer_phone)
    
    # 2. Twilio'ya yanıt ver (TwiML kullanarak)
    twiml_response = MessagingResponse()
    twiml_response.message(agent_response)
    
    return PlainTextResponse(str(twiml_response), media_type="application/xml")

# WebSocket gibi ek bileşenler Admin Paneli için daha sonra eklenebilir.
