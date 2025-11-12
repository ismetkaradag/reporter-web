'use client';

import { useState, useMemo } from 'react';
import type { ReturnRequest, Return, Order, ReturnRequestWithRefund } from '@/types';
import {
  calculateAllReturnRequestRefunds,
  calculateAllReturnAmounts,
  formatCurrency
} from '@/utils/returnAmountCalculator';
import {
  exportReturnRequestsToExcel,
  exportSimpleReturnRequestsToExcel,
  exportReturnRequestsLineByLine
} from '@/utils/returnExcelExport';

interface IadeTalepleriClientProps {
  returnRequests: ReturnRequest[];
  returns: Return[];
  orders: Order[];
}

export default function IadeTalepleriClient({
  returnRequests,
  returns,
  orders
}: IadeTalepleriClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // İade tutarlarını hesapla (sadece tutar bilgisi için)
  const requestsWithRefunds = useMemo(() => {
    return calculateAllReturnRequestRefunds(returnRequests, orders);
  }, [returnRequests, orders]);

  // Tutar map'i oluştur (hızlı erişim için)
  const amountMap = useMemo(() => {
    const map = new Map<string, { amount: number; hasError: boolean; errorMessage?: string }>();
    requestsWithRefunds.forEach(request => {
      if (request.custom_number) {
        map.set(request.custom_number, {
          amount: request.refund_amount || 0,
          hasError: request.has_error || false,
          errorMessage: request.error_message
        });
      }
    });
    return map;
  }, [requestsWithRefunds]);

  // TÜM iade taleplerini tutar bilgisi ile birleştir
  const allRequestsWithAmounts = useMemo(() => {
    return returnRequests.map(request => {
      const amountData = amountMap.get(request.custom_number || '');
      return {
        ...request,
        refund_amount: amountData?.amount || 0,
        has_error: amountData?.hasError || false,
        error_message: amountData?.errorMessage,
        order_total_amount: undefined
      };
    });
  }, [returnRequests, amountMap]);

  // İadeler tutarlarını hesapla
  const returnsWithAmounts = useMemo(() => {
    return calculateAllReturnAmounts(returns, requestsWithRefunds, orders);
  }, [returns, requestsWithRefunds, orders]);

  // Orders Map (Excel export için)
  const ordersMap = useMemo(() => {
    const map = new Map<string, Order>();
    orders.forEach(order => {
      map.set(order.custom_order_number, order);
    });
    return map;
  }, [orders]);

  // Excel export handlers
  const handleDetailedExport = () => {
    exportReturnRequestsToExcel(filteredRequests, returnsWithAmounts, ordersMap);
  };

  const handleSimpleExport = () => {
    exportSimpleReturnRequestsToExcel(filteredRequests);
  };

  const handleLineByLineExport = () => {
    exportReturnRequestsLineByLine(filteredRequests);
  };

  // Filtreler
  const filteredRequests = useMemo(() => {
    let filtered = [...allRequestsWithAmounts];

    // Arama
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.custom_number?.toLowerCase().includes(search) ||
        r.custom_order_number?.toLowerCase().includes(search) ||
        r.customer_info?.toLowerCase().includes(search)
      );
    }

    // Action filtresi
    if (actionFilter !== 'all') {
      filtered = filtered.filter(r => r.return_action === actionFilter);
    }

    // Status filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.return_request_status_str === statusFilter);
    }

    return filtered;
  }, [allRequestsWithAmounts, searchTerm, actionFilter, statusFilter]);

  // Unique action ve status değerleri
  const uniqueActions = useMemo(() => {
    const actions = new Set(returnRequests.map(r => r.return_action).filter(Boolean));
    return Array.from(actions).sort();
  }, [returnRequests]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(returnRequests.map(r => r.return_request_status_str).filter(Boolean));
    return Array.from(statuses).sort();
  }, [returnRequests]);

  // Toplam istatistikler
  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const totalAmount = filteredRequests
      .filter(r => !r.has_error)
      .reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    const withErrors = filteredRequests.filter(r => r.has_error).length;

    return { total, totalAmount, withErrors };
  }, [filteredRequests]);

  // Format tarih
  const formatDate = (dateString: string | null) => {
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">İade Talepleri</h1>
              <p className="text-gray-600 mt-1">
                Toplam {stats.total} talep | {formatCurrency(stats.totalAmount)} toplam tutar
                {stats.withErrors > 0 && (
                  <span className="text-red-600 ml-2">
                    ({stats.withErrors} hatalı kayıt)
                  </span>
                )}
              </p>
            </div>
            {/* Excel Export Butonları */}
            <div className="flex gap-2">
              <button
                onClick={handleSimpleExport}
                disabled={filteredRequests.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                📊 Basit Excel
              </button>
              <button
                onClick={handleLineByLineExport}
                disabled={filteredRequests.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                📋 Satır Bazlı
              </button>
              <button
                onClick={handleDetailedExport}
                disabled={filteredRequests.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                📑 Detaylı Rapor
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ara
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Talep no, sipariş no, müşteri..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İade Aksiyonu
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tümü</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Status Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tümü</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tablo */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talep No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İade Aksiyonu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İade Tutarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Kayıt bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className={`hover:bg-gray-50 ${request.has_error ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {request.custom_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.custom_order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.customer_info || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.return_action === 'Ödeme İadesi'
                            ? 'bg-green-100 text-green-800'
                            : request.return_action === 'Para Puan'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {request.return_action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          request.return_request_status_str?.includes('Onaylandı')
                            ? 'bg-green-100 text-green-800'
                            : request.return_request_status_str?.includes('Bekle')
                            ? 'bg-yellow-100 text-yellow-800'
                            : request.return_request_status_str?.includes('İptal') ||
                              request.return_request_status_str?.includes('Red')
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {request.return_request_status_str}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {request.has_error ? (
                          <span className="text-red-600 font-medium">
                            Hata
                          </span>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(request.refund_amount || 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.created_on)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hatalı Kayıtlar Uyarısı */}
        {stats.withErrors > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {stats.withErrors} kayıt için iade tutarı hesaplanamadı
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Olası nedenler:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>İlgili sipariş veritabanında bulunamadı</li>
                    <li>RT zinciri eksik (önceki iade talepleri senkronize edilmemiş)</li>
                    <li>Ürün bilgisi eksik veya hatalı (lines dizisi boş veya from_attr boş)</li>
                    <li>Bu kayıtlar 0₺ olarak gösterilir</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
