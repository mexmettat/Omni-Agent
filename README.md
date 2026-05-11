# Omni-Agent 🤖📦

Omni-Agent, WhatsApp üzerinden gelen müşteri taleplerini insan müdahalesi olmadan, **%100 otonom** bir şekilde yönetmesini sağlayan yapay zeka (LLM) destekli bir müşteri ve sipariş yönetim sistemidir. 

Sistem klasik, kural tabanlı chatbotların aksine; müşterinin doğal dildeki niyetini anlayan, arka plandaki veritabanından veri çekme kararını kendisi veren ve işlem sonuçlarını yine doğal ve empatik bir metne dönüştüren **"Agentic (Otonom Araç Kullanımı - Function Calling)"** bir mimariye dayanır.

---

## 🚀 Temel Özellikler
* **Otonom Müşteri Temsilcisi:** Gemini AI, sipariş durumunu veya stok sayısını anlamak için fonksiyon tetiklemeyi (Tool Use) kendisi seçer.
* **Sohbet Hafızası (Session Memory):** Veritabanı entegrasyonu sayesinde önceki WhatsApp konuşmalarını hatırlar ve bağlam kopukluğunu engeller.
* **Duygu Analizi ve Aciliyet Skoru:** Şikayetlerdeki duygu durumunu analiz eder ve öfkeli müşteriler için anında "KRİTİK" alarmı üretir.
* **WhatsApp Entegrasyonu:** Twilio API webhook üzerinden direkt WhatsApp entegrasyonu mevcuttur. Müşterileriniz bir uygulamaya girmeden sizinle konuşur.
* **Canlı Veritabanı:** Supabase (PostgreSQL) üzerinden stok sorgusu ve sipariş kaydı okuma yeteneği.
* **Modern Dashboard:** React ve TailwindCSS ile tasarlanmış, mağaza yöneticileri için modern ve hızlı Admin Paneli.

---

## 🛠 Kullanılan Teknolojiler (Tech Stack)

### Backend
* **Python (FastAPI):** Yüksek performanslı ve asenkron webhook altyapısı.
* **Google Gemini API:** `gemini-2.5-flash` modeli ile anlamsal analiz ve Function Calling yeteneği.
* **Twilio:** WhatsApp mesajlarını almak ve göndermek için HTTP köprüsü.
* **Supabase Client:** Veritabanına asenkron bağlantı aracı.

### Frontend
* **React + Vite:** Ultra hızlı derleme ve modüler modern UI.
* **TailwindCSS (v4):** Özel tasarlanmış stil ve komponent yönetimi.

---

## 📂 Proje Mimarisi (Pipeline)

1. **Müşteri** bir WhatsApp mesajı yollar.
2. **Twilio**, bu mesajı yakalayıp ngrok aracılığıyla **FastAPI** webhook'una `POST` eder.
3. FastAPI, gelen bağlamı ve telefon numarasını **Gemini AI** modeline besler.
4. Gemini, mesajın niyetine göre uygun Aracı (Tool) tetikler: `check_order_status`, `check_inventory` veya `create_support_ticket`.
5. Arka planda **Supabase**'e bağlanılır ve istenen veri (Örn: "Domates, 120 adet") çekilir.
6. Gemini, dönen soğuk veriyi okuyup insan dilinde, sıcak bir Türkçe mesaja çevirir.
7. Yanıt **Twilio** üzerinden müşteriye WhatsApp'tan ulaştırılır.

---

## ⚙️ Kurulum ve Çalıştırma Rehberi

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları sırasıyla uygulayın.

