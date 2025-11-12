// ===============================================
// İADE TALEPLERİ VE İADELER EXCEL EXPORT
// ===============================================

import * as XLSX from 'xlsx';
import type { ReturnRequestWithRefund, ReturnWithAmount, Order } from '@/types';
import { formatCurrency } from './returnAmountCalculator';

interface ExcelRow {
  'İade Talep No': string;
  'Sipariş No': string;
  'Müşteri': string;
  'İade Nedeni': string;
  'İade Aksiyonu': string;
  'Durum': string;
  'İade Tutarı (₺)': string;
  'Hata': string;
  'Sipariş Toplamı (₺)': string;
  'Sipariş Ürün Sayısı': number;
  'İade Ürün Sayısı': number;
  'Tam İade': string;
  'Müşteri Yorumu': string;
  'Personel Notu': string;
  'İade No': string;
  'Toplam Ürün Adedi': number;
  'Vade Farkı (₺)': string;
  'Talep Tarihi': string;
  'Onay Tarihi': string;
}

interface SummaryRow {
  'Sayfa Adı': string;
  'Kayıt Sayısı': number;
  'Tip': string;
  'Toplam İade Tutarı': string;
}

interface ReturnExcelRow {
  'İade No': string;
  'Sipariş No': string;
  'Müşteri': string;
  'İade Aksiyonu': string;
  'Ödeme Durumu': string;
  'İade Tutarı (₺)': string;
  'Vade Farkı (₺)': string;
  'Oluşturma Tarihi': string;
  'Ödeme Tarihi': string;
}

/**
 * Tarih formatla
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '-';
  }
}

/**
 * Excel için tutar formatla (Türkçe)
 */
