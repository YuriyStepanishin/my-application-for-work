/**
 * StoreCheck Backend — Google Apps Script
 * Updated version (ES6+, без var)
 */

// ───────────────── CONFIG ─────────────────

const SPREADSHEET_ID = '1csODzE19ie7L0WV2Y7PBKxJvrtPAvq8cDJFe_8ax-ck';
const PHOTOS_FOLDER_ID = '1lv-_uceNjbLVfb8dK1crV3kW-YE0L6_y';

const SHEET_NAME = 'StoreCheck';

const STORE_CHECK_HEADERS = [
  'ID',
  'Дата',
  'ТТ',
  'Відділ',
  'ТП',

  'Категорія Orimi',

  'Принцеса',
  'Greenfield',
  'TESS',
  'Чай разом',

  'Жокей',
  'Jardin',
  'Piazza',
  'Кава разом',

  'Elite Fort',
  'Чорна Карта',
  'Ambassador',
  'Цикорій+напої',
  'Strauss разом',

  'Bon Boisson',
  'Чудо Сад',
  'Вода разом',

  'Коментар Orimi',

  'Категорія Delicia',

  'Flex Delicia',
  'Flex Інше',

  'Тубус Delicia',
  'Тубус Інше',

  '0.25-0.45 Delicia',
  '0.25-0.45 Інше',

  'Вагове Delicia',
  'Вагове Інше',

  'Delicia разом',
  'Інше разом',

  'Домашнє',
  'Мальвіна',
  'До чаю',
  'Джулія какао',

  'Супер Моніка',
  'Желейна ягідка',
  'Артемон',
  'Маргаритка',
  'Інь-Янь',

  'Ворзельський',
  'Баварський',
  'Ведмедики',
  'Мамин пряник',

  'Трубочка',
  'Ритм/Артек',

  'Вівсяне/Кукурудзяне',
  'Альпійське/Фітнес',
  'Супер Стар BG',
  'Інше печиво',
  'Інше пряник',

  'BG',
  'Інші снеки',

  'Timestamp',
];

const PHOTO_HEADERS = [
  'Фото 1',
  'Фото 2',
  'Фото 3',
  'Фото 4',
  'Фото 5',
  'Фото 6',
  'Фото 7',
];

const COMMENT_HEADERS = ['Коментар Delicia'];

// ───────────────── ENTRY ─────────────────

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const payload = parsePayload(e);

    if (!payload) {
      return jsonResponse({
        success: false,
        error: 'Invalid payload',
      });
    }

    if (payload.action === 'uploadPhoto') {
      return handlePhotoUpload(payload);
    }

    return handleStoreCheck(payload);
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err),
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e?.parameter?.action || '';

  if (action === 'getReports') {
    return jsonResponse({
      success: true,
      data: getReports(),
    });
  }

  if (action === 'getSheetData') {
    return jsonResponse({
      success: true,
      data: getSheetData(),
    });
  }

  return jsonResponse({
    success: true,
    message: 'StoreCheck API is running',
  });
}

// ───────────────── PAYLOAD ─────────────────

function parsePayload(e) {
  if (!e) return null;

  try {
    if (e.postData?.contents) {
      const raw = e.postData.contents;

      try {
        return JSON.parse(raw);
      } catch (jsonErr) {
        if (e.parameter?.data) {
          try {
            return JSON.parse(e.parameter.data);
          } catch (paramErr) {
            // continue to multipart fallback
          }
        }

        const fromMultipart = extractMultipartField(raw, 'data');
        if (fromMultipart) {
          try {
            return JSON.parse(fromMultipart);
          } catch (multipartErr) {
            return null;
          }
        }

        return null;
      }
    }

    if (e.parameter?.data) {
      return JSON.parse(e.parameter.data);
    }

    return null;
  } catch (err) {
    return null;
  }
}

// ───────────────── STORECHECK ─────────────────

function handleStoreCheck(data) {
  validateStoreCheckPayload(data);

  const sheet = getOrCreateStoreCheckSheet();

  let rowIndex = findStoreCheckRowIndex(sheet, data);

  if (rowIndex < 2) {
    rowIndex = appendStoreCheckRow(sheet, data);
  } else {
    const existingId = getRowValueByHeader(sheet, rowIndex, 'ID');

    writeStoreCheckRow(sheet, rowIndex, data, existingId);
  }

  const id = getRowValueByHeader(sheet, rowIndex, 'ID');

  if (Array.isArray(data.photos) && data.photos.length) {
    upsertPhotoLinksToRow(sheet, rowIndex, data.photos, { append: true });
  }

  return jsonResponse({
    success: true,
    result: { id },
  });
}

// ───────────────── VALIDATION ─────────────────

