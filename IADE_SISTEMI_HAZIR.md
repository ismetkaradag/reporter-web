# ✅ İADE SİSTEMİ BACKEND TAMAMLANDI

## 🎉 Tamamlanan Bileşenler

### ✅ 1. Veritabanı (SQL Schema)
**Dosya:** `return_system_schema.sql`

- `return_requests` tablosu (JSONB ile)
- `returns` tablosu (JSONB ile)
- 15+ index (performans için)
- RLS policies (güvenlik)
- Auto-update triggers

**Kurulum:**
```bash
# Supabase SQL Editor'da çalıştırın
1. Supabase Dashboard > SQL Editor
2. return_system_schema.sql içeriğini yapıştırın
3. Run
```

---

### ✅ 2. TypeScript Types
**Dosya:** `src/types/index.ts`

Eklenen tipler (200+ satır):
- `ApiReturnRequest`, `ApiReturnRequestLine`
- `ApiReturn`, `ApiReturnItem`
- `ReturnRequest`, `Return`
- `ReturnRequestWithRefund`, `ReturnWithAmount`
- `ReturnSummaryStats`, `ReturnSummaryGroup`

---

### ✅ 3. External API Integration
**Dosya:** `src/lib/externalApi.ts`

Yeni fonksiyonlar:
```typescript
fetchReturnRequestsPage(pageIndex, pageSize)
fetchAllReturnRequests(onProgress)
fetchReturnsPage(pageIndex, pageSize)
fetchAllReturns(onProgress)
```

**Özellikler:**
- Token caching
- Pagination support
- Rate limiting (500ms)
- Progress callbacks

---

### ✅ 4. Supabase Operations
**Dosya:** `src/lib/returnOperations.ts` (YENİ)

**Fonksiyonlar:**
```typescript
transformApiReturnRequestToDb()   // API → DB format
transformApiReturnToDb()           // API → DB format
upsertReturnRequestsToSupabase()   // Batch insert/update
upsertReturnsToSupabase()          // Batch insert/update
syncReturnData()                   // Orchestration
```

**Özellikler:**
- Automatic date conversion (DD.MM.YYYY → ISO)
- Snake_case transformation
- JSONB array handling
- Upsert on conflict (custom_number)

---

### ✅ 5. Return Amount Calculator
**Dosya:** `src/utils/returnAmountCalculator.ts` (YENİ - 450+ satır)

**Ana Fonksiyonlar:**

#### RT Zincir Takibi
```typescript
findPriceInChain(request, line, allRequests)
```
- RT zincirini geriye doğru takip eder
- Orijinal ürün fiyatını bulur
- Döngü kontrolü yapar
- İndirimli fiyat önceliği

#### Normal Sipariş İadesi
```typescript
calculateNormalOrderRefund(request, order)
```
- Tam iade kontrolü (tüm ürünler)
- Kısmi iade hesaplama
- Vade farkı düşümü
- Line.price fallback

#### RT Sipariş İadesi
```typescript
calculateRTOrderRefund(request, allRequests, ordersMap)
```
- Her line için zincir takibi
- Max refund kontrolü
- Orijinal BK siparişi limiti

#### Batch İşlemler
```typescript
calculateAllReturnRequestRefunds(requests, orders)
calculateAllReturnAmounts(returns, requests, orders)
```

#### Para Formatı
```typescript
formatCurrency(amount) // → "1.002.125,45₺"
```

---

### ✅ 6. API Sync Endpoints

#### Manuel Sync
**POST** `/api/sync/return-requests`
**POST** `/api/sync/returns`

**Headers:**
```bash
Authorization: Bearer {SYNC_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 123 return_requests",
  "totalSynced": 123
}
```

**Test:**
```bash
curl -X POST http://localhost:3000/api/sync/return-requests \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

---

### ✅ 7. Cron Job Endpoints

#### Otomatik Senkronizasyon
**GET** `/api/cron/sync-return-requests` - Her gün 14:00
**GET** `/api/cron/sync-returns` - Her gün 15:00

**Headers:**
```bash
Authorization: Bearer {CRON_SECRET}
# veya
x-vercel-cron-secret: {CRON_SECRET}
```

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-return-requests",
      "schedule": "0 14 * * *"
    },
    {
      "path": "/api/cron/sync-returns",
      "schedule": "0 15 * * *"
    }
  ]
}
```

---

## 📋 Kurulum Adımları (Sıralı)

### 1️⃣ SQL Schema Kurulumu
```bash
# Supabase Dashboard
1. SQL Editor açın
2. return_system_schema.sql içeriğini yapıştırın
3. Run
4. Başarı mesajını bekleyin
```

