# Pretty Palette ₊˚⊹ ᰔ

> **Extract artist-ready color palettes from any image, inspect tonal values, generate 5-step dimensional shading ramps, and export across industry-standard creative tools.**

Pretty Palette is a specialized color palette extraction and manipulation studio designed for illustrators, game artists, UI/UX designers, and digital painters. Unlike conventional hex extractors, Pretty Palette operates in the human-perceptual **CIE $L^*a^*b^*$** color space, provides precise pixel-level sampling tools, and exports directly to tools like Photoshop, Procreate, Clip Studio, Aseprite, Figma, and Tailwind CSS.

---

## ✨ Features

### 🎨 Precision Extraction & Sampling
- **Perceptual K-Means Clustering**: Clusters colors using Euclidean distance in CIE $L^*a^*b^*$ space rather than raw RGB, mirroring how human eyes perceive color differences.
- **Dynamic Palette Size**: Extract anywhere from 2 to 100 colors with real-time slider controls.
- **Magnifier Loupe & Eyedropper**: Hover over any uploaded image for a 5× zoomed pixel loupe with real-time hex readout. Click any pixel to lock it directly into your palette.
- **Screen-Wide Eyedropper**: Native `window.EyeDropper` API integration to sample colors from anywhere on your desktop.
- **Focus Region / Marquee Selection**: Drag a bounding box over specific artwork sections (e.g., character hair, background, clothing) to extract colors solely from that sub-region.

### 🔒 Curation & Workflow
- **Swatch Pinning / Locking**: Pin your favorite colors to keep them preserved while adjusting palette counts or re-clustering.
- **Smart Re-roll**: Shuffle unlocked swatches to discover alternative accent colors from the artwork while locked swatches remain fixed.
- **Quick Sorting Modes**:
  - **Dominance** (pixel frequency)
  - **Hue** (rainbow spectrum $0^\circ \rightarrow 360^\circ$)
  - **Value / Lightness** (light $\leftrightarrow$ dark)
  - **Saturation** (vibrant $\leftrightarrow$ muted)
- **Automatic Heuristic Naming**: Generates evocative, artist-friendly swatch names (e.g., *"Dusty Lilac"*, *"Milk White"*, *"Deep Terracotta"*).

### 🖌️ Color Lab: Shading Ramps & Harmonies
- **5-Step Dimensional Shading Ramps**: Calculates *Deep Shadow*, *Shadow*, *Base*, *Soft Highlight*, and *Specular / Rim* using perceptual lightness targets and painterly warm/cool temperature shifts.
- **Classical Harmonies**: One-click generation of Complementary ($180^\circ$), Split-Complementary ($150^\circ / 210^\circ$), Triadic ($120^\circ / 240^\circ$), and Analogous ($\pm 30^\circ$) colors.
- **One-Click Palette Insertion**: Add any ramp step or harmony directly into your active workspace.

### 👁️ Accessibility & Value Checks
- **Value / Grayscale Contrast Check**: Instant conversion to perceived luminance ($Y = 0.2126R + 0.7152G + 0.0722B$) to inspect dynamic range and value hierarchy.
- **Colorblindness Simulation**: Accurate linear-RGB matrix simulations for:
  - Protanopia (red-blind)
  - Deuteranopia (green-blind)
  - Tritanopia (blue-blind)

### 💾 Collections, Google Sign-In & Sharing
- **Account Profile & Google Sign-In**: Sign in with Gmail to organize and access palettes across sessions.
- **Saved Palettes Drawer**: Save palettes with custom names (e.g., *"Bowling Night ₊˚⊹"*) and searchable tags (`#Neon`, `#Cyberpunk`, `#Watercolor`).
- **Instant URL Hash Sharing**: Palettes encode directly into the browser URL hash (`#c=fe4a49,2ab7ca...`). Anyone opening the link immediately loads the exact palette without needing the original image.

---

## 📦 Export Formats

Pretty Palette provides native exports tailored for digital art, UI design, and development:

| Category | Format | Compatible Software / Usage |
| :--- | :--- | :--- |
| **Vector & Design** | **SVG Swatch Card** | Drag-and-drop vector card for Figma, Canva, Illustrator |
| **Tokens** | **Design Tokens JSON** | W3C Design Tokens standard for Figma Tokens Studio & Penpot |
| **Frontend** | **Tailwind Config** | `theme.extend.colors` snippet for Tailwind CSS |
| **Web** | **CSS Variables** | `:root { --color-... }` custom properties |
| **Digital Painting** | **`.aco`** | Adobe Photoshop, Clip Studio Paint, Adobe Fresco |
| **Illustration** | **`.swatches`** | Procreate native palette zip format |
| **Adobe Suite** | **`.ase`** | Adobe Swatch Exchange binary for Illustrator, InDesign, Photoshop |
| **Pixel Art & Sprites** | **`.pal` (JASC)** & **`.gpl`** | Aseprite, GraphicsGale, Paint Shop Pro |
| **Open Source Art** | **`.gpl`** | GIMP, Krita, Blender (*Import Palettes* add-on) |
| **Images** | **PNG & JPEG** | High-resolution swatch sheets with labeled hex codes |
| **Data** | **JSON** | Full palette schema with hex, RGB, weight, and names |

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Linter**: [Oxlint](https://oxc.rs/)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- `npm` or `pnpm`

### Installation
```bash
# Clone the repository
git clone https://github.com/dearnitya/pretty-palette.git

# Navigate into the project directory
cd pretty-palette

# Install dependencies
npm install
```

### Development
```bash
# Start the local development server with HMR
npm run dev
```
Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

### Production Build
```bash
# Lint code
npm run lint

# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 📱 Future Roadmap

- [ ] **PWA Offline Mode**: Complete service worker caching for offline mobile install.
- [ ] **Camera Snapshot Integration**: Direct camera capture on mobile devices.
- [ ] **Mobile App**: Native iOS & Android binaries packaged with Capacitor.
- [ ] **Desktop App**: Native lightweight cross-platform desktop app packaged with Tauri.

---

## 📄 License

This project is private and maintained by [dearnitya](https://github.com/dearnitya). All rights reserved.
