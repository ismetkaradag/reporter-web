import { getServiceRoleClient } from '@/lib/supabase';
import type { Order } from '@/types';
import ProductLineSalesClient from './ProductLineSalesClient';
import MainLayout from '@/components/MainLayout';

export const revalidate = 300; // 5 dakika cache

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

  console.log(`✅ Product Line Sales Report: Fetched ${allOrders.length} orders (raw)`);
  return allOrders;
}

async function fetchCustomers() {
  const supabase = getServiceRoleClient();
  const allCustomers: any[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, email, phone, first_name, last_name, identity_number, student_class_name, membership_name, campus_name')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error('Failed to fetch customers');
    }

    if (!data || data.length === 0) {
      break;
    }

    allCustomers.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  console.log(`✅ Product Line Sales Report: Fetched ${allCustomers.length} customers`);
  return allCustomers;
}

async function fetchReportGroups() {
  const supabase = getServiceRoleClient();

  const { data: groups, error } = await supabase
    .from('report_groups')
    .select('id, name, product_skus');

  if (error) {
    console.error('Error fetching report groups:', error);
    throw new Error('Failed to fetch report groups');
  }

  console.log(`✅ Product Line Sales Report: Fetched ${groups?.length || 0} report groups`);
  return groups || [];
}

export default async function ProductLineSalesReportPage() {
  const [orders, customers, reportGroups] = await Promise.all([
    fetchOrders(),
    fetchCustomers(),
    fetchReportGroups(),
  ]);

  return (
    <MainLayout>
      <ProductLineSalesClient orders={orders} customers={customers} reportGroups={reportGroups} />
    </MainLayout>
  );
}
