import { getServiceRoleClient } from '@/lib/supabase';
import type { ReturnRequest, Return, Order } from '@/types';
import MainLayout from '@/components/MainLayout';
import IadeOzetClient from './IadeOzetClient';

export const revalidate = 1800; // 30 dakika cache

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
    .order('created_on', { ascending: false});

  if (error) {
    console.error('Error fetching returns:', error);
    return [];
  }

  return data as Return[];
}

async function fetchOrders(): Promise<Order[]> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_on', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }

  return data as Order[];
}

export default async function IadeOzetPage() {
  const [returnRequests, returns, orders] = await Promise.all([
    fetchReturnRequests(),
    fetchReturns(),
    fetchOrders()
  ]);

  return (
    <MainLayout>
      <IadeOzetClient
        returnRequests={returnRequests}
        returns={returns}
        orders={orders}
      />
    </MainLayout>
  );
}
