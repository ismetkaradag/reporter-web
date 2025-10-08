-- ================================================
-- SYNC TASKS TABLE
-- ================================================
-- Bu tablo, ürün/sipariş/müşteri senkronizasyon işlemlerini
-- task bazlı yönetmek için kullanılır.
-- Her task 5 sayfayı gruplar halinde işler.

CREATE TABLE IF NOT EXISTS sync_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('orders', 'users', 'products')),
  start_page INTEGER NOT NULL,
  end_page INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_pages INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_page_range CHECK (start_page > 0 AND end_page >= start_page)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_sync_tasks_status ON sync_tasks(status);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_sync_type ON sync_tasks(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_created_at ON sync_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_tasks_type_status ON sync_tasks(sync_type, status);

-- RLS Policy (Herkese okuma, sadece service_role yazma)
ALTER TABLE sync_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to sync_tasks"
  ON sync_tasks
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service_role full access to sync_tasks"
  ON sync_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Yardımcı fonksiyon: Bugün task oluşturulmuş mu?
CREATE OR REPLACE FUNCTION has_tasks_created_today(task_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM sync_tasks
    WHERE sync_type = task_type
      AND created_at >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Yardımcı fonksiyon: Bekleyen task sayısı
CREATE OR REPLACE FUNCTION count_pending_tasks(task_type TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  IF task_type IS NULL THEN
    RETURN (SELECT COUNT(*) FROM sync_tasks WHERE status = 'pending');
  ELSE
    RETURN (SELECT COUNT(*) FROM sync_tasks WHERE status = 'pending' AND sync_type = task_type);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Temizlik fonksiyonu: 30 günden eski tamamlanmış taskleri sil
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sync_tasks
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
