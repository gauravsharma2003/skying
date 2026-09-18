# Skying design system

Skying is an outdoor decision tool built around one question: is this evening worth going out for? The interface uses a calm, camera-viewfinder visual language so the verdict, sunset time, and best viewing window remain more prominent than the supporting weather data.

## Visual direction

- **Ground:** cool silver, blue-black text, pale cool panels, fine blue-gray rules, and one burnt-amber action color.
- **Shape:** flat surfaces, 1px dividers, 8px outer radii, 5px inner button radii, and no shadows.
- **Imagery:** one wide ocean-sunset panorama framed by restrained white viewfinder corners. It is always captioned as illustrative, never live or predictive.
- **Hierarchy:** place and date → plain-language forecast → score → panorama → golden-hour ruler → seven-day choice → explanation → optional photography detail.

## Foundations

### Color

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#e9edf0` | `#17232b` |
| Text | `#172832` | `#e9eff2` |
| Surface | `#f5f7f8` | `#202f39` |
| Primary | `#b95125` | `#e5a078` |
| On primary | `#fffaf6` | `#1c252c` |
| Selected | `#ecd2c0` | `#5a4034` |
| On selected | `#382c23` | `#ffe2cb` |
| Muted | `#536570` | `#b0c0ca` |
| Rule | `#bdcbd2` | `#425561` |
| Hover | `#dde5ea` | `#2c3f4a` |
| Focus | `#94401d` | `#efb68f` |

Use primary for the Find action, emphasis, the sunset marker, and status text. Use the selected pair for the active day and golden-hour interval. Do not add decorative gradients; the only gradients draw rules, ticks, or viewfinder corners.

### Typography

Interface text uses local Manrope with Arial as fallback. The Skying wordmark alone uses italic Georgia. Body copy is `16px/1.5`; muted supporting text ranges from 11–14px. Headings use medium weight, tight tracking, and balanced wrapping. Scores, times, and measurements use tabular numerals.

Key fluid sizes are the landing question `clamp(38px, 4.2vw, 62px)`, forecast statement `clamp(28px, 3.2vw, 48px)`, and content-page title `clamp(32px, 4.5vw, 60px)`. The desktop forecast score is 100px and reduces to 82px on tablet, 64px on mobile, and 50px below 360px.

### Layout and spacing

The page is centered at a maximum width of 1412px. The responsive gutter is 16px by default, 24px from 640px, 32px from 768px, 40px from 1024px, 4vw from 1280px, and 62px from 1536px. Common gaps are 4, 8, 12, 16, 18, 20, 24, 28, 30, 32, and 40px; section spacing extends to 52 and 64px.

The desktop header is at least 88px high and the mobile header 72px. Controls are at least 44px high; the theme control is 48px square. The desktop forecast uses a 2.25:1 lower grid, with the outlook left and explanation right. The panorama spans the full grid.

## Responsive composition

- **Under 360px:** single-column fallback; score and verdict sit together; photography light windows stack; the centered precise-location icon is removed.
- **360–639px:** 16px gutters; timing moves before the 200px-tall forecast panorama; seven days become a horizontally scrolling, snapping strip; metrics use two columns.
- **640–767px:** 24px gutters with the same mobile stack. The visual mobile header starts at 767px; the full-screen search interaction is guarded in JavaScript at 700px and below.
- **768–1023px:** 32px gutters; all seven days share a row; the explanation spans the page with its two summary metrics aligned beside the prose.
- **1024–1279px:** 40px gutters; the two-column forecast composition returns with compressed gaps and type.
- **1280–1535px:** 4vw gutters and the full desktop hierarchy.
- **1536px and wider:** 62px gutters; the 1412px cap prevents controls and text from stretching.
- **Short screens:** below 600px high on sub-1024px widths, imagery and top spacing compress before text does.

## Components and states

**Header.** The serif wordmark and small descriptor anchor the left. Forecast pages show location search on larger screens and a compact “change place” trigger on mobile. The theme control stays at the far right.

**Search.** The shell has a search icon, location input, optional precise-location control, and explicit Find button. Suggestions open below the field, support arrow-key highlight, Enter selection, Escape dismissal, and outside-click dismissal. Loading changes Find to “Reading,” disables location controls, and announces status in live regions. On supported mobile widths, header search becomes a full-screen sheet.

**Landing.** The question and emphasized “worth it?” share the first row with the search prompt. The panorama follows, then crawlable methodology and location content. The approximate IP place may prefill the input without requesting permission; precise location is requested only after the user chooses it.

**Forecast.** The statement and score form the decision band. The panorama and time ruler connect the visual moment to a local time. Selecting a day updates all forecast fields, marks the button with `aria-pressed`, and returns keyboard focus to that day. The active day uses both fill and typography, not color alone.

**Photography details.** A native `details` disclosure contains golden hour, blue hour, high cloud, low cloud, visibility, and rain chance. The plus icon rotates when open.

**Theme.** Initial markup and fallback are light. On load, JavaScript restores `localStorage['skying-theme']` when it is `dark`; any other or unavailable value resolves to light. The toggle persists the next choice, updates its accessible label/title, swaps sun and moon artwork, and changes the browser theme color to `#e9edf0` or `#17232b`.

## Accessibility and motion

The page includes a skip link, semantic headings and sections, native buttons/forms/details, hidden text labels, polite live status regions, visible 3px focus outlines with 4px offset, 44px minimum interactive targets, and descriptive image alt text. Core token pairings meet WCAG AA for normal text; measured ratios include 12.87:1 for light text, 5.15:1 for light muted text, 4.75:1 for the light primary button, 13.79:1 for dark text, and 8.57:1 for dark muted text. Selected states pair color with shape/weight, and horizontal lists retain keyboard scrolling. Reduced-motion preference disables transitions and smooth scrolling.

## Asset provenance

- `assets/evening-sky.webp` is a 2172×724 derivative of a project-generated panorama. Its generation prompt and timestamp (`2026-09-17T16:30:50.403Z`) are recorded in `assets/evening-sky.webp.json`.
- `assets/manrope-regular.ttf` and `assets/manrope-semibold.ttf` come from the Manrope Project Authors and ship under SIL Open Font License 1.1 in `assets/Manrope-OFL.txt`.
- `assets/icons.svg` contains search, locate, close, and plus symbols sourced from Tabler Icons; the MIT license and Paweł Kuna copyright are in `assets/Tabler-LICENSE.txt`.
- The inline sun/moon theme icons and CSS viewfinder marks are project-authored markup/styles. Georgia and Arial are system fallbacks.
