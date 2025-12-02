export interface NFCMapping {
  id: string;
  tagId: string;
  categoryId: string;
  registeredBy: string;
  registeredAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface NFCRegisterRequest {
  tagId: string;
  categoryId: string;
}

export interface NFCResolveResponse {
  found: boolean;
  category?: {
    id: string;
    name: string;
    departmentId: string;
    departmentName?: string;
  };
}
