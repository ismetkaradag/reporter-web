import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchOrdersPage, fetchCustomersPage, fetchProductsPage } from '@/lib/externalApi';
import { syncOrdersToSupabase, syncCustomersToSupabase, syncProductsToSupabase } from '@/lib/supabaseOperations';
import type { SyncType, SyncTask } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Task-based senkronizasyon cron job endpoint'i
 *
 * Her 10 dakikada bir çalışır:
 * 1. Eğer SYNC_DATETIME'dan sonraysa ve bugün task yoksa -> task oluştur
 * 2. Pending taskları işle (5 sayfa/task)
 *
 * Auth:
 * - CRON_SECRET: Vercel cron job için
 * - SYNC_TOKEN: Manuel çalıştırma için
 */
export async function GET(request: NextRequest) {
  try {
    // Auth kontrolü
    const authHeader = request.headers.get('authorization');
    const validCronSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const validSyncToken = process.env.SYNC_TOKEN && authHeader === `Bearer ${process.env.SYNC_TOKEN}`;

    if (!validCronSecret && !validSyncToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SYNC_DATETIME kontrolü (örn: "21:00")
    const syncDatetime = process.env.SYNC_DATETIME || '21:00';
    const shouldCreateTasks = checkShouldCreateTasks(syncDatetime);

    const now = new Date();
    console.log(`🔄 Sync-all cron çalıştı`);
    console.log(`   SYNC_DATETIME: ${syncDatetime}`);
    console.log(`   Şu an: ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} (${now.getHours()}:${now.getMinutes()})`);
    console.log(`   shouldCreateTasks: ${shouldCreateTasks}`);

    if (shouldCreateTasks) {
      // Bugün task oluşturulmuş mu kontrol et
      const tasksCreatedToday = await checkTasksCreatedToday(supabase);
      console.log(`   tasksCreatedToday: ${tasksCreatedToday}`);

      if (!tasksCreatedToday) {
        console.log('📝 Yeni tasklar oluşturuluyor...');
        const createdTasks = await createAllTasks(supabase);

        return NextResponse.json({
          success: true,
          message: 'Tasklar oluşturuldu',
          tasksCreated: createdTasks.length,
          tasks: createdTasks,
        });
      } else {
        console.log('ℹ️  Bugün tasklar zaten oluşturulmuş, pending tasklar işleniyor...');
      }
    } else {
      console.log(`ℹ️  Henüz SYNC_DATETIME'a ulaşılmadı, bekleniyor...`);
    }

    // Pending taskları işle
    console.log('⚙️ Pending tasklar işleniyor...');
    const result = await processPendingTasks(supabase);

    return NextResponse.json({
      success: true,
      message: 'Task işleme tamamlandı',
      ...result,
    });

  } catch (error: any) {
    console.error('❌ Sync-all hatası:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Şu anki saat SYNC_DATETIME'dan sonra mı kontrol et
 * Desteklenen formatlar: "21:00", "21.00", "9:30", "09:30"
 */
function checkShouldCreateTasks(syncDatetime: string): boolean {
  const now = new Date();

  // Hem ":" hem "." formatını destekle
  const separator = syncDatetime.includes(':') ? ':' : '.';
  const [targetHourStr, targetMinuteStr] = syncDatetime.split(separator);

  const targetHour = parseInt(targetHourStr, 10);
  const targetMinute = parseInt(targetMinuteStr || '0', 10);

  // Geçersiz format kontrolü
  if (isNaN(targetHour) || isNaN(targetMinute)) {
    console.error(`❌ Geçersiz SYNC_DATETIME formatı: "${syncDatetime}". Örnek: "21:00" veya "21.00"`);
    return false;
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  console.log(`   Parse edildi: Hedef=${targetHour}:${targetMinute}, Şu an=${currentHour}:${currentMinute}`);

  // Hedef saate eşit veya sonrasındaysa true
  if (currentHour > targetHour) return true;
  if (currentHour === targetHour && currentMinute >= targetMinute) return true;

  return false;
}

/**
 * Bugün task oluşturulmuş mu kontrol et
 */
async function checkTasksCreatedToday(supabase: any): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase
    .from('sync_tasks')
    .select('id, sync_type, created_at')
    .gte('created_at', `${today}T00:00:00`)
    .limit(10);

  if (error) {
    console.error('   ❌ Task kontrol hatası:', error);
    return false;
  }

  console.log(`   Bugün oluşturulan task sayısı: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log(`   İlk task: ${data[0].sync_type} - ${data[0].created_at}`);
  }

  return data && data.length > 0;
}

/**
 * Tüm sync tipleri için taskları oluştur
 */
async function createAllTasks(supabase: any): Promise<SyncTask[]> {
  const createdTasks: SyncTask[] = [];

  // Orders için tasklar
  try {
    const ordersResponse = await fetchOrdersPage(1, 100);
    const ordersTasks = await createTasksForType(supabase, 'orders', ordersResponse.totalPages);
    createdTasks.push(...ordersTasks);
    console.log(`✅ Orders için ${ordersTasks.length} task oluşturuldu (toplam ${ordersResponse.totalPages} sayfa)`);
  } catch (error) {
    console.error('❌ Orders task oluşturma hatası:', error);
  }

  // Users için tasklar
  try {
    const usersResponse = await fetchCustomersPage(1, 100);
    const usersTasks = await createTasksForType(supabase, 'users', usersResponse.totalPages);
    createdTasks.push(...usersTasks);
    console.log(`✅ Users için ${usersTasks.length} task oluşturuldu (toplam ${usersResponse.totalPages} sayfa)`);
  } catch (error) {
    console.error('❌ Users task oluşturma hatası:', error);
  }

  // Products için tasklar
  try {
    const productsResponse = await fetchProductsPage(1, 100);
    const productsTasks = await createTasksForType(supabase, 'products', productsResponse.totalPages);
    createdTasks.push(...productsTasks);
    console.log(`✅ Products için ${productsTasks.length} task oluşturuldu (toplam ${productsResponse.totalPages} sayfa)`);
  } catch (error) {
    console.error('❌ Products task oluşturma hatası:', error);
  }

  return createdTasks;
}

/**
 * Belirli bir sync tipi için 5'er sayfa gruplarında tasklar oluştur
 */
async function createTasksForType(
  supabase: any,
  syncType: SyncType,
  totalPages: number
): Promise<SyncTask[]> {
  const tasks: Partial<SyncTask>[] = [];
  const PAGES_PER_TASK = 5;

  for (let i = 1; i <= totalPages; i += PAGES_PER_TASK) {
    const startPage = i;
    const endPage = Math.min(i + PAGES_PER_TASK - 1, totalPages);

    tasks.push({
      sync_type: syncType,
      start_page: startPage,
      end_page: endPage,
      status: 'pending',
      total_pages: totalPages,
    });
  }

  const { data, error } = await supabase
    .from('sync_tasks')
    .insert(tasks)
    .select();

  if (error) {
    console.error(`${syncType} task insert hatası:`, error);
    throw error;
  }

  return data;
}

/**
 * Pending taskları işle (en fazla 1 task, timeout limiti için)
 */
async function processPendingTasks(supabase: any) {
  // En eski pending taski al
  const { data: pendingTasks, error: fetchError } = await supabase
    .from('sync_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (fetchError) {
    console.error('Pending task çekme hatası:', fetchError);
    throw fetchError;
  }

  if (!pendingTasks || pendingTasks.length === 0) {
    console.log('✅ İşlenecek pending task yok');
    return {
      processedTasks: 0,
      message: 'İşlenecek pending task yok',
    };
  }

  const task: SyncTask = pendingTasks[0];
  console.log(`🚀 Task işleniyor: ${task.sync_type} (sayfa ${task.start_page}-${task.end_page})`);

  try {
    // Task'ı processing olarak işaretle
    await supabase
      .from('sync_tasks')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', task.id);

    // Sync işlemini yap
    const result = await processTask(task);

    // Task'ı completed olarak işaretle
    await supabase
      .from('sync_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);

    console.log(`✅ Task tamamlandı: ${task.sync_type} (sayfa ${task.start_page}-${task.end_page})`);

    return {
      processedTasks: 1,
      taskId: task.id,
      syncType: task.sync_type,
      pages: `${task.start_page}-${task.end_page}`,
      ...result,
    };

  } catch (error: any) {
    console.error(`❌ Task işleme hatası (${task.sync_type}):`, error);

    // Task'ı failed olarak işaretle
    await supabase
      .from('sync_tasks')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', task.id);

    throw error;
  }
}

/**
 * Tek bir task'ı işle (belirtilen sayfa aralığındaki verileri çek ve sync et)
 */
async function processTask(task: SyncTask) {
  const { sync_type, start_page, end_page } = task;

  let totalProcessed = 0;
  let totalFailed = 0;

  for (let page = start_page; page <= end_page; page++) {
    try {
      if (sync_type === 'orders') {
        const response = await fetchOrdersPage(page, 100);
        const result = await syncOrdersToSupabase(response.data);
        totalProcessed += response.data.length - result.failed;
        totalFailed += result.failed;
      }
      else if (sync_type === 'users') {
        const response = await fetchCustomersPage(page, 100);
        // Misafir kullanıcıları filtrele
        const customers = response.data.filter(
          (customer) => !customer.customerRoleNames.includes('Misafir')
        );
        const result = await syncCustomersToSupabase(customers);
        totalProcessed += customers.length - result.failed;
        totalFailed += result.failed;
      }
      else if (sync_type === 'products') {
        const response = await fetchProductsPage(page, 100);
        const result = await syncProductsToSupabase(response.data);
        totalProcessed += response.data.length - result.failed;
        totalFailed += result.failed;
      }

      console.log(`  ↳ Sayfa ${page} tamamlandı`);
    } catch (error) {
      console.error(`  ↳ Sayfa ${page} hatası:`, error);
      totalFailed++;
    }
  }

  return {
    totalProcessed,
    totalFailed,
  };
}

// Vercel timeout: 60 saniye (Hobby plan)
export const maxDuration = 60;
