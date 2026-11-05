/**
 * MARKET PSYCHOLOGY SOCIETY — Backend v2
 * Database tunggal untuk pendaftaran dan konfirmasi deposit.
 * Jalankan setupMPSStorage() sekali, lalu deploy sebagai Web App:
 * Execute as: Me | Who has access: Anyone.
 *
 * Tidak pernah meminta password MT5, investor password, atau OTP.
 */
const MPS = {
  spreadsheetName: "MPS - Database Member",
  folderName: "MPS - Bukti Konfirmasi",
  sheetName: "Database Member",
  headers: [
    "ID Member", "Waktu Daftar", "Nama Panggilan", "Username Telegram",
    "Negara", "Tujuan Bergabung", "Catatan Member", "Status Pendaftaran",
    "Nama Sesuai Akun", "Login MT5", "Jenis Akun", "Deposit Pertama (IDR)",
    "Tanggal Deposit", "Link Bukti Deposit", "Status Verifikasi Deposit",
    "Catatan Admin", "Waktu Konfirmasi", "Terakhir Diperbarui"
  ]
};

function setupMPSStorage() {
  const props = PropertiesService.getScriptProperties();
  let ss, folder;
  const ssId = props.getProperty("MPS_SPREADSHEET_ID");
  const folderId = props.getProperty("MPS_PROOF_FOLDER_ID");

  ss = ssId ? SpreadsheetApp.openById(ssId) : SpreadsheetApp.create(MPS.spreadsheetName);
  folder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.createFolder(MPS.folderName);
  props.setProperty("MPS_SPREADSHEET_ID", ss.getId());
  props.setProperty("MPS_PROOF_FOLDER_ID", folder.getId());

  let sheet = ss.getSheetByName(MPS.sheetName);
  if (!sheet) sheet = ss.insertSheet(MPS.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, MPS.headers.length).setValues([MPS.headers]);
  } else {
    // Jangan menghapus atau menimpa data yang sudah ada.
    const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), MPS.headers.length)).getValues()[0];
    if (String(existing[0]) !== MPS.headers[0]) {
      throw new Error("Tab Database Member sudah berisi struktur lain. Data tidak disentuh; gunakan spreadsheet baru.");
    }
  }
  formatMemberSheet_(sheet);
  createDashboard_(ss);
  Logger.log("DATABASE: " + ss.getUrl());
  Logger.log("FOLDER BUKTI: " + folder.getUrl());
  return { spreadsheetUrl: ss.getUrl(), proofFolderUrl: folder.getUrl() };
}

function doGet() {
  return json_({ service: "MPS Member Backend", status: "ready", version: 2 });
}

