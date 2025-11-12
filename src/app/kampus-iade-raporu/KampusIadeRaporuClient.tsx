'use client';

import { useMemo } from 'react';
import type { ReturnRequest, Return, Order, ReturnRequestWithRefund } from '@/types';
import {
  calculateAllReturnRequestRefunds,
  calculateAllReturnAmounts,
  formatCurrency
} from '@/utils/returnAmountCalculator';

interface KampusIadeRaporuClientProps {
  returnRequests: ReturnRequest[];
  returns: Return[];
  orders: Order[];
}

interface MonthData {
  count: number;
  amount: number;
}

interface CampusData {
  campusName: string;
  months: Record<string, MonthData>;
  total: MonthData;
}

export default function KampusIadeRaporuClient({
  returnRequests,
  returns,
  orders
}: KampusIadeRaporuClientProps) {
  // İade tutarlarını hesapla
  const requestsWithRefunds = useMemo(() => {
    return calculateAllReturnRequestRefunds(returnRequests, orders);
  }, [returnRequests, orders]);

  const returnsWithAmounts = useMemo(() => {
    return calculateAllReturnAmounts(returns, requestsWithRefunds, orders);
  }, [returns, requestsWithRefunds, orders]);

  // Orders Map (kampüs bilgisi için)
  const ordersMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach(order => {
      if (order.custom_order_number) {
        map.set(order.custom_order_number, order);
      }
    });
    return map;
  }, [orders]);

  // Kampüs + Ay bazlı gruplandırma
  const campusMonthlyData = useMemo(() => {
    const campusMap = new Map<string, CampusData>();

    // İade Taleplerini işle
    requestsWithRefunds.forEach(request => {
      if (request.has_error || !request.created_on) return;

      const order = ordersMap.get(request.custom_order_number || '');
      if (!order) return;

      // Kampüs bilgisini order.campus'ten al
      const campusName = order.campus || 'Bilinmeyen Kampüs';
      const date = new Date(request.created_on);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!campusMap.has(campusName)) {
        campusMap.set(campusName, {
          campusName,
          months: {},
          total: { count: 0, amount: 0 }
        });
      }

      const campusData = campusMap.get(campusName)!;

      if (!campusData.months[monthKey]) {
        campusData.months[monthKey] = { count: 0, amount: 0 };
      }

      campusData.months[monthKey].count += 1;
      campusData.months[monthKey].amount += request.refund_amount || 0;
      campusData.total.count += 1;
      campusData.total.amount += request.refund_amount || 0;
    });

    // İadeleri işle
    returnsWithAmounts.forEach(returnItem => {
      if (!returnItem.created_on) return;

      const order = ordersMap.get(returnItem.custom_order_number || '');
      if (!order) return;

      // Kampüs bilgisini order.campus'ten al
      const campusName = order.campus || 'Bilinmeyen Kampüs';
      const date = new Date(returnItem.created_on);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!campusMap.has(campusName)) {
        campusMap.set(campusName, {
          campusName,
          months: {},
          total: { count: 0, amount: 0 }
        });
      }

      const campusData = campusMap.get(campusName)!;

      if (!campusData.months[monthKey]) {
        campusData.months[monthKey] = { count: 0, amount: 0 };
      }

      campusData.months[monthKey].count += 1;
      campusData.months[monthKey].amount += returnItem.return_amount || 0;
      campusData.total.count += 1;
      campusData.total.amount += returnItem.return_amount || 0;
    });

    return Array.from(campusMap.values()).sort((a, b) =>
      b.total.amount - a.total.amount
    );
  }, [requestsWithRefunds, returnsWithAmounts, ordersMap]);

  // Tüm ayları topla (sıralı)
  const allMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    campusMonthlyData.forEach(campus => {
      Object.keys(campus.months).forEach(month => monthsSet.add(month));
    });
    return Array.from(monthsSet).sort();
  }, [campusMonthlyData]);

  // Genel toplam
  const grandTotal = useMemo(() => {
    return campusMonthlyData.reduce(
      (acc, campus) => ({
        count: acc.count + campus.total.count,
        amount: acc.amount + campus.total.amount
      }),
      { count: 0, amount: 0 }
    );
  }, [campusMonthlyData]);

  // Ay bazlı toplam
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, MonthData> = {};
    allMonths.forEach(month => {
      totals[month] = { count: 0, amount: 0 };
    });

    campusMonthlyData.forEach(campus => {
      Object.entries(campus.months).forEach(([month, data]) => {
        totals[month].count += data.count;
        totals[month].amount += data.amount;
      });
    });

    return totals;
  }, [campusMonthlyData, allMonths]);

  // Ay formatla
  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kampüs İade Raporu</h1>
            <p className="text-gray-600 mt-1">
              Toplam {grandTotal.count} iade | {formatCurrency(grandTotal.amount)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Pivot Tablo */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Kampüs
                  </th>
                  {allMonths.map(month => (
                    <th key={month} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {formatMonth(month)}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campusMonthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={allMonths.length + 2} className="px-6 py-8 text-center text-gray-500">
                      Veri bulunamadı
                    </td>
                  </tr>
                ) : (
                  <>
                    {campusMonthlyData.map((campus, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                          {campus.campusName}
                        </td>
                        {allMonths.map(month => {
                          const data = campus.months[month];
                          return (
                            <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {data ? (
                                <div>
                                  <div className="font-semibold">{formatCurrency(data.amount)}</div>
                                  <div className="text-xs text-gray-500">{data.count} adet</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right bg-blue-50">
                          <div className="font-bold text-blue-900">{formatCurrency(campus.total.amount)}</div>
                          <div className="text-xs text-blue-700">{campus.total.count} adet</div>
                        </td>
                      </tr>
                    ))}

                    {/* Alt Toplam Satırı */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-gray-100">
                        ALT TOPLAM
                      </td>
                      {allMonths.map(month => {
                        const data = monthlyTotals[month];
                        return (
                          <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            <div className="font-bold">{formatCurrency(data.amount)}</div>
                            <div className="text-xs">{data.count} adet</div>
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right bg-blue-100">
                        <div className="font-bold text-blue-900">{formatCurrency(grandTotal.amount)}</div>
                        <div className="text-xs text-blue-800">{grandTotal.count} adet</div>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bilgi Notu */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Bu rapor hem iade taleplerini hem de iadeleri içerir
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>İade talepleri + İadeler birlikte gösterilir</li>
                  <li>Kampüs bilgisi: custom_order_number → order.campus</li>
                  <li>Her hücrede iade tutarı ve adet bilgisi gösterilir</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
