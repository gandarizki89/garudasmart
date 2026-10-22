/** GarudaSmart – backend Google Apps Script (data tersimpan di Google Sheet ini). AI berjalan lokal di browser: tidak perlu API key. */
const KODE_GURU = 'GURU2026';          // ganti dengan kode rahasia sekolah Anda
const SALT = 'ganti-teks-rahasia-ini'; // ganti sebelum dipakai
const MAPEL = ['Matematika', 'B. Indonesia', 'IPA', 'B. Inggris'];
const QS = ['Di kota mana Anda lahir?', 'Siapa nama hewan peliharaan pertama Anda?', 'Apa nama sekolah dasar Anda?'];
const HEAD = {
  Akun: ['Username', 'Nama', 'Peran', 'SiswaID', 'Hash', 'Q', 'AHash', 'Dibuat', 'Sekolah'],
  Sekolah: ['NPSN', 'Nama', 'Jenjang', 'Provinsi', 'KabKota', 'Dibuat'],
  Siswa: ['ID', 'Nama', 'Username', 'Matematika', 'B. Indonesia', 'IPA', 'B. Inggris'],
  Tugas: ['ID', 'Judul', 'Mapel', 'Tenggat', 'Selesai', 'KelasID', 'Isi'],
  Info: ['ID', 'Teks', 'Tanggal'],
  Pesan: ['ID', 'Dari', 'Username', 'SiswaID', 'Teks', 'Tanggal'],
  Absensi: ['Tanggal', 'SiswaID', 'Status'],
  Kelas: ['ID', 'Nama', 'Mapel', 'Kode', 'Guru', 'Dibuat'],
  Anggota: ['KelasID', 'SiswaID', 'Dibuat'],
  Materi: ['ID', 'KelasID', 'Jenis', 'Judul', 'Isi', 'Video', 'Dibuat'],
  Presensi: ['ID', 'KelasID', 'Mulai', 'Selesai'],
  Agenda: ['ID', 'KelasID', 'Tanggal', 'Judul', 'Dibuat'],
  Chat: ['ID', 'KelasID', 'Username', 'Nama', 'Peran', 'Teks', 'Waktu'],
  Evaluasi: ['SiswaID', 'Teks', 'Diperbarui'],
  Pengaturan: ['Username', 'Kurikulum', 'Konteks'],
  Kumpul: ['TugasID', 'SiswaID', 'Jawaban', 'Tautan', 'Waktu', 'Nilai', 'Catatan'],
  ChatPribadi: ['ID', 'KelasID', 'Utas', 'Username', 'Nama', 'Peran', 'Teks', 'Waktu']
};

/** Pintu masuk API untuk frontend GitHub Pages (index.html).
 * Frontend mengirim POST teks JSON {fn, args}; hanya fungsi pada daftar putih ini yang boleh dipanggil. */
const API_ = { register, login, recoveryQuestion, resetPassword, infoPublik, cariSekolah, getData, setNilai, setHadir, addInfo, toggleTugas, kirimPesan,
  buatKelas, kodeBaru, gabungKelas, keluarkan, addTugas, simpanMateri, ytInfo, ubah, hapus, bukaPresensi, presensiAktif, hadirSekarang, addAgenda,
  chatList, chatKirim, simpanPengaturan, simpanEvaluasi, kumpulTugas, kumpulList, nilaiKumpul, pcList, pcKirim, gantiNama, gantiSandi, gantiPemulihan, keluarKelas };

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    const fn = Object.prototype.hasOwnProperty.call(API_, req.fn) ? API_[req.fn] : null;
    if (!fn) throw new Error('Perintah tidak dikenal.');
    out = { ok: true, data: fn.apply(null, Array.isArray(req.args) ? req.args : []) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err).replace(/^(Error|Exception):\s*/, '') };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  Object.keys(HEAD).forEach(sheet_); // pastikan seluruh tabel ada
  try { // mode lama: bila ada file Index.html di proyek Apps Script, tampilkan langsung
    return HtmlService.createHtmlOutputFromFile('Index').setTitle('GarudaSmart').addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) { // mode GitHub Pages: hanya API
    return ContentService.createTextOutput(JSON.stringify({ ok: true, app: 'GarudaSmart API', info: 'Buka aplikasi lewat situs GitHub Pages Anda.' })).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Jalankan sekali dari editor Apps Script untuk membuat seluruh tabel.
 * Script harus dibuat dari Extensions > Apps Script di Google Sheet tujuan.
 */
function setupGarudaSmart() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Buat/buka Google Sheet terlebih dahulu, lalu pilih Extensions > Apps Script.');
  Object.keys(HEAD).forEach(name => sheet_(name));
  return 'GarudaSmart siap. Spreadsheet: ' + ss.getName() + '. Jumlah tabel: ' + Object.keys(HEAD).length;
}

