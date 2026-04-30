export interface SharedDocument {
  id: string;
  documentId: string;
  sharedByUserId: string;
  sharedToUserId: string;
  permission: 'view' | 'download';
  message?: string;
  sharedAt: string;
  isActive: boolean;
  
  documentName?: string;
  sharedByUserName?: string;
  departmentName?: string;
  categoryName?: string;
}

export interface SupabaseSharedDocument {
  id: string;
  document_id: string;
  shared_by_user_id: string;
  shared_to_user_id: string;
  permission: 'view' | 'download';
  message: string | null;
  shared_at: string;
  is_active: boolean;
  created_at: string;
}
