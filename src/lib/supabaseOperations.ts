import { getServiceRoleClient } from './supabase';
import type { ExternalOrder, Order, Campus } from '@/types';

/**
 * Dış API'den gelen siparişi Supabase formatına çevir
 */
export function transformExternalOrderToDbOrder(externalOrder: ExternalOrder): Order {
  // Null/undefined kontrolü
  if (!externalOrder) {
    throw new Error('ExternalOrder is null or undefined');
  }

  // Ürün seviyesi indirimlerini hesapla
  const items = externalOrder.items || [];
  const totalItemDiscount = items.reduce(
    (sum, item) => sum + (item.discountInclTax || 0),
    0
  );

  return {
    id: externalOrder.id,
    order_guid: externalOrder.orderGuid || undefined,
    custom_order_number: externalOrder.customOrderNumber || '',
    customer_id: externalOrder.customerId || undefined,
    customer_info: externalOrder.customerInfo || undefined,
    customer_email: externalOrder.customerEmail || null,
    customer_full_name: externalOrder.customerFullName || null,
    customer_ip: externalOrder.customerIp || undefined,
    identity_number: externalOrder.identityNumber || undefined,
    order_status: externalOrder.orderStatus || '',
    order_channel: externalOrder.orderChannel || undefined,
    order_platform: externalOrder.orderPlatform || undefined,
    payment_status: externalOrder.paymentStatus || '',
    payment_method: externalOrder.paymentMethod || undefined,
    payment_system: externalOrder.paymentSystem || null,
    installment: externalOrder.installment || undefined,
    cash_on_delivery_method: externalOrder.cashOnDeliveryMethod || null,
    shipping_status: externalOrder.shippingStatus || undefined,
    shipping_method_name: externalOrder.shippingMethodName || undefined,
    tracking_number: externalOrder.trackingNumber || null,
    erp_status: externalOrder.erpStatus || undefined,
    shipping_address: externalOrder.shippingAddress || null,
    billing_address: externalOrder.billingAddress || null,
    items: items,
    checkout_attribute_info: externalOrder.checkoutAttributeInfo || '',
    created_on: externalOrder.createdOn,
    shipped_date: externalOrder.shippedDate || null,
    delivery_date: externalOrder.deliveryDate || null,
    verified_date: externalOrder.verifiedDate || null,
    order_subtotal_incl_tax: externalOrder.orderSubtotalInclTax || 0,
    order_subtotal_excl_tax: externalOrder.orderSubtotalExclTax || 0,
    order_sub_total_discount_incl_tax: externalOrder.orderSubTotalDiscountInclTax || 0,
    order_sub_total_discount_excl_tax: externalOrder.orderSubTotalDiscountExclTax || 0,
    order_shipping_cost: externalOrder.orderShippingCost || 0,
    order_shipping_incl_tax: externalOrder.orderShippingInclTax || 0,
    order_shipping_excl_tax: externalOrder.orderShippingExclTax || 0,
    payment_method_additional_fee_text: externalOrder.paymentMethodAdditionalFeeText || undefined,
    payment_method_additional_fee_incl_tax: externalOrder.paymentMethodAdditionalFeeInclTax || 0,
    payment_method_additional_fee_excl_tax: externalOrder.paymentMethodAdditionalFeeExclTax || 0,
    tax: externalOrder.tax || 0,
    order_total_discount: externalOrder.orderTotalDiscount || 0,
    order_total: externalOrder.orderTotal || 0,
    redeemed_reward_points: externalOrder.redeemedRewardPoints || 0,
    redeemed_reward_points_amount: externalOrder.redeemedRewardPointsAmount || 0,
    redeemed_reward_points_amount_str: externalOrder.redeemedRewardPointsAmountStr || null,
    campus: externalOrder.campus || undefined,
    class: externalOrder.class || undefined,
    stage: externalOrder.stage || null,
    membership: externalOrder.membership || null,
    collector_customer_id: externalOrder.collectorCustomerId || 0,
    verification_customer_id: externalOrder.verificationCustomerId || 0,
    total_item_discount_amount: totalItemDiscount,
  };
}

/**
 * Siparişleri Supabase'e toplu kaydet/güncelle (UPSERT)
 */
