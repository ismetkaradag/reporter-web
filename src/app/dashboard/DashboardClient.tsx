'use client';

import { useState, useMemo } from 'react';
import type { Order } from '@/types';
import StatCard from '@/components/StatCard';
import CampusStatsTable from '@/components/CampusStatsTable';
import OrderHeatmap from '@/components/OrderHeatmap';
import {
  calculateDashboardStats,
  calculateCampusStats,
  filterOrdersByDateRange,
  filterOrdersByCampus,
  calculateOrderStatusDistribution,
} from '@/utils/dashboardStats';
import {
  getTodayRange,
  getYesterdayRange,
  getThisWeekRange,
  getThisMonthRange,
  getAllTimeRange,
} from '@/utils/dateUtils';
import { getAllCampuses } from '@/utils/campusUtils';

interface DashboardClientProps {
  orders: Order[];
}

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export default function DashboardClient({ orders }: DashboardClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('today');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');

  const campuses = useMemo(() => getAllCampuses(), []);

  // Filtrelenmiş siparişler
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Tarih filtresi
    if (dateRange !== 'all') {
      let range;
      switch (dateRange) {
        case 'today':
          range = getTodayRange();
          break;
        case 'yesterday':
          range = getYesterdayRange();
          break;
        case 'week':
          range = getThisWeekRange();
          break;
        case 'month':
          range = getThisMonthRange();
          break;
        default:
          range = getAllTimeRange();
      }
      filtered = filterOrdersByDateRange(filtered, range.start, range.end);
    }

    // Kampüs filtresi
    filtered = filterOrdersByCampus(filtered, selectedCampus);

    return filtered;
  }, [orders, dateRange, selectedCampus]);

  // İstatistikler
  const stats = useMemo(() => calculateDashboardStats(filteredOrders), [filteredOrders]);
  const campusStats = useMemo(() => calculateCampusStats(filteredOrders), [filteredOrders]);
  const statusDistribution = useMemo(
    () => calculateOrderStatusDistribution(filteredOrders),
    [filteredOrders]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Satış ve sipariş istatistikleri</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarih Aralığı Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zaman Dilimi
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'today', label: 'Bugün' },
                  { value: 'yesterday', label: 'Dün' },
                  { value: 'week', label: 'Bu Hafta' },
                  { value: 'month', label: 'Bu Ay' },
                  { value: 'all', label: 'Tüm Zamanlar' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value as DateRangeType)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateRange === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kampüs Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kampüs
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
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
          </div>
        </div>

        {/* Ana İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Toplam Sipariş"
            value={stats.totalOrders}
            format="number"
            icon="📦"
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Başarılı Sipariş"
            value={stats.successfulOrders}
            format="number"
            icon="✅"
            colorClass="bg-green-500"
          />
          <StatCard
            title="Toplam Ciro"
            value={stats.successfulRevenue}
            format="currency"
            icon="💰"
            colorClass="bg-purple-500"
          />
          <StatCard
            title="Ortalama Sipariş"
            value={stats.averageOrderValue}
            format="currency"
            icon="📊"
            colorClass="bg-indigo-500"
          />
        </div>

        {/* İkincil İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="İptal Edilen"
            value={stats.cancelledOrders}
            format="number"
            subtitle={`Tutar: ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
            }).format(stats.cancelledRevenue)}`}
            icon="❌"
            colorClass="bg-red-500"
          />
          <StatCard
            title="İade Edilen"
            value={stats.refundedOrders}
            format="number"
            subtitle={`Tutar: ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY',
            }).format(stats.refundedRevenue)}`}
            icon="↩️"
            colorClass="bg-orange-500"
          />
          <StatCard
            title="Para Puan Kullanımı"
            value={stats.rewardPointsUsed}
            format="currency"
            icon="🎁"
            colorClass="bg-pink-500"
          />
        </div>

        {/* Sipariş Durum Dağılımı - Sadece gösterilen durumlar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Durum Dağılımı</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-4xl font-bold text-green-600">
                {statusDistribution.basarili}
              </div>
              <div className="text-sm text-gray-700 mt-2 font-medium">Başarılı</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-4xl font-bold text-red-600">
                {statusDistribution.iptal}
              </div>
              <div className="text-sm text-gray-700 mt-2 font-medium">İptal</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-4xl font-bold text-orange-600">
                {statusDistribution.iade}
              </div>
              <div className="text-sm text-gray-700 mt-2 font-medium">İade</div>
            </div>
          </div>
        </div>

        {/* Sipariş Yoğunluk Haritası */}
        <OrderHeatmap orders={filteredOrders} />

        {/* Kampüs İstatistikleri */}
        <CampusStatsTable stats={campusStats} />
      </div>
    </div>
  );
}
