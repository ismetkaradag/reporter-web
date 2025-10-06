import { NextRequest, NextResponse } from 'next/server';
import { fetchAllOrders } from '@/lib/externalApi';
import { syncAllData } from '@/lib/supabaseOperations';

/**
 * Tüm siparişleri dış API'den çekip Supabase'e kaydet
 * POST /api/sync
 */
export async function POST(request: NextRequest) {
  try {
    // Authorization kontrolü
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting full sync...');

    // 1. Tüm siparişleri çek
    console.log('📥 Fetching all orders from external API...');
    const orders = await fetchAllOrders((current, total) => {
      console.log(`  Progress: ${current}/${total} pages`);
    });

    console.log(`✅ Fetched ${orders.length} orders`);

    // Debug: İlk siparişin yapısını logla
    if (orders.length > 0) {
      console.log('📝 First order sample:', JSON.stringify(orders[0], null, 2).substring(0, 500));
    }

    // 2. Supabase'e kaydet
    console.log('💾 Syncing to Supabase...');
    await syncAllData(orders, (step, current, total) => {
      if (current && total) {
        console.log(`  ${step} - ${current}/${total}`);
      } else {
        console.log(`  ${step}`);
      }
    });

    console.log('✅ Sync completed successfully');

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${orders.length} orders`,
      totalOrders: orders.length,
    });

  } catch (error: any) {
    console.error('❌ Sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
