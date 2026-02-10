import MainLayout from '@/components/MainLayout';
import { getServiceRoleClient } from '@/lib/supabase';
import type { Order, Product } from '@/types';
import { isSuccessfulOrder } from '@/utils/orderUtils';
import ProductPlatformSalesClient from './ProductPlatformSalesClient';

export const revalidate = 300;

interface ProductPlatformRow {
  sku: string;
  productName: string;
  platform: string;
  quantity: number;
}

function parseSetProducts(attributeInfo: string): Array<{ name: string; attributeValue: string }> {
  const lines = attributeInfo
    .split('<br />')
    .map((line) => line.trim())
    .filter(Boolean);

  const products: Array<{ name: string; attributeValue: string }> = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 1 < lines.length) {
      const attributeLine = lines[i + 1];
      let attributeValue = '';
      if (attributeLine.includes(':')) {
        attributeValue = attributeLine.split(':')[1].trim();
      }
      products.push({
        name: lines[i],
        attributeValue,
      });
    }
  }

  return products;
}

async function fetchOrders(): Promise<Order[]> {
  const supabase = getServiceRoleClient();
  const allOrders: Order[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_status, payment_status, order_platform, items')
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

  return allOrders;
}

async function fetchProducts(): Promise<Product[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, combinations');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data as Product[]) || [];
}

function buildProductPlatformRows(orders: Order[], products: Product[]): ProductPlatformRow[] {
  const skuToProductName = new Map<string, string>();
  const productNameAndAttributeToSku = new Map<string, string>();

  products.forEach((product) => {
    if (product.sku && product.name) {
      skuToProductName.set(product.sku, product.name);
    }

    if (product.name && Array.isArray(product.combinations)) {
      product.combinations.forEach((combination: any) => {
        if (!combination.sku || !Array.isArray(combination.attributes)) return;
        combination.attributes.forEach((attr: any) => {
          if (!attr?.value) return;
          const key = `${product.name.trim()}|||${String(attr.value).trim()}`;
          productNameAndAttributeToSku.set(key, combination.sku);
        });
      });
    }
  });

  const summary = new Map<string, ProductPlatformRow>();

  orders.filter(isSuccessfulOrder).forEach((order) => {
    const platform = (order.order_platform || '').trim() || 'Bilinmeyen';

    if (!order.items || !Array.isArray(order.items)) return;

    order.items.forEach((item: any) => {
      const quantity = item.quantity || 0;
      if (quantity <= 0) return;

      const attributeInfo = item.attributeInfo || item.attribute_info || '';
      const isSetProduct = attributeInfo && attributeInfo.includes('<br />');

      if (isSetProduct) {
        const subProducts = parseSetProducts(attributeInfo);
        subProducts.forEach((subProduct) => {
          const lookupKey = `${subProduct.name.trim()}|||${subProduct.attributeValue.trim()}`;
          const sku = productNameAndAttributeToSku.get(lookupKey) || item.sku || 'UNKNOWN';
          const productName = skuToProductName.get(sku) || subProduct.name || 'Bilinmeyen Ürün';
          const key = `${sku}|||${productName}|||${platform}`;

          if (summary.has(key)) {
            summary.get(key)!.quantity += quantity;
          } else {
            summary.set(key, { sku, productName, platform, quantity });
          }
        });
      } else {
        const sku = item.sku || 'UNKNOWN';
        const productName = skuToProductName.get(sku) || item.productName || item.product_name || 'Bilinmeyen Ürün';
        const key = `${sku}|||${productName}|||${platform}`;

        if (summary.has(key)) {
          summary.get(key)!.quantity += quantity;
        } else {
          summary.set(key, { sku, productName, platform, quantity });
        }
      }
    });
  });

  return Array.from(summary.values());
}

export default async function ProductPlatformSalesReportPage() {
  const [orders, products] = await Promise.all([fetchOrders(), fetchProducts()]);
  const rows = buildProductPlatformRows(orders, products);

  return (
    <MainLayout>
      <ProductPlatformSalesClient rows={rows} />
    </MainLayout>
  );
}
