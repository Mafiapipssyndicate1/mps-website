
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

  form.addEventListener("submit", event => {
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

    show("info", "Data siap. Tekan tombol Telegram untuk menyiapkan pesan pendaftaran.");
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(latestSummary);
      show("success", "Ringkasan pendaftaran berhasil disalin.");
    } catch {
      show("info", "Salin ringkasan pendaftaran secara manual.");
    }
  });

  telegramBtn.addEventListener("click", () => {
    if (!latestSummary) {
      show("error", "Isi formulir terlebih dahulu.");
      return;
    }

    const shareUrl =
      "https://t.me/share/url?url=" +
      encodeURIComponent("https://mafiapipssyndicate1.github.io/mps-website/") +
      "&text=" + encodeURIComponent(
        latestSummary + "\n\nKirim ke admin MPS: @Ndhisolasi"
      );

    window.open("https://t.me/Ndhisolasi", "_blank");
  });
})();

