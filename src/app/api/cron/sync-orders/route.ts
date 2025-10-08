import { NextRequest, NextResponse } from 'next/server';
import { fetchOrdersPage } from '@/lib/externalApi';
import { syncOrdersToSupabase } from '@/lib/supabaseOperations';

export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü: Vercel CRON_SECRET veya manuel SYNC_TOKEN
    const authHeader = request.headers.get('authorization');

    const validCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const validSyncToken = process.env.SYNC_TOKEN && authHeader === `Bearer ${process.env.SYNC_TOKEN}`;

    if (!validCronSecret && !validSyncToken) {
      console.error('❌ Unauthorized: Invalid or missing token');
      return new Response('Unauthorized', { status: 401 });
    }

    // Sayfa numarasını al (default: 1)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);

    console.log(`🔄 Orders sync başlatıldı - Sayfa ${page}`);
    const startTime = Date.now();

    // Tek sayfa çek
    const response = await fetchOrdersPage(page, 100);
    const orders = response.data;

    console.log(`✅ Sayfa ${page}/${response.totalPages} - ${orders.length} sipariş çekildi`);

    // Supabase'e kaydet
    const result = await syncOrdersToSupabase(orders);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Sonraki sayfa varsa, 10 saniye sonra kendini tetikle
    if (response.hasNextPage) {
      const nextPage = page + 1;
      console.log(`⏭️  Sonraki sayfa (${nextPage}) 10 saniye içinde tetiklenecek...`);

      // Async fetch (await etme)
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      setTimeout(() => {
        fetch(`${baseUrl}/api/cron/sync-orders?page=${nextPage}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader || `Bearer ${process.env.SYNC_TOKEN}`,
          },
        }).catch(err => console.error(`❌ Sayfa ${nextPage} tetikleme hatası:`, err));
      }, 10000);
    }

    return NextResponse.json({
      success: true,
      message: `Sayfa ${page} senkronize edildi`,
      stats: {
        currentPage: page,
        totalPages: response.totalPages,
        ordersInPage: orders.length,
        failed: result.failed,
        duration: `${duration}s`,
        hasNextPage: response.hasNextPage,
      },
    });

  } catch (error: any) {
    console.error('❌ Senkronizasyon hatası:', error);
    return NextResponse.json(
      { error: 'Senkronizasyon başarısız', message: error.message },
      { status: 500 }
    );
  }
}

// Vercel timeout: 60 saniye (Hobby plan)
export const maxDuration = 60;
