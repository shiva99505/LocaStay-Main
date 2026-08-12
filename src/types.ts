export type UserRole = "tenant" | "landlord" | "admin";

export interface User {
  uid: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isSuspended?: boolean;
  createdAt: string;
  profilePhotoUrl?: string;
  photoUrl?: string;
  notifyPush?: boolean;
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
}

export type PropertyType = "house" | "hostel" | "room" | "shop";
export type PropertyStatus = "available" | "rented" | "hidden";

export interface LandmarkDistance {
  name: string;
  distance: string; // e.g. "500m" or "1.2km"
}

export interface Property {
  propertyId: string;
  landlordId: string;
  title: string;
  description: string;
  type: PropertyType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  rentAmount: number;
  depositAmount: number;
  amenities: string[]; // e.g. ["wifi", "parking", "water", "electricity"]
  photos: string[];
  distanceFromLandmarks: LandmarkDistance[];
  status: PropertyStatus;
  isFeatured: boolean;
  featuredUntil?: string;
  isVerified: boolean;
  isDeleted?: boolean;
  scanCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export type BookingRequestStatus = "pending" | "accepted" | "rejected";

export interface BookingRequest {
  requestId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  status: BookingRequestStatus;
  unlockedContact: boolean;
  paymentId?: string;
  createdAt: string;
}

export type PaymentType = "contact_unlock" | "landlord_subscription" | "featured_listing";
export type PaymentStatus = "success" | "failed" | "pending";

export interface Payment {
  paymentId: string;
  userId: string;
  type: PaymentType;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: PaymentStatus;
  relatedPropertyId?: string;
  createdAt: string;
}

export type RentRecordStatus = "pending" | "paid" | "overdue";

export interface RentRecord {
  rentId: string;
  propertyId: string;
  tenantId: string;
  landlordId: string;
  monthYear: string; // e.g. "August 2026"
  dueDate: string; // ISO date or "YYYY-MM-DD"
  amountDue: number;
  status: RentRecordStatus;
  paidAt?: string;
  receiptUrl?: string;
}

export type SubscriptionPlan = "basic_49" | "featured_99" | "free";
export type SubscriptionStatus = "active" | "expired";

export interface Subscription {
  subscriptionId: string;
  landlordId: string;
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  razorpayPaymentId?: string;
}

export interface Review {
  reviewId: string;
  targetId: string; // propertyId, landlordId, or tenantId
  reviewerId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface AdminAction {
  actionId: string;
  adminId: string;
  action: string;
  targetId: string;
  timestamp: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  type: string; // e.g. "rent_due" | "booking_request" | "receipt" | "alert"
  isRead: boolean;
  createdAt: string;
}
