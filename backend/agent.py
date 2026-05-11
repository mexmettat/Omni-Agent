import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from database import get_order_status, get_product_inventory, create_ticket, place_order, save_chat_message, get_chat_history

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

def create_support_ticket(phone_number: str, description: str, urgency_level: str = "Normal") -> str:
    """
    Müşteri için yeni bir destek/şikayet talebi (ticket) oluşturur.
    
    Args:
        phone_number: Müşterinin telefon numarası.
        description: Şikayet veya destek talebinin detayı.
        urgency_level: Şikayetin aciliyeti/duygu durumu. Seçenekler: 'Düşük', 'Normal', 'Yüksek', 'Kritik'.
    """
    print(f"[Tool Execution] create_support_ticket çağrıldı: {phone_number} - {description} - {urgency_level}")
    result = create_ticket(phone_number, description, urgency_level)
    return json.dumps(result, ensure_ascii=False)

def place_order_tool(phone_number: str, product_name: str, quantity: int = 1) -> str:
    """
    Müşterinin istediği üründen sipariş oluşturur ve stoktan düşer.
    
    Args:
        phone_number: Müşterinin telefon numarası.
        product_name: Sipariş edilecek ürünün adı.
        quantity: Kaç adet sipariş edileceği (varsayılan 1).
    """
    print(f"[Tool Execution] place_order_tool çağrıldı: {phone_number} - {product_name} ({quantity} adet)")
    result = place_order(phone_number, product_name, quantity)
    return json.dumps(result, ensure_ascii=False)

# Define the Gemini Model
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    tools=[check_order_status, check_inventory, create_support_ticket, place_order_tool],
    system_instruction="""
    Sen Omni-Agent adlı otonom bir müşteri hizmetleri asistanısın. Müşteri mesajlarını alır ve onların niyetini anlarsın.
    Aşağıdaki durumlarda sağlanan araçları (tools) kullanmalısın:
    - Kullanıcı bir ürün satın almak, sipariş vermek veya fiyat/stok sormak isterse: ÖNCE KESİNLİKLE 'check_inventory' aracını kullanarak ürünün stokta olup olmadığını kontrol et. 
    - EĞER 'check_inventory' sonucunda ürün yoksa: Müşteriye nazikçe bu ürünün elimizde olmadığını söyle ve satışı durdur.
    - EĞER ürün stokta varsa ve müşteri satın almak istiyorsa: ÖNCE kullanıcının kaç ADET istediğini kontrol et. Eğer miktar belirtilmemişse, 'place_order_tool' fonksiyonunu ÇAĞIRMA ve müşteriye "Kaç adet almak istersiniz?" diye sor. Sadece adet belirtildiğinde 'place_order_tool' fonksiyonunu çağır.
    - Kullanıcı siparişinin nerede olduğunu veya durumunu sorarsa: 'check_order_status' fonksiyonunu çağır ve kullanıcının telefon numarasını çıkarıp kullan. Eğer kullanıcı telefon numarasını vermediyse numarayı iste.
    - Kullanıcı bir şikayet iletir, destek ister veya bir problem bildirirse: 'create_support_ticket' fonksiyonunu çağır. Şikayet açıklamasını, telefon numarasını ve cümlenin duygusuna göre urgency_level'i (Düşük, Normal, Yüksek, Kritik) çıkar. Agresif veya çok acil bir durumsa Kritik olarak işaretle.

    Her işlemde müşterinin telefon numarasını bilmen gerekir. Eğer numara bağlamda yoksa nazikçe iste.
    Araçlardan dönen JSON yanıtlarını yorumlayarak müşteriye empatik, yardımsever ve doğal dilde (Türkçe) kısa bir yanıt ver. Mesajların WhatsApp üzerinden iletileceğini unutma, bu yüzden emoji kullanabilirsin.
    Asla JSON formatını doğrudan kullanıcıya gösterme!
    Ayrıca kullanıcının sana yazdığı önceki mesajların bağlamını aklında tut ve sorulara ona göre mantıklı cevap ver.
    """
)

# Start a chat session (this allows maintaining conversation history if needed, though for webhook it might be stateless per message initially)
def process_customer_message(message: str, customer_phone: str) -> str:
    """
    Müşterinin mesajını alır, LLM'e iletir ve uygun aracı çalıştırarak yanıt döndürür.
    Sohbet hafızası (history) kullanılarak LLM bağlam konusunda bilgilendirilir.
    """
    try:
        # Gelen müşteri mesajını veritabanına kaydet
        save_chat_message(customer_phone, "user", message)
        
        # Geçmiş sohbetleri çek
        history = get_chat_history(customer_phone)
        
        # Her mesaj için taze bir chat session başlatıyoruz (Stateless yaklaşım)
        chat = model.start_chat(enable_automatic_function_calling=True)
        
        # Prompt'u güçlendirmek için telefon numarasını ve geçmişi sisteme bildiriyoruz
        enhanced_message = f"(Müşteri Telefonu: {customer_phone})\n\n{history}\n\nYeni Müşteri Mesajı: {message}"
        
        response = chat.send_message(enhanced_message)
        
        # Modelin yanıtını da veritabanına kaydet
        agent_reply = response.text
        save_chat_message(customer_phone, "model", agent_reply)
        
        return agent_reply
    except Exception as e:
        print(f"Agent error: {e}")
        return "Özür dilerim, şu anda işleminizi gerçekleştiremiyorum. Lütfen daha sonra tekrar deneyiniz."

# Test execution block
if __name__ == "__main__":
    print("Omni-Agent Test Modu Başlatıldı...")
    print(process_customer_message("Siparişimin durumu nedir?", "5551234567"))
