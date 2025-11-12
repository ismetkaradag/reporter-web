// ===============================================
// İADE TUTARI HESAPLAMA - CORE LOGIC
// ===============================================
// RT zincir takibi ve iade tutarı hesaplama mantığı

import type {
  ReturnRequest,
  ReturnRequestWithRefund,
  Return,
  ReturnWithAmount,
  Order
} from '@/types';

// ===============================================
// YARDIMCI FONKSİYONLAR
// ===============================================

/**
 * RT zincirini geriye doğru takip ederek orijinal fiyatı bul
 */
function findPriceInChain(
  request: ReturnRequest,
  currentLine: any,
  allRequests: ReturnRequest[]
): number {
  // Sadece Ödeme İadesi ve Para Puan için
  if (request.return_action !== 'Ödeme İadesi' && request.return_action !== 'Para Puan') {
    return 0;
  }

  let currentOrderNumber = request.custom_order_number || '';
  let currentProductName = currentLine.product_name;
  let currentFromAttr = currentLine.from_attr;
  const visitedOrderNumbers = new Set<string>();
  visitedOrderNumbers.add(currentOrderNumber);

  // RT zincirini geriye doğru takip et
  while (currentOrderNumber.startsWith('RT')) {
    // RT'den from_id'yi çıkar (örn: RT7052BK2508144530 → 7052)
    const match = currentOrderNumber.match(/^RT(\d+)/);
    if (!match) break;

    const previousRequestFromId = parseInt(match[1]);

    // from_id'si bu olan önceki talebi bul
    const previousRequest = allRequests.find(r => r.from_id === previousRequestFromId);
    if (!previousRequest || !previousRequest.lines) break;

    // Döngü kontrolü
    if (visitedOrderNumbers.has(previousRequest.custom_order_number || '')) break;
    visitedOrderNumbers.add(previousRequest.custom_order_number || '');

    const previousLines = Array.isArray(previousRequest.lines) ? previousRequest.lines : [];

    // Önceki talepteki eşleşen satırı bul
    // replacementProductName + toAttr = currentProductName + currentFromAttr
    const matchingLine = previousLines.find((line: any) => {
      const productMatch = line.replacement_product_name === currentProductName;
      const attrMatch = line.to_attr === currentFromAttr;
      return productMatch && attrMatch;
    });

    if (!matchingLine) break;

    // Normal siparişe ulaştıysak, birim fiyatı döndür
    if (!previousRequest.custom_order_number?.startsWith('RT')) {
      // price zaten toplam tutar (quantity * birim fiyat)
      // Birim fiyatı bul
      if (matchingLine.price && matchingLine.quantity > 0) {
        return matchingLine.price / matchingLine.quantity;
      }
      return matchingLine.product_price || 0;
    }

    // Hala RT zincirindeyiz, devam et
    currentProductName = matchingLine.product_name;
    currentFromAttr = matchingLine.from_attr;
    currentOrderNumber = previousRequest.custom_order_number || '';
  }

  // Normal siparişe ulaştıysak, son kontrol
  if (!currentOrderNumber.startsWith('RT')) {
    const normalOrderRequest = allRequests.find(r =>
      r.custom_order_number === currentOrderNumber
    );

    if (normalOrderRequest && normalOrderRequest.lines) {
      const normalLines = Array.isArray(normalOrderRequest.lines) ? normalOrderRequest.lines : [];
      const matchingLine = normalLines.find((line: any) => {
        return line.product_name === currentProductName &&
               line.from_attr === currentFromAttr;
      });

      if (matchingLine) {
        // price zaten toplam tutar (quantity * birim fiyat)
        // Birim fiyatı bul
        if (matchingLine.price && matchingLine.quantity > 0) {
          return matchingLine.price / matchingLine.quantity;
        }
        return matchingLine.product_price || 0;
      }
    }
  }

  return 0;
}

/**
 * Normal sipariş için iade tutarını hesapla
 */
