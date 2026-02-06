export interface CashMovement {
    id: string;
    cashShiftId: string;
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
    timestamp: string;
    userId: string;
}

export interface CashShift {
    id: string;
    tenantId: string;
    storeId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string | null;

    startAmount: number;

    totalSalesCash: number;
    totalSalesCard: number;
    totalSalesTransfer: number;
    totalSalesWallet: number;
    totalCreditCollections: number;

    totalCashIn: number;
    totalCashOut: number;
    totalExpenses: number;

    expectedCashEndAmount: number;
    actualCashEndAmount: number;
    difference: number;

    status: 'Open' | 'Closed';
    notes: string | null;

    movements: CashMovement[];
}

export interface OpenShiftRequest {
    storeId: string;
    startAmount: number;
}

export interface CloseShiftRequest {
    actualEndAmount: number;
    notes: string;
}

export interface AddMovementRequest {
    type: 'IN' | 'OUT';
    amount: number;
    description: string;
}
