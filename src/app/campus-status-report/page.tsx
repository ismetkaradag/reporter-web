import { getServiceRoleClient } from '@/lib/supabase';
import type { Order } from '@/types';
import MainLayout from '@/components/MainLayout';
import CampusStatusClient from './CampusStatusClient';
import { getAllCampuses } from '@/utils/campusUtils';

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
      break;
    }

    if (!data || data.length === 0) break;

    allOrders.push(...(data as Order[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allOrders;
}

export default async function CampusStatusReportPage() {
  const orders = await fetchOrders();
  const campuses = getAllCampuses();

  return (
    <MainLayout>
      <CampusStatusClient orders={orders} campuses={campuses} />
    </MainLayout>
  );
}
