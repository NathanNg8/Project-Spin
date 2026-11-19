/* Small synthesized slot-machine sounds. No audio files. */
const Sound = (() => {
  "use strict";

  // All effects run through this gain, so the mix stays balanced when the
  // overall level is raised.
  const MASTER_VOLUME = 1.7;

  let ctx = null;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && !master) {
      master = ctx.createGain();
      master.gain.value = MASTER_VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function output() {
    return master || ctx.destination;
  }

  function live() {
    return ctx && ctx.state === "running";
  }

  function tone({ type = "square", from = 440, to = from, dur = 0.08, vol = 0.05, when = 0 }) {
    if (!live()) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, from), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(output());
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.1, vol = 0.06, when = 0, freq = 800 }) {
    if (!live()) return;
    const t = ctx.currentTime + when;
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(output());
    src.start(t);
  }

  return {
    ensure,
    tick() {
      tone({ type: "square", from: 720, to: 380, dur: 0.035, vol: 0.025 });
    },
    clunk() {
      tone({ type: "sine", from: 120, to: 42, dur: 0.26, vol: 0.2 });
      tone({ type: "triangle", from: 78, to: 46, dur: 0.16, vol: 0.08, when: 0.02 });
      noise({ dur: 0.12, vol: 0.09, freq: 520 });
    },
    lever() {
      tone({ type: "square", from: 190, to: 130, dur: 0.06, vol: 0.05 });
      tone({ type: "square", from: 130, to: 85, dur: 0.08, vol: 0.05, when: 0.12 });
    },
    win() {
      tone({ type: "triangle", from: 660, to: 660, dur: 0.14, vol: 0.09 });
      tone({ type: "triangle", from: 880, to: 880, dur: 0.22, vol: 0.09, when: 0.13 });
    },
  };
})();