/* ---------- util ---------- */
const norm_ = s => String(s || '').trim().toLowerCase();
const today_ = () => Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
const txt_ = v => v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v);
const hashLama_ = s => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + s));
const hash_ = s => 'h1:' + hashLama_(s); // awalan mencegah nilai diperlakukan sebagai rumus oleh Sheets
const cek_ = (h, s) => String(h) === hash_(s) || String(h) === hashLama_(s); // akun lama tetap bisa masuk
function sheet_(n) {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(n);
  if (!s) { s = ss.insertSheet(n); s.appendRow(HEAD[n]); s.setFrozenRows(1); s.getRange('A:C').setNumberFormat('@'); }
  else if (s.getLastColumn() < HEAD[n].length) s.getRange(1, 1, 1, HEAD[n].length).setValues([HEAD[n]]);
  return s;
}
function all_(n) {
  const v = sheet_(n).getDataRange().getValues(), h = v.shift();
  return v.map((r, i) => { const o = { _row: i + 2 }; h.forEach((k, j) => o[k] = r[j]); return o; });
}
function lock_(fn) {
  const l = LockService.getScriptLock(); l.waitLock(15000);
  try { return fn(); } finally { l.releaseLock(); }
}
function tries_(key) {
  const c = CacheService.getScriptCache(), n = +(c.get(key) || 0);
  if (n >= 5) throw new Error('Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
  return () => c.put(key, n + 1, 900);
}
function auth_(token, role) {
  const raw = CacheService.getScriptCache().get('s:' + token);
  if (!raw) throw new Error('Sesi berakhir. Silakan masuk lagi.');
  const me = JSON.parse(raw);
  if (role && me.role !== role) throw new Error('Akses ditolak untuk peran Anda.');
  return me;
}

/* ---------- akun: daftar, masuk, lupa sandi ---------- */
function register(p) {
  return lock_(() => {
    const u = norm_(p.u), nama = String(p.nama || '').trim(), a = norm_(p.a);
    if (!/^[a-z0-9_.]{3,}$/.test(u)) throw new Error('Nama pengguna minimal 3 karakter: huruf kecil, angka, titik, atau garis bawah.');
    if (nama.length < 3) throw new Error('Isi nama lengkap dengan benar.');
    if (String(p.pw || '').length < 6) throw new Error('Kata sandi minimal 6 karakter.');
    if (!a) throw new Error('Isi jawaban pemulihan.');
    if (all_('Akun').some(x => x.Username === u)) throw new Error('Nama pengguna sudah dipakai. Pilih yang lain.');
    const sk = String(p.sekolah || '').trim();
    if (sk.length < 3) throw new Error('Isi nama sekolah atau kampus Anda.');
    let sid = '';
    if (p.role === 'guru') {
      if (p.kode !== KODE_GURU) throw new Error('Kode guru tidak benar.');
    } else if (p.role === 'siswa') {
      sid = Utilities.getUuid().slice(0, 8);
      sheet_('Siswa').appendRow([sid, safe_(nama), u, 0, 0, 0, 0]); // nama siswa = nama yang mendaftar
    } else if (p.role === 'ortu') {
      const m = all_('Siswa').filter(s => norm_(s.Nama) === norm_(p.anak));
      if (m.length !== 1) throw new Error(m.length ? 'Ada lebih dari satu siswa dengan nama itu. Hubungi guru.' : 'Siswa belum terdaftar. Minta anak Anda mendaftar lebih dulu.');
      sid = m[0].ID;
    } else throw new Error('Peran tidak valid.');
    ensureSekolah_(sk, p.jenjang);
    sheet_('Akun').appendRow([u, safe_(nama), p.role, sid, hash_(p.pw), +p.q || 0, hash_(a), new Date(), safe_(sk)]);
    return true;
  });
}
function login(u, pw) {
  u = norm_(u); const fail = tries_('l:' + u);
  const a = all_('Akun').find(x => x.Username === u);
  if (!a || !cek_(a.Hash, pw)) { fail(); throw new Error('Nama pengguna atau kata sandi tidak cocok.'); }
  const me = { u, nama: a.Nama, role: a.Peran, sid: String(a.SiswaID || ''), sekolah: String(a.Sekolah || ''), jenjang: jenjangDari_(a.Sekolah) }, token = Utilities.getUuid();
  CacheService.getScriptCache().put('s:' + token, JSON.stringify(me), 21600);
  return { token, me };
}
function recoveryQuestion(u) {
  const a = all_('Akun').find(x => x.Username === norm_(u));
  if (!a) throw new Error('Nama pengguna tidak ditemukan.');
  return QS[+a.Q] || QS[0];
}
function resetPassword(u, jawaban, pw) {
  u = norm_(u); const fail = tries_('r:' + u);
  const a = all_('Akun').find(x => x.Username === u);
  if (!a || !cek_(a.AHash, norm_(jawaban))) { fail(); throw new Error('Jawaban pemulihan tidak cocok.'); }
  if (String(pw || '').length < 6) throw new Error('Kata sandi minimal 6 karakter.');
  sheet_('Akun').getRange(a._row, 5).setValue(hash_(pw));
  return true;
}

/* ---------- data ---------- */
function setNilai(token, id, i, v) {
  auth_(token, 'guru'); i = +i; v = Math.max(0, Math.min(100, +v || 0));
  return lock_(() => { const s = all_('Siswa').find(x => String(x.ID) === String(id)); if (!s || i < 0 || i > 3) throw new Error('Data siswa tidak ditemukan.'); sheet_('Siswa').getRange(s._row, 4 + i).setValue(v); return v; });
}
function setHadir(token, id, st) {
  auth_(token, 'guru'); if ('HSIA'.indexOf(st) < 0 || !st) throw new Error('Status tidak valid.');
  return lock_(() => {
    const t = today_(), r = all_('Absensi').find(x => String(x.SiswaID) === String(id) && txt_(x.Tanggal) === t);
    if (r) sheet_('Absensi').getRange(r._row, 3).setValue(st); else sheet_('Absensi').appendRow([t, id, st]);
    return true;
  });
}
function addInfo(token, teks) {
  auth_(token, 'guru'); if (!String(teks).trim()) throw new Error('Isi pengumuman dulu.');
  sheet_('Info').appendRow([Utilities.getUuid().slice(0, 8), safe_(String(teks).trim()), today_()]); return true;
}
function toggleTugas(token, tid) {
  const me = auth_(token, 'siswa');
  return lock_(() => {
    const t = all_('Tugas').find(x => String(x.ID) === String(tid)); if (!t) throw new Error('Tugas tidak ditemukan.');
    const l = String(t.Selesai || '').split(',').filter(Boolean), i = l.indexOf(me.sid);
    i < 0 ? l.push(me.sid) : l.splice(i, 1);
    sheet_('Tugas').getRange(t._row, 5).setValue(l.join(',')); return true;
  });
}
function kirimPesan(token, teks) {
  const me = auth_(token, 'ortu'); if (!String(teks).trim()) throw new Error('Tulis pesan dulu.');
  sheet_('Pesan').appendRow([Utilities.getUuid().slice(0, 8), me.nama, me.u, me.sid, safe_(String(teks).trim()), today_()]); return true;
}

/* ---------- direktori sekolah & kampus ---------- */
// Sheet "Sekolah": NPSN | Nama | Jenjang | Provinsi | KabKota | Dibuat
// Jenjang memakai 4 label ini: "SD / MI", "SMP / MTs", "SMA / SMK / MA", "Perguruan tinggi"
function infoPublik() { return { sekolah: Math.max(0, sheet_('Sekolah').getLastRow() - 1) }; }
function cariSekolah(q, jenjang) {
  q = String(q || '').trim(); if (q.length < 3) return [];
  const sh = sheet_('Sekolah'), n = sh.getLastRow() - 1; if (n < 1) return [];
  const hits = sh.getRange(2, 2, n, 1).createTextFinder(q).matchCase(false).findAll().slice(0, 60), out = [];
  for (const h of hits) {
    const r = sh.getRange(h.getRow(), 1, 1, 5).getValues()[0];
    if (jenjang && r[2] && r[2] !== jenjang) continue;
    out.push({ npsn: String(r[0]), nama: r[1], kab: r[4], prov: r[3] });
    if (out.length >= 15) break;
  }
  return out;
}
function ensureSekolah_(nama, jenjang) {
  const sh = sheet_('Sekolah'), n = sh.getLastRow() - 1;
  if (n > 0 && sh.getRange(2, 2, n, 1).createTextFinder(nama).matchCase(false).matchEntireCell(true).findNext()) return;
  sh.appendRow(['', safe_(nama), jenjang || '', '', '', new Date()]); // nama baru dari pendaftar
}
// Impor/perbarui direktori dari file CSV (kolom: NPSN, Nama, Jenjang, Provinsi, KabKota).
// Isi properti skrip SEKOLAH_CSV_URL (Project Settings), lalu jalankan sekali atau pasang pembaruan harian.
function perbaruiSekolah() {
  const url = PropertiesService.getScriptProperties().getProperty('SEKOLAH_CSV_URL');
  if (!url) throw new Error('Isi properti skrip SEKOLAH_CSV_URL dengan tautan CSV data sekolah.');
  const rows = Utilities.parseCsv(UrlFetchApp.fetch(url).getContentText());
  const head = rows.shift().map(norm_), cols = ['npsn', 'nama', 'jenjang', 'provinsi', 'kabkota'].map(k => head.indexOf(k));
  if (cols[1] < 0 || cols[2] < 0) throw new Error('CSV harus punya kolom: NPSN, Nama, Jenjang, Provinsi, KabKota.');
  const now = new Date(), data = rows.filter(r => r[cols[1]]).map(r => cols.map(i => i < 0 ? '' : r[i]).concat([now]));
  const sh = sheet_('Sekolah'), last = sh.getLastRow();
  const manual = last > 1 ? sh.getRange(2, 1, last - 1, 6).getValues().filter(r => !r[0]) : [];
  if (last > 1) sh.getRange(2, 1, last - 1, 6).clearContent();
  const all = data.concat(manual);
  if (sh.getMaxRows() < all.length + 1) sh.insertRowsAfter(sh.getMaxRows(), all.length + 1 - sh.getMaxRows());
  for (let i = 0; i < all.length; i += 5000) { const c = all.slice(i, i + 5000); sh.getRange(2 + i, 1, c.length, 6).setValues(c); }
}
function pasangPembaruanHarian() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'perbaruiSekolah').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('perbaruiSekolah').timeBased().everyDays(1).atHour(2).create();
}

