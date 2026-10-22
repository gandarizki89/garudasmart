# GarudaSmart

Aplikasi kelas untuk guru, siswa, dan orang tua. **Tampilan** di GitHub Pages, **data** di Google Sheet (lewat Google Apps Script), **AI berjalan lokal di browser tanpa API key**.

```
index.html        tampilan aplikasi
config.js         tempat mengisi URL backend (GARUDA_API_URL)
ai-lokal.js       asisten AI lokal (tanpa API)
apps-script/
  Code.gs         backend, ditempel ke Google Apps Script
  appsscript.json manifest (opsional, hanya untuk clasp)
```

## Langkah 1 – Backend (Google Sheet + Apps Script)
1. Buat Google Sheet baru, lalu **Extensions > Apps Script**.
2. Hapus isi `Code.gs` bawaan, tempel seluruh isi `apps-script/Code.gs`.
3. **Ganti `KODE_GURU` dan `SALT`** di bagian atas file (jangan biarkan nilai bawaan).
4. Jalankan fungsi `setupGarudaSmart` sekali dan setujui izin yang diminta.
5. **Deploy > New deployment > Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL Web App (berakhiran `/exec`).

> Setiap kali `Code.gs` diubah, buat **New deployment/Manage deployments > Edit > New version** agar perubahan aktif.

## Langkah 2 – Hubungkan frontend
Buka `config.js`, isi:
```js
window.GARUDA_API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

## Langkah 3 – Deploy ke GitHub Pages
1. Buat repositori baru di GitHub, unggah seluruh isi folder ini.
2. **Settings > Pages > Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. Tunggu 1-2 menit; aplikasi tersedia di `https://NAMA-ANDA.github.io/NAMA-REPO/`.

## Tentang AI tanpa API
Fitur "Buat dengan AI", evaluasi siswa, dan Asisten AI memakai **mesin lokal berbasis templat dan analisis teks**, bukan model bahasa besar:
- **Materi, tugas, LKPD, lembar video**: kerangka pedagogis lengkap; bila Anda menempel/impor teks sumber (.docx/.txt), uraian dan rujukannya diambil dari teks itu.
- **Instrumen dan game kuis**: soal pilihan ganda dibuat dari teks sumber (kalimat penting dengan istilah kunci dikosongkan). Tanpa teks sumber, game tidak bisa dibuat dan instrumen berupa kerangka uraian C1-C6.
- **Evaluasi siswa**: dihitung dari nilai, kehadiran, dan tugas yang tercatat.
- **Asisten AI**: jawaban templat untuk modul ajar, tujuan pembelajaran, rubrik, soal, ide pembuka, refleksi, remedial/pengayaan, pesan ke orang tua.

Selalu periksa dan sunting hasilnya sebelum disimpan. Untuk jawaban bebas, tombol *Buka ChatGPT* tetap tersedia.

## Catatan keamanan
- Siapa pun yang tahu URL Web App dapat memanggil API-nya, tetapi semua tindakan sensitif butuh token masuk. Tetap ganti `KODE_GURU` dan `SALT`.
- Jangan membagikan akses edit Google Sheet kepada siswa.
