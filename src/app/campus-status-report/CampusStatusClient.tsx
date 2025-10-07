'use client';

import { useMemo } from 'react';
import type { Order } from '@/types';
import * as XLSX from 'xlsx';
import { isSuccessfulOrder } from '@/utils/orderUtils';

interface CampusStatusClientProps {
  orders: Order[];
  campuses: string[];
}

interface CampusStatusData {
  campus: string;
  statusCounts: Record<string, number>;
  total: number;
}

export default function CampusStatusClient({ orders, campuses }: CampusStatusClientProps) {
  // Başarılı siparişleri filtrele
  const relevantOrders = useMemo(() => {
    return orders.filter(order => isSuccessfulOrder(order));
  }, [orders]);

  // Tüm benzersiz order_status'leri bul
  const allStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    relevantOrders.forEach(order => {
      if (order.order_status) {
        statusSet.add(order.order_status);
      }
    });
    return Array.from(statusSet).sort();
  }, [relevantOrders]);

  // Kampüs x Status pivot tablosu oluştur
  const campusStatusData = useMemo(() => {
    const data: CampusStatusData[] = campuses.map(campus => ({
      campus,
      statusCounts: {},
      total: 0,
    }));

    // Her kampüs için order_status dağılımını hesapla
    relevantOrders.forEach(order => {
      // Kampüsü olmayan siparişleri atla
      if (!order.campus) return;

      const status = order.order_status || 'Bilinmeyen';
      const campusData = data.find(d => d.campus === order.campus);

      if (campusData) {
        campusData.statusCounts[status] = (campusData.statusCounts[status] || 0) + 1;
        campusData.total++;
      }
    });

    return data;
  }, [campuses, relevantOrders]);

  // Toplam satırı (tüm kampüslerin toplamı)
  const totalRow = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    let total = 0;

    campusStatusData.forEach(campus => {
      Object.entries(campus.statusCounts).forEach(([status, count]) => {
        statusCounts[status] = (statusCounts[status] || 0) + count;
        total += count;
      });
    });

    return { campus: 'TOPLAM', statusCounts, total };
  }, [campusStatusData]);

  // Excel export
  const exportToExcel = () => {
    // Data satırlarını oluştur
    const excelData = campusStatusData.map(campus => {
      const row: any = { 'Kampüs': campus.campus };
      allStatuses.forEach(status => {
        row[status] = campus.statusCounts[status] || 0;
      });
      row['Toplam'] = campus.total;
      return row;
    });

    // Toplam satırını ekle
    const totalRowData: any = { 'Kampüs': 'TOPLAM' };
    allStatuses.forEach(status => {
      totalRowData[status] = totalRow.statusCounts[status] || 0;
    });
    totalRowData['Toplam'] = totalRow.total;
    excelData.push(totalRowData);

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    const cols = [
      { wch: 20 }, // Kampüs
    ];
    allStatuses.forEach(() => cols.push({ wch: 15 })); // Her status için
    cols.push({ wch: 12 }); // Toplam

    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kampüs Durum Raporu');
    XLSX.writeFile(wb, `kampus-durum-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kampüs Durum Raporu</h1>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📥</span>
          <span>Excel İndir</span>
        </button>
      </div>

      {/* Açıklama */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Bu rapor, başarılı siparişlerin kampüslere ve sipariş durumlarına göre dağılımını gösterir.
        </p>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Kampüs
                </th>
                {allStatuses.map(status => (
                  <th
                    key={status}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {status}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campusStatusData.map((campus, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    {campus.campus}
                  </td>
                  {allStatuses.map(status => (
                    <td key={status} className="px-6 py-4 text-sm text-gray-600 text-right">
                      {campus.statusCounts[status] || 0}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right bg-gray-50">
                    {campus.total}
                  </td>
                </tr>
              ))}
              {/* Toplam satırı */}
              <tr className="bg-blue-50 font-bold">
                <td className="px-6 py-4 text-sm text-blue-900 sticky left-0 bg-blue-50">
                  TOPLAM
                </td>
                {allStatuses.map(status => (
                  <td key={status} className="px-6 py-4 text-sm text-blue-900 text-right">
                    {totalRow.statusCounts[status] || 0}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-blue-900 text-right bg-blue-100">
                  {totalRow.total}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer bilgi */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Toplam {campuses.length} kampüs ve {allStatuses.length} sipariş durumu gösteriliyor
      </div>
    </div>
  );
}
