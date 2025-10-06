# Rapor Sistemi Projesi - Yeniden Oluşturma Kılavuzu

Bu doküman, mevcut rapor sistemini sıfırdan yeniden oluşturmak için gerekli tüm teknik detayları içerir. **NOT:** Yetkilendirme sistemi ve ürün adına özel raporlamalar bu dokümana dahil değildir.

## 📋 Proje Özeti

Modern bir Next.js tabanlı rapor ve analiz sistemi. E-ticaret platformundan veri çekerek, Supabase veritabanında saklayarak ve çeşitli raporlar sunarak işletme analitiği sağlar.

## 🛠 Teknoloji Stack

### Frontend & Framework
- **Next.js 14** (App Router kullanılıyor)
- **React 18**
- **TypeScript 5**
- **Tailwind CSS 3.4** (Styling)
- **@tailwindcss/postcss 4.1**

### Backend & Veritabanı
- **Supabase**
  - `@supabase/supabase-js ^2.45.0` (Client)
  - `@supabase/ssr ^0.6.1` (Server-Side Rendering)
  - PostgreSQL (Veritabanı)
  - Auth (Kimlik Doğrulama)

### Kütüphaneler
- **xlsx ^0.18.5** - Excel export işlemleri
- **date-fns ^3.6.0** - Tarih formatlama ve işlemleri
- **lucide-react ^0.536.0** - Icon sistemi

## 🏗 Proje Yapısı

```
reporttosupa/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Ana sayfa
│   │   ├── login/                   # Login sayfası
│   │   ├── dashboard/               # Dashboard raporu
│   │   ├── orders-list/             # Sipariş listesi
│   │   ├── delivery-report/         # Teslimat raporu
│   │   ├── campus-detailed-report/  # Detaylı kampüs raporu
│   │   ├── campus-set-sales-report/ # Set satış raporu
│   │   ├── cancelled-orders/        # İptal siparişler
│   │   ├── urunlu-siparis-raporu/   # Ürünlü sipariş raporu
│   │   ├── campus-orders-report/    # Kampüs sipariş sayısı
│   │   ├── kampus-satis-analizi/    # Kampüs satış analizi
│   │   ├── campus-class-analysis/   # Kampüs-Sınıf analizi
│   │   ├── products/                # Ürün listesi
│   │   ├── product-variation/       # Ürün varyasyon
│   │   ├── customer-page-analytics/ # Üye sayfa analizi
│   │   ├── no-purchase-members/     # Alışveriş yapmamış üyeler
│   │   ├── purchase-members/        # Alışveriş yapmış üyeler
│   │   ├── daily-report/            # Günlük rapor
│   │   ├── api/
│   │   │   ├── auth/route.ts        # Dış API login
│   │   │   ├── customers/route.ts   # Müşteri API
│   │   │   └── admin/               # Admin API'leri
│   │   └── auth/
│   │       └── callback/route.ts    # Supabase auth callback
│   ├── components/
│   │   ├── AuthGuard.tsx            # Route koruma
│   │   ├── Header.tsx               # Üst bar
│   │   ├── Sidebar.tsx              # Yan menü
│   │   ├── LayoutWrapper.tsx        # Layout wrapper
│   │   ├── ReportTable.tsx          # Genel tablo
│   │   ├── SummaryTable.tsx         # Özet tablo
│   │   └── OrderHeatmap.tsx         # Isı haritası
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth context (Supabase)
│   ├── hooks/
│   │   └── usePermissions.ts        # Yetki kontrol hooks
│   ├── lib/
│   │   └── supabase.ts             # Supabase client
│   ├── types/
│   │   └── index.ts                # TypeScript tipleri
│   ├── utils/
│   │   ├── campus.ts               # Kampüs yardımcı fonksiyonlar
│   │   └── date.ts                 # Tarih yardımcı fonksiyonlar
│   └── plugins/
│       └── supabase-tab-fix.ts     # Multi-tab auth fix
├── .env.local                       # Environment variables
└── package.json
```

## 🔌 API Entegrasyonları

### 1. Dış E-Ticaret API

**Base URL:** `process.env.BASE_URL`

