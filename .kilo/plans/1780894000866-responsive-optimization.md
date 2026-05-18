# Responsive Optimization Plan

## Problem Analysis

### Current State
| Component | Current Constraint |
|---|---|
| `.mobile-shell` width | `min(100%, 480px)` — caps **every** device at 480 px |
| `--mobile-shell--wide` | `min(100%, 560px)` — still capped |
| `--mobile-shell--roster` | `min(100%, 620px)` — still capped |
| Only breakpoint | `@media (max-width: 540px)` — single-column on **all** phones |
| No tablet breakpoint | iPad 768 px falls through to 480 px shell cap |

### Result
- **iPhone 16 (393 × 852 CSS px)** → hits `max-width: 540px` breakpoint → **single-column** (user: "breaks into one row")
- **iPad 4th Gen (768 × 1024 CSS px)** → skips breakpoint → 2-column grid inside **480 px** shell → wasted space

### Target Layout
| Device | Viewport | Shell Width | Layout | Columns |
|---|---|---|---|---|
| iPhone 16 (≤ 429 px) | 393 × 852 | 100% (no cap) | Compact | 2-col grid |
| Large iPhone / small Android (430–767 px) | 430–767 | `min(100%, 480px)` | Standard | 1-col |
| iPad 4th Gen (≥ 768 px) | 768/1024 | `min(100%, 768px)` | Tablet | 2-col + larger |
| Desktop (≥ 1024 px) | ≥ 1024 | full | Desktop | 3-col |

---

## Breakpoint Strategy

```
Compact    : max-width:   429 px   ← iPhone 16 + similar (NEW)
Standard   : 430 px –  767 px   ← large phones / small landscape
Tablet     : 768 px – 1023 px   ← iPad 4th Gen portrait (NEW)
Desktop    : min-width: 1024 px  ← iPad landscape + desktop (NEW, rename 540 px rules)
```

Coordinate system:
- Replace every **hardcoded** size value (px, rem, em) inside the target components with a CSS custom property on that component's rule → alternate value defined in the matching breakpoint block → no cascade fallthrough in the `:root` defaults.

---

## Phase 1 — CSS Custom Properties: Replace Hardcoded Sizing Values

Goal: introduce `--size-*` tokens that provide default values and alternative values at each breakpoint. Only 1 new `/* Responsive: */` section block is added, none exists for compact.

### 1.1 `/* Base */` — add default sizing tokens to `:root`
```css
:root {
  /* existing colour + shadow tokens unchanged */

  /* sizing tokens — base (mobile) */
  --shell-padding-inline: 18px;
  --shell-padding-block: 24px;
  --shell-padding-bottom: 34px;
  --shell-gap: 18px;
  --grid-gap: 14px;
  --panel-padding: 18px;
  --border-radius-sm: 14px;
  --border-radius-md: 18px;
  --border-radius-lg: 22px;
  --border-radius-xl: 26px;
  --border-radius-round: 999px;
  --font-h1: clamp(2rem, 7vw, 3.2rem);
  --font-h1-small: clamp(1.6rem, 6.5vw, 2.8rem);
  --font-button: 2rem;
  --font-button-sm: 1.35rem;
  --font-label: 0.95rem;
  --font-table-head: 0.78rem;
  --font-stat-card: 2rem;
  --font-tile-label: 1.55rem;
  --font-stat-card-value: 2rem;
}
```

### 1.2 Replace every hardcoded value with a `var(--*)` token
Use grep to find all hardcoded values and replace systematically:

