'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { hasMultipleCampuses } from '@/utils/campusUtils';

interface ProductLineRow {
  customerEmail: string;
  customerPhone: string;
  customerFirstName: string;
  customerLastName: string;
  customerIdentityNumber: string;
  studentClassName: string;
  membershipName: string;
  campusName: string;
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
  cargo_fee: number;
  itemSku: string;
  itemProductName: string;
  itemAttributeInfo: string;
  itemQuantity: number;
  itemUnitPriceInclTax: number;
  itemDiscountInclTax: number;
  itemTotalPriceInclTax: number;
  itemCampaignName: string;
  itemType: 'Tekil Ürün' | 'Set İçi Ürün';
  itemTaxAmount: number;
  erpStatus: string;
  reportGroups: string;
}

interface ReportTotals {
  totalQuantity: number;
  totalAmount: number;
}

interface ProductLineReportResponse {
  rows: ProductLineRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  totals: ReportTotals;
  campuses: string[];
}

export default function ProductLineSalesClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [campuses, setCampuses] = useState<string[]>([]);
  const showCampusFilter = useMemo(() => hasMultipleCampuses(), []);
  const showCampusColumn = campuses.length > 1;
  const tableColumnCount = showCampusColumn ? 14 : 13;
  const [rows, setRows] = useState<ProductLineRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totals, setTotals] = useState<ReportTotals>({ totalQuantity: 0, totalAmount: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(200);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const exportInFlightRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCampuses, pageSize]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }
        if (selectedCampuses.length > 0) {
          params.set('campuses', selectedCampuses.join(','));
        }

        const response = await fetch(`/api/product-line-sales-report?${params.toString()}`);
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Rapor verisi alınamadı');
        }

        const result = (await response.json()) as ProductLineReportResponse;
        setRows(result.rows || []);
        setTotalRows(result.totalRows || 0);
        setTotals(result.totals || { totalQuantity: 0, totalAmount: 0 });
        setCampuses(result.campuses || []);
      } catch (error: any) {
        setErrorMessage(error.message || 'Rapor verisi alınamadı');
        setRows([]);
        setTotalRows(0);
        setTotals({ totalQuantity: 0, totalAmount: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, debouncedSearch, selectedCampuses]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalRows / pageSize));
  }, [totalRows, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const toggleCampus = (campus: string) => {
    setSelectedCampuses((prev) =>
      prev.includes(campus)
        ? prev.filter((c) => c !== campus)
        : [...prev, campus]
    );
  };

  const exportToExcel = async () => {
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      if (selectedCampuses.length > 0) {
        params.set('campuses', selectedCampuses.join(','));
      }

      const response = await fetch(`/api/product-line-sales-report/export?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Excel indirilemedi');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const fileName = match?.[1] || `urunlu-satis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setErrorMessage(error.message || 'Excel indirilemedi');
    } finally {
      setIsExporting(false);
      exportInFlightRef.current = false;
    }
  };

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

      {errorMessage && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
        {/* Kampüs Filtresi */}
        {showCampusFilter && (
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
        )}

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
            {totalRows}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Adet</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {totals.totalQuantity}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">
            Toplam Tutar
            <p className="text-xs">
              (Ürüne yapılan indirimler düşülmüştür)
              <br />
              (Siparişe yapılan indirimler düşülmemiştir)
            </p>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {formatCurrency(totals.totalAmount)}
          </div>
        </div>
      </div>

      {/* Excel Export Button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Sayfa {page} / {totalPages} · Toplam {totalRows} satır
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page <= 1 || isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Önceki
          </button>
          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || isLoading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              page >= totalPages || isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Sonraki
          </button>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
            disabled={isLoading}
          >
            <option value={100}>100 / sayfa</option>
            <option value={200}>200 / sayfa</option>
            <option value={500}>500 / sayfa</option>
          </select>
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isExporting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span>📥</span>
            <span>{isExporting ? 'Hazırlanıyor...' : 'Excel İndir'}</span>
          </button>
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sipariş No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye</th>
                {showCampusColumn && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kampüs</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Özellik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün Tipi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gruplar</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Adet</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Birim Fiyat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vergi Tutarı</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ödeme</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Fatura</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={tableColumnCount} className="px-6 py-8 text-center text-gray-500">
                    Yükleniyor...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnCount} className="px-6 py-8 text-center text-gray-500">
                    {debouncedSearch || selectedCampuses.length > 0
                      ? 'Filtrelere uygun satır bulunamadı'
                      : 'Henüz satış verisi yok'}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={`${row.customOrderNumber}-${row.itemSku}-${index}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">
                      {row.customOrderNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">
                        {row.customerFirstName} {row.customerLastName}
                      </div>
                      <div className="text-gray-500 text-xs">{row.customerIdentityNumber}</div>
                    </td>
                    {showCampusColumn && (
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {row.campusName}
                      </td>
                    )}
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
                    <td className="px-4 py-3 text-sm text-orange-600 text-right">
                      {formatCurrency(row.itemTaxAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-bold">
                      {formatCurrency(row.orderTotal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{row.paymentMethod}</div>
                      <div className="text-xs text-gray-500">{row.paymentStatus}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {row.erpStatus || '-'}
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
        Bu sayfada {rows.length} satır gösteriliyor
      </div>
    </div>
  );
}