function doPost(e) {
  let lock;
  let uploadedFile;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 8000000) throw new Error("Payload kosong atau terlalu besar.");
    const data = JSON.parse(raw);
    if (data.website) return json_({ ok: true });
    lock = LockService.getScriptLock();
    lock.waitLock(20000);

    const ss = openDatabase_();
    const sheet = ss.getSheetByName(MPS.sheetName);
    if (!sheet) throw new Error("Database belum disiapkan. Jalankan setupMPSStorage().");

    if (data.action === "register") {
      const nickname = clean_(data.nickname, 60);
      const telegram = normalizeTelegram_(data.telegram);
      const country = clean_(data.country, 60);
      const goal = clean_(data.goal, 100);
      const note = clean_(data.note, 500);
      if (!nickname || !telegram || !country || !goal) throw new Error("Kolom wajib pendaftaran belum lengkap.");
      if (!/^@?[a-zA-Z0-9_]{5,32}$/.test(telegram)) throw new Error("Username Telegram tidak valid.");

      const row = findMemberRow_(sheet, telegram);
      if (row) {
        sheet.getRange(row, 3, 1, 5).setValues([[nickname, telegram, country, goal, note]]);
        sheet.getRange(row, 18).setValue(new Date());
        return json_({ ok: true, status: "Data pendaftaran diperbarui" });
      }
      const id = "MPS-" + Utilities.getUuid().slice(0, 8).toUpperCase();
      sheet.appendRow([id, new Date(), nickname, telegram, country, goal, note,
        "Menunggu verifikasi", "", "", "", "", "", "", "Belum ada konfirmasi", "", "", new Date()]);
      formatMemberSheet_(sheet);
      sendTelegram_("🆕 PENDAFTARAN MEMBER MPS\\nNama: " + nickname +
        "\\nTelegram: " + telegram + "\\nNegara: " + country +
        "\\nTujuan: " + goal + "\\nID: " + id);
      return json_({ ok: true, status: "Pendaftaran tersimpan", memberId: id });
    }

    // Hanya action deposit yang boleh masuk ke jalur konfirmasi deposit.
    if (data.action !== "deposit") throw new Error("Action tidak dikenal. Gunakan register atau deposit.");

    // Konfirmasi deposit melengkapi baris member yang sama, bukan membuat tab/baris baru.
    const name = clean_(data.memberName, 80);
    const telegram = normalizeTelegram_(data.telegram);
    const login = clean_(data.mt5Login, 20);
    const accountType = clean_(data.accountType, 40);
    const amount = Number(data.depositAmount);
    const date = clean_(data.depositDate, 10);
    const mime = clean_(data.proofMimeType, 40);
    const proofName = safeFileName_(data.proofName);
    const base64 = String(data.proofBase64 || "");

    if (!name || !telegram || !/^[0-9]{4,20}$/.test(login) || !accountType ||
        !Number.isInteger(amount) || amount < 1500000 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Data konfirmasi tidak valid. Periksa login MT5, tanggal, dan deposit minimum Rp1.500.000.");
    }
    if (!/^image\/(jpeg|png|webp)$/.test(mime) || !base64 || base64.length > 7000000) {
      throw new Error("Bukti harus JPG, PNG, atau WEBP maksimal 5 MB.");
    }
    const row = findMemberRow_(sheet, telegram);
    if (!row) throw new Error("Pendaftaran MPS dengan username Telegram ini belum ditemukan. Daftar terlebih dahulu.");

    const bytes = Utilities.base64Decode(base64);
    if (bytes.length > 5 * 1024 * 1024) throw new Error("Ukuran bukti melebihi 5 MB.");
    const folderId = PropertiesService.getScriptProperties().getProperty("MPS_PROOF_FOLDER_ID");
    if (!folderId) throw new Error("Folder bukti belum disiapkan.");
    const blob = Utilities.newBlob(bytes, mime, "MPS-" + Utilities.getUuid() + "-" + proofName);
    uploadedFile = DriveApp.getFolderById(folderId).createFile(blob);

    sheet.getRange(row, 9, 1, 7).setValues([[
      name, login, accountType, amount, date, uploadedFile.getUrl(),
      "Menunggu verifikasi"
    ]]);
    sheet.getRange(row, 17, 1, 2).setValues([[new Date(), new Date()]]);
    formatMemberSheet_(sheet);
    sendTelegram_("💳 KONFIRMASI DEPOSIT MPS\\nNama: " + name +
      "\\nTelegram: " + telegram + "\\nLogin MT5: " + login +
      "\\nDeposit: Rp" + amount.toLocaleString("id-ID") +
      "\\nStatus: Menunggu verifikasi");
    return json_({ ok: true, status: "Konfirmasi tersimpan dan menunggu verifikasi" });
  } catch (err) {
    if (uploadedFile) { try { uploadedFile.setTrashed(true); } catch (ignored) {} }
    console.error(err);
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (ignored) {} }
  }
}

function openDatabase_() {
  const id = PropertiesService.getScriptProperties().getProperty("MPS_SPREADSHEET_ID");
  if (!id) throw new Error("Database belum disiapkan. Jalankan setupMPSStorage().");
  return SpreadsheetApp.openById(id);
}

function findMemberRow_(sheet, telegram) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const values = sheet.getRange(2, 4, last - 1, 1).getDisplayValues();
  const target = telegram.toLowerCase().replace(/^@/, "");
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase().replace(/^@/, "") === target) return i + 2;
  }
  return 0;
}

function normalizeTelegram_(value) {
  let v = clean_(value, 40);
  if (v && v.charAt(0) !== "@") v = "@" + v;
  return v;
}
function clean_(value, max) {
  return String(value == null ? "" : value).replace(/[<>]/g, "").trim().slice(0, max);
}
function safeFileName_(value) {
  return String(value || "bukti-deposit").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 70);
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatMemberSheet_(sheet) {
  const cols = MPS.headers.length;
  const last = Math.max(sheet.getLastRow(), 2);
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, cols).setBackground("#111111").setFontColor("#D4AF37")
    .setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setWrap(true);
  sheet.setRowHeight(1, 42);
  sheet.getRange(1, 1, last, cols).setVerticalAlignment("middle").setWrap(true);
  if (last > 1) {
    sheet.getRange(2, 1, last - 1, cols).setFontFamily("Arial").setFontSize(10);
    sheet.getRange(2, 2, last - 1, 1).setNumberFormat("dd mmm yyyy hh:mm");
    sheet.getRange(2, 12, last - 1, 1).setNumberFormat('"Rp" #,##0');
    sheet.getRange(2, 13, last - 1, 1).setNumberFormat("dd mmm yyyy");
    sheet.getRange(2, 17, last - 1, 2).setNumberFormat("dd mmm yyyy hh:mm");
  }
  const widths = [115,155,155,155,105,190,220,150,170,110,130,155,125,230,170,220,155,155];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, last, cols).createFilter();
  const statusRange = sheet.getRange(2, 15, Math.max(last - 1, 1), 1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Menunggu")
      .setBackground("#FFF2CC").setFontColor("#7F6000").setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Disetujui")
      .setBackground("#D9EAD3").setFontColor("#274E13").setRanges([statusRange]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Ditolak")
      .setBackground("#F4CCCC").setFontColor("#990000").setRanges([statusRange]).build()
  ]);
}

