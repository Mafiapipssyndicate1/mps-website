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

  // Tampilkan pemisah ribuan dengan titik, tetapi kirim angka murni ke Google Sheets.
  amountInput.addEventListener("input", function () {
    var digits = this.value.replace(/\D/g, "");
    this.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });

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
      reader.onerror = function () { reject(new Error("File bukti tidak dapat dibaca.")); };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\//.test(endpoint)) {
      show("error", "Formulir belum terhubung ke penyimpanan Google. Admin perlu menyelesaikan pemasangan endpoint terlebih dahulu.");
      return;
    }

    var file = document.getElementById("proof").files[0];
    if (!file) { show("error", "Silakan pilih bukti deposit."); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { show("error", "Format bukti harus JPG, PNG, atau WEBP."); return; }
    if (file.size > maxBytes) { show("error", "Ukuran bukti melebihi batas 5 MB."); return; }

    var payload = {
      memberName: document.getElementById("memberName").value.trim(),
      telegram: document.getElementById("telegram").value.trim(),
      mt5Login: document.getElementById("mt5Login").value.trim(),
      accountType: document.getElementById("accountType").value,
      depositAmount: amountInput.value.replace(/\./g, ""),
      depositDate: document.getElementById("depositDate").value,
      proofName: file.name,
      proofMimeType: file.type,
      proofBase64: await readFile(file),
      website: document.getElementById("website").value
    };

    if (!payload.memberName || !payload.telegram || !payload.mt5Login || !payload.accountType ||
        !payload.depositAmount || !/^[0-9]+$/.test(payload.depositAmount) ||
        !payload.depositDate || !document.getElementById("consent").checked) {
      show("error", "Periksa kembali semua kolom wajib dan persetujuan.");
      return;
    }

    button.disabled = true;
    show("info", "Mengirim konfirmasi dan bukti deposit...");
    try {
      // text/plain avoids a CORS preflight. no-cors means the browser cannot read
      // the server response; final verification remains with the MPS admin.
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      show("success", "Permintaan sudah dikirim dari perangkat ini. Status belum terverifikasi; admin MPS perlu memeriksa data dan bukti deposit.");
      form.reset();
    } catch (error) {
      show("error", "Pengiriman tidak berhasil. Periksa koneksi internet lalu coba lagi, atau hubungi admin MPS.");
    } finally {
      button.disabled = false;
    }
  });
})();