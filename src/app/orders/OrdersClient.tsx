'use client';

import { useState, useMemo } from 'react';
import type { Order } from '@/types';
import { formatCurrency, formatNumber } from '@/utils/formatUtils';
import { formatDateTime } from '@/utils/dateUtils';
import { calculateNetRevenue } from '@/utils/orderUtils';
import { getAllCampuses } from '@/utils/campusUtils';

interface OrdersClientProps {
  orders: Order[];
}

const ITEMS_PER_PAGE = 50;

export default function OrdersClient({ orders }: OrdersClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const campuses = useMemo(() => getAllCampuses(), []);

  // Filtreleme
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Arama filtresi
      const matchesSearch =
        !searchTerm ||
        order.custom_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Kampüs filtresi
      const matchesCampus = selectedCampus === 'all' || order.campus === selectedCampus;

      // Durum filtresi (direkt order_status'a göre)
      const matchesStatus = selectedStatus === 'all' || order.order_status === selectedStatus;

      return matchesSearch && matchesCampus && matchesStatus;
    });
  }, [orders, searchTerm, selectedCampus, selectedStatus]);

  // Sayfalama
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Sayfa değiştirme
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Durum badge rengi (order_status'a göre)
  const getStatusBadge = (orderStatus: string) => {
    // Durum bazlı renkler
    const statusColors: Record<string, string> = {
      'Onaylandı': 'bg-green-100 text-green-800',
      'İptal Edildi': 'bg-red-100 text-red-800',
      'İptal Tutarı Bankaya İletildi': 'bg-red-100 text-red-800',
      'İade Edildi': 'bg-orange-100 text-orange-800',
      'Onay Bekliyor': 'bg-yellow-100 text-yellow-800',
      'İşleme Alındı': 'bg-blue-100 text-blue-800',
      'Netloga Gönderildi': 'bg-blue-100 text-blue-800',
      'Toplanıyor': 'bg-blue-100 text-blue-800',
      'Paketlendi': 'bg-indigo-100 text-indigo-800',
      'Kargoya Verildi': 'bg-purple-100 text-purple-800',
      'Parçalı Kargo Verildi': 'bg-purple-100 text-purple-800',
      'Tamamlandı': 'bg-green-100 text-green-800',
    };

    const color = statusColors[orderStatus] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${color}`}>
        {orderStatus}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <h1 className="text-3xl font-bold text-gray-900">Tüm Siparişler</h1>
          <p className="text-gray-600 mt-1">
            Toplam {formatNumber(filteredOrders.length)} sipariş
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Arama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arama
              </label>
              <input
                type="text"
                placeholder="Sipariş no, müşteri..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Kampüs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kampüs
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => {
                  setSelectedCampus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tüm Kampüsler</option>
                {campuses.map((campus) => (
                  <option key={campus} value={campus}>
                    {campus}
                  </option>
                ))}
              </select>
            </div>

            {/* Durum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durum
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="Onaylandı">Onaylandı</option>
                <option value="İptal Edildi">İptal Edildi</option>
                <option value="İade Edildi">İade Edildi</option>
                <option value="İşleme Alındı">İşleme Alındı</option>
                <option value="Netloga Gönderildi">Netloga Gönderildi</option>
                <option value="Toplanıyor">Toplanıyor</option>
                <option value="Paketlendi">Paketlendi</option>
                <option value="Kargoya Verildi">Kargoya Verildi</option>
                <option value="Parçalı Kargo Verildi">Parçalı Kargo Verildi</option>
                <option value="Tamamlandı">Tamamlandı</option>
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
                    Sipariş No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Müşteri
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kampüs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {order.custom_order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{order.customer_info}</div>
                      {order.customer_email && (
                        <div className="text-xs text-gray-500">{order.customer_email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {order.campus || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDateTime(order.created_on)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(order.order_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(calculateNetRevenue(order))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              {startIndex + 1} - {Math.min(endIndex, filteredOrders.length)} arası,{' '}
              Toplam {formatNumber(filteredOrders.length)} sipariş
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
