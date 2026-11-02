(function () {
  var cfg = window.MPS_CONFIG || {};
  var TELEGRAM_URL = ""; // contoh: "https://t.me/usernameadmin"
  var L = cfg.links || {};
  var tgUrl = TELEGRAM_URL || L.telegram || L.telegramGroup || L.telegramAdmin || "";
  if (!/^https:\/\/t\.me\//.test(tgUrl) || /PLACEHOLDER/i.test(tgUrl)) tgUrl = "";
  var FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfRZ1f6MLw-SgtV3VG20qWSnwj7PP15X-F7b27L-EbfiSdqEg/formResponse";
  var E = { nickname: "entry.478958051", telegram: "entry.408949378", goal: "entry.1510635739", agreement: "entry.659881750", confirm: "entry.1414759871", country: "", note: "" };
  var AGR = ["MPS merupakan komunitas edukasi dan diskusi trading.", "MPS bukan penyedia sinyal trading.", "MPS tidak menjanjikan keuntungan atau hasil trading tertentu.", "Trading memiliki risiko kehilangan modal.", "Saya bersedia menjaga etika dan menghormati sesama anggota komunitas."];
  var GOAL = { "Belajar money management": "Belajar Money Management", "Mengembangkan psikologi trading": "Mengembangkan Psikologi Trading", "Membangun disiplin dan jurnal": "Membangun Disiplin dan Jurnal Trading", "Belajar materi teknikal pendukung": "Belajar Materi Teknikal Pendukung", "Bergabung dengan komunitas": "Bergabung dengan komunitas" };
  function $(id) { return document.getElementById(id); }
  var form = $("joinForm");
  if (!form) return;
  var msg = $("formMessage"), box = $("registrationSummary"), copyBtn = $("copySummary"), tgBtn = $("openTelegram");
  var sendBtn = form.querySelector('button[type="submit"]');
  var summary = "", tgLink = "";
  function show(t, x) { msg.className = "form-message show " + t; msg.textContent = x; }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = { n: $("nickname").value.trim(), t: $("telegram").value.trim(), c: $("country").value.trim(), g: $("goal").value, o: $("note").value.trim() };
    summary = "PENDAFTARAN MEMBER MPS\nNama panggilan: " + d.n + "\nTelegram: " + d.t + "\nNegara: " + d.c + "\nTujuan bergabung: " + d.g + "\nCatatan: " + (d.o || "-");
    tgLink = tgUrl ? (/^https:\/\/t\.me\/[A-Za-z0-9_]{5,}$/.test(tgUrl) ? tgUrl + "?text=" + encodeURIComponent(summary) : tgUrl) : "";
    var tab = null;
    if (tgLink) { try { tab = window.open("", "_blank"); } catch (x) {} }
    try { navigator.clipboard.writeText(summary); } catch (x) {}
    var b = new URLSearchParams();
    b.append(E.nickname, d.n);
    b.append(E.telegram, d.t);
    b.append(E.goal, GOAL[d.g] || d.g);
    if (E.country) b.append(E.country, d.c);
    if (E.note && d.o) b.append(E.note, d.o);
    for (var i = 0; i < AGR.length; i++) b.append(E.agreement, AGR[i]);
    b.append(E.confirm, "Opsi 1");
    if (sendBtn) sendBtn.disabled = true;
    show("info", "Mengirim pendaftaran...");
    fetch(FORM_URL, { method: "POST", mode: "no-cors", body: b })
      .then(function () { return true; })
      .catch(function () { return false; })
      .then(function (ok) {
        if (sendBtn) sendBtn.disabled = false;
        box.textContent = summary; box.hidden = false; copyBtn.hidden = false;
        if (tgLink) tgBtn.hidden = false;
        if (ok) show("success", "Pendaftaran terkirim dan ringkasan sudah disalin.");
        else show("error", "Pengiriman gagal. Periksa koneksi lalu coba lagi.");
        if (tab && tgLink) tab.location.href = tgLink;
      });
  });
  copyBtn.addEventListener("click", function () {
    try { navigator.clipboard.writeText(summary).then(function () { show("success", "Ringkasan disalin."); }); } catch (x) { show("error", "Gagal menyalin."); }
  });
  tgBtn.addEventListener("click", function () { if (tgLink) window.open(tgLink, "_blank", "noopener"); });
})();
