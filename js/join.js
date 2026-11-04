(function () {
  "use strict";
  var cfg = window.MPS_CONFIG || {};
  var links = cfg.links || {};
  var endpoint = cfg.form && cfg.form.endpoint;
  var telegramUrl = links.telegram || links.joinTelegram || "";
  if (!/^https:\/\/t\.me\//.test(telegramUrl) || /PLACEHOLDER/i.test(telegramUrl)) telegramUrl = "";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("joinForm");
  if (!form) return;
  var msg = $("formMessage"), box = $("registrationSummary");
  var copyBtn = $("copySummary"), tgBtn = $("openTelegram");
  var step2 = $("step2Next"), sendBtn = form.querySelector('button[type="submit"]');
  var summary = "";
  function show(type, text) { msg.className = "form-message show " + type; msg.textContent = text; }
  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(value);
    var area = document.createElement("textarea"); area.value = value;
    area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area);
    area.select(); var copied = false;
    try { copied = document.execCommand("copy"); } catch (ignore) {}
    area.remove(); return copied ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var data = { nickname: $("nickname").value.trim(), telegram: $("telegram").value.trim(),
      country: $("country").value.trim(), goal: $("goal").value, note: $("note").value.trim() };
    if (!data.nickname || !data.telegram || !data.country || !data.goal) {
      show("error", "Lengkapi semua kolom wajib sebelum mengirim."); return;
    }
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\//.test(endpoint)) {
      show("error", "Koneksi pendaftaran MPS belum dikonfigurasi. Silakan hubungi admin."); return;
    }
    summary = "PENDAFTARAN MARKET PSYCHOLOGY SOCIETY (MPS)\nNama panggilan: " + data.nickname +
      "\nTelegram: " + data.telegram + "\nNegara: " + data.country + "\nTujuan bergabung: " + data.goal +
      "\nCatatan: " + (data.note || "-");
    if (sendBtn) sendBtn.disabled = true;
    show("info", "Mengirim pendaftaran ke sistem MPS. Mohon tunggu...");
    try {
      // no-cors responses are opaque: dispatch is not proof of a committed spreadsheet row.
      await fetch(endpoint, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "register", nickname: data.nickname, telegram: data.telegram,
          country: data.country, goal: data.goal, note: data.note }) });
      box.textContent = summary; box.hidden = false; copyBtn.hidden = false;
      if (step2) step2.hidden = false;
      if (telegramUrl) { tgBtn.hidden = false; tgBtn.onclick = function () {
        window.open(telegramUrl, "_blank", "noopener");
      }; }
      show("info", "Permintaan pendaftaran telah dikirim dari perangkat ini. Admin tetap perlu memastikan data tercatat di Google Sheets sebelum verifikasi. Salin ringkasan jika diperlukan, lalu lanjutkan ke Step 2.");
    } catch (error) {
      box.textContent = summary; box.hidden = false; copyBtn.hidden = false;
      show("error", "Pengiriman gagal atau koneksi terputus. Data belum dapat dipastikan tersimpan. Salin ringkasan dan hubungi admin sebelum mengirim ulang.");
    } finally { if (sendBtn) sendBtn.disabled = false; }
  });
  copyBtn.addEventListener("click", function () {
    copyText(summary).then(function () { show("success", "Ringkasan pendaftaran berhasil disalin."); })
      .catch(function () { show("error", "Tidak dapat menyalin otomatis. Silakan salin ringkasan secara manual."); });
  });
})();