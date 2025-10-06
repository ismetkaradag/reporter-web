import { NextRequest, NextResponse } from 'next/server';
import { fetchAllOrders } from '@/lib/externalApi';
import { syncOrdersToSupabase } from '@/lib/supabaseOperations';

export async function GET(request: NextRequest) {
  try {
    // SYNC_TOKEN kontrolü
    // Vercel Cron: Authorization header'dan Bearer token
    // Manuel: Query param'dan ?token=xxx
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.replace('Bearer ', '');
    const queryToken = request.nextUrl.searchParams.get('token');

    const token = headerToken || queryToken;

    if (!token || token !== process.env.SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
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

// POST metodu da aynı işlemi yapar (esneklik için)
export async function POST(request: NextRequest) {
  return GET(request);
}
