import { getServiceRoleClient } from '@/lib/supabase';
import type { Order } from '@/types';
import CampusSalesClient from './CampusSalesClient';
import MainLayout from '@/components/MainLayout';
import { filterOrdersForDashboard } from '@/utils/orderUtils';

// Cache için revalidate süresi
export const revalidate = 300; // 5 dakika

/**
 * Supabase'den tüm siparişleri çek
 */
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

export default async function CampusSalesReportPage() {
  const allOrders = await fetchOrders();

  // Başarısız ve onay bekleyen siparişleri filtrele
  const orders = filterOrdersForDashboard(allOrders);

  console.log(`📊 Campus Sales Report: ${orders.length} orders (filtered from ${allOrders.length})`);

  return (
    <MainLayout>
      <CampusSalesClient orders={orders} />
    </MainLayout>
  );
}