/* ================= DASBOR GURU: kelas, materi, presensi, chat, AI ================= */
const safe_ = v => /^[=+\-@]/.test(String(v)) ? ' ' + v : v; // cegah injeksi rumus di Sheet
const EDIT_ = { Materi: ['Judul', 'Isi'], Tugas: ['Judul', 'Mapel', 'Tenggat', 'Isi'], Kelas: ['Nama', 'Mapel'], Siswa: ['Nama'], Agenda: ['Judul', 'Tanggal'] };

function kelasSaya_(me) {
  const K = all_('Kelas');
  if (me.role === 'guru') return K.filter(k => k.Guru === me.u);
  const ids = all_('Anggota').filter(a => String(a.SiswaID) === me.sid).map(a => String(a.KelasID));
  return K.filter(k => ids.indexOf(String(k.ID)) >= 0);
}
function milik_(me, kid) {
  const k = all_('Kelas').find(x => String(x.ID) === String(kid) && x.Guru === me.u);
  if (!k) throw new Error('Kelas tidak ditemukan.');
  return k;
}
function kodeAcak_() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

function getData(token) {
  const me = auth_(token), t = today_(), ab = all_('Absensi'), K = kelasSaya_(me), kid = K.map(k => String(k.ID));
  const ang = all_('Anggota').filter(a => kid.indexOf(String(a.KelasID)) >= 0), sids = ang.map(a => String(a.SiswaID));
  const SS = all_('Siswa');
  const ss = SS.filter(s => me.role === 'guru' ? sids.indexOf(String(s.ID)) >= 0 : String(s.ID) === me.sid);
  const students = ss.map(s => {
    const mine = ab.filter(x => String(x.SiswaID) === String(s.ID)), c = st => mine.filter(x => x.Status === st).length;
    const td = mine.find(x => txt_(x.Tanggal) === t);
    return { id: String(s.ID), nama: s.Nama, nilai: MAPEL.map(m => +s[m] || 0), att: { H: c('H'), S: c('S'), I: c('I'), A: c('A') }, today: td ? td.Status : '' };
  });
  const inK = x => !x.KelasID || kid.indexOf(String(x.KelasID)) >= 0;
  const tugas = all_('Tugas').filter(inK).map(x => ({ id: String(x.ID), judul: x.Judul, mapel: x.Mapel, tenggat: txt_(x.Tenggat), selesai: String(x.Selesai || '').split(',').filter(Boolean), kelasId: String(x.KelasID || ''), isi: String(x.Isi || '') }));
  const materi = all_('Materi').filter(x => kid.indexOf(String(x.KelasID)) >= 0).map(x => ({ id: String(x.ID), kelasId: String(x.KelasID), jenis: x.Jenis, judul: x.Judul, isi: String(x.Isi || ''), video: String(x.Video || '') })).reverse();
  const agenda = all_('Agenda').filter(inK).map(x => ({ id: String(x.ID), kelasId: String(x.KelasID || ''), tanggal: txt_(x.Tanggal), judul: x.Judul }));
  const evaluasi = {};
  all_('Evaluasi').forEach(x => { const k = String(x.SiswaID); if (me.role === 'guru' ? sids.indexOf(k) >= 0 : k === me.sid) evaluasi[k] = x.Teks; });
  const kelas = K.map(k => ({ id: String(k.ID), nama: k.Nama, mapel: String(k.Mapel || ''), kode: me.role === 'guru' ? String(k.Kode) : '' }));
  const anggota = {};
  if (me.role === 'guru') { const nm = {}; SS.forEach(s => nm[String(s.ID)] = s.Nama); ang.forEach(a => { (anggota[String(a.KelasID)] = anggota[String(a.KelasID)] || []).push({ id: String(a.SiswaID), nama: nm[String(a.SiswaID)] || '?' }); }); }
  const info = all_('Info').map(x => ({ id: String(x.ID), teks: x.Teks, tanggal: txt_(x.Tanggal) })).reverse();
  let pesan = [];
  if (me.role !== 'siswa') pesan = all_('Pesan').filter(x => me.role === 'guru' || x.Username === me.u).map(x => ({ dari: x.Dari, teks: x.Teks, tanggal: txt_(x.Tanggal) })).reverse();
  return { me, students, tugas, info, pesan, kelas, anggota, materi, agenda, evaluasi, kumpul: kumpulSaya_(me), presensi: presensiAktif_(me), cfg: me.role === 'guru' ? pengaturan_(me.u) : null,
    aiAktif: true, appUrl: ScriptApp.getService().getUrl() };
}

