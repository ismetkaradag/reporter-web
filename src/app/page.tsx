'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SYNC_TOKEN}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Yönder Rapor Sistemi
        </h1>
        <p className="text-gray-600 mb-8">
          E-ticaret platformundan veri çekerek raporlama sistemi
        </p>

        {/* Hızlı Erişim */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-lg transition-all text-center shadow-md hover:shadow-lg"
          >
            📊 Dashboard&apos;a Git
          </Link>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Kurulum Adımları
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
              <li>
                <code className="bg-blue-100 px-2 py-1 rounded">db.sql</code> dosyasını Supabase SQL editörde çalıştırın
              </li>
              <li>
                <code className="bg-blue-100 px-2 py-1 rounded">.env.local</code> dosyasını oluşturun (.env.example&apos;dan kopyalayın)
              </li>
              <li>Supabase ve API bilgilerinizi environment variables&apos;a ekleyin</li>
              <li>Aşağıdaki butona basarak ilk veri senkronizasyonunu başlatın</li>
            </ol>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {syncing ? 'Senkronize ediliyor...' : 'Tüm Siparişleri Çek ve Kaydet'}
          </button>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Başarılı!
              </h3>
              <p className="text-green-800">
                {result.message}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Toplam: {result.totalOrders} sipariş
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Hata!
              </h3>
              <p className="text-red-800 text-sm font-mono">
                {error}
              </p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Bilgi
            </h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Tüm siparişler pagination ile çekilir (100&apos;er sayfa)</li>
              <li>• Veriler Supabase&apos;e UPSERT edilir (varsa güncellenir)</li>
              <li>• Ciro = orderTotal - vadeFarkı</li>
              <li>• Kampüs bazlı raporlama desteklenir</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
