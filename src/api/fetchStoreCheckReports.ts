import { STORE_CHECK_URL } from './config';
import {
  canViewRecordByEmail,
  getCurrentAuthorizedEmail,
} from '../config/userRoles';

export type StoreCheckTmSums = {
  tea: number;
  coffee: number;
  strauss: number;
  water: number;
  delicia: number;
  other: number;
  bg: number;
  snacks: number;
};

export type StoreCheckMetric = {
  label: string;
  value: string;
};

export type StoreCheckReport = {
  department: string;
  representative: string;
  store: string;
  date: string;
  category: 'storecheck';
  photos: string[];
  commentOrimi?: string;
  commentDelicia?: string;
  tmSums: StoreCheckTmSums;
  metrics: StoreCheckMetric[];
};

export async function fetchStoreCheckReports(): Promise<StoreCheckReport[]> {
  const res = await fetch(`${STORE_CHECK_URL}?action=getReports`);

  if (!res.ok) {
    throw new Error('Помилка завантаження StoreCheck');
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };

  if (!Array.isArray(json.data)) {
    if (
      typeof json.message === 'string' &&
      json.message.includes('API is running')
    ) {
      throw new Error(
        'StoreCheck бекенд розгорнуто без getReports. Потрібно перевикотити backend/storecheck.gs як Web App і оновити STORE_CHECK_URL.'
      );
    }

    throw new Error(
      json.error || 'StoreCheck бекенд повернув некоректну відповідь.'
    );
  }

  const reports = json.data;

  const authEmail = getCurrentAuthorizedEmail();
  if (!authEmail) return [];

  return reports.filter((report: StoreCheckReport) =>
    canViewRecordByEmail(authEmail, report.department, report.representative)
  );
}
