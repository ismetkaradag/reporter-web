'use client';

import { useState, useMemo } from 'react';
import type { Order, Product } from '@/types';
import * as XLSX from 'xlsx';
import { isSuccessfulOrder } from '@/utils/orderUtils';

interface ProductSalesClientProps {
  orders: Order[];
  products: Product[];
  campuses: string[];
}

interface ProductSale {
  sku: string;
  productName: string;
  attributeInfo: string;
  individualSales: number; // Tekil satış adedi
  setBundleSales: number;  // Set içi satış adedi
  totalSales: number;      // Toplam satış adedi
  stockQuantity: number;   // Stok miktarı
}

// Set ürünlerinin attributeInfo'sunu parse et
function parseSetProducts(attributeInfo: string): Array<{ name: string; attribute: string; attributeValue: string }> {
  // <br /> ile ayrılmış satırları al
  const lines = attributeInfo
    .split('<br />')
    .map((l) => l.trim())
    .filter(Boolean);

  const products = [];

  // Her 3 satır bir ürünü temsil eder: Ürün Adı, Özellik (Beden), Fiyat
  for (let i = 0; i < lines.length; i += 3) {
    if (i + 1 < lines.length) {
      // i: Ürün Adı, i+1: Özellik (örn: "Beden: M")
      const attributeLine = lines[i + 1];

      // "Beden: M" -> "M" çıkar (: ve boşluktan sonraki kısım)
      let attributeValue = '';
      if (attributeLine.includes(':')) {
        attributeValue = attributeLine.split(':')[1].trim();
      }

      products.push({
        name: lines[i],
        attribute: attributeLine,
        attributeValue,
      });
    }
  }

  return products;
}

type ViewMode = 'combination' | 'product';
type SortBy = 'totalSales' | 'stockQuantity' | 'name';