function validateStoreCheckPayload(data) {
  const requiredFields = ['ttName', 'department', 'representative'];

  for (const field of requiredFields) {
    if (!String(data[field] || '').trim()) {
      throw new Error(`Missing field: ${field}`);
    }
  }
}

// ───────────────── PHOTO UPLOAD ─────────────────

function handlePhotoUpload(data) {
  const sheet = getOrCreateStoreCheckSheet();

  const folder = getPhotosFolder(data);

  const subFolderName = sanitizeFilePart(
    data.representative || data.store || 'unknown'
  );

  const subFolder = getOrCreateFolder(folder, subFolderName);

  const uploadedFiles = [];

  const photos = data.photos || [];

  if (!photos.length) {
    throw new Error('No photos provided');
  }

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    const base64Data = String(photo.base64 || '').replace(
      /^data:[^;]+;base64,/,
      ''
    );

    const bytes = Utilities.base64Decode(base64Data);

    const extension = resolveExtension(photo);

    const fileName = buildPhotoFileName(
      data.representative,
      data.store,
      resolvePhotoDate(data),
      i,
      extension
    );

    const blob = Utilities.newBlob(bytes, photo.type || 'image/jpeg', fileName);

    const file = subFolder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    uploadedFiles.push({
      id: file.getId(),
      name: file.getName(),
      url,
    });
  }

  let rowIndex = findStoreCheckRowIndex(sheet, data);

  if (rowIndex < 2) {
    rowIndex = createPhotoPlaceholderRow(sheet, data);
  }

  upsertPhotoLinksToRow(
    sheet,
    rowIndex,
    uploadedFiles.map(f => f.url),
    { append: true }
  );

  return jsonResponse({
    success: true,
    result: {
      files: uploadedFiles,
    },
  });
}

// ───────────────── SHEETS ─────────────────

function getOrCreateStoreCheckSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  ensureHeaders(sheet);

  return sheet;
}

function ensureHeaders(sheet) {
  const allHeaders = [
    ...STORE_CHECK_HEADERS,
    ...PHOTO_HEADERS,
    ...COMMENT_HEADERS,
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);

    sheet.setFrozenRows(1);

    return;
  }

  const headers = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1))
    .getDisplayValues()[0]
    .map(v => String(v || '').trim());

  for (const header of allHeaders) {
    if (!headers.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  }
}

// ───────────────── ROW SEARCH ─────────────────

function findStoreCheckRowIndex(sheet, data) {
  const range = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn());

  const values = range.getDisplayValues();

  if (values.length <= 1) {
    return -1;
  }

  const map = getHeaderIndexMap(values[0]);

  const targetStore = normalizeValue(data.ttName || data.store);

  const targetRep = normalizeValue(data.representative);

  const targetDep = normalizeValue(data.department);

  for (let r = values.length - 1; r >= 1; r--) {
    const rowStore = normalizeValue(getValueByHeader(values[r], map, 'ТТ'));

    const rowRep = normalizeValue(getValueByHeader(values[r], map, 'ТП'));

    const rowDep = normalizeValue(getValueByHeader(values[r], map, 'Відділ'));

    if (targetStore !== rowStore) continue;
    if (targetRep !== rowRep) continue;
    if (targetDep !== rowDep) continue;

    return r + 1;
  }

  return -1;
}

// ───────────────── APPEND ─────────────────

function appendStoreCheckRow(sheet, data) {
  const headers = getSheetHeaders(sheet);

  const valuesMap = buildStoreCheckValueMap(data);

  const row = buildRowByHeaders(headers, valuesMap);

  sheet.appendRow(row);

  return sheet.getLastRow();
}

function createPhotoPlaceholderRow(sheet, data) {
  const placeholder = {
    date: resolvePhotoDate(data),
    ttName: data.ttName || data.store || '',
    department: data.department || '',
    representative: data.representative || '',
    categoryOrimi: '',
    categoryDelicia: '',
    comment: '',
    commentDelicia: '',
  };

  return appendStoreCheckRow(sheet, placeholder);
}

function writeStoreCheckRow(sheet, rowIndex, data, idOverride) {
  const headers = getSheetHeaders(sheet);

  const existing = sheet
    .getRange(rowIndex, 1, 1, headers.length)
    .getValues()[0];

  const valuesMap = buildStoreCheckValueMap(data, idOverride);

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];

    if (Object.prototype.hasOwnProperty.call(valuesMap, header)) {
      existing[i] = valuesMap[header];
    }
  }

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([existing]);
}

// ───────────────── BUILDERS ─────────────────

function buildStoreCheckValueMap(data, idOverride) {
  const row = buildStoreCheckRow(data, idOverride);

  const map = {};

  for (let i = 0; i < STORE_CHECK_HEADERS.length; i++) {
    map[STORE_CHECK_HEADERS[i]] = row[i];
  }

  map['Коментар Orimi'] = data.comment || '';

  map['Коментар Delicia'] = data.commentDelicia || '';

  return map;
}

