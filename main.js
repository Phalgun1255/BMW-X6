/**
 * NOCTIS — Scrollytelling & Interaction Engine
 * Pure vanilla JavaScript. Zero external dependencies.
 */

(function () {
  'use strict';

  const cfg = window.NOCTIS_CONFIG;
  if (!cfg) {
    console.error('NOCTIS configuration not found.');
    return;
  }

  // Detect Reduced Motion & Fine Pointer
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  // Global State
  const state = {
    isMobile: window.innerWidth < 768,
    heroLoadedFrames: new Map(),
    dismantleLoadedFrames: new Map(),
    heroCurrentFrame: 0,
    heroTargetFrame: 0,
    dismantleCurrentFrame: 0,
    dismantleTargetFrame: 0,
    lastScrollY: window.scrollY,
    activeLineupIndex: 0,
    lineupHoverTimeout: null,
    heroBounds: null,
    dismantleBounds: null,
    isPreloaded: false,
  };

  /* ==========================================================================
     1. PRELOADER & ASSET STREAMING
     Preload first 40 hero frames -> reveal page -> stream remaining frames
     ========================================================================== */
  const preloaderEl = document.getElementById('preloader');
  const preloaderLine = document.getElementById('preloader-line');
  const preloaderCounter = document.getElementById('preloader-counter');

  function getFramePath(type, idx) {
    const isMob = state.isMobile;
    if (type === 'hero') {
      return isMob ? cfg.paths.heroMobile(idx) : cfg.paths.heroDesktop(idx);
    } else {
      return isMob ? cfg.paths.dismantleMobile(idx) : cfg.paths.dismantleDesktop(idx);
    }
  }

  function loadSingleImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      if (img.decode) {
        img.decode()
          .then(() => resolve(img))
          .catch(() => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
          });
      } else {
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      }
    });
  }

  async function initAssetLoading() {
    const initialBatchCount = cfg.frames.preloadHeroInitial || 40;
    let initialLoaded = 0;

    // Load initial hero frames for preloader progress
    for (let i = 1; i <= initialBatchCount; i++) {
      const path = getFramePath('hero', i);
      loadSingleImage(path).then((img) => {
        if (img) state.heroLoadedFrames.set(i, img);
        initialLoaded++;
        const pct = Math.min(100, Math.round((initialLoaded / initialBatchCount) * 100));
        if (preloaderLine) preloaderLine.style.width = pct + '%';
        if (preloaderCounter) preloaderCounter.textContent = String(pct).padStart(3, '0');

        // Draw initial frame as soon as frame 1 arrives
        if (i === 1 && !state.heroInitialDrawn) {
          state.heroInitialDrawn = true;
          drawScrollyFrame('hero', 0);
        }

        if (initialLoaded >= initialBatchCount && !state.isPreloaded) {
          revealSite();
        }
      });
    }

    // Safety fallback in case network stalls
    setTimeout(() => {
      if (!state.isPreloaded) revealSite();
    }, 4000);
  }

  function revealSite() {
    state.isPreloaded = true;
    if (preloaderLine) preloaderLine.classList.add('flash');

    setTimeout(() => {
      if (preloaderEl) preloaderEl.classList.add('fade-out');
      // Stream the remaining hero frames, then dismantle frames sequentially in background
      streamBackgroundAssets();
    }, 180);
  }

  async function streamBackgroundAssets() {
    const totalHero = state.isMobile ? cfg.frames.heroMobile : cfg.frames.hero;
    const totalDismantle = state.isMobile ? cfg.frames.dismantleMobile : cfg.frames.dismantle;
    const initialBatchCount = cfg.frames.preloadHeroInitial || 40;

    // 1. Remaining hero frames
    for (let i = initialBatchCount + 1; i <= totalHero; i++) {
      const path = getFramePath('hero', i);
      const img = await loadSingleImage(path);
      if (img) state.heroLoadedFrames.set(i, img);
    }

    // 2. Dismantle frames
    for (let i = 1; i <= totalDismantle; i++) {
      const path = getFramePath('dismantle', i);
      const img = await loadSingleImage(path);
      if (img) state.dismantleLoadedFrames.set(i, img);

      // Render dismantle initial frame when frame 1 is ready
      if (i === 1) {
        drawScrollyFrame('dismantle', 0);
      }
    }
  }

  /* ==========================================================================
     2. CANVAS RENDERING & SCROLLYTELLING LOGIC
     cover-fit on landscape; contain-fit vertically centered on portrait.
     Scale by devicePixelRatio (capped at 2). Nearest-loaded frame fallback.
     ========================================================================== */
  const heroCanvas = document.getElementById('hero-canvas');
  const dismantleCanvas = document.getElementById('dismantle-canvas');
  const heroBlackout = document.getElementById('hero-blackout');
  const heroProgressBar = document.getElementById('hero-progress-bar');
  const dismantleProgressBar = document.getElementById('dismantle-progress-bar');

  // Left HUD elements
  const hudChapterVal = document.getElementById('hud-chapter-val');
  const hudSpeedVal = document.getElementById('hud-speed-val');
  const hudDistanceVal = document.getElementById('hud-distance-val');

  // Hero Chapter Articles
  const chapterArticles = {
    1: document.getElementById('hero-ch1'),
    2: document.getElementById('hero-ch2'),
    3: document.getElementById('hero-ch3'),
    4: document.getElementById('hero-ch4'),
  };

  const heroWrapper = document.getElementById('hero');
  const dismantleWrapper = document.getElementById('dismantle');

  // Find the nearest loaded frame if current target frame is not in cache yet
  function getNearestFrame(map, targetIdx, maxCount) {
    if (map.has(targetIdx)) return map.get(targetIdx);
    for (let offset = 1; offset <= maxCount; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 1 && map.has(prev)) return map.get(prev);
      const next = targetIdx + offset;
      if (next <= maxCount && map.has(next)) return map.get(next);
    }
    return null;
  }

  function resizeCanvas(canvas) {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }
  }

  function drawScrollyFrame(type, frameIdx) {
    const isHero = type === 'hero';
    const canvas = isHero ? heroCanvas : dismantleCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = isHero ? state.heroLoadedFrames : state.dismantleLoadedFrames;
    const totalFrames = isHero
      ? (state.isMobile ? cfg.frames.heroMobile : cfg.frames.hero)
      : (state.isMobile ? cfg.frames.dismantleMobile : cfg.frames.dismantle);

    const frameNum = Math.max(1, Math.min(totalFrames, frameIdx + 1));
    const img = getNearestFrame(map, frameNum, totalFrames);

    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    if (img && img.width > 0 && img.height > 0) {
      const isLandscape = window.innerWidth >= window.innerHeight;
      let scale;

      if (isLandscape) {
        // Landscape: cover-fit
        scale = Math.max(cw / img.width, ch / img.height);
      } else {
        // Portrait: contain-fit, vertically centered on --asphalt
        scale = Math.min(cw / img.width, ch / img.height);
      }

      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (cw - drawW) / 2;
      const drawY = (ch - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Cache current draw bounds for pin callouts
      if (!isHero) {
        state.dismantleBounds = {
          x: drawX / (window.devicePixelRatio || 1),
          y: drawY / (window.devicePixelRatio || 1),
          w: drawW / (window.devicePixelRatio || 1),
          h: drawH / (window.devicePixelRatio || 1),
        };
      }
    }
  }

  /* ==========================================================================
     3. SCROLL CALCULATION & RAF LOOP
     progress = clamp(-wrapper.getBoundingClientRect().top / (wrapper.offsetHeight - innerHeight), 0, 1)
     current += (target - current) * 0.15
     ========================================================================== */
  function updateScrollState() {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    // 1. Navigation Hide/Show
    const header = document.getElementById('site-header');
    if (header) {
      if (scrollY > 60 && scrollY > state.lastScrollY) {
        header.classList.add('nav--hidden');
      } else {
        header.classList.remove('nav--hidden');
      }
    }
    state.lastScrollY = scrollY;

    // 2. Hero Section Progress
    if (heroWrapper) {
      const rect = heroWrapper.getBoundingClientRect();
      const scrollDist = heroWrapper.offsetHeight - vh;
      const progress = scrollDist > 0 ? Math.max(0, Math.min(1, -rect.top / scrollDist)) : 0;
      const totalHero = state.isMobile ? cfg.frames.heroMobile : cfg.frames.hero;
      state.heroTargetFrame = Math.round(progress * (totalHero - 1));

      // Update Hero Progress Bar
      if (heroProgressBar) {
        heroProgressBar.style.width = (progress * 100).toFixed(1) + '%';
      }

      // Update Canvas Blackout (over the last 5% of scroll)
      if (heroBlackout) {
        const fadeStart = cfg.hero.fadeToBlackStart || 0.95;
        if (progress >= fadeStart) {
          const fadeAlpha = Math.min(1, (progress - fadeStart) / (1 - fadeStart));
          heroBlackout.style.opacity = fadeAlpha;
        } else {
          heroBlackout.style.opacity = '0';
        }
      }

      // Update HUD Values
      if (hudSpeedVal) {
        const speed = Math.round(progress * cfg.hero.maxSpeedKmh);
        hudSpeedVal.textContent = String(speed).padStart(3, '0') + ' KM/H';
      }
      if (hudDistanceVal) {
        const distance = (progress * cfg.hero.maxDistanceKm).toFixed(1);
        hudDistanceVal.textContent = distance + ' KM';
      }

      // Update Active Chapter Text & HUD Chapter Indicator
      let activeChapterId = 1;
      cfg.hero.chapters.forEach((ch, idx) => {
        const chNum = idx + 1;
        const el = chapterArticles[chNum];
        const inRange = progress >= ch.start && progress <= ch.end;
        if (el) {
          if (inRange) {
            el.classList.add('active');
            activeChapterId = chNum;
            if (hudChapterVal) hudChapterVal.textContent = ch.hudChapter || `0${chNum}/04`;
          } else {
            el.classList.remove('active');
          }
        }
      });
    }

    // 3. Statement Section Word-by-Word Scroll Reveal
    const statementEl = document.getElementById('statement');
    if (statementEl) {
      const rect = statementEl.getBoundingClientRect();
      const inViewProgress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height * 0.4)));
      const words = statementEl.querySelectorAll('.statement-word');
      if (words.length > 0) {
        const activeCount = Math.floor(inViewProgress * words.length * 1.2);
        words.forEach((w, i) => {
          w.style.opacity = i <= activeCount ? '1' : '0.15';
        });
      }
    }

    // 4. Dismantle Section Progress
    if (dismantleWrapper) {
      const rect = dismantleWrapper.getBoundingClientRect();
      const scrollDist = dismantleWrapper.offsetHeight - vh;
      const progress = scrollDist > 0 ? Math.max(0, Math.min(1, -rect.top / scrollDist)) : 0;
      const totalDismantle = state.isMobile ? cfg.frames.dismantleMobile : cfg.frames.dismantle;
      state.dismantleTargetFrame = Math.round(progress * (totalDismantle - 1));

      // Update Dismantle Progress Bar
      if (dismantleProgressBar) {
        dismantleProgressBar.style.width = (progress * 100).toFixed(1) + '%';
      }

      // Update Dismantle Callouts (appear after 70% progress)
      updateDismantleCallouts(progress);
    }
  }

  // Smooth lerp loop for canvas frame advancement
  function rafLoop() {
    if (!prefersReducedMotion) {
      // Hero frame lerp
      const heroDiff = state.heroTargetFrame - state.heroCurrentFrame;
      if (Math.abs(heroDiff) > 0.01) {
        state.heroCurrentFrame += heroDiff * 0.15;
        const roundedHero = Math.round(state.heroCurrentFrame);
        if (roundedHero !== state.lastDrawnHero) {
          state.lastDrawnHero = roundedHero;
          drawScrollyFrame('hero', roundedHero);
        }
      }

      // Dismantle frame lerp
      const disDiff = state.dismantleTargetFrame - state.dismantleCurrentFrame;
      if (Math.abs(disDiff) > 0.01) {
        state.dismantleCurrentFrame += disDiff * 0.15;
        const roundedDis = Math.round(state.dismantleCurrentFrame);
        if (roundedDis !== state.lastDrawnDismantle) {
          state.lastDrawnDismantle = roundedDis;
          drawScrollyFrame('dismantle', roundedDis);
        }
      }
    }

    requestAnimationFrame(rafLoop);
  }

  /* ==========================================================================
     4. STATEMENT WORD SPLITTING
     Wraps each word in a <span> for scroll-scrubbed opacity
     ========================================================================== */
  function initStatementWords() {
    const quoteEl = document.getElementById('statement-quote');
    if (!quoteEl) return;
    const text = quoteEl.textContent.trim();
    const words = text.split(/\s+/);
    quoteEl.innerHTML = words
      .map((w) => `<span class="statement-word">${w}</span>`)
      .join(' ');
  }

  /* ==========================================================================
     5. DISMANTLE CALLOUTS
     Hairlines & labels linked to car parts at percentage coordinates
     ========================================================================== */
  function initDismantleCallouts() {
    const container = document.getElementById('dismantle-callouts');
    if (!container) return;

    container.innerHTML = '';
    cfg.dismantle.callouts.forEach((c) => {
      const calloutEl = document.createElement('div');
      calloutEl.className = 'dismantle-callout';
      calloutEl.id = `callout-${c.id}`;

      // Anchor pin dot
      const dot = document.createElement('div');
      dot.className = 'callout-dot';
      calloutEl.appendChild(dot);

      // SVG Line
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'callout-svg');
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'callout-line');
      svg.appendChild(line);
      calloutEl.appendChild(svg);

      // Card
      const card = document.createElement('div');
      card.className = `callout-card align-${c.direction || 'left'}`;
      card.innerHTML = `
        <span class="callout-label font-hud">${c.label}</span>
        <span class="callout-desc font-body">${c.desc}</span>
      `;
      calloutEl.appendChild(card);

      container.appendChild(calloutEl);
    });

    positionCallouts();
  }

  function positionCallouts() {
    if (state.isMobile) return;
    const bounds = state.dismantleBounds || {
      x: 0,
      y: 0,
      w: window.innerWidth,
      h: window.innerHeight,
    };

    cfg.dismantle.callouts.forEach((c) => {
      const el = document.getElementById(`callout-${c.id}`);
      if (!el) return;

      const px = bounds.x + (c.x / 100) * bounds.w;
      const py = bounds.y + (c.y / 100) * bounds.h;

      el.style.left = `${px}px`;
      el.style.top = `${py}px`;

      // Update SVG line connecting dot to card
      const line = el.querySelector('.callout-line');
      const card = el.querySelector('.callout-card');
      const offX = c.offsetX || (c.direction === 'right' ? 120 : -120);
      const offY = c.offsetY || -30;

      if (line && card) {
        line.setAttribute('x1', '0');
        line.setAttribute('y1', '0');
        line.setAttribute('x2', `${offX}`);
        line.setAttribute('y2', `${offY}`);

        card.style.transform = `translate(${offX}px, ${offY}px)`;
      }
    });
  }

  function updateDismantleCallouts(progress) {
    cfg.dismantle.callouts.forEach((c) => {
      const el = document.getElementById(`callout-${c.id}`);
      if (!el) return;
      if (progress >= c.start && progress <= c.end) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  /* ==========================================================================
     6. SECTION 4 — LINEUP ACCORDION
     5 vertical slides side by side on flat --asphalt. One slide open always.
     Debounced hover (80ms), Keyboard (Arrow keys) & Tap (Mobile) support.
     ========================================================================== */
  function initLineupAccordion() {
    const container = document.getElementById('accordion-container');
    if (!container) return;

    container.innerHTML = '';
    cfg.lineup.models.forEach((m, idx) => {
      const isOpen = idx === state.activeLineupIndex;
      const slide = document.createElement('div');
      slide.className = `accordion-slide ${isOpen ? 'open' : ''}`;
      slide.setAttribute('role', 'button');
      slide.setAttribute('tabindex', '0');
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      slide.setAttribute('data-index', idx);
      slide.setAttribute('data-cursor', isOpen ? 'CONFIGURE' : 'OPEN');

      slide.innerHTML = `
        <div class="slide-floor-line"></div>
        <div class="slide-image-wrap">
          <img class="slide-car-image" src="${m.image}" alt="${m.name} Side Profile" loading="lazy" onerror="this.src='${cfg.paths.placeholderCar}'">
        </div>
        
        <!-- Closed View Header -->
        <div class="slide-closed-content">
          <span class="slide-number font-hud">${m.num}</span>
          <span class="slide-rotated-name font-hud">${m.name}</span>
        </div>

        <!-- Open View Content -->
        <div class="slide-open-content">
          <div class="open-slide-top">
            <div>
              <h3 class="open-model-name font-display">${m.name}</h3>
              <p class="open-model-tagline font-body">${m.tagline}</p>
            </div>
            <span class="font-hud" style="color: var(--fog);">${m.num} / 05</span>
          </div>

          <div class="open-slide-bottom">
            <div class="specs-grid font-hud">
              ${m.specs
                .map(
                  (s) => `
                <div class="spec-cell">
                  <span class="spec-title">${s.label}</span>
                  <span class="spec-val">${s.value}</span>
                </div>
              `
                )
                .join('')}
            </div>

            <div class="open-slide-footer">
              <div class="swatches-row" aria-label="Color Palette">
                ${m.swatches
                  .map(
                    (color, cIdx) => `
                  <button type="button" class="swatch-box ${cIdx === 0 ? 'active' : ''}" style="background-color: ${color};" aria-label="Color option ${cIdx + 1}" data-color="${color}"></button>
                `
                  )
                  .join('')}
              </div>
              <a href="#reserve" class="configure-link" data-cursor="RESERVE">Configure →</a>
            </div>
          </div>
        </div>
      `;

      // Hover interaction (Desktop) with 80ms debounce
      slide.addEventListener('mouseenter', () => {
        if (state.isMobile) return;
        clearTimeout(state.lineupHoverTimeout);
        state.lineupHoverTimeout = setTimeout(() => {
          setActiveSlide(idx);
        }, 80);
      });

      // Tap / Click interaction
      slide.addEventListener('click', (e) => {
        if (e.target.closest('.swatch-box')) {
          handleSwatchClick(e.target.closest('.swatch-box'));
          return;
        }
        setActiveSlide(idx);
      });

      // Keyboard navigation
      slide.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveSlide(idx);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = (idx + 1) % cfg.lineup.models.length;
          setActiveSlide(next);
          focusSlide(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = (idx - 1 + cfg.lineup.models.length) % cfg.lineup.models.length;
          setActiveSlide(prev);
          focusSlide(prev);
        }
      });

      container.appendChild(slide);
    });

    // Observer for staggered entrance animation
    initLineupEntranceObserver();
  }

  function setActiveSlide(index) {
    if (state.activeLineupIndex === index) return;
    state.activeLineupIndex = index;
    const slides = document.querySelectorAll('.accordion-slide');
    slides.forEach((slide, i) => {
      const isOpen = i === index;
      slide.classList.toggle('open', isOpen);
      slide.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      slide.setAttribute('data-cursor', isOpen ? 'CONFIGURE' : 'OPEN');
    });

    // Update cursor label if mouse is over it
    updateCursorLabel();
  }

  function focusSlide(index) {
    const slides = document.querySelectorAll('.accordion-slide');
    if (slides[index]) slides[index].focus();
  }

  function handleSwatchClick(swatchBtn) {
    const parentRow = swatchBtn.closest('.swatches-row');
    if (!parentRow) return;
    parentRow.querySelectorAll('.swatch-box').forEach((b) => b.classList.remove('active'));
    swatchBtn.classList.add('active');
  }

  function initLineupEntranceObserver() {
    const lineupSection = document.getElementById('lineup');
    const slides = document.querySelectorAll('.accordion-slide');
    if (!lineupSection || slides.length === 0) return;

    slides.forEach((s) => s.classList.add('revealing'));

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            slides.forEach((slide, i) => {
              setTimeout(() => {
                slide.classList.remove('revealing');
                slide.classList.add('revealed');
              }, i * 80);
            });
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    obs.observe(lineupSection);
  }

  /* ==========================================================================
     7. CUSTOM CURSOR ("The Headlight", Desktop Only)
     6px dot inside 28px ring, lerp 0.18.
     Morphs into 44x2px light bar with mono label on interactive elements.
     ========================================================================== */
  const cursorEl = document.getElementById('custom-cursor');
  const cursorLabelEl = document.getElementById('cursor-label');

  let mouseX = -100;
  let mouseY = -100;
  let cursorX = -100;
  let cursorY = -100;
  let currentTargetEl = null;

  function initCustomCursor() {
    if (!isFinePointer || prefersReducedMotion || !cursorEl) return;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!cursorEl.classList.contains('active')) {
        cursorEl.classList.add('active');
        cursorX = mouseX;
        cursorY = mouseY;
      }
    });

    window.addEventListener('mousedown', () => {
      cursorEl.classList.add('pressed');
      setTimeout(() => {
        cursorEl.classList.remove('pressed');
      }, 120);
    });

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-cursor], a, button, [role="button"]');
      currentTargetEl = target;
      updateCursorLabel();
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-cursor], a, button, [role="button"]');
      if (target === currentTargetEl) {
        currentTargetEl = null;
        cursorEl.classList.remove('morphed');
        if (cursorLabelEl) cursorLabelEl.textContent = '';
      }
    });

    function cursorLoop() {
      // Lerp mouse follow with 0.18 factor
      cursorX += (mouseX - cursorX) * 0.18;
      cursorY += (mouseY - cursorY) * 0.18;

      cursorEl.style.transform = `translate(${cursorX.toFixed(2)}px, ${cursorY.toFixed(2)}px)`;
      requestAnimationFrame(cursorLoop);
    }

    cursorLoop();
  }

  function updateCursorLabel() {
    if (!cursorEl || !isFinePointer) return;
    if (currentTargetEl) {
      cursorEl.classList.add('morphed');
      const label =
        currentTargetEl.getAttribute('data-cursor') ||
        (currentTargetEl.tagName === 'A' ? 'VIEW' : 'MENU');
      if (cursorLabelEl) cursorLabelEl.textContent = label;
    } else {
      cursorEl.classList.remove('morphed');
      if (cursorLabelEl) cursorLabelEl.textContent = '';
    }
  }

  /* ==========================================================================
     8. GLOBAL FILM-GRAIN OVERLAY
     Small 256x256 monochrome noise tile shifted ~8 times per second (every 125ms)
     ========================================================================== */
  function initFilmGrain() {
    const grainCanvas = document.getElementById('grain-canvas');
    if (!grainCanvas) return;

    // Create offscreen noise pattern tile (256x256)
    const tileSize = 256;
    const tile = document.createElement('canvas');
    tile.width = tileSize;
    tile.height = tileSize;
    const tileCtx = tile.getContext('2d');
    if (!tileCtx) return;

    const imgData = tileCtx.createImageData(tileSize, tileSize);
    const buf = new Uint32Array(imgData.data.buffer);
    for (let i = 0; i < buf.length; i++) {
      // Monochromatic random noise with full alpha
      const v = (Math.random() * 255) | 0;
      buf[i] = (255 << 24) | (v << 16) | (v << 8) | v;
    }
    tileCtx.putImageData(imgData, 0, 0);

    const ctx = grainCanvas.getContext('2d');
    if (!ctx) return;

    function resizeGrain() {
      grainCanvas.width = window.innerWidth;
      grainCanvas.height = window.innerHeight;
    }
    resizeGrain();
    window.addEventListener('resize', resizeGrain);

    // Shift noise pattern randomly 8 times per second (every 125ms)
    setInterval(() => {
      ctx.clearRect(0, 0, grainCanvas.width, grainCanvas.height);
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        const shiftX = Math.floor(Math.random() * tileSize);
        const shiftY = Math.floor(Math.random() * tileSize);
        ctx.save();
        ctx.translate(shiftX, shiftY);
        ctx.fillRect(-shiftX, -shiftY, grainCanvas.width + tileSize, grainCanvas.height + tileSize);
        ctx.restore();
      }
    }, 125);
  }

  /* ==========================================================================
     9. SECTION HEIGHT INJECTION & RESIZE HANDLING
     Set wrapper heights from config.js (e.g. 600vh, 350vh)
     ========================================================================== */
  function applyConfigHeights() {
    if (heroWrapper) {
      heroWrapper.style.height = `${cfg.sections.heroHeightVh}vh`;
    }
    if (dismantleWrapper) {
      dismantleWrapper.style.height = `${cfg.sections.dismantleHeightVh}vh`;
    }
  }

  function handleResize() {
    state.isMobile = window.innerWidth < 768;
    resizeCanvas(heroCanvas);
    resizeCanvas(dismantleCanvas);
    drawScrollyFrame('hero', Math.round(state.heroCurrentFrame));
    drawScrollyFrame('dismantle', Math.round(state.dismantleCurrentFrame));
    positionCallouts();
    updateScrollState();
  }

  /* ==========================================================================
     10. INITIALIZATION
     ========================================================================== */
  function init() {
    applyConfigHeights();
    resizeCanvas(heroCanvas);
    resizeCanvas(dismantleCanvas);
    initFilmGrain();
    initCustomCursor();
    initStatementWords();
    initDismantleCallouts();
    initLineupAccordion();

    // Event Listeners
    window.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', handleResize);

    // Start RAF scrollytelling loop
    requestAnimationFrame(rafLoop);

    // Start asset preloading and background streaming
    initAssetLoading();

    // Initial pass
    updateScrollState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

