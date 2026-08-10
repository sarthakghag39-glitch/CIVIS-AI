---
name: Civis Intelligence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success: '#22C55E'
  warning: '#F59E0B'
  critical: '#EF4444'
  card-bg: '#FFFFFF'
  border-subtle: '#E2E8F0'
  accent-gradient-start: '#2563EB'
  accent-gradient-end: '#60A5FA'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin: 32px
  container-max: 1440px
---

## Brand & Style

This design system embodies the **Modern Gov-Tech** aesthetic: a synthesis of institutional reliability and cutting-edge computational intelligence. It targets urban planners, city officials, and data scientists who require a high-performance environment that feels both authoritative and innovative.

The visual style is **Modern / Corporate Tech**, drawing heavily from the "Linear" school of design—characterized by refined borders, subtle glassmorphism, and a strict adherence to grid systems. The UI evokes a sense of "The Invisible Hand of Data"—clean, calm, and hyper-efficient. It utilizes high-quality whitespace to reduce cognitive load in data-heavy environments, ensuring that the AI-powered insights remain the focal point.

## Colors

The palette is anchored by a deep **Civic Blue**, representing trust and stability. This is complemented by a **Teal** secondary color used for AI-driven highlights and technical features. 

- **Primary & Secondary:** Used for high-priority actions and state indicators.
- **Surface Strategy:** The background uses a very cool, bright gray (`#F8FAFC`) to differentiate from the pure white (`#FFFFFF`) used for interactive cards and elevated surfaces.
- **Functional Colors:** Success, Warning, and Critical colors follow industry standards but are calibrated for high legibility against white backgrounds.
- **Accents:** Blue gradients are used sparingly for "hero" moments, such as AI processing states or primary data visualizations.

## Typography

The typography system relies exclusively on **Inter**, a typeface designed for user interfaces. It provides exceptional legibility at small sizes and a clean, technical appearance in display settings.

- **Scale:** The system uses a tight typographic scale to maintain a professional, information-dense feel.
- **Hierarchy:** We use semi-bold and bold weights for headlines to create clear "landmarks" in the UI. 
- **Labels:** Small labels (`label-sm`) utilize uppercase styling and slight letter spacing to denote secondary metadata or category headers, mimicking the precision of architectural blueprints.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum container width of 1440px for desktop screens to prevent line lengths from becoming unreadable.

- **Grid:** A 12-column system is used for desktop, 8-column for tablet, and 4-column for mobile.
- **Rhythm:** Spacing is built on a 4px baseline. Components generally use 16px (4 units) or 24px (6 units) of internal padding to maintain a "generous" and high-end feel.
- **Safe Areas:** On mobile, side margins are reduced to 16px, while desktop maintains a comfortable 32px margin to emphasize the premium use of space.

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Glassmorphism** to establish hierarchy.

- **Level 0 (Background):** `#F8FAFC` - The canvas.
- **Level 1 (Cards):** Pure white background with a very fine, 1px neutral border (`#E2E8F0`). 
- **Level 2 (Modals/Popovers):** These surfaces use a backdrop-blur (12px to 20px) and a semi-transparent white fill (90% opacity).
- **Shadows:** Instead of heavy blacks, we use "Ambient Shadows"—soft, diffused blurs with a hint of blue tinting (e.g., `hsla(220, 20%, 20%, 0.05)`). This makes components feel like they are floating slightly above the surface rather than casting a heavy weight on it.

## Shapes

The shape language is defined by **Large, Soft Radii**. 

- **Cards & Containers:** Use a 16px (`rounded-lg`) to 24px (`rounded-xl`) radius to create a friendly, modern tech silhouette.
- **Buttons & Inputs:** Follow the `roundedness: 2` setting (8px radius) to maintain a balance between precision and approachability.
- **AI Components:** Elements specifically driven by AI insights may use even softer, "Pill-shaped" borders to differentiate them from static system data.

## Components

### Buttons
Primary buttons use the Deep Blue background with white text. Ghost buttons use a subtle light blue hover state. All buttons feature a subtle 1px top-highlight (inner shadow) to give a slightly tactile, high-end feel.

### Input Fields
Inputs should be minimalist. A 1px border that shifts to Primary Blue on focus. Labels should be placed above the field in the `label-md` style.

### Cards
Cards are the primary container. They must always have a white background, 16px-24px corner radius, and a 1px subtle border. For "Active" or "Selected" states, use a 2px Primary Blue border or a soft outer glow.

### Chips & Tags
Used for status and filtering. Use a semi-transparent version of the functional colors (e.g., Success Green at 10% opacity) with a darker text color for a modern, glass-like appearance.

### Progress & Data Viz
Use the Teal-to-Blue gradient for progress bars and primary data trends to signify "Active Intelligence." All charts should utilize the same 8px roundedness for bar corners and data points.