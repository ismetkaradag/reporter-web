import { NextResponse } from 'next/server';
import { fetchAllReturnRequests } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(request: Request) {
  try {
    // Vercel Cron secret kontrolü
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.headers.get('x-vercel-cron-secret');

    if (authHeader?.replace('Bearer ', '') !== CRON_SECRET &&
        cronSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting return requests sync...');

    // Sync işlemini başlat
    const result = await syncReturnData(
      'return_requests',
      fetchAllReturnRequests
    );

    console.log('[CRON] Return requests sync completed:', result);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      totalSynced: result.totalSynced,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[CRON] Return requests sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
