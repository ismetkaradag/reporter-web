import { NextRequest, NextResponse } from 'next/server';
import { fetchAllCustomers } from '@/lib/externalApi';
import { syncCustomersToSupabase } from '@/lib/supabaseOperations';

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

    console.log('🔄 Customer senkronizasyonu başlatıldı...');
    const startTime = Date.now();

    // External API'den tüm customer'ları çek (Misafir hariç)
    let currentPage = 0;
    let totalPages = 0;

    const customers = await fetchAllCustomers((current, total) => {
      currentPage = current;
      totalPages = total;
      console.log(`📥 Customer sayfa ${current}/${total} çekiliyor...`);
    });

    console.log(`✅ ${customers.length} customer external API'den çekildi (Misafir hariç)`);

    // Supabase'e kaydet
    const result = await syncCustomersToSupabase(customers);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'Customer senkronizasyonu tamamlandı',
      stats: {
        totalCustomers: customers.length,
        failed: result.failed,
        duration: `${duration}s`,
      },
    });

  } catch (error: any) {
    console.error('❌ Customer senkronizasyon hatası:', error);

    return NextResponse.json(
      {
        error: 'Customer senkronizasyonu başarısız',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
