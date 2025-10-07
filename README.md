# Yönder Rapor Sistemi

Next.js 15 tabanlı, Supabase kullanan rapor ve analiz sistemi. Dış e-ticaret API'sinden sipariş verilerini çekerek Supabase veritabanında saklar ve raporlama yapar.

## 🚀 Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Environment Variables

`.env.local` dosyası oluşturun:

```bash
cp .env.example .env.local
```

Aşağıdaki değişkenleri doldurun:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Dış API
BASE_URL=https://yonder.okuldolabim.com/
COOKIE_VALUE=your_cookie
API_KEY=your_api_key
SECRET_KEY=your_secret_key
EMAIL=your_email
PASSWORD=your_password

# Sync Token
SYNC_TOKEN=your_random_token
NEXT_PUBLIC_SYNC_TOKEN=your_random_token

# Kampüsler (virgülle ayrılmış)
NEXT_PUBLIC_KAMPUSLER=Doğukent Kampüsü,Kampüs 2,Kampüs 3
```

### 3. Supabase Veritabanı Kurulumu

`db.sql` dosyasını Supabase SQL editöründe çalıştırın. Bu dosya şunları oluşturur:

- `campuses` tablosu
- `orders` tablosu
- `products` tablosu
- `customers` tablosu
- Gerekli indexler
- Helper fonksiyonlar

### 4. Projeyi Çalıştır

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açın.

## 📊 Veri Senkronizasyonu

### Manuel Senkronizasyon

Ana sayfadaki "Tüm Siparişleri Çek ve Kaydet" butonuna basın.

### API ile Senkronizasyon

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

## 🏗 Proje Yapısı

```
yonderReport/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/sync/          # Sync endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/            # React bileşenleri (gelecekte)
│   ├── lib/
│   │   ├── externalApi.ts    # Dış API entegrasyonu
│   │   ├── supabase.ts       # Supabase client
│   │   └── supabaseOperations.ts  # DB operasyonları
│   ├── types/
│   │   └── index.ts          # TypeScript tipleri
│   └── utils/
│       ├── campusUtils.ts    # Kampüs yardımcıları
│       ├── dateUtils.ts      # Tarih yardımcıları
│       ├── formatUtils.ts    # Format yardımcıları
│       └── orderUtils.ts     # Sipariş yardımcıları
├── db.sql                     # Veritabanı şeması
├── .env.example
└── package.json
```

## 💡 Önemli Notlar

### Ciro Hesaplama

```typescript
Ciro = orderTotal - paymentMethodAdditionalFeeInclTax
```

Vade farkı düşülerek net ciro hesaplanır.

### Sipariş Durumları

- **basarili**: Ödeme tamamlandı
- **iptal**: İptal edildi ama ödeme alınmış
- **iade**: İade edildi
- **onay-bekliyor**: Onay bekliyor
- **basarisiz**: Ödeme alınamadı veya iptal

### Pagination

Dış API'den veriler 100'lük sayfalarda çekilir. `fetchAllOrders()` fonksiyonu tüm sayfaları otomatik olarak gezer.

### UPSERT Mantığı

Siparişler `id` bazlı UPSERT ile kaydedilir. Aynı `id`'ye sahip sipariş varsa güncellenir, yoksa yeni kayıt oluşturulur.

## 🔧 Geliştirme

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## 📊 Özellikler

### ✅ Tamamlanan

- [x] **Dashboard Raporu**
  - Günlük, haftalık, aylık, tüm zamanlar istatistikleri
  - Toplam ciro, sipariş sayısı, ortalama sipariş değeri
  - İptal/İade tutarları
  - Para puan kullanımı
  - Kampüs bazlı istatistik tablosu
  - Sipariş durum dağılımı
  - Tarih ve kampüs filtreleme

- [x] **Veri Senkronizasyonu**
  - Dış API'den pagination ile tüm siparişleri çekme
  - Supabase'e UPSERT ile kaydetme
  - Token yönetimi ve cache
  - Rate limiting

### 📝 Gelecek Özellikler

- [ ] Sipariş listesi sayfası (detaylı liste ve arama)
- [ ] Excel export
- [ ] Ürün raporları
- [ ] Müşteri analizleri
- [ ] Teslimat raporu
- [ ] Günlük rapor

## 📚 Kullanılan Teknolojiler

- **Next.js 15.5** - React framework
- **React 18.3** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Supabase 2.58** - Backend & Database
- **date-fns 3.6** - Date utilities
- **xlsx 0.18** - Excel export
- **lucide-react** - Icons
