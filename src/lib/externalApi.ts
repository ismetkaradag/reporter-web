import type {
  ApiResponse,
  LoginResponse,
  OrderListRequest,
  OrderListResponse,
  OrderListApiResponse
} from '@/types';

const BASE_URL = process.env.BASE_URL || 'https://yonder.okuldolabim.com/';
const COOKIE_VALUE = process.env.COOKIE_VALUE || '';
const API_KEY = process.env.API_KEY || '';
const SECRET_KEY = process.env.SECRET_KEY || '';
const EMAIL = process.env.EMAIL || '';
const PASSWORD = process.env.PASSWORD || '';

// Token cache (memory'de tutuyoruz)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Dış API'ye login ol ve token al
 */
export async function loginToExternalApi(): Promise<string> {
  // Eğer token hala geçerliyse, cache'den dön
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(`${BASE_URL}api/customer/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `.Application.Customer=${COOKIE_VALUE}`,
    },
    body: JSON.stringify({
      apiKey: API_KEY,
      secretKey: SECRET_KEY,
      emailOrPhone: EMAIL,
      password: PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const result: ApiResponse<LoginResponse> = await response.json();

  if (!result.success || !result.data.token) {
    throw new Error('Login failed: Invalid response');
  }

  // Token'ı cache'le (expiresIn saniye cinsinden gelir)
  cachedToken = result.data.token;
  tokenExpiry = Date.now() + (result.data.expiresIn * 1000) - 60000; // 1 dakika buffer

  return cachedToken;
}

/**
 * Sipariş listesini çek (tek sayfa)
 */
export async function fetchOrdersPage(
  pageIndex: number = 1,
  pageSize: number = 100,
  filters: Partial<OrderListRequest> = {}
): Promise<OrderListResponse> {
  const token = await loginToExternalApi();

  const requestBody: OrderListRequest = {
    startDate: null,
    endDate: null,
    inOrderStatusIds: [],
    notInOrderStatusIds: [],
    inPaymentStatusIds: [],
    notInPaymentStatusIds: [],
    inShippingStatusIds: [],
    notInShippingStatusIds: [],
    email: null,
    phone: null,
    firstName: null,
    lastName: null,
    minOrderTotal: null,
    maxOrderTotal: null,
    pageIndex,
    pageSize,
    ...filters,
  };

  const response = await fetch(`${BASE_URL}adminapi/order/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': `.Application.Customer=${COOKIE_VALUE}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.statusText}`);
  }

  // API yanıtı - pagination bilgileri root seviyede
  const result: OrderListApiResponse = await response.json();

  if (!result.success) {
    throw new Error(`Failed to fetch orders: ${result.errors.join(', ')}`);
  }

  // Normalize edilmiş yanıt
  return {
    data: result.data || [],
    pageIndex: result.pageIndex,
    pageNumber: result.pageNumber,
    pageSize: result.pageSize,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
    firstItem: result.firstItem,
    lastItem: result.lastItem,
    hasPreviousPage: result.hasPreviousPage,
    hasNextPage: result.hasNextPage,
  };
}

/**
 * TÜM siparişleri pagination ile çek
 */
export async function fetchAllOrders(
  onProgress?: (current: number, total: number) => void
): Promise<OrderListResponse['data']> {
  let allOrders: OrderListResponse['data'] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetchOrdersPage(currentPage, 100);

    allOrders = allOrders.concat(response.data);
    totalPages = response.totalPages;

    // Progress callback
    if (onProgress) {
      onProgress(currentPage, totalPages);
    }

    console.log(`Fetched page ${currentPage}/${totalPages} - Total orders: ${allOrders.length}`);

    currentPage++;

    // Rate limiting: API'ye fazla yük bindirmemek için kısa bir bekleme
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms bekle
    }
  }

  return allOrders;
}

/**
 * Belirli bir tarih aralığındaki siparişleri çek
 */
export async function fetchOrdersByDateRange(
  startDate: string,
  endDate: string,
  onProgress?: (current: number, total: number) => void
): Promise<OrderListResponse['data']> {
  let allOrders: OrderListResponse['data'] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetchOrdersPage(currentPage, 100, {
      startDate,
      endDate,
    });

    allOrders = allOrders.concat(response.data);
    totalPages = response.totalPages;

    // Progress callback
    if (onProgress) {
      onProgress(currentPage, totalPages);
    }

    console.log(`Fetched page ${currentPage}/${totalPages} - Total orders: ${allOrders.length}`);

    currentPage++;

    // Rate limiting
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return allOrders;
}
