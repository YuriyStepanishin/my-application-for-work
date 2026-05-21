/**
 * Plan Targets backend for Google Sheets.
 *
 * Spreadsheet: 1qjZIgcd4baODxL9exaUZdSBTa5cAASoHkhSqak-hY38
 * Uses the first sheet (gid=0).
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 */

var SPREADSHEET_ID = '1qjZIgcd4baODxL9exaUZdSBTa5cAASoHkhSqak-hY38';
var SHEET_NAME = 'PlanTargets';

var HEADER_ROW = [
  'id',
  'label',
  'brand',
  'brands_json',
  'assortmentMode',
  'assortmentProduct',
  'assortmentProducts_json',
  'metric',
  'threshold',
  'calcMode',
  'agentPlans_json',
  'deptMode_json',
  'deptPlans_json',
  'updatedAt',
];

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'getPlanColumns';
    if (action !== 'getPlanColumns') {
      return jsonResponse({ success: false, error: 'Unsupported action' });
    }

    return jsonResponse({
      success: true,
      data: readPlanColumns(),
    });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var payload = parsePayload(e);
    if (!payload || payload.action !== 'savePlanColumns') {
      return jsonResponse({ success: false, error: 'Unsupported action' });
    }

    var columns = Array.isArray(payload.columns) ? payload.columns : [];
    writePlanColumns(columns);

    return jsonResponse({ success: true, result: { count: columns.length } });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function parsePayload(e) {
  if (!e) return null;

  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (jsonErr) {
      // For multipart/form-data requests Apps Script may expose values via
      // e.parameter.data, but in some cases only raw body is available.
      if (e.parameter && e.parameter.data) {
        return JSON.parse(e.parameter.data);
      }

      var fromMultipart = extractMultipartField(raw, 'data');
      if (fromMultipart) {
        return JSON.parse(fromMultipart);
      }

      throw jsonErr;
    }
  }

  if (e.parameter && e.parameter.data) {
    return JSON.parse(e.parameter.data);
  }

  return null;
}

function getSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  // Avoid writing into an unrelated first sheet when the target sheet name
  // is missing.
  return ss.insertSheet(SHEET_NAME);
}

function ensureHeaderRow(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, HEADER_ROW.length).getValues()[0];
  var hasHeader = firstRow.some(function (value) {
    return String(value || '').trim() !== '';
  });

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
    sheet.setFrozenRows(1);
  }
}

function readPlanColumns() {
  var sheet = getSheet();
  ensureHeaderRow(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var rows = sheet.getRange(2, 1, lastRow - 1, HEADER_ROW.length).getValues();
  var columns = [];

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || row.length === 0) continue;

    var id = String(row[0] || '').trim();
    if (!id) continue;

    columns.push({
      id: id,
      label: String(row[1] || ''),
      brand: String(row[2] || ''),
      brands: parseJsonArray(row[3]),
      assortmentMode: String(row[4] || '') || undefined,
      assortmentProduct: String(row[5] || ''),
      assortmentProducts: parseJsonArray(row[6]),
      metric: String(row[7] || 'tt_from_x'),
      threshold: Number(row[8] || 0),
      calcMode: String(row[9] || '') || undefined,
      agentPlans: parseJsonObject(row[10]),
      deptMode: parseJsonObject(row[11]),
      deptPlans: parseJsonObject(row[12]),
    });
  }

  return columns;
}

function writePlanColumns(columns) {
  var sheet = getSheet();
  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
  sheet.setFrozenRows(1);

  if (columns.length === 0) return;

  var rows = columns.map(function (column) {
    return [
      column.id || Utilities.getUuid(),
      column.label || '',
      column.brand || '',
      JSON.stringify(column.brands || []),
      column.assortmentMode || 'all',
      column.assortmentProduct || '',
      JSON.stringify(column.assortmentProducts || []),
      column.metric || 'tt_from_x',
      Number(column.threshold || 0),
      column.calcMode || 'period',
      JSON.stringify(column.agentPlans || {}),
      JSON.stringify(column.deptMode || {}),
      JSON.stringify(column.deptPlans || {}),
      new Date().toISOString(),
    ];
  });

  sheet.getRange(2, 1, rows.length, HEADER_ROW.length).setValues(rows);
}

function parseJsonArray(value) {
  try {
    var parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function parseJsonObject(value) {
  try {
    var parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (err) {
    return {};
  }
}

function extractMultipartField(raw, fieldName) {
  if (!raw) return null;

  var escapedName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var re = new RegExp(
    'name="' + escapedName + '"[\\s\\S]*?\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--',
    'i'
  );
  var match = raw.match(re);
  if (!match || match.length < 2) return null;

  return String(match[1] || '').trim();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
