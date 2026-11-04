(function () {
  "use strict";

  var form = document.getElementById("depositForm");
  if (!form) return;

  var cfg = window.MPS_CONFIG || {};
  var endpoint = cfg.depositForm && cfg.depositForm.endpoint;
  var maxBytes = ((cfg.depositForm && cfg.depositForm.maxFileSizeMB) || 5) * 1024 * 1024;
  var message = document.getElementById("depositMessage");
  var button = document.getElementById("submitDeposit");
  var amountInput = document.getElementById("depositAmount");
  var accountType = document.getElementById("accountType");
  var otherAccountField = document.getElementById("otherAccountField");
  var otherAccountInput = document.getElementById("otherAccountType");

  // Format nominal dengan titik ribuan sambil menjaga posisi kursor.
  amountInput.addEventListener("input", function () {
    var oldValue = this.value;
    var cursor = this.selectionStart || oldValue.length;
    var digitsBeforeCursor = oldValue.slice(0, cursor).replace(/\D/g, "").length;
    var digits = oldValue.replace(/\D/g, "");
    var formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    this.value = formatted;

    var nextCursor = 0;
    var seenDigits = 0;
    while (nextCursor < formatted.length && seenDigits < digitsBeforeCursor) {
      if (/\d/.test(formatted.charAt(nextCursor))) seenDigits++;
      nextCursor++;
    }
    try { this.setSelectionRange(nextCursor, nextCursor); } catch (ignored) {}
  });

  function updateOtherAccountField() {
    var isOther = accountType.value === "Lainnya";
    otherAccountField.hidden = !isOther;
    otherAccountInput.required = isOther;
    if (!isOther) otherAccountInput.value = "";
  }
  accountType.addEventListener("change", updateOtherAccountField);
  updateOtherAccountField();

  function show(type, text) {
    message.className = "form-message show " + type;
    message.textContent = text;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = function () {
        reject(new Error("File bukti tidak dapat dibaca."));
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\//.test(endpoint)) {
      show("error", "Formulir belum terhubung ke penyimpanan Google. Admin perlu memeriksa pengaturan koneksi.");
      return;
    }

    var file = document.getElementById("proof").files[0];
    if (!file) {
      show("error", "Silakan pilih bukti deposit.");
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      show("error", "Format bukti harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > maxBytes) {
      show("error", "Ukuran bukti melebihi batas 5 MB. Pilih gambar yang lebih kecil.");
      return;
    }

    var amountDigits = amountInput.value.replace(/\D/g, "");
    if (!amountDigits || Number(amountDigits) < 1500000) {
      show("error", "Nominal deposit wajib minimal Rp1.500.000 setelah akun terhubung di bawah IB MPS.");
      amountInput.focus();
      return;
    }

    var selectedAccount = accountType.value === "Lainnya"
      ? otherAccountInput.value.trim()
      : accountType.value;

    if (!selectedAccount) {
      show("error", "Tuliskan jenis akun trading kamu.");
      otherAccountInput.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "Mengirim...";

    try {
      var payload = {
        memberName: document.getElementById("memberName").value.trim(),
        telegram: document.getElementById("telegram").value.trim(),
        mt5Login: document.getElementById("mt5Login").value.trim(),
        accountType: selectedAccount,
        depositAmount: amountDigits,
        depositDate: document.getElementById("depositDate").value,
        proofName: file.name,
        proofMimeType: file.type,
        proofBase64: await readFile(file),
        website: document.getElementById("website").value
      };

      if (!payload.memberName || !payload.telegram ||
          !/^[0-9]{4,20}$/.test(payload.mt5Login) ||
          !payload.accountType || !payload.depositDate ||
          !document.getElementById("consent").checked) {
        show("error", "Periksa kembali semua kolom wajib dan persetujuan sebelum mengirim.");
        return;
      }

      show("info", "Mengirim data dan bukti deposit. Mohon tunggu...");
      // Mode no-cors membuat browser tidak dapat membaca jawaban server.
      // Karena itu, status akhir tetap harus diperiksa oleh admin MPS.
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      show("success", "Permintaan telah dikirim dari perangkat ini. Pengajuan belum terverifikasi sampai admin MPS memeriksa data dan bukti deposit.");
      form.reset();
      updateOtherAccountField();
    } catch (error) {
      show("error", "Pengiriman belum berhasil. Periksa koneksi internet lalu coba lagi. Jika tetap gagal, hubungi admin MPS.");
    } finally {
      button.disabled = false;
      button.textContent = "Kirim Konfirmasi";
    }
  });
})();