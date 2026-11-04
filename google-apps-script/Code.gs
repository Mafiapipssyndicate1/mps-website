/**
 * MPS Deposit Confirmation - Google Apps Script
 * 1) Run setupMPSStorage() once from the Apps Script editor.
 * 2) Authorize access to Google Sheets and Google Drive.
 * 3) Deploy as Web app: Execute as "Me"; access "Anyone".
 * 4) Copy the Web app URL into MPS_CONFIG.depositForm.endpoint in config.js.
 *
 * Uploaded proof files remain private in the Drive folder owned by the deployer.
 * Never request or store trading passwords, investor passwords, or OTPs.
 */
function setupMPSStorage() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty("MPS_SPREADSHEET_ID");
  var folderId = props.getProperty("MPS_PROOF_FOLDER_ID");
  var spreadsheet, folder;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create("MPS - Data IB");
    props.setProperty("MPS_SPREADSHEET_ID", spreadsheet.getId());
  }

  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder("MPS - Bukti Konfirmasi Deposit");
    props.setProperty("MPS_PROOF_FOLDER_ID", folder.getId());
  }

  var registrationSheet = spreadsheet.getSheetByName("Pendaftar");
  if (!registrationSheet) registrationSheet = spreadsheet.insertSheet("Pendaftar");
  if (registrationSheet.getLastRow() === 0) {
    registrationSheet.appendRow(["Waktu Masuk", "Nama Panggilan", "Username Telegram", "Negara", "Tujuan Bergabung", "Catatan", "Status"]);
    registrationSheet.setFrozenRows(1);
    registrationSheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }

  var sheet = spreadsheet.getSheetByName("Data IB MPS");
  if (!sheet) sheet = spreadsheet.insertSheet("Data IB MPS");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Waktu Masuk", "Nama Member", "Username Telegram", "Login MT5",
      "Jenis Akun", "Deposit Pertama (IDR)", "Tanggal Deposit",
      "Link Bukti Deposit", "Status Verifikasi", "Catatan Admin"
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 10).setFontWeight("bold");
  }

  formatMpsWorkbook_(spreadsheet);

  Logger.log("Spreadsheet: " + spreadsheet.getUrl());
  Logger.log("Folder bukti (akses privat): " + folder.getUrl());
  return {
    spreadsheetUrl: spreadsheet.getUrl(),
    proofFolderUrl: folder.getUrl()
  };
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ service: "MPS Deposit Confirmation", status: "ready" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var proofFile = null;
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 8000000) throw new Error("Payload kosong atau terlalu besar.");
    var data = JSON.parse(raw);

    // Step 1 member registration uses its own sheet, separate from Step 2.
    if (data.action === "register") return registerMember_(data, lock);

    // Honeypot field: silently ignore automated spam.
    if (data.website) return json_({ ok: true });

    var name = clean_(data.memberName, 80);
    var telegram = clean_(data.telegram, 40);
    var login = clean_(data.mt5Login, 20);
    var accountType = clean_(data.accountType, 40);
    var amount = Number(data.depositAmount);
    var date = clean_(data.depositDate, 10);
    var mime = clean_(data.proofMimeType, 40);
    var proofName = clean_(data.proofName, 100);
    var base64 = String(data.proofBase64 || "");

    // Server-side eligibility rule: minimum deposit is Rp1,500,000.
    // Never rely only on browser-side validation.
    if (!name || !telegram || !/^[0-9]{4,20}$/.test(login) || !accountType ||
        !isFinite(amount) || Math.floor(amount) !== amount || amount < 1500000 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Data wajib tidak valid. Deposit minimum setelah akun terhubung di bawah IB MPS adalah Rp1.500.000.");
    }
    if (!/^image\/(jpeg|png|webp)$/.test(mime) || !base64 || base64.length > 7000000) {
      throw new Error("Bukti harus berupa JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB.");
    }

    lock.waitLock(20000);
    var props = PropertiesService.getScriptProperties();
    var spreadsheetId = props.getProperty("MPS_SPREADSHEET_ID");
    var folderId = props.getProperty("MPS_PROOF_FOLDER_ID");
    if (!spreadsheetId || !folderId) throw new Error("Penyimpanan belum disiapkan. Admin harus menjalankan setupMPSStorage().");

    var bytes = Utilities.base64Decode(base64);
    if (bytes.length > 5 * 1024 * 1024) throw new Error("Bukti deposit melebihi 5 MB.");
    var blob = Utilities.newBlob(bytes, mime, "MPS-" + Utilities.getUuid() + "-" + safeFileName_(proofName));
    var folder = DriveApp.getFolderById(folderId);
    proofFile = folder.createFile(blob); // Private by default; no public sharing is enabled.

    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName("Data IB MPS");
    if (!sheet) throw new Error("Tab Data IB MPS tidak ditemukan.");

    sheet.appendRow([
      new Date(), name, telegram, login, accountType, amount, date,
      proofFile.getUrl(), "Menunggu verifikasi", ""
    ]);
    formatMpsSheet_(sheet, "ib");
    return json_({ ok: true, status: "Menunggu verifikasi" });
  } catch (err) {
    if (proofFile) {
      try { proofFile.setTrashed(true); } catch (ignored) {}
    }
    console.error(err);
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

function registerMember_(data, lock) {
  var nickname = clean_(data.nickname, 60);
  var telegram = clean_(data.telegram, 40);
  var country = clean_(data.country, 60);
  var goal = clean_(data.goal, 100);
  var note = clean_(data.note, 500);
  if (!nickname || !telegram || !country || !goal) return json_({ ok: false, error: "Kolom wajib pendaftaran belum lengkap." });
  if (!/^@?[a-zA-Z0-9_]{5,32}$/.test(telegram)) return json_({ ok: false, error: "Username Telegram tidak valid." });

  lock.waitLock(20000);
  try {
    var spreadsheetId = PropertiesService.getScriptProperties().getProperty("MPS_SPREADSHEET_ID");
    if (!spreadsheetId) throw new Error("Penyimpanan belum disiapkan. Jalankan setupMPSStorage() terlebih dahulu.");
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var sheet = spreadsheet.getSheetByName("Pendaftar");
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Pendaftar");
      sheet.appendRow(["Waktu Masuk", "Nama Panggilan", "Username Telegram", "Negara", "Tujuan Bergabung", "Catatan", "Status"]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
    }
    sheet.appendRow([new Date(), nickname, telegram, country, goal, note, "Menunggu verifikasi"]);
    formatMpsSheet_(sheet, "pendaftar");
    return json_({ ok: true, status: "Tersimpan" });
  } finally { lock.releaseLock(); }
}

function clean_(value, maxLength) {
  return String(value == null ? "" : value).replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function safeFileName_(value) {
  return String(value || "bukti-deposit").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 70);
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Professional MPS spreadsheet styling.
 * Safe to run repeatedly: formats existing rows without deleting data.
 */
function formatMpsWorkbook_(spreadsheet) {
  var registration = spreadsheet.getSheetByName("Pendaftar");
  var ib = spreadsheet.getSheetByName("Data IB MPS");
  if (registration) formatMpsSheet_(registration, "pendaftar");
  if (ib) formatMpsSheet_(ib, "ib");

  var dashboard = spreadsheet.getSheetByName("Ringkasan");
  if (!dashboard) dashboard = spreadsheet.insertSheet("Ringkasan", 0);
  dashboard.clear();
  dashboard.setHiddenGridlines(true);
  dashboard.getRange("A1:D1").merge();
  dashboard.getRange("A1").setValue("MARKET PSYCHOLOGY SOCIETY");
  dashboard.getRange("A1:D1").setBackground("#111111").setFontColor("#D4AF37")
    .setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  dashboard.setRowHeight(1, 42);
  dashboard.getRange("A2:D2").merge();
  dashboard.getRange("A2").setValue("DASHBOARD ADMINISTRASI MEMBER");
  dashboard.getRange("A2:D2").setBackground("#222222").setFontColor("#FFFFFF")
    .setFontSize(10).setHorizontalAlignment("center");
  dashboard.getRange("A4:B4").setValues([["INDIKATOR", "JUMLAH"]]);
  dashboard.getRange("A4:B4").setBackground("#D4AF37").setFontColor("#111111").setFontWeight("bold");
  dashboard.getRange("A5:B7").setValues([
    ["Total Pendaftar", ""],
    ["Menunggu Verifikasi Pendaftaran", ""],
    ["Total Konfirmasi Deposit", ""]
  ]);
  dashboard.getRange("B5").setFormula("=COUNTA('Pendaftar'!B2:B)");
  dashboard.getRange("B6").setFormula("=COUNTIF('Pendaftar'!G2:G,\"Menunggu verifikasi\")");
  dashboard.getRange("B7").setFormula("=COUNTA('Data IB MPS'!B2:B)");
  dashboard.getRange("A5:B7").setBackground("#F7F3E8");
  dashboard.getRange("A5:A7").setFontWeight("bold");
  dashboard.getRange("B5:B7").setHorizontalAlignment("center").setFontWeight("bold").setFontSize(14);
  dashboard.getRange("A9:D9").merge();
  dashboard.getRange("A9").setValue("Catatan: Dashboard ini menghitung data pada tab Pendaftar dan Data IB MPS. Periksa status secara berkala.");
  dashboard.getRange("A9:D9").setWrap(true).setFontColor("#666666").setFontSize(9);
  dashboard.setColumnWidth(1, 280);
  dashboard.setColumnWidth(2, 150);
  dashboard.setColumnWidths(3, 2, 120);
  dashboard.setFrozenRows(2);
}

function formatMpsSheet_(sheet, type) {
  var isRegistration = type === "pendaftar";
  var lastColumn = isRegistration ? 7 : 10;
  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn)
    .setBackground("#111111")
    .setFontColor("#D4AF37")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(true);
  sheet.setRowHeight(1, 38);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn)
      .setFontFamily("Arial")
      .setFontSize(10)
      .setVerticalAlignment("middle");
    sheet.getRange(2, 1, lastRow - 1, lastColumn)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    sheet.getRange(2, 1, lastRow - 1, 1).setNumberFormat("dd mmm yyyy hh:mm");
    if (isRegistration) {
      sheet.getRange(2, 7, lastRow - 1, 1).setHorizontalAlignment("center");
    } else {
      sheet.getRange(2, 6, lastRow - 1, 1).setNumberFormat('"Rp" #,##0');
      sheet.getRange(2, 7, lastRow - 1, 1).setNumberFormat("dd mmm yyyy");
      sheet.getRange(2, 9, lastRow - 1, 1).setHorizontalAlignment("center");
    }
  }
  var widths = isRegistration
    ? [155, 170, 170, 120, 230, 260, 165]
    : [155, 170, 170, 110, 130, 165, 135, 250, 165, 240];
  for (var i = 0; i < widths.length; i++) sheet.setColumnWidth(i + 1, widths[i]);
  sheet.getRange(1, 1, Math.max(lastRow, 2), lastColumn).setWrap(true);
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(lastRow, 2), lastColumn).createFilter();
  var statusColumn = isRegistration ? 7 : 9;
  var statusRange = sheet.getRange(2, statusColumn, Math.max(lastRow - 1, 1), 1);
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Menunggu")
      .setBackground("#FFF2CC").setFontColor("#7F6000").setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Disetujui")
      .setBackground("#D9EAD3").setFontColor("#274E13").setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Ditolak")
      .setBackground("#F4CCCC").setFontColor("#990000").setRanges([statusRange]).build()
  ];
  sheet.setConditionalFormatRules(rules);
}
