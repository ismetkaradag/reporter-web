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
    inPaymentStatusIds: [30],
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

// ================================================
// CUSTOMER API METHODS
// ================================================

interface CustomerListApiResponse {
  success: boolean;
  statusCode: number;
  errors: string[];
  data: import('@/types').ExternalCustomer[];
  pageIndex: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface CustomerListResponse {
  data: import('@/types').ExternalCustomer[];
  pageIndex: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Belirli bir sayfadaki customer'ları çek
 */
async function fetchCustomersPage(
  pageIndex: number = 1,
  pageSize: number = 100
): Promise<CustomerListResponse> {
  const token = await loginToExternalApi();

  const requestBody = {
    pageIndex,
    pageSize,
    "SearchCustomerRoleIds": ["3"]
  };

  const response = await fetch(`${BASE_URL}adminapi/customer/list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': `.Application.Customer=${COOKIE_VALUE}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.statusText}`);
  }

  const result: CustomerListApiResponse = await response.json();

  if (!result.success) {
    throw new Error(`Failed to fetch customers: ${result.errors.join(', ')}`);
  }

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
 * TÜM customer'ları pagination ile çek (Misafir hariç)
 */
export async function fetchAllCustomers(
  onProgress?: (current: number, total: number) => void
): Promise<import('@/types').ExternalCustomer[]> {
  let allCustomers: import('@/types').ExternalCustomer[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetchCustomersPage(currentPage, 100);

    // "Misafir" içerenleri filtrele
    const filteredCustomers = response.data.filter(
      (customer) => !customer.customerRoleNames.includes('Misafir')
    );

    allCustomers = allCustomers.concat(filteredCustomers);
    totalPages = response.totalPages;

    if (onProgress) {
      onProgress(currentPage, totalPages);
    }

    console.log(`Fetched customers page ${currentPage}/${totalPages} - Total: ${allCustomers.length} (filtered)`);

    currentPage++;

    // Rate limiting
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return allCustomers;
}

// ================================================
// PRODUCT API METHODS
// ================================================

interface ProductListApiResponse {
  success: boolean;
  statusCode: number;
  errors: string[];
  data: import('@/types').ExternalProduct[];
  pageIndex: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface ProductListResponse {
  data: import('@/types').ExternalProduct[];
  pageIndex: number;
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  firstItem: number;
  lastItem: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Belirli bir sayfadaki ürünleri çek
 */
async function fetchProductsPage(
  pageIndex: number = 1,
  pageSize: number = 100
): Promise<ProductListResponse> {
  const token = await loginToExternalApi();

  const requestBody = {
    pageIndex,
    pageSize,
  };

  const response = await fetch(`${BASE_URL}adminapi/product/list-detail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': `.Application.Customer=${COOKIE_VALUE}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  const result: ProductListApiResponse = await response.json();

  if (!result.success) {
    throw new Error(`Failed to fetch products: ${result.errors.join(', ')}`);
  }

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
 * TÜM ürünleri pagination ile çek
 */
export async function fetchAllProducts(
  onProgress?: (current: number, total: number) => void
): Promise<import('@/types').ExternalProduct[]> {
  let allProducts: import('@/types').ExternalProduct[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const response = await fetchProductsPage(currentPage, 100);

    allProducts = allProducts.concat(response.data);
    totalPages = response.totalPages;

    if (onProgress) {
      onProgress(currentPage, totalPages);
    }

    console.log(`Fetched products page ${currentPage}/${totalPages} - Total: ${allProducts.length}`);

    currentPage++;

    // Rate limiting
    if (currentPage <= totalPages) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return allProducts;
}
