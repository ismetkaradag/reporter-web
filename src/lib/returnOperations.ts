// ===============================================
// İADE SİSTEMİ - SUPABASE OPERATIONS
// ===============================================
// API'den gelen iade verilerini Supabase'e kaydetme işlemleri

import { createClient } from '@supabase/supabase-js';
import type {
  ApiReturnRequest,
  ApiReturn,
  ReturnRequest,
  Return
} from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client (RLS bypass için)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ===============================================
// YARDIMCI FONKSİYONLAR
// ===============================================

/**
 * Tarih formatını normalize et
 * API'den gelen tarih ya ISO format (2025-10-28T16:02:54.59+03:00)
 * ya da TR format (DD.MM.YYYY HH:mm:ss) olabilir
 */
function convertDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }

  try {
    const trimmed = dateString.trim();

    // Eğer zaten ISO format ise (YYYY-MM-DD veya ISO 8601 formatı)
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
      // ISO formatını validate et
      const testDate = new Date(trimmed);
      if (!isNaN(testDate.getTime())) {
        // Timezone bilgisini temizle ve sadece tarih-saat kısmını al
        // 2025-10-28T16:02:54.59+03:00 -> 2025-10-28T16:02:54
        const isoString = trimmed.split('+')[0].split('.')[0];
        return isoString;
      }
    }

    // TR Format: DD.MM.YYYY HH:mm:ss veya DD.MM.YYYY
    const parts = trimmed.split(' ');

    if (parts.length === 0) {
      console.warn('Empty date parts:', dateString);
      return null;
    }

    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';

    // Tarih parçasını kontrol et
    if (!datePart || !datePart.includes('.')) {
      console.warn('Invalid date part:', dateString);
      return null;
    }

    const dateComponents = datePart.split('.');

    if (dateComponents.length !== 3) {
      console.warn('Invalid date format:', dateString);
      return null;
    }

    const [day, month, year] = dateComponents;

    // Validasyon
    if (!day || !month || !year) {
      console.warn('Missing date components:', dateString);
      return null;
    }

    // Numeric validation
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      console.warn('Non-numeric date components:', dateString);
      return null;
    }

    // Range validation
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      console.warn('Date out of range:', dateString);
      return null;
    }

    // ISO format: YYYY-MM-DDTHH:mm:ss
    const isoDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}T${timePart}`;

    // Final validation - try to parse
    const testDate = new Date(isoDate);
    if (isNaN(testDate.getTime())) {
      console.warn('Invalid ISO date created:', isoDate, 'from:', dateString);
      return null;
    }

    return isoDate;
  } catch (error) {
    console.error('Date conversion error:', dateString, error);
    return null;
  }
}

// ===============================================
// RETURN REQUESTS TRANSFORMATION
// ===============================================

/**
 * API return request'i DB formatına çevir
 */
export function transformApiReturnRequestToDb(
  apiRequest: ApiReturnRequest
): Omit<ReturnRequest, 'id' | 'synced_at' | 'updated_at'> {
  // return_action_id === 0 ise "Değişim" olarak kaydet
  const returnAction = apiRequest.returnActionId === 0
    ? 'Değişim'
    : apiRequest.returnAction;

  // Lines'ı snake_case'e çevir
  const transformedLines = apiRequest.lines.map(line => ({
    id: line.id,
    product_id: line.productId,
    product_name: line.productName,
    quantity: line.quantity,
    from_attr: line.fromAttr || '',
    replacement_product_name: line.replacementProductName || '',
    to_attr: line.toAttr || '',
    sku: line.sku || '',
    price: line.price || 0,
    product_price: line.productPrice || 0,
    request_line_combinations: line.requestLineCombinations?.map(combo => ({
      product_id: combo.productId,
      name: combo.name,
      combination_id: combo.combinationId,
      combination_sku: combo.combinationSku,
      combination_gtin: combo.combinationGtin,
      quantity: combo.quantity
    })) || []
  }));

  return {
    custom_number: apiRequest.customNumber,
    order_id: apiRequest.orderId || null,
    custom_order_number: apiRequest.customOrderNumber || null,
    customer_id: apiRequest.customerId || null,
    customer_info: apiRequest.customerInfo || null,
    return_reason: apiRequest.returnReason || null,
    return_reason_id: apiRequest.returnReasonId || null,
    return_action: returnAction,
    return_action_id: apiRequest.returnActionId,
    customer_comments: apiRequest.customerComments || null,
    staff_notes: apiRequest.staffNotes || null,
    return_request_status_id: apiRequest.returnRequestStatusId || null,
    return_request_status_str: apiRequest.returnRequestStatusStr || null,
    created_on: convertDateToISO(apiRequest.createdOn),
    return_code_expire_date: convertDateToISO(apiRequest.returnCodeExpireDate),
    return_approval_date: convertDateToISO(apiRequest.returnApprovalDate),
    return_warehouse_approval_date: convertDateToISO(apiRequest.returnWarehouseApprovalDate),
    return_created_on: convertDateToISO(apiRequest.returnCreatedOn),
    return_created_on_date: convertDateToISO(apiRequest.returnCreatedOnDate),
    return_id: apiRequest.returnId || null,
    return_custom_number: apiRequest.returnCustomNumber || null,
    lines: transformedLines,
    from_id: apiRequest.id
  };
}

/**
 * Return requests'i Supabase'e upsert et (batch)
 */
export async function upsertReturnRequestsToSupabase(
  returnRequests: ApiReturnRequest[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const transformedRequests = returnRequests.map(transformApiReturnRequestToDb);

    const { data, error } = await supabaseAdmin
      .from('return_requests')
      .upsert(transformedRequests, {
        onConflict: 'custom_number',
        ignoreDuplicates: false
      })
      .select('id');

    if (error) {
      console.error('Upsert return requests error:', error);
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }

    return {
      success: true,
      count: data?.length || 0
    };
  } catch (error: any) {
    console.error('Upsert return requests exception:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

// ===============================================
// RETURNS TRANSFORMATION
// ===============================================

/**
 * API return'ü DB formatına çevir
 */
export function transformApiReturnToDb(
  apiReturn: ApiReturn
): Omit<Return, 'id' | 'synced_at' | 'updated_at'> {
  // return_action_id === 0 ise "Değişim" olarak kaydet
  const returnAction = apiReturn.returnActionId === 0
    ? 'Değişim'
    : apiReturn.returnAction;

  // Items'ı snake_case'e çevir
  const transformedItems = apiReturn.items?.map(item => ({
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    sku: item.sku || '',
    product_price: item.productPrice || 0,
    sub_total_incl_tax_value: item.subTotalInclTaxValue || 0
  })) || [];

  // Debug: Tarih dönüşümlerini logla
  const paidDate = convertDateToISO(apiReturn.paidDateUtc);
  const createdDate = convertDateToISO(apiReturn.createdOn);

  if (apiReturn.paidDateUtc && !paidDate) {
    console.warn('Failed to convert paid_date_utc:', apiReturn.paidDateUtc, 'for return:', apiReturn.customReturnNumber);
  }

  if (apiReturn.createdOn && !createdDate) {
    console.warn('Failed to convert created_on:', apiReturn.createdOn, 'for return:', apiReturn.customReturnNumber);
  }

  return {
    custom_return_number: apiReturn.customReturnNumber,
    custom_order_number: apiReturn.customOrderNumber,
    order_id: apiReturn.orderId,
    return_reason: apiReturn.returnReason || null,
    return_reason_id: apiReturn.returnReasonId || null,
    return_action: returnAction,
    return_action_id: apiReturn.returnActionId,
    return_payment_status: apiReturn.returnPaymentStatus,
    return_payment_status_id: apiReturn.returnPaymentStatusId,
    bank_account_number: apiReturn.bankAccountNumber || null,
    order_shipping_incl_tax_value: apiReturn.orderShippingInclTaxValue || null,
    payment_method_additional_fee_incl_tax_value: apiReturn.paymentMethodAdditionalFeeInclTaxValue || null,
    customer_id: apiReturn.customerId || null,
    customer_full_name: apiReturn.customerFullName || null,
    customer_identity_number: apiReturn.customerIdentityNumber || null,
    return_request_id: apiReturn.returnRequestId || null,
    return_request_custom_number: apiReturn.returnRequestCustomNumber || null,
    paid_date_utc: paidDate,
    items: transformedItems,
    created_on: createdDate,
    add_return_note_display_to_customer: apiReturn.addReturnNoteDisplayToCustomer || null,
    add_return_note_message: apiReturn.addReturnNoteMessage || null,
    can_mark_return_as_paid: apiReturn.canMarkReturnAsPaid || null,
    from_id: apiReturn.id
  };
}

/**
 * Returns'leri Supabase'e upsert et (batch)
 */
export async function upsertReturnsToSupabase(
  returns: ApiReturn[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const transformedReturns = returns.map(transformApiReturnToDb);

    const { data, error } = await supabaseAdmin
      .from('returns')
      .upsert(transformedReturns, {
        onConflict: 'custom_return_number',
        ignoreDuplicates: false
      })
      .select('id');

    if (error) {
      console.error('Upsert returns error:', error);
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }

    return {
      success: true,
      count: data?.length || 0
    };
  } catch (error: any) {
    console.error('Upsert returns exception:', error);
    return {
      success: false,
      count: 0,
      error: error.message
    };
  }
}

// ===============================================
// SYNC ORCHESTRATION
// ===============================================

/**
 * Return requests ve returns'leri API'den çekip Supabase'e kaydet
 */
export async function syncReturnData(
  syncType: 'return_requests' | 'returns',
  fetchAllFunction: () => Promise<any[]>
): Promise<{ success: boolean; totalSynced: number; message: string }> {
  try {
    console.log(`Starting ${syncType} sync...`);

    // API'den tüm veriyi çek
    const allData = await fetchAllFunction();

    if (allData.length === 0) {
      return {
        success: true,
        totalSynced: 0,
        message: `No ${syncType} found to sync`
      };
    }

    // Supabase'e kaydet
    let upsertResult;
    if (syncType === 'return_requests') {
      upsertResult = await upsertReturnRequestsToSupabase(allData);
    } else {
      upsertResult = await upsertReturnsToSupabase(allData);
    }

    if (!upsertResult.success) {
      throw new Error(upsertResult.error || 'Upsert failed');
    }

    console.log(`${syncType} sync completed: ${upsertResult.count} records`);

    return {
      success: true,
      totalSynced: upsertResult.count,
      message: `Successfully synced ${upsertResult.count} ${syncType}`
    };
  } catch (error: any) {
    console.error(`${syncType} sync error:`, error);
    return {
      success: false,
      totalSynced: 0,
      message: error.message || 'Unknown error'
    };
  }
}
