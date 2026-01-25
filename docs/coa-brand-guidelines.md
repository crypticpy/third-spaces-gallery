# City of Austin Brand Guidelines Reference

Reference extracted from: https://austin.acquiadam.com/portals/glmmx9ji/HubPortal-Collab

## Brand Philosophy

The City of Austin's visual identity is designed to be:

- Expressive yet practical
- Civic-minded yet creative
- Serious yet approachable

---

## Typography

### Primary Brand Typeface: Geist

- Available for free on [Google Fonts](https://fonts.google.com/specimen/Geist)
- **Geist SemiBold** - Primary weight for headings and emphasis
- **Geist Regular** - Body text and general content

### Logo Typeface: Museo Slab

- Contemporary slab serif
- Used in the Austin wordmark

### Substitute Typefaces (when Geist unavailable)

- System fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

---

## Color Palettes

### Official Palette

Core brand colors for the City of Austin Identity Suite.

| Color           | HEX       | RGB             | Pantone | Usage                   |
| --------------- | --------- | --------------- | ------- | ----------------------- |
| **Logo Blue**   | `#44499C` | 68 / 73 / 156   | 2117 C  | Primary brand blue      |
| **Logo Green**  | `#009F4D` | 0 / 159 / 77    | 7482 C  | Primary brand green     |
| **Faded White** | `#F7F6F5` | 247 / 246 / 245 | -       | Background, light areas |

### Supporting Palette

Used when more contrast is needed within layouts.

| Color               | HEX       | RGB             | Usage                                  |
| ------------------- | --------- | --------------- | -------------------------------------- |
| **Compliant Green** | `#008743` | 0 / 135 / 67    | Accessible green (use with white text) |
| **Dark Blue**       | `#22254E` | 34 / 37 / 78    | Headers, dark backgrounds              |
| **Dark Green**      | `#005027` | 0 / 80 / 39     | Dark accents                           |
| **Light Blue**      | `#DCF2FD` | 220 / 242 / 253 | Light backgrounds, highlights          |
| **Light Green**     | `#DFF0E3` | 222 / 240 / 227 | Light backgrounds, highlights          |

### Extended Palette

For practical uses, data visualizations, signage, and design variety.

| Color          | HEX       | RGB             | Pantone      |
| -------------- | --------- | --------------- | ------------ |
| **Red**        | `#F83125` | 248 / 49 / 37   | Bright Red C |
| **Orange**     | `#FF8F00` | 255 / 143 / 0   | 2013         |
| **Yellow**     | `#FFC600` | 255 / 198 / 0   | 7548         |
| **Cyan**       | `#009CDE` | 0 / 156 / 222   | 2925         |
| **Purple**     | `#9F3CC9` | 159 / 60 / 201  | 7442         |
| **Brown**      | `#8F5201` | 143 / 82 / 1    | 1535         |
| **Light Gray** | `#C6C5C4` | 198 / 197 / 196 | 420          |
| **Dark Gray**  | `#636262` | 99 / 98 / 98    | 4195         |
| **Black**      | `#000000` | 0 / 0 / 0       | -            |

---

## Color Usage Guidelines

1. **Official Palette** - Use for City of Austin Identity Suite (flags, social media avatars, apparel, merchandise, stationery)

2. **Supporting Palette** - Use when more contrast is needed
   - Dark Blue can be used in the Identity Suite
   - Use Compliant Green (not Logo Green) when accessibility/legibility is a concern

3. **Extended Palette** - For practical uses like signage, data visualizations, and design variety

4. **The Austin Colorway** - When Official and Supporting Palettes are used together

---

## Logo Usage

### Primary Logo

- Stacked and horizontal versions available
- Uses Logo Green and Logo Blue colors
- Austin "A" icon with flowing lines representing Austin's unique story

### Icon Usage

The City of Austin Icon (the "A") may be used independently for:

- Social media avatars
- Email signatures
- Branded apparel
- Merchandise

---

## CSS Variables (for implementation)

```css
:root {
  /* Official Palette */
  --coa-logo-blue: #44499c;
  --coa-logo-green: #009f4d;
  --coa-faded-white: #f7f6f5;

  /* Supporting Palette */
  --coa-compliant-green: #008743;
  --coa-dark-blue: #22254e;
  --coa-dark-green: #005027;
  --coa-light-blue: #dcf2fd;
  --coa-light-green: #dff0e3;

  /* Extended Palette */
  --coa-red: #f83125;
  --coa-orange: #ff8f00;
  --coa-yellow: #ffc600;
  --coa-cyan: #009cde;
  --coa-purple: #9f3cc9;
  --coa-brown: #8f5201;
  --coa-light-gray: #c6c5c4;
  --coa-dark-gray: #636262;
  --coa-black: #000000;
}
```

---

## Tailwind Config Colors

```javascript
// tailwind.config.js
colors: {
  brand: {
    // Official Palette
    'logo-blue': '#44499C',
    'logo-green': '#009F4D',
    'faded-white': '#F7F6F5',

    // Supporting Palette
    'compliant-green': '#008743',
    'dark-blue': '#22254E',
    'dark-green': '#005027',
    'light-blue': '#DCF2FD',
    'light-green': '#DFF0E3',

    // Extended Palette
    'red': '#F83125',
    'orange': '#FF8F00',
    'yellow': '#FFC600',
    'cyan': '#009CDE',
    'purple': '#9F3CC9',
    'brown': '#8F5201',
    'light-gray': '#C6C5C4',
    'dark-gray': '#636262',
  }
}
```

---

## Current Third Spaces Gallery Mapping

| Current Name   | Current HEX | CoA Equivalent | Notes           |
| -------------- | ----------- | -------------- | --------------- |
| `brand-navy`   | `#22254E`   | Dark Blue      | Matches exactly |
| `brand-indigo` | `#44499C`   | Logo Blue      | Matches exactly |
| `brand-sky`    | `#009CDE`   | Cyan           | Matches exactly |
| `brand-sea`    | `#009F4D`   | Logo Green     | Matches exactly |
| `brand-gold`   | `#FFC600`   | Yellow         | Matches exactly |

The current implementation already aligns well with CoA brand guidelines.

---

## Resources

- Brand Portal: https://austin.acquiadam.com/portals/glmmx9ji/HubPortal-Collab
- Google Fonts - Geist: https://fonts.google.com/specimen/Geist
