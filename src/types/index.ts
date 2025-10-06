// ================================================
// TÜM TİPLER VE INTERFACE'LER
// ================================================

// Adres bilgileri
export interface Address {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  countryId: number;
  countryName: string;
  countryCode: string;
  stateProvinceId: number;
  stateProvinceName: string;
  stateProvinceCode: string;
  districtId: number;
  districtName: string;
  districtCode: string;
  addressDetail: string;
  phone: string;
}

// Sipariş kalemi (order item)
export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  vendorName: string | null;
  sku: string;
  gtin: string | null;
  pictureThumbnailUrl: string;
  unitPriceInclTax: number;
  unitPriceExclTax: number;
  quantity: number;
  discountInclTax: number;
  discountExclTax: number;
  subTotalInclTax: number;
  subTotalExclTax: number;
  attributeInfo: string;
}

// Dış API'den gelen sipariş verisi
export interface ExternalOrder {
  id: number;
  orderGuid: string;
  customOrderNumber: string;
  customerId: number;
  customerInfo: string;
  customerEmail: string | null;
  customerFullName: string | null;
  customerIp: string;
  orderStatus: string;
  orderChannel: string;
  orderPlatform: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentSystem: string | null;
  installment: string;
  cashOnDeliveryMethod: string | null;
  shippingAddress: Address;
  shippingStatus: string;
  shippingMethodName: string;
  trackingNumber: string | null;
  billingAddress: Address;
  erpStatus: string;
  items: OrderItem[];
  createdOn: string;
  shippedDate: string | null;
  deliveryDate: string | null;
  checkoutAttributeInfo: string;
  orderSubtotalInclTax: number;
  orderSubtotalExclTax: number;
  orderSubTotalDiscountInclTax: number;
  orderSubTotalDiscountExclTax: number;
  orderShippingCost: number;
  orderShippingInclTax: number;
  orderShippingExclTax: number;
  paymentMethodAdditionalFeeText: string;
  paymentMethodAdditionalFeeInclTax: number;
  paymentMethodAdditionalFeeExclTax: number;
  tax: number;
  orderTotalDiscount: number;
  orderTotal: number;
  redeemedRewardPoints: number;
  redeemedRewardPointsAmount: number;
  redeemedRewardPointsAmountStr: string | null;
  collectorCustomerId: number;
  verificationCustomerId: number;
  verifiedDate: string | null;
  campus: string;
  class: string;
  stage: string | null;
  membership: string | null;
  identityNumber: string;
}

// API yanıt formatı (genel)
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  errors: any[];
  data: T;
}

// Sipariş listesi API yanıtı (pagination bilgileri root'ta)
export interface OrderListApiResponse {
  success: boolean;
  statusCode: number;
  errors: any[];
  data: ExternalOrder[]; // Direkt array
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

// Sipariş listesi pagination yanıtı (normalize edilmiş)
export interface OrderListResponse {
  data: ExternalOrder[];
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

// Sipariş listesi istek body
export interface OrderListRequest {
  startDate: string | null;
  endDate: string | null;
  inOrderStatusIds: number[];
  notInOrderStatusIds: number[];
  inPaymentStatusIds: number[];
  notInPaymentStatusIds: number[];
  inShippingStatusIds: number[];
  notInShippingStatusIds: number[];
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  minOrderTotal: number | null;
  maxOrderTotal: number | null;
  pageIndex: number;
  pageSize: number;
}

// Supabase veritabanı için sipariş tipi
export interface Order {
  id: number;
  order_guid?: string;
  custom_order_number: string;
  customer_id?: number;
  customer_info?: string;
  customer_email?: string | null;
  customer_full_name?: string | null;
  customer_ip?: string;
  identity_number?: string;
  order_status: string;
  order_channel?: string;
  order_platform?: string;
  payment_status: string;
  payment_method?: string;
  payment_system?: string | null;
  installment?: string;
  cash_on_delivery_method?: string | null;
  shipping_status?: string;
  shipping_method_name?: string;
  tracking_number?: string | null;
  erp_status?: string;
  shipping_address?: any; // JSONB
  billing_address?: any; // JSONB
  items: any[]; // JSONB
  checkout_attribute_info?: string;
  created_on: string;
  shipped_date?: string | null;
  delivery_date?: string | null;
  verified_date?: string | null;
  order_subtotal_incl_tax: number;
  order_subtotal_excl_tax: number;
  order_sub_total_discount_incl_tax: number;
  order_sub_total_discount_excl_tax: number;
  order_shipping_cost: number;
  order_shipping_incl_tax: number;
  order_shipping_excl_tax: number;
  payment_method_additional_fee_text?: string;
  payment_method_additional_fee_incl_tax: number;
  payment_method_additional_fee_excl_tax: number;
  tax: number;
  order_total_discount: number;
  order_total: number;
  redeemed_reward_points: number;
  redeemed_reward_points_amount: number;
  redeemed_reward_points_amount_str?: string | null;
  campus?: string;
  campus_id?: number | null;
  class?: string;
  stage?: string | null;
  membership?: string | null;
  collector_customer_id?: number;
  verification_customer_id?: number;
  total_item_discount_amount?: number;
  synced_at?: string;
  updated_at?: string;
}

// Kampüs tipi
export interface Campus {
  id: number;
  name: string;
  created_at?: string;
}

// Sipariş durumları
export type OrderStatusType = 'iptal' | 'iade' | 'onay-bekliyor' | 'basarili' | 'basarisiz';

// Dashboard istatistikleri
export interface DashboardStats {
  totalOrders: number;
  successfulOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  successfulRevenue: number;
  cancelledRevenue: number;
  refundedRevenue: number;
  averageOrderValue: number;
  rewardPointsUsed: number;
}

// Kampüs bazlı istatistik
export interface CampusStats {
  campus: string;
  orderCount: number;
  revenue: number;
  successfulOrders: number;
  cancelledOrders: number;
}

// Login yanıtı
export interface LoginResponse {
  version: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
}