/* ---------- kelas & daftar siswa ---------- */
function buatKelas(token, nama, mapel) {
  const me = auth_(token, 'guru'); nama = String(nama || '').trim();
  if (nama.length < 2) throw new Error('Isi nama kelas.');
  return lock_(() => {
    const ex = all_('Kelas').map(k => String(k.Kode)); let kode; do { kode = kodeAcak_(); } while (ex.indexOf(kode) >= 0);
    const id = Utilities.getUuid().slice(0, 8);
    sheet_('Kelas').appendRow([id, safe_(nama), safe_(String(mapel || '').trim()), kode, me.u, new Date()]);
    return id;
  });
}
function kodeBaru(token, kelasId) {
  const me = auth_(token, 'guru'), k = milik_(me, kelasId);
  return lock_(() => {
    const ex = all_('Kelas').map(x => String(x.Kode)); let kode; do { kode = kodeAcak_(); } while (ex.indexOf(kode) >= 0);
    sheet_('Kelas').getRange(k._row, 4).setValue(kode); return kode;
  });
}
function gabungKelas(token, kode) {
  const me = auth_(token, 'siswa'); kode = String(kode || '').trim().toUpperCase();
  const k = all_('Kelas').find(x => String(x.Kode) === kode);
  if (!k) throw new Error('Kode kelas tidak ditemukan. Periksa lagi kodenya.');
  return lock_(() => {
    if (all_('Anggota').some(a => String(a.KelasID) === String(k.ID) && String(a.SiswaID) === me.sid)) throw new Error('Anda sudah tergabung di kelas ini.');
    sheet_('Anggota').appendRow([k.ID, me.sid, new Date()]); return k.Nama;
  });
}
function keluarkan(token, kelasId, sid) {
  auth_(token, 'guru');
  return lock_(() => { const r = all_('Anggota').find(a => String(a.KelasID) === String(kelasId) && String(a.SiswaID) === String(sid)); if (r) sheet_('Anggota').deleteRow(r._row); return true; });
}

