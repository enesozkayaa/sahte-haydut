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
    { ad: 'Rahip', ten: '#e8c0a0', gomlek: '#16161a', pantolon: '#16161a', elbise: '#16161a', yaka: '#ffffff', sapka: 'duz', sapkaRenk: '#111114', boy: 1.04 },
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
    // Bacaklar (kalçadan döner)
    const bacak = s => {
      const p = new THREE.Group(); p.position.set(0.12 * s * gen, 0.86, 0); govdeG.add(p);
      parca(kutu(0.17 * inc, 0.74, 0.2), t.pantolon || '#333', 0, -0.37, 0, p);
      parca(kutu(0.19, 0.12, 0.28), '#2b1a10', 0, -0.8, 0.04, p);   // çizme
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
    const kol = s => {
      const p = new THREE.Group(); p.position.set(0.33 * s * gen * inc, 1.48, 0); govdeG.add(p);
      parca(kutu(0.14, 0.6, 0.16), t.ciplakKol ? t.ten : t.gomlek, 0, -0.29, 0, p);
      parca(kutu(0.12, 0.1, 0.12), t.ten, 0, -0.63, 0, p);
      return p;
    };
    const kolL = kol(1), kolR = kol(-1);
    if (t.baston) { const b = parca(silindir(0.025, 0.025, 0.9, 6), '#5a3a1a', 0, -0.95, 0.06, kolR); b.rotation.x = 0.1; }
    if (serif) tabancaEkle(kolR);
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
      case 'duz': parca(silindir(0.34, 0.34, 0.04, 14), sr, 0, 0.17, 0, bas); parca(silindir(0.15, 0.15, 0.1, 10), sr, 0, 0.22, 0, bas); break;
      case 'topuz': parca(kure(0.11, 10), t.sac, 0, 0.2, -0.1, bas); if (t.tuy) { const f = parca(kutu(0.04, 0.22, 0.03), t.tuy, 0.1, 0.27, -0.05, bas); f.rotation.z = -0.4; } break;
      default: parca(kutu(0.31, 0.06, 0.31), t.ten, 0, 0.17, 0, bas);   // kel
    }
    const boy = t.boy || 1;
    g.scale.set(1, boy, 1);
    g.userData = { tipNo, govdeG, bacakL, bacakR, kolL, kolR, bas, faz: Math.random() * 6, cizgi: null, olum: 0, serif, atesT: 0 };
    return g;
  }

  // Altıpatlar tabanca: kabza elde, namlu kolun devamı yönünde (kol kalkınca ileri bakar)
  function tabancaEkle(kol) {
    const t = new THREE.Group(); t.position.set(0, -0.66, 0.02); kol.add(t);
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
    if (h === 3) {   // görev yapıyor: kollar önde, elleri bir şeyle uğraşıyor
      u.faz += dt * 9;
      const yum = (a, b) => a + (b - a) * Math.min(1, dt * 10);
      u.bacakL.rotation.x = yum(u.bacakL.rotation.x, 0); u.bacakR.rotation.x = yum(u.bacakR.rotation.x, 0);
      u.kolL.rotation.x = yum(u.kolL.rotation.x, -1.05 + Math.sin(u.faz) * 0.3);
      if (!u.serif) u.kolR.rotation.x = yum(u.kolR.rotation.x, -1.05 - Math.sin(u.faz) * 0.3);
      u.govdeG.rotation.x = yum(u.govdeG.rotation.x, 0.12); u.govdeG.position.y = 0;
      return;
    }
    const hiz = h === 2 ? 13 : h === 1 ? 7.5 : 0, gen = h === 2 ? 0.95 : 0.55;
    if (hiz) u.faz += dt * hiz;
    const hedef = hiz ? Math.sin(u.faz) * gen : 0;
    const yumusak = (a, b) => a + (b - a) * Math.min(1, dt * 12);
    u.bacakL.rotation.x = yumusak(u.bacakL.rotation.x, hedef);
    u.bacakR.rotation.x = yumusak(u.bacakR.rotation.x, -hedef);
    u.kolL.rotation.x = yumusak(u.kolL.rotation.x, -hedef * 0.8);
    if (u.serif) {   // şerif tabancayı tutar; ateş edince kolunu kaldırıp nişan alır
      u.atesT = Math.max(0, u.atesT - dt);
      // nişandayken kol bakış açısıyla birlikte ileri uzanır
      const kol = u.nisan != null ? -Math.PI / 2 - u.nisan : u.atesT > 0 ? -1.5 : -0.32 + hedef * 0.2;
      u.kolR.rotation.x = u.atesT > 0.35 && u.nisan == null ? kol : yumusak(u.kolR.rotation.x, kol);
    } else u.kolR.rotation.x = yumusak(u.kolR.rotation.x, hedef * 0.8);
    u.govdeG.position.y = hiz ? Math.abs(Math.sin(u.faz)) * (h === 2 ? 0.08 : 0.03) : 0;
    u.govdeG.rotation.x = yumusak(u.govdeG.rotation.x, h === 2 ? 0.18 : 0);
  }

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
  // Birinci şahıs görünümde kendi kafanı gizle
  function basGizle(g, gizli) { g.userData.bas.visible = !gizli; }

  return { TIPLER, SERIF_TIP, yap, canlandir, cizgiEkle, cizgiKaldir, basGizle, elTabancasi, atesEt };
})();
