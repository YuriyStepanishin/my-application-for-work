import type { PlanColumn } from '../components/ImplementationPage/planColumnsStorage';

const PLAN_TARGETS_STORAGE_KEY = 'plan-targets-temp-v1';

export function loadPlanColumnsLocal(): PlanColumn[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(PLAN_TARGETS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as PlanColumn[];
  } catch {
    return [];
  }
}

export function savePlanColumnsLocal(columns: PlanColumn[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    PLAN_TARGETS_STORAGE_KEY,
    JSON.stringify(columns)
  );
}