function buildStoreCheckRow(data, idOverride) {
  const id = String(idOverride || '').trim() || Utilities.getUuid();

  return [
    id,

    data.date || resolvePhotoDate(data),

    data.ttName || data.store || '',

    data.department || '',

    data.representative || '',

    data.categoryOrimi || '',

    num(data.princessa),
    num(data.greenfield),
    num(data.tess),
    num(data.tea_total),

    num(data.jockey),
    num(data.jardin),
    num(data.piazza),
    num(data.coffee_total),

    num(data.eliteFort),
    num(data.blackCard),
    num(data.ambassador),
    num(data.drinks),
    num(data.strauss_total),

    num(data.bonBoisson),
    num(data.chudoSad),
    num(data.water_total),

    data.comment || '',

    data.categoryDelicia || '',

    num(data.fas_delicia),
    num(data.fas_other),

    num(data.tubus_delicia),
    num(data.tubus_other),

    num(data.small_delicia),
    num(data.small_other),

    num(data.weight_delicia),
    num(data.weight_other),

    num(data.delicia_total),
    num(data.other_total),

    num(data.domashne),
    num(data.malyuk),
    num(data.pryazhene),
    num(data.kakao),

    num(data.superMonika),
    num(data.riagel),
    num(data.artek),
    num(data.bisquit),
    num(data.fitness),

    num(data.vorzelsky),
    num(data.bavarianChocolate),
    num(data.bears),
    num(data.maminPryanik),

    num(data.waffleTube),
    num(data.ritm_artek),

    num(data.vivsyane),
    num(data.alpiyske_fitnes),
    num(data.superStarBG),
    num(data.other_snacks_cookie),
    num(data.other_snacks_pryanik),

    num(data.bg),
    num(data.other_snacks),

    new Date().toISOString(),
  ];
}

// ───────────────── HELPERS ─────────────────

function getSheetHeaders(sheet) {
  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(v => String(v || '').trim());
}

function buildRowByHeaders(headers, valuesMap) {
  return headers.map(header =>
    Object.prototype.hasOwnProperty.call(valuesMap, header)
      ? valuesMap[header]
      : ''
  );
}

function getHeaderIndexMap(headers) {
  const map = {};

  headers.forEach((h, i) => {
    const key = String(h || '').trim();

    if (key && !(key in map)) {
      map[key] = i;
    }
  });

  return map;
}

function getValueByHeader(row, map, headerName) {
  const idx = map[headerName];

  if (typeof idx !== 'number') {
    return '';
  }

  return row[idx] || '';
}

function getRowValueByHeader(sheet, rowIndex, headerName) {
  const headers = getSheetHeaders(sheet);

  const map = getHeaderIndexMap(headers);

  const idx = map[headerName];

  if (typeof idx !== 'number') {
    return '';
  }

  return String(
    sheet.getRange(rowIndex, idx + 1).getDisplayValue() || ''
  ).trim();
}

