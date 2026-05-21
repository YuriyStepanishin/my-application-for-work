const SPREADSHEET_ID = '1-JNevzeLIByEN-qqL3t8YOpxZFGbdQR0vNFqFeqTLiE';
const SHEET_NAME = 'АКБ';
const FOLDER_ID = '1K9W-hoeszgbDCJdFbiMUQgHoK7ygqSIy';

// ==============================
// GET API
// ==============================

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getSheetData') {
    return json({
      success: true,
      data: getSheetData(),
    });
  }

  if (action === 'getReports') {
    return json({
      success: true,
      data: getReports(),
    });
  }

  return json({
    success: false,
    error: 'Unknown action',
  });
}

// ==============================
// Отримати список ТТ
// ==============================

function getSheetData() {
  const sheet =
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  const values = sheet.getDataRange().getValues();

  values.shift();

  return values.map(row => ({
    department: row[1],
    representative: row[2],
    store: row[3],
  }));
}

// ==============================
// Отримати всі звіти з фото
// ==============================
function getReports() {
  const sheet =
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

  const formulas = sheet.getDataRange().getFormulas();
  const values = sheet.getDataRange().getDisplayValues();

  formulas.shift();
  values.shift();

  return formulas
    .map((row, i) => {
      const photo1 = extractUrl(row[7]);
      const photo2 = extractUrl(row[8]);
      const photo3 = extractUrl(row[9]);

      const photos = [photo1, photo2, photo3].filter(Boolean);

      return {
        department: values[i][1],
        representative: values[i][2],
        store: values[i][3],
        date: values[i][6],
        category: values[i][10],
        photos,
      };
    })
    .filter(r => r.photos.length > 0);
}

// ==============================
// POST API
// ==============================

function doPost(e) {
  try {
    const COL_DEPARTMENT = 2;
    const COL_REPRESENTATIVE = 3;
    const COL_STORE = 4;
    const COL_DATE = 7;
    const COL_PHOTO_1 = 8;
    const COL_CATEGORY = 11;
    const COL_COMMENT = 12;

    const data = JSON.parse(e.parameter.data);

    const department = data.department || '';
    const representative = data.representative || '';
    const store = data.store || '';
    const resolvedDateValue = resolveCaptureDateValue(data);
    const date = toSafeDate(resolvedDateValue);
    const category = data.category || '';
    const comment = data.comment || '';
    const photos = data.photos || [];

    const sheet =
      SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);

    const rootFolder = DriveApp.getFolderById(FOLDER_ID);

    // безпечна назва папки
    const safeRep = representative.replace(/[^\wа-яА-ЯіїєІЇЄ]/g, '_');

    let folderIterator = rootFolder.getFoldersByName(safeRep);

    let folder;

    if (folderIterator.hasNext()) {
      folder = folderIterator.next();
    } else {
      folder = rootFolder.createFolder(safeRep);
    }

    const values = sheet.getDataRange().getValues();

    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (
        values[i][COL_DEPARTMENT - 1] === department &&
        values[i][COL_REPRESENTATIVE - 1] === representative &&
        values[i][COL_STORE - 1] === store
      ) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      sheet.appendRow([
        '',
        department,
        representative,
        store,
        '',
        '',
        date,
        '',
        '',
        '',
        category,
        comment,
      ]);

      rowIndex = sheet.getLastRow();
    }

    sheet.getRange(rowIndex, COL_DATE).setValue(date);
    sheet.getRange(rowIndex, COL_CATEGORY).setValue(category);
    sheet.getRange(rowIndex, COL_COMMENT).setValue(comment);

    const captureDateStamp = Utilities.formatDate(
      date,
      'Europe/Kyiv',
      'yyyy-MM-dd'
    );
    const uploadTimeStamp = Utilities.formatDate(
      new Date(),
      'Europe/Kyiv',
      'HH-mm-ss'
    );

    photos.slice(0, 3).forEach((photo, index) => {
      const extension = photo.type.split('/')[1] || 'jpg';

      const safeStore = store.replace(/[^\wа-яА-ЯіїєІЇЄ]/g, '_');

      const fileName = `${safeRep}_${safeStore}_${captureDateStamp}_${uploadTimeStamp}_${index + 1}.${extension}`;

      const blob = Utilities.newBlob(
        Utilities.base64Decode(photo.base64),
        photo.type,
        fileName
      );

      const file = folder.createFile(blob);

      file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );

      const url = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

      const formula = `=HYPERLINK("${url}"; "📷 Фото ${index + 1}")`;

      sheet.getRange(rowIndex, COL_PHOTO_1 + index).setFormula(formula);
    });

    return json({
      success: true,
    });
  } catch (err) {
    return json({
      success: false,
      error: err.toString(),
    });
  }
}

// ==============================
// Витяг URL з HYPERLINK
// ==============================

function extractUrl(cell) {
  if (!cell) return null;

  const match = cell.match(/https:\/\/[^\"]+/);

  if (!match) return null;

  return match[0].replace(/"/g, '');
}

// ==============================
// Пріоритет дати зйомки
// ==============================

function resolveCaptureDateValue(data) {
  const photos = Array.isArray(data?.photos) ? data.photos : [];

  for (let i = 0; i < photos.length; i++) {
    const capturedAt = String(photos[i]?.capturedAt || '').trim();
    if (capturedAt) return capturedAt;
  }

  const createdDate = String(data?.createdDate || '').trim();
  if (createdDate) return createdDate;

  const date = String(data?.date || '').trim();
  if (date) return date;

  return '';
}

function toSafeDate(value) {
  if (!value) return new Date();

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ==============================
// JSON helper
// ==============================

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
