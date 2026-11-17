// =============================================================
// Sahte Haydut - kasaba haritası: binalar, görevler, kılık noktaları, yürüme ağı
// Herkeste aynı (rastgele değil). Koordinatlar metre: x doğu (+), z güney (+).
// Bazı binalara girilir (ic: 1 tek kat, 2 iki kat): ön + arka kapı, iki katlılarda merdiven.
// =============================================================

const Kasaba = (() => {
  const SINIR = 92;            // kasaba -92..92
  const CADDE = 9;             // ana cadde z -9..9
  const ARA = 8;               // ara sokak x -8..8
  const KAT_Y = 3.2;           // üst katın zemin yüksekliği
  // Görev hareketleri (karakter.js pozları). Ağda h = 10 + sıra
  const ANIMLER = ['calis', 'ara', 'cevir', 'uzan', 'yirt', 'kes', 'dov', 'dok', 'cok', 'otur', 'kumar', 'tras', 'dans', 'besle', 'ye', 'yas', 'ver', 'dua', 'bicak', 'goster', 'eller'];
  const animKodu = ad => 10 + Math.max(0, ANIMLER.indexOf(ad));
  const DUVAR = 0.4, KAPI = 2.2;

  // Bina: id, ad, emoji, x, z (merkez), g (x boyu), d (z boyu), y (yükseklik), renk, kapi ('g' = kapı +z yönünde, 'k' = -z yönünde), ic (girilebilir: 1/2 kat)
  const B = (id, ad, emoji, x, z, g, d, y, renk, kapi, tur = 'bina', ic = 0) => ({ id, ad, emoji, x, z, g, d, y, renk, kapi, tur, ic });
  const kz = d => -(CADDE + 2 + d / 2);   // cadde kuzeyi (kapı caddeye bakar → 'g')
  const gz = d => CADDE + 2 + d / 2;      // cadde güneyi ('k')

  const binalar = [
    // Kuzey sıra
    B('ev1', 'Ev', '🏠', -76, kz(10), 10, 10, 5, '#a8826a', 'g', 'ev'),
    B('serif', 'Şerif Ofisi', '⭐', -61, kz(11), 13, 11, 6, '#8a5a3c', 'g'),
    B('banka', 'Banka', '🏦', -45, kz(13), 15, 13, 8, '#b9a27a', 'g', 'bina', 1),
    B('salon', 'Salon', '🥃', -25, kz(15), 18, 15, 9, '#9c4f2e', 'g', 'bina', 2),
    B('otel', 'Otel', '🏨', 19, kz(15), 18, 15, 11, '#6f7f5a', 'g', 'bina', 2),
    B('postane', 'Postane', '✉️', 38, kz(11), 13, 11, 6.5, '#7b8fa3', 'g', 'bina', 1),
    B('belediye', 'Belediye', '🏛️', 55, kz(13), 15, 13, 9, '#c8b48a', 'g', 'bina', 2),
    B('berber', 'Berber', '💈', 73, kz(10), 11, 10, 5.5, '#cfe0e8', 'g'),
    // Güney sıra
    B('ev3', 'Ev', '🏠', -76, gz(10), 10, 10, 5, '#b0907a', 'k', 'ev'),
    B('silahci', 'Silahçı', '🔫', -62, gz(10), 12, 10, 6, '#5d4a3a', 'k', 'bina', 1),
    B('firin', 'Fırın', '🍞', -48, gz(10), 11, 10, 5.5, '#c98b52', 'k', 'bina', 1),
    B('doktor', 'Doktor', '💊', -35, gz(10), 11, 10, 6, '#e0d6c2', 'k', 'bina', 1),
    B('terzi', 'Terzi', '👔', -21, gz(10), 11, 10, 5.5, '#a35d7a', 'k'),
    B('madenci', 'Madenci Dükkânı', '⛏️', 17, gz(10), 12, 10, 5.5, '#7a6a4f', 'k'),
    B('demirci', 'Demirci', '🔨', 32, gz(11), 13, 11, 5, '#4b4642', 'k'),
    B('kilise', 'Kilise', '⛪', 53, gz(18), 15, 18, 9, '#efe9dc', 'k'),
    B('ev4', 'Ev', '🏠', 74, gz(10), 10, 10, 5, '#9a7f9a', 'k', 'ev'),
    // Uzak kuzey
    B('istasyon', 'Tren İstasyonu', '🚂', -42, -62, 24, 9, 6, '#8c6b4a', 'g'),
    B('sukulesi', 'Su Kulesi', '💧', -10, -58, 6, 6, 12, '#7d5a3c', 'g', 'kule'),
    B('samanlik', 'Samanlık', '🌾', 24, -60, 15, 13, 8, '#9e3b2b', 'g', 'ambar'),
    B('ev5', 'Ev', '🏠', 52, -57, 10, 9, 5, '#a0a87a', 'g', 'ev'),
    B('ev6', 'Ev', '🏠', 70, -57, 10, 9, 5, '#b48a6a', 'g', 'ev'),
    B('ev7', 'Ev', '🏠', -74, -55, 10, 9, 5, '#9a8a70', 'g', 'ev'),
    // Uzak güney
    B('ahir', 'Ahır', '🐎', -44, 60, 18, 11, 6.5, '#7a4b2f', 'k', 'ambar'),
    B('ev8', 'Ev', '🏠', -72, 58, 10, 9, 5, '#a88a6a', 'k', 'ev'),
    B('ev9', 'Ev', '🏠', 12, 60, 10, 9, 5, '#8a9a8a', 'k', 'ev'),
    B('ev10', 'Ev', '🏠', 70, 58, 10, 9, 5, '#b0a080', 'k', 'ev'),
  ];
  // Su kulesi dışında her binaya girilir (ön + arka kapı)
  binalar.forEach(b => { if (!b.ic && b.tur !== 'kule') b.ic = 1; });
  const icBinalar = binalar.filter(b => b.ic);
  // Katı olmayan alanlar (çit, mezarlık): haritada çizilir, içinden yürünür
  const alanlar = [
    { id: 'agil', ad: 'Ağıl', emoji: '🐄', x: -16, z: 62, g: 16, d: 13 },
    { id: 'mezarlik', ad: 'Mezarlık', emoji: '✝️', x: 42, z: 62, g: 16, d: 12 },
  ];
  // Küçük engeller (kuyu, fıçılar, at arabaları): yuvarlak, r yarıçap (sadece zemin katta)
  const engeller = [
    { tur: 'kuyu', x: 0, z: 0, r: 1.4 },
    { tur: 'araba', x: -8, z: -40, r: 2.2 }, { tur: 'araba', x: 60, z: 38, r: 2.2 },
    { tur: 'fici', x: -33, z: -8, r: 0.6 }, { tur: 'fici', x: -32, z: -7.2, r: 0.6 }, { tur: 'fici', x: 28, z: 8, r: 0.6 },
    { tur: 'saman', x: 14, z: -48, r: 1.1 }, { tur: 'saman', x: 34, z: -50, r: 1.1 }, { tur: 'saman', x: -30, z: 50, r: 1.1 },
    { tur: 'yalak', x: -55, z: -9.5, r: 1.0 }, { tur: 'yalak', x: 45, z: 9.5, r: 1.0 },
    { tur: 'kaktus', x: -86, z: 30, r: 0.5 }, { tur: 'kaktus', x: 86, z: -24, r: 0.5 }, { tur: 'kaktus', x: -60, z: -40, r: 0.5 },
    { tur: 'kaktus', x: 66, z: 30, r: 0.5 }, { tur: 'kaktus', x: -20, z: 80, r: 0.5 }, { tur: 'kaktus', x: 30, z: -82, r: 0.5 },
    { tur: 'kaktus', x: 84, z: 76, r: 0.5 }, { tur: 'kaktus', x: -84, z: -76, r: 0.5 },
  ];
  // Posta kutuları: şerifler buradan (en az 10 sn geriden) hangi görevlerin yapıldığını öğrenir
  const postaKutulari = [{ x: -53, z: 7.4 }, { x: -10, z: -7.4 }, { x: 10, z: 7.4 }, { x: 46, z: -7.4 }, { x: -25, z: 40 }, { x: 40, z: -40 }];
  postaKutulari.forEach(p => engeller.push({ tur: 'posta', x: p.x, z: p.z, r: 0.45 }));
  // Cadde fenerlerinin direkleri (sahne.js'teki fenerlerle aynı yerler) de katı
  for (let x = -80; x <= 80; x += 20) [-8.4, 8.4].forEach(z => engeller.push({ tur: 'gorunmez', x: x + 4, z, r: 0.2 }));
  // Meydandaki ilan tahtası (3 m genişlik): yan yana daireler
  [-1.4, -0.7, 0, 0.7, 1.4].forEach(dx => engeller.push({ tur: 'gorunmez', x: -14 + dx, z: 9.6, r: 0.3 }));
  const RAY_Z = -78;     // demiryolu (görsel)

  const binaBul = id => binalar.find(b => b.id === id) || alanlar.find(a => a.id === id);

  // ---------- Bina içi koordinat (u: yana, w: ön +, arka -) ----------
  const isaret = b => (b.kapi === 'k' ? -1 : 1);
  const yerel = (b, x, z) => ({ u: (x - b.x) * isaret(b), w: (z - b.z) * isaret(b) });
  const dunya = (b, u, w) => ({ x: b.x + u * isaret(b), z: b.z + w * isaret(b) });
  const yonDunya = (b, a) => a + (b.kapi === 'k' ? Math.PI : 0);      // yerel yön (0 = ön) → dünya
  // İki katlı binalarda merdiven: sol duvar boyunca, alt ucu öne, üst ucu arkaya bakar
  const merdiven = b => ({ u1: -b.g / 2 + DUVAR / 2, u2: -b.g / 2 + 1.9, wAlt: b.d / 2 - 2.4, wUst: -b.d / 2 + 1.4 });
  const duvarY = b => (b.ic === 2 ? Math.max(b.y * 0.78, 6.9) : b.y * 0.78);

  // Bina kapısının önündeki nokta (ox: kapıya göre yana kayma)
  function kapiOnu(id, ox = 0) {
    const b = binaBul(id);
    if (b.kapi === 'g') return { x: b.x + ox, z: b.z + b.d / 2 + 1.6, yon: Math.PI, y: 0, kat: 0 };       // kapıya bakmak için -z'ye dön
    return { x: b.x + ox, z: b.z - b.d / 2 - 1.6, yon: 0, y: 0, kat: 0 };
  }
  // Bina içinde bir nokta (kat 0 zemin, 1 üst kat); a: yerel bakış yönü (0 ön, π arka)
  function icNokta(id, u, w, kat = 0, a = Math.PI) {
    const b = binaBul(id), p = dunya(b, u, w);
    return { x: p.x, z: p.z, yon: yonDunya(b, a), y: kat ? KAT_Y : 0, kat, bina: id };
  }

  // Görevler: haydutlar yapar. olay = şeriflere giden bildirim yazısı
  // anim: görevi yapanın hareketi (karakter.js ANIMLER). Botlar da görev yerinde aynı hareketi yapar.
  const G = (id, ad, olay, emoji, sure, yer, anim = 'ara') => ({ id, ad, olay, emoji, sure, y: 0, kat: 0, ...yer, anim });
  const gorevler = [
    G('banka', 'Banka kasasını soy', 'Banka kasası soyuldu', '🏦', 6, icNokta('banka', 4, -5), 'cevir'),
    G('anahtar', 'Hapishane anahtarını çal', 'Şerif ofisinden hapishane anahtarı çalındı', '🔑', 5, icNokta('serif', -3, -3), 'uzan'),
    G('afis', 'Aranıyor afişlerini yırt', 'Aranıyor afişleri yırtıldı', '📜', 3, kapiOnu('serif', 4.5), 'yirt'),
    G('kasa', 'Salonun kasasından para al', 'Salonun kasası boşaltıldı', '💰', 4, icNokta('salon', 4, -1.6)),
    G('kumar', 'Üst katta kumar masasında hile yap', 'Salonun üst katında kumar masasında hile yapıldı', '🃏', 4, icNokta('salon', 3, -2, 1, Math.PI / 2), 'kumar'),
    G('otel', 'Üst kattaki otel odalarını ara', 'Otelin üst katındaki odalar arandı', '🛏️', 5, icNokta('otel', 5, -4.1, 1)),
    G('posta', 'Posta çantasını çal', 'Postaneden posta çantası çalındı', '✉️', 4, icNokta('postane', 3, -3.5)),
    G('telgraf', 'Telgraf telini kes', 'Telgraf teli kesildi', '⚡', 3, kapiOnu('postane', 5), 'kes'),
    G('tapu', 'Belediyenin üst katından tapuyu çal', 'Belediyenin üst katından tapu çalındı', '📃', 5, icNokta('belediye', 3, -4.5, 1)),
    G('tabanca', 'Silahçıdan tabanca çal', 'Silahçıdan tabanca çalındı', '🔫', 4, icNokta('silahci', 3, -3.2)),
    G('ekmek', 'Fırından ekmek çal', 'Fırından ekmek çalındı', '🍞', 3, icNokta('firin', 2.5, -3.2)),
    G('ilac', 'Doktordan ilaç çal', 'Doktordan ilaç çalındı', '💊', 4, icNokta('doktor', 2.5, -3.2)),
    G('altin', 'Altın tozu çal', 'Madenciden altın tozu çalındı', '✨', 5, icNokta('madenci', 2.5, -3)),
    G('kilit', 'Demircide örste kilit kır', 'Demircide kilit kırıldı', '🔨', 4, icNokta('demirci', -2, 0.25), 'dov'),
    G('bagis', 'Bağış kutusunu boşalt', 'Kilisenin bağış kutusu boşaltıldı', '⛪', 4, icNokta('kilise', 3, -6)),
    G('dinamit', 'Raya dinamit koy', 'Demiryoluna dinamit kondu', '🧨', 6, { x: -64, z: -72, yon: Math.PI }, 'cok'),
    G('su', 'Su kulesini del', 'Su kulesi delindi', '💧', 4, kapiOnu('sukulesi'), 'dov'),
    G('kibrit', 'Samanlığa kibrit at', 'Samanlıkta yangın çıktı', '🔥', 4, icNokta('samanlik', 3, -3), 'cok'),
    G('at', 'Ahırdan at çal', 'Ahırdan at çalındı', '🐎', 5, icNokta('ahir', -4, -2)),
    G('sigir', 'Sığırları ağıldan sal', 'Sığırlar ağıldan kaçtı', '🐄', 4, { x: -16, z: 54.5, yon: 0 }, 'uzan'),
    G('zehir', 'Kasaba kuyusuna zehir dök', 'Kasaba kuyusuna zehir döküldü', '☠️', 5, { x: 0, z: 2.4, yon: Math.PI }, 'dok'),
    G('tras', 'Berberde saç tıraşı ol', 'Berberde biri tıraş oldu', '💈', 6, icNokta('berber', 2, -2.6), 'otur'),
    G('atbesle', 'Ahırdaki atı besle', 'Ahırdaki at beslendi', '🥕', 4, icNokta('ahir', 3.2, -2), 'besle'),
    G('dans', 'Salonda dans et', 'Salonda biri dans etti', '💃', 5, icNokta('salon', -5.5, 3.5, 0, 0), 'dans'),
    G('yemek', 'Otelde yemek ye', 'Otelde biri yemek yedi', '🍽️', 5, icNokta('otel', -4, 1.6, 0, 0), 'ye'),
    G('yas', 'Tabutun başında yas tut', 'Mezarlıkta biri yas tuttu', '⚰️', 5, { x: 42, z: 61.7, yon: Math.PI }, 'yas'),
    G('rusvet', 'Barmene rüşvet ver', 'Salonda barmene rüşvet verildi', '💵', 4, icNokta('salon', 6.5, -1.9), 'ver'),
    G('dua', 'Kilisede dua et', 'Kilisede biri dua etti', '🙏', 5, icNokta('kilise', 0, -5.2), 'dua'),
    G('vergi', 'İlan tahtasına sahte vergi duyurusu as', 'İlan tahtasına sahte vergi duyurusu asıldı', '📢', 4, { x: -14, z: 8.3, yon: 0 }, 'uzan'),
    G('icki', 'Salonun içkisini sulandır', 'Salonun içkisi sulandırıldı', '🍺', 4, icNokta('salon', 1.4, -1.9), 'dok'),
  ];
  // Berber ustası koltuğun arkasında durur (müşteri oturunca tıraş eder)
  const berberUsta = icNokta('berber', 2, -1.75);
  const barmenYeri = icNokta('salon', 5.2, -4.7, 0, 0);   // barın arkasında, salona bakar
  // Berber ustası, barmen ve mezarlıktaki tabut katıdır (içlerinden geçilmez)
  engeller.push({ tur: 'kisi', x: berberUsta.x, z: berberUsta.z, r: 0.35 }, { tur: 'kisi', x: barmenYeri.x, z: barmenYeri.z, r: 0.35 }, { tur: 'tabut', x: 42, z: 60.1, r: 0.75 });
  // Kılık değiştirme noktaları
  // Ağır suçlar: aranma seviyesini 1 artırır (diğerleri 1 düşürür). Simgeleri kırmızı çerçeveli.
  const AGIR = new Set(['banka', 'zehir', 'dinamit', 'kibrit', 'su', 'at', 'tabanca', 'anahtar', 'kasa', 'rusvet']);
  gorevler.forEach(g => { g.agir = AGIR.has(g.id); });
  // Aranma seviyesine göre görevin posta kutusuna düşme süresi (ms): 0→15 sn … 6→hemen
  const POSTA_GECIKME = [15000, 12000, 10000, 8000, 6000, 3000, 0];

  // Kılık değiştirme için aday yerler: her oyunda bunlardan rastgele birkaçı seçilir (sadece haydutlar görür)
  const kiliklar = [
    { id: 'terzi', ad: 'Terzi', ...icNokta('terzi', 2.5, -3) },
    { id: 'camasir', ad: 'Çamaşır ipi', x: 30, z: 52, yon: 0, y: 0, kat: 0 },
    { id: 'otelarka', ad: 'Otel deposu', x: 32, z: -29, yon: Math.PI, y: 0, kat: 0 },
    { id: 'ev1', ad: 'Evdeki dolap', ...icNokta('ev1', 3.6, -3.5) },
    { id: 'ev3', ad: 'Evdeki dolap', ...icNokta('ev3', 3.6, -3.5) },
    { id: 'ev5', ad: 'Evdeki dolap', ...icNokta('ev5', 3.6, -3.1) },
    { id: 'ev8', ad: 'Evdeki dolap', ...icNokta('ev8', 3.6, -3.1) },
    { id: 'ev10', ad: 'Evdeki dolap', ...icNokta('ev10', 3.6, -3.1) },
    { id: 'istasyon', ad: 'İstasyon emanetçisi', ...icNokta('istasyon', -9, -2.5) },
    { id: 'ahir', ad: 'Ahır samanlığı', ...icNokta('ahir', 6, 2) },
  ];
  const KILIK_SAYISI = 3;

  // ---------- Çarpışma kutuları (kat: 0 zemin, 1 üst kat, 2 ikisi de) ----------
  function kutuYerel(b, u1, u2, w1, w2, kat = 2) {
    const a = dunya(b, u1, w1), c = dunya(b, u2, w2);
    return { x1: Math.min(a.x, c.x), x2: Math.max(a.x, c.x), z1: Math.min(a.z, c.z), z2: Math.max(a.z, c.z), kat };
  }
  // Girilebilir binanın duvarları: ön ve arka kapı boşluklu
  function icDuvarlar(b) {
    const g2 = b.g / 2, d2 = b.d / 2, K = DUVAR, kg = KAPI / 2, L = [];
    for (const w of [d2, -d2]) {
      L.push(kutuYerel(b, -g2, -kg, w - K / 2, w + K / 2), kutuYerel(b, kg, g2, w - K / 2, w + K / 2));
      if (b.ic === 2) L.push(kutuYerel(b, -kg, kg, w - K / 2, w + K / 2, 1));      // üst katta kapı yok
      const wk = w - Math.sign(w) * (kg + 0.05);   // içe açılmış kapı kanadı da katı
      L.push(kutuYerel(b, kg - 0.02, kg + 0.14, wk - (kg - 0.05), wk + (kg - 0.05), 0));
    }
    L.push(kutuYerel(b, -g2 - K / 2, -g2 + K / 2, -d2, d2), kutuYerel(b, g2 - K / 2, g2 + K / 2, -d2, d2));
    if (b.ic === 2) {
      const m = merdiven(b);
      L.push(kutuYerel(b, m.u2 - 0.1, m.u2 + 0.1, m.wUst, m.wAlt, 0));     // merdivenin yanı (zeminden yandan çıkılmasın)
      L.push(kutuYerel(b, m.u1, m.u2, m.wUst - 0.1, m.wUst + 0.1, 0));    // merdivenin altı
      L.push(kutuYerel(b, m.u2 - 0.1, m.u2 + 0.1, m.wUst, d2, 1));        // üst kat korkuluğu (boşluğa düşülmesin)
    }
    return L;
  }
  // ---------- Bina içi eşyalar (görüntü + çarpışma) ----------
  // Her eşya: w (u boyu), h, d (w boyu), u, y (merkez yüksekliği), z (= yerel w), renk, isik (parlama), carp (içinden geçilmez mi)
  // carp verilmezse: zemine (ya da üst kat zeminine) değen ve çok ince olmayan eşyalar katıdır.
  function esyaListesi(b) {
    const L = [], d2 = b.d / 2, g2 = b.g / 2, KY = KAT_Y;
    const k = (w, h, d, u, y, z, renk, ek = {}) => L.push({ w, h, d, u, y, z, renk, ...ek });
    const ahsap = '#6a4424', koyu2 = '#3a2a1a', metal = '#55555e', yesil = '#2f6a3a', beyaz = '#eeeae0';
    const masa = (x, z, yy = 0, renk = ahsap) => {
      k(1.6, 0.12, 1, x, yy + 0.8, z, renk, { carp: true, taban: yy });
      [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([a, c]) => k(0.1, 0.8, 0.1, x + a, yy + 0.4, z + c, ahsap, { carp: false }));
    };
    switch (b.id) {
      case 'banka':
        k(2.2, 2.2, 0.9, 4, 1.1, -d2 + 0.75, metal); k(0.5, 0.5, 0.1, 4, 1.2, -d2 + 1.25, '#c9a23a', { carp: false });   // kasa
        k(6, 1.1, 0.7, -2, 0.55, -1, ahsap); break;                                                                       // gişe
      case 'salon':
        k(7, 1.1, 0.8, 4, 0.55, -3.2, ahsap); k(7, 1.6, 0.4, 4, 2, -d2 + 0.4, koyu2, { carp: true, taban: 0 });           // bar ve raf
        for (let i = 0; i < 6; i++) k(0.12, 0.35, 0.12, 1.5 + i, 1.3, -3.2, i % 2 ? '#3a7a3a' : '#7a3a20', { carp: false });
        masa(-2, 2); masa(3, 3); k(1.6, 1.3, 0.6, -5.5, 0.65, -d2 + 0.5, koyu2);                                          // masalar, piyano
        masa(4.15, -2, KY, yesil); masa(-2, 2, KY); break;                                                                // üst kat kumar masası
      case 'otel':
        k(4, 1.1, 0.8, 3, 0.55, -2, ahsap);                                                                              // resepsiyon
        masa(-4, 2.85);                                                                                                  // yemek masası
        [[5, -5.5], [5, 3], [-2, -5.5]].forEach(([x, z]) => { k(2.2, 0.5, 1.2, x, KY + 0.25, z, beyaz); k(2.2, 0.8, 0.2, x, KY + 0.4, z - 0.6, ahsap, { carp: false }); });
        break;
      case 'belediye':
        masa(-2, -2); k(1.2, 2, 0.6, 3, KY + 1, -d2 + 0.5, ahsap); masa(3, -3, KY); break;                                // üst kat dolap ve masa
      case 'postane':
        k(6, 1.1, 0.7, 0, 0.55, -2, ahsap); [-2, 0, 2].forEach(x => k(0.6, 0.6, 0.6, x + 3, 0.3, -d2 + 0.8, '#9a7a4a')); break;
      case 'silahci':
        k(5, 1.1, 0.7, 0, 0.55, -1.8, ahsap); k(5, 1.6, 0.2, 2, 1.6, -d2 + 0.3, koyu2, { carp: true, taban: 0 });
        for (let i = 0; i < 5; i++) k(0.08, 1.1, 0.08, 0.2 + i * 0.8, 1.6, -d2 + 0.45, metal, { carp: false }); break;    // tüfek rafı
      case 'firin':
        k(2, 1.6, 1.2, -2.5, 0.8, -d2 + 0.8, '#9a4a2a'); k(0.8, 0.5, 0.1, -2.5, 0.8, -d2 + 1.42, '#ff7a2a', { isik: '#aa4a10', carp: false });
        k(3, 1.2, 0.6, 2.5, 0.6, -d2 + 0.5, ahsap); for (let i = 0; i < 4; i++) k(0.4, 0.2, 0.3, 1.4 + i * 0.7, 1.3, -d2 + 0.5, '#e2a85a', { carp: false }); break;
      case 'serif':   // hapishane parmaklıkları ve masa
        for (let i = 0; i < 7; i++) k(0.08, 2.4, 0.08, -g2 + 0.6 + i * 0.5, 1.2, -1.5, metal, { carp: false });
        k(3.1, 2.4, 0.12, -g2 + 2.1, 1.2, -1.5, metal, { carp: true, gizli: true });                                     // parmaklık hattı (görünmez engel)
        k(3.6, 0.1, 0.1, -g2 + 2.1, 2.4, -1.5, metal, { carp: false }); masa(3, 1); k(0.3, 0.06, 0.2, -3, 1.2, -d2 + 0.3, '#c9a23a', { carp: false }); break;
      case 'terzi':   // mankenler ve kumaş rafı
        [[-2.5, -1], [-1, 1.5]].forEach(([x, z]) => { k(0.5, 1.1, 0.35, x, 1.2, z, '#c06090', { carp: true, taban: 0 }); k(0.08, 0.6, 0.08, x, 0.3, z, ahsap, { carp: false }); });
        k(3, 1.8, 0.5, 2.5, 0.9, -d2 + 0.35, ahsap); ['#c94f3d', '#4a6fa5', '#4f8a3c'].forEach((c, i) => k(0.8, 0.3, 0.4, 1.6 + i * 0.9, 1.3, -d2 + 0.4, c, { carp: false })); break;
      case 'madenci':   // çuvallar, altın tartısı
        for (let i = 0; i < 3; i++) k(0.7, 0.8, 0.6, -3 + i * 0.9, 0.4, -d2 + 0.6, '#a08a5a');
        k(2.6, 1, 0.7, 2.5, 0.5, -d2 + 0.6, ahsap); k(0.4, 0.15, 0.4, 2.5, 1.08, -d2 + 0.6, '#e8c84a', { carp: false }); break;
      case 'demirci':   // örs, kızgın demir, alet duvarı
        k(0.9, 0.35, 0.4, -2, 0.85, -0.6, metal, { carp: true, taban: 0 }); k(0.4, 0.7, 0.3, -2, 0.35, -0.6, koyu2, { carp: false });
        k(0.3, 0.06, 0.25, -1.6, 1.06, -0.6, '#ff7a2a', { isik: '#aa3a00', carp: false }); k(4, 1.6, 0.15, 2, 1.6, -d2 + 0.3, koyu2, { carp: false }); break;
      case 'kilise':   // sıralar ve kürsü
        for (let i = 0; i < 4; i++) [-1, 1].forEach(sv => k(4, 0.5, 0.6, sv * 3.2, 0.25, 3 - i * 2, ahsap));
        k(2.2, 1.1, 1, -3.5, 0.55, -d2 + 1.5, beyaz); k(0.6, 0.6, 0.4, 3, 0.3, -d2 + 2.4, '#8a6a3a'); break;
      case 'istasyon':   // bilet gişesi ve banklar
        k(4, 1.1, 0.7, 6, 0.55, -1.5, ahsap); [-6, -2].forEach(x => k(3, 0.5, 0.6, x, 0.25, 1.5, ahsap)); break;
      case 'samanlik':   // saman balyaları
        for (let i = 0; i < 6; i++) k(1.4, 1, 1, -4 + (i % 3) * 1.6, 0.5 + Math.floor(i / 3), -d2 + 1, '#e2c46b');
        k(1.4, 1, 1, 4.5, 0.5, -d2 + 1, '#e2c46b'); break;
      case 'ahir':   // bölmeler ve atlar
        for (let i = 0; i < 4; i++) {
          const x = -7 + i * 3.6, at = i % 2 ? '#6a4020' : '#3a2a1a';
          k(0.15, 1.4, 3, x - 1.6, 0.7, -d2 + 1.7, ahsap, { carp: true });
          k(0.7, 0.9, 1.8, x, 1.1, -d2 + 1.4, at, { carp: true, taban: 0 }); k(0.4, 0.5, 0.7, x, 1.6, -d2 + 2.5, at, { carp: false });
        } break;
      case 'berber':   // ayna, raf, dolap
        k(2.4, 1.3, 0.08, 2, 1.6, -d2 + 0.25, '#cfe6f0', { carp: false }); k(2.6, 0.12, 0.4, 2, 0.9, -d2 + 0.35, ahsap, { carp: false });
        for (let i = 0; i < 4; i++) k(0.1, 0.22, 0.1, 1.2 + i * 0.5, 1.07, -d2 + 0.35, ['#4a8ab0', '#c94f3d', '#e8d27a', '#2f6a3a'][i], { carp: false });
        k(1.6, 1.1, 0.6, -2.5, 0.55, -d2 + 0.5, ahsap); break;
      case 'doktor':
        k(2, 0.6, 1, -2.5, 0.3, -d2 + 1, beyaz); k(1.6, 1.8, 0.5, 2.5, 0.9, -d2 + 0.35, beyaz);
        for (let i = 0; i < 4; i++) k(0.12, 0.25, 0.12, 1.9 + i * 0.4, 1.4, -d2 + 0.6, '#4a8ab0', { carp: false }); break;
      default:
        if (b.tur === 'ev') { k(2, 0.5, 1.2, -g2 + 1.5, 0.25, -d2 + 1, beyaz); masa(1.2, 0.8); k(1.2, 1.6, 0.5, g2 - 1, 0.8, -d2 + 0.35, ahsap); }
    }
    return L;
  }
  // Eşyaların çarpışma kutuları (dünya koordinatı, hangi katta)
  function esyaKutulari(b) {
    const sonuc = [];
    esyaListesi(b).forEach(e => {
      const taban = e.taban ?? (e.y - e.h / 2);
      const katTaban = taban >= KAT_Y - 0.3 ? KAT_Y : 0;
      const yerde = taban - katTaban < 0.3;                         // zemine değiyor mu
      const kati = e.carp ?? (yerde && Math.min(e.w, e.d) >= 0.25);
      if (!kati) return;
      const w = Math.max(e.w, 0.3), d = Math.max(e.d, 0.3);   // çok ince eşyalar en az 30 cm kalın sayılır (yol kontrolü atlamasın)
      sonuc.push(kutuYerel(b, e.u - w / 2, e.u + w / 2, e.z - d / 2, e.z + d / 2, katTaban ? 1 : 0));
    });
    return sonuc;
  }

  const kutular = [];
  binalar.forEach(b => {
    if (b.ic) { kutular.push(...icDuvarlar(b)); kutular.push(...esyaKutulari(b)); }
    else kutular.push({ x1: b.x - b.g / 2, x2: b.x + b.g / 2, z1: b.z - b.d / 2, z2: b.z + b.d / 2, kat: 2 });
  });

  // Sundurma direkleri ve banka sütunları (sahne.js ile aynı yerler) katı
  binalar.forEach(b => {
    if (b.tur === 'kule' || b.tur === 'ambar' || b.tur === 'ev' || Math.abs(b.z) >= 40) return;
    for (let u = -b.g / 2 + 0.3; u <= b.g / 2; u += Math.max(3, b.g / 4)) { if (Math.abs(u) < 1.6) continue;   // kapının önüne direk yok
      const p = dunya(b, u, b.d / 2 + 2.3); engeller.push({ tur: 'gorunmez', x: p.x, z: p.z, r: 0.17 }); }
  });
  { const b = binaBul('banka'); [-2.2, 2.2].forEach(u => { const p = dunya(b, u, b.d / 2 + 0.3); engeller.push({ tur: 'gorunmez', x: p.x, z: p.z, r: 0.33 }); }); }
  // Şerif bekleme odası: oyun başında şerifler burada kilitli bekler, sonra doğudaki kapı açılır
  const serifOdasi = { x: -61, z: -31, g: 10, d: 7, y: 3.2, kapiG: 2.4 };
  {
    const o = serifOdasi, K = 0.5, x1 = o.x - o.g / 2, x2 = o.x + o.g / 2, z1 = o.z - o.d / 2, z2 = o.z + o.d / 2, kg = o.kapiG / 2;
    kutular.push(
      { x1, x2, z1: z1 - K / 2, z2: z1 + K / 2, kat: 2 }, { x1, x2, z1: z2 - K / 2, z2: z2 + K / 2, kat: 2 },          // kuzey, güney
      { x1: x1 - K / 2, x2: x1 + K / 2, z1, z2, kat: 2 },                                                                // batı
      { x1: x2 - K / 2, x2: x2 + K / 2, z1, z2: o.z - kg, kat: 2 }, { x1: x2 - K / 2, x2: x2 + K / 2, z1: o.z + kg, z2, kat: 2 },   // doğu (kapı boşluğu)
      { x1: x2 - K / 2, x2: x2 + K / 2, z1: o.z - kg, z2: o.z + kg, kat: 2, kapi: true },                                // kapı
    );
  }
  let kapiKapali = false;
  const sayilir = (k, kat) => (!k.kapi || kapiKapali) && (k.kat === 2 || k.kat === kat);
  const katOf = y => (y > 1.6 ? 1 : 0);

  function icerde(x, z, pay = 0, kat = 0) {
    for (const k of kutular) if (sayilir(k, kat) && x > k.x1 - pay && x < k.x2 + pay && z > k.z1 - pay && z < k.z2 + pay) return true;
    if (kat === 0) for (const e of engeller) if ((x - e.x) ** 2 + (z - e.z) ** 2 < (e.r + pay) ** 2) return true;
    return false;
  }
  // Yuvarlak bir karakteri engellerin dışına it
  function it(x, z, r = 0.35, kat = 0) {
    for (const k of kutular) {
      if (!sayilir(k, kat)) continue;
      const yx = Math.max(k.x1, Math.min(x, k.x2)), yz = Math.max(k.z1, Math.min(z, k.z2));
      const dx = x - yx, dz = z - yz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); x = yx + dx / d * r; z = yz + dz / d * r; }
        else {   // tam içinde: en yakın kenara çıkar
          const s = [x - k.x1, k.x2 - x, z - k.z1, k.z2 - z], m = Math.min(...s);
          if (m === s[0]) x = k.x1 - r; else if (m === s[1]) x = k.x2 + r; else if (m === s[2]) z = k.z1 - r; else z = k.z2 + r;
        }
      }
    }
    if (kat === 0) for (const e of engeller) {
      const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz), m = e.r + r;
      if (d < m) { if (d < 1e-4) { x += m; } else { x = e.x + dx / d * m; z = e.z + dz / d * m; } }
    }
    x = Math.max(-SINIR, Math.min(SINIR, x)); z = Math.max(-SINIR, Math.min(SINIR, z));
    return { x, z };
  }
  function yolAcik(x1, z1, x2, z2, pay = 0.5, kat = 0) {
    const d = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(d / 0.25));
    for (let i = 0; i <= n; i++) { const t = i / n; if (icerde(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, pay, kat)) return false; }
    return true;
  }
  // Işın: duvarlara çarpmadan önce gidebildiği mesafe (kamera ve atış için)
  function isin(x, z, dx, dz, enFazla, kat = 0) {
    for (let t = 0.2; t < enFazla; t += 0.2) { if (icerdeBina(x + dx * t, z + dz * t, kat)) return t; }
    return enFazla;
  }
  // Kurşun/lazer: ağaç, kaktüs, at, fıçı gibi katı süslere çarpar mı? (3B ışın; d birim vektör). İlk çarpma mesafesi
  const ENGEL_BOY = { agac: 4, kuruAgac: 3.2, kaktus: 2.4, at: 1.9, sandik: 1.5, degirmen: 9, kaya: 0.8, kuyu: 1.3, araba: 2.2, fici: 1.1, ficiYigin: 1.6, saman: 1.4, yalak: 0.8, posta: 1.3, tabut: 0.9 };
  function engelIsin(ox, oy, oz, dx, dy, dz, enFazla) {
    let en = enFazla;
    const hl = dx * dx + dz * dz;
    for (const e of engeller) {
      const boy = e.tur === 'agac' ? 3 + (e.cesit || 0) * 0.8 : ENGEL_BOY[e.tur];
      if (!boy) continue;
      const cx = ox - e.x, cz = oz - e.z;
      if (cx * cx + cz * cz > (en + 3) * (en + 3)) continue;   // çok uzak
      // gövde: dikey silindir (ağaçta gövde ince)
      const r = e.tur === 'agac' || e.tur === 'kuruAgac' ? 0.34 : e.r;
      if (hl > 1e-9) {
        const b = 2 * (cx * dx + cz * dz), c = cx * cx + cz * cz - r * r, disk = b * b - 4 * hl * c;
        if (disk >= 0) {
          const t = (-b - Math.sqrt(disk)) / (2 * hl);
          if (t > 0 && t < en) { const y = oy + dy * t; if (y >= 0 && y <= boy) en = t; }
        }
      }
      if (e.tur === 'agac') {   // yapraklı taç: küre
        const sx = ox - e.x, sy = oy - (boy + 0.5), sz = oz - e.z, R = 1.7;
        const b = sx * dx + sy * dy + sz * dz, c = sx * sx + sy * sy + sz * sz - R * R, disk = b * b - c;
        if (disk >= 0) { const t = -b - Math.sqrt(disk); if (t > 0 && t < en) en = t; }
      }
    }
    return en;
  }
  function icerdeBina(x, z, kat = 0, pay = 0) { for (const k of kutular) if (sayilir(k, kat) && x > k.x1 - pay && x < k.x2 + pay && z > k.z1 - pay && z < k.z2 + pay) return true; return false; }

  // ---------- Katlar ----------
  // Bu noktanın içinde olduğu girilebilir bina (yoksa null)
  function icBina(x, z) {
    for (const b of icBinalar) { const p = yerel(b, x, z); if (Math.abs(p.u) < b.g / 2 && Math.abs(p.w) < b.d / 2) return b; }
    return null;
  }
  // Ayağının bastığı yükseklik (merdivende eğimli, üst katta KAT_Y). yOnce: bir önceki yükseklik
  function zeminY(x, z, yOnce = 0) {
    const b = icBina(x, z);
    if (!b || b.ic !== 2) return 0;
    const p = yerel(b, x, z), m = merdiven(b);
    if (p.u < m.u2) {
      if (p.w > m.wUst && p.w < m.wAlt) return KAT_Y * Math.max(0, Math.min(1, (m.wAlt - p.w) / (m.wAlt - m.wUst)));
      if (p.w >= m.wAlt) return 0;                       // merdiven başı (boşluğun altı)
    }
    return yOnce > 1.6 ? KAT_Y : 0;
  }
  // Kameranın çıkabileceği en yüksek yer (tavan), açıktaysa çok yüksek
  function tavan(x, z, y = 0) {
    const b = icBina(x, z);
    if (!b) return 99;
    if (b.ic === 2 && y < 1.6) {
      const p = yerel(b, x, z), m = merdiven(b);
      if (!(p.u < m.u2 && p.w > m.wUst)) return KAT_Y - 0.25;
    }
    return duvarY(b) - 0.35;
  }

  // ---------- Süsler (görsel; büyükleri katı) ----------
  // Her oyuncuda aynı olsun diye sabit tohumlu rastgele. Yollara, kapılara, görev yerlerine konmaz.
  const susler = [];
  {
    let tohum = 20261114;
    const rnd = () => { tohum = (tohum * 1664525 + 1013904223) >>> 0; return tohum / 4294967296; };
    const kapilar = [];
    binalar.forEach(b => { if (b.tur === 'kule') return; const d2 = b.d / 2 + 2; kapilar.push(dunya(b, 0, d2), dunya(b, 0, -d2)); });
    const yasak = [...kapilar, ...gorevler, ...kiliklar, ...postaKutulari];
    const uygun = (x, z, r) => {
      if (Math.abs(z) < 11 || Math.abs(x) < 10) return false;                     // ana cadde ve ara sokak
      if (z < -73 || Math.abs(x) > 88 || Math.abs(z) > 88) return false;          // demiryolu ve kenar
      if (icerde(x, z, r + 2.2)) return false;                                     // binalar, mevcut engeller
      if (alanlar.some(a => Math.abs(x - a.x) < a.g / 2 + 2 && Math.abs(z - a.z) < a.d / 2 + 2)) return false;
      if (yasak.some(p => Math.hypot(p.x - x, p.z - z) < 4)) return false;
      return susler.every(e => Math.hypot(e.x - x, e.z - z) > e.r + r + 1.8);
    };
    const ekle = (tur, adet, r, katı = true) => {
      for (let i = 0, deneme = 0; i < adet && deneme < adet * 60; deneme++) {
        const x = (rnd() * 2 - 1) * 86, z = (rnd() * 2 - 1) * 84;
        if (!uygun(x, z, r)) continue;
        const e = { tur, x, z, r, yon: rnd() * Math.PI * 2, cesit: Math.floor(rnd() * 3) };
        susler.push(e); if (katı) engeller.push(e); i++;
        // Görüntüde gövdeden taşan parçalar (sahne.js'teki yerel konum, e.yon kadar döndürülmüş)
        const tasan = { sandik: [[0.2, -0.75, 0.38]], degirmen: [[1.8, 0, 1.15]] }[tur] || [];
        tasan.forEach(([lx, lz, r]) => engeller.push({ tur: 'gorunmez', x: x + lx * Math.cos(e.yon) + lz * Math.sin(e.yon), z: z - lx * Math.sin(e.yon) + lz * Math.cos(e.yon), r }));
      }
    };
    ekle('agac', 34, 0.45);
    ekle('kuruAgac', 12, 0.3);
    ekle('at', 7, 0.9);
    ekle('sandik', 12, 0.75);
    ekle('degirmen', 1, 1.3);
    ekle('kaya', 30, 0.5);
    ekle('ot', 90, 0.2, false);
    // Ana cadde kenarı: bina köşelerinde fıçılar, kaldırım kenarında bağlı atlar, sundurmada banklar (kapıların önüne konmaz)
    const caddeBinalari = binalar.filter(b => Math.abs(b.z) < 30 && b.tur !== 'kule');
    caddeBinalari.forEach((b, i) => {
      const on = b.d / 2 + 1.3, kenar = b.g / 2 - 0.7;
      const kose = dunya(b, i % 2 ? kenar : -kenar, on);
      const yakinKapi = p => kapilar.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 3) || postaKutulari.some(k => Math.hypot(k.x - p.x, k.z - p.z) < 2.5) || gorevler.some(g => Math.hypot(g.x - p.x, g.z - p.z) < 2.5);
      if (!yakinKapi(kose) && !icerde(kose.x, kose.z, 0.6)) { const e = { tur: 'ficiYigin', x: kose.x, z: kose.z, r: 0.68, yon: i, cesit: i % 3 }; susler.push(e); engeller.push(e); }
      const bank = dunya(b, i % 2 ? -kenar + 0.6 : kenar - 0.6, on - 0.2);
      if (!yakinKapi(bank)) {   // bank 1,4 m uzun: üç daireyle katı
        susler.push({ tur: 'bank', x: bank.x, z: bank.z, r: 0.3, yon: b.kapi === 'k' ? Math.PI : 0, cesit: 0 });
        [-0.5, 0, 0.5].forEach(dx => engeller.push({ tur: 'gorunmez', x: bank.x + dx, z: bank.z, r: 0.3 }));
      }
    });
    // Kaldırım kenarında bağlı atlar (iki bina arasındaki boşluklarda, caddeye paralel)
    [[-68, -8.3], [-35, -8.3], [28.5, -8.3], [64, -8.3], [-55, 8.3], [-28, 8.3], [24.5, 8.3], [62, 8.3]].forEach(([x, z], i) => {
      const yakin = kapilar.some(k => Math.hypot(k.x - x, k.z - z) < 4) || postaKutulari.some(k => Math.hypot(k.x - x, k.z - z) < 3) || gorevler.some(g => Math.hypot(g.x - x, g.z - z) < 3) || icerde(x, z, 0.9);
      if (!yakin) { const e = { tur: 'at', x, z, r: 0.9, yon: z < 0 ? Math.PI / 2 : -Math.PI / 2, cesit: i % 3 }; susler.push(e); engeller.push(e); }
    });
  }

  // ---------- Yürüme ağı (botlar için, zemin kat) ----------
  const ADIM = 6;
  const dugumler = [];
  for (let x = -84; x <= 84; x += ADIM) for (let z = -84; z <= 84; z += ADIM) if (!icerde(x, z, 1.2)) dugumler.push({ x, z, k: [] });
  // Girilebilir binalar: kapıların dışında birer düğüm + içeride sık bir ağ (eşyaların etrafından dolaşmak için)
  icBinalar.forEach(b => {
    const d2 = b.d / 2, g2 = b.g / 2;
    [[0, d2 + 1.8], [0, -d2 - 1.8]].forEach(([u, w]) => { const p = dunya(b, u, w); dugumler.push({ x: p.x, z: p.z, k: [], kapi: true }); });
    for (let u = -g2 + 0.8; u <= g2 - 0.8 + 1e-6; u += 1.4) for (let w = -d2 + 0.8; w <= d2 - 0.8 + 1e-6; w += 1.4) {
      const p = dunya(b, u, w);
      if (!icerde(p.x, p.z, 0.45)) dugumler.push({ x: p.x, z: p.z, k: [], ic: true });
    }
  });
  dugumler.forEach((a, i) => dugumler.forEach((b, j) => {
    if (j <= i) return;
    const sinir = a.ic || b.ic ? 3.2 : ADIM * 1.5;   // bina içi düğümler sadece yakın komşularına bağlanır (kapı önü düğümleri sokağa uzaktan da bağlanır)
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < sinir && yolAcik(a.x, a.z, b.x, b.z, 0.45)) { a.k.push(j); b.k.push(i); }
  }));
  function enYakinDugum(x, z) {
    let en = -1, ed = 1e9;
    dugumler.forEach((d, i) => { const m = (d.x - x) ** 2 + (d.z - z) ** 2; if (m < ed && m < 400 && d.k.length && yolAcik(x, z, d.x, d.z, 0.3)) { ed = m; en = i; } });
    if (en < 0) dugumler.forEach((d, i) => { const m = (d.x - x) ** 2 + (d.z - z) ** 2; if (m < ed && d.k.length) { ed = m; en = i; } });
    return en;
  }
  // Zemin katta noktadan noktaya yol. Kısaltma: arada engel yoksa ara düğümleri atla.
  function zeminYol(x1, z1, x2, z2) {
    const a = enYakinDugum(x1, z1), b = enYakinDugum(x2, z2);
    if (a < 0 || b < 0) return [{ x: x2, z: z2 }];
    const onceki = new Map([[a, -1]]), kuyruk = [a];
    while (kuyruk.length) { const s = kuyruk.shift(); if (s === b) break; for (const n of dugumler[s].k) if (!onceki.has(n)) { onceki.set(n, s); kuyruk.push(n); } }
    if (!onceki.has(b)) return [{ x: x2, z: z2 }];
    const liste = []; for (let s = b; s !== -1; s = onceki.get(s)) liste.unshift({ x: dugumler[s].x, z: dugumler[s].z });
    liste.push({ x: x2, z: z2 });
    const kisa = []; let cx = x1, cz = z1, i = 0;
    while (i < liste.length) {
      let j = liste.length - 1;
      while (j > i && !yolAcik(cx, cz, liste[j].x, liste[j].z, 0.4)) j--;
      kisa.push(liste[j]); cx = liste[j].x; cz = liste[j].z; i = j + 1;
    }
    return kisa;
  }
  // Merdivenin alt ve üst ucu (dünya)
  function merdivenUclari(b) {
    const m = merdiven(b), u = (m.u1 + m.u2) / 2;
    // tam: bu noktaya köşe kesmeden tam varılmalı (yoksa korkuluğa takılır)
    return { alt: { ...dunya(b, u, m.wAlt + 0.9), tam: true }, ust: { ...dunya(b, u, m.wUst - 0.9), tam: true } };
  }
  // Katlar arası yol: üst kattaysa önce merdivenden in, hedef üst kattaysa sonunda merdivenden çık
  function yol(x1, z1, x2, z2, y1 = 0, hedefKat = 0, hedefBina = null) {
    const parcalar = [];
    let sx = x1, sz = z1;
    const b1 = katOf(y1) === 1 ? icBina(x1, z1) : null;
    if (b1 && b1.ic === 2) {
      const u = merdivenUclari(b1);
      if (hedefKat === 1 && hedefBina === b1.id) return [{ x: x2, z: z2 }];
      parcalar.push(u.ust, u.alt); sx = u.alt.x; sz = u.alt.z;
    }
    if (hedefKat === 1 && hedefBina) {
      const u = merdivenUclari(binaBul(hedefBina));
      parcalar.push(...zeminYol(sx, sz, u.alt.x, u.alt.z).slice(0, -1), u.alt, u.ust, { x: x2, z: z2 });
    } else parcalar.push(...zeminYol(sx, sz, x2, z2));
    return parcalar;
  }

  // Botların uğrayacağı ilginç yerler: görevler, kılık yerleri, kapılar, bina içleri, caddede rastgele noktalar
  const ugraklar = [
    ...gorevler.map(g => ({ x: g.x, z: g.z, yon: g.yon, kat: g.kat, bina: g.bina || null, gorev: true, gid: g.id, anim: g.anim, bekle: [18, 35] })),   // botlar da görev yapıyormuş gibi bekler
    ...kiliklar.map(k => ({ x: k.x, z: k.z, yon: k.yon, kat: 0, bina: k.bina || null, gorev: true, anim: 'ara', bekle: [8, 16] })),
    ...binalar.filter(b => b.tur === 'ev').map(b => ({ ...kapiOnu(b.id), bekle: [2, 6] })),
  ];
  // Bina içlerinde gezinme noktaları (zeminde ve üst katta)
  icBinalar.forEach(b => {
    ugraklar.push({ ...icNokta(b.id, 2, 1, 0, 0), bekle: [2, 6] }, { ...icNokta(b.id, -1, -2, 0, Math.PI / 2), bekle: [2, 5] });
    if (b.ic === 2) ugraklar.push({ ...icNokta(b.id, 3, 2, 1, 0), bekle: [3, 7] }, { ...icNokta(b.id, -1, -3.5, 1, Math.PI), bekle: [3, 7] });
  });
  ugraklar.forEach(u => { u.kat = u.kat || 0; u.bina = u.bina || null; });
  // Bina içi gezinme noktalarında kasabalı kısa bir süre bir şeyle uğraşır (görev değil, ortalık hareketli görünsün)
  ugraklar.forEach(u => { if (!u.gorev && u.bina) { u.ufakIs = true; u.anim = Math.random() < 0.5 ? 'ara' : 'calis'; u.bekle = [3, 6]; } });
  // Görev yerlerinde en fazla 2 kasabalı: biri tam noktada, ikincisi yanında (sandalyeli görevlerde 1).
  // Bot görevde, oyuncunun o görevi yaptığı süre kadar kalır (kılıkta 3 sn).
  ugraklar.forEach(u => {
    if (!u.gorev) return;
    const g = u.gid && gorevler.find(x => x.id === u.gid);
    u.sure = g ? g.sure : 3;
    u.bekle = [u.sure, u.sure];
    u.yerler = [{ x: u.x, z: u.z }];
    if (u.anim === 'otur' || u.anim === 'kumar' || u.anim === 'ye') return;
    const px = Math.cos(u.yon || 0), pz = -Math.sin(u.yon || 0);   // bakış yönüne dik
    for (const s of [0.8, -0.8]) {
      const x = u.x + px * s, z = u.z + pz * s;
      if (!icerde(x, z, 0.4, u.kat || 0) && (!u.bina || icBina(x, z))) { u.yerler.push({ x, z }); break; }
    }
  });
  // Eşyanın içine denk gelen gezinme noktalarını yakındaki boş yere kaydır (görevler hariç, onlar elle yerleşti)
  ugraklar.forEach(u => {
    if (u.gorev || !icerde(u.x, u.z, 0.4, u.kat)) return;
    for (let r = 0.3; r <= 2.5; r += 0.3) for (let a = 0; a < 6.28; a += 0.5) {
      const x = u.x + Math.cos(a) * r, z = u.z + Math.sin(a) * r;
      if (!icerde(x, z, 0.45, u.kat) && (!u.bina || icBina(x, z))) { u.x = x; u.z = z; return; }
    }
  });
  for (let x = -80; x <= 80; x += 8) { ugraklar.push({ x, z: -5.5, kat: 0, bina: null, bekle: [1, 5] }); ugraklar.push({ x, z: 5.5, kat: 0, bina: null, bekle: [1, 5] }); }
  for (let z = -70; z <= 70; z += 10) if (Math.abs(z) > 10) ugraklar.push({ x: (z % 20 ? 3 : -3), z, kat: 0, bina: null, bekle: [1, 4] });

  // Odanın içinde rastgele bir yer (şeriflerin başlangıcı)
  function odadaYer() { const o = serifOdasi; return { x: o.x - o.g / 2 + 1 + Math.random() * (o.g - 2), z: o.z - o.d / 2 + 1 + Math.random() * (o.d - 2) }; }

  return {
    susler, icerdeBina, oturaklar: gorevler.filter(g => g.anim === 'otur' || g.anim === 'kumar' || g.anim === 'ye'), POSTA_GECIKME, KILIK_SAYISI, serifOdasi, odadaYer, berberUsta, barmenYeri, ANIMLER, animKodu, postaKutulari, esyaListesi, odaKapisi(kapali) { kapiKapali = !!kapali; }, get kapiKapali() { return kapiKapali; },
    engelIsin, SINIR, CADDE, ARA, RAY_Z, KAT_Y, DUVAR, KAPI, binalar, icBinalar, alanlar, engeller, gorevler, kiliklar, ugraklar,
    it, icerde, yolAcik, isin, yol, binaBul, icBina, zeminY, tavan, katOf, merdiven, duvarY, yerel, dunya, dugumSayisi: dugumler.length,
  };
})();
if (typeof module !== 'undefined') module.exports = Kasaba;
