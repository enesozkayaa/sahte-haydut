// =============================================================
// Sahte Haydut - oyun kuralları (sadece odayı açan "ev"de çalışır)
// Kasabalıları yürütür, görevleri/atışları/kılık değiştirmeyi işler, kazananı bulur.
// Herkes kasabada bir "varlık"tır; varlık numaraları karışıktır, kimin oyuncu olduğu numaradan anlaşılmaz.
// =============================================================

const Motor = (() => {
  const YURU = 1.6, KOS = 4.6;
  const ATES_ARA = 1800, ATES_MENZIL = 45;
  const SES_YAKIN = 5, SES_UZAK = 22;
  const BEKLEME = 15;          // şerifler başta kaç saniye odada kilitli
  const SERIF_TIP = 10;        // şerif kıyafeti (karakter.js'teki 11. tip)
  const DONUS = 2.6;           // kasabalıların dönüş hızı (radyan/sn civarı) — oyuncu gibi yumuşak dönsünler
  let o = null;
  let cb = { kisiye() {}, herkese() {} };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sec = l => l[Math.floor(Math.random() * l.length)];
  const karistir = l => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };

  function rastgeleYer() {
    for (let i = 0; i < 30; i++) {
      const u = sec(Kasaba.ugraklar.filter(a => !a.kat && !a.bina)), x = u.x + rnd(-3, 3), z = u.z + rnd(-3, 3);
      if (!Kasaba.icerde(x, z, 0.6)) return { x, z };
    }
    return { x: rnd(-60, 60), z: rnd(-4, 4) };
  }
  function npcYap(no, yer) {
    const p = yer || rastgeleYer();
    return { no, oyuncuId: null, tip: Math.floor(Math.random() * 10), x: p.x, z: p.z, y: 0, yaw: rnd(-3, 3), h: 0, durum: 0,
      yol: null, bekle: rnd(0, 4), bakis: null, hizK: rnd(0.93, 1.07), kacis: 0, kacisYon: 0, ilerleme: { t: 0, x: p.x, z: p.z }, olumZaman: 0 };
  }

  // ayar: { haydut, hak, sure (dk), hedef (görev), kasabali, kilik }
  function baslat(oyuncular, ayar, geriCagir) {
    cb = geriCagir;
    const n = oyuncular.length;
    // Roller: "secim" modunda herkes bekleme odasında kendi seçti; değilse rastgele dağıt
    const secim = ayar.rolMod !== 'rastgele' && oyuncular.some(p => p.rol === 'haydut') && oyuncular.some(p => p.rol === 'serif');
    const hayN = secim ? oyuncular.filter(p => p.rol === 'haydut').length : Math.max(1, Math.min(n - 1, ayar.haydut | 0));
    const sirali = secim ? [...oyuncular.filter(p => p.rol === 'haydut'), ...oyuncular.filter(p => p.rol !== 'haydut')].map(p => p.id) : karistir(oyuncular.map(p => p.id));
    const toplam = ayar.kasabali + n;
    const nolar = karistir([...Array(toplam).keys()]);
    o = {
      ayar: { ...ayar, haydut: hayN, hedef: Math.min(Kasaba.gorevler.length, ayar.hedef) },
      asama: 'oyun', bitis: Date.now() + ayar.sure * 60000,
      varliklar: new Map(), oyuncular: [], yapilan: new Set(), gorevSayi: 0, bekleyen: [],
      sonrakiNo: toplam, sonSes: 0, yeniKasabali: [],
      serifCikis: Date.now() + BEKLEME * 1000, kapiAcildi: false,
      tamamlanan: [], postaSayi: -1, sonPosta: 0,   // posta kutuları için: [{ gid, t }]
      aktif: new Set(karistir(Kasaba.gorevler.map(g => g.id)).slice(0, Math.min(Kasaba.gorevler.length, ayar.hedef))),   // bu oyunun görevleri
      kilikYerleri: new Set(karistir(Kasaba.kiliklar.map(k => k.id)).slice(0, Kasaba.KILIK_SAYISI)),   // her oyunda farklı; sadece haydutlara söylenir
    };
    Kasaba.odaKapisi(true);
    oyuncular.forEach((p, i) => {
      const no = nolar[i];
      const rol = sirali.indexOf(p.id) < hayN ? 'haydut' : 'serif';
      const v = npcYap(no, rol === 'serif' ? Kasaba.odadaYer() : null); v.oyuncuId = p.id;
      if (rol === 'serif') { v.tip = SERIF_TIP; v.yaw = Math.PI / 2; }   // şerif kıyafeti, kapıya (doğuya) bakar
      o.varliklar.set(no, v);
      o.oyuncular.push({ id: p.id, ad: p.ad, no, rol, durum: 0,
        hak: ayar.hak, kilik: ayar.kilik, muhbir: 1, muhbirAktif: false, kanal: 'genel', sonAtes: 0, is: null });
    });
    for (let i = n; i < toplam; i++) o.varliklar.set(nolar[i], npcYap(nolar[i]));
    const serifNolar = o.oyuncular.filter(p => p.rol === 'serif').map(p => p.no);
    const haydutNolar = o.oyuncular.filter(p => p.rol === 'haydut').map(p => p.no);
    const adlar = rol => o.oyuncular.filter(p => p.rol === rol).map(p => p.ad);
    o.oyuncular.forEach(p => {
      const v = o.varliklar.get(p.no);
      cb.kisiye(p.id, {
        tip: 'basla', benimNo: p.no, rol: p.rol, x: v.x, z: v.z, tipNo: v.tip,
        takim: p.rol === 'haydut' ? haydutNolar : serifNolar, serifler: serifNolar,
        takimAdlar: adlar(p.rol), serifAdlar: adlar('serif'),
        ayar: o.ayar, haydutSayisi: hayN, serifSayisi: n - hayN, sure: ayar.sure * 60, bekleme: BEKLEME, gorevler: [...o.aktif], kiliklar: p.rol === 'haydut' ? [...o.kilikYerleri] : [],
      });
    });
    serifYay();
  }
  // Şeriflerin adı ve kalan hakkı herkese (üst ortadaki panel)
  function serifYay() {
    cb.herkese({ tip: 'serifler', liste: o.oyuncular.filter(p => p.rol === 'serif').map(p => ({ ad: p.ad, hak: Math.max(0, p.hak), durum: p.durum })) });
  }

  const oyuncu = id => o?.oyuncular.find(p => p.id === id);
  const canlimi = p => p && p.durum === 0;

  // ---------- Oyunculardan gelenler ----------
  function girdi(id, m) {
    if (!o || o.asama !== 'oyun') return;
    const p = oyuncu(id); if (!p) return;
    const v = o.varliklar.get(p.no);
    switch (m.tip) {
      case 'konum':
        if (!canlimi(p) || !v) return;
        v.x = +m.x || 0; v.z = +m.z || 0; v.y = Math.max(0, Math.min(Kasaba.KAT_Y, +m.y || 0)); v.yaw = +m.yaw || 0; v.h = Math.max(0, Math.min(10 + Kasaba.ANIMLER.length - 1, m.h | 0));
        v.nisan = p.rol === 'serif' && typeof m.n === 'number' ? Math.max(-1.3, Math.min(1.2, m.n)) : null;   // şerifin lazerli nişanı (bakış açısı)
        if (p.is && Math.hypot(v.x - p.is.x, v.z - p.is.z) > (p.is.r || 0.9)) isIptal(p);
        break;
      case 'gorev': {
        if (!canlimi(p) || p.rol !== 'haydut' || p.is) return;
        const g = Kasaba.gorevler.find(x => x.id === m.gid);
        if (!g || !o.aktif.has(g.id) || Math.hypot(v.x - g.x, v.z - g.z) > 2.8 || Math.abs((v.y || 0) - g.y) > 1.5) return;
        if (o.yapilan.has(g.id)) { cb.kisiye(id, { tip: 'is', iptal: true, yapilmis: g.id }); return; }
        p.is = { tur: 'gorev', gid: g.id, bitis: Date.now() + g.sure * 1000, x: g.x, z: g.z, r: 3.2 };   // oyuncu görev yerine yerleşir (yürürse iptal)
        cb.kisiye(id, { tip: 'is', ad: g.ad, sure: g.sure });
        break;
      }
      case 'kilik': {
        if (!canlimi(p) || p.rol !== 'haydut' || p.is || p.kilik <= 0) return;
        const k = o.kilikYerleri.has(m.kid) && Kasaba.kiliklar.find(x => x.id === m.kid);
        if (!k || Math.hypot(v.x - k.x, v.z - k.z) > 2.8) return;
        p.is = { tur: 'kilik', kid: k.id, bitis: Date.now() + 3000, x: k.x, z: k.z, r: 3.2 };
        cb.kisiye(id, { tip: 'is', ad: 'Kılık değiştiriliyor', sure: 3 });
        break;
      }
      case 'iptal': if (p.is) isIptal(p); break;
      case 'posta': {   // şerif posta kutusuna baktı: en az 10 sn önce yapılmış görevleri öğrenir
        if (!canlimi(p) || p.rol !== 'serif' || !v) return;
        if (!Kasaba.postaKutulari.some(k => Math.hypot(k.x - v.x, k.z - v.z) < 3)) return;
        cb.kisiye(id, { tip: 'postaListe', ids: postaBilgisi() });
        break;
      }
      case 'ates': ates(p, v, m.hedef); break;
      case 'muhbir':
        if (!canlimi(p) || p.rol !== 'serif' || p.muhbir <= 0) return;
        p.muhbir = 0; p.muhbirAktif = true;
        cb.kisiye(id, { tip: 'muhbir', aktif: true });
        break;
      case 'kanal': p.kanal = m.takim ? 'takim' : 'genel'; break;
    }
  }
  function isIptal(p) { p.is = null; cb.kisiye(p.id, { tip: 'is', iptal: true }); }

  function bilgi(metin, tur = 'bilgi') { cb.herkese({ tip: 'bilgi', metin, tur }); }

  function ates(p, v, hedefNo) {
    if (!canlimi(p) || p.rol !== 'serif' || !v) return;
    const simdi = Date.now();
    if (simdi - p.sonAtes < ATES_ARA || simdi < o.serifCikis) return;   // odadayken ateş yok
    p.sonAtes = simdi;
    const h = o.varliklar.get(hedefNo);
    const gecerli = h && h.durum === 0 && Math.hypot(h.x - v.x, h.z - v.z) < ATES_MENZIL;
    const hp = gecerli && h.oyuncuId ? oyuncu(h.oyuncuId) : null;
    const vurdu = gecerli && !(hp && hp.rol === 'serif');
    cb.herkese({ tip: 'ates', no: p.no, hedef: vurdu ? hedefNo : -1 });
    // Yakındaki kasabalılar korkup kaçışır
    o.varliklar.forEach(n => {
      if (n.oyuncuId || n.durum) return;
      const dx = n.x - v.x, dz = n.z - v.z, d = Math.hypot(dx, dz);
      if (d < 14 && n !== h) { n.kacis = rnd(2.5, 4); n.kacisYon = Math.atan2(dx, dz) + rnd(-0.6, 0.6); n.yol = null; n.bekle = 0; }
    });
    if (!vurdu) return;
    h.durum = 1; h.olumZaman = simdi; h.h = 0;
    if (hp) {   // haydut vuruldu
      hp.durum = 1; hp.is = null;
      bilgi(`🎯 ${p.ad} bir haydudu vurdu: ${hp.ad}`, 'iyi');
      cb.kisiye(hp.id, { tip: 'elendin', neden: 'vuruldu', kim: p.ad });
    } else {    // masum kasabalı
      p.hak--;
      if (p.hak > 0) {
        bilgi(`❌ ${p.ad} masum bir kasabalıyı vurdu (${p.hak} hakkı kaldı)`, 'kotu');
        cb.kisiye(p.id, { tip: 'hak', hak: p.hak });
        serifYay();
      } else {
        p.durum = 2; p.is = null;
        o.varliklar.get(p.no).durum = 2;
        bilgi(`⛓️ ${p.ad} masum birini vurdu ve hapse girdi!`, 'kotu');
        serifYay();
        cb.kisiye(p.id, { tip: 'elendin', neden: 'hapis' });
      }
    }
    kontrol();
  }

  // ---------- Kasabalılar ----------
  function npcAdim(v, dt) {
    if (v.durum) return;
    if (v.kacis > 0) {
      v.kacis -= dt; v.h = 2;
      const nx = v.x + Math.sin(v.kacisYon) * KOS * dt, nz = v.z + Math.cos(v.kacisYon) * KOS * dt;
      const p = Kasaba.it(nx, nz, 0.35, Kasaba.katOf(v.y));
      if (Math.hypot(p.x - nx, p.z - nz) > 0.05) v.kacisYon += rnd(0.8, 1.6);   // duvara çarptı, yön değiştir
      v.x = p.x; v.z = p.z; v.y = Kasaba.zeminY(v.x, v.z, v.y); v.yaw = donus(v.yaw, v.kacisYon, dt * 5, dt * 4);
      if (v.kacis <= 0) { v.bekle = rnd(0.5, 2); v.h = 0; v.calisiyor = false; }
      return;
    }
    if (v.bekle > 0) {
      v.bekle -= dt; v.h = v.calisiyor ? Kasaba.animKodu(v.calismaAnim) : 0;   // görev yerinde o göreve özel hareketi yapar
      if (v.bakis !== null) v.yaw = donus(v.yaw, v.bakis, dt * 2.2, dt * 2);
      return;
    }
    if (!v.yol || !v.yol.length) {
      const r = Math.random();
      const aktifYerler = Kasaba.ugraklar.filter(a => a.gid && o.aktif.has(a.gid));
      const digerGorev = Kasaba.ugraklar.filter(a => a.gorev && !(a.gid && o.aktif.has(a.gid)));
      // %65 bu oyunun görevleri, %15 diğer görev/kılık yerleri, %20 gezinme (cadde, evler, bina içleri)
      // Görev seçerken çoğunlukla yakındakilere gider (uzun yürüyüş yerine daha çok görev yapsın)
      const yakindan = l => { const sirali = l.map(a => [a, (a.x - v.x) ** 2 + (a.z - v.z) ** 2]).sort((p, q) => p[1] - q[1]); return Math.random() < 0.85 ? sec(sirali.slice(0, 3))[0] : sec(l); };
      // %88 bir görev yerine (bu oyunun görevleri iki kat sık seçilir), %12 gezinme
      const u = r < 0.88 ? yakindan([...aktifYerler, ...aktifYerler, ...digerGorev]) : sec(Kasaba.ugraklar.filter(a => !a.gorev));
      v.hedef = u;
      const oyna = u.gorev ? 0.05 : u.bina ? 0.3 : 0.8;   // görev yerine tam otursun/dursun (sandalye, örs…)
      v.yol = Kasaba.yol(v.x, v.z, u.x + rnd(-oyna, oyna), u.z + rnd(-oyna, oyna), v.y, u.kat, u.bina);
      v.ilerleme = { t: 0, x: v.x, z: v.z };
      return;
    }
    const n = v.yol[0], dx = n.x - v.x, dz = n.z - v.z, d = Math.hypot(dx, dz);
    const sonNokta = v.yol.length === 1;
    // Köşeleri keskin dönmesin: ara noktaya yaklaşınca bir sonrakine yönelir (köşeyi yuvarlar)
    if (d < (sonNokta || n.tam ? 0.3 : 1.4)) {
      v.yol.shift();
      if (!v.yol.length) { const b = v.hedef?.bekle || [1, 4]; v.bekle = rnd(b[0], b[1]); v.bakis = v.hedef?.yon ?? null; v.calisiyor = !!v.hedef?.gorev && Math.random() < 0.95; v.calismaAnim = v.hedef?.anim || 'calis'; }
      return;
    }
    // Ara sıra caddede durup etrafa bakar
    const merdivende = v.y > 0.1 && v.y < Kasaba.KAT_Y - 0.1;
    if (!merdivende && !n.tam && Math.random() < dt * 0.025) { v.bekle = rnd(1, 3); v.bakis = v.yaw + rnd(-1.5, 1.5); v.calisiyor = false; return; }
    // Yön yavaş yavaş döner (oyuncunun karakteri gibi); çok ters yöndeyse yavaşlayıp döner
    const hedefYon = Math.atan2(dx, dz);
    v.yaw = donus(v.yaw, hedefYon, dt * DONUS * 1.6, dt * DONUS);
    const fark = Math.abs(acıFark(v.yaw, hedefYon));
    const yavas = fark > 1.4 ? 0.25 : fark > 0.7 ? 0.6 : 1;
    const adim = Math.min(d, YURU * v.hizK * yavas * dt);
    // Varış noktasına çok yakınken doğrudan git (etrafında dönüp durmasın)
    const dogrudan = (sonNokta && d < 1.2) || (n.tam && fark < 0.9);   // merdivende dar yolda doğrudan yürü
    const gx = dogrudan ? dx / d : Math.sin(v.yaw), gz = dogrudan ? dz / d : Math.cos(v.yaw);
    const p = Kasaba.it(v.x + gx * adim, v.z + gz * adim, 0.35, Kasaba.katOf(v.y));
    v.x = p.x; v.z = p.z; v.y = Kasaba.zeminY(v.x, v.z, v.y); v.h = 1;
    // Takıldıysa yeni yol
    v.ilerleme.t += dt;
    if (v.ilerleme.t > 4) {
      if (Math.hypot(v.x - v.ilerleme.x, v.z - v.ilerleme.z) < 1.5) v.yol = null;
      v.ilerleme = { t: 0, x: v.x, z: v.z };
    }
  }
  function acıFark(a, b) { return ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
  // k: yumuşaklık, enFazla: bir adımda en çok ne kadar dönebilir (radyan)
  function donus(a, b, k, enFazla = Infinity) { const f = acıFark(a, b) * Math.min(1, k); return a + Math.max(-enFazla, Math.min(enFazla, f)); }

  // ---------- Her 100 ms ----------
  function adim(dt) {
    if (!o || o.asama !== 'oyun') return;
    const simdi = Date.now();
    if (!o.kapiAcildi && simdi >= o.serifCikis) {   // şerif odasının kapısı açılır
      o.kapiAcildi = true; Kasaba.odaKapisi(false);
      cb.herkese({ tip: 'kapi', acik: true });
    }
    o.varliklar.forEach(v => { if (!v.oyuncuId) npcAdim(v, dt); });
    // İşler (görev / kılık) bitti mi?
    o.oyuncular.forEach(p => {
      if (!p.is || simdi < p.is.bitis) return;
      const is = p.is; p.is = null;
      if (is.tur === 'gorev') gorevBitti(p, is.gid, simdi);
      else kilikBitti(p, is.kid, simdi);
    });
    // Gecikmeli bildirimler
    o.bekleyen = o.bekleyen.filter(b => {
      if (simdi < b.zaman) return true;
      if (oyuncu(b.id)) cb.kisiye(b.id, { ...b.mesaj, gecen: (simdi - b.mesaj.olayZamani) / 1000 });
      return false;
    });
    // Ölüleri kaldır, yerine yeni kasabalı getir
    o.varliklar.forEach((v, no) => {
      if (v.durum === 1 && simdi - v.olumZaman > 12000) { o.varliklar.delete(no); if (!v.oyuncuId) o.yeniKasabali.push(simdi + 15000); }
      else if (v.durum === 2) o.varliklar.delete(no);
    });
    o.yeniKasabali = o.yeniKasabali.filter(t => {
      if (simdi < t) return true;
      const no = o.sonrakiNo++;
      o.varliklar.set(no, npcYap(no, kenardanYer()));
      return false;
    });
    // Konum paketi
    const v = [];
    o.varliklar.forEach(x => v.push(x.no, Math.round(x.x * 10), Math.round(x.z * 10), Math.round(x.yaw * 100), x.h, x.tip, x.durum, Math.round((x.y || 0) * 10), x.nisan == null || x.durum ? 0 : Math.round((x.nisan + 3) * 100)));
    cb.herkese({ tip: 'd', k: Math.max(0, Math.round((o.bitis - simdi) / 1000)), v });
    if (simdi - o.sonSes > 300) { o.sonSes = simdi; sesTablosu(); }
    // Posta kutularındaki sayı: 10 sn önceye kadar yapılmış görevler
    if (simdi - o.sonPosta > 1000) {
      o.sonPosta = simdi;
      const n = postaBilgisi().length;
      if (n !== o.postaSayi) { o.postaSayi = n; cb.herkese({ tip: 'posta', n }); }
    }
    kontrol();
  }
  function kenardanYer() {
    const yerler = Kasaba.ugraklar.filter(u => Math.abs(u.x) > 60 || Math.abs(u.z) > 50);
    const u = sec(yerler.length ? yerler : Kasaba.ugraklar);
    return { x: u.x, z: u.z };
  }

  function gorevBitti(p, gid, simdi) {
    if (o.yapilan.has(gid)) { cb.kisiye(p.id, { tip: 'is', iptal: true }); return; }
    const g = Kasaba.gorevler.find(x => x.id === gid);
    o.yapilan.add(gid); o.gorevSayi++; o.tamamlanan.push({ gid, t: simdi });
    cb.kisiye(p.id, { tip: 'is', bitti: true });
    const metin = `${g.emoji} ${g.olay}`;
    o.oyuncular.forEach(q => {
      if (q.rol === 'haydut') cb.kisiye(q.id, { tip: 'bildirim', metin: `✅ ${g.olay}`, gid, sayi: o.gorevSayi, gecen: 0, olayZamani: simdi, kim: p.ad });
      else if (q.muhbirAktif) {   // muhbir: bu görevi şerife hemen fısıldar (adı ve yeri)
        q.muhbirAktif = false; cb.kisiye(q.id, { tip: 'muhbir', aktif: false });
        o.bekleyen.push({ zaman: simdi + 1500, id: q.id, mesaj: { tip: 'bildirim', metin: `📡 Muhbir: ${metin}`, gid, olayZamani: simdi, muhbir: true } });
      }
    });
  }
  function kilikBitti(p, kid, simdi) {
    const v = o.varliklar.get(p.no); if (!v) return;
    let yeni; do { yeni = Math.floor(Math.random() * 10); } while (yeni === v.tip);
    v.tip = yeni; p.kilik--;
    cb.kisiye(p.id, { tip: 'is', bitti: true, kilik: p.kilik, tipNo: yeni });
    const k = Kasaba.kiliklar.find(x => x.id === kid);
    o.oyuncular.forEach(q => {
      if (q.rol !== 'serif') return;
      o.bekleyen.push({ zaman: simdi + rnd(10000, 14000), id: q.id, mesaj: { tip: 'bildirim', metin: '👔 Kasabada biri kılık değiştirdi', gid: 'kilik', olayZamani: simdi } });
    });
  }

  const POSTA_GECIKME = 10000;
  function postaBilgisi() { const sinir = Date.now() - POSTA_GECIKME; return o.tamamlanan.filter(k => k.t <= sinir).map(k => k.gid); }

  // Kim kimi ne kadar duyar? (0..1)
  function sesTablosu() {
    const bitti = o.asama !== 'oyun';
    o.oyuncular.forEach(L => {
      const tablo = {}, lv = o.varliklar.get(L.no);
      o.oyuncular.forEach(S => {
        if (S === L) return;
        let s;
        if (bitti) s = 1;
        else if (S.durum !== 0) s = L.durum !== 0 ? 1 : 0;        // ölüler sadece ölüleri duyar
        else if (L.durum !== 0) s = 1;                             // ölü herkesi duyar
        else if (S.rol === L.rol) s = 1;                           // takım arkadaşı her zaman
        else if (S.kanal === 'takim') s = 0;                       // telsizdeyken diğer takım duymaz
        else {
          const sv = o.varliklar.get(S.no);
          const d = sv && lv ? Math.hypot(sv.x - lv.x, sv.z - lv.z) : 99;
          s = Math.max(0, Math.min(1, 1 - (d - SES_YAKIN) / (SES_UZAK - SES_YAKIN)));
        }
        tablo[S.id] = Math.round(s * 100) / 100;
      });
      cb.kisiye(L.id, { tip: 'sesler', v: tablo });
    });
  }

  function kontrol() {
    if (!o || o.asama !== 'oyun') return;
    const canliHaydut = o.oyuncular.filter(p => p.rol === 'haydut' && p.durum === 0).length;
    const canliSerif = o.oyuncular.filter(p => p.rol === 'serif' && p.durum === 0).length;
    if (canliHaydut === 0) return bitir('serif', 'Bütün haydutlar yakalandı!');
    if (o.gorevSayi >= o.ayar.hedef) return bitir('haydut', `Haydutlar ${o.ayar.hedef} görevi tamamladı!`);
    if (canliSerif === 0) return bitir('haydut', 'Bütün şerifler hapse girdi!');
    if (Date.now() >= o.bitis) return bitir('haydut', 'Süre doldu, haydutlar kasabadan kaçtı!');
  }
  function bitir(kazanan, neden) {
    o.asama = 'bitti';
    cb.herkese({ tip: 'bitti', kazanan, neden, gorev: o.gorevSayi, roller: o.oyuncular.map(p => ({ ad: p.ad, rol: p.rol, durum: p.durum, no: p.no })) });
    sesTablosu();
  }

  // Oyuncu ayrıldı: karakteri kasabalı olur, kendisi elenmiş sayılır
  function koptu(id) {
    const p = oyuncu(id); if (!p || !o) return;
    const v = o.varliklar.get(p.no);
    if (v && v.durum === 0) { v.oyuncuId = null; v.yol = null; v.bekle = 1; if (v.tip === SERIF_TIP) v.tip = Math.floor(Math.random() * 10); }
    if (o.asama === 'oyun') { p.durum = 4; p.is = null; bilgi(`🚪 ${p.ad} oyundan ayrıldı`); if (p.rol === 'serif') serifYay(); kontrol(); }
  }

  return { baslat, girdi, adim, koptu, get aktif() { return !!o && o.asama === 'oyun'; }, durdur() { o = null; } };
})();
if (typeof module !== 'undefined') module.exports = Motor;
