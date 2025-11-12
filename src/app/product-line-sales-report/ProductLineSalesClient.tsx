'use client';

import { useState, useMemo } from 'react';
import type { Order, Product } from '@/types';
import * as XLSX from 'xlsx';
import { isSuccessfulOrder } from '@/utils/orderUtils';

interface ProductLineSalesClientProps {
  orders: Order[];
  customers: any[];
  reportGroups: any[];
  products: Product[];
}

interface ProductLineRow {
  // Üye bilgileri
  customerEmail: string;
  customerPhone: string;
  customerFirstName: string;
  customerLastName: string;
  customerIdentityNumber: string;
  studentClassName: string;
  membershipName: string;
  campusName: string;

  // Sipariş bilgileri
  customOrderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentSystem: string;
  installment: number;
  orderTotal: number;
  totalItemDiscountAmount: number;
  orderSubTotalDiscountInclTax: number;
  paymentMethodAdditionalFeeInclTax: number;
  created_on: string;

  // Ürün bilgileri
  itemSku: string;
  itemProductName: string;
  itemAttributeInfo: string;
  itemQuantity: number;
  itemUnitPriceInclTax: number;
  itemDiscountInclTax: number;
  itemTotalPriceInclTax: number;
  itemCampaignName: string;
  itemType: 'Tekil Ürün' | 'Set İçi Ürün'; // Ürün tipi
  reportGroups: string; // Ürünün bulunduğu gruplar (virgülle ayrılmış)
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

export default function ProductLineSalesClient({ orders, customers, reportGroups, products }: ProductLineSalesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);

