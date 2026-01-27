export interface MasterDataType {
  id: string;
  code: string;
  name: string;
  description: string;
  allowHierarchy: boolean;
  isActive: boolean;
}

export interface MasterDataValue {
  id: string;
  typeCode: string;
  code: string;
  name: string;
  description: string;
  parentId?: string;
  parentName?: string;
  metadata?: string;
  displayOrder: number;
  isActive: boolean;
  children: MasterDataValue[];
}

export interface CreateMasterDataValueRequest {
  typeCode: string;
  code: string;
  name: string;
  description: string;
  parentId?: string;
  metadata?: string;
  displayOrder: number;
}

export interface UpdateMasterDataValueRequest {
  name: string;
  description: string;
  metadata?: string;
  displayOrder: number;
  isActive: boolean;
}
