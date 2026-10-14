---
name: Ovovita Farm-to-Table
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#554336'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#887364'
  outline-variant: '#dbc2b0'
  surface-tint: '#904d00'
  primary: '#8d4b00'
  on-primary: '#ffffff'
  primary-container: '#b15f00'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb77d'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#bb0112'
  on-tertiary: '#ffffff'
  tertiary-container: '#e02928'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a warm, wholesome, and impeccably reliable experience for artisanal, farm-direct egg delivery. Balancing pastoral warmth with modern mobile velocity, the interface evokes the quiet assurance of sunrise on a pasture: dew-fresh greens, warm yolk ambers, and clean stoneware ceramics.

### Brand Personality & Core Values
- **Pastoral Authenticity:** Never sterile or clinical; warmth is baked into every surface, border, and curve.
- **Micro-Precision Reliability:** Egg delivery requires extreme physical trust. The digital shell must communicate structural integrity, safe packaging, and exact delivery punctuality.
- **Tactile Comfort:** Generous tap targets, weighted physical feedback states, and organic contours reflect natural handling.

### Visual Style
A hybrid of **Warm Modern Organic** and **Tactile Minimalism**. Interfaces rely on generous soft-cream surfaces, deep legible charcoal typography, and targeted golden-amber accents. Borders mimic smooth hen-egg curves, ditching harsh geometric corners in favor of continuous curves (`squircle`-leaning radiuses) and micro-depth ambient glows.

## Colors

The palette derives strictly from unadulterated farm elements: warm yolks, organic pasture flora, earthen shells, and deep hen-house slate.

### Color Architecture
- **Primary (`#D97706` / Rich Yolk Amber):** Used for primary conversion touchpoints, active states, cart triggers, and core focal indicators. Secondary lighter tint `#F59E0B` serves as internal fill and subtle glow highlights.
- **Secondary (`#059669` / Pasture Mint):** Dedicated to freshness validation, certified organic badges, free-range certifications, antibiotic-free guarantees, and positive route updates.
- **Tertiary (`#DC2626` / Hen Comb Crimson):** Reserved strictly for scarcity alerts ("Only 4 crates left today"), delivery disruptions, and critical form validation errors.
- **Neutral Palette (`#1E293B` to `#FFFDF7`):**
  - Surface Ground: `#FFFDF7` (Warm porcelain off-white).
  - Surface Card / Tiers: `#FBF8F1` (Sun-dried parchment).
  - Surface Subdued: `#F3EEDF` (Eggshell cream border and divider tone).
  - Text Primary: `#0F172A` (Charcoal slate for absolute readability).
  - Text Secondary: `#475569` (Muted loam for meta details and secondary descriptors).

Never introduce pure un-tinted `#000000` or sterile `#FFFFFF`. All whites carry a warm golden undertone, ensuring the app feels comforting rather than clinical.

## Typography

The design system implements **Plus Jakarta Sans** across all typographic hierarchies. Its geometric underpinnings combined with warm, humanist terminals mirror the natural oval shapes of avian shells while maintaining razor-sharp legibility on mobile viewports.

### Typographic Hierarchy Rules
- **Display & Headlines:** Set in weights `700` and `800` with tight tracking (`-0.015em` to `-0.02em`) to ground product names, carton sizes, and farm origin titles.
- **Body:** Kept at weight `400` with comfortable line height multipliers (1.45–1.5x) to facilitate scanning farm practices, delivery notes, and nutrition disclosures.
- **Labels & Micro-copy:** Styled in `600` and `700` with slightly positive tracking to maintain absolute legibility at rapid glances on packaging badges, order timelines, and stepper numerals.

## Layout & Spacing

A mobile-first 4-column layout on phone screens expands into an 8-column layout on mini-tablets and split-screen folding devices.

### Form Factor Behavior
- **Mobile (Base, 320px–480px):**
  - Standard edge margin: `margin-mobile` (16px).
  - Internal column gutter: `gutter-mobile` (12px).
  - Bottom navigation clears safe areas with a persistent 84px content clearance.
- **Tablet / Large Mobile Foldables (481px+):**
  - Canvas margin scales to `margin` (20px).
  - Products reflow into 2-column or 3-column structured grid cards.

### Layout Philosophy
Touch-optimized vertical rhythms dictate spacing. Core operational components (Tray Selector, Quantity Adjuster, Place Order CTA) adhere strictly to a 48px minimum hit target height, decoupled from visual container margins to prevent mis-taps during one-handed operation.

## Elevation & Depth

