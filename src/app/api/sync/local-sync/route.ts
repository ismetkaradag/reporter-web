import { NextRequest, NextResponse } from 'next/server';
import { fetchOrdersPage, fetchCustomersPage, fetchProductsPage } from '@/lib/externalApi';
import { syncOrdersToSupabase, syncCustomersToSupabase, syncProductsToSupabase } from '@/lib/supabaseOperations';

/**
 * Local development için full sync endpoint
 * Task mantığı olmadan tüm verileri çeker ve sync eder
 */
export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü - sadece SYNC_TOKEN kabul et
    const authHeader = request.headers.get('authorization');
    const validSyncToken = process.env.SYNC_TOKEN && authHeader === `Bearer ${process.env.SYNC_TOKEN}`;

    if (!validSyncToken) {
      console.log('❌ Unauthorized access attempt');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('🚀 LOCAL SYNC BAŞLADI');
    console.log('⏰ Başlangıç:', new Date().toISOString());
    console.log('\n📦 SİPARİŞLER SYNC EDİLİYOR...');
    let orderPage = 0;
    let totalOrders = 0;
    let hasMoreOrders = true;

    while (hasMoreOrders) {
      console.log(`   📄 Sayfa ${orderPage} çekiliyor...`);
      const ordersData = await fetchOrdersPage(orderPage, 100); // 100'lik paketler
      console.log('Fetched orders data for page', orderPage, ':', ordersData);
      if (ordersData.data && ordersData.data.length > 0) {
        console.log(`   ✅ ${ordersData.data.length} sipariş alındı`);
        await syncOrdersToSupabase(ordersData.data);
        totalOrders += ordersData.data.length;
        console.log(`   💾 Toplam sync edilen: ${totalOrders}`);
      }

      hasMoreOrders = ordersData.hasNextPage;
      orderPage++;

      // İlerleme logu
      if (orderPage % 10 === 0) {
        console.log(`   📊 İlerleme: ${orderPage} sayfa işlendi, ${totalOrders} sipariş sync edildi`);
      }
    }
    console.log(`✅ Siparişler tamamlandı: ${totalOrders} adet`);

// 3. Products Sync
    console.log('\n🛍️ ÜRÜNLER SYNC EDİLİYOR...');
    let productPage = 1;
    let totalProducts = 0;
    let hasMoreProducts = true;

    while (hasMoreProducts) {
      console.log(`   📄 Sayfa ${productPage} çekiliyor...`);
      const productsData = await fetchProductsPage(productPage, 100);

      if (productsData.data && productsData.data.length > 0) {
        console.log(`   ✅ ${productsData.data.length} ürün alındı`);
        await syncProductsToSupabase(productsData.data);
        totalProducts += productsData.data.length;
        console.log(`   💾 Toplam sync edilen: ${totalProducts}`);
      }

      hasMoreProducts = productsData.hasNextPage;
      productPage++;

      if (productPage % 10 === 0) {
        console.log(`   📊 İlerleme: ${productPage} sayfa işlendi, ${totalProducts} ürün sync edildi`);
      }
    }
    console.log(`✅ Ürünler tamamlandı: ${totalProducts} adet`);
    // 1. Orders Sync
    
    // 2. Customers Sync
    console.log('\n👥 MÜŞTERİLER SYNC EDİLİYOR...');
    let customerPage = 1;
    let totalCustomers = 0;
    let hasMoreCustomers = true;

    while (hasMoreCustomers) {
      console.log(`   📄 Sayfa ${customerPage} çekiliyor...`);
      const customersData = await fetchCustomersPage(customerPage, 100);

      if (customersData.data && customersData.data.length > 0) {
        console.log(`   ✅ ${customersData.data.length} müşteri alındı`);
        await syncCustomersToSupabase(customersData.data);
        totalCustomers += customersData.data.length;
        console.log(`   💾 Toplam sync edilen: ${totalCustomers}`);
      }

      hasMoreCustomers = customersData.hasNextPage;
      customerPage++;

      if (customerPage % 10 === 0) {
        console.log(`   📊 İlerleme: ${customerPage} sayfa işlendi, ${totalCustomers} müşteri sync edildi`);
      }
    }
    console.log(`✅ Müşteriler tamamlandı: ${totalCustomers} adet`);

    

    console.log('\n🎉 LOCAL SYNC TAMAMLANDI!');
    console.log('⏰ Bitiş:', new Date().toISOString());
    console.log('📊 ÖZET:');
    console.log(`   - Siparişler: ${totalOrders}`);
    console.log(`   - Müşteriler: ${totalCustomers}`);
    console.log(`   - Ürünler: ${totalProducts}`);

    return NextResponse.json({
      success: true,
      message: 'Full sync completed successfully',
      summary: {
        orders: totalOrders,
        customers: totalCustomers,
        products: totalProducts,
      },
    });
  } catch (error: any) {
    console.error('❌ LOCAL SYNC HATASI:', error);
    console.error('Stack:', error.stack);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