**Doğrulama:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('return_requests', 'returns');
```

### 2️⃣ Proje Dosyaları Zaten Hazır
Aşağıdaki dosyalar oluşturuldu:
- ✅ `src/types/index.ts` (güncellendi)
- ✅ `src/lib/externalApi.ts` (güncellendi)
- ✅ `src/lib/returnOperations.ts` (YENİ)
- ✅ `src/utils/returnAmountCalculator.ts` (YENİ)
- ✅ `src/app/api/sync/return-requests/route.ts` (YENİ)
- ✅ `src/app/api/sync/returns/route.ts` (YENİ)
- ✅ `src/app/api/cron/sync-return-requests/route.ts` (YENİ)
- ✅ `src/app/api/cron/sync-returns/route.ts` (YENİ)
- ✅ `vercel.json` (güncellendi)

### 3️⃣ İlk Sync'i Çalıştırın
```bash
# Development ortamında
npm run dev

# Başka bir terminal'de
curl -X POST http://localhost:3000/api/sync/return-requests \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"

curl -X POST http://localhost:3000/api/sync/returns \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

### 4️⃣ Veritabanını Kontrol Edin
```sql
-- Kayıt sayıları
SELECT COUNT(*) FROM return_requests;
SELECT COUNT(*) FROM returns;

-- Son kayıtlar
SELECT custom_number, custom_order_number, return_action
FROM return_requests
ORDER BY created_on DESC
LIMIT 10;
```

### 5️⃣ Production'a Deploy Edin
```bash
git add .
git commit -m "Add return system backend"
git push

# Vercel otomatik deploy edecek
# Cron job'lar otomatik aktif olacak
```

---

## 🧪 Test Senaryoları

### Test 1: Normal Sipariş Tam İadesi
```typescript
// BK siparişi - Tüm ürünler iade ediliyor
// Beklenen: order_total - vade_farkı
```

### Test 2: Normal Sipariş Kısmi İade
```typescript
// BK siparişi - 2/5 ürün iade ediliyor
// Beklenen: (subTotalInclTax / quantity) * return_quantity
```

### Test 3: RT Zincir Takibi
```typescript
// RT7052BK2508092663 → RT6001BK2508092663 → BK2508092663
// Beklenen: Orijinal BK'deki ürün fiyatı
```

### Test 4: Max Refund Kontrolü
```typescript
// RT tam iadesi
// Beklenen: Hesaplanan tutar ≤ (order_total - vade_farkı)
```

---

## 📊 Veri Akışı

```
1. External API
   ↓
2. fetchAllReturnRequests() / fetchAllReturns()
   ↓ (pagination, 100/page, rate limiting)
3. transformApiToDb()
   ↓ (date conversion, snake_case, JSONB)
4. upsertToSupabase()
   ↓ (upsert on conflict)
5. Supabase Database
   ↓
6. Frontend Pages (next step)
```

---

## ⚙️ Hesaplama Algoritması

### Normal Sipariş İadesi
```
IF (orderTotalItems === requestTotalItems) THEN
  refund = order_total - vade_farkı
ELSE
  FOR EACH line IN request.lines:
    IF line.price EXISTS THEN
      refund += line.price * quantity
    ELSE
      orderItem = order.items.find(productId)
      refundPerItem = orderItem.subTotalInclTax / orderItem.quantity
      refund += refundPerItem * line.quantity
```

### RT Sipariş İadesi
```
FOR EACH line IN request.lines:
  originalPrice = findPriceInChain(line)
  refund += originalPrice * quantity

IF (tam_iade) THEN
  maxRefund = originalOrder.order_total - vade_farkı
  refund = MIN(refund, maxRefund)
```

### RT Zincir Takibi
```
currentOrder = RT7052BK2508092663
currentProduct = "Ürün B"

WHILE currentOrder.startsWith('RT'):
  fromId = extract(currentOrder) // 7052
  previousRequest = find(from_id === fromId)

  matchingLine = previousRequest.lines.find(
    replacement_product_name === currentProduct
  )

  IF previousOrder is BK:
    RETURN matchingLine.price (or product_price)

  currentProduct = matchingLine.product_name
  currentOrder = previousRequest.custom_order_number
```

---

## 🔒 Güvenlik

### RLS Policies
```sql
-- Authenticated kullanıcılar okuyabilir
SELECT: authenticated users

-- Service role tüm yetkiler
ALL: service_role
```

### API Authorization
```typescript
// Manuel sync
Authorization: Bearer {SYNC_TOKEN}

// Cron jobs
Authorization: Bearer {CRON_SECRET}
x-vercel-cron-secret: {CRON_SECRET}
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SYNC_TOKEN=your_secure_token
CRON_SECRET=vercel_auto_generated
```

---

## 📈 Performans

### İndeksler
- `custom_number` (unique)
- `custom_order_number` (B-tree)
- `customer_id` (B-tree)
- `created_on` (B-tree DESC)
- `lines` (GIN - JSONB)
- `items` (GIN - JSONB)

### Caching
- Token cache (memory)
- Token expiry kontrolü
- Rate limiting (500ms)

