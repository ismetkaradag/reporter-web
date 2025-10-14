import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET: Tüm SKU'ları listele (hem product SKU hem combination SKU'ları)
 * Dönen format: { sku, name, type: 'product' | 'combination', productName?, attributes? }
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, combinations')
      .order('name', { ascending: true });

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json(
        { error: 'Ürünler yüklenemedi' },
        { status: 500 }
      );
    }

    // SKU listesini oluştur
    const skuList: Array<{
      sku: string;
      name: string;
      type: 'product' | 'combination';
      productName?: string;
      attributes?: string;
    }> = [];

    // Duplicate SKU'ları önlemek için Map kullan
    const skuMap = new Map<string, typeof skuList[0]>();
    products?.forEach((product) => {
      // Ana ürün SKU'su
      if (product.sku && !skuMap.has(product.sku)) {
        skuMap.set(product.sku, {
          sku: product.sku,
          name: product.name,
          type: 'product',
        });
      }

      // Combination SKU'ları
      if (product.combinations && Array.isArray(product.combinations)) {
        product.combinations.forEach((combo: any) => {
          // Sadece SKU kontrolü yap ve duplicate kontrolü
          if (combo.sku && !skuMap.has(combo.sku)) {
            // Attributes'ları string'e çevir
            let attributesStr = '';
            if (combo.attributes && Array.isArray(combo.attributes)) {
              attributesStr = combo.attributes
                .map((attr: any) => `${attr.name}: ${attr.value}`)
                .join(', ');
            }

            skuMap.set(combo.sku, {
              sku: combo.sku,
              name: `${product.name} (${attributesStr || 'Varyasyon'})`,
              type: 'combination',
              productName: product.name,
              attributes: attributesStr,
            });
          }
        });
      }
    });

    // Map'i array'e çevir
    const uniqueSkuList = Array.from(skuMap.values());

    console.log(`📦 Total SKUs: ${uniqueSkuList.length} (Products: ${uniqueSkuList.filter(s => s.type === 'product').length}, Combinations: ${uniqueSkuList.filter(s => s.type === 'combination').length})`);

    // SKU'ya göre sırala
    uniqueSkuList.sort((a, b) => a.sku.localeCompare(b.sku));

    return NextResponse.json({ data: uniqueSkuList });
  } catch (error: any) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