/* ---------- materi, tugas, LKPD, instrumen, game, video ---------- */
function addTugas(token, kelasId, judul, mapel, tenggat, isi) {
  const me = auth_(token, 'guru'); milik_(me, kelasId);
  if (!String(judul).trim() || !tenggat) throw new Error('Isi judul dan tenggat tugas.');
  sheet_('Tugas').appendRow([Utilities.getUuid().slice(0, 8), safe_(String(judul).trim()), safe_(String(mapel || '')), tenggat, '', kelasId, safe_(String(isi || '').slice(0, 45000))]);
  return true;
}
function simpanMateri(token, p) {
  const me = auth_(token, 'guru'), k = milik_(me, p.kelasId), judul = String(p.judul || '').trim(), isi = String(p.isi || '');
  if (!judul) throw new Error('Isi judul terlebih dahulu.');
  if (!isi.trim() && !p.video) throw new Error('Isi materi atau tautan video belum ada.');
  if (isi.length > 45000) throw new Error('Isi terlalu panjang (maksimal 45.000 karakter).');
  if (p.jenis === 'Tugas') return addTugas(token, p.kelasId, judul, k.Mapel, p.tenggat, isi);
  if (['Materi', 'LKPD', 'Instrumen', 'Game', 'Video'].indexOf(p.jenis) < 0) throw new Error('Jenis tidak dikenal.');
  if (p.jenis === 'Game') { try { if (!JSON.parse(isi).soal.length) throw 0; } catch (e) { throw new Error('Format game tidak valid. Buat ulang dengan AI atau perbaiki JSON-nya.'); } }
  const video = /^[A-Za-z0-9_-]{11}$/.test(p.video || '') ? p.video : '';
  sheet_('Materi').appendRow([Utilities.getUuid().slice(0, 8), p.kelasId, p.jenis, safe_(judul), safe_(isi), video, new Date()]);
  return true;
}
function ytInfo(token, url) {
  auth_(token, 'guru');
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (!m) throw new Error('Tautan YouTube tidak valid.');
  let judul = '', penulis = '';
  try {
    const r = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + m[1]), { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) { const j = JSON.parse(r.getContentText()); judul = j.title; penulis = j.author_name; }
  } catch (e) { }
  return { id: m[1], judul, penulis };
}

