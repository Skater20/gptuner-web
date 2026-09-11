// Two small, real, playable demos embedded in the landing page — not screenshots, not fake claims.
// 1) A draggable tuner dial: drag anywhere over it to detune a note and watch the needle, the cents
//    readout and the color react exactly like the app's meter does.
// 2) An ear-training mini game: generates two real tones with the Web Audio API (no audio files, no
//    microphone) and asks whether the second is higher or lower, exactly like the in-app exercise.
(function () {
  "use strict";

  // ---------- 1) Tuner dial ----------
  function initDial() {
    var dial = document.getElementById("dial");
    if (!dial) return;
    var needle = document.getElementById("dial-needle");
    var noteEl = document.getElementById("dial-note");
    var hzEl = document.getElementById("dial-hz");
    var centsEl = document.getElementById("dial-cents");
    var A4 = 440;
    var dragging = false;

    function colorFor(cents) {
      var a = Math.abs(cents);
      if (a <= 3) return { c: "var(--green)", glow: "0 0 26px rgba(181,230,184,.55)" };
      if (a <= 15) return { c: "var(--amber)", glow: "none" };
      return { c: "var(--coral)", glow: "none" };
    }

    function update(cents) {
      cents = Math.max(-50, Math.min(50, cents));
      var deg = (cents / 50) * 60;
      needle.setAttribute("transform", "rotate(" + deg.toFixed(1) + " 150 152)");
      var hz = A4 * Math.pow(2, cents / 1200);
      var col = colorFor(cents);
      noteEl.style.color = col.c;
      noteEl.style.textShadow = col.glow;
      hzEl.textContent = hz.toFixed(2) + " Hz";
      var sign = cents > 0.5 ? "+" : cents < -0.5 ? "" : "";
      centsEl.textContent = sign + cents.toFixed(1) + " cents";
      centsEl.style.color = col.c;
      centsEl.style.background = "color-mix(in srgb, " + col.c + " 16%, transparent)";
    }

    function centsFromEvent(e) {
      var rect = dial.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var frac = x / rect.width; // 0..1 across the widget
      return (frac - 0.5) * 2 * 50;
    }

    function start(e) { dragging = true; update(centsFromEvent(e)); e.preventDefault(); }
    function move(e) { if (dragging) update(centsFromEvent(e)); }
    function end() { dragging = false; }

    dial.addEventListener("pointerdown", start);
    dial.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    dial.addEventListener("keydown", function (e) {
      var current = parseFloat(centsEl.textContent) || 0;
      if (e.key === "ArrowLeft") update(current - 2);
      else if (e.key === "ArrowRight") update(current + 2);
    });

    update(0);
    // A slow idle sweep so the dial isn't inert before anyone touches it.
    var t0 = performance.now(), idle = true;
    dial.addEventListener("pointerdown", function () { idle = false; });
    function sweep(t) {
      if (idle) update(Math.sin((t - t0) / 1400) * 9);
      requestAnimationFrame(sweep);
    }
    requestAnimationFrame(sweep);
  }

  // ---------- 2) Ear-training demo ----------
  function initEarTrainer() {
    var playBtn = document.getElementById("ear-play");
    if (!playBtn) return;
    var higherBtn = document.getElementById("ear-higher");
    var lowerBtn = document.getElementById("ear-lower");
    var status = document.getElementById("ear-status");
    var scoreEl = document.getElementById("ear-score");
    var ctx = null;
    var lastHigher = null;
    var round = false;
    var correct = 0, total = 0;

    function tone(freq, startAt, dur) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.18, startAt + 0.02);
      gain.gain.linearRampToValueAtTime(0.18, startAt + dur - 0.05);
      gain.gain.linearRampToValueAtTime(0, startAt + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + dur + 0.02);
    }

    function play() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      var root = 220 + Math.random() * 220;
      var semis = 2 + Math.floor(Math.random() * 10);
      lastHigher = Math.random() < 0.5;
      var second = root * Math.pow(2, (lastHigher ? semis : -semis) / 12);
      var now = ctx.currentTime;
      tone(root, now + 0.05, 0.55);
      tone(second, now + 0.75, 0.55);
      round = true;
      status.textContent = statusText("listen");
      higherBtn.disabled = lowerBtn.disabled = true;
      setTimeout(function () {
        higherBtn.disabled = lowerBtn.disabled = false;
        status.textContent = statusText("ask");
      }, 1500);
    }

    // Same allowlist i18n.js enforces before it ever sets <html lang>. Re-checked here too — this
    // file must not assume the attribute was validated upstream and index an object with it as-is
    // (that's how a stray "__proto__"/"constructor" lang value would resolve to a prototype object
    // instead of undefined, however harmless the payload actually is in this read-only lookup).
    var ALLOWED_LANGS = ["es", "en", "fr", "de", "it", "pt"];

    function statusText(key) {
      // Spanish is the page's own default copy (not in the override dictionary, same rule as
      // i18n.js), so the fallback here must be Spanish too — not English — or picking Spanish in
      // the switcher would leave this one widget stuck in English.
      var lang = document.documentElement.lang;
      var allowed = ALLOWED_LANGS.indexOf(lang) !== -1;
      var table = (allowed && lang !== "es" && window.GPTUNER_I18N &&
        Object.prototype.hasOwnProperty.call(window.GPTUNER_I18N, lang) && window.GPTUNER_I18N[lang]) || null;
      var es = { listen: "Escuchando…", ask: "¿Más alta o más baja?", correct: "¡Correcto!", wrong: "Casi." };
      return (table && Object.prototype.hasOwnProperty.call(table, "ear.status." + key) && table["ear.status." + key]) || es[key];
    }

    function answer(guessHigher) {
      if (!round) return;
      round = false;
      total++;
      var ok = guessHigher === lastHigher;
      if (ok) correct++;
      status.textContent = statusText(ok ? "correct" : "wrong");
      scoreEl.textContent = correct + " / " + total;
      higherBtn.disabled = lowerBtn.disabled = true;
    }

    playBtn.addEventListener("click", play);
    higherBtn.addEventListener("click", function () { answer(true); });
    lowerBtn.addEventListener("click", function () { answer(false); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDial();
    initEarTrainer();
  });
})();
