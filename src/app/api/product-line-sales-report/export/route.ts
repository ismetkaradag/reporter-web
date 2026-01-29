import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  buildProductLineRows,
  filterProductLineRows,
  getProductLineReportSourceData,
} from '@/lib/productLineSalesReport';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const campusesParam = (searchParams.get('campuses') || '').trim();
    const campuses = campusesParam
      ? campusesParam.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const { orders, customers, reportGroups, products } = await getProductLineReportSourceData();
    const allRows = buildProductLineRows(orders, customers, reportGroups, products);
    const filteredRows = filterProductLineRows(allRows, search, campuses);

    const excelData = filteredRows.map((row) => ({
      'Sipariş No': row.customOrderNumber,
      'Sipariş Tipi': row.customOrderNumber.startsWith('RT') ? 'Değişim' : 'Satış',
      'Üye Ad': row.customerFirstName,
      'Üye Soyad': row.customerLastName,
      'E-posta': row.customerEmail,
      'Telefon': row.customerPhone,
      'TC Kimlik': row.customerIdentityNumber,
      'Sınıf': row.studentClassName,
      'Üyelik': row.membershipName,
      'Kampüs': row.campusName,
      'Ürün SKU': row.itemSku,
      'Ürün Adı': row.itemProductName,
      'Özellik': row.itemAttributeInfo,
      'Ürün Tipi': row.itemType,
      'Gruplar': row.reportGroups,
      'Adet': row.itemQuantity,
      'Birim Fiyat': row.itemUnitPriceInclTax,
      'Ürün İndirimi': row.itemDiscountInclTax,
      'İndirimli Birim Fiyat': row.itemUnitPriceInclTax - row.itemDiscountInclTax,
      'Toplam Fiyat': row.itemTotalPriceInclTax,
      'Kampanya': row.itemCampaignName,
      'Sipariş Durumu': row.orderStatus,
      'Ödeme Durumu': row.paymentStatus,
      'Ödeme Yöntemi': row.paymentMethod,
      'Ödeme Sistemi': row.paymentSystem,
      'Taksit': row.installment,
      'Sipariş Toplamı(Kargo ve Vade Farkı Dahil)': row.orderTotal,
      'Ürün İndirimleri Toplamı': row.totalItemDiscountAmount,
      'Sipariş İndirimi': row.orderSubTotalDiscountInclTax,
      'Ödeme Ek Ücreti': row.paymentMethodAdditionalFeeInclTax,
      'Kargo Ücreti': row.cargo_fee,
      'Sipariş Tarihi': row.created_on ? new Date(row.created_on).toLocaleDateString('tr-TR') : '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünlü Satış Raporu');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const body = new Uint8Array(buffer);
    const fileName = `urunlu-satis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Product line sales export error:', error);
    return NextResponse.json(
      { error: error.message || 'Excel oluşturulamadı' },
      { status: 500 }
    );
  }
}
