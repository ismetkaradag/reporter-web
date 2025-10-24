'use client';

import { useState, useMemo } from 'react';
import type { Order } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/formatUtils';
import { calculateNetRevenue } from '@/utils/orderUtils';
import * as XLSX from 'xlsx';

interface DiscountReportClientProps {
  orders: Order[];
}

interface UserDiscountReport {
  customerId: number;
  customerInfo: string;
  email: string | null;
  campus: string | null;
  orderCount: number;
  totalDiscount: number;
  totalRevenue: number;
  discountRate: number;
}

interface CampusDiscountReport {
  campus: string;
  orderCount: number;
  customerCount: number;
  totalDiscount: number;
  totalRevenue: number;
  discountRate: number;
}

type ReportMode = 'user' | 'campus';

export default function DiscountReportClient({ orders }: DiscountReportClientProps) {
  const [mode, setMode] = useState<ReportMode>('user');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const itemsPerPage = 20;

  // İndirim tutarını hesapla
  const calculateDiscount = (order: Order): number => {
    const orderDiscount = order.order_sub_total_discount_incl_tax || 0;
    const itemDiscount = order.total_item_discount_amount || 0;
    return orderDiscount + itemDiscount;
  };

  // Kullanıcı bazlı rapor
  const userReport = useMemo((): UserDiscountReport[] => {
    const userMap = new Map<number, UserDiscountReport>();

    orders.forEach(order => {
      if (!order.customer_id) return;

      const discount = calculateDiscount(order);
      if (discount === 0) return; // İndirimi olmayan siparişleri atla

      const revenue = calculateNetRevenue(order);

      if (!userMap.has(order.customer_id)) {
        userMap.set(order.customer_id, {
          customerId: order.customer_id,
          customerInfo: order.customer_info || 'Bilinmeyen',
          email: order.customer_email || null,
          campus: order.campus || 'Bilinmeyen',
          orderCount: 0,
          totalDiscount: 0,
          totalRevenue: 0,
          discountRate: 0,
        });
      }

      const report = userMap.get(order.customer_id)!;
      report.orderCount++;
      report.totalDiscount += discount;
      report.totalRevenue += revenue;
    });

    // İndirim oranını hesapla
    const result = Array.from(userMap.values());
    result.forEach(report => {
      const totalBeforeDiscount = report.totalRevenue + report.totalDiscount;
      report.discountRate = totalBeforeDiscount > 0 ? (report.totalDiscount / totalBeforeDiscount) * 100 : 0;
    });

    return result.sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [orders]);

  // Kampüs bazlı rapor
  const campusReport = useMemo((): CampusDiscountReport[] => {
    const campusMap = new Map<string, { totalDiscount: number; totalRevenue: number; orderCount: number; customerSet: Set<number> }>();

    orders.forEach(order => {
      const campus = order.campus || 'Bilinmeyen';
      const discount = calculateDiscount(order);
      if (discount === 0) return; // İndirimi olmayan siparişleri atla

      const revenue = calculateNetRevenue(order);

      if (!campusMap.has(campus)) {
        campusMap.set(campus, {
          totalDiscount: 0,
          totalRevenue: 0,
          orderCount: 0,
          customerSet: new Set(),
        });
      }

      const data = campusMap.get(campus)!;
      data.totalDiscount += discount;
      data.totalRevenue += revenue;
      data.orderCount++;
      if (order.customer_id) {
        data.customerSet.add(order.customer_id);
      }
    });

    const result: CampusDiscountReport[] = [];
    campusMap.forEach((data, campus) => {
      const totalBeforeDiscount = data.totalRevenue + data.totalDiscount;
      const discountRate = totalBeforeDiscount > 0 ? (data.totalDiscount / totalBeforeDiscount) * 100 : 0;

      result.push({
        campus,
        orderCount: data.orderCount,
        customerCount: data.customerSet.size,
        totalDiscount: data.totalDiscount,
        totalRevenue: data.totalRevenue,
        discountRate,
      });
    });

    return result.sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [orders]);

  // Pagination
  const currentData = useMemo(() => {
    const data = mode === 'user' ? userReport : campusReport;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [mode, userReport, campusReport, currentPage]);

  const totalPages = useMemo(() => {
    const data = mode === 'user' ? userReport : campusReport;
    return Math.ceil(data.length / itemsPerPage);
  }, [mode, userReport, campusReport]);

  // Kullanıcının siparişlerini getir
  const getUserOrders = (customerId: number) => {
    return orders.filter(order => {
      if (order.customer_id !== customerId) return false;
      const discount = calculateDiscount(order);
      return discount > 0; // Sadece indirimi olan siparişler
    });
  };

  // Excel export
  const exportToExcel = () => {
    if (mode === 'user') {
      const excelData = userReport.map((row) => ({
        'Kullanıcı Adı': row.customerInfo,
        'Email': row.email || '-',
        'Kampüs': row.campus || '-',
        'Sipariş Sayısı': row.orderCount,
        'Ödenen Tutar': row.totalRevenue,
        'Toplam İndirim': row.totalDiscount,
        'İndirim Oranı (%)': row.discountRate.toFixed(2),
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 35 }, // Kullanıcı Adı
        { wch: 30 }, // Email
        { wch: 30 }, // Kampüs
        { wch: 15 }, // Sipariş Sayısı
        { wch: 15 }, // Ödenen Tutar
        { wch: 15 }, // Toplam İndirim
        { wch: 15 }, // İndirim Oranı
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcı Bazlı İndirim');
      XLSX.writeFile(wb, `kullanici-bazli-indirim-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const excelData = campusReport.map((row) => ({
        'Kampüs': row.campus,
        'Sipariş Sayısı': row.orderCount,
        'Kullanıcı Sayısı': row.customerCount,
        'Ödenen Tutar': row.totalRevenue,
        'Toplam İndirim': row.totalDiscount,
        'İndirim Oranı (%)': row.discountRate.toFixed(2),
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 30 }, // Kampüs
        { wch: 15 }, // Sipariş Sayısı
        { wch: 15 }, // Kullanıcı Sayısı
        { wch: 15 }, // Ödenen Tutar
        { wch: 15 }, // Toplam İndirim
        { wch: 15 }, // İndirim Oranı
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kampüs Bazlı İndirim');
      XLSX.writeFile(wb, `kampus-bazli-indirim-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <h1 className="text-3xl font-bold text-gray-900">İndirim Raporu</h1>
          <p className="text-gray-600 mt-1">
            Kullanıcı ve kampüs bazlı indirim analizi
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            {/* Mode Switch */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Rapor Tipi:</label>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setMode('user');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Kullanıcı Bazlı
                </button>
                <button
                  onClick={() => {
                    setMode('campus');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'campus'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Kampüs Bazlı
                </button>
              </div>
            </div>

            {/* Excel Export */}
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>📥</span>
              <span>Excel İndir</span>
            </button>
          </div>
        </div>

        {/* Kullanıcı Bazlı Tablo */}
        {mode === 'user' && (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kullanıcı Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kampüs
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Sipariş Sayısı
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ödenen Tutar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Toplam İndirim
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      İndirim Oranı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        Veri bulunamadı
                      </td>
                    </tr>
                  ) : (
                    (currentData as UserDiscountReport[]).map((row, index) => {
                      const isExpanded = expandedUserId === row.customerId;
                      const userOrders = isExpanded ? getUserOrders(row.customerId) : [];

                      return (
                        <>
                          <tr key={row.customerId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => setExpandedUserId(isExpanded ? null : row.customerId)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {row.customerInfo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {row.email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {row.campus || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              {formatNumber(row.orderCount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                              {formatCurrency(row.totalRevenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-semibold">
                              {formatCurrency(row.totalDiscount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right font-semibold">
                              %{row.discountRate.toFixed(2)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="px-6 py-4 bg-gray-50">
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700">
                                    Siparişler ({userOrders.length})
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                      <thead className="bg-white">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Sipariş No</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tarih</th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Sipariş Tutarı</th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">İndirim</th>
                                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">İndirim Oranı</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-100">
                                        {userOrders.map((order) => {
                                          const discount = calculateDiscount(order);
                                          const revenue = calculateNetRevenue(order);
                                          const totalBefore = revenue + discount;
                                          const discountRate = totalBefore > 0 ? (discount / totalBefore) * 100 : 0;

                                          return (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                              <td className="px-4 py-2 text-xs text-blue-600 font-medium">
                                                {order.custom_order_number}
                                              </td>
                                              <td className="px-4 py-2 text-xs text-gray-600">
                                                {new Date(order.created_on).toLocaleDateString('tr-TR')}
                                              </td>
                                              <td className="px-4 py-2 text-xs text-gray-900 text-right">
                                                {formatCurrency(revenue)}
                                              </td>
                                              <td className="px-4 py-2 text-xs text-red-600 text-right font-medium">
                                                {formatCurrency(discount)}
                                              </td>
                                              <td className="px-4 py-2 text-xs text-purple-600 text-right font-medium">
                                                %{discountRate.toFixed(2)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Kampüs Bazlı Tablo */}
        {mode === 'campus' && (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kampüs
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Sipariş Sayısı
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Kullanıcı Sayısı
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ödenen Tutar
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Toplam İndirim
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      İndirim Oranı
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Veri bulunamadı
                      </td>
                    </tr>
                  ) : (
                    (currentData as CampusDiscountReport[]).map((row, index) => (
                      <tr key={row.campus} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.campus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.orderCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(row.customerCount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-semibold">
                          {formatCurrency(row.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right font-semibold">
                          {formatCurrency(row.totalDiscount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right font-semibold">
                          %{row.discountRate.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Sayfa {currentPage} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}

        {/* Footer bilgi */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          {mode === 'user'
            ? `Toplam ${userReport.length} kullanıcı gösteriliyor`
            : `Toplam ${campusReport.length} kampüs gösteriliyor`}
        </div>
      </div>
    </div>
  );
}
