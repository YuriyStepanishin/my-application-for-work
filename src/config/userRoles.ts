import { userAccessMap, type UserRole } from './allowedEmails';

export type AppSection =
  | 'display-report'
  | 'bonus-report'
  | 'gallery'
  | 'sales'
  | 'route-history'
  | 'active-customer-base'
  | 'messages'
  | 'implementation'
  | 'plan-targets';

const ROLE_ACCESS: Record<UserRole, AppSection[]> = {
  agent: [
    'display-report',
    'bonus-report',
    'gallery',
    'sales',
    'route-history',
    'active-customer-base',
    'messages',
    'implementation',
  ],
  supervisor: [
    'display-report',
    'bonus-report',
    'gallery',
    'sales',
    'route-history',
    'active-customer-base',
    'messages',
    'implementation',
  ],
  admin: [
    'display-report',
    'bonus-report',
    'gallery',
    'sales',
    'route-history',
    'active-customer-base',
    'messages',
    'implementation',
    'plan-targets',
  ],
};

export function getUserRole(email: string | null): UserRole | null {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  const profile = userAccessMap[normalized];
  if (!profile) return null;

  return profile.role;
}

export function getUserDepartment(email: string | null): string | null {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  return userAccessMap[normalized]?.department ?? null;
}

export function getUserRepresentative(email: string | null): string | null {
  if (!email) return null;

  const normalized = email.trim().toLowerCase();
  return userAccessMap[normalized]?.representative ?? null;
}

function normalizeValue(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function normalizeBrand(value: string): string {
  return normalizeValue(value);
}

function getExplicitTrademarkAccessList(trademarkAccess: string[]): string[] {
  const seen = new Set<string>();

  return trademarkAccess
    .map(rule => rule.trim())
    .filter(rule => Boolean(rule) && rule !== '*' && !rule.startsWith('!'))
    .filter(rule => {
      const key = normalizeBrand(rule);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function canSeeByTrademarkAccessRule(
  trademarkAccess: string[],
  brand: string
): boolean {
  const normalizedBrand = normalizeBrand(brand);
  const normalizedRules = trademarkAccess.map(normalizeBrand).filter(Boolean);

  const hasWildcard = normalizedRules.includes('*');
  const denyRules = normalizedRules
    .filter(rule => rule.startsWith('!'))
    .map(rule => rule.slice(1))
    .filter(Boolean);
  const allowRules = normalizedRules.filter(
    rule => rule !== '*' && !rule.startsWith('!')
  );

  if (denyRules.includes(normalizedBrand)) return false;
  if (allowRules.length > 0) return allowRules.includes(normalizedBrand);
  return hasWildcard;
}

function getDepartmentsFromProfile(department: string): string[] {
  return department
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

export function getCurrentAuthorizedEmail(): string | null {
  if (typeof window === 'undefined') return null;
  const auth = window.localStorage.getItem('auth');
  if (!auth) return null;
  return auth.trim().toLowerCase();
}

export function canViewRecordByEmail(
  email: string | null,
  department: string,
  representative: string
): boolean {
  if (!email) return false;

  const normalized = email.trim().toLowerCase();
  const profile = userAccessMap[normalized];
  if (!profile) return false;

  if (profile.role === 'admin') return true;

  const normalizedDepartment = normalizeValue(department);
  const normalizedRepresentative = normalizeValue(representative);

  if (profile.role === 'supervisor') {
    const allowedDepartments = getDepartmentsFromProfile(
      profile.department
    ).map(normalizeValue);
    return allowedDepartments.includes(normalizedDepartment);
  }

  const ownRepresentative = normalizeValue(profile.representative ?? '');
  return (
    Boolean(ownRepresentative) && ownRepresentative === normalizedRepresentative
  );
}

export function canAccessSection(
  role: UserRole | null,
  section: AppSection
): boolean {
  if (!role) return false;
  return ROLE_ACCESS[role].includes(section);
}

export function canUserSeeBrand(
  email: string | null,
  brand: string | null | undefined
): boolean {
  if (!brand) return true;
  if (!email) return true;

  const normalizedEmail = email.trim().toLowerCase();
  const profile = userAccessMap[normalizedEmail];
  if (!profile) return true;

  const trademarkAccess = profile.trademarkAccess ?? [];
  if (trademarkAccess.length > 0) {
    return canSeeByTrademarkAccessRule(trademarkAccess, brand);
  }

  const hiddenBrands = profile.hiddenBrands ?? [];
  if (hiddenBrands.length === 0) return true;

  const hidden = new Set(hiddenBrands.map(normalizeBrand));
  return !hidden.has(normalizeBrand(brand));
}

export function getUserTrademarkAccessBrands(email: string | null): string[] {
  if (!email) return [];

  const normalizedEmail = email.trim().toLowerCase();
  const profile = userAccessMap[normalizedEmail];
  if (!profile) return [];

  const trademarkAccess = profile.trademarkAccess ?? [];
  return getExplicitTrademarkAccessList(trademarkAccess);
}

export function getRoleLabel(role: UserRole): string {
  if (role === 'admin') return 'Керівник';
  if (role === 'supervisor') return 'Супервайзер';
  return 'Торговий представник';
}
