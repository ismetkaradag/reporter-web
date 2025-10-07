'use client';

import { useMemo } from 'react';
import type { Order } from '@/types';
import { isSuccessfulOrder, calculateNetRevenue } from '@/utils/orderUtils';
import { formatCurrency } from '@/utils/formatters';

interface DailyRevenueChartProps {
  orders: Order[];
}

interface DailyData {
  date: string;
  revenue: number;
  orderCount: number;
}

export default function DailyRevenueChart({ orders }: DailyRevenueChartProps) {
  // Son 30 günün günlük ciro verisi
  const dailyData = useMemo((): DailyData[] => {
    const successfulOrders = orders.filter(isSuccessfulOrder);
    const revenueMap = new Map<string, { revenue: number; count: number }>();

    // Tüm siparişleri tarihlerine göre grupla
    successfulOrders.forEach((order) => {
      const date = order.created_on.split('T')[0]; // YYYY-MM-DD
      const revenue = calculateNetRevenue(order);

      const existing = revenueMap.get(date) || { revenue: 0, count: 0 };
      revenueMap.set(date, {
        revenue: existing.revenue + revenue,
        count: existing.count + 1,
      });
    });

    // Map'i array'e çevir ve tarihe göre sırala
    const dataArray = Array.from(revenueMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orderCount: data.count,
    }));

    dataArray.sort((a, b) => a.date.localeCompare(b.date));

    // Son 30 günü al
    return dataArray.slice(-30);
  }, [orders]);

  // Grafik için maksimum değer
  const maxRevenue = useMemo(() => {
    return Math.max(...dailyData.map((d) => d.revenue), 0);
  }, [dailyData]);

  // SVG boyutları
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Nokta koordinatlarını hesapla
  const points = useMemo(() => {
    if (dailyData.length === 0) return [];

    return dailyData.map((data, index) => {
      const x = padding.left + (index / (dailyData.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (data.revenue / maxRevenue) * chartHeight;
      return { x, y, data };
    });
  }, [dailyData, maxRevenue, chartWidth, chartHeight, padding]);

  // Çizgi için path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  // Alan için path (gradient fill)
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return `${pathData} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
  }, [points, chartWidth, chartHeight, padding]);

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Günlük Ciro Grafiği</h3>
      <p className="text-sm text-gray-600 mb-6">Son 30 günün başarılı sipariş cirosu</p>

      {dailyData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Veri bulunamadı</div>
      ) : (
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="mx-auto">
            {/* Gradient tanımı */}
            <defs>
              <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Y ekseni çizgileri (yatay) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + chartHeight - ratio * chartHeight;
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + chartWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 5}
                    textAnchor="end"
                    className="text-xs fill-gray-600"
                  >
                    {formatCurrency(maxRevenue * ratio, { compact: true })}
                  </text>
                </g>
              );
            })}

            {/* Alan (gradient fill) */}
            <path d={areaPath} fill="url(#revenueGradient)" />

            {/* Çizgi */}
            <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2" />

            {/* Noktalar */}
            {points.map((point, index) => (
              <g key={index}>
                <circle cx={point.x} cy={point.y} r="4" fill="#3b82f6" className="cursor-pointer">
                  <title>
                    {point.data.date}: {formatCurrency(point.data.revenue)} ({point.data.orderCount} sipariş)
                  </title>
                </circle>
              </g>
            ))}

            {/* X ekseni etiketleri (her 5 günde bir) */}
            {points.map((point, index) => {
              if (index % 5 === 0 || index === points.length - 1) {
                const dateStr = new Date(point.data.date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                });
                return (
                  <text
                    key={index}
                    x={point.x}
                    y={padding.top + chartHeight + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {dateStr}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </div>
      )}

      {/* Özet bilgi */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t pt-4">
        <div>
          <div className="text-xs text-gray-500">Toplam Ciro</div>
          <div className="text-lg font-semibold text-blue-600">
            {formatCurrency(dailyData.reduce((sum, d) => sum + d.revenue, 0))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Ortalama Günlük</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Toplam Sipariş</div>
          <div className="text-lg font-semibold text-purple-600">
            {dailyData.reduce((sum, d) => sum + d.orderCount, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