#### Authentication
```typescript
// Endpoint: /api/customer/login
POST ${BASE_URL}/api/customer/login
Headers:
  - Content-Type: application/json
  - Cookie: .Application.Customer=${COOKIE_VALUE}

Body:
{
  "apiKey": string,
  "secretKey": string,
  "emailOrPhone": string,
  "password": string
}

Response:
{
  "success": boolean,
  "statusCode": number,
  "errors": any[],
  "data": {
    "version": string,
    "token": string,
    "refreshToken": string,
    "expiresIn": number
  }
}
```

#### Veri Çekme Endpointleri
- Sipariş verileri API'den çekiliyor (detaylı endpoint bilgisi kodda mevcut değil)
- Ürün verileri API'den çekiliyor
- Müşteri verileri API'den çekiliyor

### 2. Supabase Integration

**Configuration:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only
```

#### Veritabanı Tabloları

##### `orders` Tablosu
```typescript
interface Order {
  id?: number
  custom_order_number: string
  customer_info: string
  order_status: string
  payment_status: string
  state_province_name: string
  items: any[]
  created_on: string
  order_subtotal_incl_tax: number
  order_subtotal_excl_tax: number
  order_sub_total_discount_incl_tax: number
  order_sub_total_discount_excl_tax: number
  order_shipping_cost: number
  order_shipping_incl_tax: number
  order_shipping_excl_tax: number
  payment_method_additional_fee_text?: string
  payment_method_additional_fee_incl_tax: number
  payment_method_additional_fee_excl_tax: number
  tax: number
  order_total_discount: number
  order_total: number
  campus?: string
  campus_id?: number | null
  class?: string
  redeemed_reward_points: number
  redeemed_reward_points_amount: number
  identity_number?: string
  payment_method?: string
  installment?: string
  delivery_date?: string | null
  total_item_discount_amount?: number
  // Adres bilgileri...
}
```

##### `products` Tablosu
```typescript
interface Product {
  id: number
  name: string
  short_description?: string
  full_description?: string
  sku?: string
  model_code?: string
  gtin?: string
  price: number
  old_price: number
  product_cost: number
  stock_quantity: number
  published: boolean
  created_on: string
  updated_on: string
  // Kategori, üretici vs. ilişkiler...
}
```

##### `user_profiles` Tablosu (Yetkilendirme için - bu kısım hariç tutulabilir)
```typescript
interface UserProfile {
  user_id: string
  campus_permissions: string[]
  report_permissions: string[]
  is_super_admin: boolean
  created_at: string
  updated_at: string
}
```

##### `campuses` Tablosu
```typescript
interface Campus {
  id: number
  name: string
  type: 'merkez' | 'franchise'
  created_at: string
}
```

## 📊 Önemli İş Mantığı

### 1. Sipariş Durumu Belirleme
```typescript
function getOrderStatus(orderStatus: string, paymentStatus: string):
  'iptal' | 'iade' | 'onay-bekliyor' | 'basarili' | 'basarisiz' {

  // İptal edilmiş ama ödemesi alınmış
  if ((orderStatus === 'İptal Edildi' || orderStatus === 'İptal Tutarı Bankaya İletildi')
      && paymentStatus === 'Ödeme Tamamlandı') {
    return 'iptal'
  }

  // İptal edilmiş ve ödeme alınmamış
  if (orderStatus === 'İptal Edildi' && paymentStatus === 'Ödeme Alınamadı') {
    return 'basarisiz'
  }

  // İade edilmiş
  if (orderStatus === 'İade Edildi' && paymentStatus === 'Ödeme Tamamlandı') {
    return 'iade'
  }

  // Onay bekliyor
  if (orderStatus === 'Onay Bekliyor') {
    return 'onay-bekliyor'
  }

  // Başarılı
  if (paymentStatus === 'Ödeme Tamamlandı') {
    return 'basarili'
  }

  return 'basarisiz'
}
```

### 2. Ciro Hesaplama
```typescript
// Net ciro = order_total - vade farkı
const netAmount = order.order_total - (order.payment_method_additional_fee_incl_tax || 0)

