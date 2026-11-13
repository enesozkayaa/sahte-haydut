// =============================================================
// Sahte Haydut - oyuncunun ekranı: giriş/lobi, kamera, yürüme, ateş, görev, harita, bildirim, ses
// =============================================================

(() => {
  const $ = id => document.getElementById(id);
  const dokun = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (dokun) document.body.classList.add('dokun');
  const YURU = 1.6, KOS = 4.6, HAYALET = 7;
  const SERIF_RENK = '#ffc61a', TAKIM_RENK = '#33ff55';

  let sahneKurulu = false;
  let elSilah = null, tepme = 0;   // birinci şahısta görünen tabanca ve ateş sarsıntısı
  let oyun = null;                 // oyun sırasındaki her şey
  let motorSayac = null;
  let sonAyar = null;
  const varliklar = new Map();     // no → { g, tip, x, z, yaw, tx, tz, tyaw, h, durum }
  const tuslar = new Set();
  const isaretler = [];            // haydut görev işaretleri (3D)

  // ---------- Ekranlar ----------
  function ekran(ad) {
    ['giris', 'lobi', 'sonuc'].forEach(e => $(e).classList.toggle('gizli', e !== ad));
    $('hud').classList.toggle('gizli', ad !== 'hud');
    if (ad !== 'hud' && document.pointerLockElement) document.exitPointerLock();
  }
  try { $('adim').value = localStorage.getItem('ar.ad') || ''; } catch (e) { }
  const adAl = () => {
    const ad = $('adim').value.trim().slice(0, 14);
    if (!ad) { $('girisDurum').textContent = 'Önce adını yaz.'; $('adim').focus(); return null; }
    try { localStorage.setItem('ar.ad', ad); } catch (e) { }
    return ad;
  };
  document.addEventListener('pointerdown', () => Ses.baslat(), { once: false, passive: true });

  $('odaKurBtn').onclick = () => { const ad = adAl(); if (!ad) return; $('girisDurum').textContent = 'Oda açılıyor…'; Ag.odaAc(ad); };
  $('katilBtn').onclick = () => {
    const ad = adAl(); if (!ad) return;
    const kod = $('odaKoduGir').value.trim().toUpperCase();
    if (kod.length !== 5) { $('girisDurum').textContent = 'Oda kodu 5 harf olmalı.'; return; }
    $('girisDurum').textContent = 'Bağlanılıyor…'; Ag.katil(kod, ad);
  };
  $('odaKoduGir').addEventListener('keydown', e => { if (e.key === 'Enter') $('katilBtn').click(); });
  // Adres sonunda ?oda=KOD varsa kutuya yaz
  { const k = new URLSearchParams(location.search).get('oda'); if (k) $('odaKoduGir').value = k.toUpperCase(); }

  Ag.on('hata', m => { $('girisDurum').textContent = m; ekran('giris'); });
  Ag.on('evKoptu', () => { oyunuTemizle(); ekran('giris'); $('girisDurum').textContent = 'Oda sahibiyle bağlantı koptu.'; });
  Ag.on('oda', ({ kod, ev }) => {
    $('lobiKod').textContent = kod;
    ekran('lobi');
    $('ayarlar').classList.toggle('gizli', !ev);
    $('baslaBtn').classList.toggle('gizli', !ev);
    $('lobiDurum').textContent = ev ? 'Arkadaşların kodla katılsın. En az 2 kişi gerekli.' : 'Oda sahibi oyunu başlatacak…';
  });
  Ag.kabulKurali(n => n >= 10 ? 'Oda dolu (en fazla 10 kişi).' : (Motor.aktif ? 'Oyun sürüyor. Bitince tekrar dene.' : true));
  Ag.on('oyuncular', liste => {
    $('lobiListe').innerHTML = liste.map((o, i) => `<li><span>${i === 0 ? '👑 ' : '🤠 '}${kacis(o.ad)}${o.id === Ag.benimId ? ' (sen)' : ''}</span><span>${o.ses ? '🎤' : ''}</span></li>`).join('');
    if (Ag.evMi) {
      const n = liste.length, sel = $('ayHaydut'), eski = +sel.value || Math.max(1, Math.round(n / 3));
      sel.innerHTML = Array.from({ length: Math.max(1, n - 1) }, (_, i) => `<option>${i + 1}</option>`).join('');
      sel.value = String(Math.min(Math.max(1, n - 1), eski));
      $('baslaBtn').disabled = n < 2;
      ayarYay();
    }
  });
  Ag.on('katildi', () => ayarYay());
  ['ayHaydut', 'ayHak', 'aySure', 'ayHedef', 'ayKasabali', 'ayKilik'].forEach(id => $(id).addEventListener('change', ayarYay));
  function ayarOku() {
    return { haydut: +$('ayHaydut').value || 1, hak: +$('ayHak').value, sure: +$('aySure').value, hedef: +$('ayHedef').value, kasabali: +$('ayKasabali').value, kilik: +$('ayKilik').value };
  }
  const ayarYazi = a => `🦹 ${a.haydut} haydut · 🤠 ${Math.max(1, Ag.oyuncular.length - a.haydut)} şerif · 🔫 ${a.hak} hak · ⏱️ ${a.sure} dk · 🎯 ${a.hedef} görev · 👥 ${a.kasabali} kasabalı · 👔 ${a.kilik} kılık`;
  function ayarYay() { if (!Ag.evMi) return; const a = ayarOku(); $('ayarOzet').textContent = ayarYazi(a); Ag.yayinla({ tip: 'ayar', ayar: a }); }

  $('kodKopyalaBtn').onclick = () => {
    const url = `${location.origin}${location.pathname}?oda=${Ag.kod}`;
    navigator.clipboard?.writeText(url).then(() => { $('lobiDurum').textContent = 'Davet linki kopyalandı!'; }).catch(() => { $('lobiDurum').textContent = url; });
  };
  $('lobiCikBtn').onclick = () => { Ag.kapat(); oyunuTemizle(); ekran('giris'); $('girisDurum').textContent = ''; };
  $('lobiMikBtn').onclick = mikDegistir;
  async function mikDegistir() {
    if (Ag.sesAcik) Ag.sesKapat(); else if (!(await Ag.sesAc())) { toast('Mikrofona izin verilmedi'); }
    mikDugmeleri();
  }
  function mikDugmeleri() {
    $('lobiMikBtn').textContent = Ag.sesAcik ? '🎤 Mikrofon açık' : '🎤 Mikrofon kapalı';
    $('mikBtn').classList.toggle('acik', Ag.sesAcik); $('mikBtn').classList.toggle('kapali', !Ag.sesAcik);
  }

  // ---------- Oyunu başlat (ev) ----------
  $('baslaBtn').onclick = () => {
    if (!Ag.evMi || Ag.oyuncular.length < 2) return;
    sonAyar = ayarOku();
    motoruBaslat();
  };
  function motoruBaslat() {
    clearInterval(motorSayac);
    Motor.baslat(Ag.oyuncular.map(o => ({ id: o.id, ad: o.ad })), sonAyar, {
      kisiye: (id, m) => (id === Ag.benimId ? mesaj(m) : Ag.gonderId(id, m)),
      herkese: m => Ag.yayinla(m),
    });
    let son = performance.now();
    motorSayac = setInterval(() => { const t = performance.now(); Motor.adim(Math.min(0.3, (t - son) / 1000)); son = t; }, 100);
  }
  Ag.on('evMesaj', (m, id) => {
    if (m.tip === 'lobiyeDon') return;
    Motor.girdi(id, m);
  });
  Ag.on('koptu', o => Motor.koptu(o.id));
  $('tekrarBtn').onclick = () => { if (Ag.evMi && Ag.oyuncular.length >= 2) motoruBaslat(); };
  $('lobiyeBtn').onclick = () => {
    if (Ag.evMi) { clearInterval(motorSayac); Motor.durdur(); Ag.yayinla({ tip: 'lobi' }); }
    else { oyunuTemizle(); ekran('lobi'); }
  };

  // ---------- Evden gelen mesajlar ----------
  Ag.on('mesaj', mesaj);
  function mesaj(m) {
    switch (m.tip) {
      case 'ayar': if (!Ag.evMi) $('ayarOzet').textContent = ayarYazi(m.ayar); break;
      case 'basla': oyunBaslat(m); break;
      case 'd': if (oyun) konumlar(m); break;
      case 'is': if (oyun) isDurumu(m); break;
      case 'bildirim': if (oyun) bildirim(m); break;
      case 'bilgi': if (oyun) { akisEkle(m.metin, m.tur); if (m.tur === 'iyi') Ses.iyi(); else if (m.tur === 'kotu') Ses.kotu(); } break;
      case 'ates': if (oyun) atesGoster(m); break;
      case 'hak': if (oyun) { oyun.hak = m.hak; hudGuncelle(); } break;
      case 'muhbir': if (oyun) { oyun.muhbirAktif = m.aktif; if (m.aktif) oyun.muhbir = 0; hudGuncelle(); } break;
      case 'elendin': if (oyun) elendin(m); break;
      case 'sesler': Object.entries(m.v).forEach(([id, v]) => Ag.seviyeAyarla(id, v)); break;
      case 'bitti': if (oyun) bitti(m); break;
      case 'kapi': if (oyun) kapiAcildi(); break;
      case 'serifler': serifPaneli(m.liste); break;
      case 'lobi': oyunuTemizle(); ekran('lobi'); break;
    }
  }

  // ---------- Oyun kurulumu ----------
  function oyunBaslat(m) {
    if (!sahneKurulu) {
      Sahne.kur($('sahne')); sahneKurulu = true; haritaZemin = Sahne.haritaZemini(1800);
      elSilah = Karakter.elTabancasi(); Sahne.kamera.add(elSilah); Sahne.scene.add(Sahne.kamera);
      requestAnimationFrame(dongu);
    }
    oyunuTemizle();
    oyun = {
      benimNo: m.benimNo, rol: m.rol, takim: new Set(m.takim), serifler: new Set(m.serifler), ayar: m.ayar,
      takimAdlar: m.takimAdlar, serifAdlar: m.serifAdlar,
      x: m.x, z: m.z, yaw: m.rol === 'serif' ? Math.PI / 2 : Math.random() * 6.28, pitch: -0.05, govdeYaw: m.rol === 'serif' ? Math.PI / 2 : 0, tip: m.tipNo,
      kapiAcilis: performance.now() + (m.bekleme || 0) * 1000, kapiAcik: !m.bekleme,
      canli: true, kamera: 'arka', kos: false, is: null, telsiz: false,
      hak: m.ayar.hak, kilik: m.ayar.kilik, muhbir: 1, muhbirAktif: false,
      gorevSayi: 0, yapilan: new Set(), kalan: m.sure, sonGonder: 0, sonAtes: 0, darbe: [],
    };
    $('akis').innerHTML = '';
    $('elendiYazi').classList.add('gizli');
    $('ilerleme').classList.add('gizli');
    $('harita').classList.remove('buyuk');
    Kasaba.odaKapisi(!oyun.kapiAcik); Sahne.serifKapisi(oyun.kapiAcik, true);
    isaretleriKur();
    ekran('hud');
    hudGuncelle();
    const takim = m.takimAdlar.filter(a => a !== benimAdim());
    if (m.rol === 'haydut') {
      toast(`🦹 HAYDUTSUN!<br><small>${takim.length ? 'Takımın: ' + takim.map(kacis).join(', ') : 'Tek haydut sensin'}</small>`, 4500);
      akisEkle(`🦹 Haydutsun. Sarı işaretli görevleri yap, kalabalığa karış. Hedef: ${m.ayar.hedef} görev.`, 'takim');
    } else {
      toast(`⭐ ŞERİFSİN!<br><small>${m.haydutSayisi} haydut kalabalığın içinde saklanıyor</small>`, 4500);
      akisEkle(`⭐ Şerifsin. Görev bildirimleri en az 10 sn gecikmeli gelir. ${m.ayar.hak} atış hakkın var.`, 'iyi');
    }
    Ses.bildirim();
  }
  const benimAdim = () => Ag.oyuncular.find(o => o.id === Ag.benimId)?.ad;
  // Üst ortada: her şerifin adı ve kalan atış hakkı (herkes görür)
  function serifPaneli(liste) {
    $('serifPanel').innerHTML = liste.map(s => {
      const durum = s.durum === 2 ? '<em>⛓️ hapiste</em>' : s.durum === 4 ? '<em>🚪 ayrıldı</em>' : '<i class="mermi"></i>'.repeat(s.hak) || '<em>hak yok</em>';
      return `<span class="${s.durum ? 'dusmus' : ''}">⭐ ${kacis(s.ad)} <b>${durum}</b></span>`;
    }).join('');
  }
  function kapiAcildi() {
    if (oyun.kapiAcik) return;
    oyun.kapiAcik = true; Kasaba.odaKapisi(false); Sahne.serifKapisi(true);
    $('bekleYazi').classList.add('gizli');
    toast(oyun.rol === 'serif' ? '🚪 Kapı açıldı! Haydutları bul!' : '🚪 Şerifler kasabaya çıktı!', 2500);
    akisEkle('🚪 Şerifler odadan çıktı', 'kotu');
    Ses.hapis();
  }
  // Kapı açılana kadar üstte geri sayım
  function bekleGuncelle(t) {
    if (oyun.kapiAcik) return;
    const kalan = Math.max(0, Math.ceil((oyun.kapiAcilis - t) / 1000));
    const y = $('bekleYazi'); y.classList.remove('gizli');
    y.textContent = oyun.rol === 'serif' ? `🔒 Odadasın · kapı ${kalan} sn sonra açılacak` : `🔒 Şerifler ${kalan} sn sonra çıkacak · kalabalığa karış!`;
  }
  function oyunuTemizle() {
    varliklar.forEach(v => Sahne.scene?.remove(v.g)); varliklar.clear();
    isaretler.forEach(s => Sahne.scene?.remove(s)); isaretler.length = 0;
    $('serifPanel').innerHTML = ''; $('bekleYazi').classList.add('gizli');
    oyun = null;
    if (Ag.seviyeleriSifirla) Ag.seviyeleriSifirla();
  }

  // Haydutlara görev ve kılık işaretleri (duvar arkasından da görünür)
  function emojiSprite(emoji, renk) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = renk; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.font = '64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 64, 70);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.renderOrder = 20; s.scale.set(1.3, 1.3, 1);
    return s;
  }
  function isaretleriKur() {
    if (oyun.rol !== 'haydut') return;
    Kasaba.gorevler.forEach(g => { const s = emojiSprite(g.emoji, '#e8a81acc'); s.position.set(g.x, 2.9, g.z); s.userData.gid = g.id; Sahne.scene.add(s); isaretler.push(s); });
    Kasaba.kiliklar.forEach(k => { const s = emojiSprite('👔', '#8a5ad0cc'); s.position.set(k.x, 2.9, k.z); s.userData.kilik = true; Sahne.scene.add(s); isaretler.push(s); });
  }

  // ---------- Konumlar ----------
  function konumlar(m) {
    oyun.kalan = m.k;
    const gorulen = new Set();
    for (let i = 0; i < m.v.length; i += 7) {
      const no = m.v[i], x = m.v[i + 1] / 10, z = m.v[i + 2] / 10, yaw = m.v[i + 3] / 100, h = m.v[i + 4], tip = m.v[i + 5], durum = m.v[i + 6];
      gorulen.add(no);
      let v = varliklar.get(no);
      if (!v || v.tip !== tip) {
        if (v) Sahne.scene.remove(v.g);
        const g = Karakter.yap(tip, oyun.serifler.has(no));
        if (no !== oyun.benimNo) {
          if (oyun.serifler.has(no)) Karakter.cizgiEkle(g, SERIF_RENK);
          else if (oyun.rol === 'haydut' && oyun.takim.has(no)) Karakter.cizgiEkle(g, TAKIM_RENK);
        }
        Sahne.scene.add(g);
        v = { g, tip, x: v?.x ?? x, z: v?.z ?? z, yaw: v?.yaw ?? yaw, tx: x, tz: z, tyaw: yaw, h, durum };
        varliklar.set(no, v);
      }
      v.tx = x; v.tz = z; v.tyaw = yaw; v.h = h;
      if (durum === 1 && v.durum !== 1) { v.g.userData.olum = 0.01; Karakter.cizgiKaldir(v.g); }
      v.durum = durum;
      if (no === oyun.benimNo) oyun.tip = tip;
    }
    varliklar.forEach((v, no) => { if (!gorulen.has(no)) { Sahne.scene.remove(v.g); varliklar.delete(no); } });
  }

  // ---------- Girdi: klavye / fare ----------
  addEventListener('keydown', e => {
    if (!oyun || e.target.tagName === 'INPUT') return;
    tuslar.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyE') eylem();
    if (e.code === 'KeyV') kameraDegistir();
    if (e.code === 'KeyT') telsizDegistir();
    if (e.code === 'KeyM') $('harita').classList.toggle('buyuk');
    if (e.code === 'KeyF' && oyun.rol === 'serif') ates();
    if (e.code === 'KeyK') mikDegistir();
    // Alt: fareyi serbest bırak (mikrofon vb. tuşlara tıklamak için). ESC de aynı işi yapar.
    if (e.code === 'AltLeft' || e.code === 'AltRight') { e.preventDefault(); if (document.pointerLockElement) document.exitPointerLock(); }
  });
  // Fare kilidi açılınca/kapanınca alttaki yazı değişsin
  document.addEventListener('pointerlockchange', () => {
    const kilitli = document.pointerLockElement === kanvas;
    $('ipucu').textContent = kilitli
      ? 'Fareyi serbest bırak: ESC veya Alt · WASD yürü · Shift koş · E görev · V kamera · T telsiz · K mikrofon · M harita'
      : '🖱️ Fare serbest: tuşlara tıklayabilirsin. Oyuna dönmek için ekrana tıkla.';
    $('ipucu').classList.toggle('serbest', !kilitli && !!oyun);
  });
  addEventListener('keyup', e => tuslar.delete(e.code));
  addEventListener('blur', () => tuslar.clear());
  const kanvas = $('sahne');
  kanvas.addEventListener('click', () => { if (oyun && !dokun && !document.pointerLockElement) kanvas.requestPointerLock?.(); });
  document.addEventListener('mousemove', e => {
    if (!oyun || document.pointerLockElement !== kanvas) return;
    oyun.yaw -= e.movementX * 0.0024; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - e.movementY * 0.0024));
  });
  document.addEventListener('mousedown', e => { if (oyun && document.pointerLockElement === kanvas && e.button === 0 && oyun.rol === 'serif') ates(); });

  // ---------- Girdi: dokunmatik ----------
  const joy = { id: null, cx: 0, cy: 0, x: 0, y: 0 }, bakis = { id: null, x: 0, y: 0 };
  kanvas.addEventListener('touchstart', e => {
    if (!oyun) return;
    for (const t of e.changedTouches) {
      if (t.clientX < innerWidth * 0.45 && joy.id === null) {
        Object.assign(joy, { id: t.identifier, cx: t.clientX, cy: t.clientY, x: 0, y: 0 });
        const j = $('joystick'); j.style.display = 'block'; j.style.left = (t.clientX - 60) + 'px'; j.style.top = (t.clientY - 60) + 'px';
      } else if (bakis.id === null) Object.assign(bakis, { id: t.identifier, x: t.clientX, y: t.clientY });
    }
    e.preventDefault();
  }, { passive: false });
  kanvas.addEventListener('touchmove', e => {
    if (!oyun) return;
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        let dx = t.clientX - joy.cx, dy = t.clientY - joy.cy; const d = Math.hypot(dx, dy), m = 50;
        if (d > m) { dx = dx / d * m; dy = dy / d * m; }
        joy.x = dx / m; joy.y = dy / m;
        $('joyTopuz').style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (t.identifier === bakis.id) {
        oyun.yaw -= (t.clientX - bakis.x) * 0.006; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - (t.clientY - bakis.y) * 0.005));
        bakis.x = t.clientX; bakis.y = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });
  const dokunmaBitti = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) { joy.id = null; joy.x = joy.y = 0; $('joystick').style.display = 'none'; $('joyTopuz').style.transform = ''; }
      if (t.identifier === bakis.id) bakis.id = null;
    }
  };
  kanvas.addEventListener('touchend', dokunmaBitti); kanvas.addEventListener('touchcancel', dokunmaBitti);

  $('kosBtn').onclick = () => { if (!oyun) return; oyun.kos = !oyun.kos; $('kosBtn').classList.toggle('basili', oyun.kos); };
  $('atesBtn').onclick = () => ates();
  $('eylemBtn').onclick = () => eylem();
  $('kameraBtn').onclick = () => kameraDegistir();
  $('telsizBtn').onclick = () => telsizDegistir();
  $('mikBtn').onclick = mikDegistir;
  $('sesBtn').onclick = () => { const a = Ses.degistir(); $('sesBtn').textContent = a ? '🔊' : '🔇'; };
  $('harita').onclick = () => $('harita').classList.toggle('buyuk');
  $('muhbirBtn').onclick = () => {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli || oyun.muhbir <= 0) return;
    Ag.eveGonder({ tip: 'muhbir' }); toast('📡 Muhbir hazır: bir sonraki görev hemen bildirilecek', 2500);
  };

  function kameraDegistir() { if (!oyun) return; oyun.kamera = oyun.kamera === 'arka' ? 'goz' : 'arka'; toast(oyun.kamera === 'goz' ? '👁️ Kendi gözünden' : '🎥 Arkadan görünüş', 1200); }
  function telsizDegistir() {
    if (!oyun) return;
    oyun.telsiz = !oyun.telsiz;
    Ag.eveGonder({ tip: 'kanal', takim: oyun.telsiz });
    $('telsizBtn').classList.toggle('acik', oyun.telsiz);
    toast(oyun.telsiz ? '📻 Telsiz açık: sadece takımın duyuyor' : '🗣️ Telsiz kapalı: yakınındakiler duyuyor', 1800);
  }

  // ---------- Eylem: görev / kılık ----------
  function yakinEylem() {
    if (!oyun || !oyun.canli || oyun.rol !== 'haydut' || oyun.is) return null;
    let en = null, ed = 2.4;
    Kasaba.gorevler.forEach(g => { if (oyun.yapilan.has(g.id)) return; const d = Math.hypot(g.x - oyun.x, g.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'gorev', g }; } });
    if (!en && oyun.kilik > 0) Kasaba.kiliklar.forEach(k => { const d = Math.hypot(k.x - oyun.x, k.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'kilik', k }; } });
    return en;
  }
  function eylem() {
    const e = yakinEylem(); if (!e) return;
    if (e.tur === 'gorev') Ag.eveGonder({ tip: 'gorev', gid: e.g.id });
    else Ag.eveGonder({ tip: 'kilik', kid: e.k.id });
  }
  function isDurumu(m) {
    if (m.ad) { oyun.is = { ad: m.ad, sure: m.sure, bas: performance.now(), x: oyun.x, z: oyun.z }; $('ilerleme').classList.remove('gizli'); $('ilerlemeYazi').textContent = m.ad; Ses.is(); }
    else {
      oyun.is = null; $('ilerleme').classList.add('gizli');
      if (m.bitti) { Ses.gorev(); if (m.kilik !== undefined) { oyun.kilik = m.kilik; toast('👔 Kılığın değişti!', 1600); hudGuncelle(); } }
      else if (m.iptal) toast('Yarıda kaldı', 900);
    }
  }

  // ---------- Bildirimler ----------
  function akisEkle(metin, tur = '', gecen = null) {
    const d = document.createElement('div');
    d.className = tur;
    d.innerHTML = kacis(metin) + (gecen !== null ? ' <small></small>' : '');
    if (gecen !== null) d.dataset.zaman = String(performance.now() - gecen * 1000);
    d.dataset.eklendi = String(performance.now());
    $('akis').prepend(d);
    while ($('akis').children.length > 6) $('akis').lastChild.remove();
    zamanlariGuncelle();
  }
  function zamanlariGuncelle() {
    const t = performance.now();
    [...$('akis').children].forEach(d => {
      if (d.dataset.zaman) d.querySelector('small').textContent = `· ${Math.floor((t - +d.dataset.zaman) / 1000)} sn önce`;
      if (t - +d.dataset.eklendi > 90000) d.remove();
    });
  }
  setInterval(zamanlariGuncelle, 1000);
  function bildirim(m) {
    if (m.sayi) oyun.gorevSayi = Math.max(oyun.gorevSayi, m.sayi);
    if (m.gid && !String(m.gid).startsWith('kilik:')) oyun.yapilan.add(m.gid);
    if (oyun.rol === 'haydut') {
      akisEkle(`${m.metin} (${m.sayi}/${oyun.ayar.hedef})${m.kim ? ' – ' + m.kim : ''}`, 'takim');
      isaretler.forEach(s => { if (s.userData.gid === m.gid) s.visible = false; });
    } else {
      akisEkle(m.metin, '', m.gecen || 0);
      const g = Kasaba.gorevler.find(x => x.id === m.gid) || Kasaba.kiliklar.find(x => 'kilik:' + x.id === m.gid);
      if (g) oyun.darbe.push({ x: g.x, z: g.z, bas: performance.now() });
    }
    Ses.bildirim(); hudGuncelle();
  }

  // ---------- Ateş ----------
  function nisanHedefi() {
    const k = Sahne.kamera, d = new THREE.Vector3(); k.getWorldDirection(d);
    const ox = k.position.x, oy = k.position.y, oz = k.position.z;
    const l2 = Math.hypot(d.x, d.z) || 1e-6;
    const duvar = Kasaba.isin(ox, oz, d.x / l2, d.z / l2, 60) / l2;
    let en = -1, et = Math.min(duvar, 50 / l2);
    varliklar.forEach((v, no) => {
      if (no === oyun.benimNo || v.durum !== 0) return;
      // yatayda çembere çarpma
      const cx = ox - v.x, cz = oz - v.z, a = d.x * d.x + d.z * d.z, b = 2 * (cx * d.x + cz * d.z), c = cx * cx + cz * cz - 0.42 * 0.42;
      const disk = b * b - 4 * a * c; if (disk < 0) return;
      const t = (-b - Math.sqrt(disk)) / (2 * a); if (t <= 0 || t >= et) return;
      const y = oy + d.y * t; if (y < 0 || y > 1.95) return;
      et = t; en = no;
    });
    return en;
  }
  function ates() {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli) return;
    if (!oyun.kapiAcik) { toast('🔒 Kapı açılmadan ateş edemezsin', 1200); return; }
    const t = performance.now(); if (t - oyun.sonAtes < 1800) return;
    oyun.sonAtes = t;
    Ag.eveGonder({ tip: 'ates', hedef: nisanHedefi() });
  }
  function atesGoster(m) {
    const v = varliklar.get(m.no);
    const uz = m.no === oyun.benimNo ? 0 : v ? Math.hypot(v.x - oyun.x, v.z - oyun.z) : 40;
    Ses.ates(uz);
    if (m.no === oyun.benimNo) tepme = 1;
    const kendiGozum = m.no === oyun.benimNo && oyun.kamera === 'goz';
    if (v && !kendiGozum) {   // kolunu kaldırır, namlu alevi
      Karakter.atesEt(v.g);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffdd55' }));
      const y = v.yaw; p.position.set(v.x + Math.sin(y) * 0.95 - Math.cos(y) * 0.33, 1.48, v.z + Math.cos(y) * 0.95 + Math.sin(y) * 0.33);
      Sahne.scene.add(p); setTimeout(() => Sahne.scene.remove(p), 90);
    }
    const h = varliklar.get(m.hedef);
    if (h && h.durum === 0) { h.durum = 1; h.g.userData.olum = 0.01; Karakter.cizgiKaldir(h.g); }
  }

  // ---------- Elenme / bitiş ----------
  function elendin(m) {
    oyun.canli = false; oyun.is = null; $('ilerleme').classList.add('gizli');
    oyun.kamera = 'arka';
    const yazi = m.neden === 'hapis' ? '⛓️ Hapse girdin! Masum kasabalıları vurdun.' : `💀 Vuruldun! (${kacis(m.kim || 'şerif')})`;
    $('elendiYazi').innerHTML = `${yazi}<br><small>Artık hayalet olarak kasabayı izliyorsun. Ölüler sadece ölüleri duyar.</small>`;
    $('elendiYazi').classList.remove('gizli');
    if (m.neden === 'hapis') Ses.hapis(); else Ses.kaybetti();
    hudGuncelle();
  }
  function bitti(m) {
    const benimRol = oyun.rol, kazandim = m.kazanan === benimRol;
    if (kazandim) Ses.kazandi(); else Ses.kaybetti();
    toast(m.kazanan === 'haydut' ? '🦹 HAYDUTLAR KAZANDI!' : '⭐ ŞERİFLER KAZANDI!', 3000);
    setTimeout(() => {
      $('sonucBaslik').textContent = m.kazanan === 'haydut' ? 'HAYDUTLAR KAZANDI' : 'ŞERİFLER KAZANDI';
      $('sonucNeden').textContent = `${m.neden} (${m.gorev} görev yapıldı)`;
      const durum = d => d === 0 ? '🙂 Ayakta' : d === 1 ? '💀 Vuruldu' : d === 2 ? '⛓️ Hapiste' : '🚪 Ayrıldı';
      $('sonucListe').innerHTML = m.roller.map(r => `<li><span>${r.rol === 'haydut' ? '🦹' : '⭐'} ${kacis(r.ad)}</span><span>${durum(r.durum)}</span></li>`).join('');
      $('tekrarBtn').classList.toggle('gizli', !Ag.evMi);
      $('sonucBekle').classList.toggle('gizli', Ag.evMi);
      ekran('sonuc');
    }, 3200);
  }

  // ---------- HUD ----------
  function hudGuncelle() {
    if (!oyun) return;
    const r = $('rolRozet');
    r.className = oyun.canli ? oyun.rol : 'olu';
    r.textContent = !oyun.canli ? '👻 Hayalet' : oyun.rol === 'haydut' ? '🦹 HAYDUT' : '⭐ ŞERİF';
    $('gorevSayac').textContent = `🎯 Görev: ${oyun.gorevSayi}/${oyun.ayar.hedef}`;
    $('hakYazi').textContent = oyun.rol === 'serif' ? `🔫 Hak: ${oyun.hak}` : `👔 Kılık: ${oyun.kilik}`;
    const serif = oyun.rol === 'serif' && oyun.canli;
    $('atesBtn').classList.toggle('gizli', !serif || !dokun);
    $('muhbirBtn').classList.toggle('gizli', !serif);
    $('muhbirBtn').disabled = oyun.muhbir <= 0 && !oyun.muhbirAktif;
    $('muhbirBtn').classList.toggle('aktif', oyun.muhbirAktif);
    $('nisan').className = serif ? 'serif' : '';
    $('telsizBtn').classList.toggle('gizli', !oyun.canli);
  }
  let toastSayac = null;
  function toast(html, ms = 2000) { const t = $('toast'); t.innerHTML = html; t.classList.add('goster'); clearTimeout(toastSayac); toastSayac = setTimeout(() => t.classList.remove('goster'), ms); }
  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Küçük harita ----------
  let haritaZemin = null, sonHarita = 0;
  // Küçükken senin etrafını yakından (YAKIN metre yarıçap), büyükken bütün kasabayı gösterir
  const YAKIN = 34;
  function haritaCiz() {
    const c = $('harita'), buyuk = c.classList.contains('buyuk');
    const istenen = buyuk ? 900 : 320;
    if (c.width !== istenen) { c.width = c.height = istenen; }
    const x = c.getContext('2d'), N = c.width, Z = haritaZemin.width, SN = Kasaba.SINIR;
    // Görünen bölge (dünya koordinatı): merkez ve yarıçap
    const R = buyuk ? SN : YAKIN;
    const mx = buyuk ? 0 : Math.max(-SN + R, Math.min(SN - R, oyun.x)), mz = buyuk ? 0 : Math.max(-SN + R, Math.min(SN - R, oyun.z));
    const S = N / (R * 2);
    const PX = v => (v - mx + R) * S, PZ = v => (v - mz + R) * S;
    const zs = Z / (SN * 2);
    x.drawImage(haritaZemin, (mx - R + SN) * zs, (mz - R + SN) * zs, R * 2 * zs, R * 2 * zs, 0, 0, N, N);
    const olcek = N / 320;
    const nokta = (px, pz, r, renk, kenar = '#0008') => { x.beginPath(); x.arc(PX(px), PZ(pz), r * olcek, 0, 7); x.fillStyle = renk; x.fill(); x.lineWidth = 1.5 * olcek; x.strokeStyle = kenar; x.stroke(); };    if (oyun.rol === 'haydut') {
      Kasaba.gorevler.forEach(g => { if (!oyun.yapilan.has(g.id)) nokta(g.x, g.z, 4.5, '#ffcc22'); });
      if (oyun.kilik > 0) Kasaba.kiliklar.forEach(k => nokta(k.x, k.z, 4, '#a070ff'));
    }
    const t = performance.now();
    oyun.darbe = oyun.darbe.filter(d => t - d.bas < 9000);
    oyun.darbe.forEach(d => { const k = ((t - d.bas) % 1500) / 1500; x.beginPath(); x.arc(PX(d.x), PZ(d.z), (5 + k * 22) * olcek, 0, 7); x.strokeStyle = `rgba(255,60,40,${1 - k})`; x.lineWidth = 3; x.stroke(); nokta(d.x, d.z, 4, '#ff3a2a'); });
    varliklar.forEach((v, no) => {
      if (no === oyun.benimNo || v.durum !== 0) return;
      if (oyun.serifler.has(no)) nokta(v.x, v.z, 4.5, SERIF_RENK);
      else if (oyun.rol === 'haydut' && oyun.takim.has(no)) nokta(v.x, v.z, 4.5, TAKIM_RENK);
    });
    // Ben: ok
    x.save(); x.translate(PX(oyun.x), PZ(oyun.z)); x.rotate(-oyun.yaw + Math.PI); x.scale(olcek * 1.2, olcek * 1.2);
    x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3); x.lineTo(-6, 7); x.closePath();
    x.fillStyle = oyun.canli ? '#fff' : '#bbb'; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); x.restore();
    if (!buyuk) { x.font = `900 ${Math.round(13 * olcek)}px Nunito, sans-serif`; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; x.textAlign = 'right'; x.strokeText('M: büyüt', N - 6, N - 8); x.fillText('M: büyüt', N - 6, N - 8); }
  }

  // Sadece yerel testte: durumu dışarıdan görmek için
  if (location.hostname === 'localhost') window.arTest = { oyun: () => oyun, varliklar, eylem, ates, nisanHedefi };

  // ---------- Ana döngü ----------
  let sonT = performance.now();
  function dongu(t) {
    requestAnimationFrame(dongu);
    const dt = Math.min(0.05, (t - sonT) / 1000); sonT = t;
    if (!oyun) { if (!$('hud').classList.contains('gizli')) Sahne.ciz(); return; }
    bekleGuncelle(t);
    if (!oyun.kapiAcik && t > oyun.kapiAcilis + 2000) kapiAcildi();   // evden haber gelmezse yine de aç
    Sahne.kapiCanlandir(dt);
    hareket(dt);
    varliklar.forEach((v, no) => {
      if (no === oyun.benimNo) { v.x = oyun.x; v.z = oyun.z; v.yaw = oyun.govdeYaw; }
      else {
        const k = Math.min(1, dt * 9);
        if (Math.hypot(v.tx - v.x, v.tz - v.z) > 6) { v.x = v.tx; v.z = v.tz; }
        v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k;
        let f = ((v.tyaw - v.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; v.yaw += f * k;
      }
      v.g.position.set(v.x, 0, v.z); v.g.rotation.y = v.yaw;
      v.g.visible = !(no === oyun.benimNo && (!oyun.canli || oyun.kamera === 'goz'));
      Karakter.canlandir(v.g, no === oyun.benimNo ? oyun.h : v.h, dt);
    });
    kameraAyarla();
    if (elSilah) {
      elSilah.visible = oyun.rol === 'serif' && oyun.canli && oyun.kamera === 'goz';
      tepme = Math.max(0, tepme - dt * 4);
      const sallan = oyun.h ? Math.sin(t / (oyun.h === 2 ? 90 : 160)) * 0.012 : 0;
      elSilah.position.set(0.17, -0.15 + sallan + tepme * 0.02, -0.32 + tepme * 0.05);
      elSilah.rotation.x = tepme * 0.4;
      elSilah.userData.alev.visible = tepme > 0.82;
    }
    // İşaretler hafifçe zıplasın
    isaretler.forEach((s, i) => {
      s.position.y = 2.9 + Math.sin(t / 400 + i) * 0.15;
      const yapildi = s.userData.gid && oyun.yapilan.has(s.userData.gid);
      const yakin = Math.hypot(s.position.x - oyun.x, s.position.z - oyun.z) < 3.5;   // dibindeyken ekranı kaplamasın
      s.visible = oyun.canli && !yapildi && !yakin && (!s.userData.kilik || oyun.kilik > 0);
    });
    // Eylem düğmesi ve ilerleme
    const e = yakinEylem();
    const b = $('eylemBtn');
    if (e) { b.classList.remove('gizli'); b.classList.toggle('kilik', e.tur === 'kilik'); b.textContent = e.tur === 'gorev' ? `${e.g.emoji} ${e.g.ad}${dokun ? '' : ' (E)'}` : `👔 Kılık değiştir (${oyun.kilik})${dokun ? '' : ' (E)'}`; }
    else b.classList.add('gizli');
    if (oyun.is) $('ilerlemeCubuk').style.width = Math.min(100, (t - oyun.is.bas) / (oyun.is.sure * 10)) + '%';
    if (oyun.rol === 'serif' && oyun.canli) $('nisan').classList.toggle('hedefte', nisanHedefi() >= 0);
    const k = Math.max(0, oyun.kalan); $('sureYazi').textContent = `⏱️ ${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')}`;
    if (t - sonHarita > 100) { sonHarita = t; haritaCiz(); }
    Sahne.ciz();
  }

  function hareket(dt) {
    let ileri = 0, yan = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) ileri += 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) ileri -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) yan += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) yan -= 1;
    if (joy.id !== null) { ileri -= joy.y; yan += joy.x; }
    const boy = Math.hypot(ileri, yan);
    const kos = tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') || oyun.kos;
    oyun.h = 0;
    if (boy > 0.15) {
      if (boy > 1) { ileri /= boy; yan /= boy; }
      const s = Math.sin(oyun.yaw), c = Math.cos(oyun.yaw);
      const mx = s * ileri - c * yan, mz = c * ileri + s * yan, ml = Math.hypot(mx, mz);
      if (oyun.canli && oyun.is) Ag.eveGonder({ tip: 'iptal' });
      const hiz = !oyun.canli ? HAYALET : kos ? KOS : YURU;
      const nx = oyun.x + mx / ml * hiz * dt * Math.min(1, boy), nz = oyun.z + mz / ml * hiz * dt * Math.min(1, boy);
      if (oyun.canli) { const p = Kasaba.it(nx, nz); oyun.x = p.x; oyun.z = p.z; }
      else { oyun.x = Math.max(-110, Math.min(110, nx)); oyun.z = Math.max(-110, Math.min(110, nz)); }
      oyun.h = kos ? 2 : 1;
      const hedefYaw = oyun.kamera === 'goz' ? oyun.yaw : Math.atan2(mx, mz);
      let f = ((hedefYaw - oyun.govdeYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      oyun.govdeYaw += f * Math.min(1, dt * 10);
    } else if (oyun.kamera === 'goz') oyun.govdeYaw = oyun.yaw;
    const t = performance.now();
    if (oyun.canli && t - oyun.sonGonder > 66) {
      oyun.sonGonder = t;
      Ag.eveGonder({ tip: 'konum', x: Math.round(oyun.x * 100) / 100, z: Math.round(oyun.z * 100) / 100, yaw: Math.round(oyun.govdeYaw * 100) / 100, h: oyun.h });
    }
  }

  function kameraAyarla() {
    const k = Sahne.kamera;
    const cp = Math.cos(oyun.pitch), d = new THREE.Vector3(Math.sin(oyun.yaw) * cp, Math.sin(oyun.pitch), Math.cos(oyun.yaw) * cp);
    const v = varliklar.get(oyun.benimNo);
    const boy = v ? v.g.scale.y : 1;
    if (oyun.kamera === 'goz' && oyun.canli) {
      k.position.set(oyun.x + Math.sin(oyun.yaw) * 0.18, 1.66 * boy, oyun.z + Math.cos(oyun.yaw) * 0.18);
    } else {
      const yuk = oyun.canli ? 1.75 : 2.6, uzak = oyun.canli ? 3.6 : 5;
      const sagx = -Math.cos(oyun.yaw) * 0.55, sagz = Math.sin(oyun.yaw) * 0.55;
      const bx = oyun.x + sagx, bz = oyun.z + sagz;
      const l2 = Math.hypot(d.x, d.z) || 1;
      const serbest = oyun.canli ? Math.max(0.6, Math.min(uzak, Kasaba.isin(bx, bz, -d.x / l2, -d.z / l2, uzak + 0.4) - 0.4)) : uzak;
      k.position.set(bx - d.x * serbest, Math.max(0.4, yuk - d.y * serbest), bz - d.z * serbest);
      // Şerif odasındayken kamera çatının üstüne çıkmasın
      const so = Kasaba.serifOdasi;
      if (oyun.canli && Math.abs(oyun.x - so.x) < so.g / 2 && Math.abs(oyun.z - so.z) < so.d / 2) k.position.y = Math.min(k.position.y, so.y - 0.3);
    }
    k.lookAt(k.position.x + d.x, k.position.y + d.y, k.position.z + d.z);
  }
})();
