# Skying responsive UI plan

Status: audience and implementation scope confirmed; visual direction preview awaiting selection.

## What the interface must answer

1. Is this evening worth going outside for?
2. When should I be there, in the selected place's local time?
3. Would another day be better?
4. What do the weather and photography details mean?

Keep the existing location routes, forecast calculations, provider attribution, and crawlable content. Use existing real data; illustrative skies are labeled and must never imply a live camera feed or a predicted exact sky appearance.

## Proposed visual direction: The Light Finder

A camera viewfinder provides the compositional reference: one expansive sky window, a clear verdict and time, and unobtrusive measurement details. Cool silver surfaces, blue-black text, and a single amber accent separate this from the current cream, serif, and heavy-outline design. Preserve the existing Skying wordmark. Use a contemporary sans for interface text and tabular figures for times and scores.

The panorama is the memorable element. It supports the decision without pushing search, the score, or sunset timing below the first useful viewport. Weather metrics do not become a competing wall of cards.

## Content and interaction

- **Before a location is selected:** visible brand, direct sunset question, a short explanation, search and explicit device-location action, a restrained sky visual, then useful location links and methodology.
- **Forecast:** location and date, score with verbal verdict, sunset time and viewing window, illustrative panorama, seven-day selection, explanation, then photography details.
- **Day selection:** changes the selected state and all associated forecast content together. Keyboard focus stays on the chosen day. Selected day uses both shape/weight and color.
- **Location search:** one obvious input, visible submit action, keyboard-selectable suggestions, explicit loading feedback, no permission prompt until device location is requested.
- **Photography details:** expandable golden-hour/blue-hour information and weather factors. Use real available fields; unavailable windows remain clearly unavailable.
- **Errors:** keep the location input usable; name the failure and offer a retry. A stale forecast must retain its data-age notice.
- **Loading:** reserve the forecast's structure where possible; announce status without moving focus.

## Breakpoint behavior

| Width | Composition | Controls and detail |
| --- | --- | --- |
| 320–359px | Narrow-screen fallback, 16px gutters, one column; score and sunset stack if necessary | No clipped labels; search remains at least 16px; tap targets at least 44px |
| 360–639px | Mobile priority stack: place, verdict, time/window, compact panorama, weekly strip, explanation | Seven-day strip scrolls and snaps horizontally, with a visible next-item cue; location search uses the existing full-screen mobile search behavior |
| 640–767px | Wide phone / small tablet; 24px gutters; single primary reading column | Metrics pair into two columns; panorama grows without requiring extra scroll before the sunset decision |
| 768–1023px | Tablet; 32px gutters; forecast summary and timing align side by side; supporting explanation and conditions pair where content fits | Inline location search; weekly days share a row when legible, otherwise intentional horizontal scrolling |
| 1024–1279px | Compact desktop; 40px gutters; panorama and instrument strip span the content area | Seven-day strip occupies the larger lower column; explanation occupies the smaller column |
| 1280–1535px | Desktop; 48–64px gutters; spacious title/score band, panoramic sky, distinct lower columns | All seven days visible without scrolling; contextual photography details expand beneath the overview |
| 1536px+ | Wide desktop; content capped around 1408px and centered | Typography stops growing; extra space stays outside the composition rather than stretching controls |

Use fluid sizing between breakpoints. Content, not device detection, determines reflow. Preserve DOM reading order on all widths. In short landscape viewports, compress imagery and vertical space before reducing text size.

## Theme and motion

Default to the system color preference. Light mode supports outdoor reading; dark mode retains the same hierarchy for evening use. Every foreground/background pairing must meet WCAG AA. Keep focus rings conspicuous in both themes.

Motion intensity is restrained: brief opacity/transform transitions acknowledge selection and state changes. No scroll hijacking, perpetual floating elements, or motion needed to read the forecast. Respect reduced motion.

## Verification plan

Inspect landing and loaded forecasts at 360, 390, 640, 768, 1024, 1280, and 1440px, plus a narrow 320px fallback. Check light and dark, long place names, loading/error states, keyboard search, day selection, photography disclosure, and horizontal overflow. Recheck integration against concurrent backend work before finishing. Capture desktop, tablet, and phone evidence for the independent Impeccable finish review.

## Build boundaries

Implementation should use the existing HTML/CSS/JavaScript stack. Backend and SEO improvements currently appearing in the workspace are independently authored and must be preserved. Read files again immediately before edits and retain newly added sections and hooks.