// İndirim toplamı = sipariş seviyesi + ürün seviyesi
const totalDiscount = (order.order_sub_total_discount_incl_tax || 0) +
                     (order.total_item_discount_amount || 0)
```

### 3. Kampüs Tipleri
```typescript
// Environment variables'dan:
NEXT_PUBLIC_MERKEZ_KAMPUSLER=Kampüs1,Kampüs2,Kampüs3
NEXT_PUBLIC_FRANCHISE_KAMPUSLER=Franchise1,Franchise2

function getCampusType(campus: string): 'merkez' | 'franchise' | 'bilinmeyen' {
  if (MERKEZ_KAMPUSLER.includes(campus)) return 'merkez'
  if (FRANCHISE_KAMPUSLER.includes(campus)) return 'franchise'
  return 'bilinmeyen'
}
```

### 4. Para Formatı
```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(amount)
}
```

## 🔐 Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Dış API Configuration
BASE_URL=https://yonder.okuldolabim.com/
COOKIE_VALUE=your_cookie_value
API_KEY=L_M69BXRC02A7rylNIxxKA
SECRET_KEY=r0SZUq5pO0-ehNiQxPUgCg
EMAIL=api@yonder.okuldolabim.com
PASSWORD=IdhtqmeU5h

# Sync Security Token
SYNC_TOKEN=your_secure_random_token
NEXT_PUBLIC_SYNC_TOKEN=your_secure_random_token

# Site URL
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Stock Management
CRITICAL_STOCK_THRESHOLD=50

# Kampüs Listeleri
NEXT_PUBLIC_MERKEZ_KAMPUSLER=Kampüs1,Kampüs2,Kampüs3
NEXT_PUBLIC_FRANCHISE_KAMPUSLER=Franchise1,Franchise2,Franchise3

# Development
NEXT_PUBLIC_DEV_MODE=false
```

## 📱 Ana Özellikler ve Sayfalar

### Dashboard (Ana Sayfa)
- **Özellikler:**
  - Dün, Bugün, Bu Hafta, Bu Ay, Tüm Zamanlar istatistikleri
  - Toplam ciro, sipariş sayısı, ortalama sipariş değeri
  - İptal/İade tutarları
  - Para puan kullanımı
  - Kampüs bazlı sipariş istatistikleri (En çok/az sipariş veren kampüsler)
  - Sipariş durum dağılımı (progress bar chart)
  - Sipariş ciro ısı haritası (heatmap)
  - Tarih ve kampüs filtreleme

- **Veri Kaynağı:** `orders` tablosu
- **Hesaplamalar:**
  ```typescript
  // UTC bazlı tarih aralıkları
  - Dün: UTC dün 00:00 - 23:59:59
  - Bugün: UTC bugün 00:00 - şu an
  - Bu Hafta: Pazartesi 00:00 - şu an
  - Bu Ay: Ayın 1'i 00:00 - şu an
  ```

### Sipariş Listesi
- Sayfalama (50 kayıt/sayfa)
- Arama (sipariş no, üye, kampüs)
- Durum filtreleme (Başarılı, İptal, İade)
- Kampüs filtreleme
- Excel export (tüm filtreli veriler)

### Teslimat Raporu
- Teslim edilmiş siparişlerin detayları
- Teslimat tarihi bazlı filtreleme

### Kampüs Set Satış Raporu
- Set ürünlerin kampüs bazlı satış analizi
- Advantage ürün grubu özel hesaplamaları

### Kampüs Detaylı Rapor
- Günlük tekil ürün satış raporu
- Kampüs bazlı ciro analizi

### Kampüs-Sınıf Analiz Raporu
- Kampüs ve sınıf bazlı sipariş dağılımı
- Sınıf seviyesi detaylı analiz

### Ürün Raporları
- **Ürünler:** Tüm ürün listesi, stok durumu
- **Ürün Varyasyon:** Ürün kombinasyonları ve varyantlar

### Üye Analizleri
- **Sayfa Ziyaret Analizi:** Üyelerin sayfa görüntüleme istatistikleri
- **Alışveriş Yapmamış Üyeler:** Kayıtlı ama sipariş vermemiş üyeler
- **Alışveriş Yapmış Üyeler:** Aktif müşteri analizi

