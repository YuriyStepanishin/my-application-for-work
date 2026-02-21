import { API_URL, BONUS_API_URL } from './config';

// тип фото
export interface PhotoPayload {
  base64: string;
  type: string;
  name: string;
}

// універсальний тип
export interface SaveReportPayload {
  department: string;
  representative: string;
  store: string;

  startDate?: string;
  endDate?: string;
  createdDate?: string;

  category: string;
  comment: string;

  photos: PhotoPayload[];
}

export interface ApiResponse {
  success: boolean;
  error?: string;
}

// ← додаємо type
export async function saveReport(
  data: SaveReportPayload,
  type: 'display' | 'bonus'
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

    // ← вибір правильного URL
    const url = type === 'bonus' ? BONUS_API_URL : API_URL;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    return await res.json();
  } catch (error) {
    console.error('saveReport error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}
