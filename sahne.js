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
    zemin(); Kasaba.binalar.forEach(bina); alanlarCiz(); engellerCiz(); demiryolu(); tepeler(); sokakSusleri(); serifOdasiCiz(); gorevEsyalari(); susleriCiz(); afisleriAs(); hareketliSusler();
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
  // Yuvarlak hat levhası (yeşil zemin, altın yazı)
  function levha(yazi) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#c9a23a'; x.beginPath(); x.arc(256, 256, 252, 0, 7); x.fill();
    x.fillStyle = '#123f33'; x.beginPath(); x.arc(256, 256, 228, 0, 7); x.fill();
    x.strokeStyle = '#e8c860'; x.lineWidth = 6; x.beginPath(); x.arc(256, 256, 212, 0, 7); x.stroke();
    x.fillStyle = '#f2d27a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
    let fs = 210; x.font = `bold ${fs}px "Amiri", "Traditional Arabic", "Arabic Typesetting", "Noto Naskh Arabic", "Times New Roman", serif`;
    while (x.measureText(yazi).width > 340 && fs > 60) { fs -= 10; x.font = `bold ${fs}px "Amiri", "Traditional Arabic", "Arabic Typesetting", "Noto Naskh Arabic", "Times New Roman", serif`; }
    x.fillText(yazi, 256, 270);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true });
  }
  function yaziBandi(yazi, zemin = '#1f4a6a', renk = '#f2d27a') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
    const x = c.getContext('2d');
    x.fillStyle = '#c9a23a'; x.fillRect(0, 0, 1024, 192); x.fillStyle = zemin; x.fillRect(8, 8, 1008, 176);
    x.fillStyle = renk; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
    let fs = 120; x.font = `bold ${fs}px "Amiri", "Traditional Arabic", "Arabic Typesetting", "Noto Naskh Arabic", "Times New Roman", serif`;
    while (x.measureText(yazi).width > 960 && fs > 40) { fs -= 6; x.font = `bold ${fs}px "Amiri", "Traditional Arabic", "Arabic Typesetting", "Noto Naskh Arabic", "Times New Roman", serif`; }
    x.fillText(yazi, 512, 100);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: t });
  }
  // Cami halısı: kıbleye dönük saf saf seccade deseni (u = x ekseni, kıble -u)
  function haliDokusu(G, D) {
    const c = document.createElement('canvas'), P = 64; c.width = Math.round(G * P); c.height = Math.round(D * P);
    const x = c.getContext('2d');
    x.fillStyle = '#8f1d22'; x.fillRect(0, 0, c.width, c.height);
    const saf = 1.15 * P, sec = 0.8 * P;
    for (let sx = 0; sx < c.width; sx += saf) {
      for (let sy = 0; sy < c.height; sy += sec) {
        x.fillStyle = '#a8282c'; x.fillRect(sx + 6, sy + 4, saf - 12, sec - 8);
        x.fillStyle = '#7a1418'; x.beginPath(); x.moveTo(sx + 10, sy + sec / 2); x.lineTo(sx + 28, sy + 8); x.lineTo(sx + 28, sy + sec - 8); x.closePath(); x.fill();   // sivri mihrap ucu kıbleye
        x.strokeStyle = '#d8b25a'; x.lineWidth = 2; x.strokeRect(sx + 6, sy + 4, saf - 12, sec - 8);
      }
      x.fillStyle = '#d8b25a'; x.fillRect(sx, 0, 3, c.height);   // saf çizgisi
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8;
    return new THREE.MeshLambertMaterial({ map: t });
  }
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
    // Eğik çatılı girilebilir binalarda düz tavan (duvar ile çatı arasından ışık sızmasın)
    if (b.ic && (b.tur === 'ev' || b.tur === 'ambar' || b.id === 'kilise')) kutuEkle(g + 0.4, 0.2, d + 0.4, 0, H + 0.1, 0, cati);
    // Çatı
    if (b.tur === 'ambar') {
      // Ambar çatısı: duvarların üstünde iki eğimli panel + ön/arka üçgen duvar (içeri sarkmaz)
      const hr = g * 0.26, yarim = g / 2 + 0.3, aci = Math.atan2(hr, yarim), boy = Math.hypot(yarim, hr) + 0.2;
      [-1, 1].forEach(s => {
        const p = new THREE.Mesh(new THREE.BoxGeometry(boy, 0.25, d + 0.6), cati);
        p.position.set(s * yarim / 2, H + hr / 2 + 0.1, 0); p.rotation.z = -s * aci; grup.add(p);
      });
      const ucgen = new THREE.Shape(); ucgen.moveTo(-g / 2, 0); ucgen.lineTo(g / 2, 0); ucgen.lineTo(0, hr); ucgen.closePath();
      const ucgenGeo = new THREE.ShapeGeometry(ucgen);
      [1, -1].forEach(s => { const u = new THREE.Mesh(ucgenGeo, new THREE.MeshLambertMaterial({ color: b.renk, side: THREE.DoubleSide })); u.position.set(0, H, s * (d / 2 + (b.ic ? Kasaba.DUVAR / 2 : 0))); grup.add(u); });
      if (!b.ic) { kutuEkle(g * 0.4, y * 0.5, 0.2, 0, y * 0.25, d / 2 + 0.05, mat('#f3efe6')); kutuEkle(g * 0.36, y * 0.46, 0.22, 0, y * 0.25, d / 2 + 0.08, mat(koyu(b.renk, 0.8))); }
    } else if (b.id === 'kilise') {   // cami: düz dam üstünde kasnak + kubbe + alem
      const kasnak = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 1.2, 20), duvar); kasnak.position.y = H + 0.8; grup.add(kasnak);
      const kubbe = new THREE.Mesh(new THREE.SphereGeometry(4.6, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#6f8f9a')); kubbe.position.y = H + 1.4; grup.add(kubbe);
      alem(0, H + 6.1, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const k = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat('#6f8f9a')); k.position.set(sx * (g / 2 - 1.4), H + 0.2, sz * (d / 2 - 1.4)); grup.add(k); });
    } else if (b.tur === 'ev') {
      const egim = new THREE.Mesh(new THREE.CylinderGeometry(0.01, g * 0.62, y * 0.4, 4, 1), cati);
      egim.rotation.y = Math.PI / 4; egim.scale.set(1, 1, d / g); egim.position.y = H + y * 0.2; grup.add(egim);
    } else {
      kutuEkle(g + (b.ic ? 0.4 : 0), 0.3, d + (b.ic ? 0.4 : 0), 0, H + 0.15, 0, cati);
      // Batı tarzı yüksek ön cephe
      const cy = Math.max(y * 0.32, 1.6);
      kutuEkle(g, cy, 0.4, 0, H + cy / 2, d / 2 - 0.2 + (b.ic ? 0.2 : 0), duvar);
      kutuEkle(g + 0.3, 0.3, 0.6, 0, H + cy + 0.1, d / 2 - 0.2 + (b.ic ? 0.2 : 0), cati);
    }
    // Caminin minaresi (ön köşede): gövde, şerefe, külah, alem
    function alem(x, yy, z) {
      kutuEkle(0.12, 0.9, 0.12, x, yy + 0.45, z, mat('#e8c84a'));
      const hilal = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 16, Math.PI * 1.4), mat('#e8c84a')); hilal.position.set(x, yy + 1.25, z); hilal.rotation.z = Math.PI * 0.8; grup.add(hilal);
    }
    if (b.id === 'kilise') {
      const mx = g / 2 + 1.15, mz = d / 2 - 1.2, beyaz = mat('#f2efe6'), boyM = H + 13;
      kutuEkle(1.5, 0.6, 1.5, mx, 0.3, mz, mat('#cfc8b6'));   // minare kaidesi
      // Taç kapı: taş çerçeve, sivri kemer, çini pano ve kelime-i tevhid
      const on2 = d / 2 + Kasaba.DUVAR / 2, tas = mat('#e6dcc6'), cini = mat('#2a6f8f');
      [-1, 1].forEach(s => kutuEkle(0.9, 5, 0.3, s * 1.55, 2.5, on2 + 0.15, tas));
      kutuEkle(4.0, 2.4, 0.3, 0, 3.8, on2 + 0.15, tas);
      const kemer = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24, 0, Math.PI), cini); kemer.position.set(0, 2.6, on2 + 0.31); grup.add(kemer);
      const kemerK = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 6, 24, Math.PI), mat('#c9a23a')); kemerK.position.set(0, 2.6, on2 + 0.32); grup.add(kemerK);
      const pano = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.6), yaziBandi('لا إله إلا الله محمد رسول الله', '#2a6f8f')); pano.position.set(0, 4.45, on2 + 0.31); grup.add(pano);
      const govdeM = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, boyM, 12), beyaz); govdeM.position.set(mx, boyM / 2, mz); grup.add(govdeM);
      const serefe = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.1, 0.35, 14), mat('#cfc8b6')); serefe.position.set(mx, boyM * 0.78, mz); grup.add(serefe);
      const kulah = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.6, 12), mat('#6f8f9a')); kulah.position.set(mx, boyM + 1.3, mz); grup.add(kulah);
      alem(mx, boyM + 2.5, mz);
    }
    // Kapı ve pencereler
    const kapiG = b.tur === 'ambar' || b.ic ? 0 : 1.8;
    if (kapiG) { kutuEkle(kapiG + 0.3, 2.7, 0.12, 0, 1.35, d / 2 + 0.03, cerceve); kutuEkle(kapiG, 2.5, 0.14, 0, 1.25, d / 2 + 0.05, mat('#5a3420')); }
    const on = b.ic ? d / 2 + Kasaba.DUVAR / 2 : d / 2;
    const pencere = (x, yy) => {
      kutuEkle(1.5, 1.4, 0.1, x, yy, on + 0.03, cerceve); kutuEkle(1.25, 1.15, 0.12, x, yy, on + 0.05, cam);
      if (b.ic) { const ic = d / 2 - Kasaba.DUVAR / 2; kutuEkle(1.5, 1.4, 0.06, x, yy, ic - 0.02, cerceve); kutuEkle(1.25, 1.15, 0.08, x, yy, ic - 0.03, cam); }   // içeriden de pencere
      if (b.id === 'kilise') {   // kemerli pencere üstü
        const k1 = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16, 0, Math.PI), cerceve); k1.position.set(x, yy + 0.7, on + 0.085); grup.add(k1);
        const k2 = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16, 0, Math.PI), cam); k2.position.set(x, yy + 0.58, on + 0.115); grup.add(k2);
      }
    };
    if (b.tur !== 'ambar') {
      const adim = 3.6, n = Math.floor((g - 4) / adim / 2);
      for (let i = 1; i <= n; i++) { pencere(i * adim, 1.7); pencere(-i * adim, 1.7); }
      const ust = b.ic === 2 ? Kasaba.KAT_Y + 1.7 : y * 0.6;
      if (y >= 8) for (let i = -n; i <= n; i++) if (i) pencere(i * adim, ust); else pencere(0, ust);
      // Saçak ve direkler
      if (Math.abs(b.z) < 40 && b.tur !== 'ev' && b.id !== 'kilise') {
        kutuEkle(g, 0.15, 2.4, 0, 3.2, d / 2 + 1.2, cati);
        for (let x = -g / 2 + 0.3; x <= g / 2; x += Math.max(3, g / 4)) if (Math.abs(x) >= 1.6) kutuEkle(0.18, 3.2, 0.18, x, 1.6, d / 2 + 2.3, cerceve);
      }
    }
    // Tabela
    if (b.tur !== 'ev') {
      const tw = Math.min(g * 0.8, 9), ty = b.tur === 'ambar' ? y * 0.84 : y * 0.86;
      const t = new THREE.Mesh(new THREE.PlaneGeometry(tw, tw / 4), b.id === 'kilise' ? tabela('CAMİ', '#f2d27a', '#1f4a6a') : tabela(b.ad.toLocaleUpperCase('tr')));
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
    } else if (b.id !== 'kilise') kutuEkle(0.4, 0.4, 0.4, 0, H - 0.5, 0, mat('#ffd27a', { emissive: '#aa7a20' }));
    esyalar(b, kutuEkle);
    if (b.id === 'kilise') camiIci(b, kutuEkle);
  }
  // Caminin içi: halı, hat levhaları, mihrap kemeri, minber, avize
  function camiIci(b, kutuEkle) {
    const grup = kutuEkle(0.01, 0.01, 0.01, 0, -1, 0, mat('#000')).parent;
    const K = Kasaba.DUVAR, g2 = b.g / 2, d2 = b.d / 2, H = Kasaba.duvarY(b), m = Kasaba.minber(b), qu = m.qu;
    const ekle = (geo, mt, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); grup.add(o); return o; };
    // Halı (bütün zemin)
    const G = b.g - K - 0.1, D = b.d - K - 0.1;
    const hali = ekle(new THREE.PlaneGeometry(G, D), haliDokusu(G, D), 0, 0.085, 0); hali.rotation.x = -Math.PI / 2;
    // Mihrap kemeri ve üstünde besmele
    const yanP = (geo, mt, x, y, z, ry) => { const o = ekle(geo, mt, x, y, z); o.rotation.y = ry; return o; };
    yanP(new THREE.CircleGeometry(0.65, 20, 0, Math.PI), mat('#efe3c0'), qu + 0.19, 2.4, 0, Math.PI / 2);
    yanP(new THREE.TorusGeometry(0.72, 0.06, 6, 20, Math.PI), mat('#c9a23a'), qu + 0.2, 2.4, 0, Math.PI / 2);
    yanP(new THREE.PlaneGeometry(3.4, 0.64), yaziBandi('بسم الله الرحمن الرحيم'), qu + 0.03, 3.55, 0, Math.PI / 2);
    // Hat levhaları: Allah ve Muhammed (kıble duvarı ve karşı duvar)
    const lv = (yazi, x, y, z, ry, r = 0.95) => yanP(new THREE.CircleGeometry(r, 40), levha(yazi), x, y, z, ry);
    lv('الله', qu + 0.03, 4.6, 5.2, Math.PI / 2); lv('محمد', qu + 0.03, 4.6, -5.4, Math.PI / 2);
    lv('الله', g2 - K / 2 - 0.03, 4.4, -3, -Math.PI / 2); lv('محمد', g2 - K / 2 - 0.03, 4.4, 3, -Math.PI / 2);
    lv('الله', -4.4, 4.4, -d2 + K / 2 + 0.03, 0, 0.8); lv('محمد', 4.4, 4.4, -d2 + K / 2 + 0.03, 0, 0.8);
    // Minber: basamaklar, üst sahanlık, yan korkuluklar, külahlı köşk, giriş kapısı
    const mermer = mat('#ece4d0'), kirmizi = mat('#9a2a2a'), altin = mat('#c9a23a'), L = m.u2 - m.u1, n = 7;
    for (let i = 0; i < n; i++) { const h = m.h * (i + 1) / n; ekle(new THREE.BoxGeometry(L / n + 0.01, h, m.yari * 2), i % 2 ? kirmizi : mat('#8a2026'), m.u2 - (i + 0.5) * L / n, h / 2, m.w); }
    ekle(new THREE.BoxGeometry(m.u1 - m.u0, m.h, m.yari * 2), kirmizi, (m.u0 + m.u1) / 2, m.h / 2, m.w);
    const sekil = new THREE.Shape(); sekil.moveTo(m.u2, 0); sekil.lineTo(m.u2, 0.95); sekil.lineTo(m.u1, m.h + 0.95); sekil.lineTo(m.u0, m.h + 0.95); sekil.lineTo(m.u0, 0); sekil.closePath();
    const yanGeo = new THREE.ExtrudeGeometry(sekil, { depth: 0.08, bevelEnabled: false });
    [-1, 1].forEach(s => { ekle(yanGeo, mermer, 0, 0, m.w + s * (m.yari + 0.04) - 0.04); });
    [-1, 1].forEach(s => { const r = ekle(new THREE.BoxGeometry(Math.hypot(L, m.h), 0.05, 0.1), altin, (m.u1 + m.u2) / 2, m.h / 2 + 0.97, m.w + s * (m.yari + 0.04)); r.rotation.z = -Math.atan2(m.h, L); });
    [[m.u0 + 0.08, -1], [m.u0 + 0.08, 1], [m.u1 - 0.05, -1], [m.u1 - 0.05, 1]].forEach(([u, s]) => ekle(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), mermer, u, m.h + 1.05, m.w + s * (m.yari - 0.02)));
    ekle(new THREE.BoxGeometry(m.u1 - m.u0 + 0.2, 0.12, m.yari * 2 + 0.2), mermer, (m.u0 + m.u1) / 2, m.h + 2.15, m.w);
    const kulah = ekle(new THREE.ConeGeometry(0.72, 1.4, 8), mat('#6f8f9a'), (m.u0 + m.u1) / 2, m.h + 2.9, m.w); kulah.rotation.y = Math.PI / 8;
    ekle(new THREE.BoxGeometry(0.05, 0.4, 0.05), altin, (m.u0 + m.u1) / 2, m.h + 3.8, m.w);
    [-1, 1].forEach(s => ekle(new THREE.BoxGeometry(0.16, 2.5, 0.16), mermer, m.u2 + 0.05, 1.25, m.w + s * (m.yari + 0.06)));
    yanP(new THREE.TorusGeometry(m.yari + 0.06, 0.07, 6, 16, Math.PI), altin, m.u2 + 0.05, 2.5, m.w, Math.PI / 2);
    // Avize: büyük halka, kandiller, zincirler
    const ay = H - 2.6, avize = new THREE.Group(); avize.position.set(0.5, ay, 0); grup.add(avize);
    const halka = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.05, 6, 40), altin); halka.rotation.x = Math.PI / 2; avize.add(halka);
    const kandil = mat('#ffe7a8', { emissive: '#d89a30' });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), kandil); k.position.set(Math.cos(a) * 2.4, -0.1, Math.sin(a) * 2.4); avize.add(k); }
    [0, 1, 2, 3].forEach(i => { const a = i / 4 * Math.PI * 2 + 0.4, z = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.6, 4), altin); z.position.set(Math.cos(a) * 1.2, 1.3, Math.sin(a) * 1.2); z.rotation.z = Math.cos(a) * 0.43; z.rotation.x = -Math.sin(a) * 0.43; avize.add(z); });
    const isik = new THREE.PointLight('#ffd8a0', 0.8, 18); isik.position.set(0.5, ay - 0.3, 0); grup.add(isik);
  }
  // Bina içi eşyalar: liste kasaba.js'te (aynı liste çarpışma için de kullanılır)
  function esyalar(b, k) {
    Kasaba.esyaListesi(b).forEach(e => { if (!e.gizli) k(e.w, e.h, e.d, e.u, e.y, e.z, mat(e.renk, e.isik ? { emissive: e.isik } : {})); });
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

  // Posta kutusunun üstündeki sayı (yapılan görev adedi)
  const postaSpritelari = [];
  function postaDokusu(n) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#f3e2bd'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#2a5a9a'; x.stroke();
    x.fillStyle = '#2a1608'; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('📬', 64, 42); x.font = 'bold 44px Georgia, serif'; x.fillText(String(n), 64, 92);
    return new THREE.CanvasTexture(c);
  }
  function postaSayisi(n) { postaSpritelari.forEach(s => { s.material.map?.dispose(); s.material.map = postaDokusu(n); s.material.needsUpdate = true; }); }
  function engellerCiz() {
    Kasaba.engeller.forEach(e => {
      const g = new THREE.Group(); g.position.set(e.x, 0, e.z); scene.add(g);
      const ekle = (geo, m, y = 0, x = 0, z = 0) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); g.add(k); return k; };
      if (e.tur === 'kuyu') {
        ekle(new THREE.CylinderGeometry(1.4, 1.4, 0.9, 14), mat('#8f8a80'), 0.45);
        ekle(new THREE.BoxGeometry(0.2, 2.4, 0.2), mat('#5a3a20'), 1.2, -1.2); ekle(new THREE.BoxGeometry(0.2, 2.4, 0.2), mat('#5a3a20'), 1.2, 1.2);
        const c = ekle(new THREE.ConeGeometry(1.8, 0.9, 4), mat('#7a3a28'), 2.7); c.rotation.y = Math.PI / 4;
      } else if (e.tur === 'posta') {   // posta kutusu: direk üstünde mavi kutu, üstünde sayı tabelası
        ekle(new THREE.BoxGeometry(0.12, 1.1, 0.12), mat('#4a3020'), 0.55);
        ekle(new THREE.BoxGeometry(0.6, 0.45, 0.45), mat('#2a5a9a'), 1.32);
        ekle(new THREE.CylinderGeometry(0.225, 0.225, 0.6, 12, 1, false, 0, Math.PI), mat('#2a5a9a'), 1.545).rotation.z = Math.PI / 2;
        ekle(new THREE.BoxGeometry(0.05, 0.2, 0.05), mat('#c92a2a'), 1.6, 0.33);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: postaDokusu(0), depthTest: true, transparent: true }));
        sp.scale.set(0.9, 0.9, 1); sp.position.y = 2.35; g.add(sp); postaSpritelari.push(sp);
      } else if (e.tur === 'tabut') {   // mezarlıkta açık tabut, sehpalar, çiçekler, mumlar
        const koyu = mat('#3a2414');
        [-0.6, 0.6].forEach(x => ekle(new THREE.BoxGeometry(0.12, 0.6, 0.7), mat('#5a3a20'), 0.3, x));
        ekle(new THREE.BoxGeometry(0.75, 0.4, 1.9), koyu, 0.8);
        ekle(new THREE.BoxGeometry(0.85, 0.12, 2.0), mat('#2f6e4a'), 1.06);   // yeşil örtü
        [-1, 1].forEach(s => ekle(new THREE.BoxGeometry(0.04, 0.35, 2.0), mat('#2f6e4a'), 0.88, s * 0.43));
        ekle(new THREE.BoxGeometry(0.86, 0.13, 0.12), mat('#e8c84a'), 1.07, 0, 0.6);   // sırma şerit
      } else if (e.tur === 'kisi') {   // berber ustası / barmen ayrı çizilir
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
    x.font = `${Math.round(ef * 0.8)}px sans-serif`; x.fillStyle = '#fff'; Kasaba.postaKutulari.forEach(p => x.fillText('📬', P(p.x), P(p.z)));
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

  // ---------- Görev eşyaları: sandalyeler, berber koltuğu ve ustası, berber direği ----------
  let usta = null, barmen = null, imam = null;
  function gorevEsyalari() {
    Kasaba.gorevler.filter(g => g.anim === 'otur' || g.anim === 'kumar' || g.anim === 'ye').forEach(g => {
      const berber = g.anim === 'otur';
      const grp = new THREE.Group(); grp.position.set(g.x, g.y, g.z); grp.rotation.y = g.yon; scene.add(grp);
      const kol = mat(berber ? '#8a1a1a' : '#6a4424'), ayak = mat(berber ? '#c9c9d2' : '#4a3020');
      const e = (w, h, d, x, y, z, m) => { const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); k.position.set(x, y, z); grp.add(k); };
      e(0.56, 0.1, 0.56, 0, 0.44, 0, kol);                       // oturak
      e(0.56, berber ? 0.85 : 0.6, 0.1, 0, berber ? 0.88 : 0.75, -0.28, kol);   // sırtlık (arkada)
      if (berber) { e(0.08, 0.1, 0.5, 0.3, 0.68, 0, kol); e(0.08, 0.1, 0.5, -0.3, 0.68, 0, kol); e(0.2, 0.4, 0.2, 0, 0.2, 0, ayak); e(0.5, 0.05, 0.5, 0, 0.02, 0, ayak); e(0.4, 0.06, 0.2, 0, 0.12, 0.42, ayak); }
      else [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].forEach(([a, c]) => e(0.06, 0.44, 0.06, a, 0.22, c, ayak));
    });
    // Berber ustası (koltuğun arkasında, müşteri oturunca tıraş eder)
    const u = Kasaba.berberUsta;
    usta = Karakter.yap(1); usta.position.set(u.x, 0, u.z); usta.rotation.y = u.yon; scene.add(usta);
    const bm = Kasaba.barmenYeri; barmen = Karakter.yap(1); barmen.position.set(bm.x, 0, bm.z); barmen.rotation.y = bm.yon; scene.add(barmen);
    const im = Kasaba.imamYeri; imam = Karakter.yap(4); imam.position.set(im.x, im.y, im.z); imam.rotation.y = im.yon; scene.add(imam);   // minberdeki imam
    // Dükkânın önünde kırmızı-beyaz berber direği
    const b = Kasaba.binaBul('berber'), d = Kasaba.dunya(b, 2.6, b.d / 2 + 0.5);
    const direk = new THREE.Group(); direk.position.set(d.x, 0, d.z); scene.add(direk);
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), mat(i % 2 ? '#c92a2a' : '#f2f2f2')); m.position.y = 1.2 + i * 0.2; direk.add(m); }
  }

  // ---------- Süsler: ağaçlar, atlar, sandıklar, değirmen, kaya, ot ----------
  const susGeo = {}, sg = (ad, yap) => susGeo[ad] || (susGeo[ad] = yap());
  let degirmenPervane = null;
  function susleriCiz() {
    const yaprak = [mat('#5f8a3a'), mat('#6f9a44'), mat('#7a8f3a')], govde = mat('#6a4a2c'), kuru = mat('#7a5a3a');
    Kasaba.susler.forEach(e => {
      const g = new THREE.Group(); g.position.set(e.x, 0, e.z); g.rotation.y = e.yon; scene.add(g);
      const ek = (geo, m, x, y, z) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); g.add(k); return k; };
      switch (e.tur) {
        case 'agac': {   // yeşil, yuvarlak taçlı ağaç
          const boy = 3 + e.cesit * 0.8;
          ek(sg('govde', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 7)), govde, 0, boy / 2, 0).scale.y = boy;
          const tac = sg('tac', () => new THREE.IcosahedronGeometry(1, 0));
          ek(tac, yaprak[e.cesit], 0, boy + 0.6, 0).scale.set(1.8, 1.4, 1.8);
          ek(tac, yaprak[(e.cesit + 1) % 3], 0.9, boy + 0.1, 0.3).scale.set(1.2, 1, 1.2);
          ek(tac, yaprak[(e.cesit + 2) % 3], -0.7, boy + 0.3, -0.5).scale.set(1.1, 0.95, 1.1);
          break;
        }
        case 'kuruAgac': {   // dalları çıplak çöl ağacı
          ek(sg('govde', () => new THREE.CylinderGeometry(0.22, 0.32, 1, 7)), kuru, 0, 1.6, 0).scale.y = 3.2;
          const dal = sg('dal', () => new THREE.CylinderGeometry(0.06, 0.11, 1.6, 5));
          [[0.6, 2.4, 0.9], [-0.7, 2.0, -0.8], [0.2, 2.9, -1.1], [-0.3, 2.6, 1.2]].forEach(([dx, y, a]) => { const d = ek(dal, kuru, dx * 0.5, y, 0); d.rotation.z = a; d.rotation.y = dx; });
          break;
        }
        case 'at': {   // bağlama direğine bağlı at
          const renk = mat(['#6a4020', '#3a2a1a', '#c9b08a'][e.cesit]), koyu = mat('#2a1a10');
          ek(sg('atGovde', () => new THREE.BoxGeometry(0.6, 0.7, 1.6)), renk, 0, 1.25, 0);
          const boyun = ek(sg('atBoyun', () => new THREE.BoxGeometry(0.35, 0.8, 0.4)), renk, 0, 1.7, 0.75); boyun.rotation.x = 0.5;
          ek(sg('atBas', () => new THREE.BoxGeometry(0.3, 0.35, 0.7)), renk, 0, 2.05, 1.15);
          ek(sg('atYele', () => new THREE.BoxGeometry(0.08, 0.6, 0.35)), koyu, 0, 1.85, 0.6).rotation.x = 0.5;
          ek(sg('atKuyruk', () => new THREE.BoxGeometry(0.12, 0.7, 0.12)), koyu, 0, 1.0, -0.85).rotation.x = -0.3;
          [[-0.2, -0.6], [0.2, -0.6], [-0.2, 0.6], [0.2, 0.6]].forEach(([x, z]) => ek(sg('atBacak', () => new THREE.BoxGeometry(0.14, 0.9, 0.14)), renk, x, 0.45, z));
          ek(sg('eyer', () => new THREE.BoxGeometry(0.66, 0.12, 0.6)), mat('#5a2a14'), 0, 1.62, -0.05);
          const direk = sg('direk', () => new THREE.BoxGeometry(0.15, 1.1, 0.15));
          ek(direk, govde, 0.9, 0.55, 1.1); ek(direk, govde, 0.9, 0.55, -0.6);
          ek(sg('ray', () => new THREE.BoxGeometry(0.1, 0.1, 1.9)), govde, 0.9, 1.05, 0.25);
          break;
        }
        case 'sandik': {   // sandık ve fıçı yığını
          const tahta = mat(['#8a6440', '#7a5530', '#9a7448'][e.cesit]), kutu = sg('sandik', () => new THREE.BoxGeometry(0.8, 0.8, 0.8));
          ek(kutu, tahta, -0.35, 0.4, 0);
          ek(kutu, tahta, 0.45, 0.4, 0.1).rotation.y = 0.3;
          ek(kutu, tahta, 0.05, 1.2, 0.05).rotation.y = -0.2;
          ek(sg('fici', () => new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10)), mat('#6a4422'), 0.2, 0.45, -0.75);
          break;
        }
        case 'degirmen': {   // yel değirmeni
          [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].forEach(([x, z]) => { const a = ek(new THREE.BoxGeometry(0.15, 9, 0.15), govde, x * 0.6, 4.5, z * 0.6); a.rotation.z = -x * 0.08; a.rotation.x = z * 0.08; });
          ek(new THREE.BoxGeometry(0.6, 0.6, 0.9), mat('#8a8a90'), 0, 9.2, 0);
          degirmenPervane = new THREE.Group(); degirmenPervane.position.set(0, 9.2, 0.55); g.add(degirmenPervane);
          for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.8, 0.05), mat('#c9c9cf')); k.position.y = 1; const kol = new THREE.Group(); kol.rotation.z = i * Math.PI / 3; kol.add(k); degirmenPervane.add(kol); }
          ek(new THREE.BoxGeometry(0.1, 0.8, 1.6), mat('#b03030'), 0, 9.2, -1.2);
          ek(new THREE.CylinderGeometry(1.1, 1.1, 1.2, 12), mat('#7a6a5a'), 1.8, 0.6, 0);   // su deposu
          break;
        }
        case 'ficiYigin': {   // bina köşesinde fıçılar ve bir sandık
          const fici = sg('fici', () => new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10)), m = mat(['#6a4422', '#7a5028', '#5a3a1c'][e.cesit]), cember = mat('#3a3a40');
          ek(fici, m, -0.25, 0.45, 0); ek(fici, m, 0.3, 0.45, 0.15); ek(fici, m, 0.02, 1.35, 0.06);
          ek(sg('cember', () => new THREE.CylinderGeometry(0.36, 0.36, 0.06, 10)), cember, -0.25, 0.7, 0);
          ek(sg('cember', () => new THREE.CylinderGeometry(0.36, 0.36, 0.06, 10)), cember, 0.3, 0.7, 0.15);
          break;
        }
        case 'bank': {   // sundurmada tahta bank
          const t = mat('#7a5530');
          ek(sg('bankOturak', () => new THREE.BoxGeometry(1.4, 0.08, 0.4)), t, 0, 0.45, 0);
          ek(sg('bankSirt', () => new THREE.BoxGeometry(1.4, 0.4, 0.06)), t, 0, 0.72, -0.2);
          [-0.6, 0.6].forEach(x => ek(sg('bankAyak', () => new THREE.BoxGeometry(0.08, 0.45, 0.36)), t, x, 0.22, 0));
          break;
        }
        case 'kaya': {
          const k = ek(sg('kaya', () => new THREE.DodecahedronGeometry(0.5, 0)), mat(['#9a8a7a', '#8a7a6a', '#a89a88'][e.cesit]), 0, 0.2, 0);
          k.scale.set(1 + e.cesit * 0.4, 0.6 + e.cesit * 0.2, 1 + e.cesit * 0.3);
          break;
        }
        case 'ot': {   // kuru ot tutamı
          const m = mat(['#a8a05a', '#8f9a4a', '#b8a868'][e.cesit]);
          for (let i = 0; i < 3; i++) { const o = ek(sg('ot', () => new THREE.ConeGeometry(0.12, 0.6, 4)), m, (i - 1) * 0.15, 0.3, (i % 2) * 0.1); o.rotation.z = (i - 1) * 0.35; }
          break;
        }
      }
    });
  }

  // ---------- Duvarlarda ARANIYOR / KAYIP afişleri ve meydanda ilan tahtası ----------
  const AFISLER = [
    { ust: 'ARANIYOR', resim: 'yuz', alt: 'ÖDÜL $500', not: 'Kara Bıyık' },
    { ust: 'ARANIYOR', resim: 'yuz2', alt: 'ÖDÜL $1000', not: 'Tek Göz Rıza' },
    { ust: 'ARANIYOR', resim: 'yuz', alt: 'ÖLÜ YA DA DİRİ', not: 'Sahte Haydut' },
    { ust: 'KAYIP', resim: 'at', alt: 'Adı: Kara Şimşek', not: 'Görenler şerife' },
    { ust: 'KAYIP', resim: 'kopek', alt: 'Adı: Karabaş', not: 'Ödül: 5 altın' },
    { ust: 'KAYIP', resim: 'kedi', alt: 'Adı: Pamuk', not: 'Fırının kedisi' },
    { ust: 'KAYIP', resim: 'inek', alt: 'Benekli inek', not: 'Ağıldan kaçtı' },
  ];
  const afisDokulari = [];
  function afisDokusu(a) {
    const c = document.createElement('canvas'); c.width = 200; c.height = 260;
    const x = c.getContext('2d');
    x.fillStyle = '#efdcae'; x.fillRect(0, 0, 200, 260);
    const kenar = x.createRadialGradient(100, 130, 60, 100, 130, 170); kenar.addColorStop(0, 'rgba(0,0,0,0)'); kenar.addColorStop(1, 'rgba(110,70,20,0.45)');
    x.fillStyle = kenar; x.fillRect(0, 0, 200, 260);
    x.fillStyle = a.ust === 'KAYIP' ? '#1f3a6a' : '#5a1a0e'; x.textAlign = 'center';
    x.font = 'bold 36px Georgia, serif'; x.fillText(a.ust, 100, 42, 186);
    x.fillStyle = '#3b2414';
    const cx = 100, cy = 128;
    if (a.resim === 'yuz' || a.resim === 'yuz2') {
      x.beginPath(); x.ellipse(cx, cy + 6, 32, 38, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(cx, cy - 26, 62, 10, 0, 0, 7); x.fill(); x.fillRect(cx - 30, cy - 58, 60, 34);
      x.fillStyle = '#efdcae'; x.fillRect(cx - 18, cy, 12, 5);
      if (a.resim === 'yuz') x.fillRect(cx + 6, cy, 12, 5); else { x.fillStyle = '#3b2414'; x.fillRect(cx + 4, cy - 4, 16, 10); }
      x.fillStyle = '#3b2414'; x.fillRect(cx - 18, cy + 18, 36, 6);
    } else if (a.resim === 'at') {
      x.fillRect(cx - 40, cy - 10, 70, 30); x.fillRect(cx + 20, cy - 40, 16, 40); x.fillRect(cx + 20, cy - 46, 34, 16);
      [-36, -20, 8, 22].forEach(l => x.fillRect(cx + l, cy + 18, 8, 30)); x.fillRect(cx - 52, cy - 6, 14, 6);
    } else if (a.resim === 'kopek') {
      x.fillRect(cx - 34, cy, 56, 24); x.fillRect(cx + 14, cy - 24, 26, 26); x.fillRect(cx + 34, cy - 14, 12, 10); x.fillRect(cx + 16, cy - 32, 8, 10);
      [-30, -16, 4, 14].forEach(l => x.fillRect(cx + l, cy + 22, 7, 20)); x.fillRect(cx - 46, cy - 6, 14, 6);
    } else if (a.resim === 'kedi') {
      x.beginPath(); x.ellipse(cx - 6, cy + 16, 30, 22, 0, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 22, cy - 10, 16, 0, 7); x.fill();
      x.beginPath(); x.moveTo(cx + 10, cy - 20); x.lineTo(cx + 14, cy - 36); x.lineTo(cx + 22, cy - 24); x.fill();
      x.beginPath(); x.moveTo(cx + 24, cy - 24); x.lineTo(cx + 32, cy - 36); x.lineTo(cx + 36, cy - 20); x.fill();
      x.fillRect(cx - 42, cy + 2, 8, 30);
    } else {   // inek
      x.fillRect(cx - 40, cy - 8, 68, 32); x.fillRect(cx + 26, cy - 18, 24, 22); [-36, -20, 8, 20].forEach(l => x.fillRect(cx + l, cy + 22, 8, 22));
      x.fillStyle = '#efdcae'; x.fillRect(cx - 24, cy - 2, 18, 12); x.fillRect(cx + 4, cy + 6, 12, 10);
    }
    x.fillStyle = '#5a1a0e'; x.font = 'bold 24px Georgia, serif'; x.fillText(a.alt, 100, 214, 186);
    x.fillStyle = '#3b2414'; x.font = 'italic 18px Georgia, serif'; x.fillText(a.not, 100, 242, 186);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    return new THREE.MeshLambertMaterial({ map: t });
  }
  function afisleriAs() {
    AFISLER.forEach(a => afisDokulari.push(afisDokusu(a)));
    const afisGeo = new THREE.PlaneGeometry(0.62, 0.8);
    let sira = 0;
    Kasaba.binalar.forEach(b => {
      if (b.tur === 'kule' || b.tur === 'ambar' || b.id === 'kilise') return;   // caminin duvarına afiş asılmaz
      const on = b.ic ? b.d / 2 + Kasaba.DUVAR / 2 + 0.03 : b.d / 2 + 0.03;
      const yerler = b.tur === 'ev' ? [1.9] : [2.15, -2.15];
      yerler.forEach((u, i) => {
        if ((sira + i) % 3 === 2) return;   // her yere değil
        const m = new THREE.Mesh(afisGeo, afisDokulari[(sira * 3 + i) % afisDokulari.length]);
        const p = Kasaba.dunya(b, u, on);
        m.position.set(p.x, 1.65 + ((sira + i) % 2) * 0.12, p.z); m.rotation.y = b.kapi === 'k' ? Math.PI : 0; m.rotation.z = ((sira * 7 + i) % 5 - 2) * 0.03;
        scene.add(m);
      });
      sira++;
    });
    // Meydanda ilan tahtası (caddeye bakar)
    const g = new THREE.Group(); g.position.set(-14, 0, 9.6); scene.add(g);
    const ahsap = mat('#6a4424');
    [-1.4, 1.4].forEach(x => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), ahsap); d.position.set(x, 1.2, 0); g.add(d); });
    const pano = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.1), mat('#8a6440')); pano.position.set(0, 1.55, 0); g.add(pano);
    const ust = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 0.5), mat('#4a2e18')); ust.position.set(0, 2.45, 0); g.add(ust);
    const baslik = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), tabela('İLAN TAHTASI')); baslik.position.set(0, 2.15, -0.06); baslik.rotation.y = Math.PI; g.add(baslik);
    [-1, 0, 1].forEach((x, i) => { const m = new THREE.Mesh(afisGeo, afisDokulari[(i * 2 + 1) % afisDokulari.length]); m.position.set(x * 0.9, 1.45, -0.06); m.rotation.y = Math.PI; m.rotation.z = (i - 1) * 0.05; g.add(m); });
  }

  // ---------- Hareketli süsler: yuvarlanan çalı topları, bulutlar, değirmen ----------
  const calilar = [], bulutlar = [];
  function hareketliSusler() {
    const cali = mat('#a8884a'), tel = new THREE.MeshLambertMaterial({ color: '#a8884a', wireframe: true });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), tel);
      m.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), cali));
      m.userData = { x: -90 + i * 45, z: (i % 2 ? 4.5 : -4.5) + i * 0.4, hiz: 2.2 + i * 0.4 };
      scene.add(m); calilar.push(m);
    }
    const bulutMat = new THREE.MeshLambertMaterial({ color: '#fffaf0', transparent: true, opacity: 0.85 });
    const bulutGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const k = new THREE.Mesh(bulutGeo, bulutMat); k.scale.set(6 + j, 2.5, 5); k.position.set(j * 5 - 7, (j % 2) * 1.2, (j % 3) * 2); g.add(k); }
      g.position.set(-180 + i * 45, 55 + (i % 3) * 8, -120 + (i * 53) % 240); scene.add(g); bulutlar.push(g);
    }
  }
  function susAnim(dt) {
    calilar.forEach(m => {
      const u = m.userData; u.x += u.hiz * dt; if (u.x > 95) u.x = -95;
      m.position.set(u.x, 0.45 + Math.abs(Math.sin(u.x * 1.3)) * 0.25, u.z + Math.sin(u.x * 0.2) * 1.2);
      m.rotation.z -= u.hiz * dt / 0.45;
    });
    bulutlar.forEach(b => { b.position.x += dt * 1.5; if (b.position.x > 220) b.position.x = -220; });
    if (degirmenPervane) degirmenPervane.rotation.z += dt * 1.2;
  }

  return { susAnim, get berberUstasi() { return usta; }, get barmen() { return barmen; }, get imam() { return imam; }, postaSayisi, kur, haritaZemini, serifKapisi(acik, hemen) { kapiHedef = acik ? 1.6 : 0; if (hemen && kapiGrup) kapiGrup.rotation.y = kapiHedef; }, kapiCanlandir, get scene() { return scene; }, get kamera() { return kamera; }, ciz() { renderer.render(scene, kamera); }, mobil };
})();
