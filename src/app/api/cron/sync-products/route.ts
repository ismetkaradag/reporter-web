import { NextRequest, NextResponse } from 'next/server';
import { fetchProductsPage } from '@/lib/externalApi';
import { syncProductsToSupabase } from '@/lib/supabaseOperations';

/**
 * Ürün senkronizasyon cron job endpoint'i
 *
 * Auth:
 * - CRON_SECRET: Vercel cron job için
 * - SYNC_TOKEN: Manuel çalıştırma için
 */
export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü
    const authHeader = request.headers.get('authorization');
    const validCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const validSyncToken = process.env.SYNC_TOKEN && authHeader === `Bearer ${process.env.SYNC_TOKEN}`;

    if (!validCronSecret && !validSyncToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Sayfa numarasını al (default: 1)
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);

    console.log(`🚀 Products sync başlatıldı - Sayfa ${page}`);
    const startTime = Date.now();

    // Tek sayfa çek
    const response = await fetchProductsPage(page, 100);
    const products = response.data;

    console.log(`✅ Sayfa ${page}/${response.totalPages} - ${products.length} ürün çekildi`);

    // Supabase'e senkronize et
    const result = await syncProductsToSupabase(products);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Sonraki sayfa varsa, 10 saniye sonra kendini tetikle
    if (response.hasNextPage) {
      const nextPage = page + 1;
      console.log(`⏭️  Sonraki sayfa (${nextPage}) 10 saniye içinde tetiklenecek...`);

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      setTimeout(() => {
        fetch(`${baseUrl}/api/cron/sync-products?page=${nextPage}`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader || `Bearer ${process.env.SYNC_TOKEN}`,
          },
        }).catch(err => console.error(`❌ Sayfa ${nextPage} tetikleme hatası:`, err));
      }, 10000);
    }

    const responseData = {
      success: true,
      message: `Sayfa ${page} senkronize edildi`,
      stats: {
        currentPage: page,
        totalPages: response.totalPages,
        productsInPage: products.length,
        failed: result.failed,
        duration: `${duration}s`,
        hasNextPage: response.hasNextPage,
      },
    };

    console.log('✅ Product sync tamamlandı:', responseData.stats);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('❌ Product sync hatası:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Vercel timeout: 60 saniye (Hobby plan)
export const maxDuration = 60;
