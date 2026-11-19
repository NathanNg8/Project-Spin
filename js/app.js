/* One reel, five visible ideas, middle idea wins. */
(() => {
  "use strict";

  const ROWS = 5;
  const WINNER_ROW = 2;
  const FILLER_COUNT = 40;

  // Dramatic spin: quick launch, fast blur phase, then a long mechanical slowdown.
  const SPIN_ACCEL = 0.05;
  const SPIN_HOLD_END = 0.5;
  const SPIN_TAIL = 1 - SPIN_HOLD_END;
  const SPIN_AREA = SPIN_ACCEL / 2 + (SPIN_HOLD_END - SPIN_ACCEL) + (SPIN_TAIL * 2) / 3;
  const SPIN_PEAK = 1 / SPIN_AREA;

  function easeSpin(progress) {
    if (progress < SPIN_ACCEL) {
      return (SPIN_PEAK * progress * progress) / (2 * SPIN_ACCEL);
    }
    if (progress < SPIN_HOLD_END) {
      return SPIN_PEAK * (SPIN_ACCEL / 2 + (progress - SPIN_ACCEL));
    }

    const q = (progress - SPIN_HOLD_END) / SPIN_TAIL;
    return SPIN_PEAK * (SPIN_ACCEL / 2 + (SPIN_HOLD_END - SPIN_ACCEL) + SPIN_TAIL * (q - (q * q * q) / 3));
  }

  const reel = document.querySelector(".reel");
  const strip = document.getElementById("strip");
  const handle = document.getElementById("handle");
  const announce = document.getElementById("announce");

  const state = {
    spinning: false,
    current: [],
    hasResult: false,
  };

  const randomIdea = () => IDEAS[Math.floor(Math.random() * IDEAS.length)];

  function pickDistinct(count) {
    const previous = new Set(state.current);
    let pool = IDEAS.filter((title) => !previous.has(title));
    if (pool.length < count) pool = IDEAS.slice();

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function renderFaces(ideas) {
    const fragment = document.createDocumentFragment();
    const nodes = ideas.map((title) => {
      const face = document.createElement("div");
      face.className = "face";
      face.textContent = title;
      fragment.appendChild(face);
      return face;
    });

    strip.innerHTML = "";
    strip.appendChild(fragment);
    strip.style.transform = "translateY(0)";
    strip.style.filter = "none";
    return nodes;
  }

  function joltReel() {
    reel.classList.remove("is-stopping");
    void reel.offsetWidth;
    reel.classList.add("is-stopping");
    setTimeout(() => reel.classList.remove("is-stopping"), 220);
  }

  function showIdle() {
    const nodes = renderFaces(state.current);
    if (state.hasResult) nodes[WINNER_ROW].classList.add("is-winner");
  }

  function pullHandle() {
    handle.classList.remove("is-pulled");
    void handle.offsetWidth;
    handle.classList.add("is-pulled");
    setTimeout(() => handle.classList.remove("is-pulled"), 280);
  }

  function spin() {
    if (state.spinning) return;

    state.spinning = true;
    handle.disabled = true;

    Sound.ensure();
    Sound.lever();
    pullHandle();

    const picks = pickDistinct(ROWS);
    const fillers = [];
    for (let i = 0; i < FILLER_COUNT; i++) fillers.push(randomIdea());

    const faces = [...state.current, ...fillers, ...picks];
    const targetTop = state.current.length + fillers.length;
    const nodes = renderFaces(faces);

    const height = reel.getBoundingClientRect().height / ROWS;
    const distance = targetTop * height;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 300 : 4500;
    const startedAt = performance.now();
    let lastFace = 0;
    let lastTickAt = 0;

    if (!reduceMotion) strip.style.filter = "blur(0.6px)";
    let blurred = !reduceMotion;

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = easeSpin(progress);
      const y = -distance * eased;
      strip.style.transform = `translateY(${y}px)`;

      if (blurred && progress >= 0.62) {
        blurred = false;
        strip.style.filter = "none";
      }

      const faceIndex = Math.floor(-y / height);
      if (faceIndex !== lastFace) {
        lastFace = faceIndex;
        if (now - lastTickAt > 45) {
          lastTickAt = now;
          Sound.tick();
        }
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        land(nodes, targetTop, picks, reduceMotion);
      }
    }

    requestAnimationFrame(frame);
  }

  function land(nodes, targetTop, picks, reduceMotion) {
    strip.style.filter = "none";
    Sound.clunk();
    if (!reduceMotion) joltReel();

    const winnerNode = nodes[targetTop + WINNER_ROW];
    const settleDelay = reduceMotion ? 0 : 90;

    setTimeout(() => {
      winnerNode.classList.add("is-winner");
      Sound.win();

      state.spinning = false;
      state.hasResult = true;
      state.current = picks;
      handle.disabled = false;
      announce.textContent = `Winner: ${picks[WINNER_ROW]}`;
    }, settleDelay);
  }

  handle.addEventListener("click", spin);

  // Space spins from anywhere on the page, not just when the handle has focus.
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code !== "Space" && event.key !== " ") return;

    const target = event.target;
    const tag = target instanceof Element ? target.tagName : "";
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tag))) return;

    // Stops the page from scrolling and the focused button from also firing a click.
    event.preventDefault();
    if (!state.spinning) spin();
  });

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    if (state.spinning) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(showIdle, 120);
  });

  state.current = pickDistinct(ROWS);
  showIdle();
})();
