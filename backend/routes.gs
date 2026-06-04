/**
 * Routes Backend — Google Apps Script (GET only)
 *
 * Deploy as Web App:
 * 1) Execute as: Me
 * 2) Who has access: Anyone
 */

const ROUTES_SPREADSHEET_ID = '1Ufpl8OYn5uB_lJAtq48DGOVn3zMeofZARL11vSHfXfM';
const ROUTES_SHEET_NAME = 'Маршрути_ТА';

function doGet(e) {
  try {
    const action = getParam(e, 'action', 'getRoutes');

    if (action === 'getRoutes') {
      const filters = {
        day: normalizeText(getParam(e, 'day', getParam(e, 'weekday', ''))),
        search: normalizeText(getParam(e, 'search', '')),
        limit: toPositiveInt(getParam(e, 'limit', ''), 0),
        offset: toPositiveInt(getParam(e, 'offset', ''), 0),
      };

      const data = getRoutes(filters);
      return jsonResponse({ success: true, data });
    }

    if (action === 'health') {
      return jsonResponse({ success: true, message: 'Routes API is running' });
    }

    return jsonResponse({ success: false, error: 'Unsupported action' });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function getRoutes(filters) {
  const sheet = getRoutesSheet();
  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length <= 1) return [];

  const header = values[0].map(h => String(h || '').trim());
  const rows = values.slice(1);

  const dayIndex = findHeaderIndex(header, [
    'ДеньТижня',
    'ДеньТиждня',
    'День тижня',
    'день тижня',
    'деньтижня',
    'деньтиждня',
    'weekday',
  ]);
  const explicitStoreIndex = findHeaderIndex(header, [
    'АльтНазва',
    'Альт Назва',
    'торгова_точка',
    'altname',
    'store',
    'ТТ',
  ]);
  const pointIndex = findHeaderIndex(header, ['Точка', 'точка', 'Назва']);
  const addressIndex = findHeaderIndex(header, [
    'Факт. адрес',
    'факт. адрес',
    'адреса',
    'Адреса',
  ]);
  const agentIndex = findHeaderIndex(header, ['Агент', 'ТП', 'agent']);

  if (dayIndex < 0 || (explicitStoreIndex < 0 && pointIndex < 0)) {
    throw new Error(
      'Required headers not found. Expected columns: ДеньТижня + (АльтНазва або Точка).'
    );
  }

  const mapped = rows
    .map(row => {
      const day = cleanText(row[dayIndex]);
      const explicitStore =
        explicitStoreIndex >= 0 ? cleanText(row[explicitStoreIndex]) : '';
      const point = pointIndex >= 0 ? cleanText(row[pointIndex]) : '';
      const address = addressIndex >= 0 ? cleanText(row[addressIndex]) : '';
      const store =
        explicitStore ||
        (point ? (address ? `${point} (${address})` : point) : '');
      const agent = agentIndex >= 0 ? cleanText(row[agentIndex]) : '';

      return { day, store, agent };
    })
    .filter(item => item.day && item.store)
    .filter(item => {
      if (filters.day && normalizeText(item.day) !== filters.day) return false;

      if (filters.search) {
        const haystack = normalizeText(`${item.day} ${item.store}`);
        if (!haystack.includes(filters.search)) return false;
      }

      return true;
    });

  if (filters.offset > 0 || filters.limit > 0) {
    const start = Math.min(filters.offset, mapped.length);
    const end = filters.limit > 0 ? start + filters.limit : mapped.length;
    return mapped.slice(start, end);
  }

  return mapped;
}

function getRoutesSheet() {
  const ss = SpreadsheetApp.openById(ROUTES_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ROUTES_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet not found: ${ROUTES_SHEET_NAME}`);
  }

  return sheet;
}

function findHeaderIndex(header, candidates) {
  const normalized = header.map(normalizeText);

  for (let i = 0; i < candidates.length; i += 1) {
    const key = normalizeText(candidates[i]);
    const idx = normalized.indexOf(key);
    if (idx >= 0) return idx;
  }

  return -1;
}

function getParam(e, key, fallback) {
  if (!e || !e.parameter) return fallback;
  const value = e.parameter[key];
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .trim();
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('uk-UA');
}

function toPositiveInt(raw, fallback) {
  const parsed = Number(String(raw || '').trim());
  if (!Number.isFinite(parsed)) return fallback;
  const intValue = Math.trunc(parsed);
  return intValue >= 0 ? intValue : fallback;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
