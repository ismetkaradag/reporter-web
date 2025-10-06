'use client';

import { useState, useMemo } from 'react';
import type { Order } from '@/types';
import * as XLSX from 'xlsx';
import { isSuccessfulOrder } from '@/utils/orderUtils';

interface ProductSalesClientProps {
  orders: Order[];
  campuses: string[];
}

interface ProductSale {
  sku: string;
  productName: string;
  attributeInfo: string;
  individualSales: number; // Tekil satış adedi
  setBundleSales: number;  // Set içi satış adedi
  totalSales: number;      // Toplam satış adedi
}

// Set ürünlerinin attributeInfo'sunu parse et
function parseSetProducts(attributeInfo: string): Array<{ name: string; attribute: string }> {
  // <br /> ile ayrılmış satırları al
  const lines = attributeInfo
    .split('<br />')
    .map((l) => l.trim())
    .filter(Boolean);

  const products = [];

  // Her 3 satır bir ürünü temsil eder: Ürün Adı, Özellik (Beden), Fiyat
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 1 < lines.length) {
      // i: Ürün Adı, i+1: Özellik
      products.push({
        name: lines[i],
        attribute: lines[i + 1],
      });
    }
  }

  return products;
}

export default function ProductSalesClient({ orders, campuses }: ProductSalesClientProps) {
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Başarılı siparişleri filtrele
  const successfulOrders = useMemo(() => {
    return orders.filter(isSuccessfulOrder);
  }, [orders]);

  // Ürün satışlarını hesapla
  const productSales = useMemo(() => {
    // Kampüs filtresi uygula
    let filteredOrders = successfulOrders;
    if (selectedCampuses.length > 0) {
      filteredOrders = filteredOrders.filter((order) =>
        order.campus && selectedCampuses.includes(order.campus)
      );
    }

    // 1. ProductName -> SKU mapping oluştur (tüm siparişlerden)
    const productNameToSku = new Map<string, string>();
    successfulOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;
      order.items.forEach((item: any) => {
        if (item.productName && item.sku) {
          productNameToSku.set(item.productName.trim(), item.sku);
        }
      });
    });

    // 2. Ürünleri topla
    const productMap = new Map<string, ProductSale>();

    filteredOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;

      order.items.forEach((item: any) => {
        const quantity = item.quantity || 0;

        // Set ürünü mü kontrol et (attributeInfo'da <br /> var)
        const isSetProduct = item.attributeInfo && item.attributeInfo.includes('<br />');

        if (isSetProduct) {
          // Set ürünü - içindeki ürünleri parse et
          const subProducts = parseSetProducts(item.attributeInfo);

          subProducts.forEach((subProduct) => {
            const sku = productNameToSku.get(subProduct.name.trim()) || 'UNKNOWN';
            const key = `${sku}|||${subProduct.name}|||${subProduct.attribute}`;

            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.setBundleSales += quantity;
              existing.totalSales += quantity;
            } else {
              productMap.set(key, {
                sku,
                productName: subProduct.name,
                attributeInfo: subProduct.attribute,
                individualSales: 0,
                setBundleSales: quantity,
                totalSales: quantity,
              });
            }
          });
        } else {
          // Normal tekil ürün
          const sku = item.sku || 'UNKNOWN';
          const productName = item.productName || 'Bilinmeyen Ürün';
          const attributeInfo = item.attributeInfo || '-';
          const key = `${sku}|||${productName}|||${attributeInfo}`;

          if (productMap.has(key)) {
            const existing = productMap.get(key)!;
            existing.individualSales += quantity;
            existing.totalSales += quantity;
          } else {
            productMap.set(key, {
              sku,
              productName,
              attributeInfo,
              individualSales: quantity,
              setBundleSales: 0,
              totalSales: quantity,
            });
          }
        }
      });
    });

    return Array.from(productMap.values());
  }, [successfulOrders, selectedCampuses]);

  // Arama filtresi uygula
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return productSales;

    const query = searchQuery.toLowerCase();
    return productSales.filter(
      (product) =>
        product.productName.toLowerCase().includes(query) ||
        product.attributeInfo.toLowerCase().includes(query)
    );
  }, [productSales, searchQuery]);

  // Toplam istatistikler
  const totalStats = useMemo(() => {
    const totalIndividual = filteredProducts.reduce((sum, p) => sum + p.individualSales, 0);
    const totalSetBundle = filteredProducts.reduce((sum, p) => sum + p.setBundleSales, 0);
    const totalSales = filteredProducts.reduce((sum, p) => sum + p.totalSales, 0);
    return { totalIndividual, totalSetBundle, totalSales };
  }, [filteredProducts]);

  // Kampüs seçimi toggle
  const toggleCampus = (campus: string) => {
    setSelectedCampuses((prev) =>
      prev.includes(campus)
        ? prev.filter((c) => c !== campus)
        : [...prev, campus]
    );
  };

  // Excel export
  const exportToExcel = () => {
    const excelData = filteredProducts.map((product) => ({
      'SKU': product.sku,
      'Ürün Adı': product.productName,
      'Özellik': product.attributeInfo,
      'Tekil Satış': product.individualSales,
      'Set İçi Satış': product.setBundleSales,
      'Toplam Satış': product.totalSales,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    ws['!cols'] = [
      { wch: 15 }, // SKU
      { wch: 40 }, // Ürün Adı
      { wch: 30 }, // Özellik
      { wch: 12 }, // Tekil Satış
      { wch: 12 }, // Set İçi Satış
      { wch: 12 }, // Toplam Satış
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürün Satış Raporu');
    XLSX.writeFile(wb, `urun-satis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ürün Satış Raporu</h1>
        <p className="text-sm text-gray-600 mt-1">
          Sadece başarılı siparişlerdeki ürünler gösterilmektedir
        </p>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
        {/* Kampüs Filtresi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kampüs Filtresi ({selectedCampuses.length} seçili)
          </label>
          <div className="flex flex-wrap gap-2">
            {campuses.map((campus) => (
              <button
                key={campus}
                onClick={() => toggleCampus(campus)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCampuses.includes(campus)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {campus}
              </button>
            ))}
          </div>
          {selectedCampuses.length > 0 && (
            <button
              onClick={() => setSelectedCampuses([])}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Tümünü Temizle
            </button>
          )}
        </div>

        {/* Ürün Arama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ürün Ara
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ürün adı veya özellik ara..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Ürün Çeşidi</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {filteredProducts.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tekil Satış Adedi</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {totalStats.totalIndividual}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Set İçi Satış Adedi</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {totalStats.totalSetBundle}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Satış Adedi</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {totalStats.totalSales}
          </div>
        </div>
      </div>

      {/* Excel Export Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <span>📥</span>
          <span>Excel İndir</span>
        </button>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ürün Adı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Özellik
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tekil Satış
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Set İçi Satış
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Satış
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery || selectedCampuses.length > 0
                      ? 'Filtrelere uygun ürün bulunamadı'
                      : 'Henüz satış verisi yok'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.productName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.attributeInfo}
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600 text-right font-medium">
                      {product.individualSales}
                    </td>
                    <td className="px-6 py-4 text-sm text-purple-600 text-right font-medium">
                      {product.setBundleSales}
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right font-bold">
                      {product.totalSales}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer bilgi */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        Toplam {filteredProducts.length} ürün gösteriliyor
      </div>
    </div>
  );
}
