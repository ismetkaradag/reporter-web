-- ================================================
-- YÖNDER RAPOR SİSTEMİ - VERİTABANI ŞEMASI
-- ================================================
-- Bu dosya her güncelleme sonrası yeniden oluşturulur
-- SQL editörde çalıştırarak tabloları oluşturabilirsiniz
-- Son Güncelleme: 2025-10-06
-- ================================================

-- ================================================
-- 1. KAMPÜSLER TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS campuses (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kampüs tablosu için index
CREATE INDEX IF NOT EXISTS idx_campuses_name ON campuses(name);

-- ================================================
-- 2. SİPARİŞLER TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
    -- Primary Key
    id BIGINT PRIMARY KEY,

    -- Sipariş Temel Bilgileri
    order_guid UUID,
    custom_order_number TEXT NOT NULL,

    -- Müşteri Bilgileri
    customer_id BIGINT,
    customer_info TEXT,
    customer_email TEXT,
    customer_full_name TEXT,
    customer_ip TEXT,
    identity_number TEXT,

    -- Sipariş Durumları
    order_status TEXT,
    order_channel TEXT,
    order_platform TEXT,
    payment_status TEXT,
    payment_method TEXT,
    payment_system TEXT,
    installment TEXT,
    cash_on_delivery_method TEXT,
    shipping_status TEXT,
    shipping_method_name TEXT,
    tracking_number TEXT,
    erp_status TEXT,

    -- Adres Bilgileri (JSONB)
    shipping_address JSONB,
    billing_address JSONB,

    -- Sipariş İçeriği
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    checkout_attribute_info TEXT,

    -- Tarih Bilgileri
    created_on TIMESTAMPTZ NOT NULL,
    shipped_date TIMESTAMPTZ,
    delivery_date TIMESTAMPTZ,
    verified_date TIMESTAMPTZ,

    -- Fiyat ve Tutar Bilgileri
    order_subtotal_incl_tax DECIMAL(18,4) DEFAULT 0,
    order_subtotal_excl_tax DECIMAL(18,4) DEFAULT 0,
    order_sub_total_discount_incl_tax DECIMAL(18,4) DEFAULT 0,
    order_sub_total_discount_excl_tax DECIMAL(18,4) DEFAULT 0,

    -- Kargo Bilgileri
    order_shipping_cost DECIMAL(18,4) DEFAULT 0,
    order_shipping_incl_tax DECIMAL(18,4) DEFAULT 0,
    order_shipping_excl_tax DECIMAL(18,4) DEFAULT 0,

    -- Vade Farkı / Ek Ücret
    payment_method_additional_fee_text TEXT,
    payment_method_additional_fee_incl_tax DECIMAL(18,4) DEFAULT 0,
    payment_method_additional_fee_excl_tax DECIMAL(18,4) DEFAULT 0,

    -- Vergi ve İndirim
    tax DECIMAL(18,4) DEFAULT 0,
    order_total_discount DECIMAL(18,4) DEFAULT 0,

    -- Toplam Tutar
    order_total DECIMAL(18,4) NOT NULL,

    -- Para Puan Bilgileri
    redeemed_reward_points INTEGER DEFAULT 0,
    redeemed_reward_points_amount DECIMAL(18,4) DEFAULT 0,
    redeemed_reward_points_amount_str TEXT,

    -- Okul/Kampüs Bilgileri
    campus TEXT,
    campus_id BIGINT REFERENCES campuses(id),
    class TEXT,
    stage TEXT,
    membership TEXT,

    -- Ek Veriler
    collector_customer_id BIGINT DEFAULT 0,
    verification_customer_id BIGINT DEFAULT 0,

    -- Hesaplanan Alan (Ürün seviyesi indirimler için)
    total_item_discount_amount DECIMAL(18,4) DEFAULT 0,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 3. SİPARİŞLER TABLOSU İNDEXLER
-- ================================================

-- Primary searches
CREATE INDEX IF NOT EXISTS idx_orders_custom_order_number ON orders(custom_order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_identity_number ON orders(identity_number);

-- Status indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);

-- Date indexes (performans için önemli)
CREATE INDEX IF NOT EXISTS idx_orders_created_on ON orders(created_on DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_shipped_date ON orders(shipped_date);

-- Campus/School indexes
CREATE INDEX IF NOT EXISTS idx_orders_campus ON orders(campus);
CREATE INDEX IF NOT EXISTS idx_orders_campus_id ON orders(campus_id);
CREATE INDEX IF NOT EXISTS idx_orders_class ON orders(class);

-- Composite indexes (kampüs + tarih sorguları için)
CREATE INDEX IF NOT EXISTS idx_orders_campus_created_on ON orders(campus, created_on DESC);
CREATE INDEX IF NOT EXISTS idx_orders_campus_status ON orders(campus, order_status, payment_status);

-- JSONB indexes (items içinde arama için)
CREATE INDEX IF NOT EXISTS idx_orders_items_gin ON orders USING GIN(items);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address_gin ON orders USING GIN(shipping_address);

-- ================================================
-- 4. ÜRÜNLER TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT,
    full_description TEXT,
    sku TEXT,
    model_code TEXT,
    gtin TEXT,

    -- Fiyat Bilgileri
    price DECIMAL(18,4) DEFAULT 0,
    old_price DECIMAL(18,4) DEFAULT 0,
    product_cost DECIMAL(18,4) DEFAULT 0,

    -- Stok Bilgileri
    stock_quantity INTEGER DEFAULT 0,

    -- Durum
    published BOOLEAN DEFAULT false,

    -- Tarihler
    created_on TIMESTAMPTZ,
    updated_on TIMESTAMPTZ,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ürün indexleri
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);

-- ================================================
-- 5. MÜŞTERİLER TABLOSU
-- ================================================
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT PRIMARY KEY,
    email TEXT,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,

    -- Okul Bilgileri
    campus TEXT,
    campus_id BIGINT REFERENCES campuses(id),
    class TEXT,
    identity_number TEXT,

    -- Durum
    active BOOLEAN DEFAULT true,

    -- Tarihler
    created_on TIMESTAMPTZ,
    last_activity_date TIMESTAMPTZ,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Müşteri indexleri
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_identity_number ON customers(identity_number);
CREATE INDEX IF NOT EXISTS idx_customers_campus ON customers(campus);
CREATE INDEX IF NOT EXISTS idx_customers_campus_id ON customers(campus_id);

-- ================================================
-- 6. YARDIMCI FONKSIYONLAR
-- ================================================

-- Ciro hesaplama fonksiyonu (orderTotal - vadeFarkı)
CREATE OR REPLACE FUNCTION calculate_net_revenue(
    p_order_total DECIMAL,
    p_additional_fee DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN p_order_total - COALESCE(p_additional_fee, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sipariş durumu belirleme fonksiyonu
CREATE OR REPLACE FUNCTION get_order_final_status(
    p_order_status TEXT,
    p_payment_status TEXT
) RETURNS TEXT AS $$
BEGIN
    -- İptal edilmiş ama ödemesi alınmış
    IF (p_order_status IN ('İptal Edildi', 'İptal Tutarı Bankaya İletildi')
        AND p_payment_status = 'Ödeme Tamamlandı') THEN
        RETURN 'iptal';
    END IF;

    -- İptal edilmiş ve ödeme alınmamış
    IF (p_order_status = 'İptal Edildi' AND p_payment_status = 'Ödeme Alınamadı') THEN
        RETURN 'basarisiz';
    END IF;

    -- İade edilmiş
    IF (p_order_status = 'İade Edildi' AND p_payment_status = 'Ödeme Tamamlandı') THEN
        RETURN 'iade';
    END IF;

    -- Onay bekliyor
    IF (p_order_status = 'Onay Bekliyor') THEN
        RETURN 'onay-bekliyor';
    END IF;

    -- Başarılı
    IF (p_payment_status = 'Ödeme Tamamlandı') THEN
        RETURN 'basarili';
    END IF;

    RETURN 'basarisiz';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ================================================
-- 7. KAMPÜS VERİLERİNİ HAZIRLA
-- ================================================
-- Not: Kampüs listesi .env dosyasından gelecek
-- Bu kısım uygulama başlangıcında çalıştırılmalı

-- ================================================
-- 8. PERFORMANS İÇİN MATERIALIZED VIEW'LER (Opsiyonel)
-- ================================================

-- Kampüs bazlı özet rapor
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_campus_summary AS
SELECT
    campus,
    campus_id,
    COUNT(*) as total_orders,
    COUNT(CASE WHEN get_order_final_status(order_status, payment_status) = 'basarili' THEN 1 END) as successful_orders,
    COUNT(CASE WHEN get_order_final_status(order_status, payment_status) = 'iptal' THEN 1 END) as cancelled_orders,
    SUM(calculate_net_revenue(order_total, payment_method_additional_fee_incl_tax)) as total_revenue,
    SUM(CASE WHEN get_order_final_status(order_status, payment_status) = 'basarili'
        THEN calculate_net_revenue(order_total, payment_method_additional_fee_incl_tax) ELSE 0 END) as successful_revenue,
    AVG(calculate_net_revenue(order_total, payment_method_additional_fee_incl_tax)) as avg_order_value,
    MIN(created_on) as first_order_date,
    MAX(created_on) as last_order_date
FROM orders
WHERE campus IS NOT NULL
GROUP BY campus, campus_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_campus_summary_campus ON mv_campus_summary(campus);

-- Günlük sipariş özeti
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_orders AS
SELECT
    DATE(created_on) as order_date,
    campus,
    COUNT(*) as order_count,
    SUM(calculate_net_revenue(order_total, payment_method_additional_fee_incl_tax)) as daily_revenue,
    COUNT(DISTINCT customer_id) as unique_customers
FROM orders
GROUP BY DATE(created_on), campus;

CREATE INDEX IF NOT EXISTS idx_mv_daily_orders_date ON mv_daily_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_mv_daily_orders_campus ON mv_daily_orders(campus);

-- ================================================
-- 9. YARDIMCI NOTLAR
-- ================================================
-- Materialized view'leri yenilemek için:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_campus_summary;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_orders;

-- Tüm siparişlerin net cirosunu görmek için:
-- SELECT id, custom_order_number,
--        calculate_net_revenue(order_total, payment_method_additional_fee_incl_tax) as net_revenue
-- FROM orders;

-- Başarılı siparişleri görmek için:
-- SELECT * FROM orders
-- WHERE get_order_final_status(order_status, payment_status) = 'basarili';

-- ================================================
-- FIN
-- ================================================
