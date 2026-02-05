Original prompt: Create a quiz game with flags from countries of the world. 25 questions max, 3 wrong to game over, random flags, 4 options, 5-second timer, score based on time remaining plus per-level bonus, end-game score breakdown, touch-friendly, high score system, and record-beaten animation.

Progress:
- Created `index.html`, `styles.css`, and `game.js` with canvas-based background, UI overlays, and quiz logic.
- Implemented random flag quiz using `Intl.DisplayNames` for region names and generated emoji flags from ISO codes.
- Added scoring system, fast answer bonus, time-left bonus, perfect bonus, and detailed end-of-game breakdown.
- Added high score storage with localStorage and a confetti-style record animation.
- Exposed `window.render_game_to_text` and `window.advanceTime` hooks for testing.
- Added robust region-name fallback handling for environments without `Intl.DisplayNames`/`supportedValuesOf`.
- Moved HUD and options rendering onto the canvas so headless screenshots capture UI.
- Added an end-game summary card rendered on the canvas (score breakdown + high score) to show in test captures.
- Redesigned UI to minimalist light theme, pastel answer buttons in red/yellow/blue/green order, and timer color ramp (green/yellow/red).
- Centered start screen, reduced visual noise, enlarged flag card, and removed duplicate end-screen section.
- Blocked spacebar skipping and filtered out unsupported flag emojis.
- Fixed answer layout: options anchored to the bottom with tighter sizing and dynamic flag card height so all 4 answers remain visible.
- Reorganized UI into explicit screen containers (`start-screen`, `play-screen`, `end-screen`) and hide/show via JS + `hidden` so inactive screens don't affect layout.

Test Notes:
- Ran Playwright script against `http://localhost:5173` with `playwright-actions.json`.
- Verified gameplay HUD, flag card, and answer options appear in screenshots `shot-0.png` and `shot-1.png`.
- Confirmed game over transition in `shot-2.png` with canvas end summary and `state-2.json` (`mode: "over"`).
- Re-ran on `http://localhost:5174` to validate new minimalist layout and pastel options, plus end summary.
- Re-ran on `http://localhost:5176` to confirm all 4 answers fit in the viewport.
- Re-ran on `http://localhost:5177` to validate new screen structure and layout.

TODO:
- Verify touch targets and layout on smaller widths (iPad).
- Confirm scoring math and end-of-game breakdown visually by playing through a full game.
