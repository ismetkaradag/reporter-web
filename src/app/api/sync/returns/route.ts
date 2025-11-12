import { NextResponse } from 'next/server';
import { fetchAllReturns } from '@/lib/externalApi';
import { syncReturnData } from '@/lib/returnOperations';

const SYNC_TOKEN = process.env.SYNC_TOKEN || '';

export async function POST(request: Request) {
  try {
    // Authorization kontrolü
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== SYNC_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting returns sync...');

    // Sync işlemini başlat
    const result = await syncReturnData(
      'returns',
      fetchAllReturns
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      totalSynced: result.totalSynced
    });
  } catch (error: any) {
    console.error('Returns sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