### 1. Gereksinimler
* Python 3.9+
* Node.js (v18+)
* [Ngrok](https://ngrok.com/) hesabı
* Supabase, Google Gemini ve Twilio API Anahtarları

### 2. Depoyu İndirme (Clone)
```bash
git clone https://github.com/KULLANICI_ADINIZ/omni-agent.git
cd omni-agent
```

### 3. Backend (API) Kurulumu
Backend klasörüne gidin ve gerekli Python kütüphanelerini kurun:
```bash
cd backend
pip install -r requirements.txt
```
Ardından `backend/.env.example` dosyasının adını `.env` olarak değiştirin ve kendi bilgilerinizi doldurun:
```env
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_KEY=YOUR_SUPABASE_ANON_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```
Sunucuyu başlatın:
```bash
python -m uvicorn main:app --reload --port 8080
```

### 4. Frontend (Dashboard) Kurulumu
Yeni bir terminal açıp frontend klasörüne girin ve kütüphaneleri kurun:
```bash
cd frontend
npm install
```
Ardından `frontend/.env.example` dosyasının adını `.env` olarak değiştirin ve Supabase bilgilerinizi girin:
```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```
Dashboard'u başlatın:
```bash
npm run dev
```
Dashboard `http://localhost:5173` adresinde çalışacaktır.

### 5. Twilio (WhatsApp) Bağlantısı
Yerel sunucunuzu internete açmak için farklı bir terminalde ngrok başlatın:
```bash
ngrok http 8080
```
Twilio Console > Messaging > Send a WhatsApp message > Sandbox Settings sekmesine gidip **WHEN A MESSAGE COMES IN** bölümüne Ngrok adresinizi ekleyin:
`https://<SİZİN-NGROK-ADRESİNİZ>/api/webhook/whatsapp`

---

## 📊 Veritabanı Tabloları (Supabase)
Projeyi Supabase'de denemek için aşağıdaki gibi SQL şeması oluşturabilirsiniz:

* **`products`**: id, name, stock_quantity, price
* **`orders`**: id, customer_phone, status (Örn: 'kargoda')
* **`tickets`**: id, customer_phone, issue_description, status, urgency_level
* **`chat_history`**: id, customer_phone, role, message_text, created_at

---

## 👨‍💻 Geliştirici Bilgileri
Bu proje bir Hackathon/Akademi girişimi konsepti kapsamında tasarlanmıştır. Tamamen asenkron yapıda çalışmakta ve kolaylıkla yatayda (scale) büyütülebilmektedir. Katkı sağlamak isterseniz (PR/Issue) her zaman bekleriz!

---

## ✅ Son Güncellemeler & İyileştirmeler

### 🖥️ Gelişmiş Dashboard (Admin Paneli)
*   **Güvenli Admin Girişi:** Panel, yabancı erişimine karşı `.env` tabanlı (`VITE_ADMIN_PASSWORD`) şık bir kilit/şifre ekranı ile korunur. Oturumlar tarayıcı `localStorage` üzerinde güvenle tutulur.
*   **Real-time Veri Akışı:** Supabase Realtime (Postgres Changes) kullanılarak sayfa yenilenmeden anlık stok değişimleri ve yeni siparişler ekrana yansıtılır.
*   **Pratik Ürün Yönetimi:** Admin panelindeki "Yeni Ekle" butonu sayesinde Supabase'e gitmeye gerek kalmadan şık bir modal (açılır form) üzerinden anında yeni ürün/malzeme eklenebilir. Eklendiği saniye tabloya yansır.
*   **Premium UI/UX:** `framer-motion` ile akıcı geçişler, `lucide-react` ile modern ikon seti ve koyu tema (dark mode) odaklı cam (glassmorphism) tasarımı.
*   **Dinamik İstatistikler:** Toplam sipariş, açık talepler ve kritik stok seviyeleri anlık olarak hesaplanır ve görsel kartlarla sunulur.

### ⚙️ Akıllı Agent Yetenekleri
*   **Otonom Sipariş Verme:** `place_order_tool` ile müşteriler artık WhatsApp üzerinden direkt sipariş verebilir. Sistem otomatik olarak stok kontrolü yapar ve bakiyeyi düşer.
*   **Akıllı Stok Kontrolü:** Müşteri sipariş vermek istediğinde LLM doğrudan siparişi onaylamaz, arka planda ürünün varlığını kontrol eder, eğer varsa müşteriye "Kaç adet istediğini" sorar. Olmayan ürün için sipariş sürecini nazikçe iptal eder.
*   **Hafıza (Memory):** Asistan artık önceki sohbetleri hatırlar ve isim, eski talepler gibi bağlamsal süreçleri takip eder.
*   **Duygu Analizi (Sentiment Analysis):** Müşterinin agresiflik seviyesine göre şikayetleri "Normal", "Yüksek" veya "Kritik" olarak etiketler; kritik şikayetler panele kırmızı yanıp sönerek düşer.
*   **Hata Yönetimi:** Ürün bulunamadığında veya stok yetersiz olduğunda Gemini, müşteriye nazik ve alternatif sunan yanıtlar verir.
*   **Gelişmiş Veritabanı Mantığı:** `database.py` içerisinde CRUD işlemleri asenkron ve güvenli hale getirilmiştir.