## 🔄 Veri Senkronizasyonu

### Otomatik Senkronizasyon
- Cron job ile düzenli veri çekme (önerilir)
- GitHub Actions ile otomatik sync (mevcut yapıda var)

### Manuel Senkronizasyon
```typescript
// Dev mode'da dashboard'ta manuel sync butonu
POST /api/sync/orders
Headers:
  Authorization: Bearer ${SYNC_TOKEN}
```

## 📊 Excel Export İşlemleri

### Genel Yapı
```typescript
import * as XLSX from 'xlsx'

// Veriyi hazırla
const excelData = orders.map(order => ({
  'Sipariş No': order.custom_order_number,
  'Kampüs': order.campus,
  'Tutar': order.order_total - order.payment_method_additional_fee_incl_tax,
  'Tarih': format(new Date(order.created_on), 'dd/MM/yyyy HH:mm')
}))

// Excel oluştur
const wb = XLSX.utils.book_new()
const ws = XLSX.utils.json_to_sheet(excelData)

// Kolon genişlikleri (opsiyonel)
ws['!cols'] = [
  { wch: 15 }, // Sipariş No
  { wch: 20 }, // Kampüs
  // ...
]

XLSX.utils.book_append_sheet(wb, ws, 'Sheet Adı')
XLSX.writeFile(wb, 'dosya_adi.xlsx')
```

## 🎨 UI/UX Detayları

### Tailwind Renk Paleti
```css
/* Başarılı: green */
bg-green-100 text-green-800
bg-green-600 hover:bg-green-700

/* İptal: red */
bg-red-100 text-red-800
bg-red-600 hover:bg-red-700

/* İade: orange */
bg-orange-100 text-orange-800
bg-orange-600 hover:bg-orange-700

/* Aktif/Primary: blue */
bg-blue-100 text-blue-700
bg-blue-600 hover:bg-blue-700

/* Neutral: gray */
bg-gray-50 text-gray-600
bg-gray-100 hover:bg-gray-200
```

### Responsive Breakpoints
```typescript
// Tailwind default breakpoints
sm: '640px'   // Mobil
md: '768px'   // Tablet
lg: '1024px'  // Laptop
xl: '1280px'  // Desktop
2xl: '1536px' // Büyük ekran
```

### Sidebar Navigasyon Yapısı
```typescript
const navLinks = [
  {
    title: 'Sipariş Raporları',
    items: [
      { href: '/dashboard', label: 'Özet Satış Raporu' },
      { href: '/orders-list', label: 'Sipariş Listesi' },
      // ...
    ]
  },
  {
    title: 'Kampüs Raporları',
    items: [...]
  },
  {
    title: 'Ürün Analizi',
    items: [...]
  },
  {
    title: 'Üye Analizi',
    items: [...]
  }
]
```

## 🚀 Kurulum ve Çalıştırma

### 1. Projeyi Oluştur
```bash
npx create-next-app@14 reporttosupa --typescript --tailwind --app
cd reporttosupa
```

### 2. Bağımlılıkları Yükle
```bash
npm install @supabase/supabase-js@^2.45.0 @supabase/ssr@^0.6.1
npm install xlsx@^0.18.5
npm install date-fns@^3.6.0
npm install lucide-react@^0.536.0
```

### 3. Environment Ayarları
- `.env.local` dosyası oluştur
- Yukarıdaki environment variables'ları doldur

### 4. Supabase Kurulumu
```sql
-- Gerekli tabloları oluştur
CREATE TABLE orders (...);
CREATE TABLE products (...);
CREATE TABLE campuses (...);
-- İndeksler ve RLS politikaları...
```

### 5. Çalıştır
```bash
npm run dev    # Development
npm run build  # Production build
npm run start  # Production server
```

## 📈 Performans Optimizasyonları

