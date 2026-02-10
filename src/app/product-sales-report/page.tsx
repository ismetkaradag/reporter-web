import { getServiceRoleClient } from '@/lib/supabase';
import type { Order, Product } from '@/types';
import MainLayout from '@/components/MainLayout';
import ProductSalesClient from './ProductSalesClient';
import { getAllCampuses } from '@/utils/campusUtils';
import { filterOrdersForDashboard } from '@/utils/orderUtils';

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

async function fetchProducts(): Promise<Product[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, combinations, price, pictures');


  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data as Product[]) || [];
}

export default async function ProductSalesReportPage() {
  const allOrders = await fetchOrders();
  const orders = filterOrdersForDashboard(allOrders);
  const products = await fetchProducts();
  const campuses = getAllCampuses();

  return (
    <MainLayout>
      <ProductSalesClient orders={orders} products={products} campuses={campuses} />
    </MainLayout>
  );
}