| Rule to update | Hardcoded value | Token to use |
|---|---|---|
| `.mobile-shell` | `padding: 24px 18px 34px` | `padding: var(--shell-padding-block) var(--shell-padding-inline) var(--shell-padding-bottom)` |
| `.mobile-shell` | `gap: 18px` | `gap: var(--shell-gap)` |
| `.mobile-shell--wide` | `padding-top: 20px`, `width: min(100%, 560px)` | keep width; replace pad with `--shell-padding-block` |
| `.mobile-shell--roster` | `padding-top: 20px`, `width: min(100%, 620px)` | keep width; replace pad with `--shell-padding-block` |
| `.hero-badge` | `padding: 28px 18px 22px`, `border-radius: 36px`, `width: min(74vw, 280px)` | inline pad → `--shell-padding-inline`; large-radius → `--border-radius-sm` |
| `.action-button` | `min-height: 84px`, `border-radius: 26px`, `font-size: 2rem` | tokens |
| `.action-button` | `border: 3px solid` `box-shadow:` `text-shadow:` | leave unchanged — not sizing |
| `.glossy-panel` | `border-radius: 28px` | keep as default … but allow override at breakpoints (token: `--border-radius-lg`) |
| `.stats-grid` | `gap: 14px` | `--grid-gap` |
| `.club-header` | `padding: 18px` | `var(--panel-padding)` |
| `.stat-card` | `padding: 18px` | `var(--panel-padding)` |
| `.formation-button` | `min-height: 46px`, `border-radius: … 999px`, `font-size:` | tokens |
| `.training-card` / `.hub-grid` | `gap: 14px` | `--grid-gap` |
| `.training-card` / `.hub-grid` | `padding: 18px` | `--panel-padding` |
| `.club-header h1` | `font-size: clamp(2rem, 7vw, 2.8rem)` | `var(--font-h1)` |
| `.stat-card strong` | `font-size: 2rem` | `var(--font-stat-card-value)` |
| `.hero-badge` | `border-radius: 36px` | `--border-radius-sm` |
| `.action-button` | `border-radius: 26px`, `font-size: 2rem`, `min-height: 84px` | `--border-radius-xl`, `--font-button` |
| `.formation-button` / `.roster-row__button` | `border-radius: … 999px` | `--border-radius-round` |
| `.glossy-panel` | `border-radius: 28px` | `--border-radius-lg` |
| `.training-card` / `.hub-grid` / `.club-header` | `border-radius: 28px` | `--border-radius-lg` |
| `.recent-match` | `border-radius: 50%` | keep (shape) |
| `button` | `font: inherit` | no change (already inherits) |

---

## Phase 2 — Three Breakpoints

### 2.1 Compact: `@media (max-width: 429px)` — **NEW**
```css
/* Responsive – Compact (iPhone SE / iPhone 8 / iPhone 16) */
@media (max-width: 429px) {
  :root {
    /* smaller typography */
    --font-h1: clamp(1.6rem, 6.5vw, 2.2rem);
    --font-button: 1.5rem;
    --font-button-sm: 1.2rem;
    --font-label: 0.82rem;
    --font-table-head: 0.72rem;
    --font-stat-card-value: 1.7rem;
  }

  /* 2-col hub / stats on compact devices */
  .mobile-shell {
    width: 100%;
    padding-block: 16px 26px;
    padding-inline: 12px;
    gap: 12px;
  }

  .stats-grid,
  .hub-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .action-button {
    min-height: 62px;
    font-size: var(--font-button);
  }
  .roster-action {
    font-size: 1rem;
  }

  .stand-card,
  .glossy-panel,
  .club-header,
  .roster-group,
  .training-card,
  .youth-offer {
    padding: var(--panel-padding);
    gap: var(--grid-gap);
    border-radius: 20px;
  }

  /* condensed hero */
  .hero-badge {
    padding: 20px 12px;
  }

  /* buttons rounded more compactly */
  .tactic-button {
    border-radius: 16px;
  }

  /* recruits / action buttons take the width */
  .roster-actions {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  /* keep 2-col on roster */
  .recent-matches__list {
    gap: 9px;
  }
}
```

### 2.2 Standard (phone, existing): `@media (min-width: 430px) and (max-width: 767px)`
Replace current `max-width: 540px` block with two breakpoints using `min-width` + class blocks for re-declaring the rules that have already been modified and are not needed in the Standard range:

```css
/* Standard - phones 430–767 px */
@media (min-width: 430px) and (max-width: 767px) {
  :root {
    /* already at mobile base — no token changes needed */
  }
  .mobile-shell {
    width: min(100%, 480px);
  }
  .mobile-shell--roster {
    width: min(100%, 520px);
  }
  /* no column changes — still 1-col */
}
```

### 2.3 Tablet: `@media (min-width: 768px) and (max-width: 1023px)` — **NEW**
```css
/* Tablet - iPad portrait / iPad landscape */
@media (min-width: 768px) and (max-width: 1023px) {
  :root {
    /* slightly larger type, slightly more space */
    --shell-padding-inline: 20px;
    --shell-padding-block: 26px;
    --shell-gap: 20px;
    --grid-gap: 16px;
    --panel-padding: 22px;
    --font-h1: clamp(2.2rem, 5vw, 3rem);
    --font-button: 1.9rem;
    --font-button-sm: 1.4rem;
    --font-label: 0.98rem;
    --font-table-head: 0.82rem;
    --font-stat-card-value: 1.8rem;
    --border-radius-lg: 26px;
    --border-radius-xl: 30px;
  }

  /* use full viewport width — no arbitrary cap */
  .mobile-shell {
    width: min(100%, 768px);
  }
  .mobile-shell--wide {
    width: min(100%, 820px);
  }
  .mobile-shell--roster {
    width: min(100%, 820px);
  }

  .hub-grid,
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--grid-gap);
  }

  /* action-button slightly larger */
 .action-button {
    min-height: 90px;
    font-size: var(--font-button);
  }
  .roster-action {
    font-size: 1.2rem;
  }
}
```

