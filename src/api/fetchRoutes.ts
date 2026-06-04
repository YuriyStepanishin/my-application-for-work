import { ROUTES_URL } from './config';

export type RouteRow = {
  day: string;
  store: string;
  agent: string;
};

type RoutesResponse = {
  success?: boolean;
  error?: string;
  data?: unknown;
};

function normalizeValue(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function toRouteRow(raw: unknown): RouteRow | null {
  if (!raw || typeof raw !== 'object') return null;

  const obj = raw as Record<string, unknown>;
  const day = normalizeValue(obj.day);
  const store = normalizeValue(obj.store);
  const agent = normalizeValue(obj.agent);

  if (!day || !store || !agent) return null;

  return { day, store, agent };
}

export async function fetchRoutes(): Promise<RouteRow[]> {
  const url = `${ROUTES_URL}?action=getRoutes`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити маршрути (${response.status})`);
  }

  const payload = (await response.json()) as RoutesResponse;
  if (!payload.success) {
    throw new Error(payload.error || 'Не вдалося отримати дані маршрутів');
  }

  if (!Array.isArray(payload.data)) return [];

  return payload.data
    .map(toRouteRow)
    .filter((item): item is RouteRow => item !== null);
}