/* ---------- ubah & hapus (guru dapat mengoreksi semuanya) ---------- */
function ubah(token, tabel, id, field, val) {
  auth_(token, 'guru');
  if (!EDIT_[tabel] || EDIT_[tabel].indexOf(field) < 0) throw new Error('Kolom tidak dapat diubah.');
  val = String(val); if (val.length > 45000) throw new Error('Isian terlalu panjang.');
  if (!val.trim() && ['Isi', 'Mapel'].indexOf(field) < 0) throw new Error('Isian tidak boleh kosong.');
  return lock_(() => {
    const h = HEAD[tabel], r = all_(tabel).find(x => String(x[h[0]]) === String(id));
    if (!r) throw new Error('Data tidak ditemukan.');
    sheet_(tabel).getRange(r._row, h.indexOf(field) + 1).setValue(safe_(val)); return true;
  });
}
function hapus(token, tabel, id) {
  auth_(token, 'guru');
  if (['Materi', 'Tugas', 'Kelas', 'Agenda'].indexOf(tabel) < 0) throw new Error('Data tidak dapat dihapus.');
  return lock_(() => {
    const h = HEAD[tabel], r = all_(tabel).find(x => String(x[h[0]]) === String(id));
    if (!r) throw new Error('Data tidak ditemukan.');
    sheet_(tabel).deleteRow(r._row);
    if (tabel === 'Kelas') all_('Anggota').filter(a => String(a.KelasID) === String(id)).map(a => a._row).reverse().forEach(x => sheet_('Anggota').deleteRow(x));
    return true;
  });
}

/* ---------- presensi 15 menit ---------- */
function bukaPresensi(token, kelasId) {
  const me = auth_(token, 'guru'); milik_(me, kelasId);
  return lock_(() => { const n = Date.now(); sheet_('Presensi').appendRow([Utilities.getUuid().slice(0, 8), kelasId, n, n + 15 * 60000]); return n + 15 * 60000; });
}
function presensiAktif_(me) {
  const kid = kelasSaya_(me).map(k => String(k.ID)), n = Date.now();
  return all_('Presensi').filter(p => kid.indexOf(String(p.KelasID)) >= 0 && +p.Selesai > n).map(p => ({ id: String(p.ID), kelasId: String(p.KelasID), selesai: +p.Selesai }));
}
function presensiAktif(token) { return presensiAktif_(auth_(token)); }
function hadirSekarang(token, pid) {
  const me = auth_(token, 'siswa');
  if (!presensiAktif_(me).some(x => x.id === String(pid))) throw new Error('Presensi sudah ditutup atau bukan untuk kelas Anda.');
  return lock_(() => {
    const t = today_(), r = all_('Absensi').find(x => String(x.SiswaID) === me.sid && txt_(x.Tanggal) === t);
    if (r) sheet_('Absensi').getRange(r._row, 3).setValue('H'); else sheet_('Absensi').appendRow([t, me.sid, 'H']);
    return true;
  });
}

/* ---------- kalender & chat kelas ---------- */
function addAgenda(token, kelasId, tanggal, judul) {
  const me = auth_(token, 'guru'); if (kelasId) milik_(me, kelasId);
  if (!tanggal || !String(judul).trim()) throw new Error('Isi tanggal dan judul agenda.');
  sheet_('Agenda').appendRow([Utilities.getUuid().slice(0, 8), kelasId || '', tanggal, safe_(String(judul).trim()), new Date()]); return true;
}
function chatList(token, kid) {
  const me = auth_(token);
  if (!kelasSaya_(me).some(k => String(k.ID) === String(kid))) throw new Error('Anda tidak berada di kelas ini.');
  return all_('Chat').filter(x => String(x.KelasID) === String(kid)).slice(-100).map(x => ({ nama: x.Nama, peran: x.Peran, teks: x.Teks, waktu: +x.Waktu, saya: x.Username === me.u }));
}
function chatKirim(token, kid, teks) {
  const me = auth_(token);
  if (!kelasSaya_(me).some(k => String(k.ID) === String(kid))) throw new Error('Anda tidak berada di kelas ini.');
  teks = String(teks || '').trim().slice(0, 500); if (!teks) throw new Error('Tulis pesan dulu.');
  sheet_('Chat').appendRow([Utilities.getUuid().slice(0, 8), kid, me.u, safe_(me.nama), me.role, safe_(teks), Date.now()]); return true;
}

