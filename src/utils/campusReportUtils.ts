import type { Order } from '@/types';
import {
  calculateNetRevenue,
  isSuccessfulOrder,
  isCancelledOrder,
  isRefundedOrder,
} from './orderUtils';
import {
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  getAllTimeRange,
} from './dateUtils';

export interface CampusSalesStats {
  campus: string;
  today: {
    sales: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  };
  week: {
    sales: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  };
  month: {
    sales: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  };
  allTime: {
    sales: number;
    cancelled: number;
    refunded: number;
    revenue: number;
  };
}

/**
 * Tarih aralığına göre siparişleri filtrele
 */
function filterByDateRange(orders: Order[], start: Date, end: Date): Order[] {
  return orders.filter((order) => {
    const orderDate = new Date(order.created_on);
    return orderDate >= start && orderDate <= end;
  });
}

/**
 * Belirli bir tarih aralığı için istatistikleri hesapla
 */
function calculateStatsForPeriod(orders: Order[]) {
  const sales = orders.filter(isSuccessfulOrder).length;
  const cancelled = orders.filter(isCancelledOrder).length;
  const refunded = orders.filter(isRefundedOrder).length;
  const revenue = orders
    .filter(isSuccessfulOrder)
    .reduce((sum, order) => sum + calculateNetRevenue(order), 0);

  return { sales, cancelled, refunded, revenue };
}

/**
 * Kampüs bazlı satış raporu oluştur
 */
export function generateCampusSalesReport(orders: Order[]): CampusSalesStats[] {
  // Kampüslere göre grupla
  const campusMap = new Map<string, Order[]>();

  orders.forEach((order) => {
    const campus = order.campus || 'Bilinmeyen';
    if (!campusMap.has(campus)) {
      campusMap.set(campus, []);
    }
    campusMap.get(campus)!.push(order);
  });

  // Her kampüs için istatistikleri hesapla
  const report: CampusSalesStats[] = [];

  campusMap.forEach((campusOrders, campus) => {
    // Tarih aralıkları
    const todayRange = getTodayRange();
    const weekRange = getThisWeekRange();
    const monthRange = getThisMonthRange();
    const allTimeRange = getAllTimeRange();

    // Filtreleme
    const todayOrders = filterByDateRange(campusOrders, todayRange.start, todayRange.end);
    const weekOrders = filterByDateRange(campusOrders, weekRange.start, weekRange.end);
    const monthOrders = filterByDateRange(campusOrders, monthRange.start, monthRange.end);
    const allTimeOrders = filterByDateRange(campusOrders, allTimeRange.start, allTimeRange.end);

    // İstatistikler
    report.push({
      campus,
      today: calculateStatsForPeriod(todayOrders),
      week: calculateStatsForPeriod(weekOrders),
      month: calculateStatsForPeriod(monthOrders),
      allTime: calculateStatsForPeriod(allTimeOrders),
    });
  });

  // Tüm zamanlar cirosu en yüksek olana göre sırala
  return report.sort((a, b) => b.allTime.revenue - a.allTime.revenue);
}
