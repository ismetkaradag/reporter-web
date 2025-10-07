-- ================================================
-- PRODUCTS TABLOSU GÜNCELLEME
-- ================================================
-- Supabase SQL Editor'e yapıştırın
-- ================================================

-- Eski tabloyu sil (varsa)
DROP TABLE IF EXISTS products CASCADE;

-- ================================================
-- ÜRÜNLER TABLOSU
-- ================================================
CREATE TABLE products (
    -- Primary Key
    id BIGINT PRIMARY KEY,

    -- Ürün Temel Bilgileri
    name TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    model_code TEXT,
    sku TEXT NOT NULL,
    gtin TEXT,

    -- Fiyat Bilgileri
    price DECIMAL(18,4) DEFAULT 0,
    old_price DECIMAL(18,4) DEFAULT 0,

    -- Stok Bilgisi
    stock_quantity DECIMAL(18,4) DEFAULT 0,

    -- Durum
    published BOOLEAN DEFAULT TRUE,

    -- Tarih Bilgileri
    created_on TIMESTAMPTZ NOT NULL,
    updated_on TIMESTAMPTZ NOT NULL,

    -- İlişkili Veriler (JSONB)
    pictures JSONB DEFAULT '[]'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    manufacturers JSONB DEFAULT '[]'::jsonb,
    combinations JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- İNDEXLER
-- ================================================
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_gtin ON products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX idx_products_published ON products(published) WHERE published = TRUE;
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('turkish', name));
CREATE INDEX idx_products_created_on ON products(created_on DESC);
CREATE INDEX idx_products_updated_on ON products(updated_on DESC);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- RLS'i aktif et
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Service role için tüm yetkiler (cron jobs ve server-side işlemler için)
CREATE POLICY "Service role has full access to products"
ON products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated kullanıcılar için okuma yetkisi
CREATE POLICY "Authenticated users can read products"
ON products
FOR SELECT
TO authenticated
USING (true);
