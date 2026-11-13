// =============================================================
// Sahte Haydut - 3D kasaba sahnesi (Three.js) ve küçük harita çizimi
// =============================================================

const Sahne = (() => {
  let renderer, scene, kamera;
  const mobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
  const mat = (renk, ek = {}) => new THREE.MeshLambertMaterial({ color: renk, ...ek });
  const koyu = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return c; };

  function kur(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobil, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobil ? 1.25 : 1.75));
    renderer.setSize(innerWidth, innerHeight);
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#f2c98a');
    scene.fog = new THREE.Fog('#f0c48a', 60, 210);
    kamera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 400);
    scene.add(new THREE.HemisphereLight('#fff3dc', '#a0703f', 0.95));
    const gunes = new THREE.DirectionalLight('#fff0d0', 0.9); gunes.position.set(60, 100, 30); scene.add(gunes);
    addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); });
    zemin(); Kasaba.binalar.forEach(bina); alanlarCiz(); engellerCiz(); demiryolu(); tepeler(); sokakSusleri(); serifOdasiCiz();
    return { scene, kamera, renderer };
  }

  // ---------- Zemin ve yollar ----------
  function zemin() {
    const z = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#d9a866'));
    z.rotation.x = -Math.PI / 2; scene.add(z);
    const yolMat = mat('#c08b52');
    const yol = (x, zz, g, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(g, d), yolMat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, zz); scene.add(m); };
    yol(0, 0, 184, Kasaba.CADDE * 2);          // ana cadde
    yol(0, 0, Kasaba.ARA * 2, 184);            // ara sokak
    yol(-42, -45, 6, 30); yol(24, -45, 6, 26); yol(-44, 42, 6, 26); yol(-16, 40, 5, 26);
    // Kaldırımlar (tahta)
    const tahta = mat('#8a6440');
    Kasaba.binalar.filter(b => Math.abs(b.z) < 40).forEach(b => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.g + 1, 0.18, 2.4), tahta);
      m.position.set(b.x, 0.09, b.kapi === 'g' ? b.z + b.d / 2 + 1.2 : b.z - b.d / 2 - 1.2); scene.add(m);
    });
  }

  // Tabela yazısı (canvas dokusu)
  function tabela(yazi, renk = '#f5e6c4', zemin = '#3b2414') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = zemin; x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#c9a36a'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 116);
    x.fillStyle = renk; x.font = 'bold 64px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 64; while (x.measureText(yazi).width > 470 && fs > 20) { fs -= 4; x.font = `bold ${fs}px Georgia, serif`; }
    x.fillText(yazi, 256, 68);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: t });
  }

  // ---------- Binalar ----------
  function bina(b) {
    const grup = new THREE.Group(); grup.position.set(b.x, 0, b.z);
    if (b.kapi === 'k') grup.rotation.y = Math.PI;     // önü -z'ye baksın
    scene.add(grup);
    const { g, d, y } = b;
    const duvar = mat(b.renk), cati = mat(koyu(b.renk, 0.55)), cerceve = mat('#4a3020'), cam = mat('#2d3a46');
    const kutuEkle = (w, h, dd, x, yy, z, m, ebeveyn = grup) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); k.position.set(x, yy, z); ebeveyn.add(k); return k; };
    if (b.tur === 'kule') {   // su kulesi: ayaklar + depo
      [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, c]) => kutuEkle(0.35, 8, 0.35, a, 4, c, cerceve));
      const depo = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 16), mat('#7d5a3c')); depo.position.y = 10; grup.add(depo);
      const kapak = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.6, 16), mat('#4a3424')); kapak.position.y = 12.8; grup.add(kapak);
      kutuEkle(5, 0.2, 0.2, 0, 3, 2.2, cerceve); kutuEkle(5, 0.2, 0.2, 0, 6, 2.2, cerceve);
      return;
    }
    // Ana gövde (girilebilir binalar içi boş: duvar, kapı, merdiven, üst kat, eşyalar)
    const H = b.ic ? Kasaba.duvarY(b) : y * 0.78;
    if (b.ic) icCiz(b, duvar, kutuEkle); else kutuEkle(g, y * 0.78, d, 0, y * 0.39, 0, duvar);
    // Çatı
    if (b.tur === 'ambar') {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(g * 0.55, g * 0.55, d, 4, 1, false, Math.PI / 4), cati);
      c.rotation.z = Math.PI / 2; c.rotation.x = Math.PI / 2; c.scale.set(1, 1, 0.5); c.position.y = y * 0.78; grup.add(c);
      kutuEkle(g * 0.4, y * 0.5, 0.2, 0, y * 0.25, d / 2 + 0.05, mat('#f3efe6'));
      kutuEkle(g * 0.36, y * 0.46, 0.22, 0, y * 0.25, d / 2 + 0.08, mat(koyu(b.renk, 0.8)));
    } else if (b.tur === 'ev' || b.id === 'kilise') {
      const egim = new THREE.Mesh(new THREE.CylinderGeometry(0.01, g * 0.62, y * 0.4, 4, 1), cati);
      egim.rotation.y = Math.PI / 4; egim.scale.set(1, 1, d / g); egim.position.y = y * 0.78 + y * 0.2; grup.add(egim);
    } else {
      kutuEkle(g + (b.ic ? 0.4 : 0), 0.3, d + (b.ic ? 0.4 : 0), 0, H + 0.15, 0, cati);
      // Batı tarzı yüksek ön cephe
      const cy = Math.max(y * 0.32, 1.6);
      kutuEkle(g, cy, 0.4, 0, H + cy / 2, d / 2 - 0.2 + (b.ic ? 0.2 : 0), duvar);
      kutuEkle(g + 0.3, 0.3, 0.6, 0, H + cy + 0.1, d / 2 - 0.2 + (b.ic ? 0.2 : 0), cati);
    }
    // Kilise kulesi
    if (b.id === 'kilise') {
      kutuEkle(3.6, 6, 3.6, 0, y * 0.78 + 3, d / 2 - 2, duvar);
      const sivri = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5, 4), cati); sivri.rotation.y = Math.PI / 4; sivri.position.set(0, y * 0.78 + 8.5, d / 2 - 2); grup.add(sivri);
      kutuEkle(0.25, 1.6, 0.25, 0, y * 0.78 + 11.6, d / 2 - 2, mat('#e8d27a')); kutuEkle(1, 0.25, 0.25, 0, y * 0.78 + 11.8, d / 2 - 2, mat('#e8d27a'));
    }
    // Kapı ve pencereler
    const kapiG = b.tur === 'ambar' || b.ic ? 0 : 1.8;
    if (kapiG) { kutuEkle(kapiG + 0.3, 2.7, 0.12, 0, 1.35, d / 2 + 0.03, cerceve); kutuEkle(kapiG, 2.5, 0.14, 0, 1.25, d / 2 + 0.05, mat('#5a3420')); }
    const on = b.ic ? d / 2 + Kasaba.DUVAR / 2 : d / 2;
    const pencere = (x, yy) => { kutuEkle(1.5, 1.4, 0.1, x, yy, on + 0.03, cerceve); kutuEkle(1.25, 1.15, 0.12, x, yy, on + 0.05, cam); };
    if (b.tur !== 'ambar') {
      const adim = 3.6, n = Math.floor((g - 4) / adim / 2);
      for (let i = 1; i <= n; i++) { pencere(i * adim, 1.7); pencere(-i * adim, 1.7); }
      const ust = b.ic === 2 ? Kasaba.KAT_Y + 1.7 : y * 0.6;
      if (y >= 8) for (let i = -n; i <= n; i++) if (i) pencere(i * adim, ust); else pencere(0, ust);
      // Saçak ve direkler
      if (Math.abs(b.z) < 40 && b.tur !== 'ev') {
        kutuEkle(g, 0.15, 2.4, 0, 3.2, d / 2 + 1.2, cati);
        for (let x = -g / 2 + 0.3; x <= g / 2; x += Math.max(3, g / 4)) kutuEkle(0.18, 3.2, 0.18, x, 1.6, d / 2 + 2.3, cerceve);
      }
    }
    // Tabela
    if (b.tur !== 'ev') {
      const tw = Math.min(g * 0.8, 9), ty = b.tur === 'ambar' ? y * 0.84 : y * 0.86;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(tw, tw / 4), tabela(b.ad.toLocaleUpperCase('tr')));
      t.position.set(0, ty, d / 2 + 0.03 + (b.tur === 'ambar' ? 0.2 : 0)); grup.add(t);
    }
    // Özel süsler
    if (b.id === 'banka') { kutuEkle(0.5, y * 0.7, 0.5, -2.2, y * 0.35, d / 2 + 0.3, mat('#d8ccb0')); kutuEkle(0.5, y * 0.7, 0.5, 2.2, y * 0.35, d / 2 + 0.3, mat('#d8ccb0')); }
    if (b.id === 'serif') { kutuEkle(1.6, 1.1, 0.1, 4.5, 1.7, d / 2 + 0.07, tabela('ARANIYOR', '#3b2414', '#efe0b8')); }
    if (b.id === 'postane') { const direk = kutuEkle(0.25, 7, 0.25, 5, 3.5, d / 2 + 2.2, cerceve); kutuEkle(1.8, 0.15, 0.15, 5, 6.6, d / 2 + 2.2, cerceve); direk.userData.telgraf = true; }
    if (b.id === 'demirci') { const ocak = kutuEkle(1.6, 1, 1.2, 3.5, 0.5, d / 2 + 1.4, mat('#555')); kutuEkle(1.2, 0.2, 0.8, 3.5, 1.05, d / 2 + 1.4, mat('#ff6a1a', { emissive: '#ff4a00' })); ocak.userData = {}; kutuEkle(0.6, 0.5, 0.4, -3.5, 0.6, d / 2 + 1.4, mat('#2a2a2e')); }
    if (b.id === 'salon') { kutuEkle(1.4, 1.2, 0.1, -0.8, 1.5, d / 2 + 0.25, mat('#7a4a20')); kutuEkle(1.4, 1.2, 0.1, 0.8, 1.5, d / 2 + 0.25, mat('#7a4a20')); }
  }

  // ---------- Girilebilir bina içi ----------
  // Yerel koordinat: x = u (yana), z = w (ön +). Grup zaten binanın yönüne döndürülmüş.
  function icCiz(b, duvarMat, kutuEkle) {
    const g2 = b.g / 2, d2 = b.d / 2, K = Kasaba.DUVAR, kg = Kasaba.KAPI / 2, H = Kasaba.duvarY(b), KY = Kasaba.KAT_Y;
    const icDuvar = mat(koyu(b.renk, 0.82)), tahta = mat('#8a6440'), koyuT = mat('#5a3a20'), cerceve = mat('#4a3020');
    // İç yüzeyler biraz koyu olsun diye duvarlar dış renkte, içine ince koyu kaplama
    for (const w of [d2, -d2]) {
      kutuEkle(g2 - kg, H, K, -(g2 + kg) / 2, H / 2, w, duvarMat); kutuEkle(g2 - kg, H, K, (g2 + kg) / 2, H / 2, w, duvarMat);
      kutuEkle(kg * 2, H - 2.6, K, 0, 2.6 + (H - 2.6) / 2, w, duvarMat);                  // kapı üstü
      kutuEkle(kg * 2 + 0.3, 0.2, K + 0.1, 0, 2.7, w, cerceve);                           // kapı kirişi
      [-1, 1].forEach(s => kutuEkle(0.15, 2.6, K + 0.1, s * (kg + 0.05), 1.3, w, cerceve));
      // Açık kapı kanadı (içe doğru açılmış)
      const kanat = kutuEkle(0.1, 2.4, kg * 2 - 0.1, kg - 0.05, 1.2, w - Math.sign(w) * (kg + 0.1), mat('#5a3420'));
      kanat.position.x = kg + 0.05; kanat.position.z = w - Math.sign(w) * (kg + 0.05);
    }
    kutuEkle(K, H, b.d + K, -g2, H / 2, 0, duvarMat); kutuEkle(K, H, b.d + K, g2, H / 2, 0, duvarMat);
    // İç kaplama (koyu) ve zemin
    kutuEkle(b.g - K - 0.02, 0.06, b.d - K - 0.02, 0, 0.04, 0, tahta);
    // Arka cephede "ARKA KAPI" gibi görünmesin diye küçük saçak
    kutuEkle(3.2, 0.12, 1.2, 0, 2.95, -d2 - 0.6, mat(koyu(b.renk, 0.55)));
    if (b.ic === 2) {
      const m = Kasaba.merdiven(b), L = m.wAlt - m.wUst, sw = m.u2 - m.u1;
      // Üst kat zemini (merdiven boşluğu hariç) + sahanlık
      kutuEkle(g2 - m.u2, 0.25, b.d - K, (m.u2 + g2) / 2, KY - 0.125, 0, tahta);
      kutuEkle(sw, 0.25, (m.wUst + d2) - K / 2, (m.u1 + m.u2) / 2, KY - 0.125, (m.wUst - d2 + K / 2) / 2, tahta);
      // Merdiven basamakları
      const n = 14;
      for (let i = 0; i < n; i++) {
        const h = KY * (i + 1) / n, wz = m.wAlt - (i + 0.5) * L / n;
        kutuEkle(sw, h, L / n + 0.02, (m.u1 + m.u2) / 2, h / 2, wz, i % 2 ? koyuT : tahta);
      }
      // Üst kat korkuluğu
      const kL = d2 - m.wUst;
      kutuEkle(0.1, 1, kL, m.u2, KY + 0.5, m.wUst + kL / 2, cerceve);
      for (let w = m.wUst; w <= d2 - 0.3; w += 1.2) kutuEkle(0.12, 1, 0.12, m.u2, KY + 0.5, w, cerceve);
      // İç tavan lambası
      kutuEkle(0.4, 0.4, 0.4, 2, KY - 0.5, 0, mat('#ffd27a', { emissive: '#aa7a20' }));
      kutuEkle(0.4, 0.4, 0.4, 2, H - 0.5, 0, mat('#ffd27a', { emissive: '#aa7a20' }));
    } else kutuEkle(0.4, 0.4, 0.4, 0, H - 0.5, 0, mat('#ffd27a', { emissive: '#aa7a20' }));
    esyalar(b, kutuEkle, KY);
  }
  // Görev yerlerinin yanındaki eşyalar (çarpışmasız, sadece görüntü)
  function esyalar(b, k, KY) {
    const d2 = b.d / 2, g2 = b.g / 2;
    const ahsap = mat('#6a4424'), koyu2 = mat('#3a2a1a'), metal = mat('#55555e'), yesil = mat('#2f6a3a'), beyaz = mat('#eeeae0');
    const masa = (x, z, yy = 0, renk = ahsap) => { k(1.6, 0.12, 1, x, yy + 0.8, z, renk); [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([a, c]) => k(0.1, 0.8, 0.1, x + a, yy + 0.4, z + c, ahsap)); };
    switch (b.id) {
      case 'banka':
        k(2.2, 2.2, 0.9, 4, 1.1, -d2 + 0.75, metal); k(0.5, 0.5, 0.1, 4, 1.2, -d2 + 1.25, mat('#c9a23a'));   // kasa
        k(6, 1.1, 0.7, -2, 0.55, -1, ahsap); break;                                                             // gişe
      case 'salon':
        k(7, 1.1, 0.8, 4, 0.55, -3.2, ahsap); k(7, 1.6, 0.4, 4, 2, -d2 + 0.4, koyu2);                          // bar ve raf
        for (let i = 0; i < 6; i++) k(0.12, 0.35, 0.12, 1.5 + i, 1.3, -3.2, mat(i % 2 ? '#3a7a3a' : '#7a3a20'));
        masa(-2, 2); masa(3, 3); k(1.6, 1.3, 0.6, -5.5, 0.65, -d2 + 0.5, koyu2);                                // masalar, piyano
        masa(5, -2, KY, yesil); masa(-2, 2, KY); break;                                                         // üst kat kumar masası
      case 'otel':
        k(4, 1.1, 0.8, 3, 0.55, -2, ahsap);                                                                    // resepsiyon
        [[5, -5.5], [5, 3], [-2, -5.5]].forEach(([x, z]) => { k(2.2, 0.5, 1.2, x, KY + 0.25, z, beyaz); k(2.2, 0.8, 0.2, x, KY + 0.4, z - 0.6, ahsap); });
        break;
      case 'belediye':
        masa(-2, -2); k(1.2, 2, 0.6, 3, KY + 1, -d2 + 0.5, ahsap); masa(3, -3, KY); break;                      // üst kat dolap ve masa
      case 'postane':
        k(6, 1.1, 0.7, 0, 0.55, -2, ahsap); [-2, 0, 2].forEach(x => k(0.6, 0.6, 0.6, x + 3, 0.3, -d2 + 0.8, mat('#9a7a4a'))); break;
      case 'silahci':
        k(5, 1.1, 0.7, 0, 0.55, -1.8, ahsap); k(5, 1.6, 0.2, 2, 1.6, -d2 + 0.3, koyu2);
        for (let i = 0; i < 5; i++) k(0.08, 1.1, 0.08, 0.2 + i * 0.8, 1.6, -d2 + 0.45, metal); break;          // tüfek rafı
      case 'firin':
        k(2, 1.6, 1.2, -2.5, 0.8, -d2 + 0.8, mat('#9a4a2a')); k(0.8, 0.5, 0.1, -2.5, 0.8, -d2 + 1.42, mat('#ff7a2a', { emissive: '#aa4a10' }));
        k(3, 1.2, 0.6, 2.5, 0.6, -d2 + 0.5, ahsap); for (let i = 0; i < 4; i++) k(0.4, 0.2, 0.3, 1.4 + i * 0.7, 1.3, -d2 + 0.5, mat('#e2a85a')); break;
      case 'doktor':
        k(2, 0.6, 1, -2.5, 0.3, -d2 + 1, beyaz); k(1.6, 1.8, 0.5, 2.5, 0.9, -d2 + 0.35, beyaz);
        for (let i = 0; i < 4; i++) k(0.12, 0.25, 0.12, 1.9 + i * 0.4, 1.4, -d2 + 0.6, mat('#4a8ab0')); break;
    }
  }

  function alanlarCiz() {
    const cit = mat('#7a5530');
    Kasaba.alanlar.forEach(a => {
      const kenar = (x1, z1, x2, z2, kapiBosluk) => {
        const L = Math.hypot(x2 - x1, z2 - z1), n = Math.floor(L / 2);
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
          if (kapiBosluk && Math.abs(x - a.x) < 2) continue;
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 0.18), cit); p.position.set(x, 0.6, z); scene.add(p);
        }
        const r = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2 - x1) || 0.1, 0.1, Math.abs(z2 - z1) || 0.1), cit);
        r.position.set((x1 + x2) / 2, 0.9, (z1 + z2) / 2); if (!kapiBosluk) scene.add(r);
      };
      const x1 = a.x - a.g / 2, x2 = a.x + a.g / 2, z1 = a.z - a.d / 2, z2 = a.z + a.d / 2;
      kenar(x1, z1, x2, z1, true); kenar(x1, z2, x2, z2); kenar(x1, z1, x1, z2); kenar(x2, z1, x2, z2);
      if (a.id === 'agil') for (let i = 0; i < 6; i++) inek(a.x - 5 + (i % 3) * 5, a.z - 2 + Math.floor(i / 3) * 5, i);
      if (a.id === 'mezarlik') for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.2), mat('#9a9a9a')); m.position.set(a.x - 6 + (i % 5) * 3, 0.5, a.z - 2 + Math.floor(i / 5) * 5); scene.add(m); }
    });
  }
  function inek(x, z, i) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = i * 1.3; scene.add(g);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.6), mat(i % 2 ? '#f2f2f2' : '#5a3a22')); b.position.y = 0.9; g.add(b);
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), mat('#efe0d0')); h.position.set(0, 1.1, 1); g.add(h);
    [[-0.3, -0.6], [0.3, -0.6], [-0.3, 0.6], [0.3, 0.6]].forEach(([a, c]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), mat('#3a2a1a')); l.position.set(a, 0.3, c); g.add(l); });
  }

  function engellerCiz() {
    Kasaba.engeller.forEach(e => {
      const g = new THREE.Group(); g.position.set(e.x, 0, e.z); scene.add(g);
      const ekle = (geo, m, y = 0, x = 0, z = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); g.add(k); return k; };
      if (e.tur === 'kuyu') {
        ekle(new THREE.CylinderGeometry(1.4, 1.4, 0.9, 14), mat('#8f8a80'), 0.45);
        ekle(new THREE.BoxGeometry(0.2, 2.4, 0.2), mat('#5a3a20'), 1.2, -1.2); ekle(new THREE.BoxGeometry(0.2, 2.4, 0.2), mat('#5a3a20'), 1.2, 1.2);
        const c = ekle(new THREE.ConeGeometry(1.8, 0.9, 4), mat('#7a3a28'), 2.7); c.rotation.y = Math.PI / 4;
      } else if (e.tur === 'fici') { ekle(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 10), mat('#7a4a22'), 0.55); }
      else if (e.tur === 'saman') { const s = ekle(new THREE.CylinderGeometry(1, 1, 1.4, 12), mat('#e2c46b'), 1); s.rotation.z = Math.PI / 2; }
      else if (e.tur === 'yalak') { ekle(new THREE.BoxGeometry(2, 0.6, 0.9), mat('#6b4428'), 0.3); ekle(new THREE.BoxGeometry(1.8, 0.05, 0.7), mat('#4a8ab0'), 0.58); }
      else if (e.tur === 'kaktus') {
        const yesil = mat('#4f8a3c');
        ekle(new THREE.CylinderGeometry(0.35, 0.4, 3, 8), yesil, 1.5);
        ekle(new THREE.CylinderGeometry(0.22, 0.22, 1.2, 8), yesil, 1.9, 0.7).rotation.z = 0.0;
        ekle(new THREE.BoxGeometry(0.6, 0.3, 0.3), yesil, 1.4, 0.4);
      } else if (e.tur === 'araba') {
        ekle(new THREE.BoxGeometry(2, 0.9, 3.4), mat('#8a5a30'), 1.2);
        const ust = ekle(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 12, 1, false, 0, Math.PI), mat('#f0e6d0'), 1.65); ust.rotation.x = Math.PI / 2; ust.rotation.z = Math.PI / 2;
        [[-1.05, -1.1], [1.05, -1.1], [-1.05, 1.1], [1.05, 1.1]].forEach(([a, c]) => { const t = ekle(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 12), mat('#3a2414'), 0.6, a, c); t.rotation.z = Math.PI / 2; });
      }
    });
  }

  function demiryolu() {
    const z = Kasaba.RAY_Z;
    const ray = mat('#6a6a72'), travers = mat('#5a3a20');
    [-0.75, 0.75].forEach(o => { const r = new THREE.Mesh(new THREE.BoxGeometry(220, 0.15, 0.12), ray); r.position.set(0, 0.2, z + o); scene.add(r); });
    for (let x = -108; x <= 108; x += 1.4) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 2.4), travers); t.position.set(x, 0.08, z); scene.add(t); }
    // Peron
    const p = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 4), mat('#8a6440')); p.position.set(-42, 0.25, -71); scene.add(p);
    // Duran tren (lokomotif + vagon)
    const tren = new THREE.Group(); tren.position.set(-15, 0, z); scene.add(tren);
    const kara = mat('#22222a'), kirmizi = mat('#8a2020');
    const k1 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 5, 14), kara); k1.rotation.z = Math.PI / 2; k1.position.set(0, 1.9, 0); tren.add(k1);
    const kab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2.4), kirmizi); kab.position.set(-3.4, 2.1, 0); tren.add(kab);
    const baca = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 1.4, 10), kara); baca.position.set(1.8, 3.4, 0); tren.add(baca);
    for (let i = 0; i < 2; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 2.4), mat(i ? '#6b4a2a' : '#7a5a3a')); v.position.set(-8.5 - i * 6.6, 1.9, 0); tren.add(v); }
  }

  function tepeler() {
    const renkler = ['#c98a4f', '#b8763f', '#d29a5c', '#a86a38'];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, r = 150 + (i % 3) * 25;
      const h = 18 + ((i * 37) % 25);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(6 + (i % 4) * 2, 18 + (i % 5) * 4, h, 7), mat(renkler[i % 4]));
      m.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); scene.add(m);
    }
  }
  function sokakSusleri() {
    // Fenerler ve bağlama direkleri cadde boyunca
    const direk = mat('#4a3020'), fener = mat('#ffd27a', { emissive: '#aa7a20' });
    for (let x = -80; x <= 80; x += 20) {
      [-8.4, 8.4].forEach(z => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3, 0.15), direk); p.position.set(x + 4, 1.5, z); scene.add(p);
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), fener); f.position.set(x + 4, 3.1, z); scene.add(f);
      });
    }
  }

  // ---------- Küçük harita (statik zemin) ----------
  function haritaZemini(boyut) {
    const c = document.createElement('canvas'); c.width = c.height = boyut;
    const x = c.getContext('2d'), S = boyut / (Kasaba.SINIR * 2), P = v => (v + Kasaba.SINIR) * S;
    x.fillStyle = '#d9a866'; x.fillRect(0, 0, boyut, boyut);
    x.fillStyle = '#b8814a';
    x.fillRect(0, P(-Kasaba.CADDE), boyut, Kasaba.CADDE * 2 * S); x.fillRect(P(-Kasaba.ARA), 0, Kasaba.ARA * 2 * S, boyut);
    x.fillStyle = '#6a6a72'; x.fillRect(0, P(Kasaba.RAY_Z) - 1, boyut, 2);
    Kasaba.alanlar.forEach(a => { x.strokeStyle = '#7a5530'; x.lineWidth = 1; x.strokeRect(P(a.x - a.g / 2), P(a.z - a.d / 2), a.g * S, a.d * S); });
    Kasaba.binalar.forEach(b => {
      x.fillStyle = b.tur === 'ev' ? '#8a6a4f' : '#5a3a26';
      x.fillRect(P(b.x - b.g / 2), P(b.z - b.d / 2), b.g * S, b.d * S);
    });
    const so = Kasaba.serifOdasi;
    x.fillStyle = '#6a4a1a'; x.fillRect(P(so.x - so.g / 2), P(so.z - so.d / 2), so.g * S, so.d * S);
    // Her binanın üstünde simgesi ve adı
    const ef = Math.round(boyut / 26), af = Math.round(boyut / 40);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const etiket = (emoji, ad, px, pz) => {
      x.font = `${ef}px sans-serif`; x.fillText(emoji, P(px), P(pz) - af * 0.6);
      x.font = `900 ${af}px Nunito, sans-serif`; x.lineWidth = Math.max(2, af / 4); x.strokeStyle = '#2a1608'; x.fillStyle = '#fff4dc';
      x.strokeText(ad, P(px), P(pz) + ef * 0.55); x.fillText(ad, P(px), P(pz) + ef * 0.55);
    };
    [...Kasaba.binalar.filter(b => b.tur !== 'ev'), ...Kasaba.alanlar].forEach(b => etiket(b.emoji, b.ad, b.x, b.z));
    etiket('🚪', 'Şerif odası', so.x, so.z);
    return c;
  }

  // ---------- Şerif bekleme odası (kapısı menteşeden açılır) ----------
  let kapiGrup = null, kapiHedef = 0;
  function serifOdasiCiz() {
    const o = Kasaba.serifOdasi, K = 0.5, h = o.y, kg = o.kapiG / 2;
    const tahta = mat('#7a5530'), koyuT = mat('#4a3020'), cati = mat('#5a3a20');
    const duvar = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tahta); m.position.set(x, h / 2, z); scene.add(m); };
    const x1 = o.x - o.g / 2, x2 = o.x + o.g / 2, z1 = o.z - o.d / 2, z2 = o.z + o.d / 2;
    duvar(o.g + K, K, o.x, z1); duvar(o.g + K, K, o.x, z2); duvar(K, o.d, x1, o.z);
    const yan = (o.d / 2 - kg); duvar(K, yan, x2, z1 + yan / 2); duvar(K, yan, x2, z2 - yan / 2);
    // Kapının üstü, çatı, iç zemin
    const ust = new THREE.Mesh(new THREE.BoxGeometry(K, h - 2.6, o.kapiG), tahta); ust.position.set(x2, 2.6 + (h - 2.6) / 2, o.z); scene.add(ust);
    const c = new THREE.Mesh(new THREE.BoxGeometry(o.g + 1, 0.25, o.d + 1), cati); c.position.set(o.x, h + 0.12, o.z); scene.add(c);
    const z = new THREE.Mesh(new THREE.PlaneGeometry(o.g, o.d), mat('#8a6440')); z.rotation.x = -Math.PI / 2; z.position.set(o.x, 0.03, o.z); scene.add(z);
    // İçeride fener ve sıralar
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), mat('#ffd27a', { emissive: '#aa7a20' })); f.position.set(o.x, h - 0.5, o.z); scene.add(f);
    [-1, 1].forEach(s => { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.6), koyuT); b.position.set(o.x - 1.5, 0.25, o.z + s * (o.d / 2 - 0.7)); scene.add(b); });
    // Tabela
    const t = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), tabela('ŞERİFLER')); t.position.set(x2 + K / 2 + 0.02, h - 0.2, o.z); t.rotation.y = Math.PI / 2; scene.add(t);
    // Kapı: menteşe kuzey kenarda, dışarı doğru açılır
    kapiGrup = new THREE.Group(); kapiGrup.position.set(x2 + 0.05, 0, o.z - kg); scene.add(kapiGrup);
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.6, o.kapiG), mat('#5a3420')); k.position.set(0, 1.3, kg); kapiGrup.add(k);
    const kol = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat('#c9a23a')); kol.position.set(0.1, 1.2, o.kapiG - 0.3); kapiGrup.add(kol);
  }
  function kapiCanlandir(dt) { if (kapiGrup) kapiGrup.rotation.y += (kapiHedef - kapiGrup.rotation.y) * Math.min(1, dt * 3); }

  return { kur, haritaZemini, serifKapisi(acik, hemen) { kapiHedef = acik ? 1.6 : 0; if (hemen && kapiGrup) kapiGrup.rotation.y = kapiHedef; }, kapiCanlandir, get scene() { return scene; }, get kamera() { return kamera; }, ciz() { renderer.render(scene, kamera); }, mobil };
})();
