// ================= Color Math & Conversions =================

export function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    if (clean.length === 3) {
        return [
            parseInt(clean[0] + clean[0], 16),
            parseInt(clean[1] + clean[1], 16),
            parseInt(clean[2] + clean[2], 16),
        ];
    }
    return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
    ];
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

export function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;

    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = (t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    return [
        Math.round(hue2rgb(h + 1 / 3) * 255),
        Math.round(hue2rgb(h) * 255),
        Math.round(hue2rgb(h - 1 / 3) * 255),
    ];
}

export function rgbToHsb(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return [h / 360, s, max]; // 0..1 each
}

// ================= RGB <-> CIE L*a*b* =================
export function rgbToXyz(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    r = toLinear(r); g = toLinear(g); b = toLinear(b);
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
    return [x * 100, y * 100, z * 100];
}

export function xyzToLab(x, y, z) {
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / refX), fy = f(y / refY), fz = f(z / refZ);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToLab(r, g, b) {
    const [x, y, z] = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
}

export function labToXyz(L, a, b) {
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
    const fInv = (t) => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
    return [fInv(fx) * refX, fInv(fy) * refY, fInv(fz) * refZ];
}

export function xyzToRgb(x, y, z) {
    x /= 100; y /= 100; z /= 100;
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    r = gamma(r); g = gamma(g); b = gamma(b);
    const clamp = (c) => Math.min(255, Math.max(0, c * 255));
    return [clamp(r), clamp(g), clamp(b)];
}

export function labToRgb(L, a, b) {
    const [x, y, z] = labToXyz(L, a, b);
    return xyzToRgb(x, y, z);
}

// ================= Colorblindness & Grayscale Simulation =================
const CB_MATRICES = {
    protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
    deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
    tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};

export function simulateColorBlind(hex, mode) {
    if (!mode) return hex;
    const [r, g, b] = hexToRgb(hex);

    // Grayscale (Value Check): uses ITU-R BT.709 perceived luminance
    if (mode === "grayscale") {
        const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        return rgbToHex(y, y, y);
    }

    const toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);
    const m = CB_MATRICES[mode];
    if (!m) return hex;

    const rr = m[0][0] * rl + m[0][1] * gl + m[0][2] * bl;
    const gg = m[1][0] * rl + m[1][1] * gl + m[1][2] * bl;
    const bb = m[2][0] * rl + m[2][1] * gl + m[2][2] * bl;
    const toSrgb = (c) => {
        c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        return Math.round(Math.min(255, Math.max(0, c * 255)));
    };
    return rgbToHex(toSrgb(rr), toSrgb(gg), toSrgb(bb));
}

// ================= Swatch Naming =================
export function nameSwatch(hex) {
    const [r, g, b] = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l > 92) return "Milk White";
    if (l < 10) return "Ink Black";
    if (s < 10) return l > 55 ? "Fog Grey" : "Stone Grey";

    const hues = [
        [15, "Blush"], [35, "Terracotta"], [50, "Amber"], [65, "Honey"],
        [90, "Olive"], [140, "Sage"], [170, "Mint"], [195, "Sky"],
        [220, "Cornflower"], [255, "Periwinkle"], [280, "Lilac"],
        [310, "Orchid"], [335, "Rose"], [360, "Blush"]
    ];
    let name = "Dusty";
    for (const [deg, label] of hues) {
        if (h <= deg) { name = label; break; }
    }
    const tone = l > 75 ? "Pale " : l < 32 ? "Deep " : s < 32 ? "Muted " : "";
    return tone + name;
}

// ================= K-means extraction (LAB Space) =================
// Supports region cropping & locked swatch preservation
export function extractPalette(imageData, k, lockedColors = [], cropRegion = null) {
    const pixelsLab = [];
    const { data, width, height } = imageData;

    let minX = 0, minY = 0, maxX = width, maxY = height;
    if (cropRegion && cropRegion.width > 5 && cropRegion.height > 5) {
        minX = Math.max(0, Math.floor(cropRegion.x));
        minY = Math.max(0, Math.floor(cropRegion.y));
        maxX = Math.min(width, Math.ceil(cropRegion.x + cropRegion.width));
        maxY = Math.min(height, Math.ceil(cropRegion.y + cropRegion.height));
    }

    for (let y = minY; y < maxY; y += 2) {
        for (let x = minX; x < maxX; x += 2) {
            const idx = (y * width + x) * 4;
            if (data[idx + 3] < 125) continue;
            pixelsLab.push(rgbToLab(data[idx], data[idx + 1], data[idx + 2]));
        }
    }

    if (pixelsLab.length === 0) return lockedColors.slice();

    // Determine how many new colors need to be clustered
    const lockedHexes = new Set(lockedColors.map((c) => c.hex.toLowerCase()));
    const needed = Math.max(0, k - lockedColors.length);

    if (needed === 0) {
        return lockedColors.slice();
    }

    // Initialize k-means centroids randomly across pixel distribution
    const centroids = [];
    for (let i = 0; i < needed; i++) {
        const randIdx = Math.floor(Math.random() * pixelsLab.length);
        centroids.push(pixelsLab[randIdx].slice());
    }

    const assignments = new Uint32Array(pixelsLab.length);
    for (let iter = 0; iter < 9; iter++) {
        for (let p = 0; p < pixelsLab.length; p++) {
            let best = 0, bestDist = Infinity;
            const pl0 = pixelsLab[p][0], pl1 = pixelsLab[p][1], pl2 = pixelsLab[p][2];
            for (let c = 0; c < needed; c++) {
                const dl = pl0 - centroids[c][0];
                const da = pl1 - centroids[c][1];
                const db = pl2 - centroids[c][2];
                const dist = dl * dl + da * da + db * db;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = c;
                }
            }
            assignments[p] = best;
        }

        const sums = Array.from({ length: needed }, () => [0, 0, 0, 0]);
        for (let p = 0; p < pixelsLab.length; p++) {
            const c = assignments[p];
            sums[c][0] += pixelsLab[p][0];
            sums[c][1] += pixelsLab[p][1];
            sums[c][2] += pixelsLab[p][2];
            sums[c][3]++;
        }
        for (let c = 0; c < needed; c++) {
            if (sums[c][3] > 0) {
                centroids[c][0] = sums[c][0] / sums[c][3];
                centroids[c][1] = sums[c][1] / sums[c][3];
                centroids[c][2] = sums[c][2] / sums[c][3];
            }
        }
    }

    const counts = new Uint32Array(needed);
    for (let p = 0; p < pixelsLab.length; p++) {
        counts[assignments[p]]++;
    }

    const total = pixelsLab.length;
    const extracted = centroids
        .map((c, i) => {
            const rgb = labToRgb(c[0], c[1], c[2]).map((v) => Math.round(v));
            const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
            return {
                hex,
                rgb,
                weight: counts[i] / total,
                locked: false,
                name: nameSwatch(hex),
            };
        })
        .filter((c) => !lockedHexes.has(c.hex.toLowerCase()))
        .filter((c) => c.weight > 0.002);

    // Combine locked colors with newly extracted colors
    const combined = [...lockedColors, ...extracted];
    return combined.slice(0, k);
}
