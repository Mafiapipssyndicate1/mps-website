# Market Psychology Society (MPS) — Website

Website publik MPS berbasis HTML, CSS, dan JavaScript statis, dengan desain mobile-first.

## Halaman publik
- Home, About, Core System, Education
- Membership, Rewards, Rebate
- Join dan Konfirmasi Deposit
- Free Heatmap dan Contact
- Syarat & Ketentuan dan Kebijakan Privasi

## Integrasi formulir
- `config.js` menyimpan endpoint publik Google Apps Script untuk formulir pendaftaran dan konfirmasi deposit.
- Formulir mengirim payload ke Apps Script menggunakan `fetch` dengan mode `no-cors`.
- Karena respons `no-cors` tidak dapat dibaca browser, pesan berhasil di halaman hanya berarti permintaan telah dikirim dari perangkat. Pesan tersebut **bukan bukti** bahwa baris Google Sheets atau file bukti sudah tersimpan.
- Admin harus memeriksa Google Sheets, penyimpanan bukti di Google Drive, dan notifikasi Telegram sebelum menyatakan pengajuan diterima atau terverifikasi.
- Jangan pernah memasukkan password, OTP, PIN, password investor, token bot, atau kredensial rahasia ke formulir maupun file frontend.

## Pengaturan
1. Periksa endpoint di `config.js` sebelum mengubah atau menggantinya.
2. Tautan Telegram dan email dikelola melalui `config.js`.
3. Jika nomor/tautan WhatsApp belum dikonfigurasi, tombol kontak mengarahkan pengguna ke Telegram resmi MPS agar tidak menuju tautan kosong.
4. Perubahan frontend dipublikasikan melalui GitHub Pages setelah perubahan masuk ke branch publikasi.

## Batasan fitur saat ini
- Website publik dan formulir bukan dashboard member.
- Belum ada halaman login member, portal saldo/riwayat rebate, atau dashboard admin yang dapat diverifikasi dari file frontend saat ini.
- Status pendaftaran/deposit tetap membutuhkan pemeriksaan admin pada sistem penyimpanan dan notifikasi yang digunakan MPS.

## Pemeriksaan sebelum rilis
- Uji semua halaman dan navigasi pada layar ponsel.
- Uji formulir dengan data uji yang tidak sensitif.
- Pastikan data uji benar-benar muncul di Google Sheets dan bukti uji tersimpan di Drive.
- Pastikan notifikasi Telegram diterima admin.
- Periksa ulang S&K, kebijakan privasi, dan aturan program sebelum dipublikasikan.

Jangan mengubah endpoint Apps Script yang sedang aktif tanpa menguji penggantinya terlebih dahulu.