Visual depth is achieved through layered warm tone tiers paired with organic, amber-tinted ambient occlusion rather than synthetic gray drop shadows.

### Surface Tiers
- **Tier 0 (Base Canvas):** `#FFFDF7` — The foundational backdrop for the entire application.
- **Tier 1 (Surface Cards & Trays):** `#FBF8F1` bounded by a 1px border of `#F3EEDF`. This structure holds product listings, date pickers, and timeline cards.
- **Tier 2 (Floating Action & Modals):** `#FFFFFF` paired with an ambient shadow: `0 8px 24px -4px rgba(217, 119, 6, 0.08), 0 2px 6px -1px rgba(30, 41, 59, 0.04)`.
- **Tier 3 (Active Selection & Cart Trays):** `#FDF6E2` paired with a focused border: `1.5px solid #D97706`.

### Depth Philosophy
Avoid dark, muddy drop-shadows. Elevation reflects radiant natural light falling onto egg carton molds, using tinted warm shadows (`rgba(217, 119, 6, 0.06)`) to ground physical packaging cards.

## Shapes

The shape system draws direct inspiration from nature's strongest organic form: the egg. The corner strategy favors generous curvature (`roundedness: 2`), applying `rounded-xl` (16px) and `rounded-2xl` (24px) for cards, and continuous pills for interactive tags.

### Boundary Logic
- **Product & Tray Cards:** 20px–24px outer radius; inner nested elements (such as egg cell cutouts) scale down to 12px–14px to maintain harmonious corner parallelism.
- **Buttons, Steppers, & Badges:** Full pill-geometry (`rounded-full`) for steppers and tags; 16px soft-squircle for bottom sheets and checkout trigger buttons.
- **Divider Treatment:** Never sharp lines. Use 2px curved track indicators or dot-dash pasture separators.

## Components

### Buttons
- **Primary Action (e.g., "Add to Basket", "Confirm Delivery"):** Solid `#D97706` background with `#FFFFFF` text. Minimum height 52px, pill or 16px rounded squircle. Subtle bottom inset highlight (`inset 0 -2px 0 rgba(0,0,0,0.12)`) gives a tactile physical press feel.
- **Secondary / Farm Reserve:** Transparent background with a 1.5px border of `#D97706` and `#D97706` typography.
- **Destructive / Cancellation:** Light comb-crimson tint (`#FEF2F2`) with `#DC2626` text.

### Tactile Tray Selector (Product Variant Unit)
- Specialized card displaying packaging configurations: **6-Egg Half Dozen**, **12-Egg Dozen**, **30-Egg Farm Tray**.
- Unselected: `#FBF8F1` background, 1px `#F3EEDF` border, subtle schematic illustration of egg cradles in muted slate.
- Selected: `#FEF3C7` background, 2px `#D97706` outline, prominent organic badge ("Best Value for Families"). Provides a haptic spring animation on selection.

### Tactile Quantity Stepper
- A pill-shaped segmented controller (`#F8F4EA`) featuring dual circular tactile buttons (`-` and `+`) with `#1E293B` icons and a central bold numerical indicator (`label-lg`).
- Minimum tap area of 44x44px per button. When quantity hits zero, the decrement morphs into a trash can icon tinted with `#DC2626`.

### Freshness & Origin Badges (Chips)
- **Certified Organic / Free-Range:** Background `#ECFDF5`, text and leading checkmark icon `#059669`, rounded-full padding `space-xs` vertical, `space-sm` horizontal.
- **Lay Date Chip:** Background `#FEF3C7`, text `#B45309`, displaying "Laid: Yesterday 06:30 AM".
- **Low Stock Indicator:** Background `#FEF2F2`, text `#DC2626`, displaying pulse dot indicator.

### Delivery & Order Tracking Timeline
- Vertical progress track styled like farm milestone markers.
- Completed stages (Egg Collection, Quality Inspection, Packed in Carton, Out for Delivery) feature `#059669` connected paths and filled pill badges.
- Active stage pulses with `#D97706` warm yolk beacon glow.
- **Cash on Delivery (COD) Tag:** Prominent pill badge pinned to the timeline summary card in `#F8FAFC` slate-border with a distinct green cash seal icon and dark slate readout: "Pay ₹/$/€ on Delivery - Cash/UPI Accepted".

### Input Fields
- Form inputs (e.g., delivery instructions, apartment gate codes) use an eggshell surface `#FBF8F1` with an invisible border that transitions to a 1.5px `#D97706` amber border on focus. Text sits in `#0F172A` with placeholder text in `#94A3B8`.