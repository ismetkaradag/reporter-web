-- ================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ================================================
-- Supabase SQL Editor'e yapıştırın
-- ================================================

-- ================================================
-- 1. ORDERS TABLOSU RLS
-- ================================================

-- RLS'i aktif et
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Service role için tüm yetkiler (cron jobs ve server-side işlemler için)
CREATE POLICY "Service role has full access to orders"
ON orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated (giriş yapmış) kullanıcılar için okuma yetkisi
CREATE POLICY "Authenticated users can read orders"
ON orders
FOR SELECT
TO authenticated
USING (true);

-- ================================================
-- 2. CUSTOMERS TABLOSU RLS
-- ================================================

-- RLS'i aktif et
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Service role için tüm yetkiler (cron jobs ve server-side işlemler için)
CREATE POLICY "Service role has full access to customers"
ON customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated (giriş yapmış) kullanıcılar için okuma yetkisi
CREATE POLICY "Authenticated users can read customers"
ON customers
FOR SELECT
TO authenticated
USING (true);

-- ================================================
-- 3. CAMPUSES TABLOSU RLS (Opsiyonel)
-- ================================================

-- RLS'i aktif et
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

-- Service role için tüm yetkiler
CREATE POLICY "Service role has full access to campuses"
ON campuses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated kullanıcılar için okuma yetkisi
CREATE POLICY "Authenticated users can read campuses"
ON campuses
FOR SELECT
TO authenticated
USING (true);

-- ================================================
-- 4. PRODUCTS TABLOSU RLS
-- ================================================

-- RLS'i aktif et
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Service role için tüm yetkiler
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

-- ================================================
-- 5. MEVCUT POLİTİKALARI KONTROL ETME
-- ================================================
-- Politikaları görmek için:
-- SELECT * FROM pg_policies WHERE tablename IN ('orders', 'customers', 'campuses');

-- ================================================
-- 5. POLİTİKALARI SİLMEK İÇİN (Gerekirse)
-- ================================================
/*
-- Orders tablosu politikalarını sil
DROP POLICY IF EXISTS "Service role has full access to orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can read orders" ON orders;

-- Customers tablosu politikalarını sil
DROP POLICY IF EXISTS "Service role has full access to customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can read customers" ON customers;

-- Campuses tablosu politikalarını sil
DROP POLICY IF EXISTS "Service role has full access to campuses" ON campuses;
DROP POLICY IF EXISTS "Authenticated users can read campuses" ON campuses;

-- RLS'i devre dışı bırak (gerekirse)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE campuses DISABLE ROW LEVEL SECURITY;
*/
