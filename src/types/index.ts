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
  totalExchangeOrders: number; // RT ile başlayan siparişler
  totalSalesOrders: number; // RT ile başlamayan siparişler
  successfulOrders: number;
  successfulExchangeOrders: number; // RT ile başlayan başarılı siparişler
  successfulSalesOrders: number; // RT ile başlamayan başarılı siparişler
  cancelledOrders: number;
  refundedOrders: number;
  totalRevenue: number;
  successfulRevenue: number;
  cancelledRevenue: number;
  refundedRevenue: number;
  averageOrderValue: number;
  rewardPointsUsed: number;
  totalDiscountAmount: number; // Toplam indirim (ürün bazlı + sipariş bazlı)
}

// Kampüs bazlı istatistik
export interface CampusStats {
  campus: string;
  orderCount: number;
  revenue: number;
  successfulOrders: number;
  cancelledOrders: number;
}

// Dış API'den gelen customer verisi
export interface ExternalCustomer {
  id: number;
  emailOrPhone: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  identityNumber: string | null;
  active: boolean;
  authorizeEmailMarketing: boolean;
  authorizeSmsMarketing: boolean;
  customerRoleNames: string;
  stageId: number;
  stageName: string;
  classId: number;
  className: string;
  membershipId: number;
  membershipName: string;
  campusId: number;
  campusName: string;
  createdOn: string;
  lastActivityDate: string;
  lastIpAddress: string | null;
}

// Supabase'deki customer verisi
export interface Customer {
  id: number;
  email_or_phone: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  identity_number: string | null;
  active: boolean;
  authorize_email_marketing: boolean;
  authorize_sms_marketing: boolean;
  customer_role_names: string;
  stage_id: number;
  stage_name: string;
  student_class_id: number;
  student_class_name: string;
  membership_id: number;
  membership_name: string;
  campus_id: number;
  campus_name: string;
  created_on: string;
  last_activity_date: string;
  last_ip_address: string | null;
}

// Login yanıtı
export interface LoginResponse {
  version: string;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

// ================================================
// PRODUCT TYPES
// ================================================

// Dış API'den gelen ürün resmi
export interface ExternalProductPicture {
  id: number;
  pictureUrl: string;
  displayOrder: number;
}

// Dış API'den gelen ürün kategorisi
export interface ExternalProductCategory {
  id: number;
  category: string;
  categoryId: number;
  displayOrder: number;
}

// Dış API'den gelen ürün üreticisi
export interface ExternalProductManufacturer {
  id: number;
  manufacturer: string;
  manufacturerId: number;
  displayOrder: number;
}

// Dış API'den gelen ürün kombinasyon attribute
export interface ExternalProductAttribute {
  id: number;
  name: string;
  value: string;
}

// Dış API'den gelen ürün kombinasyonu (beden varyasyonları)
export interface ExternalProductCombination {
  id: number;
  stockQuantity: number;
  sku: string;
  gtin: string;
  published: boolean;
  overriddenPrice: number | null;
  attributes: ExternalProductAttribute[];
}

// Dış API'den gelen ürün spesifikasyonu
export interface ExternalProductSpecification {
  id: number;
  name: string;
  value: string;
  displayOrder: number;
}

// Dış API'den gelen ürün
export interface ExternalProduct {
  id: number;
  name: string;
  shortDescription: string | null;
  fullDescription: string;
  metaKeywords: string;
  metaDescription: string;
  metaTitle: string;
  seName: string;
  modelCode: string;
  sku: string;
  gtin: string;
  placeCode: string | null;
  videoUrl: string | null;
  taxCategoryId: number;
  taxCategoryName: string;
  vendorId: number | null;
  vendorName: string | null;
  price: number;
  oldPrice: number;
  productCost: number;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
  price5: number;
  stockQuantity: number;
  weight: number;
  published: boolean;
  createdOn: string;
  updatedOn: string;
  productPictures: ExternalProductPicture[];
  productCategories: ExternalProductCategory[];
  productManufacturers: ExternalProductManufacturer[];
  productCombinations: ExternalProductCombination[];
  productSpecifications: ExternalProductSpecification[];
}

// Supabase'deki ürün tablosu
export interface Product {
  id: number;
  name: string;
  short_description: string | null;
  full_description: string;
  model_code: string;
  sku: string;
  gtin: string;
  price: number;
  old_price: number;
  stock_quantity: number;
  published: boolean;
  created_on: string;
  updated_on: string;
  pictures: any; // JSONB - ProductPicture[]
  categories: any; // JSONB - ProductCategory[]
  manufacturers: any; // JSONB - ProductManufacturer[]
  combinations: any; // JSONB - ProductCombination[]
  specifications: any; // JSONB - ProductSpecification[]
  synced_at: string | null;
}
