import type { Order, DashboardStats, CampusStats } from '@/types';
import {
  calculateNetRevenue,
  isSuccessfulOrder,
  isCancelledOrder,
  isRefundedOrder,
  getOrderStatus,
} from './orderUtils';

/**
 * Dashboard istatistiklerini hesapla
 */
export function calculateDashboardStats(orders: Order[]): DashboardStats {
  const totalOrders = orders.length;

  const successfulOrders = orders.filter(isSuccessfulOrder).length;
  const cancelledOrders = orders.filter(isCancelledOrder).length;
  const refundedOrders = orders.filter(isRefundedOrder).length;

  // Ciro hesaplamaları
  // Toplam ciro = Sadece başarılı siparişlerin toplamı
  const successfulRevenue = orders
    .filter(isSuccessfulOrder)
    .reduce((sum, order) => sum + calculateNetRevenue(order), 0);

  // İptal ve iade tutarları ayrı gösterilir (toplam cirodan çıkarılmaz)
  const cancelledRevenue = orders
    .filter(isCancelledOrder)
    .reduce((sum, order) => sum + calculateNetRevenue(order), 0);

  const refundedRevenue = orders
    .filter(isRefundedOrder)
    .reduce((sum, order) => sum + calculateNetRevenue(order), 0);

  // Toplam ciro = Başarılı siparişlerin cirosu
  const totalRevenue = successfulRevenue;

  const averageOrderValue = successfulOrders > 0 ? successfulRevenue / successfulOrders : 0;

  // Para puan kullanımı
  const rewardPointsUsed = orders.reduce(
    (sum, order) => sum + (order.redeemed_reward_points_amount || 0),
    0
  );

  return {
    totalOrders,
    successfulOrders,
    cancelledOrders,
    refundedOrders,
    totalRevenue,
    successfulRevenue,
    cancelledRevenue,
    refundedRevenue,
    averageOrderValue,
    rewardPointsUsed,
  };
}

/**
 * Kampüs bazlı istatistikleri hesapla
 */
export function calculateCampusStats(orders: Order[]): CampusStats[] {
  const campusMap = new Map<string, CampusStats>();

  orders.forEach((order) => {
    const campus = order.campus || 'Bilinmeyen';

    if (!campusMap.has(campus)) {
      campusMap.set(campus, {
        campus,
        orderCount: 0,
        revenue: 0,
        successfulOrders: 0,
        cancelledOrders: 0,
      });
    }

    const stats = campusMap.get(campus)!;
    stats.orderCount++;

    // Kampüs cirosu = Sadece başarılı siparişler
    if (isSuccessfulOrder(order)) {
      stats.revenue += calculateNetRevenue(order);
      stats.successfulOrders++;
    }

    if (isCancelledOrder(order)) {
      stats.cancelledOrders++;
    }
  });

  // Map'i array'e çevir ve ciroya göre sırala
  return Array.from(campusMap.values()).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Tarih aralığına göre siparişleri filtrele
 */
export function filterOrdersByDateRange(
  orders: Order[],
  startDate: Date,
  endDate: Date
): Order[] {
  return orders.filter((order) => {
    const orderDate = new Date(order.created_on);
    return orderDate >= startDate && orderDate <= endDate;
  });
}

/**
 * Kampüse göre siparişleri filtrele
 */
export function filterOrdersByCampus(orders: Order[], campus: string): Order[] {
  if (!campus || campus === 'all') {
    return orders;
  }
  return orders.filter((order) => order.campus === campus);
}

/**
 * Sipariş durum dağılımını hesapla
 */
export function calculateOrderStatusDistribution(orders: Order[]): {
  basarili: number;
  iptal: number;
  iade: number;
  onayBekliyor: number;
  basarisiz: number;
} {
  const distribution = {
    basarili: 0,
    iptal: 0,
    iade: 0,
    onayBekliyor: 0,
    basarisiz: 0,
  };

  orders.forEach((order) => {
    const status = getOrderStatus(order.order_status, order.payment_status);

    switch (status) {
      case 'basarili':
        distribution.basarili++;
        break;
      case 'iptal':
        distribution.iptal++;
        break;
      case 'iade':
        distribution.iade++;
        break;
      case 'onay-bekliyor':
        distribution.onayBekliyor++;
        break;
      case 'basarisiz':
        distribution.basarisiz++;
        break;
    }
  });

  return distribution;
}