function calculateNormalOrderRefund(
  request: ReturnRequest,
  order: Order
): { refundAmount: number; hasError: boolean; errorMessage?: string } {
  let refundAmount = 0;
  let hasError = false;
  let errorMessage = '';

  const returnAction = request.return_action || '';
  const lines = Array.isArray(request.lines) ? request.lines : [];

  // Toplam ürün sayılarını hesapla
  const orderTotalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const requestTotalItems = lines
    .filter((line: any) => {
      // Değişim satırlarını sayma (to_attr dolu olanlar)
      if (returnAction !== 'Ödeme İadesi' &&
          returnAction !== 'Para Puan' &&
          line.to_attr && line.to_attr.trim() !== '') {
        return false;
      }
      return true;
    })
    .reduce((sum: number, line: any) => sum + line.quantity, 0);

  // 1. Tam İade Kontrolü
  if (orderTotalItems === requestTotalItems &&
      (returnAction === 'Ödeme İadesi' || returnAction === 'Para Puan')) {
    // Tam iade: order_total - vade farkı
    refundAmount = order.order_total - (order.payment_method_additional_fee_incl_tax || 0);
    return { refundAmount, hasError: false };
  }

  // 2. Kısmi İade veya Değişim
  for (const line of lines) {
    // Değişim satırlarını atla (to_attr dolu ise)
    if (returnAction !== 'Ödeme İadesi' &&
        returnAction !== 'Para Puan' &&
        line.to_attr && line.to_attr.trim() !== '') {
      continue;
    }

    // Eğer line.price varsa direkt kullan (zaten toplam tutar: quantity * birim fiyat)
    if ((returnAction === 'Ödeme İadesi' || returnAction === 'Para Puan') &&
        line.price && line.price > 0) {
      refundAmount += line.price; // price zaten toplam tutar
      continue;
    }

    // Order'daki item'ı bul
    const orderItem = order.items.find((item: any) => item.productId == line.product_id);

    if (!orderItem) {
      hasError = true;
      errorMessage = `Ürün bulunamadı: ${line.product_name}`;
      continue;
    }

    // Birim fiyatı hesapla
    const refundPerItem = orderItem.subTotalInclTax / orderItem.quantity;

    // Satır iadesini hesapla
    const lineRefund = refundPerItem * line.quantity;

    refundAmount += lineRefund;
  }

  return { refundAmount, hasError, errorMessage };
}

/**
 * RT siparişi için iade tutarını hesapla
 */
function calculateRTOrderRefund(
  request: ReturnRequest,
  allRequests: ReturnRequest[],
  ordersMap: Map<string, Order>
): { refundAmount: number; hasError: boolean; errorMessage?: string } {
  let refundAmount = 0;
  let hasError = false;
  let errorMessage = '';

  const returnAction = request.return_action || '';
  const lines = Array.isArray(request.lines) ? request.lines : [];

  // Sadece Ödeme İadesi ve Para Puan için hesapla
  if (returnAction !== 'Ödeme İadesi' && returnAction !== 'Para Puan') {
    return { refundAmount: 0, hasError: false };
  }

  // Her line için RT zincirini takip et
  for (const line of lines) {
    const originalPrice = findPriceInChain(request, line, allRequests);

    if (originalPrice > 0) {
      refundAmount += originalPrice * line.quantity;
    } else {
      hasError = true;
      errorMessage = `RT zincirinde orijinal fiyat bulunamadı (Eksik iade talebi?)`;
    }
  }

  // Max refund kontrolü (orijinal BK siparişine göre)
  const bkMatch = request.custom_order_number?.match(/BK\d+/);
  if (bkMatch && refundAmount > 0) {
    const originalOrderNumber = bkMatch[0];
    const originalOrder = ordersMap.get(originalOrderNumber);

    if (originalOrder) {
      const requestTotalItems = lines.reduce((sum, line: any) => sum + line.quantity, 0);
      const orderTotalItems = originalOrder.items.reduce((sum, item) => sum + item.quantity, 0);

      // Eğer tüm ürünler iade ediliyorsa
      if (orderTotalItems === requestTotalItems) {
        const orderMaxRefund = originalOrder.order_total -
                               (originalOrder.payment_method_additional_fee_incl_tax || 0);

        // Hesaplanan tutar asla sipariş toplamını geçemez
        if (refundAmount > orderMaxRefund) {
          refundAmount = orderMaxRefund;
        }
      }
    }
  }

  return { refundAmount, hasError, errorMessage };
}

// ===============================================
// ANA HESAPLAMA FONKSİYONLARI
// ===============================================

/**
 * Return request için iade tutarını hesapla
 */
