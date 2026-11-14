// =============================================================
// Sahte Haydut - oyuncunun ekranı: giriş/lobi, kamera, yürüme, ateş, görev, harita, bildirim, ses
// =============================================================

(() => {
  const $ = id => document.getElementById(id);
  const dokun = matchMedia('(pointer: coarse)').matches;   // sadece parmakla kullanılan cihaz (dokunmatik dizüstü fareyle oynar)
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
  Ag.on('oyuncular', liste => lobiListesi(liste));
  function lobiListesi(liste) {
    const secimli = lobiAyar.rolMod !== 'rastgele';
    const rolYazi = o => !secimli ? '' : o.rol === 'haydut' ? '🦹 Haydut' : o.rol === 'serif' ? '⭐ Şerif' : '❔ seçmedi';
    $('lobiListe').innerHTML = liste.map((o, i) => `<li><span>${i === 0 ? '👑 ' : '🤠 '}${kacis(o.ad)}${o.id === Ag.benimId ? ' (sen)' : ''}</span><span>${rolYazi(o)} ${o.ses ? '🎤' : ''}</span></li>`).join('');
    rolDugmeleri();
    if (Ag.evMi) {
      const n = liste.length, sel = $('ayHaydut'), eski = +sel.value || Math.max(1, Math.round(n / 3));
      sel.innerHTML = Array.from({ length: Math.max(1, n - 1) }, (_, i) => `<option>${i + 1}</option>`).join('');
      sel.value = String(Math.min(Math.max(1, n - 1), eski));
      $('baslaBtn').disabled = n < 2;
      ayarYay(true);
    }
  }
  // Rol seçimi (bekleme odasında herkes kendi seçer)
  let lobiAyar = { rolMod: 'secim' };
  function rolDugmeleri() {
    const secimli = lobiAyar.rolMod !== 'rastgele', ben = Ag.oyuncular.find(o => o.id === Ag.benimId);
    $('rolSecim').classList.toggle('gizli', !secimli);
    $('rolHaydutBtn').classList.toggle('secili', ben?.rol === 'haydut');
    $('rolSerifBtn').classList.toggle('secili', ben?.rol === 'serif');
    $('haydutSayiSatir').classList.toggle('gizli', secimli);
  }
  $('rolHaydutBtn').onclick = () => Ag.eveGonder({ tip: 'rolSec', rol: 'haydut' });
  $('rolSerifBtn').onclick = () => Ag.eveGonder({ tip: 'rolSec', rol: 'serif' });
  Ag.on('katildi', () => ayarYay());
  ['ayRolMod', 'ayHaydut', 'ayHak', 'aySure', 'ayHedef', 'ayKasabali', 'ayKilik'].forEach(id => $(id).addEventListener('change', () => ayarYay()));
  function ayarOku() {
    return { rolMod: $('ayRolMod').value, haydut: +$('ayHaydut').value || 1, hak: +$('ayHak').value, sure: +$('aySure').value, hedef: +$('ayHedef').value, kasabali: +$('ayKasabali').value, kilik: +$('ayKilik').value };
  }
  const ayarYazi = a => `${a.rolMod === 'rastgele' ? `🎲 Rastgele: 🦹 ${a.haydut} haydut · ⭐ ${Math.max(1, Ag.oyuncular.length - a.haydut)} şerif` : '🎭 Roller: herkes kendi seçer'} · 🔫 ${a.hak} hak · ⏱️ ${a.sure} dk · 🎯 ${a.hedef} görev · 👥 ${a.kasabali} kasabalı · 👔 ${a.kilik} kılık`;
  function ayarYay(listedenGeldi) {
    if (!Ag.evMi) return;
    const a = ayarOku(), degisti = a.rolMod !== lobiAyar.rolMod; lobiAyar = a;
    $('ayarOzet').textContent = ayarYazi(a); Ag.yayinla({ tip: 'ayar', ayar: a });
    if (degisti && !listedenGeldi) lobiListesi(Ag.oyuncular); else rolDugmeleri();
  }

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
    if (!rollerHazir()) return;
    motoruBaslat();
  };
  // Roller seçimle dağıtılıyorsa: herkes seçmiş olmalı, en az 1 haydut ve 1 şerif
  function rollerHazir() {
    const a = ayarOku();
    if (a.rolMod === 'rastgele') return true;
    const secmeyen = Ag.oyuncular.filter(o => !o.rol).map(o => o.ad);
    let neden = '';
    if (secmeyen.length) neden = `Herkes rolünü seçsin: ${secmeyen.join(', ')} seçmedi.`;
    else if (!Ag.oyuncular.some(o => o.rol === 'haydut')) neden = 'En az 1 kişi haydut olmalı.';
    else if (!Ag.oyuncular.some(o => o.rol === 'serif')) neden = 'En az 1 kişi şerif olmalı.';
    $('lobiDurum').textContent = neden;
    return !neden;
  }
  function motoruBaslat() {
    clearInterval(motorSayac);
    Motor.baslat(Ag.oyuncular.map(o => ({ id: o.id, ad: o.ad, rol: o.rol })), sonAyar, {
      kisiye: (id, m) => (id === Ag.benimId ? mesaj(m) : Ag.gonderId(id, m)),
      herkese: m => Ag.yayinla(m),
    });
    let son = performance.now();
    motorSayac = setInterval(() => {
      const t = performance.now(), dt = Math.min(2, (t - son) / 1000); son = t;
      const n = Math.max(1, Math.ceil(dt / 0.15));   // sekme arka plandaysa zamanlayıcı yavaşlar: kaçırılan süreyi parça parça işle
      for (let i = 0; i < n; i++) Motor.adim(dt / n);
    }, 100);
  }
  Ag.on('evMesaj', (m, id) => {
    if (m.tip === 'lobiyeDon') return;
    if (m.tip === 'rolSec') {   // bekleme odasında rol seçimi
      if (Motor.aktif) return;
      const o = Ag.oyuncular.find(x => x.id === id);
      if (o) { o.rol = m.rol === 'serif' ? 'serif' : 'haydut'; Ag.lobiYay(); }
      return;
    }
    Motor.girdi(id, m);
  });
  Ag.on('koptu', o => Motor.koptu(o.id));
  $('tekrarBtn').onclick = () => { if (!Ag.evMi || Ag.oyuncular.length < 2) return; if (!rollerHazir()) { ekran('lobi'); Ag.yayinla({ tip: 'lobi' }); return; } motoruBaslat(); };
  $('lobiyeBtn').onclick = () => {
    if (Ag.evMi) { clearInterval(motorSayac); Motor.durdur(); Ag.yayinla({ tip: 'lobi' }); }
    else { oyunuTemizle(); ekran('lobi'); }
  };

  // ---------- Evden gelen mesajlar ----------
  Ag.on('mesaj', mesaj);
  function mesaj(m) {
    switch (m.tip) {
      case 'ayar': if (!Ag.evMi) { const degisti = m.ayar.rolMod !== lobiAyar.rolMod; $('ayarOzet').textContent = ayarYazi(m.ayar); lobiAyar = m.ayar; if (degisti) lobiListesi(Ag.oyuncular); else rolDugmeleri(); } break;
      case 'basla': oyunBaslat(m); break;
      case 'd': if (oyun) konumlar(m); break;
      case 'is': if (oyun) isDurumu(m); break;
      case 'bildirim': if (oyun) bildirim(m); break;
      case 'bilgi': if (oyun) {
        const tur = oyun.rol === 'haydut' ? ({ iyi: 'kotu', kotu: 'iyi' }[m.tur] || m.tur) : m.tur;   // haber benim takımım için iyi mi kötü mü
        akisEkle(m.metin, tur); if (tur === 'iyi') Ses.iyi(); else if (tur === 'kotu') Ses.kotu();
      } break;
      case 'ates': if (oyun) atesGoster(m); break;
      case 'hak': if (oyun) { oyun.hak = m.hak; hudGuncelle(); } break;
      case 'muhbir': if (oyun) { oyun.muhbirAktif = m.aktif; if (m.aktif) oyun.muhbir = 0; hudGuncelle(); } break;
      case 'elendin': if (oyun) elendin(m); break;
      case 'sesler': Object.entries(m.v).forEach(([id, v]) => Ag.seviyeAyarla(id, v)); break;
      case 'bitti': if (oyun) bitti(m); break;
      case 'kapi': if (oyun) kapiAcildi(); break;
      case 'aranma': if (oyun && oyun.rol === 'haydut') { const eski = oyun.aranma; oyun.aranma = m.seviye; hudGuncelle();
        if (m.seviye > eski) toast(`🚨 Aranma seviyesi ${m.seviye}!<br><small>${m.seviye >= 6 ? 'Şerifler artık hemen öğreniyor!' : 'Şerifler daha çabuk öğrenecek'}</small>`, 2400);
        else if (m.seviye < eski) toast(`😌 Aranma seviyesi ${m.seviye}'e düştü`, 1800); } break;
      case 'ipucu': if (oyun && oyun.rol === 'serif' && m.sira > (oyun.ipucuSira || 0)) {   // aranma seviyesi şerife 5-10 sn geç gelir
        const eski = oyun.aranma; oyun.ipucuSira = m.sira; oyun.aranma = m.seviye; hudGuncelle();
        if (m.seviye > eski && m.seviye >= 5) { toast(`🔎 İpucu seviyesi ${m.seviye}!<br><small>Gözün haritada olsun: görevin yeri ${m.seviye >= 6 ? '3 sn' : '1 sn'} kırmızı yanacak</small>`, 2600); Ses.posta(); }
        else if (m.seviye > eski) toast(`🔎 İpucu seviyesi ${m.seviye}`, 1500);
      } break;
      case 'posta':
        if (sahneKurulu) Sahne.postaSayisi(m.n);
        if (oyun && oyun.rol === 'serif') {
          (m.yerler || []).forEach(gid => { const g = Kasaba.gorevler.find(x => x.id === gid); if (g) oyun.darbe.push({ x: g.x, z: g.z, bas: performance.now(), sure: m.seviye >= 6 ? 3000 : 1000 }); });   // 5: 1 sn, 6: 3 sn
        }
        if (oyun && m.n > oyun.postaN) {   // 10 sn önce bir görev yapıldı: zil çalar, şerif kutuya bakmalı
          if (oyun.rol === 'serif') { oyun.gorevSayi = m.n; Ses.posta(); toast('📬 Posta kutularına yeni bilgi geldi!<br><small>Hangi görev olduğunu görmek için bir kutuya git</small>', 2600); hudGuncelle(); }
        }
        if (oyun) oyun.postaN = m.n;
        break;
      case 'postaListe': if (oyun) postaListesi(m.ids); break;
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
      x: m.x, z: m.z, y: 0, yaw: m.rol === 'serif' ? Math.PI / 2 : Math.random() * 6.28, pitch: -0.05, govdeYaw: m.rol === 'serif' ? Math.PI / 2 : 0, tip: m.tipNo,
      kapiAcilis: performance.now() + (m.bekleme || 0) * 1000, kapiAcik: !m.bekleme,
      canli: true, kamera: 'arka', kos: false, is: null, telsiz: false,
      hak: m.ayar.hak, kilik: m.ayar.kilik, muhbir: 1, muhbirAktif: false,
      // yapilan: gerçekten bildiğim (haydut anında öğrenir); gorunen: listede üstü çizili olanlar
      // (şerif: sadece posta kutusuna bakınca; haydut: sadece 1 kerelik 'kalanları göster' ile)
      aktif: new Set(m.gorevler || Kasaba.gorevler.map(g => g.id)), postaN: 0, aranma: 0, kilikYerleri: new Set(m.kiliklar || []),   // bu oyunun görevleri (görev hedefi kadar)
      gorevSayi: 0, yapilan: new Set(), gorunen: new Set(), kalanHakki: 1, kalan: m.sure, sonGonder: 0, sonAtes: 0, darbe: [],
    };
    $('akis').innerHTML = '';
    $('telsizBtn').classList.remove('acik'); $('kosBtn').classList.remove('basili'); $('nisanBtn').classList.remove('basili');
    $('elendiYazi').classList.add('gizli');
    $('ilerleme').classList.add('gizli');
    $('harita').classList.remove('buyuk');
    $('gorevListe').classList.add('gizli');   // görev listesi başta kapalı (L / 📋 ile açılır)
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
      akisEkle(`⭐ Şerifsin. Görev yapılınca sana haber gelmez: 📬 posta kutularının zilini dinle, kutuya bakıp öğren. ${m.ayar.hak} atış hakkın var.`, 'iyi');
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
    akisEkle('🚪 Şerifler odadan çıktı', oyun.rol === 'serif' ? 'iyi' : 'kotu');
    if (oyun.rol === 'serif') Ses.iyi(); else Ses.kotu();
  }
  // Kapı açılana kadar üstte geri sayım
  function bekleGuncelle(t) {
    if (oyun.kapiAcik) return;
    const kalan = Math.max(0, Math.ceil((oyun.kapiAcilis - t) / 1000));
    const y = $('bekleYazi'); y.classList.remove('gizli');
    y.textContent = oyun.rol === 'serif' ? `🔒 Odadasın · kapı ${kalan} sn sonra açılacak` : `🔒 Şerifler ${kalan} sn sonra çıkacak · kalabalığa karış!`;
  }
  function oyunuTemizle() {
    clearTimeout(sonucSayac);
    varliklar.forEach(v => Sahne.scene?.remove(v.g)); varliklar.clear();
    isaretler.forEach(s => Sahne.scene?.remove(s)); isaretler.length = 0;
    lazerler.forEach(l => Sahne.scene?.remove(l.cizgi, l.nokta)); lazerler.clear();
    $('serifPanel').innerHTML = ''; $('bekleYazi').classList.add('gizli');
    oyun = null;
    if (Ag.seviyeleriSifirla) Ag.seviyeleriSifirla();
  }

  // Haydutlara görev ve kılık işaretleri (duvar arkasından da görünür)
  function emojiSprite(emoji, renk, kenarRenk = '#fff') {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = renk; x.beginPath(); x.arc(64, 64, 54, 0, 7); x.fill();
    x.lineWidth = 10; x.strokeStyle = kenarRenk; x.stroke();
    x.font = '64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 64, 70);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.renderOrder = 20; s.scale.set(1.3, 1.3, 1);
    return s;
  }
  function isaretleriKur() {
    if (oyun.rol !== 'haydut') return;
    Kasaba.gorevler.filter(g => oyun.aktif.has(g.id)).forEach(g => { const s = emojiSprite(g.emoji, g.agir ? '#b0201acc' : '#e8a81acc', g.agir ? '#ff6a5a' : '#fff'); s.position.set(g.x, g.y + 2.9, g.z); s.userData.gid = g.id; s.userData.taban = g.y; Sahne.scene.add(s); isaretler.push(s); });
    Kasaba.kiliklar.filter(k => oyun.kilikYerleri.has(k.id)).forEach(k => { const s = emojiSprite('👔', '#8a5ad0cc'); s.position.set(k.x, 2.9, k.z); s.userData.kilik = true; Sahne.scene.add(s); isaretler.push(s); });
  }

  // ---------- Konumlar ----------
  function konumlar(m) {
    oyun.kalan = m.k;
    const gorulen = new Set();
    for (let i = 0; i < m.v.length; i += 9) {
      const no = m.v[i], x = m.v[i + 1] / 10, z = m.v[i + 2] / 10, yaw = m.v[i + 3] / 100, h = m.v[i + 4], tip = m.v[i + 5], durum = m.v[i + 6], y = m.v[i + 7] / 10, nisan = m.v[i + 8] ? m.v[i + 8] / 100 - 3 : null;
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
        v = { g, tip, x: v?.x ?? x, z: v?.z ?? z, y: v?.y ?? y, yaw: v?.yaw ?? yaw, tx: x, tz: z, ty: y, tyaw: yaw, h, durum };
        varliklar.set(no, v);
      }
      v.tx = x; v.tz = z; v.ty = y; v.tyaw = yaw; v.h = h; v.nisan = nisan;
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
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); document.activeElement?.blur?.(); }   // odaklı düğmeye basılmasın
    if (e.repeat) return;
    if (e.code === 'KeyE') eylem();
    if (e.code === 'KeyV') kameraDegistir();
    if (e.code === 'KeyT') telsizDegistir();
    if (e.code === 'KeyM') $('harita').classList.toggle('buyuk');
    if (e.code === 'KeyF' && oyun.rol === 'serif') ates();
    if (e.code === 'KeyK') mikDegistir();
    if (e.code === 'KeyQ') nisanDegistir();
    if (!oyun.canli && e.code === 'Space' && !oyun.serbest) { e.preventDefault(); izlemeDegistir(1); }
    // G: sadece ölen haydut ruh ↔ arkadaşını izle arasında geçer. Şerif hayalet olamaz (haydutları görüp ele verebilir).
    if (!oyun.canli && e.code === 'KeyG' && oyun.rol === 'haydut') { oyun.serbest = !oyun.serbest; if (oyun.serbest) oyun.ruhY = oyun.y + 1.7; else oyun.izle = 0; izlemeYazisi(); }
    if (e.code === 'KeyL') $('gorevListe').classList.toggle('gizli');
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
  kanvas.addEventListener('click', () => {
    if (!oyun || dokun || document.pointerLockElement) return;
    try { const p = kanvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch (e) { /* fare kilitlenemiyor: sürükleyerek bakılır */ }
  });
  // Fare kilitlenemezse (ör. uygulama içi tarayıcı): sol tuş basılı sürükleyerek etrafa bak
  kanvas.addEventListener('mousemove', e => {
    if (!oyun || document.pointerLockElement === kanvas || !(e.buttons & 1)) return;
    oyun.yaw -= e.movementX * 0.004; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - e.movementY * 0.004));
  });
  document.addEventListener('mousemove', e => {
    if (!oyun || document.pointerLockElement !== kanvas) return;
    oyun.yaw -= e.movementX * 0.0024; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - e.movementY * 0.0024));
  });
  document.addEventListener('mousedown', e => {
    if (!oyun || oyun.rol !== 'serif') return;
    const kilitli = document.pointerLockElement === kanvas;
    if (e.button === 0 && kilitli) ates();
    // sağ tık basılıyken nişan lazeri (fare kilitli olmasa da, oyun ekranına basınca çalışır)
    if (e.button === 2 && (kilitli || e.target === kanvas)) nisanAyarla(true);
  });
  document.addEventListener('mouseup', e => { if (oyun && e.button === 2) nisanAyarla(false); });
  kanvas.addEventListener('contextmenu', e => e.preventDefault());
  function nisanAyarla(acik) { if (!oyun || oyun.rol !== 'serif' || !oyun.canli) acik = false; if (oyun) { oyun.nisan = acik; $('nisanBtn').classList.toggle('basili', acik); } }
  function nisanDegistir() { if (oyun) nisanAyarla(!oyun.nisan); }

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
  $('nisanBtn').onclick = () => nisanDegistir();
  $('gorevPanelBtn').onclick = () => $('gorevListe').classList.toggle('gizli');
  $('eylemBtn').onclick = () => eylem();
  $('kameraBtn').onclick = () => kameraDegistir();
  $('telsizBtn').onclick = () => telsizDegistir();
  $('mikBtn').onclick = mikDegistir;
  $('sesBtn').onclick = () => { const a = Ses.degistir(); $('sesBtn').textContent = a ? '🔊' : '🔇'; };
  $('harita').onclick = () => $('harita').classList.toggle('buyuk');
  $('muhbirBtn').onclick = () => {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli || oyun.muhbir <= 0) return;
    Ag.eveGonder({ tip: 'muhbir' }); toast('📡 Muhbir hazır: bir sonraki görevin adı ve yeri hemen gelecek', 2500);
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
    if (!oyun || !oyun.canli || oyun.is) return null;
    if (oyun.rol === 'serif') {   // şerif: posta kutusuna bakabilir
      const k = !Kasaba.icBina(oyun.x, oyun.z) && Kasaba.postaKutulari.find(p => Math.hypot(p.x - oyun.x, p.z - oyun.z) < 2.2 && oyun.y < 1);
      return k ? { tur: 'posta', k } : null;
    }
    let en = null, ed = 2.4;
    const bina = Kasaba.icBina(oyun.x, oyun.z);   // duvarın öbür yanındaki görev yapılamaz: aynı binada (ya da ikiniz de dışarıda) olmalısınız
    Kasaba.gorevler.forEach(g => { if (!oyun.aktif.has(g.id) || oyun.gorunen.has(g.id) || Math.abs(g.y - oyun.y) > 1.5 || Kasaba.icBina(g.x, g.z) !== bina) return; const d = Math.hypot(g.x - oyun.x, g.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'gorev', g }; } });
    if (!en && oyun.kilik > 0) Kasaba.kiliklar.forEach(k => { if (!oyun.kilikYerleri.has(k.id) || Kasaba.icBina(k.x, k.z) !== bina) return; const d = Math.hypot(k.x - oyun.x, k.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'kilik', k }; } });
    return en;
  }
  function eylem() {
    const e = yakinEylem(); if (!e) return;
    if (e.tur === 'posta') { Ag.eveGonder({ tip: 'posta' }); return; }
    oyun.sonEylem = e.tur === 'gorev' ? e.g : e.k; oyun.sonAnim = e.tur === 'gorev' ? e.g.anim : 'ara'; oyun.sonTur = e.tur;
    if (e.tur === 'gorev') Ag.eveGonder({ tip: 'gorev', gid: e.g.id });
    else Ag.eveGonder({ tip: 'kilik', kid: e.k.id });
  }
  function isDurumu(m) {
    if (m.ad) {
      oyun.is = { ad: m.ad, sure: m.sure, bas: performance.now(), anim: oyun.sonAnim || 'calis' };
      // Işınlanma yok: görevi durduğun yerden yaparsın. Sadece sandalyeli görevlerde sandalyeye kısa sürede kayarak oturursun.
      const n = oyun.sonEylem;
      oyun.is.kay = n && (oyun.sonAnim === 'otur' || oyun.sonAnim === 'kumar' || oyun.sonAnim === 'ye') ? { x: n.x, z: n.z } : null;
      $('ilerleme').classList.remove('gizli'); $('ilerlemeYazi').textContent = m.ad; Ses.is();
    }
    else {
      oyun.is = null; $('ilerleme').classList.add('gizli');
      if (m.bitti && oyun.sonTur === 'gorev' && oyun.sonEylem) { oyun.gorunen.add(oyun.sonEylem.id); hudGuncelle(); }   // kendi yaptığın görev tekrar çıkmasın
      if (m.bitti) { Ses.gorev(); if (m.kilik !== undefined) { oyun.kilik = m.kilik; toast('👔 Kılığın değişti!', 1600); hudGuncelle(); } }
      else if (m.yapilmis) { oyun.gorunen.add(m.yapilmis); toast('Bu görev zaten yapılmış!', 1600); hudGuncelle(); }
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
  setInterval(() => { zamanlariGuncelle(); if (oyun && !oyun.canli) izlemeYazisi(); }, 1000);
  function bildirim(m) {
    if (m.sayi && oyun.rol === 'haydut') oyun.gorevSayi = Math.max(oyun.gorevSayi, m.sayi);
    if (m.gid && !String(m.gid).startsWith('kilik:')) oyun.yapilan.add(m.gid);
    if (oyun.rol === 'haydut') {
      akisEkle(`${m.metin} (${m.sayi}/${oyun.ayar.hedef})${m.kim ? ' – ' + m.kim : ''}${m.posta !== undefined ? ` · 📬 ${m.posta ? m.posta + ' sn sonra postada' : 'hemen postada'}` : ''}`, 'takim');
    } else {
      // Şerif: görev bildirimi gelmez (posta kutusundan öğrenir); sadece muhbir ve kılık haberleri gelir
      akisEkle(m.metin, m.muhbir ? 'kotu' : '', m.gecen || 0);
      const g = Kasaba.gorevler.find(x => x.id === m.gid) || Kasaba.kiliklar.find(x => 'kilik:' + x.id === m.gid);
      if (g && m.muhbir) oyun.darbe.push({ x: g.x, z: g.z, bas: performance.now() });
    }
    Ses.bildirim(); hudGuncelle();
  }

  // ---------- Ateş ----------
  // Işın: (o, d) yönünde ilk çarptığı karakter ve mesafe. tabanY: atanın bulunduğu kat yüksekliği
  function isinAt(ox, oy, oz, d, haric, tabanY) {
    const l2 = Math.hypot(d.x, d.z) || 1e-6;
    let et = Math.min(Kasaba.isin(ox, oz, d.x / l2, d.z / l2, 60, Kasaba.katOf(tabanY)) / l2, 44 / l2);   // evin kabul ettiği menzil 45 m
    if (d.y < -0.01) et = Math.min(et, (oy - tabanY) / -d.y);          // yere çarpar
    let en = -1;
    varliklar.forEach((v, no) => {
      if (no === haric || v.durum !== 0 || Math.abs(v.y - tabanY) > 1.6) return;   // başka kattakine ulaşmaz
      // yatayda çembere çarpma
      const cx = ox - v.x, cz = oz - v.z, a = d.x * d.x + d.z * d.z, b = 2 * (cx * d.x + cz * d.z), c = cx * cx + cz * cz - 0.42 * 0.42;
      const disk = b * b - 4 * a * c; if (disk < 0 || a < 1e-9) return;
      const t = (-b - Math.sqrt(disk)) / (2 * a); if (t <= 0 || t >= et) return;
      const y = oy + d.y * t; if (y < v.y || y > v.y + 1.95) return;
      et = t; en = no;
    });
    return { no: en, t: et };
  }
  function nisanHedefi() {
    const k = Sahne.kamera, d = new THREE.Vector3(); k.getWorldDirection(d);
    return isinAt(k.position.x, k.position.y, k.position.z, d, oyun.benimNo, oyun.y).no;
  }

  // ---------- Nişan lazeri: nişan alan şeriflerin namlusundan beyaz ışın ----------
  const lazerler = new Map();   // no → { cizgi, nokta }
  const lazerMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
  const lazerGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6), noktaGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const YUKARI = new THREE.Vector3(0, 1, 0);
  // Berber ustası: koltukta biri oturuyorsa tıraş eder, yoksa bekler
  const trasGorevi = Kasaba.gorevler.find(g => g.id === 'tras');
  function berberUstasi(dt) {
    const u = Sahne.berberUstasi; if (!u || !trasGorevi) return;
    const oturan = Kasaba.animKodu('otur');
    let var_ = false;
    varliklar.forEach(v => { if (v.durum === 0 && v.h === oturan && Math.hypot(v.x - trasGorevi.x, v.z - trasGorevi.z) < 1.3) var_ = true; });
    if (oyun.h === oturan && Math.hypot(oyun.x - trasGorevi.x, oyun.z - trasGorevi.z) < 1.3) var_ = true;
    Karakter.canlandir(u, var_ ? Kasaba.animKodu('tras') : 0, dt);
    if (Sahne.barmen) Karakter.canlandir(Sahne.barmen, Kasaba.animKodu('calis'), dt * 0.6);   // barmen bardak siler
  }
  function lazerleriGuncelle() {
    const gorulen = new Set();
    varliklar.forEach((v, no) => {
      const ben = no === oyun.benimNo;
      const p = ben ? (oyun.nisan && oyun.canli ? oyun.pitch : null) : v.nisan;
      v.g.userData.nisan = p;
      if (p == null || v.durum !== 0) return;
      gorulen.add(no);
      let l = lazerler.get(no);
      if (!l) { l = { cizgi: new THREE.Mesh(lazerGeo, lazerMat), nokta: new THREE.Mesh(noktaGeo, lazerMat) }; Sahne.scene.add(l.cizgi, l.nokta); lazerler.set(no, l); }
      let o, d;
      if (ben && oyun.kamera === 'goz') {   // kendi gözümden: ışın ekranın ortasına gider
        const k = Sahne.kamera; d = new THREE.Vector3(); k.getWorldDirection(d);
        const sag = new THREE.Vector3().crossVectors(d, YUKARI).normalize();
        o = k.position.clone().addScaledVector(sag, 0.05).addScaledVector(YUKARI, -0.05).addScaledVector(d, 1.2);
        l.ince = true;
      } else {
        l.ince = false;
        const yaw = ben ? oyun.yaw : v.yaw, boy = v.g.scale.y, cp = Math.cos(p);
        d = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(p), Math.cos(yaw) * cp);
        o = new THREE.Vector3(v.x - Math.cos(yaw) * 0.35, v.y + 1.48 * boy, v.z + Math.sin(yaw) * 0.35).addScaledVector(d, 0.95);
      }
      const h = isinAt(o.x, o.y, o.z, d, no, v.y), L = Math.max(0.05, h.t);
      l.cizgi.position.copy(o).addScaledVector(d, L / 2);
      l.cizgi.quaternion.setFromUnitVectors(YUKARI, d);
      const kal = l.ince ? 0.3 : 1;   // kendi gözümden bakarken ince görünsün
      l.cizgi.scale.set(kal, L, kal);
      l.nokta.position.copy(o).addScaledVector(d, L);
    });
    lazerler.forEach((l, no) => { if (!gorulen.has(no)) { Sahne.scene.remove(l.cizgi, l.nokta); lazerler.delete(no); } });
  }
  function ates() {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli) return;
    if (!oyun.kapiAcik) { toast('🔒 Kapı açılmadan ateş edemezsin', 1200); return; }
    const t = performance.now(); if (t - oyun.sonAtes < 1900) return;
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
      const y = v.yaw; p.position.set(v.x + Math.sin(y) * 0.95 - Math.cos(y) * 0.33, v.y + 1.48, v.z + Math.cos(y) * 0.95 + Math.sin(y) * 0.33);
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
    oyun.elenmeYazi = yazi; oyun.izle = 0; oyun.serbest = oyun.rol === 'haydut'; oyun.ruhY = oyun.y + 1.7;
    izlemeYazisi();
    $('elendiYazi').classList.remove('gizli');
    if (m.neden === 'hapis') Ses.hapis(); else Ses.kaybetti();
    hudGuncelle();
  }
  // Elenen oyuncu: ayakta kalan takım arkadaşlarının gözünden izler (Boşluk/dokun: sıradaki, G: serbest hayalet)
  function izlenebilenler() {
    return [...oyun.takim].filter(no => no !== oyun.benimNo && varliklar.get(no)?.durum === 0);
  }
  function izlenen() {
    if (!oyun || oyun.canli || oyun.serbest) return null;
    const l = izlenebilenler(); if (!l.length) return null;
    oyun.izle = ((oyun.izle % l.length) + l.length) % l.length;
    return l[oyun.izle];
  }
  function izlenenAd(no) {
    const i = (oyun.rol === 'serif' ? [...oyun.serifler] : [...oyun.takim]).indexOf(no);
    return (oyun.takimAdlar || [])[i] || 'arkadaşın';
  }
  function izlemeYazisi() {
    if (!oyun || oyun.canli) return;
    const no = izlenen();
    const alt = no != null
      ? `👁️ <b>${kacis(izlenenAd(no))}</b> gözünden izliyorsun · ${oyun.rol === 'serif' ? (dokun ? 'dokun: sıradaki şerif' : 'Boşluk: sıradaki şerif') : (dokun ? 'dokun: ruh ol' : 'Boşluk: sıradaki · G: ruh olup uç')}`
      : oyun.rol === 'serif' ? '👁️ İzlenecek şerif kalmadı'
      : `👻 Ruh oldun: kimse seni görmez, istediğin yere uç${dokun ? '' : ' · WASD + fare · Boşluk yukarı · C aşağı · Shift hızlı'}${izlenebilenler().length && !dokun ? ' · G: arkadaşının gözünden izle' : ''}`;
    $('elendiYazi').innerHTML = `${oyun.elenmeYazi}<br><small>${alt}<br>Ölüler sadece ölüleri duyar.</small>`;
  }
  function izlemeDegistir(adim) {
    if (!oyun || oyun.canli) return;
    if (oyun.rol === 'haydut' && dokun && izlenebilenler().length) { oyun.serbest = !oyun.serbest; if (oyun.serbest) oyun.ruhY = oyun.y + 1.7; izlemeYazisi(); return; }   // telefonda dokunmak: ruh ↔ izle
    if (oyun.rol === 'haydut' && !izlenebilenler().length) { oyun.serbest = true; izlemeYazisi(); return; }   // izlenecek kimse yok: ruh kal
    oyun.serbest = false; oyun.izle += adim; izlemeYazisi();
  }
  $('elendiYazi').addEventListener('click', () => izlemeDegistir(1));
  let sonucSayac = null;
  function bitti(m) {
    const benimRol = oyun.rol, kazandim = m.kazanan === benimRol;
    if (kazandim) Ses.kazandi(); else Ses.kaybetti();
    toast(m.kazanan === 'haydut' ? '🦹 HAYDUTLAR KAZANDI!' : '⭐ ŞERİFLER KAZANDI!', 3000);
    clearTimeout(sonucSayac);
    sonucSayac = setTimeout(() => {
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
    r.textContent = !oyun.canli ? (oyun.rol === 'haydut' ? '👻 Ruh' : oyun.hak <= 0 ? '⛓️ Hapiste' : '💀 Elendin') : oyun.rol === 'haydut' ? '🦹 HAYDUT' : '⭐ ŞERİF';
    $('gorevSayac').textContent = `🎯 Görev: ${oyun.gorevSayi}/${oyun.ayar.hedef}`;
    $('aranmaYazi').innerHTML = `${oyun.rol === 'serif' ? '🔎 İpucu' : '🚨 Aranma'}: <b>${'★'.repeat(oyun.aranma)}</b><i>${'☆'.repeat(6 - oyun.aranma)}</i>`;
    $('aranmaYazi').className = oyun.aranma >= 5 ? 'yuksek' : oyun.aranma >= 3 ? 'orta' : '';
    gorevListesi();
    $('hakYazi').textContent = oyun.rol === 'serif' ? `🔫 Hak: ${oyun.hak}` : `👔 Kılık: ${oyun.kilik}`;
    const serif = oyun.rol === 'serif' && oyun.canli;
    $('atesBtn').classList.toggle('gizli', !serif || !dokun);
    $('muhbirBtn').classList.toggle('gizli', !serif);
    $('nisanBtn').classList.toggle('gizli', !serif || !dokun);
    $('muhbirBtn').disabled = oyun.muhbir <= 0 && !oyun.muhbirAktif;
    $('muhbirBtn').classList.toggle('aktif', oyun.muhbirAktif);
    $('nisan').className = serif ? 'serif' : '';
    $('telsizBtn').classList.toggle('gizli', !oyun.canli);
  }
  // Bütün görevlerin listesi: yapılanların üstü çizili (şerifler gecikmeli bildirimle öğrenir)
  function gorevListesi() {
    $('gorevPanelBtn').textContent = `📋 Görevler ${oyun.gorevSayi}/${oyun.ayar.hedef}${dokun ? '' : ' (L)'}`;
    const ust = oyun.rol === 'serif'
      ? `<li class="not">📬 Yapılanları görmek için posta kutusuna git (E)</li>`
      : `<li class="not"><button id="kalanBtn" ${oyun.kalanHakki ? '' : 'disabled'}>🔍 Kalan görevleri göster (${oyun.kalanHakki} hak)</button></li>`;
    $('gorevListe').innerHTML = ust + Kasaba.gorevler.filter(g => oyun.aktif.has(g.id)).map(g => `<li class="${oyun.gorunen.has(g.id) ? 'yapildi' : ''} ${g.agir ? 'agir' : ''}">${g.agir ? '🔴' : '🟡'} ${g.emoji} ${kacis(g.ad)}</li>`).join('');
    const kb = $('kalanBtn'); if (kb) kb.onclick = kalanlariGoster;
  }
  // Haydut: 1 kerelik — o ana kadar yapılmış görevlerin üstü çizilir
  function kalanlariGoster() {
    if (!oyun || oyun.rol !== 'haydut' || oyun.kalanHakki <= 0) return;
    oyun.kalanHakki = 0; oyun.gorunen = new Set(oyun.yapilan);
    toast(`🔍 ${oyun.aktif.size - [...oyun.gorunen].filter(g => oyun.aktif.has(g)).length} görev kaldı`, 2000); hudGuncelle();
  }
  function postaListesi(ids) {
    oyun.gorunen = new Set(ids);
    toast(`📬 Posta kutusu: ${ids.length} görev yapılmış<br><small>(en az 10 sn önceki durum)</small>`, 2600);
    $('gorevListe').classList.remove('gizli'); hudGuncelle(); Ses.bildirim();
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
    const istenen = buyuk ? 640 : 320;
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
      x.font = `${Math.round(15 * olcek)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      Kasaba.gorevler.forEach(g => { if (oyun.aktif.has(g.id) && !oyun.gorunen.has(g.id)) { nokta(g.x, g.z, 8, g.agir ? '#ff7a6acc' : '#ffe08acc', g.agir ? '#a01010' : '#7a5a10'); x.fillText('✉️', PX(g.x), PZ(g.z) + olcek); } });
      if (oyun.kilik > 0) Kasaba.kiliklar.forEach(k => { if (oyun.kilikYerleri.has(k.id)) nokta(k.x, k.z, 4, '#a070ff'); });
    }
    else if (oyun.rol === 'serif') {   // şerif: kalan görevlerin yerleri (posta kutusundan öğrendiği yapılmışlar silinir)
      x.font = `${Math.round(14 * olcek)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      Kasaba.gorevler.forEach(g => { if (oyun.aktif.has(g.id) && !oyun.gorunen.has(g.id)) { nokta(g.x, g.z, 9, g.agir ? '#ff8a7ae6' : '#ffe9a8e6', g.agir ? '#c01010' : '#3a2a10'); x.fillText(g.emoji, PX(g.x), PZ(g.z) + olcek); } });
    }
    const t = performance.now();
    oyun.darbe = oyun.darbe.filter(d => t - d.bas < (d.sure || 9000));
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

  // Koşanların ayak sesi: yakındaysa yüksek, ~22 m'den sonra duyulmaz (şerif koşan haydudu duyar)
  const ADIM_ARA = 0.29, DUYMA = 22;
  function ayakSesleri(dt) {
    const dx0 = oyun.canli ? oyun.x : Sahne.kamera.position.x, dz0 = oyun.canli ? oyun.z : Sahne.kamera.position.z;
    varliklar.forEach((v, no) => {
      const ben = no === oyun.benimNo;
      const kosuyor = ben ? oyun.canli && oyun.h === 2 : v.h === 2 && v.durum === 0;
      if (!kosuyor) { v.adimT = 0; return; }
      v.adimT = (v.adimT || 0) + dt;
      if (v.adimT < ADIM_ARA) return;
      v.adimT -= ADIM_ARA;
      const d = ben ? 0 : Math.hypot(v.x - dx0, v.z - dz0) + Math.abs(v.y - oyun.y) * 2;
      if (d < DUYMA) Ses.adim(ben ? 0.45 : Math.pow(1 - d / DUYMA, 1.5));
    });
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
    Sahne.kapiCanlandir(dt); Sahne.susAnim(dt);
    ayakSesleri(dt);
    hareket(dt);
    const izleNo = izlenen();
    varliklar.forEach((v, no) => {
      if (no === oyun.benimNo) { v.x = oyun.x; v.z = oyun.z; v.y = oyun.y; v.yaw = oyun.govdeYaw; }
      else {
        const k = Math.min(1, dt * 9);
        if (Math.hypot(v.tx - v.x, v.tz - v.z) > 6) { v.x = v.tx; v.z = v.tz; v.y = v.ty; }
        v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k; v.y += (v.ty - v.y) * k;
        let f = ((v.tyaw - v.yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; v.yaw += f * k;
      }
      v.g.position.set(v.x, v.y, v.z); v.g.rotation.y = v.yaw;
      v.g.visible = !(no === oyun.benimNo && (!oyun.canli || oyun.kamera === 'goz')) && no !== izleNo;
      Karakter.canlandir(v.g, no === oyun.benimNo ? oyun.h : v.h, dt);
    });
    kameraAyarla();
    lazerleriGuncelle();
    berberUstasi(dt);
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
      s.position.y = (s.userData.taban || 0) + 2.9 + Math.sin(t / 400 + i) * 0.15;
      const yapildi = s.userData.gid && oyun.gorunen.has(s.userData.gid);
      const yakin = Math.hypot(s.position.x - oyun.x, s.position.z - oyun.z) < 3.5;   // dibindeyken ekranı kaplamasın
      s.visible = oyun.canli && !yapildi && !yakin && (!s.userData.kilik || oyun.kilik > 0);
    });
    // Eylem düğmesi ve ilerleme
    const e = yakinEylem();
    const b = $('eylemBtn');
    if (e) { b.classList.remove('gizli'); b.classList.toggle('kilik', e.tur === 'kilik'); b.textContent = e.tur === 'gorev' ? `${e.g.emoji} ${e.g.ad}${e.g.agir ? ' · 🔴 ağır suç' : ''}${dokun ? '' : ' (E)'}` : e.tur === 'posta' ? `📬 Posta kutusuna bak${dokun ? '' : ' (E)'}` : `👔 Kılık değiştir (${oyun.kilik})${dokun ? '' : ' (E)'}`; }
    else b.classList.add('gizli');
    if (oyun.is) $('ilerlemeCubuk').style.width = Math.min(100, (t - oyun.is.bas) / (oyun.is.sure * 10)) + '%';
    if (oyun.rol === 'serif' && oyun.canli) $('nisan').classList.toggle('hedefte', nisanHedefi() >= 0);
    const k = Math.max(0, oyun.kalan); $('sureYazi').textContent = `⏱️ ${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')}`;
    if (t - sonHarita > 100) { sonHarita = t; haritaCiz(); }
    Sahne.ciz();
  }

  function hareket(dt) {
    if (!oyun.canli && oyun.serbest) { ruhUcusu(dt); return; }
    if (!oyun.canli && oyun.rol === 'serif') { oyun.h = 0; return; }   // elenen şerif sadece izler, gezemez
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
      if (oyun.canli && oyun.is && !oyun.is.iptalGitti) { oyun.is.iptalGitti = true; Ag.eveGonder({ tip: 'iptal' }); }
      const hiz = !oyun.canli ? HAYALET : kos ? KOS : YURU;
      const nx = oyun.x + mx / ml * hiz * dt * Math.min(1, boy), nz = oyun.z + mz / ml * hiz * dt * Math.min(1, boy);
      if (oyun.canli) { const p = Kasaba.it(nx, nz, 0.35, Kasaba.katOf(oyun.y)); oyun.x = p.x; oyun.z = p.z; oyun.y = Kasaba.zeminY(p.x, p.z, oyun.y); }
      else { oyun.x = Math.max(-110, Math.min(110, nx)); oyun.z = Math.max(-110, Math.min(110, nz)); }
      oyun.h = kos ? 2 : 1;
      const hedefYaw = oyun.kamera === 'goz' || oyun.nisan ? oyun.yaw : Math.atan2(mx, mz);
      let f = ((hedefYaw - oyun.govdeYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      oyun.govdeYaw += f * Math.min(1, dt * 10);
    } else if (oyun.kamera === 'goz' || oyun.nisan) oyun.govdeYaw = oyun.yaw;   // nişan alırken gövde baktığın yöne döner
    if (oyun.is && oyun.h === 0) {   // göreve özel hareket (botlarla aynı)
      oyun.h = Kasaba.animKodu(oyun.is.anim);
      const n = oyun.sonEylem;
      if (n) {
        // görev yerine doğru yavaşça dön (sandalyede sandalyenin yönüne)
        const hedef = oyun.is.kay ? (n.yon ?? oyun.govdeYaw) : Math.atan2(n.x - oyun.x, n.z - oyun.z);
        if (Math.hypot(n.x - oyun.x, n.z - oyun.z) > 0.3 || oyun.is.kay) {
          const f = ((hedef - oyun.govdeYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
          oyun.govdeYaw += f * Math.min(1, dt * 6);
        }
        if (oyun.is.kay) { oyun.x += (oyun.is.kay.x - oyun.x) * Math.min(1, dt * 8); oyun.z += (oyun.is.kay.z - oyun.z) * Math.min(1, dt * 8); }
      }
    }
    const t = performance.now();
    if (oyun.canli && t - oyun.sonGonder > 66) {
      oyun.sonGonder = t;
      Ag.eveGonder({ tip: 'konum', x: Math.round(oyun.x * 100) / 100, z: Math.round(oyun.z * 100) / 100, y: Math.round(oyun.y * 100) / 100, n: oyun.nisan && oyun.canli ? Math.round(oyun.pitch * 100) / 100 : null, yaw: Math.round(oyun.govdeYaw * 100) / 100, h: oyun.h });
    }
  }

  // Ölen oyuncu ruh olarak uçar: baktığı yöne gider, duvarlardan geçer, kimse görmez
  function ruhUcusu(dt) {
    let ileri = 0, yan = 0, dik = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) ileri += 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) ileri -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) yan += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) yan -= 1;
    if (tuslar.has('Space')) dik += 1;
    if (tuslar.has('KeyC')) dik -= 1;
    if (joy.id !== null) { ileri -= joy.y; yan += joy.x; }
    const hiz = (tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') || oyun.kos ? 16 : 7) * dt;
    const cp = Math.cos(oyun.pitch), s = Math.sin(oyun.yaw), c = Math.cos(oyun.yaw);
    oyun.x += (s * cp * ileri - c * yan) * hiz;
    oyun.z += (c * cp * ileri + s * yan) * hiz;
    oyun.ruhY = (oyun.ruhY ?? oyun.y + 1.7) + (Math.sin(oyun.pitch) * ileri + dik) * hiz;
    oyun.x = Math.max(-115, Math.min(115, oyun.x)); oyun.z = Math.max(-115, Math.min(115, oyun.z));
    oyun.ruhY = Math.max(0.4, Math.min(70, oyun.ruhY));
    oyun.h = 0;
  }
  function kameraAyarla() {
    const k = Sahne.kamera;
    if (!oyun.canli && oyun.serbest) {   // ruh: gözünden uçuş
      const cp = Math.cos(oyun.pitch), dd = new THREE.Vector3(Math.sin(oyun.yaw) * cp, Math.sin(oyun.pitch), Math.cos(oyun.yaw) * cp);
      k.position.set(oyun.x, oyun.ruhY ?? oyun.y + 1.7, oyun.z);
      k.lookAt(k.position.x + dd.x, k.position.y + dd.y, k.position.z + dd.z);
      return;
    }
    // Elenmiş: takım arkadaşının gözünden bak
    const izNo = izlenen(), iv = izNo != null ? varliklar.get(izNo) : null;
    if (iv) {
      const p = iv.nisan ?? -0.04, cp = Math.cos(p), dd = new THREE.Vector3(Math.sin(iv.yaw) * cp, Math.sin(p), Math.cos(iv.yaw) * cp);
      k.position.set(iv.x + Math.sin(iv.yaw) * 0.2, iv.y + 1.62 * iv.g.scale.y, iv.z + Math.cos(iv.yaw) * 0.2);
      k.lookAt(k.position.x + dd.x, k.position.y + dd.y, k.position.z + dd.z);
      oyun.x = iv.x; oyun.z = iv.z; oyun.y = iv.y;   // harita da onu göstersin
      return;
    }
    const cp = Math.cos(oyun.pitch), d = new THREE.Vector3(Math.sin(oyun.yaw) * cp, Math.sin(oyun.pitch), Math.cos(oyun.yaw) * cp);
    const v = varliklar.get(oyun.benimNo);
    const boy = v ? v.g.scale.y : 1;
    if (oyun.kamera === 'goz' && oyun.canli) {
      k.position.set(oyun.x + Math.sin(oyun.yaw) * 0.18, oyun.y + 1.66 * boy, oyun.z + Math.cos(oyun.yaw) * 0.18);
    } else {
      const yuk = oyun.canli ? 1.75 : 2.6, uzak = oyun.canli ? 3.6 : 5;
      const sagx = -Math.cos(oyun.yaw) * 0.55, sagz = Math.sin(oyun.yaw) * 0.55;
      const bx = oyun.x + sagx, bz = oyun.z + sagz;
      const l2 = Math.hypot(d.x, d.z) || 1;
      const serbest = oyun.canli ? Math.max(0.6, Math.min(uzak, Kasaba.isin(bx, bz, -d.x / l2, -d.z / l2, uzak + 0.4, Kasaba.katOf(oyun.y)) - 0.4)) : uzak;
      k.position.set(bx - d.x * serbest, Math.max(oyun.y + 0.4, oyun.y + yuk - d.y * serbest), bz - d.z * serbest);
      // Bina içindeyken kamera tavanı delmesin
      if (oyun.canli) k.position.y = Math.min(k.position.y, Kasaba.tavan(oyun.x, oyun.z, oyun.y), Kasaba.tavan(k.position.x, k.position.z, oyun.y));
      // Şerif odasındayken kamera çatının üstüne çıkmasın
      const so = Kasaba.serifOdasi;
      if (oyun.canli && Math.abs(oyun.x - so.x) < so.g / 2 && Math.abs(oyun.z - so.z) < so.d / 2) k.position.y = Math.min(k.position.y, so.y - 0.3);
    }
    k.lookAt(k.position.x + d.x, k.position.y + d.y, k.position.z + d.z);
  }
})();
