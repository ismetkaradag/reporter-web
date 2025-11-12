# İade Sistemi - Kapsamlı Dokümantasyon

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [External API'den Veri Çekme](#external-apiden-veri-çekme)
3. [Veri Yapıları](#veri-yapıları)
4. [Supabase Veri Modelleri](#supabase-veri-modelleri)
5. [İade Tutarı Hesaplama Mantığı](#iade-tutarı-hesaplama-mantığı)
6. [Excel Raporları](#excel-raporları)
7. [Sütun Açıklamaları ve Hesaplamalar](#sütun-açıklamaları-ve-hesaplamalar)

---

## 🎯 Genel Bakış

Bu sistem, e-ticaret platformundan **İade Talepleri** ve **İadeler** verilerini çeker, Supabase'e kaydeder ve detaylı raporlar oluşturur.

### İki Temel Veri Tipi

1. **İade Talepleri (Return Requests)**: Müşterinin iade talebinde bulunduğu ancak henüz iade işlemi tamamlanmamış kayıtlar
2. **İadeler (Returns)**: Onaylanmış ve işleme alınmış iade kayıtları

---

## 🔌 External API'den Veri Çekme

### Authentication

Tüm API çağrıları öncesinde login işlemi yapılır:

**Endpoint:** `POST {BASE_URL}/api/customer/login`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Cookie": ".Application.Customer={COOKIE_VALUE}"
}
```

**Request Body:**
```json
{
  "apiKey": "{API_KEY}",
  "secretKey": "{SECRET_KEY}",
  "emailOrPhone": "{EMAIL}",
  "password": "{PASSWORD}"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

---

### İade Talepleri API

**Endpoint:** `POST {BASE_URL}/adminapi/returnrequest/list`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {TOKEN}",
  "Cookie": ".Application.Customer={COOKIE_VALUE}"
}
```

**Request Body:**
```json
{
  "StartDate": null,
  "EndDate": null,
  "ReturnRequestReasonId": -1,
  "ReturnRequestActionId": -1,
  "ReturnRequestStatusId": -1,
  "CustomNumber": null,
  "pageIndex": 1,
  "pageSize": 100
}
```

**Response Yapısı:**
```typescript
{
  success: boolean
  statusCode: number
  errors: any[]
  data: ApiReturnRequest[]
  pageIndex: number
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  firstItem: number
  lastItem: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}
```

**API Return Request Detayı:**
```typescript
{
  id: number                              // Internal API ID
  customNumber: string                    // İade talep numarası (örn: "RT12345")
  orderId: number                         // Sipariş ID
  customOrderNumber: string               // Sipariş numarası (örn: "BK2508092663")
  customerId: number                      // Müşteri ID
  customerInfo: string                    // Müşteri bilgisi (Ad Soyad)
  returnReason: string                    // İade nedeni (örn: "Ürün beklentimi karşılamadı")
  returnReasonId: number                  // İade nedeni ID
  returnAction: string                    // İade aksiyonu (örn: "Ödeme İadesi", "Değişim", "Para Puan")
  returnActionId: number                  // İade aksiyonu ID (0 = Değişim)
  customerComments: string                // Müşteri yorumu
  staffNotes: string                      // Personel notu
  returnRequestStatusId: number           // Durum ID
  returnRequestStatusStr: string          // Durum metni (örn: "Onaylandı", "Beklemede")
  createdOn: string                       // Oluşturma tarihi (DD.MM.YYYY HH:mm:ss)
  returnCodeExpireDate: string            // Kod bitiş tarihi
  returnApprovalDate: string              // Onay tarihi
  returnWarehouseApprovalDate: string     // Depo onay tarihi
  returnCreatedOn: string                 // İade oluşturma tarihi
  returnCreatedOnDate: string             // İade oluşturma tarihi (alternatif)
  returnId: number                        // İlişkili iade ID
  returnCustomNumber: string              // İlişkili iade numarası
  lines: ApiReturnRequestLine[]           // İade satırları
}
```

**API Return Request Line:**
```typescript
{
  id: number                              // Satır ID
  productId: number                       // Ürün ID
  productName: string                     // Ürün adı
  quantity: number                        // Miktar
  fromAttr: string                        // İade edilen ürün özellikleri (Beden/Renk)
  replacementProductName: string          // Değişim ürünü adı (varsa)
  toAttr: string                          // Değişim ürünü özellikleri (varsa)
  sku: string                             // Stok kodu
  price: number                           // Fiyat
  productPrice: number                    // Ürün liste fiyatı
  requestLineCombinations: {              // Kombinasyon bilgileri
    productId: number
    name: string
    combinationId: number
    combinationSku: string
    combinationGtin: string
    quantity: number
  }[]
}
```

---

### İadeler API

**Endpoint:** `POST {BASE_URL}/adminapi/return/list`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {TOKEN}",
  "Cookie": ".Application.Customer={COOKIE_VALUE}"
}
```

**Request Body:**
```json
{
  "PageIndex": 1,
  "PageSize": 100
}
```

**Response Yapısı:**
```typescript
{
  success: boolean
  statusCode: number
  errors: any[]
  data: ApiReturn[]
  pageIndex: number
  pageNumber: number
  pageSize: number
  totalItems: number
  totalPages: number
  firstItem: number
  lastItem: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}
```

**API Return Detayı:**
```typescript
{
  id: number                                          // Internal API ID
  customReturnNumber: string                          // İade numarası (örn: "RET12345")
  customOrderNumber: string                           // Sipariş numarası
  orderId: number                                     // Sipariş ID
  returnReason: string                                // İade nedeni
  returnReasonId: number                              // İade nedeni ID
  returnAction: string                                // İade aksiyonu
  returnActionId: number                              // İade aksiyonu ID
  returnPaymentStatus: string                         // Ödeme durumu (örn: "Ödendi", "Ödenmedi", "İptal Edildi")
  returnPaymentStatusId: number                       // Ödeme durumu ID
  bankAccountNumber: string                           // Banka hesap numarası
  orderShippingInclTaxValue: number                   // Kargo ücreti (KDV dahil)
  paymentMethodAdditionalFeeInclTaxValue: number      // Vade farkı (KDV dahil)
  customerId: number                                  // Müşteri ID
  customerFullName: string                            // Müşteri adı soyadı
  customerIdentityNumber: string                      // Müşteri TC kimlik no
  returnRequestId: number                             // İlişkili iade talebi ID
  returnRequestCustomNumber: string                   // İlişkili iade talebi numarası
  paidDateUtc: string                                 // Ödeme tarihi
  items: any[]                                        // İade kalemleri
  createdOn: string                                   // Oluşturma tarihi (DD.MM.YYYY HH:mm:ss)
  addReturnNoteDisplayToCustomer: boolean             // Not müşteriye gösterilsin mi
  addReturnNoteMessage: string                        // İade notu mesajı
  canMarkReturnAsPaid: boolean                        // Ödendi olarak işaretlenebilir mi
}
```

---

## 🗄️ Supabase Veri Modelleri

### `return_requests` Tablosu

```sql
CREATE TABLE return_requests (
  id SERIAL PRIMARY KEY,
  custom_number TEXT UNIQUE NOT NULL,           -- İade talep numarası (unique key)
  order_id INTEGER,
  custom_order_number TEXT,
  customer_id INTEGER,
  customer_info TEXT,
  return_reason TEXT,
  return_reason_id INTEGER,
  return_action TEXT,
  return_action_id INTEGER,
  customer_comments TEXT,
  staff_notes TEXT,
  return_request_status_id INTEGER,
  return_request_status_str TEXT,
  created_on TIMESTAMP,
  return_code_expire_date TIMESTAMP,
  return_approval_date TIMESTAMP,
  return_warehouse_approval_date TIMESTAMP,
  return_created_on TIMESTAMP,
  return_created_on_date TIMESTAMP,
  return_id INTEGER,
  return_custom_number TEXT,
  lines JSONB,                                  -- İade satırları (JSON array)
  from_id INTEGER,                              -- API'deki orijinal ID
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_return_requests_custom_number ON return_requests(custom_number);
CREATE INDEX idx_return_requests_order_number ON return_requests(custom_order_number);
CREATE INDEX idx_return_requests_created_on ON return_requests(created_on);
```

**JSONB `lines` Yapısı:**
```json
[
  {
    "id": 123,
    "product_id": 456,
    "product_name": "Örnek Ürün",
    "quantity": 2,
    "from_attr": "Beden: L, Renk: Mavi",
    "replacement_product_name": "Değişim Ürünü",
    "to_attr": "Beden: XL, Renk: Siyah",
    "sku": "PROD-001",
    "price": 150.00,
    "product_price": 200.00,
    "request_line_combinations": [...]
  }
]
```

---

### `returns` Tablosu

```sql
CREATE TABLE returns (
  id SERIAL PRIMARY KEY,
  custom_return_number TEXT UNIQUE NOT NULL,    -- İade numarası (unique key)
  custom_order_number TEXT NOT NULL,
  order_id INTEGER NOT NULL,
  return_reason TEXT,
  return_reason_id INTEGER,
  return_action TEXT NOT NULL,
  return_action_id INTEGER NOT NULL,
  return_payment_status TEXT NOT NULL,
  return_payment_status_id INTEGER NOT NULL,
  bank_account_number TEXT,
  order_shipping_incl_tax_value NUMERIC,
  payment_method_additional_fee_incl_tax_value NUMERIC,
  customer_id INTEGER,
  customer_full_name TEXT,
  customer_identity_number TEXT,
  return_request_id INTEGER,
  return_request_custom_number TEXT,
  paid_date_utc TIMESTAMP,
  items JSONB,                                  -- İade kalemleri (JSON array)
  created_on TIMESTAMP,
  add_return_note_display_to_customer BOOLEAN,
  add_return_note_message TEXT,
  can_mark_return_as_paid BOOLEAN,
  from_id INTEGER,                              -- API'deki orijinal ID
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_returns_custom_return_number ON returns(custom_return_number);
CREATE INDEX idx_returns_order_number ON returns(custom_order_number);
CREATE INDEX idx_returns_created_on ON returns(created_on);
```

---

## 🧮 İade Tutarı Hesaplama Mantığı

İade tutarı hesaplaması sistemin en kritik kısmıdır. Farklı sipariş tiplerinde farklı mantıklar kullanılır.

### 1. Normal Siparişler (BK ile başlayan)

#### 1.1. Tam İade (Tüm Ürünler İade Ediliyorsa)

**Kontrol:**
```typescript
orderTotalItems === requestTotalItems &&
(return_action === 'Ödeme İadesi' || return_action === 'Para Puan')
```

**Hesaplama:**
```typescript
refund_amount = order_total - installment_fee
```

**Örnek:**
- Sipariş Toplamı: 500₺
- Vade Farkı: 50₺
- İade Tutarı: 500₺ - 50₺ = **450₺**

---

#### 1.2. Kısmi İade (Bazı Ürünler İade Ediliyorsa)

**Hesaplama:** Her satır için ayrı ayrı hesaplanır

```typescript
for each line in request.lines {
  // Değişim satırlarını atla (to_attr dolu ise)
  if (return_action !== 'Ödeme İadesi' &&
      return_action !== 'Para Puan' &&
      line.to_attr.trim() !== '') {
    continue
  }

  // Eğer line.price varsa direkt kullan
  if ((return_action === 'Ödeme İadesi' || return_action === 'Para Puan') &&
      line.price) {
    refund_amount += line.price
    continue
  }

  // Order'daki item'ı bul
  orderItem = order.items.find(item => item.productId == line.product_id)

  // Birim fiyatı hesapla
  refund_per_item = orderItem.subTotalInclTax / orderItem.quantity

  // Satır iadesini hesapla
  line_refund = refund_per_item * line.quantity

  refund_amount += line_refund
}
```

**Örnek:**
- Sipariş: 3 ürün (A: 100₺ x 2 adet, B: 150₺ x 1 adet)
- İade: Sadece A ürününden 1 adet
- Birim Fiyat: 100₺ / 2 = 50₺
- İade Tutarı: 50₺ x 1 = **50₺**

---

### 2. RT Siparişleri (Değişim Siparişleri)

RT siparişleri, daha önce bir değişim talebinde bulunulmuş siparişlerdir. **RT zinciri takip edilerek** orijinal ürün fiyatı bulunur.

**RT Sipariş Numarası Format:**
```
RT{from_id}BK{original_order_number}
Örnek: RT7052BK2508092663
```

#### 2.1. RT Zincir Takibi (findPriceInChain)

**Algoritma:**

```typescript
function findPriceInChain(request, currentLine, allRequests) {
  // Sadece Ödeme İadesi ve Para Puan için
  if (return_action !== 'Ödeme İadesi' && return_action !== 'Para Puan') {
    return 0
  }

  let currentOrderNumber = request.custom_order_number
  let currentProductName = currentLine.product_name
  let currentFromAttr = currentLine.from_attr
  const visitedOrderNumbers = new Set()
  visitedOrderNumbers.add(currentOrderNumber)

  // RT zincirini geriye doğru takip et
  while (currentOrderNumber.startsWith('RT')) {
    // RT'den from_id'yi çıkar (örn: RT7052BK2508144530 → 7052)
    const match = currentOrderNumber.match(/^RT(\d+)/)
    if (!match) break

    const previousRequestFromId = parseInt(match[1])

    // from_id'si bu olan önceki talebi bul
    const previousRequest = allRequests.find(r => r.from_id === previousRequestFromId)
    if (!previousRequest) break

    // Döngü kontrolü
    if (visitedOrderNumbers.has(previousRequest.custom_order_number)) break
    visitedOrderNumbers.add(previousRequest.custom_order_number)

    // Önceki talepteki eşleşen satırı bul
    // replacementProductName + toAttr = currentProductName + currentFromAttr
    const matchingLine = previousRequest.lines.find(line => {
      const productMatch = line.replacement_product_name === currentProductName
      const attrMatch = line.to_attr === currentFromAttr
      return productMatch && attrMatch
    })

    if (!matchingLine) break

    // Normal siparişe ulaştıysak, product_price'ı döndür
    if (!previousRequest.custom_order_number.startsWith('RT')) {
      // İndirimli fiyat varsa onu kullan
      if (matchingLine.product_price &&
          matchingLine.price &&
          matchingLine.price < matchingLine.product_price) {
        return matchingLine.price
      }
      return matchingLine.product_price || 0
    }

    // Hala RT zincirindeyiz, devam et
    currentProductName = matchingLine.product_name
    currentFromAttr = matchingLine.from_attr
    currentOrderNumber = previousRequest.custom_order_number
  }

  // Normal siparişe ulaştıysak, son kontrol
  if (!currentOrderNumber.startsWith('RT')) {
    const normalOrderRequest = allRequests.find(r =>
      r.custom_order_number === currentOrderNumber
    )

    if (normalOrderRequest && normalOrderRequest.lines) {
      const matchingLine = normalOrderRequest.lines.find(line => {
        return line.product_name === currentProductName &&
               line.from_attr === currentFromAttr
      })

      if (matchingLine) {
        // İndirimli fiyat varsa onu kullan
        if (matchingLine.product_price > 0 &&
            matchingLine.price &&
            matchingLine.price < matchingLine.product_price) {
          return matchingLine.price
        }
        return matchingLine.product_price || 0
      }
    }
  }

  return 0
}
```

**Zincir Örneği:**

```
1. İlk Sipariş: BK2508092663
   - Ürün A (Mavi, L) → 200₺

2. İlk Değişim: RT6001BK2508092663
   - İade: Ürün A (Mavi, L)
   - Değişim: Ürün A (Siyah, XL) → 200₺ (aynı fiyat)

3. İkinci Değişim: RT7052RT6001BK2508092663
   - İade: Ürün A (Siyah, XL)
   - Değişim: Ürün B (Kırmızı, M) → 250₺

4. Şimdi Ödeme İadesi İstiyor: RT7052RT6001BK2508092663
   - Zinciri takip et:
     * RT7052 → from_id: 7052 (RT6001BK2508092663)
     * Ürün B'yi ara, eşleşen: Ürün A (Siyah, XL)
     * RT6001 → from_id: 6001 (BK2508092663)
     * Ürün A (Siyah, XL)'i ara, eşleşen: Ürün A (Mavi, L)
     * Normal sipariş: Ürün A (Mavi, L) → **200₺**
   - İade Tutarı: **200₺** (orijinal fiyat)
```

---

#### 2.2. RT Siparişleri İade Tutarı Hesaplama

```typescript
if (request.custom_order_number.startsWith('RT')) {
  // Her line için RT zincirini takip et
  request.lines.forEach(line => {
    const originalPrice = findPriceInChain(request, line, allRequests)

    if (originalPrice > 0) {
      refund_amount += originalPrice * line.quantity
    } else {
      hasError = true
    }
  })

  // Max refund kontrolü (orijinal BK siparişine göre)
  const bkMatch = request.custom_order_number.match(/BK\d+/)
  if (bkMatch &&
      refund_amount > 0 &&
      (return_action === 'Ödeme İadesi' || return_action === 'Para Puan')) {

    const originalOrderNumber = bkMatch[0]
    const originalOrder = ordersMap.get(originalOrderNumber)

    if (originalOrder) {
      const requestTotalItems = request.lines.reduce((sum, line) =>
        sum + line.quantity, 0
      )
      const orderTotalItems = originalOrder.items.reduce((sum, item) =>
        sum + item.quantity, 0
      )

      // Eğer tüm ürünler iade ediliyorsa
      if (orderTotalItems === requestTotalItems) {
        const orderMaxRefund = originalOrder.order_total -
                               originalOrder.payment_method_additional_fee_incl_tax

        // Hesaplanan tutar asla sipariş toplamını geçemez
        if (refund_amount > orderMaxRefund) {
          refund_amount = orderMaxRefund
        }
      }
    }
  }
}
```

---

### 3. İadeler (Returns) İçin Tutar Hesaplama

İadeler tablosundaki kayıtlar için tutar hesaplanırken **iade talebinden** veya **items'den** fiyat alınır.

```typescript
function calculateReturnAmount(returnItem, requestsWithRefundAmount, ordersMap) {
  let returnAmount = 0
  let returnRequest = null

  // 1. return_request_custom_number varsa direkt bul
  if (returnItem.return_request_custom_number) {
    returnRequest = requestsWithRefundAmount.find(r =>
      r.custom_number === returnItem.return_request_custom_number
    )
  } else {
    // 2. custom_order_number ile ara
    const matchingRequests = requestsWithRefundAmount.filter(r =>
      r.custom_order_number === returnItem.custom_order_number
    )

    if (matchingRequests.length === 1) {
      returnRequest = matchingRequests[0]
    } else if (matchingRequests.length > 1) {
      // Birden fazla talep varsa items'daki productPrice kullan
      returnAmount = returnItem.items.reduce((sum, item) =>
        sum + (item.productPrice || 0), 0
      )
    }
  }

  // Return request bulunduysa
  if (returnRequest && returnAmount === 0) {
    // Return request'teki price'ları kullan
    returnAmount = returnRequest.lines.reduce((sum, line) => {
      if (line.price && line.price > 0) {
        return sum + (line.price * line.quantity)
      }
      return sum
    }, 0)
  } else if (returnAmount === 0) {
    // Fallback: items'daki subTotalInclTaxValue veya productPrice
    returnAmount = returnItem.items.reduce((sum, item) =>
      sum + (item.subTotalInclTaxValue || item.productPrice || 0), 0
    )
  }

  // Son kontrol: Eğer hala 0 ise
  if (returnAmount === 0 && returnItem.items) {
    returnAmount = returnItem.items.reduce((sum, item) =>
      sum + (item.productPrice || 0), 0
    )
  }

  // Orijinal BK siparişine göre max refund kontrolü
  let orderNumber = returnItem.custom_order_number
  if (orderNumber.startsWith('RT')) {
    const bkMatch = orderNumber.match(/BK\d+/)
    if (bkMatch) {
      orderNumber = bkMatch[0]
    }
  }

  const mainOrder = ordersMap.get(orderNumber)
  if (mainOrder && mainOrder.order_total && returnAmount > 0) {
    const maxRefund = mainOrder.order_total -
                     (mainOrder.payment_method_additional_fee_incl_tax || 0)

    if (returnAmount > maxRefund) {
      returnAmount = maxRefund
    }
  }

  return returnAmount
}
```

---

## 📊 Excel Raporları

### 1. İade Talepleri - Detaylı Rapor

**Dosya:** `/iade-talepleri` sayfasındaki "Detaylı Rapor" butonu

**Excel Yapısı:**
- **İlk Sayfa:** "Özet" - Tüm action+status kombinasyonlarının özeti
- **Sonraki Sayfalar:** Her action+status kombinasyonu için ayrı sayfa

#### Özet Sayfası Sütunları:

| Sütun | Açıklama |
|-------|----------|
| Sayfa Adı | Action-Status kombinasyonu (örn: "Ödeme İadesi-Onaylandı") |
| Kayıt Sayısı | Bu kombinasyondaki talep sayısı |
| Tip | "İade Talebi" veya "İade" |
| Toplam İade Tutarı | Hesaplanan toplam iade tutarı (₺) |

#### Detay Sayfası Sütunları:

| Sütun | Açıklama | Hesaplama |
|-------|----------|-----------|
| **İade Talep No** | İade talebi numarası | `custom_number` |
| **Sipariş No** | İlişkili sipariş numarası | `custom_order_number` |
| **Müşteri** | Müşteri adı soyadı | `customer_info` |
| **İade Nedeni** | İade nedeni | `return_reason` |
| **İade Aksiyonu** | Ödeme İadesi / Para Puan / Değişim | `return_action` |
| **Durum** | İade talebi durumu | `return_request_status_str` |
| **İade Tutarı (₺)** | Hesaplanan iade tutarı | Yukarıdaki hesaplama mantığı |
| **Hata** | Hesaplama hatası varsa | Hata mesajı |
| **Sipariş Toplamı (₺)** | Orijinal sipariş toplamı | `order.order_total` |
| **Sipariş Ürün Sayısı** | Siparişteki toplam ürün sayısı | `sum(order.items.quantity)` |
| **İade Ürün Sayısı** | İade edilen ürün sayısı | `sum(request.lines.quantity)` (to_attr boş olanlar) |
| **Tam İade** | Tüm ürünler mi iade ediliyor | `orderTotalItems === requestTotalItems` |
| **Müşteri Yorumu** | Müşteri yorumu | `customer_comments` |
| **Personel Notu** | Personel notu | `staff_notes` |
| **İade No** | Oluşturulan iade numarası | `return_custom_number` |
| **Toplam Ürün Adedi** | İade talebindeki toplam ürün | `sum(lines.quantity)` |
| **Vade Farkı (₺)** | Siparişteki vade farkı | `order.payment_method_additional_fee_incl_tax` |
| **Harici Aktif Sipariş** | Müşterinin diğer aktif siparişleri | Virgülle ayrılmış sipariş numaraları |
| **Harici Sipariş Ürün Adedi** | Diğer siparişlerdeki toplam ürün | `sum(activeOrders.items.quantity)` |
| **Harici Sipariş Toplam (₺)** | Diğer siparişlerin toplamı | `sum(activeOrders.order_total)` |
| **Talep Tarihi** | Talep oluşturma tarihi | `created_on` |
| **Kod Bitiş Tarihi** | İade kodu bitiş tarihi | `return_code_expire_date` |
| **Onay Tarihi** | Onay tarihi | `return_approval_date` |
| **Depo Onay Tarihi** | Depo onay tarihi | `return_warehouse_approval_date` |
| **İade Oluşturma Tarihi** | İade oluşturma tarihi | `return_created_on` |

---

#### Harici Aktif Siparişler Hesaplama

**Mantık:**
1. Müşterinin tüm siparişlerini çek (`customer_info` ile)
2. İptal/İade durumunda OLMAYANLAR
3. İade talebi OLMAYAN siparişler
4. **YENİ:** Eğer kısmi iade ise (`order_total !== refund_amount`), mevcut sipariş de dahil edilir

```typescript
const activeOrders = customerOrders.filter(order => {
  // İptal veya iade durumunda olanları atla
  if (order.order_status === 'İptal Edildi' ||
      order.order_status === 'İade' ||
      order.order_status === 'İptal') {
    return false
  }

  // Bu sipariş için iade talebi varsa
  if (returnRequestOrderNumbers.has(order.custom_order_number)) {
    // Eğer bu mevcut talebin kendi siparişiyse
    if (order.custom_order_number === request.custom_order_number) {
      // Kısmi iade kontrolü: Sipariş toplamı iade tutarından farklıysa dahil et
      if (request.order_total_amount && request.refund_amount &&
          request.order_total_amount !== request.refund_amount) {
        return true // Kısmi iade, siparişi dahil et
      }
    }
    // Tam iade veya başka bir talebin siparişi, atla
    return false
  }

  return true
})
```

---

### 2. İadeler - Excel Raporu

**Dosya:** `/iadeler` sayfasındaki "Excel İndir" butonu

**Tek sayfa Excel raporu**

#### Sütunlar:

| Sütun | Açıklama | Kaynak |
|-------|----------|--------|
| **İade No** | İade numarası | `custom_return_number` |
| **Sipariş No** | İlişkili sipariş numarası | `custom_order_number` |
| **Sipariş ID** | Sipariş ID | `order_id` |
| **İade Talebi No** | İlişkili iade talebi numarası | `return_request_custom_number` |
| **İade Aksiyonu** | Ödeme İadesi / Para Puan / Değişim | `return_action` |
| **Ödeme Durumu** | Ödendi / Ödenmedi / İptal Edildi | `return_payment_status` |
| **Ödeme Tarihi** | Ödeme yapıldıysa tarihi | `paid_date_utc` |
| **Tarih** | İade oluşturma tarihi | `created_on` |

---

### 3. İade Özet Raporu

**Dosya:** `/iade-ozet` sayfası

**Ekranda görüntülenen özet rapor** (Excel yok)

#### İade Talepleri Tabloları

Her **return_action** için ayrı tablo:
- Ödeme İadesi
- Para Puan
- Değişim

**Tablodaki Sütunlar:**

| Sütun | Açıklama | Hesaplama |
|-------|----------|-----------|
| **Durum** | İade talebi durumu | `return_request_status_str` |
| **Sayı** | Bu durumdaki talep sayısı | `count(*)` |
| **Tutar** | Toplam iade tutarı | `sum(refund_amount)` |
| **Alt Toplam** | Durum toplamları | İptal/Red hariç toplamlar |

**Özel Durum:** "İptal" veya "Red" kelimesi geçen durumlar alt toplama DAHİL DEĞİLDİR, ayrı gösterilir.

**Not:** Değişim aksiyonu için **Tutar sütunu gösterilmez** (sadece Sayı)

---

#### İadeler Tabloları

Her **return_action** için ayrı tablo:
- Ödeme İadesi
- Para Puan
- Değişim

**Tablodaki Sütunlar:**

| Sütun | Açıklama | Hesaplama |
|-------|----------|-----------|
| **Durum** | Ödeme durumu | `return_payment_status` |
| **Sayı** | Bu durumdaki iade sayısı | `count(*)` |
| **Tutar** | Toplam iade tutarı | `sum(calculated_return_amount)` |
| **Alt Toplam** | Durum toplamları | İptal/Red hariç toplamlar |

**Özel Durum:** "İptal" veya "Red" kelimesi geçen durumlar alt toplama DAHİL DEĞİLDİR, ayrı gösterilir.

---

## 🔄 Senkronizasyon İşlemi

### Çalışma Şekli

1. **Manual Sync:** `POST /api/sync/return-requests` veya `POST /api/sync/returns`
   - Header: `Authorization: Bearer {SYNC_TOKEN}`

2. **Vercel Cron Job:** Otomatik periyodik çalıştırma
   - Header: `Authorization: Bearer {CRON_SECRET}`
   - veya `x-vercel-cron-secret: {CRON_SECRET}`

### Senkronizasyon Algoritması

```typescript
1. Login ile token al
2. İlk sayfayı çek (pageIndex: 1) → totalPages öğren
3. İlk sayfayı Supabase'e kaydet (upsert)
4. totalPages'ten geriye doğru git (pageIndex: totalPages → 2)
5. Her sayfayı Supabase'e kaydet (upsert)
6. Response: { success, total, message }
```

**Upsert:** `onConflict: 'custom_number'` veya `onConflict: 'custom_return_number'`
- Varsa güncelle, yoksa ekle

---

## 🎨 Para Formatı

**Türkçe Format:** `1.002.125,45₺`
- Binlik ayracı: `.` (nokta)
- Ondalık ayracı: `,` (virgül)
- 2 ondalık basamak

```typescript
const formatCurrency = (amount: number) => {
  const formatted = amount.toFixed(2)
  const [integerPart, decimalPart] = formatted.split('.')

  const reversedInteger = integerPart.split('').reverse().join('')
  const groupedReversed = reversedInteger.match(/.{1,3}/g) || []
  const formattedInteger = groupedReversed.join('.').split('').reverse().join('')

  return `${formattedInteger},${decimalPart}₺`
}
```

---

## 🔍 Veri Filtreleme (validRequests)

İade talepleri işlenirken **geçersiz kayıtlar** filtrelenir:

```typescript
const validRequests = allRequests.filter(request => {
  // Lines yoksa geçersiz
  if (!request.lines || request.lines.length === 0) {
    return false
  }

  // En az bir line'da from_attr dolu olmalı
  const hasValidLine = request.lines.some(line =>
    line.from_attr && line.from_attr.trim() !== ''
  )

  return hasValidLine
})
```

**Neden?** `from_attr` boş olan satırlar gerçek bir ürün iadesi değil, sistem kaydı olabilir.

---

## 📝 Önemli Notlar

### 1. Değişim (return_action_id === 0)

API'den `return_action_id: 0` gelirse, bu **Değişim** demektir.
```typescript
return_action = return_action_id === 0 ? 'Değişim' : return_action
```

### 2. Tarih Formatı Dönüşümü

API'den gelen tarihler `DD.MM.YYYY HH:mm:ss` formatındadır.
Supabase'e kaydederken ISO formatına çevirilir: `YYYY-MM-DDTHH:mm:ss`

### 3. RT Sipariş Numarası Yapısı

```
RT{from_id}BK{original_order_number}
      ↑              ↑
   İade talebi    Orijinal sipariş
   ID'si          numarası
```

### 4. Vade Farkı (Installment Fee)

Vade farkı **iade tutarından DÜŞÜLÜR**, müşteriye iade EDİLMEZ.

### 5. İptal ve Red Durumları

"İptal" veya "Red" kelimesi içeren durumlar:
- Alt toplama dahil edilmez
- Ayrı gösterilir (gri renkte)
- Raporlarda yer alır ama toplam hesaplamalarına katılmaz

---

## 🚀 Geliştirme Notları

### Environment Variables

```env
# API Credentials
BASE_URL=https://api.example.com
API_KEY=xxx
SECRET_KEY=xxx
EMAIL=admin@example.com
PASSWORD=xxx
COOKIE_VALUE=xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Sync Tokens
CRON_SECRET=xxx
SYNC_TOKEN=xxx
```

### TypeScript Types

Tüm tipler `/src/types/index.ts` dosyasında tanımlıdır.

### Cache

İade Özet sayfası **30 dakika** cache'lenir:
```typescript
export const revalidate = 1800 // 30 dakika
```

---

## 📞 Destek

Sorularınız için: [GitHub Issues](https://github.com/your-repo/issues)

---

**Son Güncelleme:** 2025-10-30
