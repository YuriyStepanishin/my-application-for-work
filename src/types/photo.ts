export interface PhotoRecord {
  base64: string;
  type: string;
  name: string;

  store: string;
  department: string;
  representative: string;

  date: string;

  lat?: number;
  lng?: number;
}
