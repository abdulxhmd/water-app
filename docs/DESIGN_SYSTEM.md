# Design System

## Design Direction
The application uses a soft, pastel, emotionally warm visual language centered on hydration, calmness, and relational motivation.

Recurring cues:
- pale blue primary accents
- lavender and mint gradient blends
- blurred ambient background blobs
- rounded cards and rounded action buttons
- glassmorphism-inspired translucent surfaces
- Material Symbols icons
- supportive, affectionate copy

## Color Usage
No formal token file exists. Colors are embedded inline in Tailwind class strings and partially mirrored in CSS variables.

Confirmed recurring colors:
- `#F7FAFF`: page background
- `#7FB8FF`: main hydration accent
- `#E9E2FF`: lavender accent
- `#EEF7F1`: pale mint surface
- `#E3E8F5`: border color
- `#eef7ff`: alternate light surface
- slate text variants from Tailwind defaults

## Typography
Actual implementation:
- `Geist` and `Geist_Mono` are loaded in `layout.tsx`.
- `globals.css` defines font theme variables.
- `body` still uses `Arial, Helvetica, sans-serif`.

Design implication:
- The intended typography system is Geist-based.
- The effective global body font is still Arial/Helvetica unless overridden by utility classes.

## Surfaces and Shape
Repeated surface patterns:
- `rounded-xl`, `rounded-2xl`, `rounded-full`
- `bg-white/80`, `bg-white/70`
- thin pastel borders
- soft shadows
- blurred backgrounds

## Motion
Global animations defined in `globals.css`:
- `fadeIn`
- `float`
- `wave`

Utility classes:
- `.animate-fade-in`
- `.animate-float`
- `.water-wave`
- `.water-container`

Observed usage:
- login screen entry
- floating water-drop icon
- subtle hover scale on buttons
- animated navbar hide/show by scroll

## Iconography
The app loads Google Material Symbols via a stylesheet link in the root layout.

Common icons:
- `water_drop`
- `today`
- `calendar_view_week`
- `calendar_month`
- `tune`
- `favorite`
- `emoji_events`
- `send`
- `lock`

## Layout Patterns
- Sticky/fixed top headers
- Fixed bottom nav
- Centered single-column hero composition on login and today
- Card stacks on settings
- Dashboard cards and recap sections on week/month

## Reusable Design Patterns
- App header block with icon, product label, and page label
- Settings pill button in top-right
- Circular avatar image
- Footer with `Hydration, shared.`
- Gradient CTA button
- Border + blur card shell

## Inconsistencies
- Metadata still says `Create Next App`.
- Public SVGs are leftover starter assets and not part of the product design language.
- `googlestitchfiles/stitch-login.html` uses `Inter` and `Playfair Display`, while the Next.js app uses Geist variables plus Arial fallback.
- Some emoji characters in settings/month appear mojibake in source output, indicating encoding inconsistency in at least parts of the code path.

## Missing Design-System Infrastructure
- No token file
- No shared component library
- No variant system
- No spacing scale docs
- No typography scale docs
- No accessibility guidelines
- No dark-mode strategy document beyond utility classes

## Practical Guidance
When extending the UI, match these confirmed patterns:
- keep backgrounds light and airy
- use `#7FB8FF` as the main action accent
- pair blue with lavender/mint gradients
- favor rounded surfaces and soft shadows
- keep copy gentle and encouraging
- prefer simple icons over dense controls
