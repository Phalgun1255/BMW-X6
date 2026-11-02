/**
 * NOCTIS Brand & Scrollytelling Configuration
 * All section heights, chapter ranges, frame counts, frame paths and callout positions
 * are centralized here for easy tuning.
 */

window.NOCTIS_CONFIG = {
  // Frame Counts
  frames: {
    hero: 118,
    heroMobile: 118,
    dismantle: 198,
    dismantleMobile: 198,
    preloadHeroInitial: 40, // Preloader waits for first 40 hero frames before revealing page
  },

  // Asset Path Resolvers
  paths: {
    heroDesktop: (idx) => `assets/frames/hero/frame_${String(idx).padStart(4, '0')}.webp`,
    heroMobile: (idx) => `assets/frames/hero-mobile/frame_${String(idx).padStart(4, '0')}.webp`,
    dismantleDesktop: (idx) => `assets/frames/dismantle/frame_${String(idx).padStart(4, '0')}.webp`,
    dismantleMobile: (idx) => `assets/frames/dismantle-mobile/frame_${String(idx).padStart(4, '0')}.webp`,
    placeholderCar: 'assets/frames/dismantle/frame_0001.webp',
  },

  // Section Heights (in vh or pixels)
  sections: {
    heroHeightVh: 600,       // 600vh scrollytelling travel
    statementHeightVh: 100,  // 100vh statement viewport
    dismantleHeightVh: 350,  // 350vh scrollytelling travel
    lineupHeightVh: 100,     // 100vh interactive accordion
    reserveHeightVh: 100,    // 100vh cta screen
  },

  // Hero Section Chapters & HUD Settings
  hero: {
    // HUD counters max values
    maxSpeedKmh: 118,
    maxDistanceKm: 4.2,
    // Chapter ranges [startProgress, endProgress]
    chapters: [
      {
        id: 'chapter-1',
        start: 0.00,
        end: 0.12,
        hudChapter: '01/04',
        title: 'NOCTIS',
        subtitle: 'The city is asleep.',
        hint: 'SCROLL TO WAKE IT',
      },
      {
        id: 'chapter-2',
        start: 0.22,
        end: 0.40,
        hudChapter: '02/04',
        text: "It doesn't need the city's light.",
      },
      {
        id: 'chapter-3',
        start: 0.50,
        end: 0.68,
        hudChapter: '03/04',
        text: 'It brings its own.',
      },
      {
        id: 'chapter-4',
        start: 0.80,
        end: 1.00,
        hudChapter: '04/04',
        model: 'GT-E',
        specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
        linkText: 'Discover the GT-E',
        linkHref: '#lineup',
      },
    ],
    // Progress at which the hero canvas fades out to solid black (--asphalt)
    fadeToBlackStart: 0.95,
  },

  // Dismantle Callouts (appear after 70% progress)
  dismantle: {
    title: 'Look closer.',
    triggerProgress: 0.70,
    callouts: [
      {
        id: 'body',
        start: 0.72,
        end: 1.00,
        label: 'BODY',
        desc: 'Carbon composite monocoque',
        // Pin location in percentage coordinates (0% - 100%) on the car image canvas
        x: 42,
        y: 32,
        // Line & label placement offset
        direction: 'left',
        offsetX: -140,
        offsetY: -30,
      },
      {
        id: 'battery',
        start: 0.78,
        end: 1.00,
        label: 'BATTERY',
        desc: '110 kWh structural pack',
        x: 62,
        y: 70,
        direction: 'right',
        offsetX: 140,
        offsetY: 20,
      },
      {
        id: 'drive',
        start: 0.84,
        end: 1.00,
        label: 'DRIVE',
        desc: 'Dual axial-flux motors, 680 kW',
        x: 74,
        y: 54,
        direction: 'right',
        offsetX: 140,
        offsetY: -20,
      },
      {
        id: 'light',
        start: 0.90,
        end: 1.00,
        label: 'LIGHT',
        desc: 'Single-line LED signature',
        x: 24,
        y: 52,
        direction: 'left',
        offsetX: -140,
        offsetY: 20,
      },
    ],
  },

  // Lineup Models
  lineup: {
    badge: '03 — THE LINEUP',
    heading: 'Five ways to drive the night.',
    models: [
      {
        id: 'gt-e',
        num: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: [
          { label: 'RANGE', value: '640 km' },
          { label: '0–100 KM/H', value: '3.1 s' },
          { label: 'POWER', value: '680 kW' },
        ],
        image: 'assets/cars/gt-e.webp',
        swatches: ['#1A1C20', '#EDEAE4', '#0F1726', '#3E0D0D'],
        defaultOpen: true,
      },
      {
        id: 's',
        num: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: [
          { label: 'RANGE', value: '600 km' },
          { label: '0–100 KM/H', value: '3.6 s' },
          { label: 'POWER', value: '520 kW' },
        ],
        image: 'assets/cars/s.webp',
        swatches: ['#EDEAE4', '#1A1C20', '#182435', '#484E59'],
        defaultOpen: false,
      },
      {
        id: 'x',
        num: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: [
          { label: 'RANGE', value: '560 km' },
          { label: '0–100 KM/H', value: '4.2 s' },
          { label: 'POWER', value: '480 kW' },
        ],
        image: 'assets/cars/x.webp',
        swatches: ['#0F1726', '#1A1C20', '#EDEAE4', '#203A3C'],
        defaultOpen: false,
      },
      {
        id: 'r',
        num: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: [
          { label: 'RANGE', value: '420 km' },
          { label: '0–100 KM/H', value: '2.4 s' },
          { label: 'POWER', value: '900 kW' },
        ],
        image: 'assets/cars/r.webp',
        swatches: ['#0B0C0E', '#E1251B', '#2C2E35', '#EDEAE4'],
        defaultOpen: false,
      },
      {
        id: 'one',
        num: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: [
          { label: 'RANGE', value: 'Concept' },
          { label: '0–100 KM/H', value: 'Hyper' },
          { label: 'POWER', value: 'Solid State' },
        ],
        image: 'assets/cars/one.webp',
        swatches: ['#C4C8D0', '#07080A', '#CFE3FF', '#454C57'],
        defaultOpen: false,
      },
    ],
  },
};

