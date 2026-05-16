/**
 * StoreCheck Backend — Google Apps Script
 *
 * Розгортання:
 *  1. Відкрийте script.google.com → Новий проєкт
 *  2. Вставте цей код, збережіть
 *  3. Розгорніть як веб-додаток:
 *       Execute as: Me
 *       Who has access: Anyone
 *  4. Скопіюйте URL і вставте в STORE_CHECK_URL у src/api/config.ts
 *
 * Обробляє два типи POST-запитів:
 *   { action: 'uploadPhoto', ... }  — завантаження фото в Drive
 *   { date, ttName, ... }           — збереження StoreCheck у Sheets
 */

// ─── Конфігурація ────────────────────────────────────────────────────────────

var SPREADSHEET_ID = '1csODzE19ie7L0WV2Y7PBKxJvrtPAvq8cDJFe_8ax-ck';
var PHOTOS_FOLDER_ID = '10xN3EizeASLbLSRVjwbvBglKf_pJjMtv';
var SHEET_NAME = 'StoreCheck';

// ─── Точка входу ─────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    if (payload.action === 'uploadPhoto') {
      return handlePhotoUpload(payload);
    }

    return handleStoreCheck(payload);
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({ success: true, message: 'StoreCheck API is running' });
}

// ─── Збереження StoreCheck у Sheets ──────────────────────────────────────────

function handleStoreCheck(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      'ID',
      'Дата',
      'ТТ',
      'Відділ',
      'ТП',
      'Email',
      'Категорія Orimi',
      'Категорія Delicia',
      // Чай
      'Принцеса',
      'Greenfield',
      'TESS',
      'Чай разом',
      // Кава
      'Жокей',
      'Jardin',
      'Piazza',
      'Кава разом',
      // Strauss
      'Elite Fort',
      'Чорна Карта',
      'Ambassador',
      'Цикорій+напої',
      'Strauss разом',
      // Вода
      'Bon Boisson',
      'Чудо Сад',
      'Вода разом',
      // Delicia / Інше
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
      // Вагове печиво
      'Домашнє',
      'Мальвіна',
      'До чаю',
      'Джулія какао',
      // Вагове з наповнювачем
      'Супер Моніка',
      'Желейна ягідка',
      'Артемон',
      'Маргаритка',
      'Інь-Янь',
      // Прянична група
      'Ворзельський',
      'Баварський',
      'Ведмедики',
      'Мамин пряник',
      // Вафельна
      'Трубочка',
      'Ритм/Артек',
      // Додатковий
      'Вівсяне/Кукурудзяне',
      'Альпійське/Фітнес',
      'Супер Стар BG',
      'Інше печиво',
      'Інше пряник',
      // Сума
      'BG',
      'Інші снеки',
      // Службові
      'Коментар',
      'Timestamp',
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

  var id = Utilities.getUuid();
  var timestamp = new Date().toISOString();

  var row = [
    id,
    data.date || '',
    data.ttName || '',
    data.department || '',
    data.representative || '',
    data.userEmail || '',
    // Категорія
    data.categoryOrimi || '',
    data.categoryDelicia || '',
    // Чай
    num(data.princessa),
    num(data.greenfield),
    num(data.tess),
    num(data.tea_total),
    // Кава
    num(data.jockey),
    num(data.jardin),
    num(data.piazza),
    num(data.coffee_total),
    // Strauss
    num(data.eliteFort),
    num(data.blackCard),
    num(data.ambassador),
    num(data.drinks),
    num(data.strauss_total),
    // Вода
    num(data.bonBoisson),
    num(data.chudoSad),
    num(data.water_total),
    // Delicia / Інше
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
    // Вагове печиво
    num(data.domashne),
    num(data.malyuk),
    num(data.pryazhene),
    num(data.kakao),
    // Вагове з наповнювачем
    num(data.superMonika),
    num(data.riagel),
    num(data.artek),
    num(data.bisquit),
    num(data.fitness),
    // Прянична
    num(data.vorzelsky),
    num(data.bavarianChocolate),
    num(data.bears),
    num(data.maminPryanik),
    // Вафельна
    num(data.waffleTube),
    num(data.ritm_artek),
    // Додатковий
    num(data.vivsyane),
    num(data.alpiyske_fitnes),
    num(data.superStarBG),
    num(data.other_snacks_cookie),
    num(data.other_snacks_pryanik),
    // Сума
    num(data.bg),
    num(data.other_snacks),
    // Службові
    data.comment || '',
    timestamp,
  ];

  sheet.appendRow(row);

  return jsonResponse({ success: true, result: { id: id } });
}

// ─── Завантаження фото в Drive ────────────────────────────────────────────────

/**
 * Payload для uploadPhoto (надсилається з StoreCheckPhotoUpload через saveReport):
 * {
 *   action: 'uploadPhoto',
 *   department: string,
 *   representative: string,
 *   store: string,
 *   createdDate: string,
 *   category: 'storecheck',
 *   comment: string,
 *   folderUrl: string,   // ігноруємо — завжди використовуємо PHOTOS_FOLDER_ID
 *   photos: [{ base64: string, type: string, name: string }]
 * }
 */
function handlePhotoUpload(data) {
  var folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID);

  // Підпапка: Відділ / ТП / Дата
  var subFolderName = [
    data.representative || data.store || 'unknown',
    data.createdDate || formatDate(new Date()),
  ].join(' — ');

  var subFolder = getOrCreateFolder(folder, subFolderName);

  var uploadedFiles = [];
  var photos = data.photos || [];

  for (var i = 0; i < photos.length; i++) {
    var photo = photos[i];
    try {
      var base64Data = photo.base64.replace(/^data:[^;]+;base64,/, '');
      var bytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(
        bytes,
        photo.type || 'image/jpeg',
        photo.name || 'photo_' + (i + 1) + '.jpg'
      );
      var file = subFolder.createFile(blob);
      uploadedFiles.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
      });
    } catch (photoErr) {
      Logger.log('Photo upload error: ' + String(photoErr));
    }
  }

  return jsonResponse({
    success: true,
    result: { files: uploadedFiles },
  });
}

// ─── Допоміжні функції ────────────────────────────────────────────────────────

function num(value) {
  return typeof value === 'number' ? value : 0;
}

function formatDate(date) {
  var d = date.getDate();
  var m = date.getMonth() + 1;
  var y = date.getFullYear();
  return y + '-' + pad(m) + '-' + pad(d);
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

function getOrCreateFolder(parent, name) {
  var iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parent.createFolder(name);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