function normalizeValue(value) {
  return String(value || '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function num(value) {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  const normalized = String(value || '')
    .replace(',', '.')
    .trim();

  if (!normalized) return 0;

  const parsed = Number(normalized);

  return isNaN(parsed) ? 0 : parsed;
}

// ───────────────── PHOTOS ─────────────────

function upsertPhotoLinksToRow(sheet, rowIndex, photos, options = {}) {
  const headers = getSheetHeaders(sheet);

  const map = getHeaderIndexMap(headers);

  const existing = [];

  for (const header of PHOTO_HEADERS) {
    const idx = map[header];

    if (typeof idx !== 'number') {
      existing.push('');
      continue;
    }

    const cell = sheet.getRange(rowIndex, idx + 1);

    const formula = cell.getFormula();

    const value = cell.getDisplayValue();

    const existingUrl = extractUrl(formula) || String(value || '').trim();

    existing.push(isHttpUrl(existingUrl) ? existingUrl : '');
  }

  const append = Boolean(options.append);

  const merged = append ? existing.slice() : [];

  for (const photo of photos) {
    const rawUrl = typeof photo === 'string' ? photo : photo?.url;
    const url = String(rawUrl || '').trim();

    if (!isHttpUrl(url)) continue;

    if (merged.includes(url)) {
      continue;
    }

    const freeIndex = merged.indexOf('');

    if (freeIndex === -1) {
      break;
    }

    merged[freeIndex] = url;
  }

  for (let i = 0; i < PHOTO_HEADERS.length; i++) {
    const idx = map[PHOTO_HEADERS[i]];

    if (typeof idx !== 'number') {
      continue;
    }

    const range = sheet.getRange(rowIndex, idx + 1);

    const url = merged[i];

    if (!url) {
      range.clearContent();
      continue;
    }

    range.setFormula(`=HYPERLINK("${url}","📷 Фото ${i + 1}")`);
  }
}

// ───────────────── FILE HELPERS ─────────────────

function resolveExtension(photo) {
  const type = String(photo?.type || '').toLowerCase();

  if (type.includes('/')) {
    return type.split('/')[1] || 'jpg';
  }

  return 'jpg';
}

function sanitizeFilePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPhotoFileName(
  representative,
  store,
  photoDate,
  index,
  extension
) {
  return (
    [
      sanitizeFilePart(representative),
      sanitizeFilePart(store),
      sanitizeFilePart(photoDate),
      index + 1,
    ].join('-') +
    '.' +
    extension
  );
}

function resolvePhotoDate(data) {
  const photos = data && Array.isArray(data.photos) ? data.photos : [];

  for (let i = 0; i < photos.length; i++) {
    const candidate = String(photos[i]?.capturedAt || '').trim();
    if (candidate) return candidate;
  }

  return data.date || data.createdDate || formatDate(new Date());
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function extractUrl(value) {
  const match = String(value || '').match(/https:\/\/[^"]+/);

  return match?.[0] || '';
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getPhotosFolder(data) {
  const folderId = extractDriveId(data.folderUrl || '');

  return DriveApp.getFolderById(folderId || PHOTOS_FOLDER_ID);
}

function extractDriveId(url) {
  const value = String(url || '');

  const match = value.match(/[-\w]{25,}/);

  return match?.[0] || '';
}

function getOrCreateFolder(parent, name) {
  const folders = parent.getFoldersByName(name);

  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function getStoreCheckSheetIfExists() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  return ss.getSheetByName(SHEET_NAME);
}

// ───────────────── REPORTS ─────────────────

function getReports() {
  const sheet = getStoreCheckSheetIfExists();
  if (!sheet) return [];

  const dataRange = sheet.getDataRange();
  const formulas = dataRange.getFormulas();
  const values = dataRange.getDisplayValues();

  if (values.length <= 1) return [];

  const map = getHeaderIndexMap(values[0]);

  const photosCols = PHOTO_HEADERS.map(header => {
    const idx = map[header];
    return typeof idx === 'number' && idx >= 0 ? idx : -1;
  });

  const result = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const photoUrls = [];

    for (let j = 0; j < photosCols.length; j++) {
      const col = photosCols[j];
      if (col < 0) continue;

      const fromFormula = extractUrl(formulas[i][col]);
      const fromValue = String(row[col] || '').trim();
      const url = fromFormula || fromValue;
      if (isHttpUrl(url)) photoUrls.push(url);
    }

    result.push({
      department: getValueByHeader(row, map, 'Відділ'),
      representative: getValueByHeader(row, map, 'ТП'),
      store: getValueByHeader(row, map, 'ТТ'),
      date: getValueByHeader(row, map, 'Дата'),
      category: 'storecheck',
      photos: photoUrls,
      commentOrimi: getValueByHeader(row, map, 'Коментар Orimi'),
      commentDelicia: getValueByHeader(row, map, 'Коментар Delicia'),
      tmSums: {
        tea: toReportNumber(getValueByHeader(row, map, 'Чай разом')),
        coffee: toReportNumber(getValueByHeader(row, map, 'Кава разом')),
        strauss: toReportNumber(getValueByHeader(row, map, 'Strauss разом')),
        water: toReportNumber(getValueByHeader(row, map, 'Вода разом')),
        delicia: toReportNumber(getValueByHeader(row, map, 'Delicia разом')),
        other: toReportNumber(getValueByHeader(row, map, 'Інше разом')),
        bg: toReportNumber(getValueByHeader(row, map, 'BG')),
        snacks: toReportNumber(getValueByHeader(row, map, 'Інші снеки')),
      },
    });
  }

  return result;
}

function getSheetData() {
  const sheet = getStoreCheckSheetIfExists();
  if (!sheet) return [];

  const values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return [];

  const map = getHeaderIndexMap(values[0]);
  const result = [];

  for (let i = 1; i < values.length; i++) {
    const store = getValueByHeader(values[i], map, 'ТТ');
    if (!String(store || '').trim()) continue;

    result.push({
      department: getValueByHeader(values[i], map, 'Відділ'),
      representative: getValueByHeader(values[i], map, 'ТП'),
      store,
    });
  }

  return result;
}

function toReportNumber(value) {
  const text = String(value || '')
    .replace(',', '.')
    .trim();

  if (!text) return 0;

  const parsed = Number(text);

  return isNaN(parsed) ? 0 : parsed;
}

function extractMultipartField(raw, fieldName) {
  if (!raw) return null;

  const escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    'name="' + escapedName + '"[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--',
    'i'
  );

  const match = raw.match(re);
  if (!match || match.length < 2) return null;

  return String(match[1] || '').trim();
}

// ───────────────── RESPONSE ─────────────────

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
