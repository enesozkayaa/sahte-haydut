// =============================================================
// Sahte Haydut - kasaba haritası: binalar, görevler, kılık noktaları, yürüme ağı
// Herkeste aynı (rastgele değil). Koordinatlar metre: x doğu (+), z güney (+).
// =============================================================

const Kasaba = (() => {
  const SINIR = 92;            // kasaba -92..92
  const CADDE = 9;             // ana cadde z -9..9
  const ARA = 8;               // ara sokak x -8..8

  // Bina: id, ad, emoji, x, z (merkez), g (x boyu), d (z boyu), y (yükseklik), renk, kapi ('g' = kapı +z yönünde, 'k' = -z yönünde)
  const B = (id, ad, emoji, x, z, g, d, y, renk, kapi, tur = 'bina') => ({ id, ad, emoji, x, z, g, d, y, renk, kapi, tur });
  const kz = d => -(CADDE + 2 + d / 2);   // cadde kuzeyi (kapı caddeye bakar → 'g')
  const gz = d => CADDE + 2 + d / 2;      // cadde güneyi ('k')

  const binalar = [
    // Kuzey sıra
    B('ev1', 'Ev', '🏠', -76, kz(10), 10, 10, 5, '#a8826a', 'g', 'ev'),
    B('serif', 'Şerif Ofisi', '⭐', -61, kz(11), 13, 11, 6, '#8a5a3c', 'g'),
    B('banka', 'Banka', '🏦', -45, kz(13), 15, 13, 8, '#b9a27a', 'g'),
    B('salon', 'Salon', '🥃', -25, kz(15), 18, 15, 8.5, '#9c4f2e', 'g'),
    B('otel', 'Otel', '🏨', 19, kz(15), 18, 15, 11, '#6f7f5a', 'g'),
    B('postane', 'Postane', '✉️', 38, kz(11), 13, 11, 6.5, '#7b8fa3', 'g'),
    B('belediye', 'Belediye', '🏛️', 55, kz(13), 15, 13, 8, '#c8b48a', 'g'),
    B('ev2', 'Ev', '🏠', 73, kz(10), 11, 10, 5, '#8fa07a', 'g', 'ev'),
    // Güney sıra
    B('ev3', 'Ev', '🏠', -76, gz(10), 10, 10, 5, '#b0907a', 'k', 'ev'),
    B('silahci', 'Silahçı', '🔫', -62, gz(10), 12, 10, 6, '#5d4a3a', 'k'),
    B('firin', 'Fırın', '🍞', -48, gz(10), 11, 10, 5.5, '#c98b52', 'k'),
    B('doktor', 'Doktor', '💊', -35, gz(10), 11, 10, 6, '#e0d6c2', 'k'),
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
  // Katı olmayan alanlar (çit, mezarlık): haritada çizilir, içinden yürünür
  const alanlar = [
    { id: 'agil', ad: 'Ağıl', emoji: '🐄', x: -16, z: 62, g: 16, d: 13 },
    { id: 'mezarlik', ad: 'Mezarlık', emoji: '✝️', x: 42, z: 62, g: 16, d: 12 },
  ];
  // Küçük engeller (kuyu, fıçılar, at arabaları): yuvarlak, r yarıçap
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
  const RAY_Z = -78;     // demiryolu (görsel)

  const binaBul = id => binalar.find(b => b.id === id) || alanlar.find(a => a.id === id);
  // Bina kapısının önündeki nokta (ox: kapıya göre yana kayma)
  function kapiOnu(id, ox = 0) {
    const b = binaBul(id);
    if (b.kapi === 'g') return { x: b.x + ox, z: b.z + b.d / 2 + 1.6, yon: Math.PI };       // kapıya bakmak için -z'ye dön
    return { x: b.x + ox, z: b.z - b.d / 2 - 1.6, yon: 0 };
  }

  // Görevler: haydutlar yapar. olay = şeriflere giden bildirim yazısı
  const G = (id, ad, olay, emoji, sure, yer) => ({ id, ad, olay, emoji, sure, ...yer });
  const gorevler = [
    G('banka', 'Banka kasasını soy', 'Banka kasası soyuldu', '🏦', 6, kapiOnu('banka')),
    G('anahtar', 'Hapishane anahtarını çal', 'Hapishane anahtarı çalındı', '🔑', 5, kapiOnu('serif', -3)),
    G('afis', 'Aranıyor afişlerini yırt', 'Aranıyor afişleri yırtıldı', '📜', 3, kapiOnu('serif', 4.5)),
    G('kasa', 'Salonun kasasından para al', 'Salonun kasası boşaltıldı', '💰', 4, kapiOnu('salon', -5)),
    G('kumar', 'Kumar masasında hile yap', 'Kumar masasında hile yapıldı', '🃏', 4, kapiOnu('salon', 5)),
    G('otel', 'Otel odalarını ara', 'Otel odaları arandı', '🛏️', 5, kapiOnu('otel')),
    G('posta', 'Posta çantasını çal', 'Posta çantası çalındı', '✉️', 4, kapiOnu('postane', -3)),
    G('telgraf', 'Telgraf telini kes', 'Telgraf teli kesildi', '⚡', 3, kapiOnu('postane', 5)),
    G('tapu', 'Belediyeden tapuyu çal', 'Belediyeden tapu çalındı', '📃', 5, kapiOnu('belediye')),
    G('tabanca', 'Silahçıdan tabanca çal', 'Silahçıdan tabanca çalındı', '🔫', 4, kapiOnu('silahci')),
    G('ekmek', 'Fırından ekmek çal', 'Fırından ekmek çalındı', '🍞', 3, kapiOnu('firin')),
    G('ilac', 'Doktordan ilaç çal', 'Doktordan ilaç çalındı', '💊', 4, kapiOnu('doktor')),
    G('altin', 'Altın tozu çal', 'Madenciden altın tozu çalındı', '✨', 5, kapiOnu('madenci')),
    G('kilit', 'Demircide kilit kır', 'Demircide kilit kırıldı', '🔨', 4, kapiOnu('demirci')),
    G('bagis', 'Bağış kutusunu boşalt', 'Kilisenin bağış kutusu boşaltıldı', '⛪', 4, kapiOnu('kilise')),
    G('dinamit', 'Raya dinamit koy', 'Demiryoluna dinamit kondu', '🧨', 6, { x: -64, z: -72, yon: Math.PI }),
    G('su', 'Su kulesini del', 'Su kulesi delindi', '💧', 4, kapiOnu('sukulesi')),
    G('kibrit', 'Samanlığa kibrit at', 'Samanlıkta yangın çıktı', '🔥', 4, kapiOnu('samanlik')),
    G('at', 'Ahırdan at çal', 'Ahırdan at çalındı', '🐎', 5, kapiOnu('ahir')),
    G('sigir', 'Sığırları ağıldan sal', 'Sığırlar ağıldan kaçtı', '🐄', 4, { x: -16, z: 54.5, yon: 0 }),
  ];
  // Kılık değiştirme noktaları
  const kiliklar = [
    { id: 'terzi', ad: 'Terzi', ...kapiOnu('terzi') },
    { id: 'camasir', ad: 'Çamaşır ipi', x: 30, z: 52, yon: 0 },
    { id: 'otelarka', ad: 'Otel deposu', x: 32, z: -29, yon: Math.PI },
  ];

  // ---------- Çarpışma ----------
  const kutular = binalar.map(b => ({ x1: b.x - b.g / 2, x2: b.x + b.g / 2, z1: b.z - b.d / 2, z2: b.z + b.d / 2 }));

  // Şerif bekleme odası: oyun başında şerifler burada kilitli bekler, sonra doğudaki kapı açılır
  const serifOdasi = { x: -61, z: -31, g: 10, d: 7, y: 3.2, kapiG: 2.4 };
  {
    const o = serifOdasi, K = 0.5, x1 = o.x - o.g / 2, x2 = o.x + o.g / 2, z1 = o.z - o.d / 2, z2 = o.z + o.d / 2, kg = o.kapiG / 2;
    kutular.push(
      { x1, x2, z1: z1 - K / 2, z2: z1 + K / 2 }, { x1, x2, z1: z2 - K / 2, z2: z2 + K / 2 },          // kuzey, güney
      { x1: x1 - K / 2, x2: x1 + K / 2, z1, z2 },                                                        // batı
      { x1: x2 - K / 2, x2: x2 + K / 2, z1, z2: o.z - kg }, { x1: x2 - K / 2, x2: x2 + K / 2, z1: o.z + kg, z2 },   // doğu (kapı boşluğu)
      { x1: x2 - K / 2, x2: x2 + K / 2, z1: o.z - kg, z2: o.z + kg, kapi: true },                        // kapı
    );
  }
  let kapiKapali = false;
  const sayilir = k => !k.kapi || kapiKapali;
  function icerde(x, z, pay = 0) {
    for (const k of kutular) if (sayilir(k) && x > k.x1 - pay && x < k.x2 + pay && z > k.z1 - pay && z < k.z2 + pay) return true;
    for (const e of engeller) if ((x - e.x) ** 2 + (z - e.z) ** 2 < (e.r + pay) ** 2) return true;
    return false;
  }
  // Yuvarlak bir karakteri engellerin dışına it
  function it(x, z, r = 0.35) {
    for (const k of kutular) {
      if (!sayilir(k)) continue;
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
    for (const e of engeller) {
      const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz), m = e.r + r;
      if (d < m) { if (d < 1e-4) { x += m; } else { x = e.x + dx / d * m; z = e.z + dz / d * m; } }
    }
    x = Math.max(-SINIR, Math.min(SINIR, x)); z = Math.max(-SINIR, Math.min(SINIR, z));
    return { x, z };
  }
  function yolAcik(x1, z1, x2, z2, pay = 0.5) {
    const d = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(d / 0.6));
    for (let i = 0; i <= n; i++) { const t = i / n; if (icerde(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, pay)) return false; }
    return true;
  }
  // Işın: binalara çarpmadan önce gidebildiği mesafe (kamera ve atış için)
  function isin(x, z, dx, dz, enFazla) {
    for (let t = 0.3; t < enFazla; t += 0.3) { if (icerdeBina(x + dx * t, z + dz * t)) return t; }
    return enFazla;
  }
  function icerdeBina(x, z) { for (const k of kutular) if (sayilir(k) && x > k.x1 && x < k.x2 && z > k.z1 && z < k.z2) return true; return false; }

  // ---------- Yürüme ağı (botlar için) ----------
  const ADIM = 6;
  const dugumler = [];
  for (let x = -84; x <= 84; x += ADIM) for (let z = -84; z <= 84; z += ADIM) if (!icerde(x, z, 1.2)) dugumler.push({ x, z, k: [] });
  dugumler.forEach((a, i) => dugumler.forEach((b, j) => {
    if (j <= i) return;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d < ADIM * 1.5 && yolAcik(a.x, a.z, b.x, b.z, 0.6)) { a.k.push(j); b.k.push(i); }
  }));
  function enYakinDugum(x, z) {
    let en = -1, ed = 1e9;
    dugumler.forEach((d, i) => { const m = (d.x - x) ** 2 + (d.z - z) ** 2; if (m < ed && d.k.length && yolAcik(x, z, d.x, d.z, 0.3)) { ed = m; en = i; } });
    if (en < 0) dugumler.forEach((d, i) => { const m = (d.x - x) ** 2 + (d.z - z) ** 2; if (m < ed && d.k.length) { ed = m; en = i; } });
    return en;
  }
  // Noktadan noktaya yol (noktalar listesi). Kısaltma: arada engel yoksa ara düğümleri atla.
  function yol(x1, z1, x2, z2) {
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
      while (j > i && !yolAcik(cx, cz, liste[j].x, liste[j].z, 0.45)) j--;
      kisa.push(liste[j]); cx = liste[j].x; cz = liste[j].z; i = j + 1;
    }
    return kisa;
  }

  // Botların uğrayacağı ilginç yerler: görevler, kılık yerleri, kapılar, caddede rastgele noktalar
  const ugraklar = [
    ...gorevler.map(g => ({ x: g.x, z: g.z, yon: g.yon, bekle: [3, 8] })),
    ...kiliklar.map(k => ({ x: k.x, z: k.z, yon: k.yon, bekle: [3, 7] })),
    ...binalar.filter(b => b.tur === 'ev').map(b => ({ ...kapiOnu(b.id), bekle: [2, 6] })),
  ];
  for (let x = -80; x <= 80; x += 8) { ugraklar.push({ x, z: -5.5, bekle: [1, 5] }); ugraklar.push({ x, z: 5.5, bekle: [1, 5] }); }
  for (let z = -70; z <= 70; z += 10) if (Math.abs(z) > 10) ugraklar.push({ x: (z % 20 ? 3 : -3), z, bekle: [1, 4] });

  // Odanın içinde rastgele bir yer (şeriflerin başlangıcı)
  function odadaYer() { const o = serifOdasi; return { x: o.x - o.g / 2 + 1 + Math.random() * (o.g - 2), z: o.z - o.d / 2 + 1 + Math.random() * (o.d - 2) }; }

  return { serifOdasi, odadaYer, odaKapisi(kapali) { kapiKapali = !!kapali; }, get kapiKapali() { return kapiKapali; }, SINIR, CADDE, ARA, RAY_Z, binalar, alanlar, engeller, gorevler, kiliklar, ugraklar, it, icerde, yolAcik, isin, yol, binaBul, dugumSayisi: dugumler.length };
})();
if (typeof module !== 'undefined') module.exports = Kasaba;
