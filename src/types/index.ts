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

// ================================================
// SYNC TASKS TYPES
// ================================================

// Sync task tipi
export type SyncType = 'orders' | 'users' | 'products';

// Sync task durumu
export type SyncTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Supabase'deki sync_tasks tablosu
export interface SyncTask {
  id: string;
  sync_type: SyncType;
  start_page: number;
  end_page: number;
  status: SyncTaskStatus;
  total_pages: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ================================================
// REPORT GROUPS TYPES
// ================================================

// Rapor grubu
export interface ReportGroup {
  id: number;
  name: string;
  description: string | null;
  product_skus: string[];
  color: string | null;
  created_at: string;
  updated_at: string;
}

// Rapor grubu oluşturma/güncelleme için
export interface ReportGroupInput {
  name: string;
  description?: string;
  product_skus: string[];
  color?: string;
}

// ================================================
// RETURN SYSTEM TYPES (İade Sistemi)
// ================================================

// API'den gelen iade talebi satır kombinasyonu
export interface ApiReturnRequestLineCombination {
  productId: number;
  name: string;
  combinationId: number;
  combinationSku: string;
  combinationGtin: string;
  quantity: number;
}

// API'den gelen iade talebi satırı
export interface ApiReturnRequestLine {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  fromAttr: string; // İade edilen ürün özellikleri (Beden/Renk)
  replacementProductName: string; // Değişim ürünü adı (varsa)
  toAttr: string; // Değişim ürünü özellikleri (varsa)
  sku: string;
  price: number; // Fiyat
  productPrice: number; // Ürün liste fiyatı
  requestLineCombinations: ApiReturnRequestLineCombination[];
}

// API'den gelen iade talebi
export interface ApiReturnRequest {
  id: number; // Internal API ID
  customNumber: string; // İade talep numarası (örn: "RT12345")
  orderId: number; // Sipariş ID
  customOrderNumber: string; // Sipariş numarası (örn: "BK2508092663")
  customerId: number; // Müşteri ID
  customerInfo: string; // Müşteri bilgisi (Ad Soyad)
  returnReason: string; // İade nedeni
  returnReasonId: number; // İade nedeni ID
  returnAction: string; // İade aksiyonu (örn: "Ödeme İadesi", "Değişim", "Para Puan")
  returnActionId: number; // İade aksiyonu ID (0 = Değişim)
  customerComments: string; // Müşteri yorumu
  staffNotes: string; // Personel notu
  returnRequestStatusId: number; // Durum ID
  returnRequestStatusStr: string; // Durum metni (örn: "Onaylandı", "Beklemede")
  createdOn: string; // Oluşturma tarihi (DD.MM.YYYY HH:mm:ss)
  returnCodeExpireDate: string; // Kod bitiş tarihi
  returnApprovalDate: string; // Onay tarihi
  returnWarehouseApprovalDate: string; // Depo onay tarihi
  returnCreatedOn: string; // İade oluşturma tarihi
  returnCreatedOnDate: string; // İade oluşturma tarihi (alternatif)
  returnId: number; // İlişkili iade ID
  returnCustomNumber: string; // İlişkili iade numarası
  lines: ApiReturnRequestLine[]; // İade satırları
}

// İade talepleri listesi API yanıtı
export interface ReturnRequestListApiResponse {
  success: boolean;
  statusCode: number;
  errors: any[];
  data: ApiReturnRequest[];
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

// Supabase'deki return_requests tablosu
export interface ReturnRequest {
  id: number;
  custom_number: string; // Unique key
  order_id: number | null;
  custom_order_number: string | null;
  customer_id: number | null;
  customer_info: string | null;
  return_reason: string | null;
  return_reason_id: number | null;
  return_action: string | null;
  return_action_id: number | null;
  customer_comments: string | null;
  staff_notes: string | null;
  return_request_status_id: number | null;
  return_request_status_str: string | null;
  created_on: string | null;
  return_code_expire_date: string | null;
  return_approval_date: string | null;
  return_warehouse_approval_date: string | null;
  return_created_on: string | null;
  return_created_on_date: string | null;
  return_id: number | null;
  return_custom_number: string | null;
  lines: any; // JSONB - ApiReturnRequestLine[]
  from_id: number | null; // API'deki orijinal ID
  synced_at: string | null;
  updated_at: string | null;
}

// İade tutarı hesaplama sonucu
export interface ReturnRequestWithRefund extends ReturnRequest {
  refund_amount: number;
  has_error: boolean;
  error_message?: string;
  order_total_amount?: number; // İlgili siparişin toplam tutarı
}

// API'den gelen iade item'ı
export interface ApiReturnItem {
  productId: number;
  productName: string;
  quantity: number;
  sku: string;
  productPrice: number;
  subTotalInclTaxValue: number;
}

// API'den gelen iade
export interface ApiReturn {
  id: number; // Internal API ID
  customReturnNumber: string; // İade numarası (örn: "RET12345")
  customOrderNumber: string; // Sipariş numarası
  orderId: number; // Sipariş ID
  returnReason: string; // İade nedeni
  returnReasonId: number; // İade nedeni ID
  returnAction: string; // İade aksiyonu
  returnActionId: number; // İade aksiyonu ID
  returnPaymentStatus: string; // Ödeme durumu (örn: "Ödendi", "Ödenmedi", "İptal Edildi")
  returnPaymentStatusId: number; // Ödeme durumu ID
  bankAccountNumber: string; // Banka hesap numarası
  orderShippingInclTaxValue: number; // Kargo ücreti (KDV dahil)
  paymentMethodAdditionalFeeInclTaxValue: number; // Vade farkı (KDV dahil)
  customerId: number; // Müşteri ID
  customerFullName: string; // Müşteri adı soyadı
  customerIdentityNumber: string; // Müşteri TC kimlik no
  returnRequestId: number; // İlişkili iade talebi ID
  returnRequestCustomNumber: string; // İlişkili iade talebi numarası
  paidDateUtc: string; // Ödeme tarihi
  items: ApiReturnItem[]; // İade kalemleri
  createdOn: string; // Oluşturma tarihi (DD.MM.YYYY HH:mm:ss)
  addReturnNoteDisplayToCustomer: boolean; // Not müşteriye gösterilsin mi
  addReturnNoteMessage: string; // İade notu mesajı
  canMarkReturnAsPaid: boolean; // Ödendi olarak işaretlenebilir mi
}

// İadeler listesi API yanıtı
export interface ReturnListApiResponse {
  success: boolean;
  statusCode: number;
  errors: any[];
  data: ApiReturn[];
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

// Supabase'deki returns tablosu
export interface Return {
  id: number;
  custom_return_number: string; // Unique key
  custom_order_number: string;
  order_id: number;
  return_reason: string | null;
  return_reason_id: number | null;
  return_action: string;
  return_action_id: number;
  return_payment_status: string;
  return_payment_status_id: number;
  bank_account_number: string | null;
  order_shipping_incl_tax_value: number | null;
  payment_method_additional_fee_incl_tax_value: number | null;
  customer_id: number | null;
  customer_full_name: string | null;
  customer_identity_number: string | null;
  return_request_id: number | null;
  return_request_custom_number: string | null;
  paid_date_utc: string | null;
  items: any; // JSONB - ApiReturnItem[]
  created_on: string | null;
  add_return_note_display_to_customer: boolean | null;
  add_return_note_message: string | null;
  can_mark_return_as_paid: boolean | null;
  from_id: number | null; // API'deki orijinal ID
  synced_at: string | null;
  updated_at: string | null;
}

// İade tutarı hesaplama sonucu (returns için)
export interface ReturnWithAmount extends Return {
  return_amount: number;
}

// İade özet istatistikleri
export interface ReturnSummaryStats {
  status: string; // Durum veya ödeme durumu
  count: number; // Kayıt sayısı
  amount: number; // Toplam tutar
}

// İade özet raporu grubu
export interface ReturnSummaryGroup {
  action: string; // Ödeme İadesi, Para Puan, Değişim
  stats: ReturnSummaryStats[];
  subtotal_count: number; // İptal/Red hariç toplam sayı
  subtotal_amount: number; // İptal/Red hariç toplam tutar
}
