import type { Order, ReportGroup } from '@/types';
import { getOrderStatus } from './orderUtils';
export interface ReportGroupStats {
  groupId: number;
  groupName: string;
  groupColor: string | null;
  revenue: number; // Ciro
  orderCount: number; // Sipariş sayısı
  cancelledCount: number; // İptal sayısı
}

/**
 * Bir sipariş içindeki ürün fiyatlarının toplam oranını hesapla
 * (Sipariş bazlı indirimi dağıtmak için kullanılır)
 */
function calculateItemsTotalPrice(order: Order): number {
  if (!order.items || !Array.isArray(order.items)) {
    return 0;
  }
  return order.items.reduce((sum, item) => {
    // Hem camelCase hem snake_case destekle
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPriceInclTax || item.unit_price_incl_tax || 0;
    return sum + (quantity * unitPrice);
  }, 0);
}

/**
 * Bir ürün için ciro hesapla (sipariş bazlı indirim dahil)
 */
function calculateItemRevenue(
  item: any,
  orderSubTotalDiscount: number,
  itemsTotalPrice: number
): number {
  // Hem camelCase hem snake_case destekle
  const quantity = item.quantity || 1;
  const unitPrice = item.unitPriceInclTax || item.unit_price_incl_tax || 0;
  const itemDiscount = item.discountInclTax || item.discount_incl_tax || 0;

  // Ürünün toplam fiyatı (KDV dahil)
  const itemTotalPrice = quantity * unitPrice;

  // Ürün bazlı indirim (zaten item'da var)
  const itemLevelDiscount = itemDiscount / quantity;

  // Sipariş bazlı indirimin bu ürüne düşen payı
  // (Ürünün fiyatının toplam içindeki oranına göre)
  let orderLevelDiscountShare = 0;
  if (itemsTotalPrice > 0 && orderSubTotalDiscount > 0) {
    const ratio = itemTotalPrice / itemsTotalPrice;
    orderLevelDiscountShare = orderSubTotalDiscount * ratio;
  }

  // Ciro = Toplam Fiyat - Ürün İndirimi - Sipariş İndirimi Payı
  const revenue = itemTotalPrice - itemLevelDiscount - orderLevelDiscountShare;

  return Math.max(0, revenue); // Negatif olmaz
}

/**
 * Tüm rapor grupları için istatistikleri hesapla
 *
 * NOT: Kombinasyonlu ürünler için combination.sku kullanılır.
 * order.items[].sku ile group.product_skus tam eşitlik (===) kontrolü yapılır.
 */
export function calculateReportGroupStats(
  orders: Order[],
  groups: ReportGroup[]
): ReportGroupStats[] {
  if (!groups || groups.length === 0) {
    return [];
  }

  const stats: ReportGroupStats[] = groups.map((group) => {
    let totalRevenue = 0;
    const orderIds = new Set<number>(); // Unique sipariş ID'leri
    const cancelledOrderIds = new Set<number>(); // İptal edilen siparişler

    // Grup içindeki SKU'ları Set'e çevir (hızlı lookup için)
    const groupProductSkus = new Set(group.product_skus || []);

    // Her siparişi gez
    orders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) {
        return;
      }
      const orderSubTotalDiscount = order.order_sub_total_discount_incl_tax || 0;
      const itemsTotalPrice = calculateItemsTotalPrice(order);

      let hasGroupProduct = false;

      // Sipariş içindeki ürünleri kontrol et
      order.items.forEach((item) => {
        if (!item || !item.sku) {
          return;
        }

        // Tam eşitlik kontrolü: order item SKU === group SKU
        if (groupProductSkus.has(item.sku)) {
          hasGroupProduct = true;

          // Ürün cirosunu hesapla
          const itemRevenue = calculateItemRevenue(
            item,
            orderSubTotalDiscount,
            itemsTotalPrice
          );
          if (getOrderStatus(order.order_status, order.payment_status) === 'basarili') {
            totalRevenue += itemRevenue;
          }
        }
      });

      // Eğer bu siparişte grup ürünü varsa
      if (hasGroupProduct && order.id) {
        orderIds.add(order.id);

        // İptal kontrolü
        if (getOrderStatus(order.order_status, order.payment_status) === 'iptal') {
          cancelledOrderIds.add(order.id);
        }
      }
    });

    return {
      groupId: group.id,
      groupName: group.name,
      groupColor: group.color,
      revenue: totalRevenue,
      orderCount: orderIds.size,
      cancelledCount: cancelledOrderIds.size,
    };
  });

  // Ciroya göre sırala (azalan)
  return stats.sort((a, b) => b.revenue - a.revenue);
}
