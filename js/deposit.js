(function () {
  "use strict";
  var form = document.getElementById("depositForm");
  if (!form) return;
  form.hidden = true;
  var notice = document.createElement("div");
  notice.className = "notice";
  notice.setAttribute("role", "status");
  var title = document.createElement("strong");
  title.textContent = "Konfirmasi deposit MPS kini melalui sistem resmi v4.1.";
  var copy = document.createElement("p");
  copy.textContent = "Masuk melalui portal dan gunakan ID Member dari pendaftaran. Backend mencocokkan ID Member dan username Telegram sebelum menyimpan pengajuan serta bukti deposit.";
  var link = document.createElement("a");
  link.className = "btn btn-gold";
  link.href = "member-portal.html";
  link.textContent = "Buka Portal Deposit MPS";
  notice.append(title, copy, link);
  form.parentNode.insertBefore(notice, form);
})();