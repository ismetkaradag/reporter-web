import { getServiceRoleClient } from '@/lib/supabase';
import type { ReturnRequest, Return, Order } from '@/types';
import MainLayout from '@/components/MainLayout';
import KampusIadeRaporuClient from './KampusIadeRaporuClient';

export const revalidate = 300; // 5 dakika cache

async function fetchReturnRequests(): Promise<ReturnRequest[]> {
  try {
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
  } catch (error) {
    console.error('Exception fetching return requests:', error);
    return [];
  }
}

async function fetchReturns(): Promise<Return[]> {
  try {
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
  } catch (error) {
    console.error('Exception fetching returns:', error);
    return [];
  }
}

async function fetchOrders(): Promise<Order[]> {
  try {
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
        break; // Hata olursa loop'u kır, boş dizi dön
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

    console.log(`✅ Kampus Iade Raporu: Fetched ${allOrders.length} orders`);
    return allOrders;
  } catch (error) {
    console.error('Exception fetching orders:', error);
    return [];
  }
}

export default async function KampusIadeRaporuPage() {
  const [returnRequests, returns, orders] = await Promise.all([
    fetchReturnRequests(),
    fetchReturns(),
    fetchOrders()
  ]);

  return (
    <MainLayout>
      <KampusIadeRaporuClient
        returnRequests={returnRequests}
        returns={returns}
        orders={orders}
      />
    </MainLayout>
  );
}