### 1. Veri Çekme Stratejisi
- Chunk-based fetching (1000 kayıt/chunk)
- Progressive loading (UI güncelleme her chunk'ta)
- Client-side filtering (büyük veri setleri için)

```typescript
const fetchInChunks = async () => {
  let allData = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .range(from, from + pageSize - 1)

    if (!data || data.length === 0) break

    allData = allData.concat(data)
    setOrders([...allData]) // UI güncelle

    if (data.length < pageSize) break
    from += pageSize
  }
}
```

### 2. Caching
- React hooks ile veri cache'leme
- Local storage kullanımı (dikkatli)
- Supabase realtime subscriptions (gerekirse)

### 3. Multi-tab Senkronizasyonu
```typescript
// plugins/supabase-tab-fix.ts
// Storage event listener ile cross-tab auth sync
window.addEventListener('storage', (e) => {
  if (e.key?.includes('supabase.auth')) {
    // Session değişikliğini algıla ve sync et
  }
})
```

## 🔍 Önemli Notlar

### Sipariş Durum Eşleştirmeleri
```typescript
const statusMapping = {
  'Onaylandı': 'Onaylandı (Ödeme Alındı, Sipariş Oluşturuldu)',
  'İptal Edildi': 'İptal Edildi (Ödeme Alındı Ancak Veli Siparişini İptal Edildi)',
  'İşleme Alındı': 'İşleme Alındı (Sipariş Paketlenmek Üzere Depoya Aktarıldı)',
  'Netloga Gönderildi': 'İşleme Alındı (Sipariş Paketlenmek Üzere Depoya Aktarıldı)',
  'Toplanıyor': 'İşleme Alındı (Sipariş Paketlenmek Üzere Depoya Aktarıldı)',
  'Paketlendi': 'Paketlendi (Sipariş Depoda Paketlendi)',
  'Kargoya Verildi': 'Kargoya Verildi (Siparişteki Ürünler Tam Olarak Sevk Edildi)',
  'Parçalı Kargo Verildi': 'Kısmi Gönderim (Stoktaki Ürünler Gönderildi...)',
  'Tamamlandı': 'Tamamlandı (Sipariş Teslim Edildi)',
}
```

### Tarih ve Saat Yönetimi
- **Veritabanı:** UTC formatında sakla
- **UI:** Local timezone'a çevir (date-fns locale: 'tr')
- **Filtreleme:** UTC başlangıç/bitiş kullan

### Türkçe Karakter Desteği
```typescript
// Arama ve sıralama için
const searchMatch = (text: string, search: string) => {
  return text.toLocaleLowerCase('tr-TR')
    .includes(search.toLocaleLowerCase('tr-TR'))
}

// Sıralama
array.sort((a, b) =>
  a.name.localeCompare(b.name, 'tr-TR')
)
```

## 🎯 Kritik İş Kuralları

1. **Ciro Hesaplama:** `order_total - payment_method_additional_fee_incl_tax`
2. **Başarılı Sipariş:** `payment_status === 'Ödeme Tamamlandı' && order_status !== 'İptal Edildi' && order_status !== 'İade Edildi'`
3. **İndirim:** Sipariş seviyesi + Ürün seviyesi indirimleri topla
4. **Hafta Başlangıcı:** Pazartesi (Türkiye standardı)
5. **Kampüs Filtreleme:** Super admin hariç, kullanıcılar sadece yetkili kampüsleri görebilir

## 📞 Yardımcı Linkler

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [SheetJS (xlsx)](https://docs.sheetjs.com/)
- [date-fns](https://date-fns.org/docs)

---

## ⚠️ Hariç Tutulan Özellikler

Bu prompt dokümantasyonunda **dahil edilmemiş** özellikler:

1. **Yetkilendirme Sistemi:**
   - Kullanıcı yönetimi
   - Rapor bazlı yetkilendirme
   - Kampüs bazlı yetkilendirme
   - Admin panel (/admin/permissions)
   - RLS (Row Level Security) politikaları

2. **Ürün Adına Özel Raporlamalar:**
   - Spesifik ürün setleri (Advantage vs.)
   - Özel ürün kategorileri
   - Ürün adına göre özel hesaplamalar
   - Markalı/kategorize raporlama

Bu özellikler gerektiğinde ayrıca eklenebilir veya basit versiyonları implement edilebilir.

---

**Son Güncelleme:** 2025-01-06
**Versiyon:** 1.0