function formatAmountForExcel(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * İade taleplerini ve iadeleri Excel'e çevir
 */
export function exportReturnRequestsToExcel(
  requests: ReturnRequestWithRefund[],
  returns: ReturnWithAmount[],
  ordersMap: Map<string, Order>
): void {
  const workbook = XLSX.utils.book_new();

  // İade Talepleri: Action + Status kombinasyonlarını bul
  const requestCombinations = new Map<string, ReturnRequestWithRefund[]>();

  requests.forEach(request => {
    const action = request.return_action || 'Bilinmiyor';
    const status = request.return_request_status_str || 'Bilinmiyor';
    const key = `İT-${action}-${status}`; // İT = İade Talebi

    if (!requestCombinations.has(key)) {
      requestCombinations.set(key, []);
    }
    requestCombinations.get(key)!.push(request);
  });

  // İadeler: Action + Status kombinasyonlarını bul
  const returnCombinations = new Map<string, ReturnWithAmount[]>();

  returns.forEach(returnItem => {
    const action = returnItem.return_action || 'Bilinmiyor';
    const status = returnItem.return_payment_status || 'Bilinmiyor';
    const key = `İD-${action}-${status}`; // İD = İade

    if (!returnCombinations.has(key)) {
      returnCombinations.set(key, []);
    }
    returnCombinations.get(key)!.push(returnItem);
  });

  // Özet sayfası oluştur
  const summaryRows: SummaryRow[] = [];

  // İade Talepleri özeti
  Array.from(requestCombinations.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, items]) => {
      const totalAmount = items
        .filter(r => !r.has_error)
        .reduce((sum, r) => sum + (r.refund_amount || 0), 0);

      summaryRows.push({
        'Sayfa Adı': key,
        'Kayıt Sayısı': items.length,
        'Tip': 'İade Talebi',
        'Toplam İade Tutarı': formatAmountForExcel(totalAmount)
      });
    });

  // İadeler özeti
  Array.from(returnCombinations.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, items]) => {
      const totalAmount = items.reduce((sum, r) => sum + (r.return_amount || 0), 0);

      summaryRows.push({
        'Sayfa Adı': key,
        'Kayıt Sayısı': items.length,
        'Tip': 'İade',
        'Toplam İade Tutarı': formatAmountForExcel(totalAmount)
      });
    });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

  // İade Talepleri: Her kombinasyon için ayrı sayfa
  Array.from(requestCombinations.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, items]) => {
      const rows: ExcelRow[] = items.map(request => {
        const order = ordersMap.get(request.custom_order_number || '');
        const lines = Array.isArray(request.lines) ? request.lines : [];

        // Sipariş ürün sayısı
        const orderTotalItems = order?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

        // İade ürün sayısı (to_attr boş olanlar)
        const requestTotalItems = lines
          .filter((line: any) => {
            if (request.return_action !== 'Ödeme İadesi' &&
                request.return_action !== 'Para Puan' &&
                line.to_attr && line.to_attr.trim() !== '') {
              return false;
            }
            return true;
          })
          .reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);

        // Tam iade mi?
        const isFullRefund = orderTotalItems > 0 && orderTotalItems === requestTotalItems;

        // Toplam ürün adedi (tüm lines)
        const totalProductCount = lines.reduce((sum: number, line: any) => sum + (line.quantity || 0), 0);

        return {
          'İade Talep No': request.custom_number || '',
          'Sipariş No': request.custom_order_number || '',
          'Müşteri': request.customer_info || '',
          'İade Nedeni': request.return_reason || '',
          'İade Aksiyonu': request.return_action || '',
          'Durum': request.return_request_status_str || '',
          'İade Tutarı (₺)': request.has_error ? 'HATA' : formatAmountForExcel(request.refund_amount || 0),
          'Hata': request.has_error ? (request.error_message || 'Bilinmeyen hata') : '',
          'Sipariş Toplamı (₺)': order ? formatAmountForExcel(order.order_total) : '',
          'Sipariş Ürün Sayısı': orderTotalItems,
          'İade Ürün Sayısı': requestTotalItems,
          'Tam İade': isFullRefund ? 'Evet' : 'Hayır',
          'Müşteri Yorumu': request.customer_comments || '',
          'Personel Notu': request.staff_notes || '',
          'İade No': request.return_custom_number || '',
          'Toplam Ürün Adedi': totalProductCount,
          'Vade Farkı (₺)': order ? formatAmountForExcel(order.payment_method_additional_fee_incl_tax || 0) : '',
          'Talep Tarihi': formatDate(request.created_on),
          'Onay Tarihi': formatDate(request.return_approval_date)
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Sütun genişlikleri
      worksheet['!cols'] = [
        { wch: 15 }, // İade Talep No
        { wch: 20 }, // Sipariş No
        { wch: 25 }, // Müşteri
        { wch: 30 }, // İade Nedeni
        { wch: 15 }, // İade Aksiyonu
        { wch: 15 }, // Durum
        { wch: 15 }, // İade Tutarı
        { wch: 30 }, // Hata
        { wch: 15 }, // Sipariş Toplamı
        { wch: 12 }, // Sipariş Ürün Sayısı
        { wch: 12 }, // İade Ürün Sayısı
        { wch: 10 }, // Tam İade
        { wch: 40 }, // Müşteri Yorumu
        { wch: 40 }, // Personel Notu
        { wch: 15 }, // İade No
        { wch: 12 }, // Toplam Ürün Adedi
        { wch: 12 }, // Vade Farkı
        { wch: 18 }, // Talep Tarihi
        { wch: 18 }, // Onay Tarihi
      ];

      // Sayfa adını düzenle (Excel sayfa adı max 31 karakter)
      const sheetName = key.length > 31 ? key.substring(0, 31) : key;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

  // İadeler: Her kombinasyon için ayrı sayfa
  Array.from(returnCombinations.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([key, items]) => {
      const rows: ReturnExcelRow[] = items.map(returnItem => {
        const order = ordersMap.get(returnItem.custom_order_number || '');

        // Müşteri bilgisi: full_name + identity_number
        const customerInfo = [
          returnItem.customer_full_name || '',
          returnItem.customer_identity_number || ''
        ].filter(Boolean).join(' - ');

        // İade tutarını hesapla: items[i].subTotalInclTaxValue toplamı
        // subTotalInclTaxValue zaten quantity ile çarpılmış toplam tutar
        let returnAmount = 0;
        if (returnItem.items && Array.isArray(returnItem.items) && returnItem.items.length > 0) {
          returnAmount = returnItem.items.reduce((sum: number, item: any) => {
            console.log('İade item:', item);
            return sum + (item.sub_total_incl_tax_value || 0);
          }, 0);
        }

        return {
          'İade No': returnItem.custom_return_number || '',
          'Sipariş No': returnItem.custom_order_number || '',
          'Müşteri': customerInfo,
          'İade Aksiyonu': returnItem.return_action || '',
          'Ödeme Durumu': returnItem.return_payment_status || '',
          'İade Tutarı (₺)': formatAmountForExcel(returnAmount),
          'Vade Farkı (₺)': order ? formatAmountForExcel(order.payment_method_additional_fee_incl_tax || 0) : '',
          'Oluşturma Tarihi': formatDate(returnItem.created_on),
          'Ödeme Tarihi': formatDate(returnItem.paid_date_utc)
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);

      // Sütun genişlikleri
      worksheet['!cols'] = [
        { wch: 15 }, // İade No
        { wch: 20 }, // Sipariş No
        { wch: 35 }, // Müşteri (full_name + identity_number)
        { wch: 15 }, // İade Aksiyonu
        { wch: 15 }, // Ödeme Durumu
        { wch: 15 }, // İade Tutarı
        { wch: 12 }, // Vade Farkı
        { wch: 18 }, // Oluşturma Tarihi
        { wch: 18 }, // Ödeme Tarihi
      ];

      // Sayfa adını düzenle (Excel sayfa adı max 31 karakter)
      const sheetName = key.length > 31 ? key.substring(0, 31) : key;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

  // Dosyayı indir
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `iade-raporu-detayli-${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Basit iade talepleri Excel export (tek sayfa)
 */
export function exportSimpleReturnRequestsToExcel(
  requests: ReturnRequestWithRefund[]
): void {
  const rows = requests.map(request => ({
    'İade Talep No': request.custom_number || '',
    'Sipariş No': request.custom_order_number || '',
    'Müşteri': request.customer_info || '',
    'İade Aksiyonu': request.return_action || '',
    'Durum': request.return_request_status_str || '',
    'İade Tutarı (₺)': request.has_error ? 'HATA' : formatAmountForExcel(request.refund_amount || 0),
    'Hata': request.has_error ? (request.error_message || 'Bilinmeyen hata') : '',
    'Tarih': formatDate(request.created_on)
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'İade Talepleri');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `iade-talepleri-${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * İade taleplerini satır bazlı Excel export (Her line ayrı satır)
 */
export function exportReturnRequestsLineByLine(
  requests: ReturnRequestWithRefund[]
): void {
  interface LineRow {
    'İade Talep No': string;
    'Durum': string;
    'İade Aksiyonu': string;
    'Sipariş No': string;
    'SKU': string;
    'Miktar': number;
    'Ürün Adı': string;
    'From Attr': string;
    'Replacement Ürün': string;
    'To Attr': string;
  }

  const rows: LineRow[] = [];

  requests.forEach(request => {
    const lines = Array.isArray(request.lines) ? request.lines : [];

    // Her line için satır(lar) oluştur
    lines.forEach((line: any) => {
      // Eğer request_line_combinations doluysa, her combination için ayrı satır
      if (line.request_line_combinations &&
          Array.isArray(line.request_line_combinations) &&
          line.request_line_combinations.length > 0) {

        line.request_line_combinations.forEach((combination: any) => {
          rows.push({
            'İade Talep No': request.custom_number || '',
            'Durum': request.return_request_status_str || '',
            'İade Aksiyonu': request.return_action || '',
            'Sipariş No': request.custom_order_number || '',
            'SKU': combination.combination_sku || '',
            'Miktar': combination.quantity || 0,
            'Ürün Adı': `${line.product_name}:${combination.name}`,
            'From Attr': line.from_attr || '',
            'Replacement Ürün': line.replacement_product_name || '',
            'To Attr': line.to_attr || ''
          });
        });
      } else {
        // Normal line (combination yok)
        rows.push({
          'İade Talep No': request.custom_number || '',
          'Durum': request.return_request_status_str || '',
          'İade Aksiyonu': request.return_action || '',
          'Sipariş No': request.custom_order_number || '',
          'SKU': line.sku || '',
          'Miktar': line.quantity || 0,
          'Ürün Adı': line.product_name || '',
          'From Attr': line.from_attr || '',
          'Replacement Ürün': line.replacement_product_name || '',
          'To Attr': line.to_attr || ''
        });
      }
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Sütun genişlikleri
  worksheet['!cols'] = [
    { wch: 15 }, // İade Talep No
    { wch: 20 }, // Durum
    { wch: 15 }, // İade Aksiyonu
    { wch: 20 }, // Sipariş No
    { wch: 20 }, // SKU
    { wch: 8 },  // Miktar
    { wch: 60 }, // Ürün Adı (artırıldı: product_name:combination.name formatı için)
    { wch: 25 }, // From Attr
    { wch: 40 }, // Replacement Ürün
    { wch: 25 }, // To Attr
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'İade Talepleri - Satır Bazlı');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `iade-talepleri-satir-bazli-${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
