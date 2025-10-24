'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Order, ReportGroup } from '@/types';
import StatCard from '@/components/StatCard';
import CampusStatsTable from '@/components/CampusStatsTable';
import OrderHeatmap from '@/components/OrderHeatmap';
import {
  calculateDashboardStats,
  calculateCampusStats,
  filterOrdersByDateRange,
  filterOrdersByCampus,
} from '@/utils/dashboardStats';
import {
  getTodayRange,
  getYesterdayRange,
  getThisWeekRange,
  getThisMonthRange,
  getAllTimeRange,
} from '@/utils/dateUtils';
import { getAllCampuses } from '@/utils/campusUtils';
import { calculateReportGroupStats } from '@/utils/reportGroupStats';

interface DashboardClientProps {
  orders: Order[];
}

type DateRangeType = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export default function DashboardClient({ orders }: DashboardClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const campuses = useMemo(() => getAllCampuses(), []);

  // Rapor gruplarını yükle
  useEffect(() => {
    const loadReportGroups = async () => {
      try {
        const response = await fetch('/api/report-groups');
        const result = await response.json();
        if (result.data) {
          setReportGroups(result.data);
        }
      } catch (error) {
        console.error('Rapor grupları yüklenemedi:', error);
      }
    };

    loadReportGroups();
  }, []);

  // Sync işlemini başlat (Local Full Sync)
  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncMessage('🚀 Tüm veriler senkronize ediliyor... (Bu işlem birkaç dakika sürebilir)');

    try {
      // SYNC_TOKEN ile auth yap
      const syncToken = process.env.NEXT_PUBLIC_SYNC_TOKEN;

      const response = await fetch('/api/sync/local-sync', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${syncToken}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        const summary = result.summary || {};
        setSyncMessage(
          `✅ Senkronizasyon tamamlandı!\n` +
          `📦 ${summary.orders || 0} sipariş, ` +
          `👥 ${summary.customers || 0} müşteri, ` +
          `🛍️ ${summary.products || 0} ürün sync edildi`
        );

        // 5 saniye sonra sayfayı yenile
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        setSyncMessage(`❌ Hata: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage('❌ Senkronizasyon başarısız oldu');
    } finally {
      // Hata durumunda da state'i temizle
      setTimeout(() => {
        if (syncMessage.includes('❌')) {
          setIsSyncing(false);
          setSyncMessage('');
        }
      }, 10000);
    }
  };

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
  const groupStats = useMemo(
    () => calculateReportGroupStats(filteredOrders, reportGroups),
    [filteredOrders, reportGroups]
  );

  // Order_status bazlı dağılım (RT ayrımı ile)
  const statusDistribution = useMemo(() => {
    const distribution: Record<string, { total: number; exchange: number; sales: number }> = {};
    filteredOrders.forEach((order) => {
      const status = order.order_status;
      const isExchange = order.custom_order_number.startsWith('RT');

      if (!distribution[status]) {
        distribution[status] = { total: 0, exchange: 0, sales: 0 };
      }

      distribution[status].total++;
      if (isExchange) {
        distribution[status].exchange++;
      } else {
        distribution[status].sales++;
      }
    });

    // En çok olandan aza sırala
    return Object.entries(distribution)
      .sort((a, b) => b[1].total - a[1].total)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, { total: number; exchange: number; sales: number }>);
  }, [filteredOrders]);

  const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Satış ve sipariş istatistikleri</p>
            </div>

            {/* Development Mode Sync Button */}
            {isDevMode && (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSyncing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isSyncing ? '🔄 Senkronize Ediliyor...' : '🔄 Senkronizasyon Başlat'}
                </button>
                {syncMessage && (
                  <div className={`text-sm whitespace-pre-line ${
                    syncMessage.includes('✅') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {syncMessage}
                  </div>
                )}
              </div>
            )}
          </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Toplam Sipariş Adedi"
            value={stats.totalOrders}
            format="number"
            subtitle={`Değişim: ${stats.totalExchangeOrders} | Satış: ${stats.totalSalesOrders}`}
            icon="📦"
            colorClass="bg-blue-500"
          />
          <StatCard
            title="Başarılı Sipariş Adedi"
            value={stats.successfulOrders}
            format="number"
            subtitle={`Değişim: ${stats.successfulExchangeOrders} | Satış: ${stats.successfulSalesOrders}`}
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
            title="Ödemesi Alınan ve İptal Edilen Sipariş Adedi"
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
          <StatCard
            title="Uygulanan İndirim"
            value={stats.totalDiscountAmount}
            format="currency"
            icon="🏷️"
            colorClass="bg-purple-500"
            href="/discount-report"
          />
        </div>

        {/* Sipariş Durum Dağılımı - Order Status bazlı */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sipariş Durum Dağılımı</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(statusDistribution).map(([status, counts]) => {
              // Durum bazlı renkler
              const getStatusColor = (status: string) => {
                if (status.includes('Onaylandı') || status.includes('Tamamlandı')) {
                  return { bg: 'bg-green-50', text: 'text-green-600' };
                }
                if (status.includes('İptal')) {
                  return { bg: 'bg-red-50', text: 'text-red-600' };
                }
                if (status.includes('İade')) {
                  return { bg: 'bg-orange-50', text: 'text-orange-600' };
                }
                if (status.includes('Kargoya') || status.includes('Paketlendi')) {
                  return { bg: 'bg-purple-50', text: 'text-purple-600' };
                }
                if (status.includes('Bekliyor') || status.includes('Toplanıyor')) {
                  return { bg: 'bg-yellow-50', text: 'text-yellow-600' };
                }
                return { bg: 'bg-blue-50', text: 'text-blue-600' };
              };

              const colors = getStatusColor(status);

              return (
                <div key={status} className={`text-center p-4 ${colors.bg} rounded-lg`}>
                  <div className={`text-3xl font-bold ${colors.text}`}>
                    {counts.total}
                  </div>
                  <div className="text-xs text-gray-700 mt-2 font-medium leading-tight">
                    {status}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Değişim: {counts.exchange} | Satış: {counts.sales}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rapor Grup İstatistikleri */}
        {groupStats.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Ürün Grupları İstatistikleri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupStats.map((groupStat) => (
                  <div
                    key={groupStat.groupId}
                    className="bg-white rounded-lg shadow-md p-4 border-l-4 hover:shadow-lg transition"
                    style={{ borderLeftColor: groupStat.groupColor || '#3B82F6' }}
                  >
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                      {groupStat.groupName}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Ciro:</span>
                        <span className="text-sm font-bold text-green-600">
                          {new Intl.NumberFormat('tr-TR', {
                            style: 'currency',
                            currency: 'TRY',
                          }).format(groupStat.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Sipariş:</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {groupStat.orderCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">İptal:</span>
                        <span className="text-sm font-semibold text-red-600">
                          {groupStat.cancelledCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Kampüs İstatistikleri */}
        <div className="mb-6">
          <CampusStatsTable stats={campusStats} />
        </div>
        
        {/* Günlük Ciro Grafiği - Tüm zamanlar verisi */}
        {/* <div className="mb-6">
          <DailyRevenueChart orders={orders} />
        </div> */}

        {/* Sipariş Yoğunluk Haritası - Tüm zamanlar verisi */}
        <div className="mb-6">
          <OrderHeatmap orders={orders} />
        </div>

        
      </div>
    </div>
  );
}
