'use client';

import { useMemo } from 'react';
import type { ReturnRequest, Return, Order, ReturnRequestWithRefund } from '@/types';
import {
  calculateAllReturnRequestRefunds,
  calculateAllReturnAmounts,
  formatCurrency
} from '@/utils/returnAmountCalculator';

interface IadeOzetClientProps {
  returnRequests: ReturnRequest[];
  returns: Return[];
  orders: Order[];
}

interface StatRow {
  status: string;
  count: number;
  amount: number;
  isCancelled: boolean; // İptal/Red durumları
}

export default function IadeOzetClient({
  returnRequests,
  returns,
  orders
}: IadeOzetClientProps) {
  // İade tutarlarını hesapla
  const requestsWithRefunds = useMemo(() => {
    return calculateAllReturnRequestRefunds(returnRequests, orders);
  }, [returnRequests, orders]);

  const returnsWithAmounts = useMemo(() => {
    return calculateAllReturnAmounts(returns, requestsWithRefunds, orders);
  }, [returns, requestsWithRefunds, orders]);

  // İade Talepleri İstatistikleri (Action bazlı)
  const requestStats = useMemo(() => {
    const actions = ['Ödeme İadesi', 'Para Puan', 'Değişim'];
    const result: Record<string, StatRow[]> = {};

    actions.forEach(action => {
      const filtered = requestsWithRefunds.filter(r => r.return_action === action);
      const statusMap = new Map<string, { count: number; amount: number }>();

      filtered.forEach(r => {
        const status = r.return_request_status_str || 'Bilinmiyor';
        const existing = statusMap.get(status) || { count: 0, amount: 0 };

        statusMap.set(status, {
          count: existing.count + 1,
          amount: existing.amount + (r.has_error ? 0 : r.refund_amount || 0)
        });
      });

      const stats: StatRow[] = [];
      let subtotalCount = 0;
      let subtotalAmount = 0;

      // Önce normal durumlar, sonra iptal/red
      const sortedStatuses = Array.from(statusMap.entries()).sort((a, b) => {
        const aIsCancelled = a[0].toLowerCase().includes('iptal') || a[0].toLowerCase().includes('red');
        const bIsCancelled = b[0].toLowerCase().includes('iptal') || b[0].toLowerCase().includes('red');

        if (aIsCancelled && !bIsCancelled) return 1;
        if (!aIsCancelled && bIsCancelled) return -1;
        return 0;
      });

      sortedStatuses.forEach(([status, data]) => {
        const isCancelled = status.toLowerCase().includes('iptal') || status.toLowerCase().includes('red');

        stats.push({
          status,
          count: data.count,
          amount: data.amount,
          isCancelled
        });

        if (!isCancelled) {
          subtotalCount += data.count;
          subtotalAmount += data.amount;
        }
      });

      // Alt toplam ekle
      if (sortedStatuses.length > 0) {
        stats.push({
          status: 'ALT TOPLAM',
          count: subtotalCount,
          amount: subtotalAmount,
          isCancelled: false
        });
      }

      result[action] = stats;
    });

    return result;
  }, [requestsWithRefunds]);

  // İadeler İstatistikleri (Action bazlı)
  const returnStats = useMemo(() => {
    const actions = ['Ödeme İadesi', 'Para Puan', 'Değişim'];
    const result: Record<string, StatRow[]> = {};

    actions.forEach(action => {
      const filtered = returnsWithAmounts.filter(r => r.return_action === action);
      const statusMap = new Map<string, { count: number; amount: number }>();

      filtered.forEach(r => {
        const status = r.return_payment_status || 'Bilinmiyor';
        const existing = statusMap.get(status) || { count: 0, amount: 0 };

        statusMap.set(status, {
          count: existing.count + 1,
          amount: existing.amount + (r.return_amount || 0)
        });
      });

      const stats: StatRow[] = [];
      let subtotalCount = 0;
      let subtotalAmount = 0;

      // Önce normal durumlar, sonra iptal/red
      const sortedStatuses = Array.from(statusMap.entries()).sort((a, b) => {
        const aIsCancelled = a[0].toLowerCase().includes('iptal') || a[0].toLowerCase().includes('red');
        const bIsCancelled = b[0].toLowerCase().includes('iptal') || b[0].toLowerCase().includes('red');

        if (aIsCancelled && !bIsCancelled) return 1;
        if (!aIsCancelled && bIsCancelled) return -1;
        return 0;
      });

      sortedStatuses.forEach(([status, data]) => {
        const isCancelled = status.toLowerCase().includes('iptal') || status.toLowerCase().includes('red');

        stats.push({
          status,
          count: data.count,
          amount: data.amount,
          isCancelled
        });

        if (!isCancelled) {
          subtotalCount += data.count;
          subtotalAmount += data.amount;
        }
      });

      // Alt toplam ekle
      if (sortedStatuses.length > 0) {
        stats.push({
          status: 'ALT TOPLAM',
          count: subtotalCount,
          amount: subtotalAmount,
          isCancelled: false
        });
      }

      result[action] = stats;
    });

    return result;
  }, [returnsWithAmounts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">İade Özet Raporu</h1>
            <p className="text-gray-600 mt-1">
              Toplam {returnRequests.length} iade talebi | {returns.length} iade
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* İade Talepleri Özeti */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">İade Talepleri</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(requestStats).map(([action, stats]) => (
              <div key={action} className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{action}</h3>
                </div>
                <div className="p-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                          Durum
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                          Sayı
                        </th>
                        {action !== 'Değişim' && (
                          <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                            Tutar
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-500 text-sm">
                            Kayıt yok
                          </td>
                        </tr>
                      ) : (
                        stats.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-gray-100 ${
                              row.status === 'ALT TOPLAM'
                                ? 'bg-blue-50 font-semibold'
                                : row.isCancelled
                                ? 'bg-gray-50 text-gray-500'
                                : ''
                            }`}
                          >
                            <td className="py-2 text-sm">{row.status}</td>
                            <td className="py-2 text-sm text-right">{row.count}</td>
                            {action !== 'Değişim' && (
                              <td className="py-2 text-sm text-right">
                                {formatCurrency(row.amount)}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* İadeler Özeti */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">İadeler</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(returnStats).map(([action, stats]) => (
              <div key={action} className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{action}</h3>
                </div>
                <div className="p-6">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">
                          Ödeme Durumu
                        </th>
                        <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                          Sayı
                        </th>
                        {action !== 'Değişim' && (
                          <th className="text-right text-xs font-medium text-gray-500 uppercase pb-2">
                            Tutar
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-gray-500 text-sm">
                            Kayıt yok
                          </td>
                        </tr>
                      ) : (
                        stats.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-gray-100 ${
                              row.status === 'ALT TOPLAM'
                                ? 'bg-blue-50 font-semibold'
                                : row.isCancelled
                                ? 'bg-gray-50 text-gray-500'
                                : ''
                            }`}
                          >
                            <td className="py-2 text-sm">{row.status}</td>
                            <td className="py-2 text-sm text-right">{row.count}</td>
                            {action !== 'Değişim' && (
                              <td className="py-2 text-sm text-right">
                                {formatCurrency(row.amount)}
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