export function calculateReturnRequestRefund(
  request: ReturnRequest,
  allRequests: ReturnRequest[],
  ordersMap: Map<string, Order>
): ReturnRequestWithRefund {
  const orderNumber = request.custom_order_number || '';
  const order = ordersMap.get(orderNumber);

  // Sipariş bulunamadıysa ve RT değilse hata
  if (!order && !orderNumber.startsWith('RT')) {
    console.warn(`[${request.custom_number}] Sipariş bulunamadı: ${orderNumber}`);
    return {
      ...request,
      refund_amount: 0,
      has_error: true,
      error_message: `Sipariş bulunamadı: ${orderNumber}`
    };
  }

  let result: { refundAmount: number; hasError: boolean; errorMessage?: string };

  // RT siparişi mi?
  if (orderNumber.startsWith('RT')) {
    result = calculateRTOrderRefund(request, allRequests, ordersMap);
    if (result.hasError) {
      console.warn(`[${request.custom_number}] RT hesaplama hatası: ${result.errorMessage}`);
    }
  } else if (order) {
    result = calculateNormalOrderRefund(request, order);
    if (result.hasError) {
      console.warn(`[${request.custom_number}] Normal hesaplama hatası: ${result.errorMessage}`);
    }
  } else {
    result = { refundAmount: 0, hasError: true, errorMessage: 'Sipariş bulunamadı' };
  }

  return {
    ...request,
    refund_amount: result.refundAmount,
    has_error: result.hasError,
    error_message: result.errorMessage,
    order_total_amount: order?.order_total
  };
}

/**
 * Tüm return requests için iade tutarlarını hesapla
 */
export function calculateAllReturnRequestRefunds(
  requests: ReturnRequest[],
  orders: Order[]
): ReturnRequestWithRefund[] {
  // Siparişleri Map'e çevir (hızlı erişim için)
  const ordersMap = new Map<string, Order>();
  orders.forEach(order => {
    // custom_order_number ile map'le
    if (order.custom_order_number) {
      ordersMap.set(order.custom_order_number, order);
    }
  });

  console.log(`Order map created with ${ordersMap.size} orders from ${orders.length} total`);

  // Geçersiz kayıtları filtrele
  const validRequests = requests.filter(request => {
    // Lines yoksa geçersiz
    if (!request.lines || !Array.isArray(request.lines) || request.lines.length === 0) {
      return false;
    }

    // En az bir line'da from_attr dolu olmalı
    const hasValidLine = request.lines.some((line: any) =>
      line.from_attr && line.from_attr.trim() !== ''
    );

    return hasValidLine;
  });

  console.log(`Processing ${validRequests.length} valid requests out of ${requests.length} total`);

  // Her request için tutarı hesapla
  const results = validRequests.map(request =>
    calculateReturnRequestRefund(request, validRequests, ordersMap)
  );

  // Hata özeti
  const errorCount = results.filter(r => r.has_error).length;
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} kayıt için tutar hesaplanamadı (yukarıdaki warn log'larına bakın)`);
  }

  return results;
}

// ===============================================
// RETURNS AMOUNT CALCULATION
// ===============================================

/**
 * Return (iade) için tutarı hesapla
 */
export function calculateReturnAmount(
  returnItem: Return,
  requestsWithRefundAmount: ReturnRequestWithRefund[],
  ordersMap: Map<string, Order>
): number {
  // İadeler için tutarı direkt items'dan hesapla
  // subTotalInclTaxValue zaten quantity ile çarpılmış toplam tutar
  if (returnItem.items && Array.isArray(returnItem.items) && returnItem.items.length > 0) {
    const items = returnItem.items;
    const returnAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.sub_total_incl_tax_value || 0);
    }, 0);

    if (returnAmount > 0) {
      return returnAmount;
    }
  }

  // Fallback: return_request_custom_number ile eşleştir
  let returnRequest: ReturnRequestWithRefund | undefined;

  if (returnItem.return_request_custom_number) {
    returnRequest = requestsWithRefundAmount.find(r =>
      r.custom_number === returnItem.return_request_custom_number
    );
  }

  if (returnRequest) {
    return returnRequest.refund_amount || 0;
  }

  return 0;
}

/**
 * Tüm returns için tutarları hesapla
 */
export function calculateAllReturnAmounts(
  returns: Return[],
  requestsWithRefundAmount: ReturnRequestWithRefund[],
  orders: Order[]
): ReturnWithAmount[] {
  const ordersMap = new Map<string, Order>();
  orders.forEach(order => {
    ordersMap.set(order.custom_order_number, order);
  });

  return returns.map(returnItem => ({
    ...returnItem,
    return_amount: calculateReturnAmount(returnItem, requestsWithRefundAmount, ordersMap)
  }));
}

// ===============================================
// PARA FORMATLAMA
// ===============================================

/**
 * Türkçe para formatı: 1.002.125,45₺
 */
export function formatCurrency(amount: number): string {
  const formatted = amount.toFixed(2);
  const [integerPart, decimalPart] = formatted.split('.');

  const reversedInteger = integerPart.split('').reverse().join('');
  const groupedReversed = reversedInteger.match(/.{1,3}/g) || [];
  const formattedInteger = groupedReversed.join('.').split('').reverse().join('');

  return `${formattedInteger},${decimalPart}₺`;
}
