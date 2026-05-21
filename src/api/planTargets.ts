import { PLAN_TARGETS_URL } from './config';
import type { PlanColumn } from '../components/ImplementationPage/planColumnsStorage';
import { loadPlanColumnsLocal, savePlanColumnsLocal } from './planTargetsLocal';

interface PlanTargetsResponse {
  success: boolean;
  error?: string;
  data?: PlanColumn[];
}

function buildUrl(action: string) {
  const search = new URLSearchParams({ action });
  return `${PLAN_TARGETS_URL}?${search.toString()}`;
}

async function parseResponse(response: Response): Promise<PlanTargetsResponse> {
  const raw = await response.text();
  let json: PlanTargetsResponse;

  try {
    json = JSON.parse(raw) as PlanTargetsResponse;
  } catch {
    const normalized = raw.toLocaleLowerCase('uk-UA');
    if (
      normalized.includes('doGet'.toLocaleLowerCase('uk-UA')) ||
      normalized.includes('doPost'.toLocaleLowerCase('uk-UA')) ||
      normalized.includes('функцію сценарію')
    ) {
      throw new Error(
        'Apps Script deployment не містить doGet/doPost. Оновіть і перевикотіть Web App.'
      );
    }

    throw new Error('Сервер повернув не-JSON відповідь замість API.');
  }

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Не вдалося завантажити планові показники');
  }
  return json;
}

export async function fetchPlanColumns(): Promise<PlanColumn[]> {
  try {
    const response = await fetch(buildUrl('getPlanColumns'));
    const json = await parseResponse(response);
    const columns = Array.isArray(json.data) ? json.data : [];
    savePlanColumnsLocal(columns);
    return columns;
  } catch {
    return loadPlanColumnsLocal();
  }
}

export async function savePlanColumnsToSheet(
  columns: PlanColumn[]
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        action: 'savePlanColumns',
        columns,
      })
    );

    const response = await fetch(PLAN_TARGETS_URL, {
      method: 'POST',
      body: formData,
    });

    await parseResponse(response);
    savePlanColumnsLocal(columns);
  } catch {
    savePlanColumnsLocal(columns);
  }
}
