---
name: Numis Heritage
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#c6c6cb'
  on-secondary: '#2f3034'
  secondary-container: '#46464b'
  on-secondary-container: '#b5b4ba'
  tertiary: '#cfcece'
  on-tertiary: '#2f3131'
  tertiary-container: '#b3b3b3'
  on-tertiary-container: '#444546'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e3e2e7'
  secondary-fixed-dim: '#c6c6cb'
  on-secondary-fixed: '#1a1b1f'
  on-secondary-fixed-variant: '#46464b'
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Libre Caslon Text
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Libre Caslon Text
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Libre Caslon Text
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  margin-edge: 20px
  gutter: 12px
---

## Brand & Style
The design system is centered on the concept of "Digital Numismatics"—bridging the gap between the physical weight of rare currency and the precision of modern mobile technology. The brand personality is authoritative, archival, and premium. 

The aesthetic follows a **Modern-Tactile** direction. It utilizes clean, high-fidelity interfaces common in luxury fintech, but incorporates subtle skeuomorphic cues such as metallic gradients and soft depth to make digital coins feel as valuable as their physical counterparts. The goal is to evoke the feeling of a high-end auction house or a private vault, ensuring users feel their collection is curated and secure.

## Colors
The palette is rooted in a "Deep Charcoal" (`#121212`) base to provide a high-contrast backdrop that allows metallic elements to pop. 

- **Primary (Metallic Gold):** Used for key actions, high-value highlights, and "Rare" status indicators. It should be applied with a subtle linear gradient (top-left to bottom-right) to mimic luster.
- **Secondary & Tertiary (Silver/Steel):** Used for utilitarian UI elements, "Common" status indicators, and secondary icons.
- **Surface Tiers:** The design system uses a tiered dark mode. The base background is the darkest, while cards and interactive surfaces use `background_paper` (`#1C1C1E`) to create depth.

## Typography
The typography strategy employs a "Heritage-Modern" pairing. 

**Libre Caslon Text** is utilized for headlines, coin names, and value denominations. Its classic serif terminals evoke historical documents and minted currency.

**Manrope** is used for all functional UI elements, descriptions, and data points. Its geometric yet approachable structure ensures legibility at small sizes on mobile devices. 

All "Label" styles should lean towards higher weights (Medium/Bold) to maintain a professional, structured hierarchy. Large display headings should use tighter letter spacing to feel more "editorial."

## Layout & Spacing
This design system utilizes a **4px baseline grid** optimized for React Native. 

- **Mobile Philosophy:** A fluid-width model with fixed horizontal margins of `20px`. 
- **Cards:** Content is grouped into cards that span the full width minus margins.
- **Grids:** For coin galleries, use a 2-column grid with a `12px` gutter to maximize the visual scale of the coin photography.
- **Vertical Rhythm:** Use `16px` (md) as the standard spacing between related elements and `32px` (xl) to separate distinct sections or groups.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Soft Ambient Shadows**. 

Avoid harsh black shadows. Instead, use a shadow color derived from the primary background (e.g., `#000000` at 40% opacity with a large blur radius). 

Elevated elements like cards should have a subtle `1px` inner-border (stroke) using a low-opacity silver or gold to simulate a "beveled" edge, common in high-end watch or coin displays. Floating Action Buttons (FABs) for the camera/identification feature should use a more pronounced shadow to indicate a higher Z-index.

## Shapes
The shape language is "Softly Structured." 

Standard components (Cards, Inputs) use a `0.5rem` (8px) corner radius. This provides a modern feel without being too playful or "bubbly." 

For coin-specific imagery or circular avatars, use a full `rounded-full` (pill) shape to echo the circular nature of the subject matter. Progress bars and status tags should use pill-shaped rounding to differentiate them from structural layout containers.

## Components

### Buttons
- **Primary:** Gold gradient background, dark charcoal text (Manrope Bold). 
- **Secondary:** Transparent with a 1px silver border and silver text.
- **Haptics:** All buttons must trigger a "light" haptic impact on press to reinforce the tactile brand.

### Cards
- Surfaces use `#1C1C1E`. 
- Incorporate a subtle gold top-border (2px) for "Featured" or "Rare" coins.
- Content should be padded by `16px` on all sides.

### Inputs
- Fields are dark with a `1px` stroke of `#3A3A3C`. 
- On focus, the stroke transitions to the Metallic Gold.
- Use Manrope Medium for placeholder text.

### Chips & Tags
- Used for "Year," "Mint Mark," and "Grade."
- Small, uppercase labels with a semi-transparent silver background (`rgba(142, 142, 147, 0.15)`).

### Camera Interface (Identification)
- The viewfinder should have a circular gold-stroked guide.
- Use a backdrop blur (Glassmorphism) for the bottom control panel to allow the coin image to feel continuous.