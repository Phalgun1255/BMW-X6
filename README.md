# NOCTIS — Electric Scrollytelling Experience

A minimal, single-page scrollytelling website for **NOCTIS** (BMW X6 electric concept). 
Mood: A city in total blackout at night where the car's light is the only light in the world.

## Tech Stack
- Pure HTML5, CSS3, and vanilla JavaScript (`index.html`, `styles.css`, `main.js`, `config.js`).
- Zero frameworks, zero external runtime libraries, zero npm dependencies.
- Google Fonts: Archivo (expanded width variable), Inter, JetBrains Mono.
- High-performance `<canvas>` scroll-scrubbed image sequences (cover-fit landscape, contain-fit portrait).

## Features
- **Hero Scrollytelling (600vh)**: 118-frame seamless sequence with speed/displacement HUD, line reveals, and fade-to-black transition.
- **Statement (100vh)**: Word-by-word scroll-scrubbed opacity reveal.
- **Dismantle Scrollytelling (350vh)**: 198-frame exploded vehicle architecture with interactive 1px hairline callouts anchored to vehicle parts.
- **Lineup (100vh)**: 5-model horizontal accordion with debounced hover, color swatches, technical specs, keyboard navigation, and responsive vertical stack on mobile.
- **Reserve (100vh)**: Pure minimalist reservation CTA with custom interactive headlight cursor.
- **Global Effects**: 8Hz random film-grain overlay, dynamic headlight cursor, and full reduced-motion accessibility support.

## Getting Started
To run locally:
```bash
python serve.py
# or
python -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.
