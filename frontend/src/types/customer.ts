export enum DocumentType {
    DNI = 1,
    RUC = 2,
    Passport = 3,
    ForeignId = 4
}

export interface Customer {
    id: string;
    documentType: DocumentType;
    documentNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    creditLimit: number;
    currentDebt: number;
    availableCredit: number;
    totalPurchases: number;
    totalSpent: number;
    isActive: boolean;
    createdAt: string;
}

export interface CreateCustomerRequest {
    documentType: DocumentType;
    documentNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    creditLimit: number;
}

export interface UpdateCustomerRequest {
    documentType?: DocumentType;
    documentNumber?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
}

export interface UpdateCreditLimitRequest {
    creditLimit: number;
}

export interface AddCreditPaymentRequest {
    amount: number;
    notes?: string;
}

export interface CreditPayment {
    id: string;
    amount: number;
    paymentDate: string;
    notes?: string;
}

export interface Credit {
    id: string;
    customerId: string;
    customerName: string;
    amount: number;
    remainingAmount: number;
    creditDate: string;
    dueDate?: string;
    isPaid: boolean;
    isOverdue: boolean;
    paidDate?: string;
    notes?: string;
    payments: CreditPayment[];
    createdAt: string;
}

export interface CreateCreditRequest {
    customerId: string;
    amount: number;
    dueDate?: string;
    notes?: string;
}

export interface CustomerStats {
    customerId: string;
    customerName: string;
    totalPurchases: number;
    totalSpent: number;
    averageTicket: number;
    firstPurchase: string;
    lastPurchase?: string;
    daysSinceLastPurchase: number;
}
