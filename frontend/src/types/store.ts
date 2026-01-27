export interface Store {
  id: string;
  name: string;
  tenantId: string;
  address: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

export interface UpdateStoreRequest {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}
