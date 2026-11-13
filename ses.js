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
    tik() { ton(1200, 0.03, 'square', 0.03); },
    kazandi() { [392, 523, 659, 784, 1046].forEach((f, i) => ton(f, 0.25, 'triangle', 0.13, i * 0.12)); },
    kaybetti() { [392, 330, 262, 196].forEach((f, i) => ton(f, 0.3, 'triangle', 0.12, i * 0.16)); },
  };
})();
