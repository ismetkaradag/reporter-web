'use client';

import { useState, useMemo } from 'react';
import type { Return } from '@/types';
import { formatCurrency } from '@/utils/returnAmountCalculator';

interface IadelerClientProps {
  returns: Return[];
}

export default function IadelerClient({ returns }: IadelerClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filtreler
  const filteredReturns = useMemo(() => {
    let filtered = [...returns];

    // Arama
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.custom_return_number?.toLowerCase().includes(search) ||
        r.custom_order_number?.toLowerCase().includes(search) ||
        r.customer_full_name?.toLowerCase().includes(search) ||
        r.customer_identity_number?.toLowerCase().includes(search)
      );
    }

    // Action filtresi
    if (actionFilter !== 'all') {
      filtered = filtered.filter(r => r.return_action === actionFilter);
    }

    // Status filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.return_payment_status === statusFilter);
    }

    return filtered;
  }, [returns, searchTerm, actionFilter, statusFilter]);

  // Unique action ve status değerleri
  const uniqueActions = useMemo(() => {
    const actions = new Set(returns.map(r => r.return_action).filter(Boolean));
    return Array.from(actions).sort();
  }, [returns]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(returns.map(r => r.return_payment_status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [returns]);

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">İadeler</h1>
              <p className="text-gray-600 mt-1">
                Toplam {filteredReturns.length} iade kaydı
              </p>
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
                placeholder="İade no, sipariş no, müşteri..."
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
                Ödeme Durumu
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
                    İade No
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
                    Ödeme Durumu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ödeme Tarihi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Kayıt bulunamadı
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((returnItem) => (
                    <tr key={returnItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {returnItem.custom_return_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {returnItem.custom_order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {[returnItem.customer_full_name, returnItem.customer_identity_number]
                          .filter(Boolean)
                          .join(' - ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          returnItem.return_action === 'Ödeme İadesi'
                            ? 'bg-green-100 text-green-800'
                            : returnItem.return_action === 'Para Puan'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {returnItem.return_action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          returnItem.return_payment_status?.includes('Ödendi')
                            ? 'bg-green-100 text-green-800'
                            : returnItem.return_payment_status?.includes('Bekliyor')
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {returnItem.return_payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(returnItem.created_on)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(returnItem.paid_date_utc)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
