'use client';

import { useMemo, useRef, useState } from 'react';
import type { Order } from '@/types';
import { calculateNetRevenue, isSuccessfulOrder } from '@/utils/orderUtils';
import { formatCurrency, formatNumber } from '@/utils/formatUtils';

interface PlatformRevenue14DaysChartProps {
  orders: Order[];
}

interface DayPoint {
  key: string;
  label: string;
}

interface Series {
  name: string;
  color: string;
  values: number[];
}

const SERIES_COLORS = [
  '#2563eb',
  '#10b981',
  '#f97316',
  '#a855f7',
  '#0ea5e9',
  '#84cc16',
  '#f43f5e',
  '#14b8a6',
];

function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function PlatformRevenue14DaysChart({ orders }: PlatformRevenue14DaysChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const { days, series, totalRevenue } = useMemo(() => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 13);
    start.setHours(0, 0, 0, 0);

    const dayPoints: DayPoint[] = [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      dayPoints.push({
        key: getDateKey(date),
        label: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      });
    }

    const platformMap = new Map<string, Map<string, number>>();

    orders.filter(isSuccessfulOrder).forEach((order) => {
      if (!order.created_on) return;
      const orderDate = new Date(order.created_on);
      if (Number.isNaN(orderDate.getTime()) || orderDate < start) return;

      const dateKey = getDateKey(orderDate);
      const platform = (order.order_platform || '').trim() || 'Bilinmeyen';
      const revenue = calculateNetRevenue(order);

      if (!platformMap.has(platform)) {
        platformMap.set(platform, new Map<string, number>());
      }
      const dateMap = platformMap.get(platform)!;
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + revenue);
    });

    const platformNames = Array.from(platformMap.keys()).sort((a, b) => a.localeCompare(b, 'tr'));
    const platformSeries: Series[] = platformNames.map((platform, index) => {
      const dateMap = platformMap.get(platform)!;
      return {
        name: platform,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        values: dayPoints.map((day) => dateMap.get(day.key) || 0),
      };
    });

    const totalValues = dayPoints.map((day, idx) => {
      return platformSeries.reduce((sum, s) => sum + s.values[idx], 0);
    });

    const totalSeries: Series = {
      name: 'Toplam',
      color: '#111827',
      values: totalValues,
    };

    const totalRevenueValue = totalValues.reduce((sum, value) => sum + value, 0);

    return {
      days: dayPoints,
      series: [...platformSeries, totalSeries],
      totalRevenue: totalRevenueValue,
    };
  }, [orders]);

  const maxRevenue = useMemo(() => {
    const values = series.flatMap((s) => s.values);
    return Math.max(...values, 0);
  }, [series]);

  const width = 860;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 50, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const pointsBySeries = useMemo(() => {
    if (days.length === 0) return [];
    return series.map((s) => {
      const points = s.values.map((value, index) => {
        const x = padding.left + (index / (days.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (maxRevenue ? (value / maxRevenue) * chartHeight : 0);
        return { x, y, value, label: days[index]?.label };
      });
      return { series: s, points };
    });
  }, [days, series, chartWidth, chartHeight, padding, maxRevenue]);

  const linePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const hoverX = useMemo(() => {
    if (hoverIndex === null || days.length < 2) return null;
    return padding.left + (hoverIndex / (days.length - 1)) * chartWidth;
  }, [hoverIndex, days.length, chartWidth, padding.left]);

  const tooltipData = useMemo(() => {
    if (hoverIndex === null) return null;
    return {
      label: days[hoverIndex]?.label || '',
      series: series.map((s) => ({
        name: s.name,
        value: s.values[hoverIndex] || 0,
        color: s.color,
      })),
    };
  }, [hoverIndex, days, series]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || days.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clamped = Math.min(Math.max(x, padding.left), padding.left + chartWidth);
    const ratio = (clamped - padding.left) / chartWidth;
    const index = Math.round(ratio * (days.length - 1));
    setHoverIndex(index);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Son 14 Gün Platform Bazlı Ciro</h3>
        <p className="text-sm text-gray-600">
          Toplam {formatCurrency(totalRevenue)} · {formatNumber(days.length)} gün
        </p>
      </div>

      {maxRevenue === 0 ? (
        <div className="text-center py-10 text-sm text-gray-500">Son 14 günde satış yok</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="relative w-fit mx-auto">
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="mx-auto"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
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
                    {formatCurrency(maxRevenue * ratio)}
                  </text>
                </g>
              );
            })}

            {hoverX !== null && (
              <line
                x1={hoverX}
                x2={hoverX}
                y1={padding.top}
                y2={padding.top + chartHeight}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
              />
            )}

            {pointsBySeries.map(({ series: currentSeries, points }) => (
              <g key={currentSeries.name}>
                <path
                  d={linePath(points)}
                  fill="none"
                  stroke={currentSeries.color}
                  strokeWidth={currentSeries.name === 'Toplam' ? 2.5 : 2}
                />
                {points.map((point, index) => (
                  <circle
                    key={`${currentSeries.name}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={currentSeries.name === 'Toplam' ? 3.5 : 2.5}
                    fill={currentSeries.color}
                  >
                    <title>
                      {currentSeries.name} · {point.label}: {formatCurrency(point.value)}
                    </title>
                  </circle>
                ))}
              </g>
            ))}

            {days.map((day, index) => {
              if (index % 3 !== 0 && index !== days.length - 1) return null;
              const x = padding.left + (index / (days.length - 1)) * chartWidth;
              return (
                <text
                  key={day.key}
                  x={x}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {day.label}
                </text>
              );
            })}
          </svg>

          {tooltipData && hoverX !== null && (
            <div
              className="absolute top-2 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow"
              style={{ left: hoverX }}
            >
              <div className="font-semibold text-gray-900 mb-1">{tooltipData.label}</div>
              <div className="space-y-1">
                {tooltipData.series.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <div className="font-medium text-gray-900">{formatCurrency(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span>{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
