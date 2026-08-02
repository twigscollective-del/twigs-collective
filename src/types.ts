export type StaffRole = "owner" | "manager" | "counter" | "inventory" | "accountant" | "customer";

export type DressStatus =
  | "Available"
  | "Pending Reservation"
  | "Reserved"
  | "Ready for Pickup"
  | "Rented"
  | "Overdue"
  | "Returned - Inspection Pending"
  | "Cleaning"
  | "Repair"
  | "Damaged"
  | "Lost"
  | "Retired";

export type BookingStatus =
  | "Enquiry"
  | "Pending Approval"
  | "Approved"
  | "Advance Pending"
  | "Confirmed"
  | "Ready for Pickup"
  | "Issued"
  | "Partially Returned"
  | "Returned"
  | "Inspection Pending"
  | "Completed"
  | "Cancelled"
  | "No-show"
  | "Overdue";

export type PaymentStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid"
  | "Refund Pending"
  | "Partially Refunded"
  | "Refunded"
  | "Outstanding";

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Mixed Payment" | "Refund" | "Deposit Adjustment";

export type PaymentTransactionType =
  | "Rental Payment"
  | "Advance Payment"
  | "Balance Payment"
  | "Security Deposit"
  | "Late Fee"
  | "Cleaning Charge"
  | "Damage Charge"
  | "Missing Item Charge"
  | "Replacement Charge"
  | "Refund"
  | "Deposit Deduction"
  | "Expense Reimbursement"
  | "Other";

export type DepositStatus =
  | "Not Received"
  | "Partially Received"
  | "Held"
  | "Partially Deducted"
  | "Refund Pending"
  | "Refunded"
  | "Fully Deducted";

export type CustomerStatus = "Active" | "Restricted" | "Blacklisted" | "Inactive";

export interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface DressDesign {
  id: string;
  name: string;
  categoryId: string;
  subcategory: string;
  character?: string;
  description: string;
  material: string;
  accessoriesIncluded: string[];
  rentalRules: string[];
  publicVisible: boolean;
  featured: boolean;
}

export interface InventoryItem {
  id: string;
  dressId: string;
  designId: string;
  name: string;
  category: string;
  subcategory: string;
  character?: string;
  description: string;
  gender: "Female" | "Male" | "Unisex";
  ageGroup: string;
  size: string;
  shoulder?: string;
  bust?: string;
  waist?: string;
  hip?: string;
  length?: string;
  colour: string;
  material: string;
  rentalPrice: number;
  securityDeposit: number;
  replacementCost: number;
  purchaseCost: number;
  purchaseDate: string;
  supplier: string;
  currentCondition: string;
  currentStatus: DressStatus;
  storageLocation: string;
  accessoriesIncluded: string[];
  cleaningInstructions: string;
  repairNotes?: string;
  remarks?: string;
  images: string[];
  featuredImage: string;
  publicVisible: boolean;
  featured: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Customer {
  id: string;
  customerId: string;
  fullName: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address: string;
  town: string;
  identificationType: string;
  identificationNumber: string;
  dateOfBirth?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContact?: string;
  notes?: string;
  outstandingBalance: number;
  securityDepositHeld: number;
  lateReturnCount: number;
  damageCount: number;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BookingItem {
  inventoryItemId: string;
  dressId: string;
  name: string;
  quantity: number;
  rentalCharge: number;
  securityDeposit: number;
  issueCondition?: string;
  returnCondition?: string;
  returned?: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  bookingSource: "Walk-in" | "Phone" | "WhatsApp" | "Website" | "Social Media" | "Other";
  bookingDate: string;
  eventDate: string;
  pickupDateTime: string;
  expectedReturnDateTime: string;
  actualReturnDateTime?: string;
  items: BookingItem[];
  rentalDays: number;
  discount: number;
  additionalCharges: number;
  lateFees: number;
  cleaningCharges: number;
  damageCharges: number;
  missingItemCharges: number;
  totalReceived: number;
  refundableAmount: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  depositStatus: DepositStatus;
  eventType: string;
  customerNotes?: string;
  internalNotes?: string;
  termsAccepted: boolean;
  staffMember: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  receiptNumber: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  transactionDateTime: string;
  transactionType: PaymentTransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentPurpose: string;
  upiReference?: string;
  bankReference?: string;
  verificationStatus: "Pending Verification" | "Verified" | "Rejected" | "Reversed";
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  bookingNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  status: "Pending" | "Approved" | "Paid" | "Rejected";
  approvedBy?: string;
  refundDate?: string;
}

export interface CleaningRecord {
  id: string;
  dressId: string;
  bookingNumber?: string;
  cleaningType: string;
  provider: string;
  dateSent: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  cost: number;
  stainDetails?: string;
  notes?: string;
  status: "Waiting" | "In Progress" | "Completed" | "Failed Inspection";
}

export interface RepairRecord {
  id: string;
  dressId: string;
  damageType: string;
  damageDescription: string;
  responsibleBooking?: string;
  provider: string;
  estimatedCost: number;
  actualCost?: number;
  dateSent: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  notes?: string;
  status: "Awaiting Assessment" | "Approved" | "In Repair" | "Completed" | "Not Repairable" | "Retired";
}

export interface Expense {
  id: string;
  expenseId: string;
  date: string;
  category: string;
  description: string;
  supplierOrPayee: string;
  amount: number;
  paymentMethod: PaymentMethod;
  relatedDress?: string;
  relatedBooking?: string;
  enteredBy: string;
  approvedBy?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: StaffRole;
  action: string;
  module: string;
  recordId: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  session?: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phones: string[];
  whatsappNumber: string;
  email: string;
  upiId: string;
  currency: string;
  defaultRentalDuration: number;
  preparationBufferHours: number;
  lateFeePerDay: number;
  refundApprovalLimit: number;
  receiptPrefix: string;
  bookingPrefix: string;
  inventoryPrefix: string;
  openingHours: string;
  terms: string[];
  notificationTemplates: Record<string, string>;
}
