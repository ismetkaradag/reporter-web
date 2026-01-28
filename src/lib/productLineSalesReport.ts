import 'server-only';

import type { Order, Product } from '@/types';
import { getServiceRoleClient } from '@/lib/supabase';
import { isSuccessfulOrder } from '@/utils/orderUtils';

interface ReportGroupRow {
  name: string;
  product_skus: string[] | null;
}

interface CustomerRow {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  identity_number: string | null;
  student_class_name: string | null;
  membership_name: string | null;
  campus_name: string | null;
}

export interface ProductLineRow {
  customerEmail: string;
  customerPhone: string;
  customerFirstName: string;
  customerLastName: string;
  customerIdentityNumber: string;
  studentClassName: string;
  membershipName: string;
  campusName: string;
  customOrderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentSystem: string;
  installment: number;
  orderTotal: number;
  totalItemDiscountAmount: number;
  orderSubTotalDiscountInclTax: number;
  paymentMethodAdditionalFeeInclTax: number;
  created_on: string;
  cargo_fee: number;
  itemSku: string;
  itemProductName: string;
  itemAttributeInfo: string;
  itemQuantity: number;
  itemUnitPriceInclTax: number;
  itemDiscountInclTax: number;
  itemTotalPriceInclTax: number;
  itemCampaignName: string;
  itemType: 'Tekil Ürün' | 'Set İçi Ürün';
  reportGroups: string;
}

