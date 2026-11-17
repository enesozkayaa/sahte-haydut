// =============================================================
// Sahte Haydut - 10 insan karakter (Three.js kutularından), yürüme animasyonu, takım çizgisi
// Karakter +z yönüne bakar; grup.rotation.y = yön.
// =============================================================

const Karakter = (() => {
  const TIPLER = [
    { ad: 'Kovboy', ten: '#e0b18a', gomlek: '#c9573d', yelek: '#6b4428', pantolon: '#3b4e6b', sapka: 'kovboy', sapkaRenk: '#c8a165', bandana: '#b8222c', bıyık: '#5a3a22' },
    { ad: 'Barmen', ten: '#d9a37e', gomlek: '#f2f2ee', yelek: '#1d1d22', pantolon: '#1d1d22', sapka: 'kel', onluk: '#ffffff', bıyık: '#2a1a10', buyukBiyik: true, gen: 1.12 },
    { ad: 'Saloon Kızı', ten: '#f0c8a8', elbise: '#b5243b', gomlek: '#b5243b', sac: '#7a2a1a', sapka: 'topuz', tuy: '#f5d76e', boy: 0.95 },
    { ad: 'Madenci', ten: '#c99573', gomlek: '#7a7f86', yelek: '#4a6fa5', pantolon: '#4a6fa5', sapka: 'baret', sapkaRenk: '#6b4a2a', sakal: '#bdbdbd', uzunSakal: true },
    { ad: 'İmam', ten: '#e8c0a0', gomlek: '#2f3d33', pantolon: '#2f3d33', elbise: '#2f3d33', sapka: 'sarik', sapkaRenk: '#f4f1e8', sakal: '#3a2a1a', boy: 1.04 },
    { ad: 'Doktor', ten: '#f1cfb0', gomlek: '#6c6f75', yelek: '#53565c', pantolon: '#4a4c52', sapka: 'silindir', sapkaRenk: '#141418', gozluk: true, bıyık: '#8a6a4a', canta: '#3a2416' },
    { ad: 'Çiftçi', ten: '#c98d5f', gomlek: '#4f8a3c', yelek: '#8a5a2c', pantolon: '#8a5a2c', sapka: 'hasir', sapkaRenk: '#e2c46b', askili: true },
    { ad: 'Demirci', ten: '#b57a55', gomlek: '#b57a55', onluk: '#5a3820', pantolon: '#26262a', sapka: 'kel', sakal: '#1a1410', gen: 1.25, boy: 1.05, ciplakKol: true },
    { ad: 'Kumarbaz', ten: '#e5b896', gomlek: '#5b2b6e', yelek: '#f0ece0', pantolon: '#3b1c48', sapka: 'melon', sapkaRenk: '#121212', bıyık: '#1a1a1a', ince: true },
    { ad: 'Yaşlı Nine', ten: '#efc9ae', elbise: '#9d8bb5', gomlek: '#9d8bb5', sac: '#d9d9d9', sapka: 'topuz', sal: '#d8cfc0', boy: 0.9, baston: true },
    // 10: Şerif — sadece şerifler giyer, kasabalılarda yok
    { ad: 'Şerif', ten: '#d9a37e', gomlek: '#cfae72', yelek: '#4a2e18', pantolon: '#3a2c20', sapka: 'serif', sapkaRenk: '#1e140c', bıyık: '#3a2414', buyukBiyik: true, kemer: true, gen: 1.06, boy: 1.03 },
  ];
  const SERIF_TIP = 10;

  const geoCache = new Map(), matCache = new Map();
  const kutu = (w, h, d) => { const k = `k${w},${h},${d}`; if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d)); return geoCache.get(k); };
  const silindir = (r1, r2, h, n = 10) => { const k = `s${r1},${r2},${h},${n}`; if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(r1, r2, h, n)); return geoCache.get(k); };
  const kure = (r, n = 10) => { const k = `y${r},${n}`; if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, n, Math.max(6, n - 3))); return geoCache.get(k); };
  const mat = renk => { if (!matCache.has(renk)) matCache.set(renk, new THREE.MeshLambertMaterial({ color: renk })); return matCache.get(renk); };
  function parca(geo, renk, x, y, z, ebeveyn) { const m = new THREE.Mesh(geo, mat(renk)); m.position.set(x, y, z); ebeveyn.add(m); return m; }

  function yap(tipNo, serif = false) {
    const t = TIPLER[tipNo] || TIPLER[0];
    const g = new THREE.Group();
    const govdeG = new THREE.Group(); g.add(govdeG);
    const gen = t.gen || 1, inc = t.ince ? 0.9 : 1;
    // Bacaklar: kalçadan döner, dizden bükülür (uyluk + diz + baldır + çizme)
    const bacak = s => {
      const p = new THREE.Group(); p.position.set(0.12 * s * gen, 0.86, 0); govdeG.add(p);
      parca(kutu(0.17 * inc, 0.42, 0.2), t.pantolon || '#333', 0, -0.2, 0, p);
      const diz = new THREE.Group(); diz.position.set(0, -0.4, 0); p.add(diz);
      parca(kutu(0.16 * inc, 0.36, 0.19), t.pantolon || '#333', 0, -0.17, 0, diz);
      parca(kutu(0.19, 0.12, 0.28), '#2b1a10', 0, -0.4, 0.04, diz);   // çizme
      p.userData.diz = diz;
      return p;
    };
    const bacakL = bacak(1), bacakR = bacak(-1);
    // Gövde
    parca(kutu(0.5 * gen * inc, 0.66, 0.3), t.gomlek, 0, 1.2, 0, govdeG);
    if (t.yelek) { parca(kutu(0.52 * gen * inc, 0.5, 0.06), t.yelek, 0, 1.24, 0.15, govdeG); }
    if (t.askili) { parca(kutu(0.42 * gen, 0.42, 0.05), t.yelek, 0, 1.07, 0.16, govdeG); }
    if (t.onluk) parca(kutu(0.42 * gen, 0.85, 0.04), t.onluk, 0, 1.0, 0.17, govdeG);
    if (t.yaka) parca(kutu(0.16, 0.06, 0.05), t.yaka, 0, 1.5, 0.155, govdeG);
    if (t.bandana) parca(kutu(0.3, 0.1, 0.32), t.bandana, 0, 1.52, 0.01, govdeG);
    if (t.sal) parca(kutu(0.6 * gen, 0.2, 0.36), t.sal, 0, 1.43, 0, govdeG);
    if (t.elbise) parca(silindir(0.27 * gen, 0.42 * gen, 0.9, 12), t.elbise, 0, 0.47, 0, govdeG);
    if (t.canta) parca(kutu(0.3, 0.2, 0.14), t.canta, -0.4 * gen, 0.85, 0.05, govdeG);
    if (serif) {   // büyük altın yıldız
      [0, Math.PI / 4].forEach(a => { const y = parca(kutu(0.12, 0.12, 0.03), '#ffd23f', -0.13, 1.33, 0.2, govdeG); y.rotation.z = a; });
      parca(kutu(0.04, 0.04, 0.035), '#b8860b', -0.13, 1.33, 0.215, govdeG);
    }
    if (t.kemer) {   // silah kemeri, toka, boş kılıf
      parca(kutu(0.56 * gen, 0.1, 0.34), '#2e1c0e', 0, 0.9, 0, govdeG);
      parca(kutu(0.09, 0.07, 0.03), '#c9c9d2', 0, 0.9, 0.175, govdeG);
      parca(kutu(0.1, 0.24, 0.12), '#3a2210', 0.32 * gen, 0.8, 0.03, govdeG);
    }
    // Kollar (omuzdan döner)
    // Kollar: omuzdan döner, dirsekten bükülür
    const kol = s => {
      const p = new THREE.Group(); p.position.set(0.33 * s * gen * inc, 1.48, 0); govdeG.add(p);
      const renk = t.ciplakKol ? t.ten : t.gomlek;
      parca(kutu(0.14, 0.33, 0.16), renk, 0, -0.16, 0, p);
      const dirsek = new THREE.Group(); dirsek.position.set(0, -0.31, 0); p.add(dirsek);
      parca(kutu(0.13, 0.28, 0.15), renk, 0, -0.13, 0, dirsek);
      parca(kutu(0.12, 0.1, 0.12), t.ten, 0, -0.32, 0, dirsek);
      p.userData.dirsek = dirsek;
      return p;
    };
    const kolL = kol(1), kolR = kol(-1);
    if (t.baston) { const b = parca(silindir(0.025, 0.025, 0.9, 6), '#5a3a1a', 0, -0.64, 0.06, kolR.userData.dirsek); b.rotation.x = 0.1; }
    if (serif) tabancaEkle(kolR.userData.dirsek);
    // Görev eşyaları (sadece görevde görünür): çekiç ve zehir şişesi
    let cekic = null, sise = null, bicak = null;
    if (!serif) {
      const d = kolR.userData.dirsek;
      cekic = new THREE.Group(); cekic.position.set(0, -0.34, 0.02); d.add(cekic);
      parca(kutu(0.04, 0.04, 0.38), '#6a4424', 0, 0, 0.14, cekic); parca(kutu(0.1, 0.09, 0.18), '#4a4a52', 0, 0, 0.33, cekic);
      sise = new THREE.Group(); sise.position.set(0, -0.36, 0.05); d.add(sise);
      parca(silindir(0.065, 0.065, 0.26, 8), '#2f8a3a', 0, -0.08, 0, sise); parca(silindir(0.025, 0.03, 0.1, 6), '#2f8a3a', 0, -0.26, 0, sise); parca(kutu(0.1, 0.06, 0.02), '#f2f2f2', 0, -0.06, 0.066, sise);
      bicak = new THREE.Group(); bicak.position.set(0, -0.36, 0.03); d.add(bicak);   // bıçak: sadece bıçaklarken görünür
      parca(kutu(0.04, 0.1, 0.05), '#3a2414', 0, 0, 0, bicak); parca(kutu(0.1, 0.02, 0.06), '#8a8a92', 0, -0.06, 0, bicak); parca(kutu(0.015, 0.05, 0.3), '#e4e8ee', 0, -0.03, 0.17, bicak);
      cekic.visible = sise.visible = bicak.visible = false;
    }
    // Baş
    const bas = new THREE.Group(); bas.position.set(0, 1.72, 0); govdeG.add(bas);
    parca(kutu(0.3, 0.32, 0.3), t.ten, 0, 0, 0, bas);
    parca(kutu(0.05, 0.05, 0.02), '#111', 0.07, 0.03, 0.155, bas); parca(kutu(0.05, 0.05, 0.02), '#111', -0.07, 0.03, 0.155, bas);
    parca(kutu(0.06, 0.07, 0.05), t.ten, 0, -0.03, 0.17, bas);   // burun
    if (t.gozluk) { parca(kutu(0.24, 0.07, 0.02), '#c8c8d0', 0, 0.03, 0.165, bas); }
    if (t.bıyık) parca(kutu(t.buyukBiyik ? 0.26 : 0.16, 0.05, 0.04), t.bıyık, 0, -0.08, 0.17, bas);
    if (t.sakal) parca(kutu(0.3, t.uzunSakal ? 0.28 : 0.14, 0.08), t.sakal, 0, t.uzunSakal ? -0.2 : -0.13, 0.14, bas);
    if (t.sac) { parca(kutu(0.32, 0.12, 0.32), t.sac, 0, 0.14, -0.01, bas); parca(kutu(0.32, 0.3, 0.06), t.sac, 0, -0.02, -0.15, bas); }
    // Şapkalar
    const sr = t.sapkaRenk;
    switch (t.sapka) {
      case 'kovboy': parca(silindir(0.36, 0.36, 0.04, 14), sr, 0, 0.17, 0, bas); parca(silindir(0.16, 0.19, 0.2, 10), sr, 0, 0.28, 0, bas); break;
      case 'silindir': parca(silindir(0.25, 0.25, 0.03, 14), sr, 0, 0.17, 0, bas); parca(silindir(0.16, 0.16, 0.36, 12), sr, 0, 0.36, 0, bas); break;
      case 'melon': parca(silindir(0.24, 0.24, 0.03, 14), sr, 0, 0.17, 0, bas); { const k = parca(kure(0.17, 12), sr, 0, 0.19, 0, bas); k.scale.y = 0.9; } break;
      case 'hasir': parca(silindir(0.46, 0.46, 0.03, 16), sr, 0, 0.17, 0, bas); parca(silindir(0.15, 0.18, 0.14, 10), sr, 0, 0.24, 0, bas); break;
      case 'baret': parca(kure(0.19, 12), sr, 0, 0.14, 0, bas); parca(kutu(0.08, 0.07, 0.04), '#ffd84a', 0, 0.2, 0.18, bas); break;
      case 'serif': {   // geniş kenarlı, yanları kalkık koyu şerif şapkası + altın bant
        parca(silindir(0.42, 0.42, 0.04, 16), sr, 0, 0.17, 0, bas);
        [-1, 1].forEach(s => { const k = parca(kutu(0.1, 0.03, 0.5), sr, 0.38 * s, 0.22, 0, bas); k.rotation.z = -0.6 * s; });
        parca(silindir(0.17, 0.2, 0.26, 12), sr, 0, 0.31, 0, bas);
        parca(silindir(0.205, 0.205, 0.05, 12), '#c9a23a', 0, 0.21, 0, bas);
        break;
      }
      case 'sarik': { const s = parca(kure(0.21, 12), sr, 0, 0.17, 0, bas); s.scale.set(1, 0.62, 1); parca(silindir(0.2, 0.2, 0.06, 12), sr, 0, 0.1, 0, bas); parca(kure(0.07, 8), '#8a2a2a', 0, 0.27, 0, bas); break; }
      case 'duz': parca(silindir(0.34, 0.34, 0.04, 14), sr, 0, 0.17, 0, bas); parca(silindir(0.15, 0.15, 0.1, 10), sr, 0, 0.22, 0, bas); break;
      case 'topuz': parca(kure(0.11, 10), t.sac, 0, 0.2, -0.1, bas); if (t.tuy) { const f = parca(kutu(0.04, 0.22, 0.03), t.tuy, 0.1, 0.27, -0.05, bas); f.rotation.z = -0.4; } break;
      default: parca(kutu(0.31, 0.06, 0.31), t.ten, 0, 0.17, 0, bas);   // kel
    }
    const boy = t.boy || 1;
    g.scale.set(1, boy, 1);
    g.userData = { tipNo, govdeG, bacakL, bacakR, kolL, kolR, bas, faz: Math.random() * 6, cizgi: null, olum: 0, serif, atesT: 0, cekic, sise, bicak };
    return g;
  }

  // Altıpatlar tabanca: kabza elde, namlu kolun devamı yönünde (kol kalkınca ileri bakar)
  function tabancaEkle(kol) {
    const t = new THREE.Group(); t.position.set(0, -0.35, 0.02); kol.add(t);
    parca(kutu(0.06, 0.11, 0.07), '#5a3418', 0, 0.02, 0, t);                                  // kabza
    const silindirG = parca(silindir(0.045, 0.045, 0.09, 8), '#3a3a42', 0, -0.07, 0.03, t);   // topaç
    silindirG.rotation.x = Math.PI / 2;
    parca(kutu(0.035, 0.24, 0.035), '#2a2a30', 0, -0.2, 0.03, t);                             // namlu
    parca(kutu(0.02, 0.04, 0.03), '#2a2a30', 0, -0.03, -0.04, t);                             // tetik korkuluğu
    return t;
  }
  // Birinci şahıs görünümünde kameraya bağlı tabanca (sağ altta görünür)
  function elTabancasi() {
    const g = new THREE.Group();
    const m = c => new THREE.MeshBasicMaterial({ color: c });
    const ekle = (geo, renk, x, y, z) => { const k = new THREE.Mesh(geo, m(renk)); k.position.set(x, y, z); g.add(k); return k; };
    ekle(new THREE.BoxGeometry(0.06, 0.06, 0.34), '#2a2a30', 0, 0.02, -0.17);                 // namlu
    const top = ekle(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), '#45454e', 0, 0, 0.02); top.rotation.x = Math.PI / 2;
    const kabza = ekle(new THREE.BoxGeometry(0.06, 0.16, 0.08), '#6a3e1c', 0, -0.09, 0.09); kabza.rotation.x = -0.35;
    ekle(new THREE.BoxGeometry(0.1, 0.1, 0.14), '#d9a37e', 0, -0.1, 0.13);                   // el
    const alev = ekle(new THREE.SphereGeometry(0.05, 8, 6), '#ffdd55', 0, 0.02, -0.38); alev.visible = false;
    g.userData.alev = alev;
    g.scale.setScalar(0.55);
    g.traverse(o => { if (o.isMesh) { o.material.depthTest = false; o.renderOrder = 30; } });
    return g;
  }
  // Ateş edince kolunu kaldırsın
  function atesEt(g) { g.userData.atesT = 0.6; }

  // h: 0 duruyor, 1 yürüyor, 2 koşuyor
  function canlandir(g, h, dt) {
    const u = g.userData;
    if (u.olum > 0) {   // yere düşme
      u.olum = Math.min(1, u.olum + dt * 2.5);
      u.govdeG.rotation.x = -Math.PI / 2 * u.olum; u.govdeG.position.y = 0.15 * u.olum;
      return;
    }
    const yum = (a, b, k = 12) => a + (b - a) * Math.min(1, dt * k);
    const dizL = u.bacakL.userData.diz, dizR = u.bacakR.userData.diz;
    const dirL = u.kolL.userData.dirsek, dirR = u.kolR.userData.dirsek;
    if (u.cekic) { u.cekic.visible = h === 10 + ANIMLER.indexOf('dov'); u.sise.visible = h === 10 + ANIMLER.indexOf('dok'); u.bicak.visible = h === 10 + ANIMLER.indexOf('bicak'); }
    if (h < 10) u.sonAnim = null;
    if (h >= 10) { gorevPozu(u, ANIMLER[h - 10] || 'calis', dt, yum, dizL, dizR, dirL, dirR); return; }
    if (h === 3) {   // görev yapıyor: kollar önde, dirsekler bükük, elleri bir şeyle uğraşıyor
      u.faz += dt * 9;
      u.bacakL.rotation.x = yum(u.bacakL.rotation.x, 0, 10); u.bacakR.rotation.x = yum(u.bacakR.rotation.x, 0, 10);
      dizL.rotation.x = yum(dizL.rotation.x, 0.08, 10); dizR.rotation.x = yum(dizR.rotation.x, 0.08, 10);
      u.kolL.rotation.x = yum(u.kolL.rotation.x, -0.75 + Math.sin(u.faz) * 0.25, 10); dirL.rotation.x = yum(dirL.rotation.x, -0.7 + Math.cos(u.faz) * 0.25, 10);
      if (!u.serif) { u.kolR.rotation.x = yum(u.kolR.rotation.x, -0.75 - Math.sin(u.faz) * 0.25, 10); dirR.rotation.x = yum(dirR.rotation.x, -0.7 - Math.cos(u.faz) * 0.25, 10); }
      u.govdeG.rotation.x = yum(u.govdeG.rotation.x, 0.12, 10); u.govdeG.position.y = 0;
      return;
    }
    // Adım döngüsü: f ilerledikçe bir bacak öne savrulur (dizi bükülerek kalkar), diğeri yere basıp geri iter
    const kos = h === 2, hiz = kos ? 10.5 : h === 1 ? 7 : 0;
    if (hiz) u.faz += dt * hiz;
    const f = u.faz, sn = Math.sin(f), cs = Math.cos(f);
    const A = kos ? 0.85 : 0.48;                 // kalça salınımı
    const K = kos ? 1.55 : 0.85;                 // diz bükülmesi (öne savrulurken)
    const kalcaL = hiz ? A * sn : 0, kalcaR = hiz ? -A * sn : 0;
    // Diz: bacak öne savrulurken bükülür (kalça açısı azalırken), yere basarken neredeyse düz; koşarken arkada da kalkar
    // (kalça açısı + = bacak geride; sol için öne savrulma cos<0 anında olur)
    const dizHedefL = hiz ? K * Math.max(0, -cs) + (kos ? 0.35 * Math.max(0, sn) : 0.06) : 0;
    const dizHedefR = hiz ? K * Math.max(0, cs) + (kos ? 0.35 * Math.max(0, -sn) : 0.06) : 0;
    const egim = kos ? 0.22 : hiz ? 0.04 : 0;
    u.bacakL.rotation.x = yum(u.bacakL.rotation.x, kalcaL - egim, 16); u.bacakR.rotation.x = yum(u.bacakR.rotation.x, kalcaR - egim, 16);
    dizL.rotation.x = yum(dizL.rotation.x, dizHedefL, 18); dizR.rotation.x = yum(dizR.rotation.x, dizHedefR, 18);
    // Kollar bacaklara ters sallanır; dirsek yürürken hafif, koşarken çok bükük
    const kolA = kos ? 0.9 : 0.45, dirsek = kos ? -1.35 : hiz ? -0.28 : -0.1;
    u.kolL.rotation.x = yum(u.kolL.rotation.x, hiz ? -kolA * sn : 0);
    dirL.rotation.x = yum(dirL.rotation.x, dirsek + (hiz ? -0.15 * Math.max(0, -sn) : 0));
    if (u.serif) {   // şerif tabancayı tutar; ateş edince / nişan alınca kolunu kaldırıp düz uzatır
      u.atesT = Math.max(0, u.atesT - dt);
      const nisanda = u.nisan != null || u.atesT > 0;
      const kol = u.nisan != null ? -Math.PI / 2 - u.nisan : u.atesT > 0 ? -1.5 : -0.25 + (hiz ? kolA * 0.3 * sn : 0);
      u.kolR.rotation.x = u.atesT > 0.35 && u.nisan == null ? kol : yum(u.kolR.rotation.x, kol);
      dirR.rotation.x = yum(dirR.rotation.x, nisanda ? 0 : -0.35);
    } else {
      u.kolR.rotation.x = yum(u.kolR.rotation.x, hiz ? kolA * sn : 0);
      dirR.rotation.x = yum(dirR.rotation.x, dirsek + (hiz ? -0.15 * Math.max(0, sn) : 0));
    }
    // Gövde: her adımda hafif iner-kalkar, koşarken öne eğilir ve hafif yana döner
    const zipla = hiz ? Math.abs(cs) * (kos ? 0.09 : 0.035) - (kos ? 0.06 : 0.02) : 0;
    u.govdeG.position.y = yum(u.govdeG.position.y, zipla, 20);
    u.govdeG.rotation.x = yum(u.govdeG.rotation.x, kos ? 0.22 : hiz ? 0.04 : 0);
    u.govdeG.rotation.y = yum(u.govdeG.rotation.y, hiz ? sn * (kos ? 0.1 : 0.05) : 0);
    dirR.rotation.y = yum(dirR.rotation.y, 0);
  }

  // ---------- Göreve özel hareketler ----------
  // Ağdaki "h" değeri: 10 + bu listedeki sıra. Oyuncu da bot da aynı listeyi kullanır.
  const ANIMLER = Kasaba.ANIMLER;   // liste kasaba.js'te (motor da kullanır)
  function gorevPozu(u, anim, dt, yum, dizL, dizR, dirL, dirR) {
    u.faz += dt * 6;
    const f = u.faz, sn = Math.sin(f), cs = Math.cos(f);
    // Varsayılan: dik duruş
    const p = { kL: 0, kR: 0, dL: 0.06, dR: 0.06, oL: -0.1, oR: -0.1, eL: -0.15, eR: -0.15, gx: 0, gy: 0, sR: 0 };
    switch (anim) {
      case 'ara':      // eğilip raflarda/çekmecede arar
        Object.assign(p, { gx: 0.45, kL: -0.25, kR: -0.25, dL: 0.4, dR: 0.4, oL: -0.7 + sn * 0.3, oR: -0.7 - sn * 0.3, eL: -0.6 + cs * 0.3, eR: -0.6 - cs * 0.3, gy: -0.04 }); break;
      case 'cevir':    // kasanın şifre çarkını çevirir, kulağını dayar
        Object.assign(p, { gx: 0.2, oL: -1.0, eL: -0.9, oR: -1.15, eR: -0.55 + sn * 0.25, sR: sn * 0.4 }); break;
      case 'uzan':     // yukarıdaki çividen/kancadan bir şey almaya uzanır
        Object.assign(p, { gx: -0.12, oR: -2.7 + sn * 0.12, eR: -0.15, oL: -0.3, eL: -0.3 }); break;
      case 'yirt':     // afişi iki eliyle yırtar
        Object.assign(p, { oL: -1.75 + sn * 0.2, oR: -1.75 - sn * 0.2, eL: -0.9 - Math.max(0, sn) * 0.5, eR: -0.9 - Math.max(0, -sn) * 0.5, gx: 0.05 }); break;
      case 'kes':      // telgraf telini kollar havada keser
        Object.assign(p, { oL: -2.5, oR: -2.5 + Math.abs(sn) * 0.2, eL: -0.5, eR: -0.5 - Math.abs(sn) * 0.4, gx: -0.1 }); break;
      case 'dov': {    // çekici kaldırıp örse indirir
        const d = (f * 0.5) % 1, kalk = d < 0.7 ? d / 0.7 : 1 - (d - 0.7) / 0.3;   // yavaş kalkar, hızla iner
        Object.assign(p, { gx: 0.2 + (1 - kalk) * 0.12, oR: -0.6 - kalk * 2.2, eR: -0.2 - kalk * 0.6, oL: -0.8, eL: -0.6, kL: -0.15, dL: 0.25, dR: 0.15 });
        break;
      }
      case 'dok':      // şişeyi eğip zehri döker
        Object.assign(p, { gx: 0.35, oR: -1.25 + sn * 0.08, eR: -0.35, oL: -1.0, eL: -0.9, kL: -0.2, kR: -0.2, dL: 0.3, dR: 0.3, sR: 0 }); break;
      case 'cok':      // çömelip bir şey koyar / kibrit çakar
        Object.assign(p, { kL: -1.25, kR: -1.05, dL: 2.05, dR: 1.9, gy: -0.42, gx: 0.45, oR: -0.9 + Math.max(0, sn) * 0.6, eR: -0.4, oL: -0.6, eL: -0.6 }); break;
      case 'otur':     // sandalyede/berber koltuğunda oturur, eller dizde
        Object.assign(p, { kL: -1.5, kR: -1.5, dL: 1.5, dR: 1.5, gy: -0.4, gx: -0.05, oL: -0.55, oR: -0.55, eL: -0.9, eR: -0.9 }); break;
      case 'kumar':    // masada oturup kâğıt oynar
        Object.assign(p, { kL: -1.5, kR: -1.5, dL: 1.5, dR: 1.5, gy: -0.4, gx: 0.15, oL: -0.85, oR: -0.85 + Math.max(0, sn) * 0.35, eL: -1.0, eR: -0.9 - Math.max(0, sn) * 0.3 }); break;
      case 'dans': {   // dans: kollar havada, ayaklar sırayla vurur, gövde döner
        Object.assign(p, { oL: -2.6 + sn * 0.3, oR: -2.6 - sn * 0.3, eL: -0.6, eR: -0.6, kL: Math.max(0, sn) * -0.7, kR: Math.max(0, -sn) * -0.7, dL: Math.max(0, sn) * 1.1, dR: Math.max(0, -sn) * 1.1, gy: Math.abs(cs) * 0.08 });
        u.govdeG.rotation.y = Math.sin(f * 0.5) * 0.6;
        break;
      }
      case 'besle':    // ata saman uzatır, hafif eğilir
        Object.assign(p, { gx: 0.25, oR: -1.2 + sn * 0.12, eR: -0.2, oL: -0.5 + cs * 0.15, eL: -0.6 }); break;
      case 'ye':       // masada oturup kaşıkla yer
        Object.assign(p, { kL: -1.5, kR: -1.5, dL: 1.5, dR: 1.5, gy: -0.4, gx: 0.12, oL: -0.8, eL: -0.9, oR: -0.7 - Math.max(0, sn) * 0.5, eR: -1.2 - Math.max(0, sn) * 0.9 }); break;
      case 'yas':      // tabutun başında başı eğik, eller önde kavuşmuş, hafif sallanır
        Object.assign(p, { gx: 0.32 + sn * 0.04, oL: -0.55, oR: -0.55, eL: -1.25, eR: -1.25 }); break;
      case 'ver':      // barmene para uzatır
        Object.assign(p, { gx: 0.1, oR: -1.4 + sn * 0.1, eR: -0.15, oL: -0.25, eL: -0.3 }); break;
      case 'dua':      // diz çöküp oturur, ellerini göğüs hizasında avuçları yukarı açar
        Object.assign(p, { kL: 0, kR: 0, dL: 1.57, dR: 1.57, gy: -0.4, gx: 0.06 + sn * 0.02, oL: -0.55, oR: -0.55, eL: -1.15, eR: -1.15 }); break;
      case 'bicak': {  // tek vuruş: bıçağı kaldırır, bir kez saplar, öyle kalır
        if (u.sonAnim !== 'bicak') u.bicakBas = f;
        const d = Math.min(1, (f - u.bicakBas) / 4.2);   // ~0,7 sn
        const sapla = d < 0.4 ? 0 : d < 0.6 ? (d - 0.4) / 0.2 : 1;
        Object.assign(p, { gx: 0.1 + sapla * 0.2, oR: -2.3 + sapla * 1.0, eR: -1.2 + sapla * 1.1, oL: -0.9, eL: -0.6, kL: -0.35, dL: 0.35, dR: 0.15 });
        break;
      }
      case 'goster':   // tanık: katili parmağıyla gösterir
        Object.assign(p, { oR: -1.55 + sn * 0.06, eR: 0, oL: -0.2, eL: -0.3, gx: -0.05 }); break;
      case 'eller':    // üstü aranırken eller havada
        Object.assign(p, { oL: -2.9, oR: -2.9, eL: -0.25, eR: -0.25, gx: -0.04 }); break;
      case 'tras':     // berber: usturayla tıraş eder
        Object.assign(p, { gx: 0.25, oR: -1.35 + sn * 0.12, eR: -0.7 + cs * 0.25, oL: -1.2, eL: -0.8 }); break;
      default:         // genel çalışma
        Object.assign(p, { gx: 0.12, oL: -0.75 + sn * 0.25, oR: -0.75 - sn * 0.25, eL: -0.7 + cs * 0.25, eR: -0.7 - cs * 0.25 });
    }
    // Gövde öne eğilince bacaklar dik kalsın (eğilme belden olsun): kalça açısından eğimi çıkar
    u.bacakL.rotation.x = yum(u.bacakL.rotation.x, p.kL - p.gx, 10); u.bacakR.rotation.x = yum(u.bacakR.rotation.x, p.kR - p.gx, 10);
    dizL.rotation.x = yum(dizL.rotation.x, p.dL, 10); dizR.rotation.x = yum(dizR.rotation.x, p.dR, 10);
    u.kolL.rotation.x = yum(u.kolL.rotation.x, p.oL, 12); dirL.rotation.x = yum(dirL.rotation.x, p.eL, 12);
    if (!u.serif) { u.kolR.rotation.x = yum(u.kolR.rotation.x, p.oR, anim === 'dov' ? 20 : 12); dirR.rotation.x = yum(dirR.rotation.x, p.eR, 12); dirR.rotation.y = yum(dirR.rotation.y, p.sR, 12); }
    u.govdeG.rotation.x = yum(u.govdeG.rotation.x, p.gx, 10); u.govdeG.position.y = yum(u.govdeG.position.y, p.gy, 10);
    if (anim !== 'dans') u.govdeG.rotation.y = yum(u.govdeG.rotation.y, 0, 10);
    if (u.sise) u.sise.rotation.x = anim === 'dok' ? 1.9 + Math.sin(f * 0.7) * 0.25 : 0;   // şişe ağzı aşağı
    u.sonAnim = anim;
  }
  // Bu görev hareketinin ağ kodu
  const animKodu = Kasaba.animKodu;

  // Takım çizgisi: vücudu saran renkli kenar + duvar arkasındayken görünen gölge
  function cizgiEkle(g, renk) {
    cizgiKaldir(g);
    const kenar = new THREE.MeshBasicMaterial({ color: renk, side: THREE.BackSide });
    // Duvar arkası gölgesi: kasabadan SONRA ama karakterin kendisinden ÖNCE çizilir (renderOrder 1 < 2).
    // Böylece sadece binaların/kalabalığın arkasında kalan kısım boyanır, görünen karakterin üstüne binmez.
    const xray = new THREE.MeshBasicMaterial({ color: renk, depthWrite: false, depthFunc: THREE.GreaterDepth });
    const eklenen = [];
    const meshler = []; g.traverse(o => { if (o.isMesh) meshler.push(o); });
    meshler.forEach(m => {
      m.renderOrder = 2;
      const k = new THREE.Mesh(m.geometry, kenar); k.scale.setScalar(1.12); k.renderOrder = 2; m.add(k); eklenen.push(k);
      const x = new THREE.Mesh(m.geometry, xray); x.renderOrder = 1; m.add(x); eklenen.push(x);
    });
    g.userData.cizgi = { eklenen, kenar, xray };
  }
  function cizgiKaldir(g) {
    const c = g.userData.cizgi; if (!c) return;
    c.eklenen.forEach(m => { if (m.parent) { m.parent.renderOrder = 0; m.parent.remove(m); } }); c.kenar.dispose(); c.xray.dispose();
    g.userData.cizgi = null;
  }
  // Kanlı el: bıçaklayan haydudun elleri ve göğsü bir süre kanlı görünür
  const kanMat = new THREE.MeshLambertMaterial({ color: '#d01010', emissive: '#4a0000' });   // parlak kırmızı: kırmızı kıyafette de seçilsin
  function kanEkle(g, acik) {
    const u = g.userData;
    if (!acik) { (u.kan || []).forEach(m => m.parent?.remove(m)); u.kan = null; return; }
    if (u.kan) return;
    u.kan = [];
    [u.kolL, u.kolR].forEach(k => {   // eller ve önkol kan içinde
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), kanMat); m.position.set(0, -0.31, 0); k.userData.dirsek.add(m); u.kan.push(m);
      const o = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.12, 0.165), kanMat); o.position.set(0, -0.2, 0); k.userData.dirsek.add(o); u.kan.push(o);
    });
    const sirt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.02), kanMat); sirt.position.set(-0.06, 1.18, -0.165); u.govdeG.add(sirt); u.kan.push(sirt);
    const leke = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.02), kanMat); leke.position.set(0.08, 1.12, 0.165); u.govdeG.add(leke); u.kan.push(leke);
    const leke2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), kanMat); leke2.position.set(-0.1, 1.0, 0.165); u.govdeG.add(leke2); u.kan.push(leke2);
  }
  // Birinci şahıs görünümde kendi kafanı gizle
  function basGizle(g, gizli) { g.userData.bas.visible = !gizli; }

  return { TIPLER, SERIF_TIP, ANIMLER, animKodu, yap, canlandir, cizgiEkle, cizgiKaldir, basGizle, elTabancasi, atesEt, kanEkle };
})();
