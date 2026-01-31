export interface DashboardData {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueGrowthPercentage: number;
  todaySalesCount: number;
  yesterdaySalesCount: number;
  weekRevenue: number;
  lastWeekRevenue: number;
  weekGrowthPercentage: number;
  monthRevenue: number;
  lastMonthRevenue: number;
  monthGrowthPercentage: number;
  averageTicket: number;
  lastMonthAverageTicket: number;
  topProducts: TopProduct[];
  last30Days: DailySales[];
  salesByPaymentMethod: SalesByPaymentMethod[];
  lowStockAlerts: LowStockAlert[];
}

export interface LowStockAlert {
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  severity: 'critical' | 'high' | 'medium';
}

export interface TopProduct {
  productId: string;
  productCode: string;
  productName: string;
  totalRevenue: number;
  totalSold: number;
  rank: number;
}

export interface DailySales {
  date: string;
  totalRevenue: number;
  totalSales: number;
  totalCost: number;
  totalProfit: number;
  averageTicket: number;
  totalItems: number;
  totalCustomers: number;
}

export interface SalesByPaymentMethod {
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
}

export interface SalesReport {
  fromDate: string;
  toDate: string;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averageTicket: number;
  totalItems: number;
  totalCustomers: number;
  dailySummaries: DailySales[];
}

export interface ProductPerformance {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  lastSaleDate: string;
  daysSinceLastSale: number;
}

export interface RiskAssessment {
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
  dailyConsumptionRate: number;
  estimatedDaysRemaining: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  uomName?: string;
}

export interface SuggestedPurchase {
  productId: string;
  productCode: string;
  productName: string;
  quantityToOrder: number;
  estimatedCost: number;
  reason: string;
}

export interface InventoryInsightReport {
  atRiskProducts: RiskAssessment[];
  deadStock: ProductPerformance[];
  purchaseRecommendations: SuggestedPurchase[];
  aiSummary: string;
}