### 2.4 Desktop ≥ 1024 px: new block (replaces/extends current 540 px rule as "Desktop")
> This becomes the new default “large” layout behaviour (already implicitly True today).

```css
/* Desktop / landscape tablet */
@media (min-width: 1024px) {
  :root {
    --shell-padding-inline:24px;
    --shell-padding-block: 28px;
    --shell-gap: 20px;
    --grid-gap: 18px;
    --panel-padding: 24px;
    --font-h1: clamp(2.4rem, 2.6vw, 3.2rem);
    --font-button: 2.1rem;
    --font-button-sm: 1.5rem;
    --font-label: 1.05rem;
    --font-table-head: 0.82rem;
    --font-stat-card-value: 2.2rem;
  }

  .mobile-shell {
    width: min(90vw, 768px);   /* centers on wide screens */
  }
  .mobile-shell--wide {
    width: min(90vw, 900px);
  }
  .mobile-shell--roster {
    width: min(90vw, 900px);
  }

  /* 3-col on desktop — override 2-col from tablet */
  .hub-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .action-button {
    min-height: 92px;
    font-size: var(--font-button);
  }
}
```

---

## Phase 3 — Update `index.html` viewport meta

The current `<meta name="viewport" …>` tag is correct for the layout defined above.
Because `width=device-width` is already specified, the 393 CSS px viewport on iPhone 7 Plus (819 px × 1194 px DPR=3) will already scale down to the 819 px device pixels. The `(max-width:767px)` media-query breakpoint is sufficient—no need to add extra scaling if there is no deviceDpr condition.

```html
<!-- current, NO CHANGE needed -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

> The three defined breakpoints are absolute logical-pixel breakpoints (logical device “CSS” pixels), so no DPR-specific rules are needed or planned.

---

## Phase 4 — Remove the old single-column block

After Phase 2 is confirmed to pass all tests, remove the old block (currently `5493-5778`):

```css
/* DELETE this old block (lines 5493-5778 in current file) */
@media (max-width: 540px) {
  .mobile-shell { ... }
  .stats-grid, .hub-grid, ... { grid-template-columns: 1fr; }
  ...
}
```

---

## Smoke Tests

Only three groups require new assertions:

1. **`assertBreakpointCompaction()`** — parse build output; check structure via innerHTML.
2. **`assertTabletLayoutWidth()`** — mock `window.innerWidth = 768; dispatch resize; assert `max-width: 768px; min(100%, 768px)`
3. **`assertIphoneNarrowSmoke()`** — ensure no JS references a class that was removed.

The existing `assertLeagueInitialization`, `assertMatchdayStructure`, `assertCompleteMatchDay`, `assertFinanceLedger`, `assertMatchMinuteSmoke`, `assertFormationValidation` remain unchanged.

---

## Roll-out Order (internal checklist)

1. `index.html` — verify viewport meta (current `width=device-width` is correct → **no change needed**)
2. CSS / Base — add sizing tokens to `:root` (`--shell-padding-*`, `--grid-gap`, `--panel-padding`, `--font-*`, `--border-radius-*`); replace hardcoded values in `.mobile-shell`, `.hero-badge`, `.action-button`, `.glossy-panel`, `.club-header`, `.stats-grid`, `.hub-grid`, `.training-card`, `.club-header h1`, `.action-button` with `var(--*)` tokens
3. CSS — insert `/* Responsive – Compact */@media (max-width: 429px)` block (iPhone 16 and similar)
4. CSS — insert `/* Standard – phones 430–767 px */@media (min-width: 430px) and (max-width: 767px)` block
5. CSS — insert `/* Tablet – 768–1023 px */@media (min-width: 768px) and (max-width: 1023px)` block
6. CSS — insert `/* Desktop – ≥ 1024 px */@media (min-width: 1024px)` block
7. CSS — **delete** old `@media (max-width: 540px)` block (grid collapse to 1-col, scoreboard single-column, roster-row 3-col shrink)
8. Run smoke tests + build
