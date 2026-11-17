// =============================================================
// Sahte Haydut - oyuncunun ekranı: giriş/lobi, kamera, yürüme, ateş, görev, harita, bildirim, ses
// =============================================================

(() => {
  const $ = id => document.getElementById(id);
  const dokun = matchMedia('(pointer: coarse)').matches;   // sadece parmakla kullanılan cihaz (dokunmatik dizüstü fareyle oynar)
  if (dokun) document.body.classList.add('dokun');
  const YURU = 1.6, KOS = 4.6, HAYALET = 7;
  const SERIF_RENK = '#ffc61a', TAKIM_RENK = '#33ff55', HEDEF_RENK = '#ff2a2a';

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
  const SURUM = 29;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
  { const s = document.getElementById('surumYazi'); if (s) s.textContent = 'Sürüm ' + SURUM; }
  const EKLER = ['kan', 'ceset', 'toz', 'arama', 'durbun', 'kopek', 'tanik', 'posta'];
  const EK_EMOJI = { kan: '🩸', ceset: '🗺️', toz: '💨', arama: '🔎', durbun: '🔭', kopek: '🐕', tanik: '👉', posta: '📬' };
  const ekId = k => 'ek' + k[0].toUpperCase() + k.slice(1);
  ['ayRolMod', 'ayHaydut', 'ayHak', 'aySure', 'ayHedef', 'ayOldur', 'ayKasabali', 'ayKilik', ...EKLER.map(ekId)].forEach(id => $(id)?.addEventListener('change', () => ayarYay()));
  function ayarOku() {
    return { rolMod: $('ayRolMod').value, haydut: +$('ayHaydut').value || 1, hak: +$('ayHak').value, sure: +$('aySure').value, hedef: +$('ayHedef').value, kasabali: +$('ayKasabali').value, kilik: +$('ayKilik').value, oldur: +$('ayOldur').value, ek: Object.fromEntries(EKLER.map(k => [k, !!$(ekId(k))?.checked])) };
  }
  const ayarYazi = a => `${a.rolMod === 'rastgele' ? `🎲 Rastgele: 🦹 ${a.haydut} haydut · ⭐ ${Math.max(1, Ag.oyuncular.length - a.haydut)} şerif` : '🎭 Roller: herkes kendi seçer'} · 🔫 ${a.hak} hak · ⏱️ ${a.sure} dk · 🎯 ${a.hedef} görev${a.oldur ? ` · 🔪 ${a.oldur} kişi` : ''} · 👥 ${a.kasabali} kasabalı · 👔 ${a.kilik} kılık${(() => { const l = EKLER.filter(k => a.ek?.[k]); return l.length ? ' · 🕵️ ' + l.map(k => EK_EMOJI[k]).join('') : ''; })()}`;
  function ayarYay(listedenGeldi) {
    if (!Ag.evMi) return;
    const a = ayarOku(), degisti = a.rolMod !== lobiAyar.rolMod; lobiAyar = a;
    $('ayarOzet').textContent = ayarYazi(a); Ag.yayinla({ tip: 'ayar', ayar: a, surum: SURUM });
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
      case 'ayar': if (!Ag.evMi && m.surum !== SURUM) $('lobiDurum').innerHTML = `⚠️ <b>Sürümün farklı!</b> Oda sahibi: ${m.surum ?? 'eski'}, sen: ${SURUM}. Daha eski olan sayfayı yenilesin (gerekirse kapatıp aç).`;
        if (!Ag.evMi) { const degisti = m.ayar.rolMod !== lobiAyar.rolMod; $('ayarOzet').textContent = ayarYazi(m.ayar); lobiAyar = m.ayar; if (degisti) lobiListesi(Ag.oyuncular); else rolDugmeleri(); } break;
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
      case 'hedefler': if (oyun) { if (oyun.rol === 'haydut' && oyun.hedefBekle && !m.bekle && m.gerek) { toast(`🔪 Hedefler belli oldu!<br><small>Kırmızı çerçeveli ${m.gerek - m.oldurulen} kişiyi gizlice bıçakla</small>`, 3000); Ses.bildirim(); } oyun.hedefBekle = m.bekle; oyun.hedefler = new Set(m.nolar); oyun.oldurulen = m.oldurulen; oyun.oldurGerek = m.gerek; hedefCizgileri(); hudGuncelle(); } break;
      case 'cinayet': if (oyun) {
        oyun.oldurulen = m.oldurulen; hudGuncelle();
        if (oyun.rol === 'serif') {
          if (m.x !== undefined) { oyun.darbe.push({ x: m.x, z: m.z, bas: performance.now(), sure: 8000, ceset: true }); oyun.cesetler.push({ x: m.x, z: m.z }); }   // ceset haritada yanar, kurukafa kalır
          toast(`🔪 Bir kasabalı bıçaklandı!<br><small>${m.x !== undefined ? 'Yeri haritanda kırmızı yanıyor!' : 'Cesedi yerde yatıyor, etrafa bak'}</small>`, 2600); akisEkle(`🔪 Bir kasabalı bıçaklandı (${m.oldurulen}/${m.gerek})`, 'kotu'); Ses.kotu();
        }
        else { akisEkle(`🔪 Hedef bıçaklandı (${m.oldurulen}/${m.gerek})${m.kim ? ' – ' + m.kim : ''}`, 'takim'); Ses.gorev(); }
      } break;
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
          if (oyun.rol === 'serif') { oyun.gorevSayi = m.toplam ?? m.n; Ses.posta(); toast('📬 Posta kutularına yeni bilgi geldi!<br><small>Hangi görev olduğunu görmek için bir kutuya git</small>', 2600); hudGuncelle(); }
        }
        if (oyun) { oyun.postaN = m.n; if (oyun.rol === 'serif' && m.toplam !== undefined && oyun.gorevSayi !== m.toplam) { oyun.gorevSayi = m.toplam; hudGuncelle(); } }
        break;
      case 'postaListe': if (oyun) postaListesi(m.ids, m.kim, m.gecen); break;
      case 'kan': if (oyun) { oyun.kanli.set(m.no, performance.now() + m.sure * 1000); const v = varliklar.get(m.no); if (v) Karakter.kanEkle(v.g, true); if (m.no === oyun.benimNo) toast(`🩸 Elin kanlandı!<br><small>${m.sure} sn boyunca şerifler görebilir</small>`, 2400); } break;
      case 'araniyor': if (oyun) aranıyorum(m); break;
      case 'arama': if (oyun) aramaSonucu(m); break;
      case 'kopek': if (oyun) { oyun.kopek = m.kalan; hudGuncelle(); toast(m.buldu ? '🐕 Köpek havlıyor!<br><small>10 m içinde bir haydut var</small>' : '🐕 Köpek sakin<br><small>Yakınında haydut yok</small>', 2600); if (!m.buldu) Ses.inle(); } break;
      case 'havla': if (oyun) havlamaGoster(m); break;
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
      gorevSayi: 0, yapilan: new Set(), gorunen: new Set(), hedefler: new Set(), oldurulen: 0, oldurGerek: m.ayar.oldur || 0, bicakBitis: 0, bicakHedef: null, kalanHakki: 1, kalan: m.sure, sonGonder: 0, sonAtes: 0, darbe: [],
      ek: m.ayar.ek || {}, kanli: new Map(), cesetler: [], kopek: m.ayar.ek?.kopek ? 2 : 0, donmaBitis: 0, arananBitis: 0, durbun: false, fov: 70,
    };
    if (oyun.rol === 'serif') {   // seçilen yardımcıları şerife anlat
      const l = [oyun.ek.arama && '🔎 Yanına yanaşıp E: üstünü ara', oyun.ek.durbun && '🔭 Z: dürbün', oyun.ek.kopek && '🐕 B: köpeği koklat (2 kez)', oyun.ek.kan && '🩸 Kanlı eller bıçaklayanı ele verir', oyun.ek.ceset && '🗺️ Ceset haritada yanar', oyun.ek.tanik && '👉 Tanıklar katili parmakla gösterir', oyun.ek.toz && '💨 Koşanlar toz kaldırır', oyun.ek.posta && '📬 Posta daha hızlı'].filter(Boolean);
      if (l.length) setTimeout(() => { if (oyun) akisEkle('🕵️ ' + l.join(' · '), 'iyi'); }, 50);
    } else if (oyun.ek.kan || oyun.ek.tanik || oyun.ek.toz || oyun.ek.arama) {
      const l = [oyun.ek.kan && '🩸 bıçaklayınca elin 25 sn kanlı görünür', oyun.ek.tanik && '👉 yakındaki kasabalılar seni parmakla gösterir', oyun.ek.toz && '💨 koşarsan toz kaldırırsın', oyun.ek.arama && '🔎 şerifler üstünü arayabilir (kaçarsan şüphelenir)'].filter(Boolean);
      setTimeout(() => { if (oyun) akisEkle('⚠️ Dikkat: ' + l.join(' · '), 'kotu'); }, 50);
    }
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
      akisEkle(`🦹 Haydutsun. Sarı işaretli görevleri yap, kalabalığa karış. Hedef: ${m.ayar.hedef} görev${m.ayar.oldur ? ` + ${m.ayar.oldur} kişiyi gizlice bıçakla (hedefler şerifler odadan çıkınca kırmızı çerçeveyle belli olacak)` : ''}.`, 'takim');
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
    tozlar.forEach(p => Sahne.scene?.remove(p)); tozlar.length = 0;
    durbunAyarla(false);
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

  // Haydut: bıçaklanacak kasabalılar kırmızı çerçeveli (duvar arkasından da görünür)
  function hedefCizgileri() {
    if (oyun.rol !== 'haydut') return;
    varliklar.forEach((v, no) => {
      const ol = oyun.hedefler.has(no) && v.durum === 0;
      if (ol && !v.g.userData.hedef) { Karakter.cizgiEkle(v.g, HEDEF_RENK); v.g.userData.hedef = true; }
      else if (!ol && v.g.userData.hedef) { Karakter.cizgiKaldir(v.g); v.g.userData.hedef = false; }
    });
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
          else if (oyun.rol === 'haydut' && oyun.hedefler.has(no) && durum === 0) { Karakter.cizgiEkle(g, HEDEF_RENK); g.userData.hedef = true; }
        }
        Sahne.scene.add(g);
        if ((oyun.kanli.get(no) || 0) > performance.now()) Karakter.kanEkle(g, true);
        v = { g, tip, x: v?.x ?? x, z: v?.z ?? z, y: v?.y ?? y, yaw: v?.yaw ?? yaw, tx: x, tz: z, ty: y, tyaw: yaw, h, durum };
        varliklar.set(no, v);
      }
      v.tx = x; v.tz = z; v.ty = y; v.tyaw = yaw; v.h = h; v.nisan = nisan;
      if ((durum === 1 || durum === 3) && !v.g.userData.olum) { v.g.userData.olum = 0.01; Karakter.cizgiKaldir(v.g); v.g.userData.hedef = false; }
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
    if (e.code === 'KeyZ') durbunAyarla(!oyun.durbun);
    if (e.code === 'KeyB') kopekKoklat();
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
    const h = 0.004 * oyun.fov / 70;
    oyun.yaw -= e.movementX * h; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - e.movementY * h));
  });
  document.addEventListener('mousemove', e => {
    if (!oyun || document.pointerLockElement !== kanvas) return;
    const h = 0.0024 * oyun.fov / 70;
    oyun.yaw -= e.movementX * h; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - e.movementY * h));
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
        const h = oyun.fov / 70;
        oyun.yaw -= (t.clientX - bakis.x) * 0.006 * h; oyun.pitch = Math.max(-1.25, Math.min(1.1, oyun.pitch - (t.clientY - bakis.y) * 0.005 * h));
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
  $('durbunBtn').onclick = () => { if (oyun) durbunAyarla(!oyun.durbun); };
  $('kopekBtn').onclick = () => kopekKoklat();
  function durbunAyarla(acik) {
    if (oyun && (oyun.rol !== 'serif' || !oyun.canli || !oyun.ek.durbun)) acik = false;
    if (oyun) oyun.durbun = acik;
    $('durbunBtn').classList.toggle('basili', !!acik); $('durbunGoz').classList.toggle('gizli', !acik);
  }
  function kopekKoklat() {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli || !oyun.ek.kopek) return;
    if (!oyun.kapiAcik) { toast('🔒 Kapı açılmadan köpek çıkamaz', 1200); return; }
    if (oyun.kopek <= 0) { toast('🐕 Köpek hakkın bitti', 1200); return; }
    Ag.eveGonder({ tip: 'kopek' });
  }
  // Köpek havladı: herkes duyar (yakındaysa yüksek), şerifin üstünde 🐕 belirir
  function havlamaGoster(m) {
    const d = Math.hypot(m.x - oyun.x, m.z - oyun.z);
    if (m.buldu) { Ses.havla(Math.max(0, 1 - d / 40)); if (d < 20 && m.no !== oyun.benimNo && oyun.rol === 'haydut') toast('🐕 Yakında bir köpek havlıyor!', 1800); }
    const v = varliklar.get(m.no); if (!v) return;
    const s = emojiSprite('🐕', m.buldu ? '#c0302acc' : '#6a7a8acc'); s.scale.set(1.1, 1.1, 1);
    s.position.set(v.x, v.y + 2.7, v.z); Sahne.scene.add(s);
    const bas = performance.now(), takip = () => { const w = varliklar.get(m.no); if (w) s.position.set(w.x, w.y + 2.7 + Math.sin((performance.now() - bas) / 120) * 0.08, w.z); if (performance.now() - bas < 2500 && oyun) requestAnimationFrame(takip); else Sahne.scene?.remove(s); };
    takip();
  }
  // Haydut: şerif üstümü arıyor
  function aranıyorum(m) {
    if (m.bitti) { oyun.arananBitis = 0; if (m.kacti) toast('😰 Kaçtın! Şerif şüphelendi', 2000); else toast('😌 Şerif bir şey bulamadı', 1800); return; }
    oyun.arananBitis = performance.now() + m.sure * 1000;
    toast(`⭐ ${kacis(m.kim)} üstünü arıyor!<br><small>${oyun.rol === 'haydut' ? 'Durursan yakalanırsın, uzaklaşırsan şüphelenir…' : 'Kıpırdama'}</small>`, 2600); Ses.kotu();
  }
  function aramaSonucu(m) {
    if (m.sonuc === 'haydut') { toast(`🔗 Haydut yakalandı: ${kacis(m.ad)}!`, 2600); Ses.kelepce(); }
    else if (m.sonuc === 'masum') { oyun.donmaBitis = performance.now() + m.sure * 1000; toast(`😬 Masum çıktı! Özür dile…<br><small>${m.sure} sn kıpırdayamaz, ateş edemezsin</small>`, 2400); Ses.kotu(); }
    else if (m.sonuc === 'kacti') { toast('🏃 Şüpheli uzaklaştı!<br><small>Kasabalılar aramadan kaçmaz… bu bir oyuncu olabilir!</small>', 2800); Ses.posta(); }
  }
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
      if (k) return { tur: 'posta', k };
      if (!oyun.ek.arama || !oyun.kapiAcik || performance.now() < oyun.donmaBitis) return null;
      // üst arama: en yakın (tercihen önündeki) kişi
      const b = Kasaba.icBina(oyun.x, oyun.z); let en = null, ed = 1.9;
      varliklar.forEach((v, no) => {
        if (no === oyun.benimNo || oyun.serifler.has(no) || v.durum !== 0 || Math.abs(v.y - oyun.y) > 1.2 || Kasaba.icBina(v.x, v.z) !== b) return;
        const dx = v.x - oyun.x, dz = v.z - oyun.z, d = Math.hypot(dx, dz);
        const on = (dx * Math.sin(oyun.yaw) + dz * Math.cos(oyun.yaw)) / (d || 1);   // önümdeyse daha öncelikli
        const p = d - Math.max(0, on) * 0.6;
        if (d < ed && (!en || p < en.p)) en = { tur: 'ara', no, v, p };
      });
      return en;
    }
    let en = null, ed = 2.4;
    if (oyun.rol === 'haydut' && oyun.hedefler.size) {   // kırmızı çerçeveli hedef kasabalı yakındaysa bıçakla
      const b = Kasaba.icBina(oyun.x, oyun.z); let hd = 1.9;
      oyun.hedefler.forEach(no => { const v = varliklar.get(no); if (!v || v.durum !== 0 || Math.abs(v.y - oyun.y) > 1.2 || Kasaba.icBina(v.x, v.z) !== b) return; const d = Math.hypot(v.x - oyun.x, v.z - oyun.z); if (d < hd) { hd = d; en = { tur: 'oldur', no, v }; } });
      if (en) return en;
    }
    const bina = Kasaba.icBina(oyun.x, oyun.z);   // duvarın öbür yanındaki görev yapılamaz: aynı binada (ya da ikiniz de dışarıda) olmalısınız
    Kasaba.gorevler.forEach(g => { if (!oyun.aktif.has(g.id) || oyun.gorunen.has(g.id) || Math.abs(g.y - oyun.y) > 1.5 || Kasaba.icBina(g.x, g.z) !== bina) return; const d = Math.hypot(g.x - oyun.x, g.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'gorev', g }; } });
    if (!en && oyun.kilik > 0) Kasaba.kiliklar.forEach(k => { if (!oyun.kilikYerleri.has(k.id) || Kasaba.icBina(k.x, k.z) !== bina) return; const d = Math.hypot(k.x - oyun.x, k.z - oyun.z); if (d < ed) { ed = d; en = { tur: 'kilik', k }; } });
    return en;
  }
  function eylem() {
    const e = yakinEylem(); if (!e) return;
    if (e.tur === 'posta') { Ag.eveGonder({ tip: 'posta' }); return; }
    if (e.tur === 'ara') { oyun.sonEylem = { x: e.v.x, z: e.v.z }; oyun.sonAnim = 'ara'; oyun.sonTur = 'ara'; Ag.eveGonder({ tip: 'ara', no: e.no }); return; }
    if (e.tur === 'oldur') {   // bıçak sadece bu an görünür
      if (performance.now() < oyun.bicakBitis) return;
      oyun.bicakBitis = performance.now() + 900; oyun.bicakHedef = { x: e.v.x, z: e.v.z };
      Ag.eveGonder({ tip: 'oldur', no: e.no }); return;
    }
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
      if (m.bitti && !m.sessiz) { Ses.gorev(); if (m.kilik !== undefined) { oyun.kilik = m.kilik; toast('👔 Kılığın değişti!', 1600); hudGuncelle(); } }
      else if (m.yapilmis) { oyun.gorunen.add(m.yapilmis); toast('Bu görev zaten yapılmış!', 1600); hudGuncelle(); }
      else if (m.iptal && !m.sessiz) toast('Yarıda kaldı', 900);
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
    if (m.gid && !String(m.gid).startsWith('kilik:')) { oyun.yapilan.add(m.gid); if (oyun.rol === 'haydut') { oyun.gorunen.add(m.gid); hudGuncelle(); } }   // takım arkadaşının yaptığı görev haydutta anında silinir
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
  // Şerifin namlusundan çıkan ışın (lazer ve atış aynı çizgiden)
  function silahIsini(v, yaw, p) {
    const boy = v.g.scale.y, cp = Math.cos(p);
    const d = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(p), Math.cos(yaw) * cp);
    const o = new THREE.Vector3(v.x - Math.cos(yaw) * 0.35, v.y + 1.48 * boy, v.z + Math.sin(yaw) * 0.35).addScaledVector(d, 0.95);
    return { o, d };
  }
  const ustenNisan = () => oyun.nisan && oyun.canli && oyun.kamera !== 'goz' && !oyun.kameraYakin;
  function nisanHedefi() {
    const v = varliklar.get(oyun.benimNo);
    if (ustenNisan() && v) {   // kamera üstten bakıyor: atış lazerin çizgisinden gider
      const { o, d } = silahIsini(v, oyun.yaw, oyun.pitch);
      return isinAt(o.x, o.y, o.z, d, oyun.benimNo, oyun.y).no;
    }
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
        ({ o, d } = silahIsini(v, ben ? oyun.yaw : v.yaw, p));
      }
      const h = isinAt(o.x, o.y, o.z, d, no, v.y), L = Math.max(0.05, h.t);
      if (ben) oyun.lazerT = L;
      l.cizgi.position.copy(o).addScaledVector(d, L / 2);
      l.cizgi.quaternion.setFromUnitVectors(YUKARI, d);
      const kal = l.ince ? 0.3 : 1;   // kendi gözümden bakarken ince görünsün
      l.cizgi.scale.set(kal, L, kal);
      l.nokta.position.copy(o).addScaledVector(d, L);
    });
    lazerler.forEach((l, no) => { if (!gorulen.has(no)) { Sahne.scene.remove(l.cizgi, l.nokta); lazerler.delete(no); } });
    // Üstten nişanda nişangâh lazerin bittiği noktada dursun
    const ni = $('nisan'), bl = lazerler.get(oyun.benimNo);
    if (ustenNisan() && bl) {
      const e = bl.nokta.position.clone().project(Sahne.kamera);
      ni.style.left = ((e.x + 1) / 2 * 100).toFixed(2) + '%'; ni.style.top = ((1 - e.y) / 2 * 100).toFixed(2) + '%';
    } else if (ni.style.left) { ni.style.left = ''; ni.style.top = ''; }
  }
  function ates() {
    if (!oyun || oyun.rol !== 'serif' || !oyun.canli) return;
    if (!oyun.kapiAcik) { toast('🔒 Kapı açılmadan ateş edemezsin', 1200); return; }
    const t = performance.now(); if (t - oyun.sonAtes < 1900) return;
    if (t < oyun.donmaBitis) { toast('😬 Masumu aradın, biraz bekle', 1000); return; }
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
    const yazi = m.neden === 'hapis' ? '⛓️ Hapse girdin! Masum kasabalıları vurdun.' : m.neden === 'yakalandi' ? `🔗 Yakalandın! ${kacis(m.kim || 'Şerif')} üstünü aradı.` : `💀 Vuruldun! (${kacis(m.kim || 'şerif')})`;
    if (m.neden === 'yakalandi') Ses.kelepce();
    durbunAyarla(false);
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
    $('gorevSayac').textContent = `🎯 Görev: ${oyun.gorevSayi}/${oyun.ayar.hedef}${oyun.oldurGerek ? ` · 🔪 ${oyun.oldurulen}/${oyun.oldurGerek}` : ''}`;
    $('aranmaYazi').innerHTML = `${oyun.rol === 'serif' ? '🔎 İpucu' : '🚨 Aranma'}: <b>${'★'.repeat(oyun.aranma)}</b><i>${'☆'.repeat(6 - oyun.aranma)}</i>`;
    $('aranmaYazi').className = oyun.aranma >= 5 ? 'yuksek' : oyun.aranma >= 3 ? 'orta' : '';
    gorevListesi();
    $('hakYazi').textContent = oyun.rol === 'serif' ? `🔫 Hak: ${oyun.hak}` : `👔 Kılık: ${oyun.kilik}`;
    const serif = oyun.rol === 'serif' && oyun.canli;
    $('atesBtn').classList.toggle('gizli', !serif || !dokun);
    $('muhbirBtn').classList.toggle('gizli', !serif);
    $('nisanBtn').classList.toggle('gizli', !serif || !dokun);
    $('durbunBtn').classList.toggle('gizli', !serif || !oyun.ek.durbun);
    $('kopekBtn').classList.toggle('gizli', !serif || !oyun.ek.kopek);
    $('kopekBtn').textContent = `🐕${oyun.kopek}`; $('kopekBtn').disabled = oyun.kopek <= 0;
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
      : `<li class="not">✅ Sen ya da takım arkadaşın bir görevi yapınca anında silinir</li>`;
    const bicakSatir = oyun.oldurGerek ? `<li class="${oyun.oldurulen >= oyun.oldurGerek ? 'yapildi' : ''} agir">🔪 ${oyun.rol === 'haydut' ? 'Kırmızı çerçeveli kişileri bıçakla' : 'Bıçaklanan kasabalı'}: ${oyun.oldurulen}/${oyun.oldurGerek}</li>` : '';
    $('gorevListe').innerHTML = ust + bicakSatir + Kasaba.gorevler.filter(g => oyun.aktif.has(g.id)).map(g => `<li class="${oyun.gorunen.has(g.id) ? 'yapildi' : ''} ${g.agir ? 'agir' : ''}">${g.agir ? '🔴' : '🟡'} ${g.emoji} ${kacis(g.ad)}</li>`).join('');
    const kb = $('kalanBtn'); if (kb) kb.onclick = kalanlariGoster;
  }
  // Haydut: 1 kerelik — o ana kadar yapılmış görevlerin üstü çizilir
  function kalanlariGoster() {
    if (!oyun || oyun.rol !== 'haydut' || oyun.kalanHakki <= 0) return;
    oyun.kalanHakki = 0; oyun.gorunen = new Set(oyun.yapilan);
    toast(`🔍 ${oyun.aktif.size - [...oyun.gorunen].filter(g => oyun.aktif.has(g)).length} görev kaldı`, 2000); hudGuncelle();
  }
  function postaListesi(ids, kim, gecen = []) {
    // Sağdaki akışa: yeni öğrenilen görevler ve kaç saniye önce yapıldıkları (eskiden yeniye)
    const yeniler = ids.map((id, i) => ({ id, s: gecen[i] ?? 0 })).filter(k => !oyun.gorunen.has(k.id)).sort((a, b) => b.s - a.s);
    yeniler.forEach(k => { const g = Kasaba.gorevler.find(x => x.id === k.id); if (g) akisEkle(`📬 ${g.emoji} ${g.olay}${g.agir ? ' 🔴' : ''}`, '', k.s); });
    if (!yeniler.length) akisEkle('📬 Posta kutusunda yeni haber yok');
    oyun.gorunen = new Set(ids);
    toast(kim ? `📬 ${kacis(kim)} posta kutusuna baktı: ${ids.length} görev yapılmış<br><small>Listende üstü çizildi</small>` : `📬 Posta kutusu: ${ids.length} görev yapılmış<br><small>Kutudaki sayı sıfırlandı; yeni haber gelince yine artar</small>`, 2600);
    if (!kim) $('gorevListe').classList.remove('gizli');
    hudGuncelle(); Ses.bildirim();
  }
  let toastSayac = null;
  function toast(html, ms = 2000) { const t = $('toast'); t.innerHTML = html; t.classList.add('goster'); clearTimeout(toastSayac); toastSayac = setTimeout(() => t.classList.remove('goster'), ms); }
  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Kanlı el süresi ve toz bulutu ----------
  const tozlar = [], tozGeo = new THREE.SphereGeometry(0.28, 7, 5);
  const damlaGeo = new THREE.SphereGeometry(0.05, 6, 4), damlaMat = new THREE.MeshBasicMaterial({ color: '#c00808' });
  function kanVeToz(dt, t) {
    oyun.kanli.forEach((bitis, no) => {
      const v = varliklar.get(no);
      if (t > bitis) { oyun.kanli.delete(no); if (v) Karakter.kanEkle(v.g, false); return; }
      if (!v || v.durum !== 0 || (no === oyun.benimNo && oyun.kamera === 'goz')) return;
      if (v.g.visible && !v.g.userData.kan) Karakter.kanEkle(v.g, true);   // yeniden kurulduysa
      v.damlaT = (v.damlaT || 0) + dt; if (v.damlaT < 0.35) return; v.damlaT = 0;   // elinden kan damlar
      const m = new THREE.Mesh(damlaGeo, damlaMat); const s = Math.random() < 0.5 ? 1 : -1;
      m.position.set(v.x + Math.cos(v.yaw) * 0.33 * s, v.y + 0.95, v.z - Math.sin(v.yaw) * 0.33 * s);
      m.userData = { damla: true, yas: 0, vy: 0 }; Sahne.scene.add(m); tozlar.push(m);
    });
    if (oyun.ek.toz) {
      const kx = Sahne.kamera.position.x, kz = Sahne.kamera.position.z;
      varliklar.forEach((v, no) => {
        const ben = no === oyun.benimNo;
        const kosuyor = ben ? oyun.canli && oyun.h === 2 : v.h === 2 && v.durum === 0;
        if (!kosuyor || Math.hypot(v.x - kx, v.z - kz) > 60 || v.y > 0.3) { v.tozT = 0; return; }   // içeride üst katta toz yok
        v.tozT = (v.tozT || 0) + dt; if (v.tozT < 0.09 || tozlar.length > 140) return; v.tozT = 0;
        const m = new THREE.Mesh(tozGeo, new THREE.MeshLambertMaterial({ color: '#b8925e', transparent: true, opacity: 0.75, depthWrite: false }));
        m.position.set(v.x + (Math.random() - 0.5) * 0.4 - Math.sin(v.yaw) * 0.3, 0.2, v.z + (Math.random() - 0.5) * 0.4 - Math.cos(v.yaw) * 0.3);
        m.userData = { yas: 0, vy: 0.35 + Math.random() * 0.3 }; Sahne.scene.add(m); tozlar.push(m);
      });
    }
    for (let i = tozlar.length - 1; i >= 0; i--) {
      const m = tozlar[i], u = m.userData; u.yas += dt;
      if (u.damla) {   // düşen kan damlası, yerde 4 sn leke olarak kalır
        if (!u.yerde) { u.vy -= 9.8 * dt; m.position.y += u.vy * dt; const zy = Kasaba.zeminY(m.position.x, m.position.z, m.position.y); if (m.position.y <= zy + 0.02) { u.yerde = true; m.position.y = zy + 0.02; m.scale.set(2.2, 0.15, 2.2); } }
        if (u.yas > 4.5) { Sahne.scene.remove(m); tozlar.splice(i, 1); }
        continue;
      }
      m.position.y += u.vy * dt; m.scale.setScalar(1 + u.yas * 2.2); m.material.opacity = 0.75 * Math.max(0, 1 - u.yas / 1.3);
      if (u.yas > 1.3) { Sahne.scene.remove(m); m.material.dispose(); tozlar.splice(i, 1); }
    }
  }

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
      oyun.hedefler.forEach(no => { const v = varliklar.get(no); if (v && v.durum === 0) nokta(v.x, v.z, 4, HEDEF_RENK, '#fff'); });   // bıçaklanacak kişiler
    }
    else if (oyun.rol === 'serif') {   // şerif: kalan görevlerin yerleri (posta kutusundan öğrendiği yapılmışlar silinir)
      x.font = `${Math.round(14 * olcek)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      Kasaba.gorevler.forEach(g => { if (oyun.aktif.has(g.id) && !oyun.gorunen.has(g.id)) { nokta(g.x, g.z, 9, g.agir ? '#ff8a7ae6' : '#ffe9a8e6', g.agir ? '#c01010' : '#3a2a10'); x.fillText(g.emoji, PX(g.x), PZ(g.z) + olcek); } });
    }
    const t = performance.now();
    oyun.darbe = oyun.darbe.filter(d => t - d.bas < (d.sure || 9000));
    oyun.darbe.forEach(d => { const k = ((t - d.bas) % 1500) / 1500; x.beginPath(); x.arc(PX(d.x), PZ(d.z), (5 + k * 22) * olcek, 0, 7); x.strokeStyle = `rgba(255,60,40,${1 - k})`; x.lineWidth = 3; x.stroke(); nokta(d.x, d.z, 4, '#ff3a2a'); });
    // Cesetler (şerif): oyun boyunca 💀; görünen alanın dışındaysa kenarda yönünü gösteren kırmızı ok
    x.font = `${Math.round(15 * olcek)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    oyun.cesetler.forEach(c => x.fillText('💀', PX(c.x), PZ(c.z)));
    oyun.darbe.filter(d => d.ceset).forEach(d => {
      const px = PX(d.x), pz = PZ(d.z), p = 14 * olcek;
      if (px >= p && px <= N - p && pz >= p && pz <= N - p) return;
      const a = Math.atan2(pz - N / 2, px - N / 2), kx = Math.max(p, Math.min(N - p, px)), kz = Math.max(p, Math.min(N - p, pz));
      x.save(); x.translate(kx, kz); x.rotate(a); x.scale(olcek, olcek);
      x.beginPath(); x.moveTo(12, 0); x.lineTo(-7, -8); x.lineTo(-7, 8); x.closePath();
      x.fillStyle = (t / 250) % 2 < 1 ? '#ff2a1a' : '#ffffff'; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); x.restore();
    });
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
      v.g.visible = !(no === oyun.benimNo && (!oyun.canli || oyun.kamera === 'goz' || oyun.kameraYakin)) && no !== izleNo;
      Karakter.canlandir(v.g, no === oyun.benimNo ? oyun.h : v.h, dt);
    });
    kanVeToz(dt, t);
    { const hedefFov = oyun.durbun ? 22 : 70; oyun.fov += (hedefFov - oyun.fov) * Math.min(1, dt * 8);
      if (Math.abs(Sahne.kamera.fov - oyun.fov) > 0.05) { Sahne.kamera.fov = oyun.fov; Sahne.kamera.updateProjectionMatrix(); } }
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
    if (e) { b.classList.remove('gizli'); b.classList.toggle('kilik', e.tur === 'kilik'); b.textContent = e.tur === 'gorev' ? `${e.g.emoji} ${e.g.ad}${e.g.agir ? ' · 🔴 ağır suç' : ''}${dokun ? '' : ' (E)'}` : e.tur === 'posta' ? `📬 Posta kutusuna bak${dokun ? '' : ' (E)'}` : e.tur === 'ara' ? `🔎 Üstünü ara${dokun ? '' : ' (E)'}` : e.tur === 'oldur' ? `🔪 Bıçakla${dokun ? '' : ' (E)'}` : `👔 Kılık değiştir (${oyun.kilik})${dokun ? '' : ' (E)'}`; }
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
    if (performance.now() < oyun.donmaBitis) { ileri = 0; yan = 0; }   // masumu aradın: özür dileyip bekliyorsun
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
      if (oyun.canli) {
        let p = Kasaba.it(nx, nz, 0.35, Kasaba.katOf(oyun.y));
        Kasaba.oturaklar.forEach(g => {   // görev sandalyeleri de katı (sadece oyuncu için; botlar oturmaya gider)
          if (Math.abs(g.y - oyun.y) > 1) return;
          const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz), m = 0.32 + 0.33;
          if (d < m && d > 1e-4) { const q = Kasaba.it(g.x + dx / d * m, g.z + dz / d * m, 0.35, Kasaba.katOf(oyun.y)); p = q; }
        });
        oyun.x = p.x; oyun.z = p.z; oyun.y = Kasaba.zeminY(p.x, p.z, oyun.y);
      }
      else { oyun.x = Math.max(-110, Math.min(110, nx)); oyun.z = Math.max(-110, Math.min(110, nz)); }
      oyun.h = kos ? 2 : 1;
      const hedefYaw = oyun.kamera === 'goz' || oyun.nisan ? oyun.yaw : Math.atan2(mx, mz);
      let f = ((hedefYaw - oyun.govdeYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      oyun.govdeYaw += f * Math.min(1, dt * 10);
    } else if (oyun.kamera === 'goz' || oyun.nisan) oyun.govdeYaw = oyun.yaw;   // nişan alırken gövde baktığın yöne döner
    if (oyun.canli && performance.now() < oyun.bicakBitis) {   // bıçaklarken: hedefe döner, bıçak elde görünür
      oyun.h = Kasaba.animKodu('bicak');
      const b = oyun.bicakHedef;
      if (b) { const f = ((Math.atan2(b.x - oyun.x, b.z - oyun.z) - oyun.govdeYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; oyun.govdeYaw += f * Math.min(1, dt * 12); }
    }
    if (oyun.h === 0 && performance.now() < oyun.arananBitis) oyun.h = Kasaba.animKodu('eller');   // üstüm aranıyor: eller havada
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
      const on = Kasaba.icerdeBina(oyun.x + Math.sin(oyun.yaw) * 0.18, oyun.z + Math.cos(oyun.yaw) * 0.18, Kasaba.katOf(oyun.y), 0.22) ? 0 : 0.18;   // duvara dayanınca içini görmesin
      k.position.set(oyun.x + Math.sin(oyun.yaw) * on, oyun.y + 1.66 * boy, oyun.z + Math.cos(oyun.yaw) * on);
    } else {
      const yuk = oyun.canli ? 2.85 : 2.6, uzak = oyun.canli ? 3.6 : 5;   // kamera hep biraz yukarıdan bakar
      // Omuz kayması: sağdaki duvara girmesin
      const kat = Kasaba.katOf(oyun.y), PAY = 0.28;   // kamera duvara en az bu kadar yaklaşır (yoksa duvarın içi görünür)
      let sag = 0.55;
      if (oyun.canli) while (sag > 0 && Kasaba.icerdeBina(oyun.x - Math.cos(oyun.yaw) * sag, oyun.z + Math.sin(oyun.yaw) * sag, kat, PAY)) sag -= 0.05;
      const bx = oyun.x - Math.cos(oyun.yaw) * Math.max(0, sag), bz = oyun.z + Math.sin(oyun.yaw) * Math.max(0, sag);
      const l2 = Math.hypot(d.x, d.z) || 1;
      let serbest = uzak;
      if (oyun.canli) {   // arkadaki duvara kadar geri çekil, duvara PAY kadar yaklaşınca dur
        serbest = 0;
        for (let t = 0.05; t <= uzak; t += 0.05) { if (Kasaba.icerdeBina(bx - d.x * t, bz - d.z * t, kat, PAY)) break; serbest = t; }
      }
      oyun.kameraYakin = oyun.canli && serbest < 0.8;   // duvara sırtını dayadın: kamera kafanın içine girmesin, gözünden bak
      if (oyun.kameraYakin) k.position.set(oyun.x, oyun.y + 1.66 * boy, oyun.z);
      else k.position.set(bx - d.x * serbest, Math.max(oyun.y + 0.4, oyun.y + yuk - d.y * serbest), bz - d.z * serbest);
      // Bina içindeyken kamera tavanı delmesin
      if (oyun.canli) k.position.y = Math.min(k.position.y, Kasaba.tavan(oyun.x, oyun.z, oyun.y), Kasaba.tavan(k.position.x, k.position.z, oyun.y));
      // Şerif odasındayken kamera çatının üstüne çıkmasın
      const so = Kasaba.serifOdasi;
      if (oyun.canli && Math.abs(oyun.x - so.x) < so.g / 2 && Math.abs(oyun.z - so.z) < so.d / 2) k.position.y = Math.min(k.position.y, so.y - 0.3);
    }
    if (oyun.kamera !== 'goz' && oyun.canli && !oyun.kameraYakin && v) {
      // Kamera yukarıda; karakterin baş hizasından ileriye (15 m) bakar. Nişanda lazerin ilerideki bir noktasına bakar (lazer düz kalır)
      // Nişan alırken de kamera hiç oynamaz (haydutla aynı); nişangâh lazerin ucuna kayar
      k.lookAt(oyun.x + d.x * 15, oyun.y + 1.5 * boy + d.y * 15, oyun.z + d.z * 15);
      return;
    }
    k.lookAt(k.position.x + d.x, k.position.y + d.y, k.position.z + d.z);
  }
})();
