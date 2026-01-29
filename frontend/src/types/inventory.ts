export interface Product {
  id: string;
  code: string;
  barcode?: string;
  shortScanCode?: string;
  name: string;
  description: string;
  imageUrl?: string;
  categoryId: string;
  categoryName: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice: number;
  currentStock?: number;
  minimumStock?: number;
  isActive: boolean;
  baseUOMId: string;
  baseUOMCode?: string;
  baseUOMName?: string;
  purchaseUOMId: string;
  purchaseUOMCode?: string;
  purchaseUOMName?: string;
  saleUOMId: string;
  saleUOMCode?: string;
  saleUOMName?: string;
  allowFractional: boolean;
  purchaseConversionMethod?: string;
  saleUOMs?: ProductSaleUOM[];
  purchaseUOMs?: ProductPurchaseUOM[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  productsCount: number;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export interface UpdateSupplierRequest {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
}

export enum PurchaseStatus {
  Pending = 0,
  Received = 1,
  Completed = 2,
  Cancelled = 3
}

export interface PurchaseDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  uomId: string;
  uomCode?: string;
  uomName?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  bonusQuantity?: number;
  bonusUOMId?: string;
  bonusUOMCode?: string;
  bonusUOMName?: string;
  barcode?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  documentType: string;
  purchaseDate: string;
  status: PurchaseStatus;
  receivedDate?: string;
  receivedByUserId?: string;
  totalAmount: number;
  invoiceNumber?: string;
  notes?: string;
  details: PurchaseDetail[];
  createdAt: string;
}

export interface CreatePurchaseDetailRequest {
  productId: string;
  uomId: string;
  quantity: number;
  unitPrice: number;
  bonusQuantity?: number;
  bonusUOMId?: string;
}

export interface CreatePurchaseRequest {
  supplierId: string;
  storeId?: string; // New
  documentType: string;
  purchaseDate: string;
  invoiceNumber: string;
  notes?: string;
  details: CreatePurchaseDetailRequest[];
}

export interface DocumentSeries {
  id: string;
  seriesCode: string;
  documentType: string;
  documentTypeName: string;
  currentNumber: number;
  storeId: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export interface CreateDocumentSeriesRequest {
  seriesCode: string;
  documentType: string;
  storeId: string;
}

export interface UpdateDocumentSeriesRequest {
  isActive?: boolean;
  isDefault?: boolean;
}

export interface NextDocumentNumber {
  seriesCode: string;
  nextNumber: string;
  fullDocumentNumber: string;
}

export interface ProductSearchResult {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  isActive: boolean;
  minimumStock: number;
  baseUOMId?: string;
  baseUOMCode?: string;
  baseUOMName?: string;
  purchaseUOMs?: ProductPurchaseUOM[];
  saleUOMs?: ProductSaleUOM[];
}

export interface ProductPurchaseUOM {
  id: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  conversionToBase: number;
  price?: number;
  isDefault: boolean;
  isActive?: boolean;
}

export interface ProductSaleUOM {
  id: string;
  uomId: string;
  uomCode: string;
  uomName: string;
  conversionToBase: number;
  price: number;
  isDefault: boolean;
  isActive?: boolean;
  prices?: ProductSaleUOMPrice[];
}

export interface ProductSaleUOMPrice {
  id: string;
  productSaleUOMId: string;
  priceListId: string;
  priceListName: string;
  priceListCode: string;
  price: number;
}

export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  type: 'Discrete' | 'Weight' | 'Volume' | 'Length';
  isActive: boolean;
}

export interface ProductUOMConversion {
  id: string;
  productId: string;
  fromUOMId: string;
  fromUOMCode: string;
  fromUOMName: string;
  toUOMId: string;
  toUOMCode: string;
  toUOMName: string;
  conversionFactor: number;
  isDefault: boolean;
}

export interface CreateProductUOMConversionRequest {
  fromUOMId: string;
  toUOMId: string;
  conversionFactor: number;
  isDefault: boolean;
}

// --- Transfer Types ---

export interface TransferDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
}

export enum TransferStatus {
  InTransit = 0,
  Completed = 1,
  Cancelled = 2
}

export interface Transfer {
  id: string;
  transferNumber: string;
  originStoreId: string;
  originStoreName: string;
  destinationStoreId: string;
  destinationStoreName: string;
  status: TransferStatus;
  statusName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  receivedByUserId?: string;
  receivedByUserName?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  details: TransferDetail[];
}

export interface CreateTransferRequest {
  originStoreId: string;
  destinationStoreId: string;
  requestedByUserId: string;
  notes?: string;
  items: CreateTransferDetailRequest[];
}

export interface CreateTransferDetailRequest {
  productId: string;
  quantity: number;
}
