(function () {
  "use strict";
  var form = document.getElementById("joinForm");
  if (!form) return;
  form.hidden = true;
  var notice = document.createElement("div");
  notice.className = "notice";
  notice.setAttribute("role", "status");
  var title = document.createElement("strong");
  title.textContent = "Pendaftaran MPS kini melalui sistem resmi v4.1.";
  var copy = document.createElement("p");
  copy.textContent = "Gunakan portal agar ID Member diterbitkan langsung oleh database MPS dan notifikasi Telegram diproses oleh backend.";
  var link = document.createElement("a");
  link.className = "btn btn-gold";
  link.href = "member-portal.html";
  link.textContent = "Buka Portal Pendaftaran MPS";
  notice.append(title, copy, link);
  form.parentNode.insertBefore(notice, form);
})();