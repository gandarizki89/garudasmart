/* GarudaSmart – Asisten AI lokal (TANPA API, tanpa kunci, tanpa biaya).
 * Semua berjalan di browser. Ini bukan model bahasa besar: hasilnya dibuat dari
 * templat pedagogis + analisis teks sumber yang ditempel/diimpor guru.
 * Makin lengkap bahan sumbernya, makin bagus soal dan materi yang dihasilkan. */
(function () {
  const STOP = new Set(('yang dan atau dari untuk dengan pada dalam adalah merupakan ini itu juga akan dapat oleh karena sebagai agar sehingga ' +
    'tetapi namun saat ketika jika maka bahwa para lebih sangat telah sudah masih belum tidak bukan ada antara terhadap secara setiap semua suatu ' +
    'seorang mereka kami kita anda dia ia bisa harus hanya sebuah banyak berbagai tersebut tentang setelah sebelum selama hingga sampai serta ' +
    'yaitu yakni dimana mana apa siapa bagaimana mengapa kapan seperti contoh misalnya lain lainnya atas bawah dapat menjadi memiliki dilakukan ' +
    'melakukan digunakan menggunakan mempunyai berupa antara bagian hal cara dalam oleh pun lah kah').split(' '));
  const MAPEL = ['Matematika', 'B. Indonesia', 'IPA', 'B. Inggris'];

  /* ---------- alat bantu ---------- */
  const seedOf = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const words = s => String(s).match(/[\p{L}][\p{L}-]*/gu) || [];
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const pad = (n, w) => String(n).padStart(w || 1, '0');
  const L = 'abcd';

  function sentences(src) {
    return String(src || '').replace(/\r/g, '').split(/(?<=[.!?])\s+|\n+/)
      .map(s => s.replace(/^[\s\-•*]+/, '').replace(/^\d+[.)]\s+/, '').trim())
      .filter(s => s.length >= 35 && s.length <= 260 && words(s).length >= 6);
  }
  function analisa(src) {
    const ss = sentences(src), freq = {};
    ss.forEach(s => words(s).forEach(w => { const k = w.toLowerCase(); if (k.length >= 5 && !STOP.has(k)) freq[k] = (freq[k] || 0) + 1; }));
    const score = s => words(s).reduce((a, w) => a + (freq[w.toLowerCase()] || 0), 0) / Math.sqrt(words(s).length);
    const top = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || b.length - a.length);
    const rank = ss.map((s, i) => i).sort((x, y) => score(ss[y]) - score(ss[x]));
    return { ss, freq, top, score, rank };
  }
  function pilihKalimat(a, n) { return a.rank.slice(0, n).sort((x, y) => x - y).map(i => a.ss[i]); }

  /* soal pilihan ganda dari bahan: kalimat penting dengan istilah kunci dikosongkan */
  function cloze(a, n, seed) {
    const r = rng(seed), out = [], used = new Set();
    for (const i of a.rank) {
      if (out.length >= n) break;
      const s = a.ss[i], sw = new Set(words(s).map(w => w.toLowerCase()));
      const cand = words(s).filter(w => { const k = w.toLowerCase(); return k.length >= 5 && !STOP.has(k) && a.freq[k] && !used.has(k); })
        .sort((x, y) => a.freq[y.toLowerCase()] - a.freq[x.toLowerCase()] || y.length - x.length);
      if (!cand.length) continue;
      const ans = cand[0], k = ans.toLowerCase();
      const dis = a.top.filter(w => !sw.has(w) && w !== k).sort((x, y) => Math.abs(x.length - k.length) - Math.abs(y.length - k.length)).slice(0, 12);
      if (dis.length < 3) continue;
      used.add(k);
      const up = ans[0] === ans[0].toUpperCase() && ans[0] !== ans[0].toLowerCase();
      const fix = w => up ? cap(w) : w;
      const blank = s.replace(new RegExp('(?<![\\p{L}-])' + escRe(ans) + '(?![\\p{L}-])', 'giu'), '_____');
      const opsi = shuffle([ans, ...shuffle(dis, r).slice(0, 3).map(fix)], r);
      out.push({ i, q: 'Lengkapi pernyataan berikut: ' + blank, opsi, benar: opsi.indexOf(ans), info: 'Jawaban: ' + ans + '. Rujukan bahan: ' + s });
    }
    return out.sort((x, y) => x.i - y.i);
  }

  /* ---------- konteks ---------- */
  const K13 = c => /2013/.test(c.kurikulum || '');
  const tpLabel = c => K13(c) ? 'KOMPETENSI DASAR DAN INDIKATOR' : 'TUJUAN PEMBELAJARAN (selaras Capaian Pembelajaran)';
  function kop(c, judul) {
    return [judul.toUpperCase(), 'Sekolah: ' + (c.sekolah || '-'), 'Kelas: ' + (c.kelas || '-') + ' | Mata pelajaran: ' + (c.mapel || '-'), 'Kurikulum: ' + (c.kurikulum || 'Kurikulum Merdeka'), ''].join('\n');
  }
  const konteksBaris = c => c.konteks ? '\nCATATAN KONTEKS SEKOLAH (sesuaikan kegiatan dengan hal ini):\n' + c.konteks.trim() + '\n' : '';
  function judulVideo(src) { const m = String(src || '').match(/\[Video YouTube berjudul: ([^\]]*)\]/); return m ? m[1] : ''; }
  const bersih = src => String(src || '').replace(/\[Video YouTube berjudul: [^\]]*\]/g, '').trim();
  const rubrik4 = ['Ketepatan isi', 'Kelengkapan', 'Kejelasan penyajian', 'Kreativitas dan kerja sama'];
  function tabelRubrik(kriteria) {
    return kriteria.map((k, i) => (i + 1) + '. ' + k + ': 4 = sangat baik | 3 = baik | 2 = cukup | 1 = perlu bimbingan').join('\n') +
      '\nNilai akhir = (jumlah skor : ' + (kriteria.length * 4) + ') x 100';
  }
  const stems = [
    ['C1', 'Sebutkan tiga istilah atau ciri penting dalam {t}.'],
    ['C2', 'Jelaskan dengan kata-kata Anda sendiri apa yang dimaksud dengan {t}.'],
    ['C2', 'Berikan dua contoh {t} dalam kehidupan sehari-hari beserta alasannya.'],
    ['C3', 'Terapkan konsep {t} untuk menyelesaikan situasi berikut: [guru menuliskan kasus kontekstual di sini].'],
    ['C4', 'Bandingkan dua unsur dalam {t}. Jelaskan persamaan dan perbedaannya.'],
    ['C5', 'Menurut Anda, apa kelebihan dan keterbatasan penerapan {t}? Berikan alasan.'],
    ['C6', 'Rancanglah solusi atau produk sederhana yang memanfaatkan {t}, lalu jelaskan langkah-langkahnya.']
  ];

  /* ---------- generator per jenis ---------- */
  function materi(c, t, a, has) {
    const uraian = has ? pilihKalimat(a, Math.min(10, a.ss.length)).map((s, i) => (i + 1) + '. ' + s).join('\n')
      : '1. [Tuliskan pengertian ' + t + ']\n2. [Tuliskan unsur atau ciri utama]\n3. [Tuliskan cara kerja, langkah, atau proses]\n4. [Tuliskan hubungan dengan materi lain]';
    const kunci = has ? a.top.slice(0, 8).map(w => '- ' + cap(w)).join('\n') : '- [Istilah kunci 1]\n- [Istilah kunci 2]\n- [Istilah kunci 3]';
    const rangkum = has ? pilihKalimat(a, Math.min(3, a.ss.length)).map(s => '- ' + s).join('\n') : '- [Tuliskan 3 poin inti yang harus diingat siswa]';
    return kop(c, 'Materi: ' + t) + konteksBaris(c) +
      '\nA. ' + tpLabel(c) + '\n1. Siswa mampu menjelaskan konsep ' + t + ' dengan bahasa sendiri.\n2. Siswa mampu mengidentifikasi unsur-unsur penting dalam ' + t + '.\n3. Siswa mampu menerapkan ' + t + ' pada contoh dalam kehidupan sehari-hari.\n' +
      '\nB. PERTANYAAN PEMANTIK\n1. Apa yang sudah Anda ketahui tentang ' + t + '?\n2. Di mana kita bisa menemukan ' + t + ' di sekitar kita?\n' +
      '\nC. URAIAN MATERI\n' + uraian + '\n\nD. KONSEP KUNCI\n' + kunci +
      '\n\nE. CONTOH DAN LATIHAN\n1. [Contoh kontekstual yang dekat dengan kehidupan siswa]\n2. [Latihan singkat untuk dikerjakan di kelas]\n' +
      '\nF. RANGKUMAN\n' + rangkum + '\n\nG. REFLEKSI\n1. Bagian mana dari ' + t + ' yang paling mudah dipahami?\n2. Bagian mana yang masih membingungkan?\n';
  }
  function tugas(c, t, a, has) {
    const ref = has ? '\nBAHAN RUJUKAN\n' + pilihKalimat(a, Math.min(4, a.ss.length)).map(s => '- ' + s).join('\n') + '\n' : '';
    return kop(c, 'Tugas: ' + t) + konteksBaris(c) +
      '\nINSTRUKSI\nKerjakan tugas tentang ' + t + ' secara mandiri atau berkelompok sesuai arahan guru. Kumpulkan sebelum tenggat melalui menu Tugas.\n' + ref +
      '\nLANGKAH KERJA\n1. Baca dan pahami materi ' + t + ' yang telah dipelajari.\n2. Catat minimal tiga hal penting beserta alasannya.\n3. Buat produk: ringkasan, peta konsep, atau jawaban uraian (pilih salah satu).\n4. Periksa kembali pekerjaan Anda sebelum dikumpulkan.\n' +
      '\nPRODUK YANG DIKUMPULKAN\nJawaban teks pada kolom jawaban dan/atau tautan hasil kerja (Google Drive, dokumen, atau video).\n\nRUBRIK PENILAIAN\n' + tabelRubrik(rubrik4) + '\n';
  }
  function lkpd(c, t, a, has) {
    const ringkas = has ? pilihKalimat(a, Math.min(3, a.ss.length)).map(s => '- ' + s).join('\n') : '- [Tempel ringkasan materi atau fenomena yang akan diamati]';
    const kw = has ? a.top.slice(0, 3) : ['[istilah 1]', '[istilah 2]', '[istilah 3]'];
    return kop(c, 'LKPD: ' + t) + konteksBaris(c) +
      '\nIDENTITAS\nNama kelompok/siswa : ................................\nKelas               : ' + (c.kelas || '................') + '\nTanggal             : ................................\n' +
      '\nA. ' + tpLabel(c) + '\nSiswa mampu memahami dan menerapkan ' + t + ' melalui kegiatan terbimbing.\n' +
      '\nB. PETUNJUK\n1. Berdoalah sebelum mulai bekerja.\n2. Kerjakan secara berkelompok dan bagi peran anggota.\n3. Tanyakan kepada guru jika ada yang belum jelas.\n' +
      '\nC. KEGIATAN 1 – MENGAMATI\nBacalah bahan berikut:\n' + ringkas + '\nPertanyaan pemantik: Apa hal paling menarik tentang ' + t + '?\nJawaban: ..............................................................\n' +
      '\nD. KEGIATAN 2 – MEMAHAMI\n' + kw.map((w, i) => (i + 1) + '. Jelaskan arti "' + w + '" berdasarkan bahan di atas.\n   Jawaban: ..............................................................').join('\n') + '\n' +
      '\nE. KEGIATAN 3 – MENERAPKAN\nBuatlah satu contoh penerapan ' + t + ' dalam kehidupan sehari-hari, lalu jelaskan langkah-langkahnya.\nJawaban: ..............................................................\n' +
      '\nF. REFLEKSI\n1. Apa yang saya pelajari hari ini?\n2. Apa yang masih ingin saya tanyakan?\n' +
      '\nG. RUBRIK PENILAIAN\n' + tabelRubrik(['Ketepatan jawaban kegiatan 1-2', 'Kualitas contoh penerapan', 'Kerja sama kelompok', 'Refleksi']) + '\n';
  }
  function instrumen(c, t, a, has, n, seed) {
    const pg = has ? cloze(a, Math.max(1, Math.ceil(n * 0.7)), seed) : [];
    const sisa = n - pg.length;
    const used = new Set(pg.map(x => x.i));
    const kal = has ? a.rank.filter(i => !used.has(i)).slice(0, sisa).map(i => a.ss[i]) : [];
    const uraian = [];
    kal.forEach(s => uraian.push({ lvl: 'C2', kisi: 'Menjelaskan pernyataan: ' + s.split(/\s+/).slice(0, 6).join(' ') + ' ...', q: 'Jelaskan maksud pernyataan berikut dengan kata-kata Anda sendiri: "' + s + '"', kunci: 'Jawaban merujuk pada isi pernyataan: ' + s }));
    for (let i = 0; uraian.length < sisa; i++) { const [lvl, q] = stems[i % stems.length]; uraian.push({ lvl, q: q.replace('{t}', t), kunci: '[Guru menuliskan poin jawaban yang diharapkan]' }); }
    let no = 0, o = kop(c, 'Instrumen asesmen: ' + t) + '\nA. KISI-KISI\n';
    pg.forEach(x => { no++; o += no + '. Menentukan istilah yang tepat: ' + x.opsi[x.benar] + ' | Pilihan ganda | C1-C2\n'; });
    uraian.forEach(x => { no++; o += no + '. ' + (x.kisi || x.q.replace(/\[[^\]]*\]/g, '').trim()) + ' | Uraian | ' + x.lvl + '\n'; });
    no = 0;
    if (pg.length) { o += '\nB. SOAL PILIHAN GANDA\n'; pg.forEach(x => { no++; o += no + '. ' + x.q + '\n' + x.opsi.map((p, j) => '   ' + L[j] + '. ' + p).join('\n') + '\n'; }); }
    o += '\n' + (pg.length ? 'C' : 'B') + '. SOAL URAIAN\n'; uraian.forEach(x => { no++; o += no + '. ' + x.q + '\n'; });
    no = 0; o += '\nKUNCI JAWABAN DAN PEDOMAN PENSKORAN\n';
    pg.forEach(x => { no++; o += no + '. ' + L[x.benar].toUpperCase() + ' (skor 1)\n'; });
    uraian.forEach(x => { no++; o += no + '. ' + x.kunci + '\n   Skor: 4 = lengkap dan tepat | 3 = tepat kurang lengkap | 2 = sebagian | 1 = berusaha | 0 = kosong\n'; });
    if (has && pg.length < Math.ceil(n * 0.7)) o += '\n(Catatan: bahan sumber hanya cukup untuk ' + pg.length + ' soal pilihan ganda. Tambahkan bahan agar soal lebih banyak.)\n';
    if (!has) o += '\n(Catatan: tanpa bahan sumber, soal berupa kerangka uraian bertingkat C1-C6. Tempel teks materi untuk mendapat soal pilihan ganda otomatis.)\n';
    return o;
  }
  function game(c, t, a, has, n, seed) {
    if (!has) throw new Error('Game kuis dibuat dari bahan sumber. Tempel teks materi atau impor file .docx pada kolom "Bahan sumber", lalu klik Buat lagi.');
    const q = cloze(a, n, seed);
    if (q.length < 1) throw new Error('Bahan sumber terlalu pendek atau kurang bervariasi. Tempel teks yang lebih panjang (minimal beberapa kalimat lengkap).');
    return JSON.stringify({ judul: 'Kuis ' + t, soal: q.map(({ q, opsi, benar, info }) => ({ q, opsi, benar, info })) }, null, 1);
  }
  function video(c, t, src) {
    const jv = judulVideo(src);
    return kop(c, 'Lembar menonton video: ' + (jv || t)) + konteksBaris(c) +
      '\nA. TUJUAN\nSiswa mampu menyimak video dan merangkum gagasan pokok tentang ' + t + '.\n' +
      '\nB. SEBELUM MENONTON\n1. Apa yang sudah Anda ketahui tentang ' + t + '?\n2. Tuliskan satu pertanyaan yang ingin dijawab video ini.\n' +
      '\nC. SAAT MENONTON\n1. Catat tiga istilah atau fakta penting.\n2. Catat satu contoh yang disebutkan dalam video.\n3. Catat satu bagian yang kurang Anda pahami (beserta menitnya).\n' +
      '\nD. SESUDAH MENONTON\n1. Ringkas isi video dalam tiga kalimat.\n2. Apakah pertanyaan sebelum menonton sudah terjawab? Jelaskan.\n3. Bagaimana isi video berkaitan dengan kehidupan sehari-hari?\n' +
      '\nE. REFLEKSI\nSatu hal baru yang saya pelajari: ..............................\n\nRUBRIK\n' + tabelRubrik(['Ketepatan catatan', 'Kualitas ringkasan', 'Keterkaitan dengan kehidupan nyata']) + '\n';
  }

  function buat(p) {
    const topik = String(p.topik || '').trim() || '[isi topik]';
    const c = { sekolah: p.sekolah, kelas: p.kelas, mapel: p.mapel, kurikulum: p.kurikulum, konteks: p.konteks };
    const src = bersih(p.sumber).slice(0, 12000), a = analisa(src), has = a.ss.length >= 2 && a.top.length >= 4;
    const n = Math.max(3, Math.min(20, +p.jumlah || 10)), seed = seedOf(topik + src.length + n);
    switch (p.jenis) {
      case 'Materi': return materi(c, topik, a, has);
      case 'Tugas': return tugas(c, topik, a, has);
      case 'LKPD': return lkpd(c, topik, a, has);
      case 'Instrumen': return instrumen(c, topik, a, has, n, seed);
      case 'Game': return game(c, topik, a, has, n, seed);
      case 'Video': return video(c, topik, p.sumber);
    }
    throw new Error('Jenis tidak dikenal.');
  }

  /* ---------- evaluasi siswa dari data nyata ---------- */
  function evaluasi(s, tugasTotal, tugasSelesai) {
    const nil = s.nilai.map(v => +v || 0), rata = Math.round(nil.reduce((x, y) => x + y, 0) / nil.length);
    const hi = nil.indexOf(Math.max(...nil)), lo = nil.indexOf(Math.min(...nil));
    const tot = s.att.H + s.att.S + s.att.I + s.att.A, hadir = tot ? Math.round(s.att.H / tot * 100) : null;
    const tp = tugasTotal ? Math.round(tugasSelesai / tugasTotal * 100) : null;
    const pred = rata >= 85 ? 'sangat baik' : rata >= 70 ? 'baik' : rata >= 55 ? 'cukup' : 'perlu pendampingan';
    const kuat = [], lemah = [], rek = [];
    nil.forEach((v, i) => { (v >= 80 ? kuat : v < 65 ? lemah : []).push(MAPEL[i] + ' (' + v + ')'); });
    if (hadir !== null) { if (hadir >= 90) kuat.push('kehadiran sangat konsisten (' + hadir + '%)'); else if (hadir < 75) lemah.push('kehadiran (' + hadir + '%)'); }
    if (tp !== null) { if (tp >= 85) kuat.push('ketepatan mengerjakan tugas (' + tugasSelesai + ' dari ' + tugasTotal + ')'); else if (tp < 60) lemah.push('penyelesaian tugas (' + tugasSelesai + ' dari ' + tugasTotal + ')'); }
    lemah.slice(0, 4).forEach(x => { if (/^[A-Z]/.test(x)) rek.push('Berikan latihan terbimbing dan umpan balik singkat pada ' + x.replace(/ \(.*/, '') + '.'); });
    if (hadir !== null && hadir < 75) rek.push('Bicarakan kendala kehadiran dengan siswa dan orang tua.');
    if (tp !== null && tp < 60) rek.push('Bantu siswa membuat jadwal penyelesaian tugas dan pantau tenggat bersama.');
    if (!rek.length) rek.push('Beri tantangan pengayaan agar potensi siswa terus berkembang.');
    const ortu = rata >= 70
      ? 'Ananda menunjukkan perkembangan yang baik. Mohon terus memberi dukungan dan apresiasi di rumah.'
      : 'Ananda memerlukan pendampingan tambahan. Kami mengajak Bapak/Ibu mendampingi belajar di rumah secara rutin dan berkomunikasi dengan guru.';
    return 'EVALUASI ' + s.nama.toUpperCase() +
      '\n\nRINGKASAN CAPAIAN\nRata-rata nilai ' + rata + ' (' + pred + '). Nilai tertinggi pada ' + MAPEL[hi] + ' (' + nil[hi] + ') dan terendah pada ' + MAPEL[lo] + ' (' + nil[lo] + ').' +
      (hadir !== null ? ' Kehadiran ' + hadir + '% (hadir ' + s.att.H + ', sakit ' + s.att.S + ', izin ' + s.att.I + ', alpa ' + s.att.A + ').' : ' Data kehadiran belum tersedia.') +
      (tp !== null ? ' Tugas selesai ' + tugasSelesai + ' dari ' + tugasTotal + '.' : '') +
      '\n\nKEKUATAN\n' + (kuat.length ? kuat.map(x => '- ' + cap(x)).join('\n') : '- Belum ada capaian yang menonjol; dorong siswa dari hal kecil yang sudah dikuasai.') +
      '\n\nPERLU DITINGKATKAN\n' + (lemah.length ? lemah.map(x => '- ' + cap(x)).join('\n') : '- Tidak ada area yang mendesak saat ini.') +
      '\n\nREKOMENDASI TINDAK LANJUT\n' + rek.map((x, i) => (i + 1) + '. ' + x).join('\n') +
      '\n\nCATATAN UNTUK ORANG TUA\n' + ortu + '\n';
  }

  /* ---------- asisten obrolan berbasis templat ---------- */
  function ambilTopik(q) {
    let m = q.match(/(?:tentang|materi|topik|bahasan|pokok bahasan)\s+(.+)$/i) || q.match(/\buntuk\s+(.+)$/i);
    let t = m ? m[1] : q.replace(/^(buatkan|tolong|bantu|susun|buat|berikan|beri|saya butuh|minta)\s+/i, '');
    t = t.replace(/[?.!]+$/, '').trim();
    return t.length > 80 || t.length < 2 ? '[topik]' : t;
  }
  function chat(pesan, c) {
    const last = [...pesan].reverse().find(m => m.role === 'user'); if (!last) return 'Silakan ketik pertanyaan.';
    const q = last.text, l = q.toLowerCase(), t = ambilTopik(q), k = c.kurikulum || 'Kurikulum Merdeka', kelas = c.kelas || '[kelas]';
    if (/modul ajar|rpp|rencana pembelajaran|rencana pelaksanaan/.test(l))
      return 'KERANGKA ' + (K13(c) ? 'RPP' : 'MODUL AJAR') + ': ' + t + '\nKelas ' + kelas + ' | ' + k + '\n\n1. Identitas dan alokasi waktu\n2. ' + (K13(c) ? 'Kompetensi Dasar dan indikator' : 'Capaian dan tujuan pembelajaran') + '\n3. Profil/karakter yang dikuatkan: bernalar kritis, mandiri, gotong royong\n4. Pemahaman bermakna dan pertanyaan pemantik\n5. Kegiatan pembelajaran\n   a. Pembuka (10 menit): salam, doa, apersepsi, pertanyaan pemantik\n   b. Inti (60 menit): eksplorasi bahan, diskusi kelompok memakai LKPD, presentasi\n   c. Penutup (10 menit): rangkuman, refleksi, tugas lanjutan\n6. Diferensiasi: bahan visual/teks/praktik sesuai gaya belajar; pendampingan bagi siswa yang belum tuntas\n7. Asesmen: diagnostik (awal), formatif (proses), sumatif (akhir)\n8. Media dan sumber belajar\n9. Refleksi guru dan siswa\n\nTips: buat LKPD dan instrumen soal otomatis di menu Materi & tugas.';
    if (/tujuan pembelajaran|capaian|\btp\b|\bcp\b|indikator/.test(l))
      return 'CONTOH TUJUAN PEMBELAJARAN: ' + t + '\n1. Melalui diskusi dan pengamatan, siswa mampu menjelaskan konsep ' + t + ' dengan tepat.\n2. Melalui latihan terbimbing, siswa mampu mengidentifikasi unsur-unsur ' + t + '.\n3. Melalui studi kasus, siswa mampu menerapkan ' + t + ' pada situasi nyata.\n\nRumus: Audience + Behavior (kata kerja operasional) + Condition + Degree. Selaraskan dengan ' + (K13(c) ? 'KD' : 'CP fase') + ' pada ' + k + '.';
    if (/rubrik|penilaian|nilai/.test(l))
      return 'RUBRIK PENILAIAN: ' + t + '\n' + tabelRubrik(rubrik4) + '\n\nKonversi: 85-100 sangat baik, 70-84 baik, 55-69 cukup, di bawah 55 perlu pendampingan.';
    if (/soal|kuis|ulangan|asesmen|ujian/.test(l))
      return 'KERANGKA SOAL: ' + t + '\n' + stems.map((s, i) => (i + 1) + '. [' + s[0] + '] ' + s[1].replace('{t}', t)).join('\n') + '\n\nUntuk soal pilihan ganda otomatis dari teks materi, buka Materi & tugas, pilih jenis Instrumen atau Game, tempel bahan sumber.';
    if (/ice ?breaker|pembuka|apersepsi|motivasi|pemanasan/.test(l))
      return 'IDE PEMBUKA: ' + t + '\n1. Tebak kata: tampilkan 3 petunjuk, siswa menebak kaitannya dengan ' + t + '.\n2. Dua kebenaran satu kebohongan: guru menyebut 3 pernyataan tentang ' + t + ', siswa menebak yang keliru.\n3. Cerita 1 menit: kasus nyata singkat yang berkaitan dengan ' + t + ', lalu ajukan pertanyaan "Mengapa?".\n4. Poling berdiri: siswa berdiri jika setuju dengan pernyataan pemantik.';
    if (/refleksi/.test(l))
      return 'PERTANYAAN REFLEKSI: ' + t + '\n1. Apa hal terpenting yang saya pelajari hari ini?\n2. Bagian mana yang masih sulit bagi saya, dan mengapa?\n3. Bagaimana saya memakai ' + t + ' dalam kehidupan sehari-hari?\n4. Apa yang akan saya lakukan agar lebih paham?\n5. Siapa yang membantu saya belajar hari ini?';
    if (/remedial|pengayaan|diferensiasi|belum tuntas/.test(l))
      return 'REMEDIAL, PENGAYAAN, DAN DIFERENSIASI: ' + t + '\nREMEDIAL: ulangi konsep inti dengan contoh lebih konkret, pasangkan siswa dengan tutor sebaya, beri 3-5 soal latihan bertahap, lalu asesmen ulang singkat.\nPENGAYAAN: beri studi kasus terbuka, proyek mini, atau peran sebagai tutor sebaya.\nDIFERENSIASI: variasikan konten (teks/gambar/video), proses (individu/kelompok), dan produk (tulisan/poster/presentasi).';
    if (/orang ?tua|wali|surat|pesan/.test(l))
      return 'CONTOH PESAN KE ORANG TUA\nYth. Bapak/Ibu orang tua/wali siswa ' + kelas + ',\nSaat ini kami mempelajari ' + t + '. Mohon dukungan Bapak/Ibu dengan menanyakan hal baru yang dipelajari ananda dan memastikan tugas dikumpulkan tepat waktu melalui GarudaSmart. Bila ada kendala, silakan hubungi kami lewat Chat guru di aplikasi.\nTerima kasih atas kerja sama Bapak/Ibu.';
    return 'Saya asisten lokal berbasis templat (tanpa API). Saya bisa membantu:\n- Kerangka modul ajar/RPP: "buatkan modul ajar tentang pecahan"\n- Tujuan pembelajaran: "tujuan pembelajaran fotosintesis"\n- Rubrik penilaian, kerangka soal, ide pembuka kelas\n- Refleksi, remedial/pengayaan, dan pesan ke orang tua\n\nUntuk materi, LKPD, instrumen, dan game dari teks sumber, gunakan menu Materi & tugas. Untuk jawaban bebas, gunakan tombol Buka ChatGPT.';
  }

  window.AILokal = { buat, chat, evaluasi };
})();
