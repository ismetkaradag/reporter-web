# İADE SİSTEMİ KURULUM REHBERİ

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Hazırlanan Dosyalar](#hazırlanan-dosyalar)
3. [Kurulum Adımları](#kurulum-adımları)
4. [API Endpoints](#api-endpoints)
5. [Frontend Sayfalar](#frontend-sayfalar)
6. [Test ve Doğrulama](#test-ve-doğrulama)

---

## 🎯 Genel Bakış

İade sistemi, harici API'den iade talepleri ve iadeler verilerini çeker, karmaşık iade tutarı hesaplamaları yapar (RT zincir takibi dahil) ve detaylı raporlar sunar.

### Ana Özellikler

- ✅ İade talepleri ve iadeler için ayrı tablolar
- ✅ RT (değişim) zinciri takibi ile orijinal fiyat bulma
- ✅ Tam/kısmi iade hesaplamaları
- ✅ Otomatik senkronizasyon (Cron)
- ✅ Detaylı Excel raporları
- ✅ Özet dashboard

---

## 📁 Hazırlanan Dosyalar

### 1. SQL Schema
**Dosya:** `return_system_schema.sql`

İçerik:
- `return_requests` tablosu (JSONB lines ile)
- `returns` tablosu (JSONB items ile)
- İndeksler (GIN, B-tree)
- RLS policies
- Triggers (updated_at otomatik güncelleme)

**Kurulum:**
```bash
# Supabase SQL Editor'da çalıştırın:
1. Supabase dashboard'a giriş yapın
2. SQL Editor'ı açın
3. return_system_schema.sql içeriğini yapıştırın
4. Run düğmesine basın
```

### 2. TypeScript Types
**Dosya:** `src/types/index.ts` (güncellendi)

Eklenen tipler:
- `ApiReturnRequest` ve `ApiReturnRequestLine`
- `ApiReturn` ve `ApiReturnItem`
- `ReturnRequest`, `Return` (DB tipleri)
- `ReturnRequestWithRefund`, `ReturnWithAmount` (hesaplama sonuçları)
- `ReturnSummaryStats`, `ReturnSummaryGroup`

### 3. External API Functions
**Dosya:** `src/lib/externalApi.ts` (güncellendi)

Eklenen fonksiyonlar:
```typescript
- fetchReturnRequestsPage(pageIndex, pageSize)
- fetchAllReturnRequests(onProgress?)
- fetchReturnsPage(pageIndex, pageSize)
- fetchAllReturns(onProgress?)
```

### 4. Supabase Operations
**Dosya:** `src/lib/returnOperations.ts` (YENİ)

İçerik:
- `transformApiReturnRequestToDb()` - API'den DB formatına dönüşüm
- `transformApiReturnToDb()` - API'den DB formatına dönüşüm
- `upsertReturnRequestsToSupabase()` - Batch upsert
- `upsertReturnsToSupabase()` - Batch upsert
- `syncReturnData()` - Sync orchestration

### 5. Return Amount Calculator
**Dosya:** `src/utils/returnAmountCalculator.ts` (YENİ)

İçerik:
- `findPriceInChain()` - RT zinciri takibi
- `calculateNormalOrderRefund()` - Normal sipariş iadesi
- `calculateRTOrderRefund()` - RT sipariş iadesi
- `calculateReturnRequestRefund()` - Ana hesaplama
- `calculateAllReturnRequestRefunds()` - Batch hesaplama
- `calculateReturnAmount()` - Return tutarı hesaplama
- `formatCurrency()` - Türkçe para formatı

---

## 🚀 Kurulum Adımları

### Adım 1: SQL Schema Kurulumu

```bash
# Supabase Dashboard'da:
1. https://supabase.com/dashboard
2. Projenizi seçin
3. Sol menüden "SQL Editor" seçin
4. "New query" butonuna tıklayın
5. return_system_schema.sql dosyasının içeriğini yapıştırın
6. "Run" butonuna tıklayın
7. Başarı mesajını bekleyin
```

**Doğrulama:**
```sql
-- Tabloların oluşturulduğunu kontrol edin:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('return_requests', 'returns');

-- İndeksleri kontrol edin:
SELECT indexname FROM pg_indexes
WHERE tablename IN ('return_requests', 'returns');
```

### Adım 2: API Sync Endpoints Oluşturma

İki yeni API endpoint oluşturacağız:

#### Endpoint 1: `/api/sync/return-requests`

**Dosya oluşturun:** `src/app/api/sync/return-requests/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllReturnRequests } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const SYNC_TOKEN = process.env.SYNC_TOKEN || '';

export async function POST(request: Request) {
  try {
    // Authorization kontrolü
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sync işlemini başlat
    const result = await syncReturnData(
      'return_requests',
      fetchAllReturnRequests
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      totalSynced: result.totalSynced
    });
  } catch (error: any) {
    console.error('Return requests sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Endpoint 2: `/api/sync/returns`

**Dosya oluşturun:** `src/app/api/sync/returns/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllReturns } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const SYNC_TOKEN = process.env.SYNC_TOKEN || '';

export async function POST(request: Request) {
  try {
    // Authorization kontrolü
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sync işlemini başlat
    const result = await syncReturnData(
      'returns',
      fetchAllReturns
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      totalSynced: result.totalSynced
    });
  } catch (error: any) {
    console.error('Returns sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Adım 3: Cron Job Endpoints Oluşturma

Otomatik senkronizasyon için cron endpoints:

#### Cron 1: `/api/cron/sync-return-requests`

**Dosya oluşturun:** `src/app/api/cron/sync-return-requests/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllReturnRequests } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: Request) {
  try {
    // Vercel Cron secret kontrolü
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-vercel-cron-secret');

    if (authHeader?.replace('Bearer ', '') !== CRON_SECRET &&
        cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sync işlemini başlat
    const result = await syncReturnData(
      'return_requests',
      fetchAllReturnRequests
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      totalSynced: result.totalSynced
    });
  } catch (error: any) {
    console.error('Cron return requests sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Cron 2: `/api/cron/sync-returns`

**Dosya oluşturun:** `src/app/api/cron/sync-returns/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { fetchAllReturns } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: Request) {
  try {
    // Vercel Cron secret kontrolü
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-vercel-cron-secret');

    if (authHeader?.replace('Bearer ', '') !== CRON_SECRET &&
        cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Sync işlemini başlat
    const result = await syncReturnData(
      'returns',
      fetchAllReturns
    );

    return NextResponse.json({
      success: result.success,
      message: result.message,
      totalSynced: result.totalSynced
    });
  } catch (error: any) {
    console.error('Cron returns sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Adım 4: vercel.json Güncelleme

**Dosya:** `vercel.json`

Mevcut cron job'lara ekleyin:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-orders",
      "schedule": "0 12 * * *"
    },
    {
      "path": "/api/cron/sync-users",
      "schedule": "0 13 * * *"
    },
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

**Açıklama:**
- 12:00 - Siparişler
- 13:00 - Müşteriler
- 14:00 - İade Talepleri (YENİ)
- 15:00 - İadeler (YENİ)

### Adım 5: Sidebar Menü Güncellemesi

**Dosya:** `src/components/Sidebar.tsx`

İade sistemi linklerini ekleyin:

```typescript
// Mevcut menü öğelerinin sonuna ekleyin:
{
  name: 'İade Talepleri',
  href: '/iade-talepleri',
  icon: RefreshCcw,
},
{
  name: 'İadeler',
  href: '/iadeler',
  icon: PackageReturn,
},
{
  name: 'İade Özet',
  href: '/iade-ozet',
  icon: FileText,
},
```

**Not:** `lucide-react`'ten gerekli ikonları import edin:
```typescript
import { RefreshCcw, PackageReturn, FileText } from 'lucide-react';
```

---

## 🧪 Test ve Doğrulama

### 1. SQL Schema Testi

```sql
-- Tablolar oluşturuldu mu?
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('return_requests', 'returns');

-- İndeksler var mı?
SELECT indexname FROM pg_indexes
WHERE tablename IN ('return_requests', 'returns');

-- RLS aktif mi?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('return_requests', 'returns');
```

### 2. Manuel Sync Testi

Terminal'den test edin:

```bash
# İade talepleri sync
curl -X POST http://localhost:3000/api/sync/return-requests \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"

# İadeler sync
curl -X POST http://localhost:3000/api/sync/returns \
  -H "Authorization: Bearer YOUR_SYNC_TOKEN"
```

**Beklenen yanıt:**
```json
{
  "success": true,
  "message": "Successfully synced 123 return_requests",
  "totalSynced": 123
}
```

### 3. Veritabanı Kontrolü

```sql
-- İade talepleri sayısı
SELECT COUNT(*) FROM return_requests;

-- İadeler sayısı
SELECT COUNT(*) FROM returns;

-- Son 10 kayıt
SELECT custom_number, custom_order_number, return_action, created_on
FROM return_requests
ORDER BY created_on DESC
LIMIT 10;
```

---

## 📊 Frontend Sayfalar (Sonraki Adım)

Frontend sayfaları ayrı bir görevde oluşturulacak:

1. `/iade-talepleri` - İade talepleri listesi ve Excel export
2. `/iadeler` - İadeler listesi
3. `/iade-ozet` - Özet rapor dashboard

---

## 🔧 Sorun Giderme

### Problem: SQL Schema çalışmıyor

**Çözüm:**
```sql
-- Tabloları silin (varsa)
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS return_requests CASCADE;

-- Schema'yı tekrar çalıştırın
```

### Problem: Sync token hatası

**Çözüm:**
`.env.local` dosyasını kontrol edin:
```env
SYNC_TOKEN=your_secure_token_here
```

### Problem: RT zincir takibi çalışmıyor

**Çözüm:**
- `from_id` değerlerinin doğru kaydedildiğini kontrol edin
- İade talepleri tablosunda tüm RT siparişlerinin bulunduğundan emin olun
- Sync işlemini tekrar çalıştırın

---

## 📝 Yapılacaklar Listesi

- [x] SQL schema oluştur
- [x] TypeScript tipleri ekle
- [x] External API fonksiyonları
- [x] Supabase operations
- [x] İade tutarı hesaplama
- [x] API sync endpoints
- [x] Cron job endpoints
- [ ] Frontend sayfaları (iade-talepleri)
- [ ] Frontend sayfaları (iadeler)
- [ ] Frontend sayfaları (iade-ozet)
- [ ] Excel export fonksiyonları
- [ ] Test ve deployment

---

## 📞 Destek

Sorularınız için projeyi kontrol edin veya dokümantasyonu inceleyin.

**Önemli Dosyalar:**
- `iade_sistemi_prompt.md` - Detaylı sistem dokümantasyonu
- `return_system_schema.sql` - SQL şema
- `src/lib/returnOperations.ts` - Supabase işlemleri
- `src/utils/returnAmountCalculator.ts` - Hesaplama mantığı

---

**Son Güncelleme:** 2025-10-30
