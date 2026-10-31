export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  customerId?: string | null;
  customer?: Customer | null;
}

export interface Customer {
  id: string;
  userId?: string | null;
  name: string;
  email: string;
  company?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: {
    subscriptions: number;
    invoices: number;
  };
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  priceAdjustment: number;
  sku?: string | null;
}

export interface Product {
  id: string;
  name: string;
  type: 'SERVICE' | 'PHYSICAL' | 'DIGITAL';
  salesPrice: number;
  costPrice: number;
  notes?: string | null;
  active: boolean;
  variants: ProductVariant[];
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  billingPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  minQuantity: number;
  availableFrom: string;
  availableTo: string;
  autoCloseAtEndDate: boolean;
  allowEarlyClose: boolean;
  allowPause: boolean;
  allowRenewal: boolean;
  active: boolean;
}

export interface QuotationTemplateLine {
  id: string;
  productId: string;
  variantId?: string | null;
  planId?: string | null;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  plan?: Plan | null;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  validityDays: number;
  notes?: string | null;
  lines: QuotationTemplateLine[];
  createdAt: string;
}

export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'CLOSED';

export interface SubscriptionLine {
  id: string;
  subscriptionId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
  product?: Product;
  variant?: ProductVariant | null;
}

export interface SubscriptionStatusHistory {
  id: string;
  subscriptionId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  createdAt: string;
  changedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  } | null;
}

export interface Subscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string;
  paymentTerms: string;
  nextBillingDate: string;
  notes?: string | null;
  customer: Customer;
  plan: Plan;
  discount?: Discount | null;
  lines: SubscriptionLine[];
  statusHistory?: SubscriptionStatusHistory[];
  invoices?: Invoice[];
  _count?: {
    lines: number;
    invoices: number;
  };
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId?: string | null;
  variantId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
  taxSnapshotJson?: string | null;
  product?: Product | null;
  variant?: ProductVariant | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  reference?: string | null;
  notes?: string | null;
  invoice?: Invoice;
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriptionId?: string | null;
  customerId: string;
  billingPeriod: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount?: number;
  isOverdue?: boolean;
  sentAt?: string | null;
  notes?: string | null;
  customer: Customer;
  subscription?: {
    subscriptionNumber: string;
    status: string;
    plan?: Plan;
  } | null;
  lines: InvoiceLine[];
  payments: Payment[];
  discount?: Discount | null;
  createdAt: string;
}

export interface TaxRule {
  id: string;
  name: string;
  ratePercent: number;
  appliesToType: 'ALL' | 'SERVICE' | 'PHYSICAL' | 'DIGITAL';
  active: boolean;
  createdAt: string;
}

export interface Discount {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  minPurchase: number;
  minQuantity: number;
  startDate: string;
  endDate: string;
  maxUsageCount: number;
  usageCount: number;
  appliesToProductId?: string | null;
  active: boolean;
  appliesToProduct?: Product | null;
}

export interface DashboardMetrics {
  activeSubscriptionsCount: number;
  totalSubscriptions: number;
  revenueCollected: number;
  amountOutstanding: number;
  totalInvoiced: number;
  mrr: number;
  arr: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface DashboardStats {
  metrics: DashboardMetrics;
  statusDistribution: Record<string, number>;
  overdueInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    subscriptionNumber: string;
    dueDate: string;
    daysOverdue: number;
    totalAmount: number;
    paidAmount: number;
    balanceDue: number;
  }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string;
    invoiceNumber: string;
    customerName: string;
  }>;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  payloadJson?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
  } | null;
}
