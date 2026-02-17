// services/airtable/types.ts
export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}