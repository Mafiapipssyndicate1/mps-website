(() => {
  const cfg = window.MPS_CONFIG || {};
  const form = document.getElementById("joinForm");
  if (!form) return;

  const message = document.getElementById("formMessage");
  const summary = document.getElementById("registrationSummary");
  const copyBtn = document.getElementById("copySummary");
  const telegramBtn = document.getElementById("openTelegram");
  let latestSummary = "";

  const show = (kind, text) => {
    message.className = `form-message show ${kind}`;
    message.textContent = text;
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const username = String(data.telegram || "").trim().replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
      show("error", "Username Telegram harus 3–32 karakter dan hanya boleh berisi huruf, angka, atau garis bawah.");
      return;
    }
    data.telegram = "@" + username;

    latestSummary = [
      "PENDAFTARAN MEMBER MPS",
      `Nama panggilan: ${data.nickname}`,
      `Telegram: ${data.telegram}`,
      `Negara: ${data.country}`,
      `Tujuan bergabung: ${data.goal}`,
      `Catatan: ${data.note || "-"}`
    ].join("\n");

    summary.hidden = false;
    summary.textContent = latestSummary;
    copyBtn.hidden = false;
    telegramBtn.hidden = false;

    const endpoint = cfg.form && cfg.form.endpoint;
    if (!endpoint) {
      show("info", (cfg.form && cfg.form.fallbackNote) || "Formulir belum terhubung. Salin ringkasan dan kirim ke admin MPS.");
      return;
    }

    const submit = form.querySelector("button[type='submit']");
    if (submit) { submit.disabled = true; submit.textContent = "Mengirim..."; }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error("Server menolak pengiriman.");
      show("success", "Pendaftaran berhasil dikirim. Admin MPS akan menindaklanjuti.");
      form.reset();
    } catch (error) {
      show("error", "Pendaftaran belum berhasil dikirim. Ringkasan tetap tersedia untuk disalin dan dikirim manual.");
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = "Kirim Pendaftaran"; }
    }
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(latestSummary);
      show("success", "Ringkasan pendaftaran berhasil disalin.");
    } catch {
      show("info", "Salin teks ringkasan secara manual.");
    }
  });

  telegramBtn.addEventListener("click", () => {
    const url = cfg.links && cfg.links.joinTelegram;
    if (url && !url.includes("PLACEHOLDER")) window.open(url, "_blank", "noopener");
    else show("error", "Tautan Telegram MPS belum diatur. Hubungi admin setelah menyalin ringkasan.");
  });
})();