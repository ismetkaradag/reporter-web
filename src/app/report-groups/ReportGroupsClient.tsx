'use client';

import { useState, useEffect } from 'react';
import type { ReportGroup, ReportGroupInput } from '@/types';

interface ProductSKU {
  sku: string;
  name: string;
  type: 'product' | 'combination';
  productName?: string;
  attributes?: string;
}

export default function ReportGroupsClient() {
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [productSkus, setProductSkus] = useState<ProductSKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ReportGroup | null>(null);

  // Form state
  const [formData, setFormData] = useState<ReportGroupInput>({
    name: '',
    description: '',
    product_skus: [],
    color: '#3B82F6',
  });

  // SKU arama
  const [skuSearch, setSkuSearch] = useState('');

  // Grupları yükle
  useEffect(() => {
    loadGroups();
    loadProductSkus();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/report-groups');
      const result = await response.json();
      if (result.data) {
        setGroups(result.data);
      }
    } catch (error) {
      console.error('Gruplar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductSkus = async () => {
    try {
      const response = await fetch('/api/products');
      const result = await response.json();
      if (result.data) {
        setProductSkus(result.data);
      }
    } catch (error) {
      console.error('SKU\'lar yüklenemedi:', error);
    }
  };

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      description: '',
      product_skus: [],
      color: '#3B82F6',
    });
    setShowModal(true);
  };

  const handleEditGroup = (group: ReportGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      product_skus: group.product_skus,
      color: group.color || '#3B82F6',
    });
    setShowModal(true);
  };

  const handleSaveGroup = async () => {
    try {
      const url = editingGroup
        ? `/api/report-groups/${editingGroup.id}`
        : '/api/report-groups';

      const method = editingGroup ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Bir hata oluştu');
        return;
      }

      await loadGroups();
      setShowModal(false);
    } catch (error) {
      console.error('Grup kaydedilemedi:', error);
      alert('Grup kaydedilemedi');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/report-groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Grup silinemedi');
        return;
      }

      await loadGroups();
    } catch (error) {
      console.error('Grup silinemedi:', error);
      alert('Grup silinemedi');
    }
  };

  const toggleSku = (sku: string) => {
    setFormData((prev) => {
      const isSelected = prev.product_skus.includes(sku);
      return {
        ...prev,
        product_skus: isSelected
          ? prev.product_skus.filter((s) => s !== sku)
          : [...prev.product_skus, sku],
      };
    });
  };

  const selectAllFiltered = () => {
    const filteredSkuList = filteredSkus.map((item) => item.sku);
    setFormData((prev) => ({
      ...prev,
      product_skus: filteredSkuList,
    }));
  };

  // SKU arama filtresi
  const filteredSkus = productSkus.filter((item) => {
    const searchLower = skuSearch.toLowerCase();
    return (
      item.sku.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-xl">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rapor Gruplandırma</h1>
          <p className="text-gray-600 mt-1">
            Ürünleri gruplara ayırarak raporlarınızı daha organize hale getirin
          </p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Yeni Grup
        </button>
      </div>

      {/* Grup listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 text-lg">Henüz grup oluşturulmamış</p>
            <p className="text-gray-400 text-sm mt-2">
              "Yeni Grup" butonuna tıklayarak ilk grubunuzu oluşturun
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-md p-5 border-l-4 hover:shadow-lg transition"
              style={{ borderLeftColor: group.color || '#3B82F6' }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Sil
                  </button>
                </div>
              </div>
              {group.description && (
                <p className="text-gray-600 text-sm mb-3">{group.description}</p>
              )}
              <div className="text-sm text-gray-500">
                <span className="font-medium">{group.product_skus.length}</span> SKU
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {editingGroup ? 'Grup Düzenle' : 'Yeni Grup Oluştur'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-4">
                {/* Grup Adı */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grup Adı *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: Kıyafet"
                  />
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Grup hakkında kısa açıklama"
                    rows={2}
                  />
                </div>

                {/* Renk */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Renk
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                </div>

                {/* SKU Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ürün SKU'ları ({formData.product_skus.length} seçili)
                  </label>

                  {/* Arama */}
                  <input
                    type="text"
                    value={skuSearch}
                    onChange={(e) => setSkuSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="SKU veya ürün adı ile ara..."
                  />

                  {/* Tümünü Seç Butonu */}
                  {filteredSkus.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="w-full px-3 py-2 mb-3 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium"
                    >
                      Filtrelenenlerin Tümünü Seç ({filteredSkus.length})
                    </button>
                  )}

                  {/* SKU listesi */}
                  <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                    {filteredSkus.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        SKU bulunamadı
                      </div>
                    ) : (
                      filteredSkus.map((item) => (
                        <label
                          key={item.sku}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={formData.product_skus.includes(item.sku)}
                            onChange={() => toggleSku(item.sku)}
                            className="mr-3 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              SKU: {item.sku}
                              {item.type === 'combination' && (
                                <span className="ml-2 text-purple-600">(Varyasyon)</span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {editingGroup ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
