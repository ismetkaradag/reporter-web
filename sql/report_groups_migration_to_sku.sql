-- ================================================
-- REPORT GROUPS MIGRATION: product_ids -> product_skus
-- ================================================
-- Mevcut report_groups tablosunu SKU bazlı sisteme geçirmek için

-- 1. Yeni sütunu ekle
ALTER TABLE report_groups
ADD COLUMN IF NOT EXISTS product_skus TEXT[] DEFAULT '{}';

-- 2. Eski sütunu kaldır (eğer data kaybetmek sorun değilse)
ALTER TABLE report_groups
DROP COLUMN IF EXISTS product_ids;

-- 3. Index'i güncelle
DROP INDEX IF EXISTS idx_report_groups_product_ids;
CREATE INDEX IF NOT EXISTS idx_report_groups_product_skus ON report_groups USING GIN(product_skus);

-- 4. Fonksiyonları güncelle
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

CREATE OR REPLACE FUNCTION get_sku_groups(product_sku TEXT)
RETURNS TABLE(group_id BIGINT, group_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT id, name
  FROM report_groups
  WHERE product_sku = ANY(product_skus);
END;
$$ LANGUAGE plpgsql;
