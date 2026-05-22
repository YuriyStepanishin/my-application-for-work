import { STORE_CHECK_URL } from './config';

interface StoreCheckPayload {
  date: string;
  ttName: string;
  address?: string;
  department?: string;
  representative?: string;
  princessa: number;
  greenfield: number;
  tess: number;
  tea_total: number;
  jockey: number;
  jardin: number;
  piazza: number;
  coffee_total: number;
  eliteFort: number;
  blackCard: number;
  ambassador: number;
  strauss_total: number;
  bonBoisson: number;
  chudoSad: number;
  water_total: number;
  fas_delicia: number;
  fas_other: number;
  tubus_delicia: number;
  tubus_other: number;
  small_delicia: number;
  small_other: number;
  weight_delicia: number;
  weight_other: number;
  delicia_total: number;
  other_total: number;
  domashne: number;
  malyuk: number;
  pryazhene: number;
  kakao: number;
  superMonika: number;
  riagel: number;
  artek: number;
  bisquit: number;
  fitness: number;
  bg: number;
  other_snacks: number;
  other_snacks_cookie?: number;
  other_snacks_pryanik?: number;
  drinks?: number;
  categoryOrimi?: string;
  categoryDelicia?: string;
  comment?: string;
  commentDelicia?: string;
}

interface StoreCheckResponse {
  success: boolean;
  error?: string;
  result?: {
    id?: string;
  };
}

interface StoreCheckPhotoPayload {
  department: string;
  representative: string;
  store: string;
  createdDate: string;
  photos: Array<{
    base64: string;
    type: string;
    name: string;
    capturedAt?: string;
    device?: string;
  }>;
}

export async function saveStoreCheck(
  payload: StoreCheckPayload
): Promise<StoreCheckResponse> {
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));

    const response = await fetch(STORE_CHECK_URL, {
      method: 'POST',
      body: formData,
    });

    const raw = await response.text();
    let data: StoreCheckResponse;

    try {
      data = JSON.parse(raw) as StoreCheckResponse;
    } catch {
      const normalized = raw.toLocaleLowerCase('uk-UA');
      if (
        normalized.includes('doget') ||
        normalized.includes('dopost') ||
        normalized.includes('функцію сценарію')
      ) {
        return {
          success: false,
          error:
            'Apps Script deployment не містить doGet/doPost. Оновіть і перевикотіть Web App.',
        };
      }

      return {
        success: false,
        error: `Сервер повернув не-JSON відповідь (HTTP ${response.status}).`,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('saveStoreCheck error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}

export async function uploadStoreCheckPhoto(
  payload: StoreCheckPhotoPayload
): Promise<StoreCheckResponse> {
  try {
    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        action: 'uploadPhoto',
        ...payload,
      })
    );

    const response = await fetch(STORE_CHECK_URL, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as StoreCheckResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('uploadStoreCheckPhoto error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}