function createDashboard_(ss) {
  let sh = ss.getSheetByName("Ringkasan");
  if (!sh) sh = ss.insertSheet("Ringkasan", 0);
  // Tidak memakai clear(): isi lama tidak dihapus.
  sh.setHiddenGridlines(true);
  sh.getRange("A1:B1").merge();
  sh.getRange("A1").setValue("MARKET PSYCHOLOGY SOCIETY");
  sh.getRange("A1:B1").setBackground("#111111").setFontColor("#D4AF37")
    .setFontSize(16).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setRowHeight(1, 42);
  sh.getRange("A2:B2").merge();
  sh.getRange("A2").setValue("DASHBOARD DATABASE MEMBER");
  sh.getRange("A2:B2").setBackground("#222222").setFontColor("#FFFFFF")
    .setHorizontalAlignment("center");
  sh.getRange("A4:B7").setValues([
    ["INDIKATOR", "JUMLAH"],
    ["Total Member", ""],
    ["Menunggu Verifikasi Pendaftaran", ""],
    ["Menunggu Verifikasi Deposit", ""]
  ]);
  sh.getRange("A4:B4").setBackground("#D4AF37").setFontColor("#111111").setFontWeight("bold");
  sh.getRange("B5").setFormula("=COUNTA('Database Member'!A2:A)");
  sh.getRange("B6").setFormula("=COUNTIF('Database Member'!H2:H,\"Menunggu verifikasi\")");
  sh.getRange("B7").setFormula("=COUNTIF('Database Member'!O2:O,\"Menunggu verifikasi\")");
  sh.getRange("A5:B7").setBackground("#F7F3E8");
  sh.getRange("A5:A7").setFontWeight("bold");
  sh.getRange("B5:B7").setFontSize(14).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setColumnWidth(1, 290);
  sh.setColumnWidth(2, 150);
}


/**
 * Jalankan sekali untuk menghubungkan bot Telegram ke chat pribadi.
 * Sebelumnya pengguna harus menekan /start pada bot.
 */
function setupTelegram() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Hubungkan Telegram MPS",
    "Tempel token bot dari BotFather di sini. Token disimpan di Script Properties, bukan di sheet.",
    ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const token = response.getResponseText().trim();
  if (!token || token.indexOf(":") < 1) throw new Error("Token bot tidak valid.");

  const url = "https://api.telegram.org/bot" + token + "/getUpdates";
  const result = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const payload = JSON.parse(result.getContentText());
  if (!payload.ok) throw new Error("Telegram menolak token. Periksa token BotFather.");
  const updates = payload.result || [];
  let chatId = "";
  for (let i = updates.length - 1; i >= 0; i--) {
    const msg = updates[i].message || updates[i].edited_message;
    if (msg && msg.chat && msg.chat.type === "private") {
      chatId = String(msg.chat.id);
      break;
    }
  }
  if (!chatId) throw new Error("Chat belum ditemukan. Buka bot Telegram, tekan /start, kirim satu pesan, lalu jalankan setupTelegram lagi.");
  const props = PropertiesService.getScriptProperties();
  props.setProperty("MPS_TELEGRAM_BOT_TOKEN", token);
  props.setProperty("MPS_TELEGRAM_CHAT_ID", chatId);
  ui.alert("Telegram MPS berhasil terhubung. Notifikasi akan dikirim ke chat pribadi kamu.");
}

function sendTelegram_(message) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token = props.getProperty("MPS_TELEGRAM_BOT_TOKEN");
    const chatId = props.getProperty("MPS_TELEGRAM_CHAT_ID");
    if (!token || !chatId) {
      console.error("Notifikasi Telegram dilewati: token atau chat ID belum disiapkan.");
      return false;
    }
    const response = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ chat_id: chatId, text: message }),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !result.ok) {
      console.error("Telegram menolak notifikasi: " + (result.description || ("HTTP " + response.getResponseCode())));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Notifikasi Telegram gagal: " + String(err && err.message || err));
    return false;
  }
}