/* ---------- pengaturan & AI ---------- */
function pengaturan_(u) { const r = all_('Pengaturan').find(x => x.Username === u); return { kurikulum: r && r.Kurikulum ? r.Kurikulum : 'Kurikulum Merdeka', konteks: r ? String(r.Konteks || '') : '' }; }
function simpanPengaturan(token, kurikulum, konteks) {
  const me = auth_(token, 'guru');
  return lock_(() => {
    const r = all_('Pengaturan').find(x => x.Username === me.u), v = [me.u, safe_(String(kurikulum).slice(0, 80)), safe_(String(konteks || '').slice(0, 3000))];
    if (r) sheet_('Pengaturan').getRange(r._row, 1, 1, 3).setValues([v]); else sheet_('Pengaturan').appendRow(v);
    return true;
  });
}
function simpanEvaluasi(token, sid, teks) {
  auth_(token, 'guru');
  return lock_(() => {
    const r = all_('Evaluasi').find(x => String(x.SiswaID) === String(sid)), v = [sid, safe_(String(teks || '').slice(0, 20000)), new Date()];
    if (r) sheet_('Evaluasi').getRange(r._row, 1, 1, 3).setValues([v]); else sheet_('Evaluasi').appendRow(v);
    return true;
  });
}

/* ================= SISWA & ORANG TUA: tugas, chat pribadi, akun ================= */
function jenjangDari_(nama) {
  if (!nama) return '';
  const sh = sheet_('Sekolah'), n = sh.getLastRow() - 1; if (n < 1) return '';
  const f = sh.getRange(2, 2, n, 1).createTextFinder(String(nama)).matchCase(false).matchEntireCell(true).findNext();
  return f ? String(sh.getRange(f.getRow(), 3).getValue()) : '';
}
function kumpulSaya_(me) {
  if (me.role === 'guru') return [];
  return all_('Kumpul').filter(x => String(x.SiswaID) === me.sid).map(x => ({ tid: String(x.TugasID), jawaban: String(x.Jawaban || ''), tautan: String(x.Tautan || ''), nilai: x.Nilai === '' ? '' : +x.Nilai, catatan: String(x.Catatan || '') }));
}
function tugasGuru_(me, tid) {
  const t = all_('Tugas').find(x => String(x.ID) === String(tid));
  if (!t) throw new Error('Tugas tidak ditemukan.');
  if (t.KelasID) milik_(me, t.KelasID);
  return t;
}
function kumpulTugas(token, tid, jawaban, tautan) {
  const me = auth_(token, 'siswa'); jawaban = String(jawaban || '').trim().slice(0, 20000); tautan = String(tautan || '').trim().slice(0, 500);
  if (!jawaban && !tautan) throw new Error('Isi jawaban atau tautan hasil kerja.');
  if (tautan && !/^https?:\/\//i.test(tautan)) throw new Error('Tautan harus diawali http:// atau https://');
  return lock_(() => {
    const kid = kelasSaya_(me).map(k => String(k.ID)), t = all_('Tugas').find(x => String(x.ID) === String(tid));
    if (!t || (t.KelasID && kid.indexOf(String(t.KelasID)) < 0)) throw new Error('Tugas tidak ditemukan.');
    const r = all_('Kumpul').find(x => String(x.TugasID) === String(tid) && String(x.SiswaID) === me.sid);
    if (r && r.Nilai !== '') throw new Error('Tugas sudah dinilai dan tidak dapat diubah.');
    const v = [tid, me.sid, safe_(jawaban), tautan, Date.now()];
    if (r) sheet_('Kumpul').getRange(r._row, 1, 1, 5).setValues([v]); else sheet_('Kumpul').appendRow(v.concat(['', '']));
    const l = String(t.Selesai || '').split(',').filter(Boolean);
    if (l.indexOf(me.sid) < 0) { l.push(me.sid); sheet_('Tugas').getRange(t._row, 5).setValue(l.join(',')); }
    return true;
  });
}
function kumpulList(token, tid) {
  const me = auth_(token, 'guru'); tugasGuru_(me, tid);
  const nm = {}; all_('Siswa').forEach(s => nm[String(s.ID)] = s.Nama);
  return all_('Kumpul').filter(x => String(x.TugasID) === String(tid)).map(x => ({ sid: String(x.SiswaID), nama: nm[String(x.SiswaID)] || '?', jawaban: String(x.Jawaban || ''), tautan: String(x.Tautan || ''), waktu: Utilities.formatDate(new Date(+x.Waktu), Session.getScriptTimeZone(), 'd/M/yyyy HH:mm'), nilai: x.Nilai === '' ? '' : +x.Nilai, catatan: String(x.Catatan || '') }));
}
function nilaiKumpul(token, tid, sid, nilai, catatan) {
  const me = auth_(token, 'guru'); tugasGuru_(me, tid);
  if (String(nilai).trim() === '' || isNaN(+nilai)) throw new Error('Isi nilai 0 sampai 100.');
  const v = Math.max(0, Math.min(100, +nilai));
  return lock_(() => {
    const r = all_('Kumpul').find(x => String(x.TugasID) === String(tid) && String(x.SiswaID) === String(sid));
    if (!r) throw new Error('Pengumpulan tidak ditemukan.');
    sheet_('Kumpul').getRange(r._row, 6, 1, 2).setValues([[v, safe_(String(catatan || '').slice(0, 500))]]); return true;
  });
}

/* chat pribadi: siswa atau orang tua <-> guru kelas */
function utas_(me, kid, sid, tipe) {
  if (me.role === 'guru') {
    milik_(me, kid);
    if (['siswa', 'ortu'].indexOf(tipe) < 0) throw new Error('Pilih lawan bicara.');
    if (!all_('Anggota').some(a => String(a.KelasID) === String(kid) && String(a.SiswaID) === String(sid))) throw new Error('Siswa tidak ada di kelas ini.');
    return sid + ':' + tipe;
  }
  if (!kelasSaya_(me).some(k => String(k.ID) === String(kid))) throw new Error('Anda tidak berada di kelas ini.');
  return me.sid + ':' + me.role;
}
function pcList(token, kid, sid, tipe) {
  const me = auth_(token), u = utas_(me, kid, sid, tipe);
  return all_('ChatPribadi').filter(x => String(x.KelasID) === String(kid) && String(x.Utas) === u).slice(-100).map(x => ({ nama: x.Nama, peran: x.Peran, teks: x.Teks, waktu: +x.Waktu, saya: x.Username === me.u }));
}
function pcKirim(token, kid, sid, tipe, teks) {
  const me = auth_(token), u = utas_(me, kid, sid, tipe); teks = String(teks || '').trim().slice(0, 500);
  if (!teks) throw new Error('Tulis pesan dulu.');
  sheet_('ChatPribadi').appendRow([Utilities.getUuid().slice(0, 8), kid, u, me.u, safe_(me.nama), me.role, safe_(teks), Date.now()]); return true;
}

/* pengaturan akun */
function akunSaya_(me) { const a = all_('Akun').find(x => x.Username === me.u); if (!a) throw new Error('Akun tidak ditemukan.'); return a; }
function gantiNama(token, nama) {
  const me = auth_(token); nama = String(nama || '').trim();
  if (nama.length < 3) throw new Error('Isi nama lengkap dengan benar.');
  return lock_(() => {
    const a = akunSaya_(me); sheet_('Akun').getRange(a._row, 2).setValue(safe_(nama));
    if (me.role === 'siswa') { const s = all_('Siswa').find(x => String(x.ID) === me.sid); if (s) sheet_('Siswa').getRange(s._row, 2).setValue(safe_(nama)); }
    me.nama = nama; CacheService.getScriptCache().put('s:' + token, JSON.stringify(me), 21600); return true;
  });
}
function gantiSandi(token, lama, baru) {
  const me = auth_(token), fail = tries_('g:' + me.u), a = akunSaya_(me);
  if (!cek_(a.Hash, lama)) { fail(); throw new Error('Kata sandi saat ini tidak cocok.'); }
  if (String(baru || '').length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');
  sheet_('Akun').getRange(a._row, 5).setValue(hash_(baru)); return true;
}
function gantiPemulihan(token, pw, q, jawaban) {
  const me = auth_(token), fail = tries_('g:' + me.u), a = akunSaya_(me), j = norm_(jawaban);
  if (!cek_(a.Hash, pw)) { fail(); throw new Error('Kata sandi saat ini tidak cocok.'); }
  if (!j) throw new Error('Isi jawaban pemulihan.');
  sheet_('Akun').getRange(a._row, 6, 1, 2).setValues([[+q || 0, hash_(j)]]); return true;
}
function keluarKelas(token, kid) {
  const me = auth_(token, 'siswa');
  return lock_(() => { const r = all_('Anggota').find(a => String(a.KelasID) === String(kid) && String(a.SiswaID) === me.sid); if (r) sheet_('Anggota').deleteRow(r._row); return true; });
}
