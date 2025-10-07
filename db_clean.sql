-- ================================================
-- YÖNDER RAPOR SİSTEMİ - VERİTABANI ŞEMASI (CLEAN)
-- ================================================
-- Önce tabloları silin, sonra bu dosyayı çalıştırın
-- ================================================

-- ================================================
-- 1. KAMPÜSLER TABLOSU
-- ================================================
CREATE TABLE campuses (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campuses_name ON campuses(name);

-- ================================================
-- 2. SİPARİŞLER TABLOSU
-- ================================================
CREATE TABLE orders (
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
    order_shipping_cost DECIMAL(18,4) DEFAULT 0,
    order_shipping_incl_tax DECIMAL(18,4) DEFAULT 0,
    order_shipping_excl_tax DECIMAL(18,4) DEFAULT 0,
    payment_method_additional_fee_text TEXT,
    payment_method_additional_fee_incl_tax DECIMAL(18,4) DEFAULT 0,
    payment_method_additional_fee_excl_tax DECIMAL(18,4) DEFAULT 0,
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
    campus_id BIGINT,
    class TEXT,
    stage TEXT,
    membership TEXT,

    -- Ek Veriler
    collector_customer_id BIGINT DEFAULT 0,
    verification_customer_id BIGINT DEFAULT 0,

    -- Hesaplanan Alan
    total_item_discount_amount DECIMAL(18,4) DEFAULT 0,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders tablosu için indexler
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_order_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_on ON orders(created_on DESC);
CREATE INDEX idx_orders_campus ON orders(campus);
CREATE INDEX idx_orders_custom_order_number ON orders(custom_order_number);

-- ================================================
-- 3. MÜŞTERİLER TABLOSU
-- ================================================
CREATE TABLE customers (
    -- Primary Key
    id BIGINT PRIMARY KEY,

    -- Müşteri Temel Bilgileri
    email_or_phone TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    date_of_birth TIMESTAMPTZ,
    gender TEXT,
    identity_number TEXT,

    -- Müşteri Durumu
    active BOOLEAN DEFAULT TRUE,
    authorize_email_marketing BOOLEAN DEFAULT FALSE,
    authorize_sms_marketing BOOLEAN DEFAULT FALSE,
    customer_role_names TEXT,

    -- Okul Bilgileri
    stage_id INTEGER DEFAULT 0,
    stage_name TEXT,
    student_class_id INTEGER DEFAULT 0,
    student_class_name TEXT,
    membership_id INTEGER DEFAULT 0,
    membership_name TEXT,
    campus_id INTEGER DEFAULT 0,
    campus_name TEXT,

    -- Aktivite Bilgileri
    created_on TIMESTAMPTZ NOT NULL,
    last_activity_date TIMESTAMPTZ,
    last_ip_address TEXT,

    -- Metadata
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers tablosu için indexler
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_identity ON customers(identity_number) WHERE identity_number IS NOT NULL;
CREATE INDEX idx_customers_campus ON customers(campus_id) WHERE campus_id > 0;
CREATE INDEX idx_customers_class ON customers(student_class_id) WHERE student_class_id > 0;
CREATE INDEX idx_customers_active ON customers(active) WHERE active = TRUE;
CREATE INDEX idx_customers_created ON customers(created_on DESC);
CREATE INDEX idx_customers_full_name ON customers(full_name);

-- ================================================
-- 4. ÜRÜNLER TABLOSU
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

-- Products tablosu için indexler
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_gtin ON products(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX idx_products_published ON products(published) WHERE published = TRUE;
CREATE INDEX idx_products_name ON products USING gin(to_tsvector('turkish', name));

-- ================================================
-- 5. FONKSIYONLAR
-- ================================================

-- Net ciro hesaplama fonksiyonu
CREATE OR REPLACE FUNCTION calculate_net_revenue(
    order_total DECIMAL,
    vade_farki DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN order_total - COALESCE(vade_farki, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sipariş durumu belirleme fonksiyonu
CREATE OR REPLACE FUNCTION get_order_final_status(
    order_status TEXT,
    payment_status TEXT
)
RETURNS TEXT AS $$
BEGIN
    -- İptal edilmiş
    IF order_status ILIKE '%iptal%' THEN
        RETURN 'iptal';
    END IF;

    -- İade edilmiş
    IF order_status ILIKE '%iade%' THEN
        RETURN 'iade';
    END IF;

    -- Onay bekliyor
    IF order_status = 'Beklemede' OR payment_status = 'Beklemede' THEN
        RETURN 'onay-bekliyor';
    END IF;

    -- Başarılı (tamamlanmış, onaylanmış, kargoya verilmiş, teslim edilmiş)
    IF order_status IN ('Tamamlandı', 'Onaylandı', 'Kargoya verildi', 'Teslim Edildi')
       AND payment_status = 'Ödendi' THEN
        RETURN 'basarili';
    END IF;

    -- Başarısız
    RETURN 'basarisiz';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