  // Customer ID -> Customer mapping oluştur
  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach((customer) => {
      map.set(customer.id, customer);
    });
    return map;
  }, [customers]);

  // SKU -> Report Groups mapping oluştur
  const skuToGroupsMap = useMemo(() => {
    const map = new Map<string, string[]>();

    reportGroups.forEach((group) => {
      if (group.product_skus && Array.isArray(group.product_skus)) {
        group.product_skus.forEach((sku: string) => {
          if (!map.has(sku)) {
            map.set(sku, []);
          }
          map.get(sku)!.push(group.name);
        });
      }
    });

    return map;
  }, [reportGroups]);

  // SKU -> Product Info mapping oluştur (combinations'dan)
  const skuToProductInfo = useMemo(() => {
    const map = new Map<string, {
      productName: string;
      attributeInfo: string;
      stockQuantity: number;
      price: number;
    }>();

    products.forEach((product) => {
      // Ana ürün SKU'sunu da ekle
      if (product.sku && product.name) {
        map.set(product.sku, {
          productName: product.name,
          attributeInfo: '-',
          stockQuantity: product.stock_quantity || 0,
          price: product.price || 0,
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
              price: combination.overriddenPrice || product.price || 0,
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

  // Kampüs listesini çıkar
  const campuses = useMemo(() => {
    const campusSet = new Set<string>();
    customers.forEach((customer) => {
      if (customer.campus_name) {
        campusSet.add(customer.campus_name);
      }
    });
    return Array.from(campusSet).sort();
  }, [customers]);

  // Başarılı siparişleri filtrele ve ürün satırlarına dönüştür
  const productLineRows = useMemo(() => {
    const rows: ProductLineRow[] = [];

    const successfulOrders = orders.filter(isSuccessfulOrder);

    successfulOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;

      // Customer bilgilerini al
      const customer = customerMap.get(order.customer_id) || {};

      order.items.forEach((item: any) => {
        const quantity = item.quantity || 0;
        const attributeInfo = item.attributeInfo || item.attribute_info || '';

        // Set ürünü mü kontrol et (attributeInfo'da <br /> var)
        const isSetProduct = attributeInfo && attributeInfo.includes('<br />');

        // Ortak sipariş ve üye bilgileri
        const commonData = {
          // Üye bilgileri (customer tablosundan öncelikli)
          customerEmail: customer.email || order.customer_email || '',
          customerPhone: customer.phone || '',
          customerFirstName: customer.first_name || '',
          customerLastName: customer.last_name || '',
          customerIdentityNumber: customer.identity_number || order.identity_number || '',
          studentClassName: customer.student_class_name || order.class || '',
          membershipName: customer.membership_name || order.membership || '',
          campusName: customer.campus_name || order.campus || '',

          // Sipariş bilgileri
          customOrderNumber: order.custom_order_number || '',
          orderStatus: order.order_status || '',
          paymentStatus: order.payment_status || '',
          paymentMethod: order.payment_method || '',
          paymentSystem: order.payment_system || '',
          installment: typeof order.installment === 'number' ? order.installment : (parseInt(order.installment as string, 10) || 0),
          orderTotal: order.order_total || 0,
          totalItemDiscountAmount: order.total_item_discount_amount || 0,
          orderSubTotalDiscountInclTax: order.order_sub_total_discount_incl_tax || 0,
          paymentMethodAdditionalFeeInclTax: order.payment_method_additional_fee_incl_tax || 0,
          created_on: order.created_on || '',
        };

        if (isSetProduct) {
          // Set ürünü - içindeki ürünleri parse et
          const subProducts = parseSetProducts(attributeInfo);

          // Set'in toplam indirimi
          const setTotalDiscount = item.discountInclTax || item.discount_incl_tax || 0;

          // Önce tüm alt ürünlerin gerçek fiyatlarını hesapla
          const subProductsWithPrices = subProducts.map((subProduct) => {
            const lookupKey = `${subProduct.name.trim()}|||${subProduct.attributeValue.trim()}`;
            const sku = productNameAndAttributeToSku.get(lookupKey) || 'UNKNOWN';
            const productInfo = skuToProductInfo.get(sku);
            const realPrice = productInfo?.price || 0;

            return {
              subProduct,
              sku,
              productInfo,
              realPrice,
            };
          });

          // Toplam gerçek fiyat
          const totalRealPrice = subProductsWithPrices.reduce((sum, p) => sum + p.realPrice, 0);

          // Her alt ürün için satır oluştur
          subProductsWithPrices.forEach((productData) => {
            const { subProduct, sku, productInfo, realPrice } = productData;

            // Bu ürüne düşen indirim oranı
            const discountForThisProduct = totalRealPrice > 0
              ? (realPrice / totalRealPrice) * setTotalDiscount
              : 0;

            const productName = productInfo?.productName || subProduct.name;
            const productAttributeInfo = productInfo?.attributeInfo || subProduct.attribute;

            // SKU için grup bilgilerini al
            const groupNames = skuToGroupsMap.get(sku) || [];
            const reportGroupsStr = groupNames.join(', ');

            rows.push({
              ...commonData,
              // Ürün bilgileri
              itemSku: sku,
              itemProductName: productName,
              itemAttributeInfo: productAttributeInfo,
              itemQuantity: quantity,
              itemUnitPriceInclTax: realPrice, // Gerçek birim fiyat (products tablosundan)
              itemDiscountInclTax: discountForThisProduct, // Orantılı indirim
              itemTotalPriceInclTax: item.totalPriceInclTax || item.total_price_incl_tax || 0,
              itemCampaignName: item.campaignName || item.campaign_name || '',
              itemType: 'Set İçi Ürün',
              reportGroups: reportGroupsStr,
            });
          });
        } else {
          // Normal tekil ürün
          const itemSku = item.sku || '';
          const groupNames = skuToGroupsMap.get(itemSku) || [];
          const reportGroupsStr = groupNames.join(', ');

          rows.push({
            ...commonData,
            // Ürün bilgileri
            itemSku,
            itemProductName: item.productName || item.product_name || '',
            itemAttributeInfo: attributeInfo,
            itemQuantity: quantity,
            itemUnitPriceInclTax: item.unitPriceInclTax || item.unit_price_incl_tax || 0,
            itemDiscountInclTax: item.discountInclTax || item.discount_incl_tax || 0,
            itemTotalPriceInclTax: item.totalPriceInclTax || item.total_price_incl_tax || 0,
            itemCampaignName: item.campaignName || item.campaign_name || '',
            itemType: 'Tekil Ürün',
            reportGroups: reportGroupsStr,
          });
        }
      });
    });

    return rows;
  }, [orders, customerMap, skuToGroupsMap, skuToProductInfo, productNameAndAttributeToSku]);

  // Filtreleri uygula
  const filteredRows = useMemo(() => {
    let filtered = productLineRows;

    // Kampüs filtresi
    if (selectedCampuses.length > 0) {
      filtered = filtered.filter((row) =>
        row.campusName && selectedCampuses.includes(row.campusName)
      );
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (row) =>
          row.itemProductName.toLowerCase().includes(query) ||
          row.itemSku.toLowerCase().includes(query) ||
          row.customerEmail.toLowerCase().includes(query) ||
          row.customerFirstName.toLowerCase().includes(query) ||
          row.customerLastName.toLowerCase().includes(query) ||
          row.customOrderNumber.toLowerCase().includes(query) ||
          row.reportGroups.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [productLineRows, selectedCampuses, searchQuery]);

  // Kampüs toggle
  const toggleCampus = (campus: string) => {
    setSelectedCampuses((prev) =>
      prev.includes(campus)
        ? prev.filter((c) => c !== campus)
        : [...prev, campus]
    );
  };

  // Excel export
  const exportToExcel = () => {
    const excelData = filteredRows.map((row) => ({
      'Sipariş No': row.customOrderNumber,
      'Sipariş Tipi': row.customOrderNumber.startsWith('RT') ? 'Değişim' : 'Satış',
      'Üye Ad': row.customerFirstName,
      'Üye Soyad': row.customerLastName,
      'E-posta': row.customerEmail,
      'Telefon': row.customerPhone,
      'TC Kimlik': row.customerIdentityNumber,
      'Sınıf': row.studentClassName,
      'Üyelik': row.membershipName,
      'Kampüs': row.campusName,
      'Ürün SKU': row.itemSku,
      'Ürün Adı': row.itemProductName,
      'Özellik': row.itemAttributeInfo,
      'Ürün Tipi': row.itemType,
      'Gruplar': row.reportGroups,
      'Adet': row.itemQuantity,
      'Birim Fiyat': row.itemUnitPriceInclTax,
      'Ürün İndirimi': row.itemDiscountInclTax,
      'İndirimli Birim Fiyat': row.itemUnitPriceInclTax - row.itemDiscountInclTax,
      'Toplam Fiyat': row.itemTotalPriceInclTax,
      'Kampanya': row.itemCampaignName,
      'Sipariş Durumu': row.orderStatus,
      'Ödeme Durumu': row.paymentStatus,
      'Ödeme Yöntemi': row.paymentMethod,
      'Ödeme Sistemi': row.paymentSystem,
      'Taksit': row.installment,
      'Sipariş Toplamı': row.orderTotal,
      'Ürün İndirimleri Toplamı': row.totalItemDiscountAmount,
      'Sipariş İndirimi': row.orderSubTotalDiscountInclTax,
      'Ödeme Ek Ücreti': row.paymentMethodAdditionalFeeInclTax,
      'Sipariş Tarihi' : new Date(row.created_on).toLocaleDateString('tr-TR'),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);

    // Kolon genişlikleri
    ws['!cols'] = [
      { wch: 20 }, // Sipariş No
      { wch: 12 }, // Sipariş Tipi
      { wch: 15 }, // Üye Ad
      { wch: 15 }, // Üye Soyad
      { wch: 25 }, // E-posta
      { wch: 15 }, // Telefon
      { wch: 15 }, // TC Kimlik
      { wch: 15 }, // Sınıf
      { wch: 15 }, // Üyelik
      { wch: 20 }, // Kampüs
      { wch: 15 }, // Ürün SKU
      { wch: 40 }, // Ürün Adı
      { wch: 30 }, // Özellik
      { wch: 15 }, // Ürün Tipi
      { wch: 25 }, // Gruplar
      { wch: 8 },  // Adet
      { wch: 12 }, // Birim Fiyat
      { wch: 12 }, // Ürün İndirimi
      { wch: 18 }, // İndirimli Birim Fiyat
      { wch: 12 }, // Toplam Fiyat
      { wch: 20 }, // Kampanya
      { wch: 15 }, // Sipariş Durumu
      { wch: 15 }, // Ödeme Durumu
      { wch: 15 }, // Ödeme Yöntemi
      { wch: 15 }, // Ödeme Sistemi
      { wch: 8 },  // Taksit
      { wch: 12 }, // Sipariş Toplamı
      { wch: 20 }, // Ürün İndirimleri Toplamı
      { wch: 15 }, // Sipariş İndirimi
      { wch: 15 }, // Ödeme Ek Ücreti
      { wch: 15 }, // Sipariş Tarihi
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ürünlü Satış Raporu');
    XLSX.writeFile(wb, `urunlu-satis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Para formatı
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ürünlü Satış Raporu</h1>
        <p className="text-gray-600 mt-1">
          Tüm başarılı siparişlerin ürün satır detayları
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

        {/* Arama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ara
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ürün adı, SKU, sipariş no, üye adı, e-posta veya grup..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Satır</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {filteredRows.length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Adet</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {filteredRows.reduce((sum, row) => sum + row.itemQuantity, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Tutar<p className='text-xs'>(Ürüne yapılan indirimler düşülmüştür)<br/>(Siparişe yapılan indirimler düşülmemiştir)</p></div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(filteredRows.reduce((sum, row) => sum + row.itemUnitPriceInclTax, 0))}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampüs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Özellik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Tipi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gruplar</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adet</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Birim Fiyat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                    {searchQuery || selectedCampuses.length > 0
                      ? 'Filtrelere uygun satır bulunamadı'
                      : 'Henüz satış verisi yok'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                      {row.customOrderNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {row.customerFirstName} {row.customerLastName}
                      </div>
                      <div className="text-gray-500 text-xs">{row.customerIdentityNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.campusName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {row.itemSku}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.itemProductName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.itemAttributeInfo}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        row.itemType === 'Set İçi Ürün'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {row.itemType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.reportGroups || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {row.itemQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(row.itemUnitPriceInclTax)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-bold">
                      {formatCurrency(row.orderTotal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{row.paymentMethod}</div>
                      <div className="text-xs text-gray-500">{row.paymentStatus}</div>
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
        Toplam {filteredRows.length} satır gösteriliyor
      </div>
    </div>
  );
}
