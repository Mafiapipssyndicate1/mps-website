# Mafia Pips Syndicate Website — v1.0

Website statis MPS, mobile-first, dengan tema hitam-emas.

## Struktur
- 9 halaman HTML
- `config.js` untuk tautan dan pengaturan publik
- `css/style.css` untuk desain
- `js/main.js` untuk navigasi dan konfigurasi tampilan
- `js/join.js` untuk formulir pendaftaran sisi browser
- `assets/` untuk logo dan favicon

## Sebelum dipublikasikan
1. Edit `config.js`: ganti semua tautan `PLACEHOLDER`, nomor WhatsApp, dan email.
2. Formulir belum tersambung ke server. Atur endpoint layanan form yang tepercaya di `form.endpoint` jika ingin pengiriman otomatis. Jika kosong, pengguna dapat menyalin ringkasan pendaftaran dan menghubungi admin.
3. Jangan memasukkan password, API key rahasia, atau kredensial admin ke `config.js`.
4. Uji seluruh tautan dan tampilan di ponsel.
5. Pastikan ketentuan rebate, reward, dan program komunitas sesuai aturan broker serta ketentuan yang benar-benar berlaku.

## Hosting gratis
Bisa dipublikasikan melalui GitHub Pages, Cloudflare Pages, atau Netlify. Upload isi folder ini sebagai situs statis.

## Catatan
Website ini tidak menggunakan database atau dashboard admin. Tidak ada statistik, testimoni, maupun klaim performa trading fiktif.
