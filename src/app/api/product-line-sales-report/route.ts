import { NextResponse } from 'next/server';
import {
  buildProductLineRows,
  extractCampuses,
  filterProductLineRows,
  getProductLineReportSourceData,
} from '@/lib/productLineSalesReport';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '200', 10));
    const search = (searchParams.get('search') || '').trim();
    const campusesParam = (searchParams.get('campuses') || '').trim();
    const campuses = campusesParam
      ? campusesParam.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

    const { orders, customers, reportGroups, products } = await getProductLineReportSourceData();

    const campusesList = extractCampuses(customers);
    const allRows = buildProductLineRows(orders, customers, reportGroups, products);
    const filteredRows = filterProductLineRows(allRows, search, campuses);

    const totalRows = filteredRows.length;
    const totalQuantity = filteredRows.reduce((sum, row) => sum + row.itemQuantity, 0);
    const totalAmount = filteredRows.reduce((sum, row) => sum + row.itemUnitPriceInclTax, 0);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    const startIndex = (page - 1) * pageSize;
    const rows = filteredRows.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      rows,
      page,
      pageSize,
      totalRows,
      totalPages,
      totals: {
        totalQuantity,
        totalAmount,
      },
      campuses: campusesList,
    });
  } catch (error: any) {
    console.error('Product line sales report error:', error);
    return NextResponse.json(
      { error: error.message || 'Rapor verisi alınamadı' },
      { status: 500 }
    );
  }
}
