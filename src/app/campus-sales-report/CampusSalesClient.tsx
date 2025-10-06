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

  // Excel export
  const exportToExcel = () => {
    const excelData = report.map((campus) => ({
      'Kampüs': campus.campus,

      'Bugün - Satış': campus.today.sales,
      'Bugün - İptal': campus.today.cancelled,
      'Bugün - İade': campus.today.refunded,
      'Bugün - Ciro': campus.today.revenue,

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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    ws['!cols'] = [
      { wch: 25 }, // Kampüs
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, // Bugün
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
                  <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                    Kampüs
                  </th>

                  {/* Bugün */}
                  <th colSpan={4} className="px-6 py-2 text-center text-xs font-medium text-blue-700 uppercase tracking-wider border-r border-gray-200 bg-blue-50">
                    Bugün
                  </th>

                  {/* Bu Hafta */}
                  <th colSpan={4} className="px-6 py-2 text-center text-xs font-medium text-green-700 uppercase tracking-wider border-r border-gray-200 bg-green-50">
                    Bu Hafta
                  </th>

                  {/* Bu Ay */}
                  <th colSpan={4} className="px-6 py-2 text-center text-xs font-medium text-purple-700 uppercase tracking-wider border-r border-gray-200 bg-purple-50">
                    Bu Ay
                  </th>

                  {/* Tüm Zamanlar */}
                  <th colSpan={4} className="px-6 py-2 text-center text-xs font-medium text-orange-700 uppercase tracking-wider bg-orange-50">
                    Tüm Zamanlar
                  </th>
                </tr>
                <tr>
                  {/* Bugün Alt Başlıklar */}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Satış</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">İptal</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">İade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-blue-50">Ciro</th>

                  {/* Bu Hafta Alt Başlıklar */}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Satış</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">İptal</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">İade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-green-50">Ciro</th>

                  {/* Bu Ay Alt Başlıklar */}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Satış</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">İptal</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">İade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200 bg-purple-50">Ciro</th>

                  {/* Tüm Zamanlar Alt Başlıklar */}
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">Satış</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">İptal</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">İade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">Ciro</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.map((campus, index) => (
                  <tr key={campus.campus} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                      {campus.campus}
                    </td>

                    {/* Bugün */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                      {formatNumber(campus.today.sales)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-red-600">
                      {formatNumber(campus.today.cancelled)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-orange-600">
                      {formatNumber(campus.today.refunded)}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold border-r border-gray-200">
                      {formatCurrency(campus.today.revenue)}
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
