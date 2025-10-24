'use client';

import { useMemo } from 'react';
import type { Order } from '@/types';
import { generateCampusSalesReport } from '@/utils/campusReportUtils';
import { formatCurrency, formatNumber } from '@/utils/formatUtils';
import * as XLSX from 'xlsx';

interface CampusSalesClientProps {
  orders: Order[];
}

export default function CampusSalesClient({ orders }: CampusSalesClientProps) {
  const report = useMemo(() => generateCampusSalesReport(orders), [orders]);

  // Alt toplam hesapla
  const totals = useMemo(() => {
    return report.reduce(
      (acc, campus) => ({
        yesterday: {
          sales: acc.yesterday.sales + campus.yesterday.sales,
          cancelled: acc.yesterday.cancelled + campus.yesterday.cancelled,
          refunded: acc.yesterday.refunded + campus.yesterday.refunded,
          revenue: acc.yesterday.revenue + campus.yesterday.revenue,
        },
        week: {
          sales: acc.week.sales + campus.week.sales,
          cancelled: acc.week.cancelled + campus.week.cancelled,
          refunded: acc.week.refunded + campus.week.refunded,
          revenue: acc.week.revenue + campus.week.revenue,
        },
        month: {
          sales: acc.month.sales + campus.month.sales,
          cancelled: acc.month.cancelled + campus.month.cancelled,
          refunded: acc.month.refunded + campus.month.refunded,
          revenue: acc.month.revenue + campus.month.revenue,
        },
        allTime: {
          sales: acc.allTime.sales + campus.allTime.sales,
          cancelled: acc.allTime.cancelled + campus.allTime.cancelled,
          refunded: acc.allTime.refunded + campus.allTime.refunded,
          revenue: acc.allTime.revenue + campus.allTime.revenue,
        },
      }),
      {
        yesterday: { sales: 0, cancelled: 0, refunded: 0, revenue: 0 },
        week: { sales: 0, cancelled: 0, refunded: 0, revenue: 0 },
        month: { sales: 0, cancelled: 0, refunded: 0, revenue: 0 },
        allTime: { sales: 0, cancelled: 0, refunded: 0, revenue: 0 },
      }
    );
  }, [report]);

  // Excel export
  const exportToExcel = () => {
    const excelData = report.map((campus) => ({
      'Kampüs': campus.campus,

      'Dün - Satış': campus.yesterday.sales,
      'Dün - İptal': campus.yesterday.cancelled,
      'Dün - İade': campus.yesterday.refunded,
      'Dün - Ciro': campus.yesterday.revenue,

      'Bu Hafta - Satış': campus.week.sales,
      'Bu Hafta - İptal': campus.week.cancelled,
      'Bu Hafta - İade': campus.week.refunded,
      'Bu Hafta - Ciro': campus.week.revenue,

      'Bu Ay - Satış': campus.month.sales,
      'Bu Ay - İptal': campus.month.cancelled,
      'Bu Ay - İade': campus.month.refunded,
      'Bu Ay - Ciro': campus.month.revenue,

      'Tüm Zamanlar - Satış': campus.allTime.sales,
      'Tüm Zamanlar - İptal': campus.allTime.cancelled,
      'Tüm Zamanlar - İade': campus.allTime.refunded,
      'Tüm Zamanlar - Ciro': campus.allTime.revenue,
    }));

    // Alt toplam satırı ekle
    excelData.push({
      'Kampüs': 'TOPLAM',
      'Dün - Satış': totals.yesterday.sales,
      'Dün - İptal': totals.yesterday.cancelled,
      'Dün - İade': totals.yesterday.refunded,
      'Dün - Ciro': totals.yesterday.revenue,
      'Bu Hafta - Satış': totals.week.sales,
      'Bu Hafta - İptal': totals.week.cancelled,
      'Bu Hafta - İade': totals.week.refunded,
      'Bu Hafta - Ciro': totals.week.revenue,
      'Bu Ay - Satış': totals.month.sales,
      'Bu Ay - İptal': totals.month.cancelled,
      'Bu Ay - İade': totals.month.refunded,
      'Bu Ay - Ciro': totals.month.revenue,
      'Tüm Zamanlar - Satış': totals.allTime.sales,
      'Tüm Zamanlar - İptal': totals.allTime.cancelled,
      'Tüm Zamanlar - İade': totals.allTime.refunded,
      'Tüm Zamanlar - Ciro': totals.allTime.revenue,
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    ws['!cols'] = [
      { wch: 25 }, // Kampüs
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, // Dün
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, // Bu Hafta
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, // Bu Ay
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, // Tüm Zamanlar
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Kampüs Satış Raporu');

    const fileName = `kampus_satis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <h1 className="text-3xl font-bold text-gray-900">Kampüs Bazlı Satış Raporu</h1>
          <p className="text-gray-600 mt-1">
            Kampüslere göre detaylı satış analizi
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Excel Export */}
        <div className="mb-4">
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>📥</span>
            <span>Excel İndir</span>
          </button>
        </div>

        {/* Rapor Tablosu */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th rowSpan={2} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Kampüs
                  </th>

                  {/* Dün */}
                  <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-gray-200 bg-blue-50">
                    Dün
                  </th>

                  {/* Bu Hafta */}
                  <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-green-700 uppercase tracking-wider border-r border-gray-200 bg-green-50">
                    Bu Hafta
                  </th>

                  {/* Bu Ay */}
                  <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-purple-700 uppercase tracking-wider border-r border-gray-200 bg-purple-50">
                    Bu Ay
                  </th>

                  {/* Tüm Zamanlar */}
                  <th colSpan={4} className="px-3 py-2 text-center text-xs font-medium text-orange-700 uppercase tracking-wider bg-orange-50">
                    Tüm Zamanlar
                  </th>
                </tr>
                <tr>
                  {/* Dün Alt Başlıklar */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Satış</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">İptal</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">İade</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-blue-50">Ciro</th>

                  {/* Bu Hafta Alt Başlıklar */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Satış</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">İptal</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">İade</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-green-50">Ciro</th>

                  {/* Bu Ay Alt Başlıklar */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Satış</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">İptal</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">İade</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-purple-50">Ciro</th>

                  {/* Tüm Zamanlar Alt Başlıklar */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">Satış</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">İptal</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">İade</th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">Ciro</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.map((campus, index) => (
                  <tr key={campus.campus} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {campus.campus}
                    </td>

                    {/* Dün */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                      {formatNumber(campus.yesterday.sales)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {formatNumber(campus.yesterday.cancelled)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                      {formatNumber(campus.yesterday.refunded)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold border-r border-gray-200">
                      {formatCurrency(campus.yesterday.revenue)}
                    </td>

                    {/* Bu Hafta */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                      {formatNumber(campus.week.sales)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {formatNumber(campus.week.cancelled)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                      {formatNumber(campus.week.refunded)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold border-r border-gray-200">
                      {formatCurrency(campus.week.revenue)}
                    </td>

                    {/* Bu Ay */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                      {formatNumber(campus.month.sales)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {formatNumber(campus.month.cancelled)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                      {formatNumber(campus.month.refunded)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold border-r border-gray-200">
                      {formatCurrency(campus.month.revenue)}
                    </td>

                    {/* Tüm Zamanlar */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                      {formatNumber(campus.allTime.sales)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {formatNumber(campus.allTime.cancelled)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                      {formatNumber(campus.allTime.refunded)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold">
                      {formatCurrency(campus.allTime.revenue)}
                    </td>
                  </tr>
                ))}

                {/* Alt Toplam Satırı */}
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200">
                    TOPLAM
                  </td>

                  {/* Dün Toplamları */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-700 font-bold">
                    {formatNumber(totals.yesterday.sales)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-700 font-bold">
                    {formatNumber(totals.yesterday.cancelled)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-700 font-bold">
                    {formatNumber(totals.yesterday.refunded)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold border-r border-gray-200">
                    {formatCurrency(totals.yesterday.revenue)}
                  </td>

                  {/* Bu Hafta Toplamları */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-700 font-bold">
                    {formatNumber(totals.week.sales)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-700 font-bold">
                    {formatNumber(totals.week.cancelled)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-700 font-bold">
                    {formatNumber(totals.week.refunded)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold border-r border-gray-200">
                    {formatCurrency(totals.week.revenue)}
                  </td>

                  {/* Bu Ay Toplamları */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-700 font-bold">
                    {formatNumber(totals.month.sales)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-700 font-bold">
                    {formatNumber(totals.month.cancelled)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-700 font-bold">
                    {formatNumber(totals.month.refunded)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold border-r border-gray-200">
                    {formatCurrency(totals.month.revenue)}
                  </td>

                  {/* Tüm Zamanlar Toplamları */}
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-700 font-bold">
                    {formatNumber(totals.allTime.sales)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-700 font-bold">
                    {formatNumber(totals.allTime.cancelled)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-700 font-bold">
                    {formatNumber(totals.allTime.refunded)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-bold">
                    {formatCurrency(totals.allTime.revenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
