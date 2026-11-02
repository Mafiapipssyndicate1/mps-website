(() => {
  const cfg = window.MPS_CONFIG || {};

  // ===== ISI BAGIAN INI =====
  const TELEGRAM_URL = ""; // contoh: "https://t.me/usernameadmin"
  // ==========================

  const links = cfg.links || {};
  const tgUrl = TELEGRAM_URL || links.telegram || links.telegramGroup || links.@Ndhisolasi || "";

  const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfRZ1f6MLw-SgtV3VG20qWSnwj7PP15X-F7b27L-EbfiSdqEg/formResponse";

  const ENTRY = {
    nickname: "entry.478958051",
    telegram: "entry.408949378",
    goal: "entry.1510635739",
    agreement: "entry.659881750",
    confirm: "entry.1414759871",
    country: "", // isi "entry.xxxx" setelah pertanyaan Negara dibuat di Google Form
    note: ""     // isi "entry.xxxx" setelah pertanyaan Catatan dibuat di Google Form
  };

  const AGREEMENTS = [
    "MPS merupakan komunitas edukasi dan diskusi trading.",
    "MPS bukan penyedia sinyal trading.",
    "MPS tidak menjanjikan keuntungan atau hasil trading tertentu.",
    "Trading memiliki risiko kehilangan modal.",
    "Saya bersedia menjaga etika dan menghormati sesama anggota komunitas."
  ];

  const GOAL_MAP = {
    "Belajar money management": "Belajar Money Management",
    "Mengembangkan psikologi trading": "Mengembangkan Psikologi Trading",
    "Membangun disiplin dan jurnal": "Membangun Disiplin dan Jurnal Trading",
    "Belajar materi teknikal pendukung": "Belajar Materi Teknikal Pendukung",
    "Bergabung dengan komunitas": "Bergabung dengan komunitas"
  };

  const form = document.getElementById("joinForm");
  if (!form) return;

  const msg = document.getElementById("formMessage");
  const summaryEl = document.getElementById("registrationSummary");
  const copyBtn = document.getElementById("copySummary");
  const tgBtn = document.getElementById("openTelegram");
  const submitBtn = form.querySelector('button[type="submit"]');

  let lastSummary = "";
  let lastTgLink = "";

  function show(type, text) {
    msg.className = "form-message show " + type;
    msg.textContent = text;
  }

  function telegramLink(url, text) {
    // Link ke akun pribadi (t.me/username) bisa langsung berisi pesan
    if (/^https:\/\/t\.me\/[A-Za-z0-9_]{5,}$/.test(url)) {
      return url + "?text=" + encodeURIComponent(text);
    }
    return url;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      nickname: form.nickname.value.trim(),
      telegram: form.telegram.value.trim(),
      country: form.country.value.trim(),
      goal: form.goal.value,
      note: form.note.value.trim()
    };

    lastSummary =
      "PENDAFTARAN MEMBER MPS\n" +
      "Nama panggilan: " + data.nickname + "\n" +
      "Telegram: " + data.telegram + "\n" +
      "Negara: " + data.country + "\n" +
      "Tujuan bergabung: " + data.goal + "\n" +
      "Catatan: " + (data.note || "-");

    lastTgLink = tgUrl ? telegramLink(tgUrl, lastSummary) : "";

    // Buka tab Telegram sekarang (saat tombol ditekan) supaya tidak diblokir browser
    const tab = lastTgLink ? window.open("", "_blank") : null;

    // Salin ringkasan ke clipboard
    try { navigator.clipboard.writeText(lastSummary); } catch (err) {}

    // Siapkan data untuk Google Form
    const body = new URLSearchParams();
    body.append(ENTRY.nickname, data.nickname);
    body.append(ENTRY.telegram, data.telegram);
    body.append(ENTRY.goal, GOAL_MAP[data.goal] || data.goal);
    if (ENTRY.country) body.append(ENTRY.country, data.country);
    if (ENTRY.note && data.note) body.append(ENTRY.note, data.note);
    AGREEMENTS.forEach((a) => body.append(ENTRY.agreement, a));
    body.append(ENTRY.confirm, "Opsi 1");

    submitBtn.disabled = true;
    show("info", "Mengirim pendaftaran...");

    let ok = true;
    try {
      await fetch(FORM_URL, { method: "POST", mode: "no-cors", body: body });
    } catch (err) {
      ok = false;
    }
    submitBtn.disabled = false;

    summaryEl.textContent = lastSummary;
    summaryEl.hidden = false;
    copyBtn.hidden = false;
    if (lastTgLink) tgBtn.hidden = false;

    if (ok) {
      show("success", lastTgLink
        ? "Pendaftaran terkirim dan ringkasan sudah disalin. Membuka Telegram MPS..."
        : "Pendaftaran terkirim dan ringkasan sudah disalin.");
    } else {
      show("error", "Pengiriman gagal. Periksa koneksi lalu coba lagi, atau kirim ringkasan di bawah ke admin.");
    }

    if (tab && lastTgLink) {
      tab.location.href = lastTgLink;
    }
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lastSummary);
      show("success", "Ringkasan disalin.");
    } catch (err) {
      show("error", "Gagal menyalin. Salin manual dari kotak ringkasan.");
    }
  });

  tgBtn.addEventListener("click", () => {
    if (lastTgLink) window.open(lastTgLink, "_blank", "noopener");
  });
})();
