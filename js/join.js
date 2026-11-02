(function () {
  var cfg = window.MPS_CONFIG || {};

  // ===== ISI BAGIAN INI (opsional) =====
  var TELEGRAM_URL = ""; // contoh: "https://t.me/usernameadmin"
  // =====================================

  var links = cfg.links || {};
  var tgUrl = TELEGRAM_URL || links.telegram || links.telegramGroup || links.telegramAdmin || "";
  if (!/^https:\/\/t\.me\//.test(tgUrl) || /PLACEHOLDER/i.test(tgUrl)) tgUrl = "";

  var FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfRZ1f6MLw-SgtV3VG20qWSnwj7PP15X-F7b27L-EbfiSdqEg/formResponse";

  var ENTRY = {
    nickname: "entry.478958051",
    telegram: "entry.408949378",
    goal: "entry.1510635739",
    agreement: "entry.659881750",
    confirm: "entry.1414759871",
    country: "",
    note: ""
  };

  var AGREEMENTS = [
    "MPS merupakan komunitas edukasi dan diskusi trading.",
    "MPS bukan penyedia sinyal trading.",
    "MPS tidak menjanjikan keuntungan atau hasil trading tertentu.",
    "Trading memiliki risiko kehilangan modal.",
    "Saya bersedia menjaga etika dan menghormati sesama anggota komunitas."
  ];

  var GOAL_MAP = {
    "Belajar money management": "Belajar Money Management",
    "Mengembangkan psikologi trading": "Mengembangkan Psikologi Trading",
    "Membangun disiplin dan jurnal": "Membangun Disiplin dan Jurnal Trading",
    "Belajar materi teknikal pendukung": "Belajar Materi Teknikal Pendukung",
    "Bergabung dengan komunitas": "Bergabung dengan komunitas"
  };

  function $(id) { return document.getElementById(id); }
