export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface Photo {
  id: string;
  base64: string;
  type: string;
  name: string;
  status: UploadStatus;
}
