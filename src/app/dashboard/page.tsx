import { getServiceRoleClient } from '@/lib/supabase';
import type { Order } from '@/types';
import DashboardClient from './DashboardClient';
import { filterOrdersForDashboard } from '@/utils/orderUtils';
import MainLayout from '@/components/MainLayout';

// Cache için revalidate süresi (saniye cinsinden)
export const revalidate = 300; // 5 dakika

/**
 * Supabase'den tüm siparişleri chunk chunk çek
 * Postgres limit 1000 olduğu için sayfa sayfa çekiyoruz
 */
async function fetchOrders(): Promise<Order[]> {
  const supabase = getServiceRoleClient();
  const allOrders: Order[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        custom_order_number,
        customer_info,
        order_status,
        payment_status,
        order_platform,
        created_on,
        order_total,
        items,
        payment_method_additional_fee_incl_tax,
        order_sub_total_discount_incl_tax,
        total_item_discount_amount,
        redeemed_reward_points,
        redeemed_reward_points_amount,
        campus,
        campus_id,
        class
      `
      )
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
    console.log(`Fetched ${allOrders.length} orders so far...`);

    // Eğer bu sayfada pageSize'dan az veri geldiyse, son sayfadayız demektir
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  console.log(`✅ Total orders fetched: ${allOrders.length}`);
  return allOrders;
}

export default async function DashboardPage() {
  const allOrders = await fetchOrders();

  // Başarısız ve onay bekliyor siparişleri filtrele
  const orders = filterOrdersForDashboard(allOrders);

  console.log(`📊 Dashboard: ${orders.length} orders (filtered from ${allOrders.length})`);

  return (
    <MainLayout>
      <DashboardClient orders={orders} />
    </MainLayout>
  );
}
