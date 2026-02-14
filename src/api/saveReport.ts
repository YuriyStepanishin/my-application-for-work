import { API_URL } from './config';

// тип фото
export interface PhotoPayload {
  base64: string;
  type: string;
  name: string;
}

// тип звіту
export interface SaveReportPayload {
  department: string;
  representative: string;
  store: string;

  startDate: string;
  endDate: string;

  category: string;
  comment: string;

  photos: PhotoPayload[];
}

// тип відповіді
export interface ApiResponse {
  success: boolean;
  error?: string;
}

// головна функція
export async function saveReport(
  data: SaveReportPayload
): Promise<ApiResponse> {
  try {
    const formData = new FormData();

    formData.append(
      'data',
      JSON.stringify({
        action: 'saveReport',
        ...data,
      })
    );

    const res = await fetch(API_URL, {
      method: 'POST',
      body: formData, // ВАЖЛИВО: без headers
    });

    const result = await res.json();

    return result;
  } catch (error) {
    console.error('saveReport error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}