function parseSetProducts(attributeInfo: string): Array<{ name: string; attribute: string; attributeValue: string }> {
  const lines = attributeInfo
    .split('<br />')
    .map((line) => line.trim())
    .filter(Boolean);

  const products = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 1 < lines.length) {
      const attributeLine = lines[i + 1];

      let attributeValue = '';
      if (attributeLine.includes(':')) {
        attributeValue = attributeLine.split(':')[1].trim();
      }

      products.push({
        name: lines[i],
        attribute: attributeLine,
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
      .select(
        'custom_order_number,order_status,payment_status,payment_method,payment_system,installment,order_total,total_item_discount_amount,order_sub_total_discount_incl_tax,payment_method_additional_fee_incl_tax,created_on,order_shipping_incl_tax,customer_id,customer_email,identity_number,class,membership,campus,items'
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

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allOrders;
}

async function fetchCustomers(): Promise<CustomerRow[]> {
  const supabase = getServiceRoleClient();
  const allCustomers: CustomerRow[] = [];
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

  return allCustomers;
}

async function fetchReportGroups(): Promise<ReportGroupRow[]> {
  const supabase = getServiceRoleClient();

  const { data: groups, error } = await supabase
    .from('report_groups')
    .select('name, product_skus');

  if (error) {
    console.error('Error fetching report groups:', error);
    throw new Error('Failed to fetch report groups');
  }

  return (groups as ReportGroupRow[]) || [];
}

async function fetchProducts(): Promise<Product[]> {
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, combinations, price');

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }

  return (data as Product[]) || [];
}

export async function getProductLineReportSourceData() {
  const [orders, customers, reportGroups, products] = await Promise.all([
    fetchOrders(),
    fetchCustomers(),
    fetchReportGroups(),
    fetchProducts(),
  ]);

  return { orders, customers, reportGroups, products };
}

export function buildProductLineRows(
  orders: Order[],
  customers: CustomerRow[],
  reportGroups: ReportGroupRow[],
  products: Product[]
): ProductLineRow[] {
  const rows: ProductLineRow[] = [];

  const customerMap = new Map<number, CustomerRow>();
  customers.forEach((customer) => {
    customerMap.set(customer.id, customer);
  });

  const skuToGroupsMap = new Map<string, string[]>();
  reportGroups.forEach((group) => {
    if (group.product_skus && Array.isArray(group.product_skus)) {
      group.product_skus.forEach((sku: string) => {
        if (!skuToGroupsMap.has(sku)) {
          skuToGroupsMap.set(sku, []);
        }
        skuToGroupsMap.get(sku)!.push(group.name);
      });
    }
  });

  const skuToProductInfo = new Map<string, {
    productName: string;
    attributeInfo: string;
    stockQuantity: number;
    price: number;
  }>();

  products.forEach((product) => {
    if (product.sku && product.name) {
      skuToProductInfo.set(product.sku, {
        productName: product.name,
        attributeInfo: '-',
        stockQuantity: product.stock_quantity || 0,
        price: product.price || 0,
      });
    }

    if (product.combinations && Array.isArray(product.combinations) && product.name) {
      product.combinations.forEach((combination: any) => {
        if (combination.sku) {
          let attributeInfo = '-';
          if (combination.attributes && Array.isArray(combination.attributes)) {
            attributeInfo = combination.attributes
              .map((attr: any) => `${attr.name}: ${attr.value}`)
              .join(', ');
          }

          skuToProductInfo.set(combination.sku, {
            productName: product.name,
            attributeInfo,
            stockQuantity: combination.stockQuantity || 0,
            price: combination.overriddenPrice || product.price || 0,
          });
        }
      });
    }
  });

  const productNameAndAttributeToSku = new Map<string, string>();
  products.forEach((product) => {
    if (!product.name || !product.combinations) return;

    if (Array.isArray(product.combinations)) {
      product.combinations.forEach((combination: any) => {
        if (!combination.sku || !combination.attributes) return;

        combination.attributes.forEach((attr: any) => {
          if (attr.value) {
            const key = `${product.name.trim()}|||${attr.value.trim()}`;
            productNameAndAttributeToSku.set(key, combination.sku);
          }
        });
      });
    }
  });

  const successfulOrders = orders.filter(isSuccessfulOrder);

  successfulOrders.forEach((order) => {
    if (!order.items || !Array.isArray(order.items)) return;

    const customer = customerMap.get(order.customer_id as number) || ({} as CustomerRow);

    order.items.forEach((item: any) => {
      const quantity = item.quantity || 0;
      const attributeInfo = item.attributeInfo || item.attribute_info || '';
      const isSetProduct = attributeInfo && attributeInfo.includes('<br />');

      const commonData = {
        customerEmail: customer.email || order.customer_email || '',
        customerPhone: customer.phone || '',
        customerFirstName: customer.first_name || '',
        customerLastName: customer.last_name || '',
        customerIdentityNumber: customer.identity_number || order.identity_number || '',
        studentClassName: customer.student_class_name || order.class || '',
        membershipName: customer.membership_name || order.membership || '',
        campusName: customer.campus_name || order.campus || '',
        customOrderNumber: order.custom_order_number || '',
        orderStatus: order.order_status || '',
        paymentStatus: order.payment_status || '',
        paymentMethod: order.payment_method || '',
        paymentSystem: order.payment_system || '',
        installment: typeof order.installment === 'number'
          ? order.installment
          : (parseInt(order.installment as string, 10) || 0),
        orderTotal: order.order_total || 0,
        totalItemDiscountAmount: order.total_item_discount_amount || 0,
        orderSubTotalDiscountInclTax: order.order_sub_total_discount_incl_tax || 0,
        paymentMethodAdditionalFeeInclTax: order.payment_method_additional_fee_incl_tax || 0,
        created_on: order.created_on || '',
        cargo_fee: order.order_shipping_incl_tax || 0,
      };

      if (isSetProduct) {
        const subProducts = parseSetProducts(attributeInfo);
        const setTotalDiscount = item.discountInclTax || item.discount_incl_tax || 0;

        const subProductsWithPrices = subProducts.map((subProduct) => {
          const lookupKey = `${subProduct.name.trim()}|||${subProduct.attributeValue.trim()}`;
          const sku = productNameAndAttributeToSku.get(lookupKey) || 'UNKNOWN';
          const productInfo = skuToProductInfo.get(sku);
          const realPrice = productInfo?.price || 0;

          return {
            subProduct,
            sku,
            productInfo,
            realPrice,
          };
        });

        const totalRealPrice = subProductsWithPrices.reduce((sum, p) => sum + p.realPrice, 0);

        subProductsWithPrices.forEach((productData) => {
          const { subProduct, sku, productInfo, realPrice } = productData;

          const discountForThisProduct = totalRealPrice > 0
            ? (realPrice / totalRealPrice) * setTotalDiscount
            : 0;

          const productName = productInfo?.productName || subProduct.name;
          const productAttributeInfo = productInfo?.attributeInfo || subProduct.attribute;

          const groupNames = skuToGroupsMap.get(sku) || [];
          const reportGroupsStr = groupNames.join(', ');

          rows.push({
            ...commonData,
            itemSku: sku,
            itemProductName: productName,
            itemAttributeInfo: productAttributeInfo,
            itemQuantity: quantity,
            itemUnitPriceInclTax: realPrice,
            itemDiscountInclTax: discountForThisProduct,
            itemTotalPriceInclTax: item.totalPriceInclTax || item.total_price_incl_tax || 0,
            itemCampaignName: item.campaignName || item.campaign_name || '',
            itemType: 'Set İçi Ürün',
            reportGroups: reportGroupsStr,
          });
        });
      } else {
        const itemSku = item.sku || '';
        const groupNames = skuToGroupsMap.get(itemSku) || [];
        const reportGroupsStr = groupNames.join(', ');

        rows.push({
          ...commonData,
          itemSku,
          itemProductName: item.productName || item.product_name || '',
          itemAttributeInfo: attributeInfo,
          itemQuantity: quantity,
          itemUnitPriceInclTax: item.unitPriceInclTax || item.unit_price_incl_tax || 0,
          itemDiscountInclTax: item.discountInclTax || item.discount_incl_tax || 0,
          itemTotalPriceInclTax: item.totalPriceInclTax || item.total_price_incl_tax || 0,
          itemCampaignName: item.campaignName || item.campaign_name || '',
          itemType: 'Tekil Ürün',
          reportGroups: reportGroupsStr,
        });
      }
    });
  });

  return rows;
}

export function extractCampuses(customers: CustomerRow[]): string[] {
  const campusSet = new Set<string>();
  customers.forEach((customer) => {
    if (customer.campus_name) {
      campusSet.add(customer.campus_name);
    }
  });
  return Array.from(campusSet).sort();
}

export function filterProductLineRows(
  rows: ProductLineRow[],
  searchQuery: string,
  selectedCampuses: string[]
): ProductLineRow[] {
  let filtered = rows;

  if (selectedCampuses.length > 0) {
    const campusSet = new Set(selectedCampuses);
    filtered = filtered.filter((row) => row.campusName && campusSet.has(row.campusName));
  }

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.itemProductName.toLowerCase().includes(query) ||
        row.itemSku.toLowerCase().includes(query) ||
        row.customerEmail.toLowerCase().includes(query) ||
        row.customerFirstName.toLowerCase().includes(query) ||
        row.customerLastName.toLowerCase().includes(query) ||
        row.customOrderNumber.toLowerCase().includes(query) ||
        row.reportGroups.toLowerCase().includes(query)
    );
  }

  return filtered;
}