export async function upsertOrdersToSupabase(
  orders: ExternalOrder[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const supabase = getServiceRoleClient();

  // Filtre: null/undefined siparişleri temizle
  const validOrders = orders.filter(order => order && order.id);

  if (validOrders.length !== orders.length) {
    console.warn(`⚠️  ${orders.length - validOrders.length} invalid orders filtered out`);
  }

  // Chunk size (Supabase'in limit'i var, 1000'er yapıyoruz)
  const chunkSize = 1000;
  const totalChunks = Math.ceil(validOrders.length / chunkSize);

  for (let i = 0; i < validOrders.length; i += chunkSize) {
    const chunk = validOrders.slice(i, i + chunkSize);
    const dbOrders = chunk.map(transformExternalOrderToDbOrder);

    const { error } = await supabase
      .from('orders')
      .upsert(dbOrders, {
        onConflict: 'id', // id'ye göre conflict çözülür
        ignoreDuplicates: false, // Duplicate varsa güncelle
      });

    if (error) {
      console.error('Error upserting orders:', error);
      throw new Error(`Failed to upsert orders: ${error.message}`);
    }

    const currentChunk = Math.floor(i / chunkSize) + 1;
    console.log(`Upserted chunk ${currentChunk}/${totalChunks} (${chunk.length} orders)`);

    if (onProgress) {
      onProgress(currentChunk, totalChunks);
    }
  }

  console.log(`✅ Successfully upserted ${orders.length} orders to Supabase`);
}

/**
 * Siparişleri senkronize et - hata olursa devam et
 */
export async function syncOrdersToSupabase(
  orders: ExternalOrder[]
): Promise<{ failed: number }> {
  const supabase = getServiceRoleClient();

  let failed = 0;

  // Filtre: null/undefined siparişleri temizle
  const validOrders = orders.filter(order => order && order.id);

  // Teker teker işle - hata olursa devam et
  for (const externalOrder of validOrders) {
    try {
      const dbOrder = transformExternalOrderToDbOrder(externalOrder);


      const { error } = await supabase
        .from('orders')
        .upsert(dbOrder, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`❌ Sipariş #${dbOrder.id} kaydedilemedi:`, error.message);
        failed++;
      } 
    } catch (error: any) {
      console.error(`❌ Sipariş dönüştürme hatası:`, error.message);
      failed++;
    }
  }

  console.log(`✅ Sync tamamlandı - Başarısız: ${failed}`);

  return { failed };
}

/**
 * Kampüsleri Supabase'e kaydet/güncelle
 */
export async function upsertCampuses(campuses: Campus[]): Promise<void> {
  const supabase = getServiceRoleClient();

  const { error } = await supabase
    .from('campuses')
    .upsert(campuses, {
      onConflict: 'name',
      ignoreDuplicates: false,
    });

  if (error) {
    console.error('Error upserting campuses:', error);
    throw new Error(`Failed to upsert campuses: ${error.message}`);
  }

  console.log(`✅ Successfully upserted ${campuses.length} campuses`);
}

/**
 * Environment'tan kampüs listesini çekip Supabase'e kaydet
 */
export async function syncCampusesFromEnv(): Promise<void> {
  const kampusListesi = (process.env.NEXT_PUBLIC_KAMPUSLER || '')
    .split(',')
    .filter(Boolean)
    .map(k => k.trim());

  if (kampusListesi.length === 0) {
    console.warn('⚠️  No campuses found in environment variables');
    return;
  }

  // Her kampüse bir ID ata (simple incremental)
  const campuses: Campus[] = kampusListesi.map((name, index) => ({
    id: index + 1,
    name,
  }));

  await upsertCampuses(campuses);
}

/**
 * Tüm veriyi senkronize et (Kampüsler + Siparişler)
 */
export async function syncAllData(
  orders: ExternalOrder[],
  onProgress?: (step: string, current?: number, total?: number) => void
): Promise<void> {
  // 1. Kampüsleri sync et
  if (onProgress) onProgress('Kampüsler senkronize ediliyor...');
  await syncCampusesFromEnv();

  // 2. Siparişleri sync et
  if (onProgress) onProgress('Siparişler senkronize ediliyor...');
  await upsertOrdersToSupabase(orders, (current, total) => {
    if (onProgress) onProgress('Siparişler senkronize ediliyor...', current, total);
  });

  if (onProgress) onProgress('Tamamlandı!');
}
