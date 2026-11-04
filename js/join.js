(function () {
  var cfg=window.MPS_CONFIG||{}, L=cfg.links||{}, tgUrl=L.telegram||L.telegramGroup||L.telegramAdmin||"";
  if(!/^https:\/\/t\.me\//.test(tgUrl)||/PLACEHOLDER/i.test(tgUrl))tgUrl="";
  var FORM_URL="https://docs.google.com/forms/d/e/1FAIpQLSfRZ1f6MLw-SgtV3VG20qWSnwj7PP15X-F7b27L-EbfiSdqEg/formResponse";
  var E={nickname:"entry.478958051",telegram:"entry.408949378",goal:"entry.1510635739",agreement:"entry.659881750",confirm:"entry.1414759871"};
  var $=function(id){return document.getElementById(id)},form=$("joinForm");if(!form)return;
  var msg=$("formMessage"),box=$("registrationSummary"),copyBtn=$("copySummary"),tgBtn=$("openTelegram"),step2=$("step2Next"),sendBtn=form.querySelector('button[type="submit"]'),summary="",tgLink="";
  function show(type,text){msg.className="form-message show "+type;msg.textContent=text;}
  function copyText(t){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);var a=document.createElement("textarea");a.value=t;a.style.position="fixed";a.style.opacity="0";document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand("copy")}catch(e){}a.remove();return ok?Promise.resolve():Promise.reject();}
  form.addEventListener("submit",function(e){e.preventDefault();var d={n:$("nickname").value.trim(),t:$("telegram").value.trim(),c:$("country").value.trim(),g:$("goal").value,o:$("note").value.trim()};
    if(!d.n||!d.t||!d.c||!d.g){show("error","Lengkapi semua kolom wajib sebelum mengirim.");return;}
    summary="PENDAFTARAN MARKET PSYCHOLOGY SOCIETY (MPS)\nNama panggilan: "+d.n+"\nTelegram: "+d.t+"\nNegara: "+d.c+"\nTujuan bergabung: "+d.g+"\nCatatan: "+(d.o||"-");
    tgLink=tgUrl?tgUrl+(tgUrl.indexOf("?")>=0?"&":"?")+"text="+encodeURIComponent(summary):"";
    var b=new URLSearchParams();b.append(E.nickname,d.n);b.append(E.telegram,d.t);b.append(E.goal,d.g);b.append(E.agreement,"Saya memahami dan menyetujui persyaratan pendaftaran Market Psychology Society.");b.append(E.confirm,"Opsi 1");
    if(sendBtn)sendBtn.disabled=true;show("info","Sedang mengirim permintaan pendaftaran...");
    fetch(FORM_URL,{method:"POST",mode:"no-cors",body:b}).then(function(){
      box.textContent=summary;box.hidden=false;copyBtn.hidden=false;if(tgLink)tgBtn.hidden=false;if(step2)step2.hidden=false;
      show("info","Pengiriman formulir sudah dicoba. Google Forms tidak memberikan konfirmasi penyimpanan yang dapat dibaca situs ini, jadi status penerimaan belum bisa dipastikan otomatis. Salin ringkasan ini untuk membantu admin memeriksa pendaftaran Anda, lalu lanjutkan ke Step 2.");
      if(tgLink)tgBtn.onclick=function(){window.open(tgLink,"_blank","noopener");};
    }).catch(function(){box.textContent=summary;box.hidden=false;copyBtn.hidden=false;show("error","Koneksi ke formulir bermasalah. Data belum dapat dipastikan terkirim. Salin ringkasan dan hubungi admin MPS sebelum mengulang.");}).finally(function(){if(sendBtn)sendBtn.disabled=false;});
  });
  copyBtn.addEventListener("click",function(){copyText(summary).then(function(){show("success","Ringkasan pendaftaran berhasil disalin.");}).catch(function(){show("error","Tidak dapat menyalin otomatis. Salin ringkasan secara manual.");});});
})();