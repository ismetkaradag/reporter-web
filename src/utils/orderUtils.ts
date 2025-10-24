import type { Order, OrderStatusType } from '@/types';

/**
 * Sipariş durumu belirleme
 * STARTER_PROMPT.MD'deki iş mantığına göre
 */
export function getOrderStatus(orderStatus: string, paymentStatus: string): OrderStatusType {
  // İptal edilmiş ama ödemesi alınmış
  if (
    (orderStatus === 'İptal Edildi' || orderStatus === 'İptal Tutarı Bankaya İletildi') &&
    paymentStatus === 'Ödeme Tamamlandı'
  ) {
    return 'iptal';
  }

  // İptal edilmiş ve ödeme alınmamış
  if (orderStatus === 'İptal Edildi' && paymentStatus === 'Ödeme Alınamadı') {
    return 'basarisiz';
  }

  // İade edilmiş
  if (orderStatus === 'İade Edildi' && paymentStatus === 'Ödeme Tamamlandı') {
    return 'iade';
  }

  // Onay bekliyor
  if (orderStatus === 'Onay Bekliyor') {
    return 'onay-bekliyor';
  }

  // Başarılı
  if (paymentStatus === 'Ödeme Tamamlandı') {
    return 'basarili';
  }

  return 'basarisiz';
}

/**
 * Net ciro hesaplama
 * Ciro = order_total - vade_farkı (payment_method_additional_fee_incl_tax)
 *
 * Bu fonksiyon her siparişin brüt tutarını hesaplar.
 * Dashboard'da sadece başarılı siparişler toplam ciroya dahil edilir.
 * İptal ve iade tutarları ayrı gösterilir.
 */
export function calculateNetRevenue(order: Order | { order_total: number; payment_method_additional_fee_incl_tax: number }): number {
  return order.order_total - (order.payment_method_additional_fee_incl_tax || 0);
}

/**
 * Toplam indirim hesaplama
 * Sipariş seviyesi + Ürün seviyesi indirimleri
 */
export function calculateTotalDiscount(order: Order): number {
  return (
    (order.order_sub_total_discount_incl_tax || 0) +
    (order.total_item_discount_amount || 0)
  );
}

/**
 * Başarılı sipariş mi kontrol et
 */
export function isSuccessfulOrder(order: Order | { order_status: string; payment_status: string }): boolean {
  return getOrderStatus(order.order_status, order.payment_status) === 'basarili';
}

/**
 * İptal edilmiş sipariş mi kontrol et
 */
export function isCancelledOrder(order: Order | { order_status: string; payment_status: string }): boolean {
  return getOrderStatus(order.order_status, order.payment_status) === 'iptal';
}

/**
 * İade edilmiş sipariş mi kontrol et
 */
export function isRefundedOrder(order: Order | { order_status: string; payment_status: string }): boolean {
  return getOrderStatus(order.order_status, order.payment_status) === 'iade';
}

/**
 * Para puan kullanılan sipariş mi kontrol et
 */
export function hasRewardPointsUsed(order: Order): boolean {
  return (order.redeemed_reward_points || 0) > 0;
}

/**
 * Dashboard'da gösterilecek sipariş mi kontrol et
 * Başarısız, onay bekliyor ve kampüsü olmayan siparişler hariç tutulur
 */
export function shouldShowInDashboard(order: Order): boolean {
  const status = getOrderStatus(order.order_status, order.payment_status);
  return status !== 'basarisiz' && status !== 'onay-bekliyor';
}

/**
 * Dashboard için siparişleri filtrele
 */
export function filterOrdersForDashboard(orders: Order[]): Order[] {
  return orders.filter(shouldShowInDashboard);
}
