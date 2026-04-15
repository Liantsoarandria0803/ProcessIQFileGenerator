// services/storage/types.ts
export interface StorageRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface StorageListResponse<T> {
  records: StorageRecord<T>[];
  offset?: string;
}
