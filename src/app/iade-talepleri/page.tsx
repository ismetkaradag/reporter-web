import { getServiceRoleClient } from '@/lib/supabase';
import type { ReturnRequest, Return, Order } from '@/types';
import MainLayout from '@/components/MainLayout';
import IadeTalepleriClient from './IadeTalepleriClient';

export const revalidate = 300; // 5 dakika cache

async function fetchReturnRequests(): Promise<ReturnRequest[]> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('return_requests')
    .select('*')
    .order('created_on', { ascending: false });

  if (error) {
    console.error('Error fetching return requests:', error);
    return [];
  }

  return data as ReturnRequest[];
}

async function fetchReturns(): Promise<Return[]> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('returns')
    .select('*')
    .order('created_on', { ascending: false });

  if (error) {
    console.error('Error fetching returns:', error);
    return [];
  }

  return data as Return[];
}

async function fetchOrders(): Promise<Order[]> {
  const supabase = getServiceRoleClient();
  const allOrders: Order[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_on', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }

    if (!data || data.length === 0) {
      break;
    }

    allOrders.push(...(data as Order[]));

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  console.log(`✅ Campus Sales Report: Fetched ${allOrders.length} orders (raw)`);
  return allOrders;
}

export default async function IadeTalepleriPage() {
  const [returnRequests, returns, orders] = await Promise.all([
    fetchReturnRequests(),
    fetchReturns(),
    fetchOrders()
  ]);

  return (
    <MainLayout>
      <IadeTalepleriClient
        returnRequests={returnRequests}
        returns={returns}
        orders={orders}
      />
    </MainLayout>
  );
}
