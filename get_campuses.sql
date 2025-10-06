-- ================================================
-- KAMPÜS LİSTESİNİ ÇEK (ENV İÇİN)
-- ================================================
-- Bu SQL'i Supabase SQL editöründe çalıştırın
-- Sonucu .env.local dosyasındaki NEXT_PUBLIC_KAMPUSLER değişkenine kopyalayın
-- ================================================

-- Virgülle ayrılmış kampüs listesi
SELECT
  string_agg(DISTINCT campus, ',' ORDER BY campus) as kampusler
FROM orders
WHERE campus IS NOT NULL
  AND campus != '';

-- ================================================
-- Detaylı liste (sipariş sayısıyla birlikte)
-- ================================================

SELECT
  campus,
  COUNT(*) as siparis_sayisi,
  COUNT(DISTINCT customer_info) as musteri_sayisi,
  MIN(created_on) as ilk_siparis,
  MAX(created_on) as son_siparis
FROM orders
WHERE campus IS NOT NULL
  AND campus != ''
GROUP BY campus
ORDER BY siparis_sayisi DESC;

-- ================================================
-- Kampüsleri campuses tablosuna ekle
-- ================================================
-- Not: Bu sorgu otomatik olarak bulunan kampüsleri
-- campuses tablosuna ekler

INSERT INTO campuses (name)
SELECT DISTINCT campus
FROM orders
WHERE campus IS NOT NULL
  AND campus != ''
  AND campus NOT IN (SELECT name FROM campuses)
ORDER BY campus;
