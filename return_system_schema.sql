-- ===============================================
-- İADE SİSTEMİ - SUPABASE SCHEMA
-- ===============================================
-- Oluşturma Tarihi: 2025-10-30
-- Açıklama: İade Talepleri ve İadeler için veritabanı şeması
-- ===============================================

-- ===============================================
-- 1. RETURN REQUESTS (İade Talepleri) TABLOSU
-- ===============================================

CREATE TABLE IF NOT EXISTS return_requests (
  id SERIAL PRIMARY KEY,

  -- Temel Bilgiler
  custom_number TEXT UNIQUE NOT NULL,           -- İade talep numarası (örn: "RT12345")
  order_id INTEGER,
  custom_order_number TEXT,                     -- Sipariş numarası (örn: "BK2508092663")

  -- Müşteri Bilgileri
  customer_id INTEGER,
  customer_info TEXT,                           -- Müşteri adı soyadı

  -- İade Detayları
  return_reason TEXT,                           -- İade nedeni
  return_reason_id INTEGER,
  return_action TEXT,                           -- İade aksiyonu (Ödeme İadesi, Para Puan, Değişim)
  return_action_id INTEGER,

  -- Yorumlar ve Notlar
  customer_comments TEXT,                       -- Müşteri yorumu
  staff_notes TEXT,                            -- Personel notu

  -- Durum Bilgileri
  return_request_status_id INTEGER,
  return_request_status_str TEXT,              -- Durum metni (Onaylandı, Beklemede, vb.)

  -- Tarih Bilgileri
  created_on TIMESTAMP,                        -- Talep oluşturma tarihi
  return_code_expire_date TIMESTAMP,           -- Kod bitiş tarihi
  return_approval_date TIMESTAMP,              -- Onay tarihi
  return_warehouse_approval_date TIMESTAMP,    -- Depo onay tarihi
  return_created_on TIMESTAMP,                 -- İade oluşturma tarihi
  return_created_on_date TIMESTAMP,            -- İade oluşturma tarihi (alternatif)

  -- İlişkili İade Bilgisi
  return_id INTEGER,                           -- İlişkili iade ID
  return_custom_number TEXT,                   -- İlişkili iade numarası

  -- JSON Veriler
  lines JSONB,                                 -- İade satırları (JSON array)

  -- Sistem Bilgileri
  from_id INTEGER,                             -- API'deki orijinal ID
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE return_requests IS 'Müşteri iade talepleri - External API''den senkronize edilir';
COMMENT ON COLUMN return_requests.custom_number IS 'Unique iade talep numarası (örn: RT12345)';
COMMENT ON COLUMN return_requests.lines IS 'İade edilen ürün satırları, kombinasyonlar ve değişim bilgileri (JSONB array)';
COMMENT ON COLUMN return_requests.from_id IS 'External API''deki orijinal ID - RT zincir takibi için kritik';

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_return_requests_custom_number ON return_requests(custom_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_number ON return_requests(custom_order_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_customer_id ON return_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_created_on ON return_requests(created_on DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(return_request_status_str);
CREATE INDEX IF NOT EXISTS idx_return_requests_action ON return_requests(return_action);
CREATE INDEX IF NOT EXISTS idx_return_requests_from_id ON return_requests(from_id);

-- JSONB GIN index for lines array
CREATE INDEX IF NOT EXISTS idx_return_requests_lines_gin ON return_requests USING GIN (lines);

-- ===============================================
-- 2. RETURNS (İadeler) TABLOSU
-- ===============================================

CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,

  -- Temel Bilgiler
  custom_return_number TEXT UNIQUE NOT NULL,    -- İade numarası (örn: "RET12345")
  custom_order_number TEXT NOT NULL,            -- Sipariş numarası
  order_id INTEGER NOT NULL,

  -- İade Detayları
  return_reason TEXT,                           -- İade nedeni
  return_reason_id INTEGER,
  return_action TEXT NOT NULL,                  -- İade aksiyonu
  return_action_id INTEGER NOT NULL,

  -- Ödeme Bilgileri
  return_payment_status TEXT NOT NULL,          -- Ödeme durumu (Ödendi, Ödenmedi, İptal Edildi)
  return_payment_status_id INTEGER NOT NULL,
  bank_account_number TEXT,                     -- Banka hesap numarası
  paid_date_utc TIMESTAMP,                      -- Ödeme tarihi

  -- Ücret Bilgileri
  order_shipping_incl_tax_value NUMERIC(10, 2),                -- Kargo ücreti (KDV dahil)
  payment_method_additional_fee_incl_tax_value NUMERIC(10, 2), -- Vade farkı (KDV dahil)

  -- Müşteri Bilgileri
  customer_id INTEGER,
  customer_full_name TEXT,                      -- Müşteri adı soyadı
  customer_identity_number TEXT,                -- TC kimlik no

  -- İlişkili Talep Bilgisi
  return_request_id INTEGER,                    -- İlişkili iade talebi ID
  return_request_custom_number TEXT,            -- İlişkili iade talebi numarası

  -- JSON Veriler
  items JSONB,                                  -- İade kalemleri (JSON array)

  -- Tarih ve Not Bilgileri
  created_on TIMESTAMP,                         -- İade oluşturma tarihi
  add_return_note_display_to_customer BOOLEAN,  -- Not müşteriye gösterilsin mi
  add_return_note_message TEXT,                 -- İade notu mesajı
  can_mark_return_as_paid BOOLEAN,              -- Ödendi olarak işaretlenebilir mi

  -- Sistem Bilgileri
  from_id INTEGER,                              -- API'deki orijinal ID
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE returns IS 'Onaylanmış ve işleme alınmış iadeler - External API''den senkronize edilir';
COMMENT ON COLUMN returns.custom_return_number IS 'Unique iade numarası (örn: RET12345)';
COMMENT ON COLUMN returns.items IS 'İade kalemleri ve fiyat bilgileri (JSONB array)';
COMMENT ON COLUMN returns.payment_method_additional_fee_incl_tax_value IS 'Vade farkı - İade tutarından düşülür';

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_returns_custom_return_number ON returns(custom_return_number);
CREATE INDEX IF NOT EXISTS idx_returns_order_number ON returns(custom_order_number);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_on ON returns(created_on DESC);
CREATE INDEX IF NOT EXISTS idx_returns_payment_status ON returns(return_payment_status);
CREATE INDEX IF NOT EXISTS idx_returns_action ON returns(return_action);
CREATE INDEX IF NOT EXISTS idx_returns_paid_date ON returns(paid_date_utc);
CREATE INDEX IF NOT EXISTS idx_returns_request_number ON returns(return_request_custom_number);

-- JSONB GIN index for items array
CREATE INDEX IF NOT EXISTS idx_returns_items_gin ON returns USING GIN (items);

-- ===============================================
-- 3. ÖRNEK JSONB YAPILARI
-- ===============================================

-- return_requests.lines örnek yapısı:
/*
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
    "request_line_combinations": [
      {
        "product_id": 456,
        "name": "Örnek Ürün",
        "combination_id": 789,
        "combination_sku": "PROD-001-L-BLUE",
        "combination_gtin": "1234567890123",
        "quantity": 1
      }
    ]
  }
]
*/

-- returns.items örnek yapısı:
/*
[
  {
    "product_id": 456,
    "product_name": "Örnek Ürün",
    "quantity": 1,
    "sku": "PROD-001",
    "product_price": 150.00,
    "sub_total_incl_tax_value": 150.00
  }
]
*/

-- ===============================================
-- 4. YARDIMCI FONKSIYONLAR
-- ===============================================

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Return requests için trigger
DROP TRIGGER IF EXISTS update_return_requests_updated_at ON return_requests;
CREATE TRIGGER update_return_requests_updated_at
    BEFORE UPDATE ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Returns için trigger
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
    BEFORE UPDATE ON returns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 5. ROW LEVEL SECURITY (RLS) POLİCİES
-- ===============================================

-- RLS'yi etkinleştir
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Authenticated kullanıcılar tüm kayıtları okuyabilir
CREATE POLICY "Allow authenticated users to read return_requests" ON return_requests
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read returns" ON returns
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role tüm işlemleri yapabilir (sync için gerekli)
CREATE POLICY "Allow service role full access to return_requests" ON return_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to returns" ON returns
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===============================================
-- 6. PERFORMANS İYİLEŞTİRME
-- ===============================================

-- Vacuum ve Analyze
VACUUM ANALYZE return_requests;
VACUUM ANALYZE returns;

-- ===============================================
-- 7. KONTROL SORĞULARI
-- ===============================================

-- Tablo oluşturuldu mu?
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('return_requests', 'returns');

-- İndeksler oluşturuldu mu?
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('return_requests', 'returns');

-- RLS aktif mi?
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('return_requests', 'returns');

-- ===============================================
-- FİNAL NOTLAR
-- ===============================================
-- 1. Bu script'i Supabase SQL Editor'da çalıştırın
-- 2. Service role key'i API sync işlemlerinde kullanın
-- 3. Frontend'de supabase client authenticated olarak çalışacak
-- 4. Cron job'lar service role ile çalışacak
-- ===============================================
