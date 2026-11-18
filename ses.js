// =============================================================
// Sahte Haydut - oyun sesleri (dosya yok, tarayıcı kendisi üretir). Sesli sohbet ayrı (ag.js).
// =============================================================

const Ses = (() => {
  let acik = true;
  try { acik = localStorage.getItem('ar.ses') !== '0'; } catch (e) { }
  const al = () => (typeof Ag !== 'undefined' ? Ag.ctxAl() : null);
  function ton(frek, sure, tip = 'sine', ses = 0.15, gecikme = 0, kayma = 0) {
    const c = al(); if (!c || !acik) return;
    const t = c.currentTime + gecikme;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tip; o.frequency.setValueAtTime(frek, t);
    if (kayma) o.frequency.exponentialRampToValueAtTime(Math.max(30, frek + kayma), t + sure);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ses, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + sure + 0.02);
  }
  function gurultu(sure, ses = 0.5, filtre = 1200, tip = 'lowpass', gecikme = 0) {
    const c = al(); if (!c || !acik || ses < 0.01) return;
    const n = Math.floor(c.sampleRate * sure), buf = c.createBuffer(1, n, c.sampleRate), v = buf.getChannelData(0);
    for (let i = 0; i < n; i++) v[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = tip; f.frequency.value = filtre; g.gain.value = ses;
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + gecikme);
  }
  return {
    get acik() { return acik; },
    degistir() { acik = !acik; try { localStorage.setItem('ar.ses', acik ? '1' : '0'); } catch (e) { } return acik; },
    baslat() { al(); },
    // uzaklik: metre (uzaktaki silah sesi kısık duyulur)
    ates(uzaklik = 0) { const s = Math.max(0.05, 1 - uzaklik / 90); gurultu(0.5, 0.9 * s, 1800); gurultu(0.25, 0.6 * s, 400); ton(90, 0.25, 'triangle', 0.3 * s, 0, -50); },
    bildirim() { ton(880, 0.12, 'sine', 0.12); ton(1320, 0.18, 'sine', 0.1, 0.12); },
    gorev() { ton(660, 0.1, 'square', 0.06); ton(990, 0.18, 'square', 0.06, 0.1); },
    is() { ton(520, 0.06, 'square', 0.04); },
    iyi() { [523, 659, 784].forEach((f, i) => ton(f, 0.2, 'triangle', 0.12, i * 0.1)); },
    kotu() { ton(300, 0.3, 'sawtooth', 0.08, 0, -150); },
    hapis() { ton(160, 0.5, 'sawtooth', 0.1, 0, -60); gurultu(0.3, 0.3, 600, 'lowpass', 0.05); },
    posta() { [1568, 1175, 1568].forEach((f, i) => ton(f, 0.35, 'sine', 0.14, i * 0.16)); },   // posta zili
    // Koşan birinin ayak sesi (s: 0..1 yakınlık). Toprak zeminde tok bir 'tap'
    adim(s = 1) { if (s < 0.03) return; gurultu(0.07, 0.55 * s, 500 + Math.random() * 300); ton(70 + Math.random() * 25, 0.06, 'sine', 0.12 * s); },
    // Köpek: s = yakınlık 0..1
    // Gerçekçi köpek havlaması: "hav-hav ... hav". Her havlama: hızlı yükselip düşen ses telleri + gırtlak gürültüsü + göğüs tınısı
    havla(s = 1) {
      const c = al(); if (!c || !acik || s < 0.03) return;
      const cikis = c.createGain(); cikis.gain.value = 0.9 * s; cikis.connect(c.destination);
      const egri = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; egri[i] = Math.tanh(x * 2.5); }
      [0, 0.2, 0.62].forEach((g, i) => {
        const t = c.currentTime + g + Math.random() * 0.03, sure = 0.16 + Math.random() * 0.04, f0 = (i === 2 ? 330 : 360) * (0.92 + Math.random() * 0.16);
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 0.7, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.025); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + sure);
        const bozuk = c.createWaveShaper(); bozuk.curve = egri;
        const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 3;
        const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1500; f2.Q.value = 4;
        const z = c.createGain(); z.gain.setValueAtTime(0.0001, t); z.gain.exponentialRampToValueAtTime(1, t + 0.012); z.gain.exponentialRampToValueAtTime(0.25, t + 0.07); z.gain.exponentialRampToValueAtTime(0.0001, t + sure);
        o.connect(bozuk); bozuk.connect(f1); bozuk.connect(f2); f1.connect(z); f2.connect(z); z.connect(cikis);
        o.start(t); o.stop(t + sure + 0.02);
        const n = Math.floor(c.sampleRate * sure), buf = c.createBuffer(1, n, c.sampleRate), v = buf.getChannelData(0);
        for (let k = 0; k < n; k++) v[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 2);
        const kaynak = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
        kaynak.buffer = buf; nf.type = 'bandpass'; nf.frequency.value = 1100; nf.Q.value = 1.2; ng.gain.value = 0.35;
        kaynak.connect(nf).connect(ng).connect(cikis); kaynak.start(t);
        const gs = c.createOscillator(), gg = c.createGain(); gs.type = 'sine';
        gs.frequency.setValueAtTime(f0 * 0.45, t); gs.frequency.exponentialRampToValueAtTime(f0 * 0.3, t + sure);
        gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.5, t + 0.015); gg.gain.exponentialRampToValueAtTime(0.0001, t + sure * 0.9);
        gs.connect(gg).connect(cikis); gs.start(t); gs.stop(t + sure + 0.02);
      });
    },
    inle() { ton(700, 0.5, 'sine', 0.08, 0, -250); },
    kelepce() { ton(1800, 0.05, 'square', 0.06); ton(1400, 0.06, 'square', 0.06, 0.08); gurultu(0.12, 0.3, 3000, 'highpass', 0.04); },
    tik() { ton(1200, 0.03, 'square', 0.03); },
    kazandi() { [392, 523, 659, 784, 1046].forEach((f, i) => ton(f, 0.25, 'triangle', 0.13, i * 0.12)); },
    kaybetti() { [392, 330, 262, 196].forEach((f, i) => ton(f, 0.3, 'triangle', 0.12, i * 0.16)); },
  };
})();
