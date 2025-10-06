import { NextRequest, NextResponse } from 'next/server';
import { fetchAllOrders } from '@/lib/externalApi';
import { syncOrdersToSupabase } from '@/lib/supabaseOperations';

export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü: Vercel CRON_SECRET veya manuel SYNC_TOKEN
    const authHeader = request.headers.get('authorization');

    // Vercel otomatik olarak CRON_SECRET kullanır (production)
    // Manuel tetiklemede SYNC_TOKEN kullanılır
    const validCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const validSyncToken = process.env.SYNC_TOKEN && authHeader === `Bearer ${process.env.SYNC_TOKEN}`;

    if (!validCronSecret && !validSyncToken) {
      console.error('❌ Unauthorized: Invalid or missing token');
      return new Response('Unauthorized', {
        status: 401,
      });
    }

    console.log('🔄 Sipariş senkronizasyonu başlatıldı...');
    const startTime = Date.now();

    // External API'den tüm siparişleri çek
    let currentPage = 0;
    let totalPages = 0;

    const orders = await fetchAllOrders((current, total) => {
      currentPage = current;
      totalPages = total;
      console.log(`📥 Sayfa ${current}/${total} çekiliyor...`);
    });

    console.log(`✅ ${orders.length} sipariş external API'den çekildi`);

    // Supabase'e kaydet
    const result = await syncOrdersToSupabase(orders);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'Senkronizasyon tamamlandı',
      stats: {
        totalOrders: orders.length,
        inserted: result.inserted,
        updated: result.updated,
        failed: result.failed,
        duration: `${duration}s`,
      },
    });

  } catch (error: any) {
    console.error('❌ Senkronizasyon hatası:', error);

    return NextResponse.json(
      {
        error: 'Senkronizasyon başarısız',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
