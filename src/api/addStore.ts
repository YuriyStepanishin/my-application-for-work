import { API_URL } from './config';

// тип для нової ТТ
export interface AddStorePayload {
  department: string;
  representative: string;
  store: string;
}

// тип відповіді сервера
export interface ApiResponse {
  success: boolean;
  error?: string;
}

export async function addStore(data: AddStorePayload): Promise<ApiResponse> {
  try {
    const formData = new FormData();

    formData.append(
      'data',
      JSON.stringify({
        action: 'addStore',
        department: data.department,
        representative: data.representative,
        store: data.store,
      })
    );

    const res = await fetch(API_URL, {
      method: 'POST',
      body: formData, // ВАЖЛИВО: без headers
    });

    const result = await res.json();

    return result;
  } catch (error) {
    console.error('addStore error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}
