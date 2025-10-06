import { getServiceRoleClient } from '@/lib/supabase';
import MainLayout from '@/components/MainLayout';
import SalesRatesClient from './SalesRatesClient';

// Order tipi (items olmadan)
interface OrderWithoutItems {
  id: number;
  custom_order_number: string;
  customer_id: number | null;
  order_status: string;
  payment_status: string;
  order_total: number;
  payment_method_additional_fee_incl_tax: number;
  campus: string | null;
  created_on: string;
}

interface Customer {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  campus_name: string;
  campus_id: number;
}

async function fetchOrdersWithoutItems(): Promise<OrderWithoutItems[]> {
  const supabase = getServiceRoleClient();
  const allOrders: OrderWithoutItems[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, custom_order_number, customer_id, order_status, payment_status, order_total, payment_method_additional_fee_incl_tax, campus, created_on')
      .order('created_on', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching orders:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allOrders.push(...(data as OrderWithoutItems[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allOrders;
}

async function fetchCustomers(): Promise<Customer[]> {
  const supabase = getServiceRoleClient();
  const allCustomers: Customer[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, email, phone, campus_name, campus_id')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching customers:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allCustomers.push(...(data as Customer[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allCustomers;
}

export default async function SalesRatesReportPage() {
  const orders = await fetchOrdersWithoutItems();
  const customers = await fetchCustomers();

  return (
    <MainLayout>
      <SalesRatesClient orders={orders} customers={customers} />
    </MainLayout>
  );
}