### Batch Operations
- 100 items/page
- Batch upsert
- Progress tracking

---

## 🎯 Sonraki Adımlar (Frontend)

### 1. İade Talepleri Sayfası
**Route:** `/iade-talepleri`

**Özellikler:**
- Liste görünümü (tablo)
- Filtreleme (action, status, tarih)
- Arama (sipariş no, müşteri)
- Excel export (detaylı rapor)
- Harici aktif siparişler

### 2. İadeler Sayfası
**Route:** `/iadeler`

**Özellikler:**
- Liste görünümü
- Filtreleme (action, payment status)
- Excel export

### 3. İade Özet Sayfası
**Route:** `/iade-ozet`

**Özellikler:**
- Action bazlı gruplar (Ödeme İadesi, Para Puan, Değişim)
- Status bazlı istatistikler
- Tutar toplamları
- İptal/Red ayrımı

---

## 📂 Dosya Yapısı

```
yonderReport/
├── return_system_schema.sql          # SQL schema (ÇALIŞTIRIN!)
├── IADE_SISTEMI_KURULUM.md          # Detaylı kurulum
├── IADE_SISTEMI_HAZIR.md            # Bu dosya (özet)
├── iade_sistemi_prompt.md           # Orijinal requirements
├── src/
│   ├── types/index.ts               # ✅ Types eklendi
│   ├── lib/
│   │   ├── externalApi.ts           # ✅ API fonksiyonları eklendi
│   │   └── returnOperations.ts     # ✅ YENİ
│   ├── utils/
│   │   └── returnAmountCalculator.ts # ✅ YENİ
│   └── app/
│       └── api/
│           ├── sync/
│           │   ├── return-requests/route.ts # ✅ YENİ
│           │   └── returns/route.ts         # ✅ YENİ
│           └── cron/
│               ├── sync-return-requests/route.ts # ✅ YENİ
│               └── sync-returns/route.ts         # ✅ YENİ
└── vercel.json                      # ✅ Cron jobs eklendi
```

---

## 🚨 Önemli Notlar

### 1. SQL Schema'yı Mutlaka Çalıştırın
Backend kodu hazır ama veritabanı tabloları oluşturulmadıysa çalışmaz!

```bash
# Supabase SQL Editor'da
return_system_schema.sql
```

### 2. İlk Sync Manuel Yapın
Cron job'lar günlük çalışır, ilk veriyi manuel çekin:

```bash
curl -X POST http://localhost:3000/api/sync/return-requests \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

### 3. RT Zinciri İçin Tüm Talepler Gerekli
RT sipariş iadesi hesaplaması için tüm iade talepleri veritabanında olmalı.

### 4. from_id Kritik Önem Taşıyor
RT zincir takibi `from_id` alanına bağlı. Bu alan doğru kaydedilmelidir.

---

## 📞 Yardım

### Sık Karşılaşılan Hatalar

**1. "Table does not exist"**
```bash
# Çözüm: SQL schema'yı çalıştırın
return_system_schema.sql
```

**2. "Unauthorized"**
```bash
# Çözüm: .env.local dosyasını kontrol edin
SYNC_TOKEN=xxx
CRON_SECRET=xxx
```

**3. "RT zincir takibi çalışmıyor"**
```bash
# Çözüm: Önce tüm return_requests'i sync edin
curl -X POST .../sync/return-requests
```

**4. "Calculation returning 0"**
```bash
# Çözüm: Sipariş verisi de veritabanında olmalı
# orders tablosunu kontrol edin
```

---

## ✅ Backend Checklist

- [x] SQL schema hazır
- [x] TypeScript types tanımlı
- [x] External API fonksiyonları
- [x] Supabase operations
- [x] İade tutarı hesaplamaları
- [x] RT zincir takibi
- [x] Manuel sync endpoints
- [x] Cron job endpoints
- [x] vercel.json güncellendi
- [x] Dokümantasyon tamamlandı

---

## 🎯 Frontend Checklist (Yapılacak)

- [ ] /iade-talepleri sayfası
- [ ] /iadeler sayfası
- [ ] /iade-ozet sayfası
- [ ] Excel export fonksiyonları
- [ ] Sidebar menü güncellemesi
- [ ] Filtreleme ve arama
- [ ] Harici aktif siparişler hesaplama

---

**🎉 Backend Hazır! Artık frontend sayfalarını oluşturabilirsiniz.**

**Sorularınız için:**
- `IADE_SISTEMI_KURULUM.md` - Adım adım kurulum
- `iade_sistemi_prompt.md` - Detaylı algoritma
- `src/utils/returnAmountCalculator.ts` - Hesaplama kodu

---

**Oluşturulma Tarihi:** 2025-10-30
**Backend Tamamlanma:** ✅ 100%
**Frontend İlerleme:** ⏳ 0%
