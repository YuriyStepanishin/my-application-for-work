import { STORE_CHECK_URL } from './config';

interface StoreCheckPayload {
  date: string;
  ttName: string;
  address?: string;
  department?: string;
  representative?: string;
  userEmail?: string;
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
  drinks?: number;
  categoryOrimi?: string;
  categoryDelicia?: string;
  comment?: string;
}

interface StoreCheckResponse {
  success: boolean;
  error?: string;
  result?: {
    id?: string;
  };
}

export async function saveStoreCheck(
  payload: StoreCheckPayload
): Promise<StoreCheckResponse> {
  try {
    const response = await fetch(STORE_CHECK_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
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
    console.error('saveStoreCheck error:', error);

    return {
      success: false,
      error: 'Network error',
    };
  }
}
