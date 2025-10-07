'use client';

import { useMemo } from 'react';
import type { Order } from '@/types';

interface OrderHeatmapProps {
  orders: Order[];
}

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

export default function OrderHeatmap({ orders }: OrderHeatmapProps) {
  // Heatmap verisi: [gün][saat] = sipariş sayısı
  const heatmapData = useMemo(() => {
    const data: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    orders.forEach((order) => {
      const date = new Date(order.created_on);
      const dayOfWeek = date.getDay(); // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
      const hour = date.getHours(); // 0-23

      // Pazartesi'den başlatmak için mapping
      // JavaScript: 0=Pazar, 1=Pazartesi, 2=Salı, ..., 6=Cumartesi
      // İstediğimiz: 0=Pazartesi, 1=Salı, ..., 6=Pazar
      let mappedDay;
      if (dayOfWeek === 0) {
        mappedDay = 6; // Pazar -> index 6
      } else {
        mappedDay = dayOfWeek - 1; // Pazartesi(1)->0, Salı(2)->1, ..., Cumartesi(6)->5
      }

      data[mappedDay][hour]++;
    });

    return data;
  }, [orders]);

  // Maksimum sipariş sayısını bul (renk skalası için)
  const maxOrders = useMemo(() => {
    let max = 0;
    heatmapData.forEach((dayData) => {
      dayData.forEach((count) => {
        if (count > max) max = count;
      });
    });
    return max;
  }, [heatmapData]);

  // Renk hesaplama fonksiyonu (0 = beyaz, max = koyu mavi)
  const getColor = (count: number): string => {
    if (count === 0) return 'bg-gray-50';

    const intensity = count / maxOrders;

    // Kırmızı tonları: açık kırmızıdan koyu kırmızıya
    if (intensity <= 0.2) return 'bg-red-100';
    if (intensity <= 0.4) return 'bg-red-200';
    if (intensity <= 0.6) return 'bg-red-300';
    if (intensity <= 0.8) return 'bg-red-400';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Sipariş Yoğunluk Haritası
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Siparişlerin gün ve saate göre dağılımı (Tüm zamanlar)
      </p>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 bg-gray-50 text-xs font-medium text-gray-700 w-24">
                  Gün
                </th>
                {HOURS.map((hour) => (
                  <th
                    key={hour}
                    className="border border-gray-200 p-2 bg-gray-50 text-xs font-medium text-gray-700 w-10 text-center"
                  >
                    {hour.toString().padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIndex) => (
                <tr key={day}>
                  <td className="border border-gray-200 p-2 bg-gray-50 text-sm font-medium text-gray-700">
                    {day}
                  </td>
                  {HOURS.map((hour) => {
                    const count = heatmapData[dayIndex][hour];
                    const colorClass = getColor(count);

                    return (
                      <td
                        key={hour}
                        className={`border border-gray-200 p-2 text-center cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 ${colorClass}`}
                        title={`${day} ${hour.toString().padStart(2, '0')}:00 - ${count} sipariş`}
                      >
                        <span className="text-xs font-medium text-gray-800">
                          {count > 0 ? count : ''}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renk skalası göstergesi */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <span className="text-sm text-gray-600">Az</span>
        <div className="flex gap-1">
          <div className="w-8 h-4 bg-gray-50 border border-gray-200"></div>
          <div className="w-8 h-4 bg-red-100 border border-gray-200"></div>
          <div className="w-8 h-4 bg-red-200 border border-gray-200"></div>
          <div className="w-8 h-4 bg-red-300 border border-gray-200"></div>
          <div className="w-8 h-4 bg-red-400 border border-gray-200"></div>
          <div className="w-8 h-4 bg-red-500 border border-gray-200"></div>
        </div>
        <span className="text-sm text-gray-600">Çok</span>
        <span className="text-sm text-gray-500 ml-4">
          (Max: {maxOrders} sipariş)
        </span>
      </div>
    </div>
  );
}
