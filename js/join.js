(() => {
  const form = document.getElementById("joinForm");
  if (!form) return;

  const message = document.getElementById("formMessage");
  const submitBtn = form.querySelector('[type="submit"]');

  // Sembunyikan elemen lama
  ["registrationSummary", "copySummary", "openTelegram"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  // Satu tombol Daftar + logo Telegram
  if (submitBtn) {
    submitBtn.style.display = "inline-flex";
    submitBtn.style.alignItems = "center";
    submitBtn.style.justifyContent = "center";
    submitBtn.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" style="margin-right:8px">' +
      '<circle cx="12" cy="12" r="12" fill="#229ED9"/>' +
      '<path fill="#fff" d="M5.4 11.9l11.5-4.4c.5-.2 1 .1.8.9l-2 9.2c-.1.7-.6.9-1.1.5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.4-.1l-6.9 4.3-3-.9c-.6-.2-.6-.6.3-.9z"/>' +
      '</svg><span>Daftar via Telegram</span>';
  }

  const show = (kind, text) => {
    if (!message) return;
    message.hidden = false;
    message.className = `form-message show ${kind}`;
    message.textContent = text;
  };

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const username = String(data.telegram || "").trim().replace(/^@/, "");

    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
      show("error", "Username Telegram harus 3–32 karakter.");
      return;
    }

    const text = [
      "PENDAFTARAN MEMBER MPS",
      `Nama panggilan: ${data.nickname || "-"}`,
      `Telegram: @${username}`,
      `Negara: ${data.country || "-"}`,
      `Tujuan bergabung: ${data.goal || "-"}`,
      `Catatan: ${data.note || "-"}`
    ].join("\n");

    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});

    show("success", "Mengarahkan ke Telegram MPS...");
    window.location.href =
      "https://t.me/Ndhisolasi?text=" + encodeURIComponent(text);
  });
})();