export default function ProductSalesClient({ orders, products, campuses }: ProductSalesClientProps) {
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('combination');
  const [sortBy, setSortBy] = useState<SortBy>('totalSales');

  // Başarılı siparişleri filtrele
  const successfulOrders = useMemo(() => {
    return orders.filter(isSuccessfulOrder);
  }, [orders]);

  // SKU -> Product Info mapping oluştur (combinations'dan)
  const skuToProductInfo = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      attributeInfo: string;
      stockQuantity: number;
    }>();

    products.forEach((product) => {
      // Ana ürün SKU'sunu da ekle
      if (product.sku && product.name) {
        map.set(product.sku, {
          productName: product.name,
          attributeInfo: '-',
          stockQuantity: product.stock_quantity || 0,
        });
      }

      // Combinations'daki SKU'ları ekle
      if (product.combinations && Array.isArray(product.combinations) && product.name) {
        product.combinations.forEach((combination: any) => {
          if (combination.sku) {
            // Combination attributes'larını formatla
            let attributeInfo = '-';
            if (combination.attributes && Array.isArray(combination.attributes)) {
              attributeInfo = combination.attributes
                .map((attr: any) => `${attr.name}: ${attr.value}`)
                .join(', ');
            }

            map.set(combination.sku, {
              productName: product.name,
              attributeInfo,
              stockQuantity: combination.stockQuantity || 0,
            });
          }
        });
      }
    });

    return map;
  }, [products]);

  // ProductName + AttributeValue -> Combination SKU mapping (set ürünleri için)
  const productNameAndAttributeToSku = useMemo(() => {
    const map = new Map<string, string>();

    products.forEach((product) => {
      if (!product.name || !product.combinations) return;

      // Her combination için productName + attributeValue -> SKU mapping
      if (Array.isArray(product.combinations)) {
        product.combinations.forEach((combination: any) => {
          if (!combination.sku || !combination.attributes) return;

          // Her attribute value için mapping oluştur
          combination.attributes.forEach((attr: any) => {
            if (attr.value) {
              const key = `${product.name.trim()}|||${attr.value.trim()}`;
              map.set(key, combination.sku);
            }
          });
        });
      }
    });

    return map;
  }, [products]);

  // Ürün satışlarını hesapla
  const productSales = useMemo(() => {
    // Kampüs filtresi uygula
    let filteredOrders = successfulOrders;
    if (selectedCampuses.length > 0) {
      filteredOrders = filteredOrders.filter((order) =>
        order.campus && selectedCampuses.includes(order.campus)
      );
    }

    // Ürünleri topla
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
            // ProductName + AttributeValue ile combination SKU'sunu bul
            const lookupKey = `${subProduct.name.trim()}|||${subProduct.attributeValue.trim()}`;
            const sku = productNameAndAttributeToSku.get(lookupKey) || 'UNKNOWN';

            // SKU ile products tablosundan ürün bilgilerini al
            const productInfo = skuToProductInfo.get(sku);

            // Eğer products tablosunda bulunduysa oradan al, bulunamadıysa set item'dan al
            const productName = productInfo?.productName || subProduct.name;
            const attributeInfo = productInfo?.attributeInfo || subProduct.attribute;
            const stockQuantity = productInfo?.stockQuantity || 0;

            const key = `${sku}|||${productName}|||${attributeInfo}`;

            if (productMap.has(key)) {
              const existing = productMap.get(key)!;
              existing.setBundleSales += quantity;
              existing.totalSales += quantity;
            } else {
              productMap.set(key, {
                sku,
                productName,
                attributeInfo,
                individualSales: 0,
                setBundleSales: quantity,
                totalSales: quantity,
                stockQuantity,
              });
            }
          });
        } else {
          // Normal tekil ürün
          const sku = item.sku || 'UNKNOWN';

          // SKU ile products tablosundan ürün bilgilerini al
          const productInfo = skuToProductInfo.get(sku);

          // Eğer products tablosunda bulunduysa oradan al, bulunamadıysa order item'dan al
          const productName = productInfo?.productName || item.productName || 'Bilinmeyen Ürün';
          const attributeInfo = productInfo?.attributeInfo || item.attributeInfo || '-';
          const stockQuantity = productInfo?.stockQuantity || 0;

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
              stockQuantity,
            });
          }
        }
      });
    });

    return Array.from(productMap.values());
  }, [successfulOrders, selectedCampuses, skuToProductInfo, productNameAndAttributeToSku]);

  // Ürün bazlı gruplama (aynı productName'e göre)
  const productBasedSales = useMemo(() => {
    const productMap = new Map<string, ProductSale>();

    productSales.forEach((sale) => {
      const productName = sale.productName;

      if (productMap.has(productName)) {
        const existing = productMap.get(productName)!;
        existing.individualSales += sale.individualSales;
        existing.setBundleSales += sale.setBundleSales;
        existing.totalSales += sale.totalSales;
        existing.stockQuantity += sale.stockQuantity;
      } else {
        // İlk kez ekleniyorsa, SKU'yu ana ürün SKU'su ile değiştir
        // ProductName'den SKU bul
        let mainSku = sale.sku;

        // Products listesinden bu ürünün ana SKU'sunu bul (case-insensitive)
        const matchingProduct = products.find(
          p => p.name && p.name.trim().toLowerCase() === productName.trim().toLowerCase()
        );
        if (matchingProduct && matchingProduct.sku) {
          mainSku = matchingProduct.sku;
        }

        productMap.set(productName, {
          sku: mainSku,
          productName,
          attributeInfo: '', // Ürün bazlı görünümde özellik yok
          individualSales: sale.individualSales,
          setBundleSales: sale.setBundleSales,
          totalSales: sale.totalSales,
          stockQuantity: sale.stockQuantity,
        });
      }
    });

    return Array.from(productMap.values());
  }, [productSales, products]);

  // View mode'a göre hangi data'yı kullanacağımıza karar ver
  const displayData = viewMode === 'combination' ? productSales : productBasedSales;

  // Arama filtresi uygula
  const searchFilteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return displayData;

    const query = searchQuery.toLowerCase();
    return displayData.filter(
      (product) =>
        product.productName.toLowerCase().includes(query) ||
        product.attributeInfo.toLowerCase().includes(query)
    );
  }, [displayData, searchQuery]);

  // Sıralama uygula
  const filteredProducts = useMemo(() => {
    const sorted = [...searchFilteredProducts];

    switch (sortBy) {
      case 'totalSales':
        sorted.sort((a, b) => b.totalSales - a.totalSales);
        break;
      case 'stockQuantity':
        sorted.sort((a, b) => b.stockQuantity - a.stockQuantity);
        break;
      case 'name':
        sorted.sort((a, b) => a.productName.localeCompare(b.productName, 'tr'));
        break;
    }

    return sorted;
  }, [searchFilteredProducts, sortBy]);

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
    const excelData = filteredProducts.map((product) => {
      const baseData: any = {
        'SKU': product.sku,
        'Ürün Adı': product.productName,
      };

      // Kombinasyon bazlı görünümde özellik sütunu ekle
      if (viewMode === 'combination') {
        baseData['Özellik'] = product.attributeInfo;
      }

      baseData['Stok Miktarı'] = product.stockQuantity;
      baseData['Tekil Satış'] = product.individualSales;
      baseData['Set İçi Satış'] = product.setBundleSales;
      baseData['Toplam Satış'] = product.totalSales;

      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    const cols = [
      { wch: 15 }, // SKU
      { wch: 40 }, // Ürün Adı
    ];

    if (viewMode === 'combination') {
      cols.push({ wch: 30 }); // Özellik
    }

    cols.push(
      { wch: 12 }, // Stok Miktarı
      { wch: 12 }, // Tekil Satış
      { wch: 12 }, // Set İçi Satış
      { wch: 12 }  // Toplam Satış
    );

    ws['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürün Satış Raporu');
    XLSX.writeFile(wb, `urun-satis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ürün Stok-Satış Raporu</h1>
      </div>

      {/* Görünüm Modu ve Sıralama */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Görünüm Modu Switch */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Görünüm:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('combination')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'combination'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Kombinasyon Bazlı
              </button>
              <button
                onClick={() => setViewMode('product')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'product'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ürün Bazlı
              </button>
            </div>
          </div>

          {/* Sıralama Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Sırala:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="totalSales">En Çok Satılanlar</option>
              <option value="stockQuantity">Stok Miktarı</option>
              <option value="name">İsim (A-Z)</option>
            </select>
          </div>
        </div>
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
                {viewMode === 'combination' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Özellik
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stok Miktarı
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
                  <td colSpan={viewMode === 'combination' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
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
                    {viewMode === 'combination' && (
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {product.attributeInfo}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {product.stockQuantity}
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
