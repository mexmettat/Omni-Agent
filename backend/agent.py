import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from database import get_order_status, get_product_inventory, create_ticket

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing in .env file.")

genai.configure(api_key=GEMINI_API_KEY)

# Define the tools for Gemini
def check_order_status(phone_number: str) -> str:
    """
    Kullanıcının telefon numarasına göre sipariş durumunu kontrol eder.
    
    Args:
        phone_number: Müşterinin telefon numarası.
    """
    print(f"[Tool Execution] check_order_status çağrıldı: {phone_number}")
    result = get_order_status(phone_number)
    return json.dumps(result, ensure_ascii=False)

def check_inventory(product_name: str) -> str:
    """
    Verilen ürün ismine göre stok bilgisini kontrol eder.
    
    Args:
        product_name: Stok durumu kontrol edilecek ürünün adı.
    """
    print(f"[Tool Execution] check_inventory çağrıldı: {product_name}")
    result = get_product_inventory(product_name)
    return json.dumps(result, ensure_ascii=False)

def create_support_ticket(phone_number: str, description: str) -> str:
    """
    Müşteri için yeni bir destek/şikayet talebi (ticket) oluşturur.
    
    Args:
        phone_number: Müşterinin telefon numarası.
        description: Şikayet veya destek talebinin detayı.
    """
    print(f"[Tool Execution] create_support_ticket çağrıldı: {phone_number} - {description}")
    result = create_ticket(phone_number, description)
    return json.dumps(result, ensure_ascii=False)

# Define the Gemini Model
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    tools=[check_order_status, check_inventory, create_support_ticket],
    system_instruction="""
    Sen Omni-Agent adlı otonom bir müşteri hizmetleri asistanısın. Müşteri mesajlarını alır ve onların niyetini anlarsın.
    Aşağıdaki durumlarda sağlanan araçları (tools) kullanmalısın:
    - Kullanıcı siparişinin nerede olduğunu veya durumunu sorarsa: 'check_order_status' fonksiyonunu çağır ve kullanıcının telefon numarasını çıkarıp kullan. Eğer kullanıcı telefon numarasını vermediyse numarayı iste.
    - Kullanıcı bir ürünün stoğunu, fiyatını veya varlığını sorarsa: 'check_inventory' fonksiyonunu çağır.
    - Kullanıcı bir şikayet iletir, destek ister veya bir problem bildirirse: 'create_support_ticket' fonksiyonunu çağır. Şikayet açıklamasını ve telefon numarasını kullan. Telefon numarası yoksa iste.

    Araçlardan dönen JSON yanıtlarını yorumlayarak müşteriye empatik, yardımsever ve doğal dilde (Türkçe) kısa bir yanıt ver. Mesajların WhatsApp üzerinden iletileceğini unutma, bu yüzden emoji kullanabilirsin.
    Asla JSON formatını doğrudan kullanıcıya gösterme!
    """
)

# Start a chat session (this allows maintaining conversation history if needed, though for webhook it might be stateless per message initially)
chat = model.start_chat(enable_automatic_function_calling=True)

def process_customer_message(message: str, customer_phone: str) -> str:
    """
    Müşterinin mesajını alır, LLM'e iletir ve uygun aracı çalıştırarak yanıt döndürür.
    Burada bağlamı korumak için customer_phone'u mesaja dahil ediyoruz ki LLM gerekli olduğunda numarayı bilsin.
    """
    try:
        # Prompt'u güçlendirmek için telefon numarasını sisteme bildiriyoruz
        enhanced_message = f"(Müşteri Telefonu: {customer_phone})\nMüşteri Mesajı: {message}"
        
        response = chat.send_message(enhanced_message)
        return response.text
    except Exception as e:
        print(f"Agent error: {e}")
        return "Özür dilerim, şu anda işleminizi gerçekleştiremiyorum. Lütfen daha sonra tekrar deneyiniz."

# Test execution block
if __name__ == "__main__":
    print("Omni-Agent Test Modu Başlatıldı...")
    print(process_customer_message("Siparişimin durumu nedir?", "5551234567"))
