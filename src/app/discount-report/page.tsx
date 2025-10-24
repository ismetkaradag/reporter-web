import { getServiceRoleClient } from '@/lib/supabase';
import type { Order } from '@/types';
import MainLayout from '@/components/MainLayout';
import DiscountReportClient from './DiscountReportClient';
import { filterOrdersForDashboard } from '@/utils/orderUtils';

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
      .select('id, custom_order_number, customer_id, customer_info, customer_email, campus, order_status, payment_status, order_sub_total_discount_incl_tax, total_item_discount_amount, order_total, payment_method_additional_fee_incl_tax, redeemed_reward_points_amount, created_on')
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

export default async function DiscountReportPage() {
  const allOrders = await fetchOrders();

  // Başarısız ve onay bekliyor siparişleri filtrele
  const orders = filterOrdersForDashboard(allOrders);

  console.log(`📊 Discount Report: ${orders.length} orders (filtered from ${allOrders.length})`);

  return (
    <MainLayout>
      <DiscountReportClient orders={orders} />
    </MainLayout>
  );
}
