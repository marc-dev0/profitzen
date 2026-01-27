export interface CartItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  conversionToBase: number;
  uomId: string;
  uomCode: string;
  uomName: string;
}

export interface SaleRequest {
  storeId: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  paymentMethod: string;
  customerId?: string;
}

export interface SaleResponse {
  id: string;
  saleNumber: string;
  totalAmount: number;
  createdAt: string;
}
