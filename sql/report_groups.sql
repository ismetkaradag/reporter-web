-- ================================================
-- REPORT GROUPS TABLE
-- ================================================
-- Bu tablo, ürünleri gruplandırmak için kullanılır.
-- Örnek: "Kıyafet", "Kırtasiye", "Okul Malzemeleri" vb.

CREATE TABLE IF NOT EXISTS report_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  product_skus TEXT[] DEFAULT '{}', -- Ürün SKU'larını array olarak tut
  color TEXT, -- Opsiyonel: Grup rengi (#hex formatında)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_report_groups_name ON report_groups(name);
CREATE INDEX IF NOT EXISTS idx_report_groups_product_skus ON report_groups USING GIN(product_skus);

-- RLS Policy (Herkese okuma erişimi)
ALTER TABLE report_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to report_groups"
  ON report_groups
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service_role full access to report_groups"
  ON report_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at otomatik güncelleme trigger'ı
CREATE OR REPLACE FUNCTION update_report_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_report_groups_updated_at
  BEFORE UPDATE ON report_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_report_groups_updated_at();

-- Yardımcı fonksiyon: Bir grup içinde kaç ürün var?
CREATE OR REPLACE FUNCTION get_group_product_count(group_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT array_length(product_skus, 1)
    FROM report_groups
    WHERE id = group_id
  );
END;
$$ LANGUAGE plpgsql;

-- Yardımcı fonksiyon: Bir SKU hangi gruplarda?
CREATE OR REPLACE FUNCTION get_sku_groups(product_sku TEXT)
RETURNS TABLE(group_id BIGINT, group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT id, name
  FROM report_groups
  WHERE product_sku = ANY(product_skus);
END;
$$ LANGUAGE plpgsql;
