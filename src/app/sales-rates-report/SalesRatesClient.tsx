'use client';

import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { isSuccessfulOrder, isCancelledOrder, isRefundedOrder, calculateNetRevenue } from '@/utils/orderUtils';
import { formatCurrency } from '@/utils/formatters';

interface OrderWithoutItems {
  id: number;
  custom_order_number: string;
  customer_id: number | null;
  order_status: string;
  payment_status: string;
  order_total: number;
  payment_method_additional_fee_incl_tax: number;
  campus: string | null;
  created_on: string;
}

interface Customer {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  campus_name: string;
  campus_id: number;
}

interface SalesRatesClientProps {
  orders: OrderWithoutItems[];
  customers: Customer[];
}

interface CampusReport {
  campus: string;
  totalRevenue: number;
  dailyRevenue: number;
  cancelledRevenue: number;
  refundedRevenue: number;
  orderCount: number;
  totalCustomers: number;
  customersWithOrders: number;
}

interface CustomerReport {
  customerId: number;
  fullName: string;
  email: string | null;
  campus: string;
  orderCount: number;
  totalRevenue: number;
  cancelledRevenue: number;
  refundedRevenue: number;
}

type ReportMode = 'campus' | 'customer';

export default function SalesRatesClient({ orders, customers }: SalesRatesClientProps) {
  const [mode, setMode] = useState<ReportMode>('campus');
  const [showWithoutOrders, setShowWithoutOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filtrelenmiş siparişler (başarılı, iptal, iade)
  const filteredOrders = useMemo(() => {
    return orders.filter(order =>
      isSuccessfulOrder(order) || isCancelledOrder(order) || isRefundedOrder(order)
    );
  }, [orders]);

  // Kampüs bazlı rapor
  const campusReport = useMemo((): CampusReport[] => {
    const campusMap = new Map<string, CampusReport>();

    // Tüm kampüsleri initialize et
    const allCampuses = new Set<string>();
    customers.forEach(c => {
      if (c.campus_name) allCampuses.add(c.campus_name);
    });
    filteredOrders.forEach(o => {
      if (o.campus) allCampuses.add(o.campus);
    });

    allCampuses.forEach(campus => {
      campusMap.set(campus, {
        campus,
        totalRevenue: 0,
        dailyRevenue: 0,
        cancelledRevenue: 0,
        refundedRevenue: 0,
        orderCount: 0,
        totalCustomers: 0,
        customersWithOrders: 0,
      });
    });

    // Siparişleri işle
    const today = new Date().toISOString().split('T')[0];
    const customerOrderSet = new Set<string>(); // campus:customerId

    filteredOrders.forEach(order => {
      if (!order.campus) return;

      const report = campusMap.get(order.campus);
      if (!report) return;

      const netRevenue = calculateNetRevenue(order);

      if (isSuccessfulOrder(order)) {
        report.totalRevenue += netRevenue;
        if (order.created_on.startsWith(today)) {
          report.dailyRevenue += netRevenue;
        }
      } else if (isCancelledOrder(order)) {
        report.cancelledRevenue += netRevenue;
      } else if (isRefundedOrder(order)) {
        report.refundedRevenue += netRevenue;
      }

      report.orderCount++;

      if (order.customer_id) {
        customerOrderSet.add(`${order.campus}:${order.customer_id}`);
      }
    });

    // Müşteri sayılarını hesapla
    customers.forEach(customer => {
      const campus = customer.campus_name;
      if (!campus) return;

      const report = campusMap.get(campus);
      if (!report) return;

      report.totalCustomers++;

      if (customerOrderSet.has(`${campus}:${customer.id}`)) {
        report.customersWithOrders++;
      }
    });

    return Array.from(campusMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredOrders, customers]);

  // Kullanıcı bazlı rapor
  const customerReport = useMemo((): CustomerReport[] => {
    const customerMap = new Map<number, CustomerReport>();

    // Tüm müşterileri initialize et
    customers.forEach(customer => {
      customerMap.set(customer.id, {
        customerId: customer.id,
        fullName: customer.full_name,
        email: customer.email,
        campus: customer.campus_name || '-',
        orderCount: 0,
        totalRevenue: 0,
        cancelledRevenue: 0,
        refundedRevenue: 0,
      });
    });

    // Siparişleri işle
    filteredOrders.forEach(order => {
      if (!order.customer_id) return;

      let report = customerMap.get(order.customer_id);
      if (!report) {
        // Müşteri customer listesinde yok (nadir durum)
        report = {
          customerId: order.customer_id,
          fullName: 'Bilinmeyen Kullanıcı',
          email: null,
          campus: order.campus || '-',
          orderCount: 0,
          totalRevenue: 0,
          cancelledRevenue: 0,
          refundedRevenue: 0,
        };
        customerMap.set(order.customer_id, report);
      }

      const netRevenue = calculateNetRevenue(order);

      if (isSuccessfulOrder(order)) {
        report.totalRevenue += netRevenue;
      } else if (isCancelledOrder(order)) {
        report.cancelledRevenue += netRevenue;
      } else if (isRefundedOrder(order)) {
        report.refundedRevenue += netRevenue;
      }

      report.orderCount++;
    });

    let result = Array.from(customerMap.values());

    // Filtre: Siparişi olmayanları gösterme (checkbox işaretli değilse)
    if (!showWithoutOrders) {
      result = result.filter(r => r.orderCount > 0);
    }

    // En az 1 başarılı siparişi olanları öne al (toplam revenue'ye göre sırala)
    return result.sort((a, b) => {
      if (a.orderCount === 0 && b.orderCount === 0) return 0;
      if (a.orderCount === 0) return 1;
      if (b.orderCount === 0) return -1;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [filteredOrders, customers, showWithoutOrders]);

  // Toplam ciro (kampüs bazlı rapor için)
  const totalAllRevenue = useMemo(() => {
    return campusReport.reduce((sum, row) => sum + row.totalRevenue, 0);
  }, [campusReport]);

  // Pagination
  const currentData = useMemo(() => {
    const data = mode === 'campus' ? campusReport : customerReport;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [mode, campusReport, customerReport, currentPage]);

  const totalPages = useMemo(() => {
    const data = mode === 'campus' ? campusReport : customerReport;
    return Math.ceil(data.length / itemsPerPage);
  }, [mode, campusReport, customerReport]);

  // Excel export
  const exportToExcel = () => {
    if (mode === 'campus') {
      const excelData = campusReport.map((row) => {
        const revenueRate = totalAllRevenue > 0 ? (row.totalRevenue / totalAllRevenue) * 100 : 0;
        const customerRate = row.totalCustomers > 0 ? (row.customersWithOrders / row.totalCustomers) * 100 : 0;

        return {
          'Kampüs': row.campus,
          'Toplam Ciro': row.totalRevenue,
          'Ciro Oranı (%)': revenueRate.toFixed(2),
          'Günlük Ciro': row.dailyRevenue,
          'İptal Ciro': row.cancelledRevenue,
          'İade Ciro': row.refundedRevenue,
          'Sipariş Sayısı': row.orderCount,
          'Toplam Kullanıcı': row.totalCustomers,
          'Alışveriş Yapan Kullanıcı': row.customersWithOrders,
          'Kullanıcı Oranı (%)': customerRate.toFixed(2),
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 30 }, // Kampüs
        { wch: 15 }, // Toplam Ciro
        { wch: 12 }, // Ciro Oranı
        { wch: 15 }, // Günlük Ciro
        { wch: 15 }, // İptal Ciro
        { wch: 15 }, // İade Ciro
        { wch: 12 }, // Sipariş Sayısı
        { wch: 15 }, // Toplam Kullanıcı
        { wch: 20 }, // Alışveriş Yapan Kullanıcı
        { wch: 15 }, // Kullanıcı Oranı
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kampüs Bazlı Rapor');
      XLSX.writeFile(wb, `kampus-bazli-satis-oranlari-${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const excelData = customerReport.map((row) => ({
        'Kullanıcı Adı': row.fullName,
        'Email': row.email || '-',
        'Kampüs': row.campus,
        'Sipariş Sayısı': row.orderCount,
        'Toplam Ciro': row.totalRevenue,
        'İptal Ciro': row.cancelledRevenue,
        'İade Ciro': row.refundedRevenue,
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 30 }, // Kullanıcı Adı
        { wch: 30 }, // Email
        { wch: 30 }, // Kampüs
        { wch: 12 }, // Sipariş Sayısı
        { wch: 15 }, // Toplam Ciro
        { wch: 15 }, // İptal Ciro
        { wch: 15 }, // İade Ciro
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcı Bazlı Rapor');
      XLSX.writeFile(wb, `kullanici-bazli-satis-oranlari-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satış Oranları Raporu</h1>
          <p className="text-sm text-gray-600 mt-1">
            En az 1 başarılı siparişi olan müşteriler için satış analizi
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📥</span>
          <span>Excel İndir</span>
        </button>
      </div>

      {/* Switch: Kampüs / Kullanıcı */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Rapor Tipi:</label>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
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
            <button
              onClick={() => {
                setMode('customer');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'customer'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kullanıcı Bazlı
            </button>
          </div>

          {/* Checkbox: Siparişi olmayanları göster (sadece kullanıcı bazlı) */}
          {mode === 'customer' && (
            <label className="flex items-center gap-2 ml-6 cursor-pointer">
              <input
                type="checkbox"
                checked={showWithoutOrders}
                onChange={(e) => {
                  setShowWithoutOrders(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Siparişi olmayan kullanıcıları göster</span>
            </label>
          )}
        </div>
      </div>

      {/* Kampüs Bazlı Tablo */}
      {mode === 'campus' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Kampüs
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Toplam Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ciro Oranı
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Günlük Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    İptal Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    İade Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Sipariş Sayısı
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Toplam Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Alışveriş Yapan
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Kullanıcı Oranı
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  (currentData as CampusReport[]).map((row, index) => {
                    const revenueRate = totalAllRevenue > 0 ? (row.totalRevenue / totalAllRevenue) * 100 : 0;
                    const customerRate = row.totalCustomers > 0 ? (row.customersWithOrders / row.totalCustomers) * 100 : 0;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {row.campus}
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600 text-right font-medium">
                          {formatCurrency(row.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-purple-600 text-right font-medium">
                          %{revenueRate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600 text-right font-medium">
                          {formatCurrency(row.dailyRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-red-600 text-right">
                          {formatCurrency(row.cancelledRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-orange-600 text-right">
                          {formatCurrency(row.refundedRevenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          {row.orderCount}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right">
                          {row.totalCustomers}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right">
                          {row.customersWithOrders}
                        </td>
                        <td className="px-6 py-4 text-sm text-indigo-600 text-right font-medium">
                          %{customerRate.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kullanıcı Bazlı Tablo */}
      {mode === 'customer' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Toplam Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    İptal Ciro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    İade Ciro
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  (currentData as CustomerReport[]).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {row.fullName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {row.campus}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {row.orderCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 text-right font-medium">
                        {formatCurrency(row.totalRevenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-red-600 text-right">
                        {formatCurrency(row.cancelledRevenue)}
                      </td>
                      <td className="px-6 py-4 text-sm text-orange-600 text-right">
                        {formatCurrency(row.refundedRevenue)}
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
        {mode === 'campus'
          ? `Toplam ${campusReport.length} kampüs gösteriliyor`
          : `Toplam ${customerReport.length} kullanıcı gösteriliyor`}
      </div>
    </div>
  );
}
