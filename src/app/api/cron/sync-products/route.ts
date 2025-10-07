import { NextRequest, NextResponse } from 'next/server';
import { fetchAllProducts } from '@/lib/externalApi';
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

    console.log('🚀 Product sync başlatıldı...');
    const startTime = Date.now();

    // Tüm ürünleri API'den çek
    const products = await fetchAllProducts((current, total) => {
      console.log(`📥 Product sayfa ${current}/${total} çekiliyor...`);
    });

    console.log(`✅ ${products.length} ürün API'den çekildi`);

    // Supabase'e senkronize et
    const result = await syncProductsToSupabase(products);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const response = {
      success: true,
      message: 'Product sync completed',
      stats: {
        totalProducts: products.length,
        failed: result.failed,
        duration: `${duration}s`,
      },
    };

    console.log('✅ Product sync tamamlandı:', response.stats);

    return NextResponse.json(response);
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

// Vercel timeout: 10 dakika
export const maxDuration = 600;
