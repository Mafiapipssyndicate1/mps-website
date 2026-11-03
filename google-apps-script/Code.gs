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

    if (!name || !telegram || !/^[0-9]{4,20}$/.test(login) || !accountType ||
        !isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Data wajib tidak valid.");
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