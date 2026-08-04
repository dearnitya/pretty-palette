import React, { useState, useRef, useCallback } from "react";
import { Upload, Copy, Check, Download, FileDown, Sparkles, Eye } from "lucide-react";

// ================= Color helpers =================
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
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
function rgbToHsb(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return [h / 360, s, max]; // 0..1 each
}

// ================= RGB <-> LAB (CIE L*a*b*, D65) =================
// LAB space matches human perceptual color difference far better than raw RGB —
// equal distances in LAB roughly correspond to equal perceived color differences.
function rgbToXyz(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    r = toLinear(r); g = toLinear(g); b = toLinear(b);
    const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
    const y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
    const z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
    return [x * 100, y * 100, z * 100];
}
function xyzToLab(x, y, z) {
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x / refX), fy = f(y / refY), fz = f(z / refZ);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function rgbToLab(r, g, b) {
    const [x, y, z] = rgbToXyz(r, g, b);
    return xyzToLab(x, y, z);
}
function labToXyz(L, a, b) {
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    const fy = (L + 16) / 116, fx = a / 500 + fy, fz = fy - b / 200;
    const fInv = (t) => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
    return [fInv(fx) * refX, fInv(fy) * refY, fInv(fz) * refZ];
}
function xyzToRgb(x, y, z) {
    x /= 100; y /= 100; z /= 100;
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    r = gamma(r); g = gamma(g); b = gamma(b);
    const clamp = (c) => Math.min(255, Math.max(0, c * 255));
    return [clamp(r), clamp(g), clamp(b)];
}
function labToRgb(L, a, b) {
    const [x, y, z] = labToXyz(L, a, b);
    return xyzToRgb(x, y, z);
}

// ================= Colorblindness simulation (approximate, linear-RGB matrices) =================
const CB_MATRICES = {
    protanopia: [[0.567, 0.433, 0], [0.558, 0.442, 0], [0, 0.242, 0.758]],
    deuteranopia: [[0.625, 0.375, 0], [0.7, 0.3, 0], [0, 0.3, 0.7]],
    tritanopia: [[0.95, 0.05, 0], [0, 0.433, 0.567], [0, 0.475, 0.525]],
};
function simulateColorBlind(hex, mode) {
    if (!mode) return hex;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);
    const m = CB_MATRICES[mode];
    const rr = m[0][0] * rl + m[0][1] * gl + m[0][2] * bl;
    const gg = m[1][0] * rl + m[1][1] * gl + m[1][2] * bl;
    const bb = m[2][0] * rl + m[2][1] * gl + m[2][2] * bl;
    const toSrgb = (c) => { c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(Math.min(255, Math.max(0, c * 255))); };
    return rgbToHex(toSrgb(rr), toSrgb(gg), toSrgb(bb));
}

// ================= K-means extraction (clustered in LAB space) =================
function extractPalette(imageData, k) {
    const pixelsLab = [];
    const data = imageData.data;
    const step = 4 * 4;
    for (let i = 0; i < data.length; i += step) {
        if (data[i + 3] < 125) continue;
        pixelsLab.push(rgbToLab(data[i], data[i + 1], data[i + 2]));
    }
    if (pixelsLab.length === 0) return [];

    const centroids = [];
    for (let i = 0; i < k; i++) centroids.push(pixelsLab[Math.floor((i / k) * pixelsLab.length)].slice());

    const assignments = new Array(pixelsLab.length).fill(0);
    for (let iter = 0; iter < 8; iter++) {
        for (let p = 0; p < pixelsLab.length; p++) {
            let best = 0, bestDist = Infinity;
            for (let c = 0; c < k; c++) {
                const dl = pixelsLab[p][0] - centroids[c][0];
                const da = pixelsLab[p][1] - centroids[c][1];
                const db = pixelsLab[p][2] - centroids[c][2];
                const dist = dl * dl + da * da + db * db;
                if (dist < bestDist) { bestDist = dist; best = c; }
            }
            assignments[p] = best;
        }
        const sums = Array.from({ length: k }, () => [0, 0, 0, 0]);
        for (let p = 0; p < pixelsLab.length; p++) {
            const c = assignments[p];
            sums[c][0] += pixelsLab[p][0]; sums[c][1] += pixelsLab[p][1]; sums[c][2] += pixelsLab[p][2]; sums[c][3]++;
        }
        for (let c = 0; c < k; c++) {
            if (sums[c][3] > 0) {
                centroids[c][0] = sums[c][0] / sums[c][3];
                centroids[c][1] = sums[c][1] / sums[c][3];
                centroids[c][2] = sums[c][2] / sums[c][3];
            }
        }
    }

    const counts = new Array(k).fill(0);
    assignments.forEach((c) => counts[c]++);
    const total = pixelsLab.length;
    return centroids
        .map((c, i) => {
            const rgb = labToRgb(c[0], c[1], c[2]).map((v) => Math.round(v));
            return { hex: rgbToHex(rgb[0], rgb[1], rgb[2]), rgb, weight: counts[i] / total };
        })
        .filter((c) => c.weight > 0.003)
        .sort((a, b) => b.weight - a.weight);
}

function nameSwatch(hex) {
    const [h, s, l] = rgbToHsl(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
    if (l > 90) return "Milk White";
    if (l < 12) return "Ink Black";
    if (s < 12) return l > 55 ? "Fog Grey" : "Stone Grey";
    const hues = [[15, "Blush"], [35, "Terracotta"], [50, "Amber"], [65, "Honey"], [90, "Olive"], [140, "Sage"],
    [170, "Mint"], [195, "Sky"], [220, "Cornflower"], [255, "Periwinkle"], [280, "Lilac"], [310, "Orchid"],
    [335, "Rose"], [360, "Blush"]];
    let name = "Dusty";
    for (const [deg, label] of hues) { if (h <= deg) { name = label; break; } }
    const tone = l > 75 ? "Pale " : l < 35 ? "Deep " : s < 35 ? "Muted " : "";
    return tone + name;
}

// ================= CRC32 (for zip) =================
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();
function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

// ================= Minimal stored-mode ZIP writer =================
function makeZip(files) {
    // files: [{ name, data: Uint8Array }]
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach(({ name, data }) => {
        const nameBytes = encoder.encode(name);
        const crc = crc32(data);
        const size = data.length;

        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0, true);
        local.setUint16(8, 0, true);
        local.setUint16(10, 0, true);
        local.setUint16(12, 0, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, size, true);
        local.setUint32(22, size, true);
        local.setUint16(26, nameBytes.length, true);
        local.setUint16(28, 0, true);
        const localHeader = new Uint8Array(local.buffer);
        localParts.push(localHeader, nameBytes, data);

        const central = new DataView(new ArrayBuffer(46));
        central.setUint32(0, 0x02014b50, true);
        central.setUint16(4, 20, true);
        central.setUint16(6, 20, true);
        central.setUint16(8, 0, true);
        central.setUint16(10, 0, true);
        central.setUint16(12, 0, true);
        central.setUint16(14, 0, true);
        central.setUint32(16, crc, true);
        central.setUint32(20, size, true);
        central.setUint32(24, size, true);
        central.setUint16(28, nameBytes.length, true);
        central.setUint16(30, 0, true);
        central.setUint16(32, 0, true);
        central.setUint16(34, 0, true);
        central.setUint16(36, 0, true);
        central.setUint32(38, 0, true);
        central.setUint32(42, offset, true);
        const centralHeader = new Uint8Array(central.buffer);
        centralParts.push(centralHeader, nameBytes);

        offset += localHeader.length + nameBytes.length + data.length;
    });

    const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    end.setUint16(20, 0, true);

    const all = [...localParts, ...centralParts, new Uint8Array(end.buffer)];
    const totalLen = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    all.forEach((p) => { out.set(p, pos); pos += p.length; });
    return out;
}

function downloadBlob(bytes, filename, type) {
    const blob = new Blob([bytes], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}

// ================= Procreate .swatches export (real) =================
function exportProcreate(palette, name = "Palette Pop") {
    const swatches = palette.map((c) => {
        const [h, s, b] = rgbToHsb(c.rgb[0], c.rgb[1], c.rgb[2]);
        return { hue: h, saturation: s, brightness: b, alpha: 1, colorSpace: 0 };
    });
    const json = JSON.stringify({ name, swatches });
    const bytes = new TextEncoder().encode(json);
    const zip = makeZip([{ name: "Swatches.json", data: bytes }]);
    downloadBlob(zip, "palette.swatches", "application/zip");
}

// ================= Clip Studio via Adobe .aco export (real) =================
function exportAco(palette) {
    const encoder = new TextEncoder();
    const n = palette.length;

    // v1 block: 4 bytes header + 10 bytes per color
    const v1 = new DataView(new ArrayBuffer(4 + n * 10));
    v1.setUint16(0, 1, false);
    v1.setUint16(2, n, false);
    palette.forEach((c, i) => {
        const off = 4 + i * 10;
        const [r, g, b] = c.rgb;
        v1.setUint16(off, 0, false); // RGB colorspace
        v1.setUint16(off + 2, Math.round((r / 255) * 65535), false);
        v1.setUint16(off + 4, Math.round((g / 255) * 65535), false);
        v1.setUint16(off + 6, Math.round((b / 255) * 65535), false);
        v1.setUint16(off + 8, 0, false);
    });

    // v2 block: 4 bytes header + per color (10 bytes + 4 byte name length + name UTF16BE + null)
    const names = palette.map((c) => nameSwatch(c.hex));
    let v2Len = 4;
    const nameBytesList = names.map((nm) => {
        const chars = Array.from(nm).map((ch) => ch.charCodeAt(0));
        return chars;
    });
    nameBytesList.forEach((chars) => { v2Len += 10 + 4 + (chars.length + 1) * 2; });

    const v2 = new DataView(new ArrayBuffer(v2Len));
    v2.setUint16(0, 2, false);
    v2.setUint16(2, n, false);
    let pos = 4;
    palette.forEach((c, i) => {
        const [r, g, b] = c.rgb;
        v2.setUint16(pos, 0, false);
        v2.setUint16(pos + 2, Math.round((r / 255) * 65535), false);
        v2.setUint16(pos + 4, Math.round((g / 255) * 65535), false);
        v2.setUint16(pos + 6, Math.round((b / 255) * 65535), false);
        v2.setUint16(pos + 8, 0, false);
        pos += 10;
        const chars = nameBytesList[i];
        v2.setUint32(pos, chars.length + 1, false);
        pos += 4;
        chars.forEach((code) => { v2.setUint16(pos, code, false); pos += 2; });
        v2.setUint16(pos, 0, false);
        pos += 2;
    });

    const totalLen = v1.buffer.byteLength + v2.buffer.byteLength;
    const out = new Uint8Array(totalLen);
    out.set(new Uint8Array(v1.buffer), 0);
    out.set(new Uint8Array(v2.buffer), v1.buffer.byteLength);
    downloadBlob(out, "palette.aco", "application/octet-stream");
}

// ================= GIMP / Krita .gpl export (real) =================
function exportGpl(palette, name = "Pretty Palette") {
    const lines = [`GIMP Palette`, `Name: ${name}`, `Columns: 0`, `#`];
    palette.forEach((c) => {
        const [r, g, b] = c.rgb;
        lines.push(`${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${nameSwatch(c.hex)}`);
    });
    downloadBlob(new TextEncoder().encode(lines.join("\n")), "palette.gpl", "text/plain");
}

// ================= Image (PNG/JPEG) swatch sheet export (real) =================
function exportSwatchSheetImage(palette, format = "png") {
    const cell = 160, cols = Math.min(5, palette.length), rows = Math.ceil(palette.length / cols);
    const canvas = document.createElement("canvas");
    canvas.width = cell * cols;
    canvas.height = cell * rows;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    palette.forEach((c, i) => {
        const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
        ctx.fillStyle = c.hex;
        ctx.fillRect(x, y, cell, cell);
        const [, , l] = rgbToHsl(c.rgb[0], c.rgb[1], c.rgb[2]);
        ctx.fillStyle = l > 55 ? "#000000" : "#FFFFFF";
        ctx.font = "600 15px Arial";
        ctx.fillText(c.hex, x + 12, y + cell - 16);
    });
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `palette-swatch-sheet.${format === "jpeg" ? "jpg" : "png"}`;
        a.click();
    }, mime, 0.95);
}

const APPS = [
    { id: "clip", label: "Photoshop / Clip Studio / Illustrator", format: ".aco swatch file", icon: FileDown, status: "real" },
    { id: "procreate", label: "Procreate", format: ".swatches file", icon: FileDown, status: "real" },
    { id: "gimp", label: "GIMP / Krita", format: ".gpl palette file", icon: FileDown, status: "real" },
    { id: "blender", label: "Blender", format: ".aco or .gpl (via Import Palettes)", icon: FileDown, status: "real" },
    { id: "fresco", label: "Adobe Fresco", format: ".aco (via CC Library)", icon: FileDown, status: "real" },
    { id: "medibang", label: "MediBang Paint", format: "swatch sheet (PNG)", icon: FileDown, status: "real" },
];

export default function PalettePop() {
    const [image, setImage] = useState(null);
    const [palette, setPalette] = useState([]);
    const [count, setCount] = useState(8);
    const [loading, setLoading] = useState(false);
    const [copiedHex, setCopiedHex] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [cbMode, setCbMode] = useState(null);
    const canvasRef = useRef(null);
    const imgElRef = useRef(null);

    const runExtraction = useCallback((imgEl, k) => {
        setLoading(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const maxDim = 260;
        const scale = Math.min(maxDim / imgEl.naturalWidth, maxDim / imgEl.naturalHeight, 1);
        canvas.width = Math.max(1, Math.round(imgEl.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(imgEl.naturalHeight * scale));
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setTimeout(() => {
            setPalette(extractPalette(imageData, k));
            setLoading(false);
        }, 30);
    }, []);

    const handleFile = (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        const url = URL.createObjectURL(file);
        setImage(url);
        const imgEl = new window.Image();
        imgEl.crossOrigin = "anonymous";
        imgEl.onload = () => { imgElRef.current = imgEl; runExtraction(imgEl, count); };
        imgEl.src = url;
    };

    const handleCountChange = (val) => {
        setCount(val);
        if (imgElRef.current) runExtraction(imgElRef.current, val);
    };

    const copyHex = (hex) => {
        navigator.clipboard?.writeText(hex);
        setCopiedHex(hex);
        setTimeout(() => setCopiedHex(null), 1200);
    };

    const downloadCss = () => {
        const vars = palette.map((c, i) => `  --${nameSwatch(c.hex).toLowerCase().replace(/\s+/g, "-")}-${i + 1}: ${c.hex};`).join("\n");
        downloadBlob(new TextEncoder().encode(`:root {\n${vars}\n}`), "palette.css", "text/css");
    };
    const downloadJson = () => {
        const json = JSON.stringify(palette.map((c) => ({ name: nameSwatch(c.hex), hex: c.hex, rgb: c.rgb, weight: +c.weight.toFixed(3) })), null, 2);
        downloadBlob(new TextEncoder().encode(json), "palette.json", "application/json");
    };

    // Neutral grayscale theme — deliberately uncolored so extracted hues read true, no white/black bias
    const bg = "#C0C0C0", panel = "#CBCBCB", panelLight = "#D4D4D4", border = "#A6A6A6";
    const textHi = "#1E1E1E", textLo = "#4A4A4A", textFaint = "#6B6B6B";

    return (
        <div className="min-h-screen w-full" style={{ background: bg }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .ff-display { font-family: 'Fraunces', serif; }
        .ff-body { font-family: 'Manrope', sans-serif; }
        .ff-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>
            <canvas ref={canvasRef} className="hidden" />

            {/* Hero */}
            <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 md:pt-20 pb-8 sm:pb-12">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <Sparkles size={18} style={{ color: textLo }} />
                    <span className="ff-mono text-xs sm:text-sm tracking-widest uppercase" style={{ color: textFaint }}>image → palette</span>
                </div>
                <h1 className="ff-display text-4xl sm:text-6xl md:text-8xl leading-none mb-3 sm:mb-4 flex items-center flex-wrap gap-2 sm:gap-4" style={{ color: textHi }}>
                    Palette Pop <span className="text-xl sm:text-2xl md:text-4xl" style={{ color: textLo }}>₊˚⊹ ᰔ</span>
                </h1>
                <p className="ff-body text-base sm:text-lg md:text-xl max-w-2xl" style={{ color: textLo }}>
                    Drag/Upload your image here to generate a custom palette, ranging from two to a hundred colors at a time.
                </p>
            </div>

            {/* Upload / workspace */}
            <div
                className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12"
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0]); }}
            >
                {!image ? (
                    <label
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-2xl cursor-pointer transition-all h-[220px] sm:h-[300px] md:h-[380px]"
                        style={{ border: `3px dashed ${dragActive ? textLo : border}`, background: dragActive ? panelLight : panel }}
                    >
                        <Upload size={32} style={{ color: textLo }} className="sm:hidden" />
                        <Upload size={40} style={{ color: textLo }} className="hidden sm:block" />
                        <span className="ff-body text-sm sm:text-lg font-medium text-center px-4" style={{ color: textLo }}>Drag an image here, or click to choose one</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>
                ) : (
                    <div
                        className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-5 sm:gap-8 rounded-2xl transition-all"
                        style={{ padding: dragActive ? "16px" : "0px", border: dragActive ? `3px dashed ${textLo}` : "3px dashed transparent", background: dragActive ? panelLight : "transparent" }}
                    >
                        <div className="rounded-2xl overflow-hidden h-[200px] sm:h-[260px] md:h-[320px]" style={{ border: `1px solid ${border}`, background: panel }}>
                            <img src={image} alt="uploaded" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-between">
                            <div>
                                <div className="flex items-baseline justify-between mb-3">
                                    <span className="ff-mono text-xs sm:text-sm uppercase tracking-widest" style={{ color: textFaint }}>colors extracted</span>
                                    <span className="ff-display text-2xl sm:text-3xl md:text-4xl" style={{ color: textHi }}>{count}</span>
                                </div>
                                <input type="range" min={2} max={100} value={count} onChange={(e) => handleCountChange(Number(e.target.value))} className="w-full" style={{ accentColor: textLo, height: "6px" }} />
                                <div className="flex justify-between ff-mono text-xs mt-2" style={{ color: textFaint }}>
                                    <span>2</span><span>100</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 mt-4 sm:mt-6 flex-wrap">
                                <label className="ff-body text-xs sm:text-sm underline cursor-pointer w-fit" style={{ color: textFaint }}>
                                    Choose a different image
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                                </label>
                                <span className="ff-mono text-xs" style={{ color: textFaint }}>or drag a new one anywhere here</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Ribbon */}
            {image && (
                <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="ff-mono text-sm uppercase tracking-widest" style={{ color: textFaint }}>palette collage <span className="normal-case" style={{ color: textFaint, opacity: 0.7 }}>· clustered in CIE LAB space</span></div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Eye size={14} style={{ color: textFaint }} />
                            {[
                                { id: null, label: "Normal vision" },
                                { id: "protanopia", label: "Protanopia" },
                                { id: "deuteranopia", label: "Deuteranopia" },
                                { id: "tritanopia", label: "Tritanopia" },
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setCbMode(opt.id)}
                                    className="ff-mono text-[11px] px-2.5 py-1 rounded-full transition-colors"
                                    style={{
                                        background: cbMode === opt.id ? textHi : panel,
                                        color: cbMode === opt.id ? bg : textFaint,
                                        border: `1px solid ${border}`,
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div
                        className="grid gap-2.5 rounded-xl"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                            opacity: loading ? 0.5 : 1,
                            transition: "opacity 0.2s",
                        }}
                    >
                        {palette.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => copyHex(c.hex)}
                                className="relative group flex items-end justify-center pb-3 rounded-lg transition-transform hover:scale-105"
                                style={{ background: simulateColorBlind(c.hex, cbMode), aspectRatio: "1 / 1", border: "1px solid rgba(0,0,0,0.12)" }}
                                title={c.hex}
                            >
                                <span className="ff-mono text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>
                                    {copiedHex === c.hex ? <Check size={12} /> : <Copy size={12} />}{c.hex}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
                        {palette.map((c, i) => (
                            <button key={i} onClick={() => copyHex(c.hex)} className="flex items-center gap-4 rounded-xl p-4 text-left transition-transform hover:-translate-y-0.5" style={{ background: panel, border: `1px solid ${border}` }}>
                                <div className="rounded-lg flex-shrink-0" style={{ width: "52px", height: "52px", background: simulateColorBlind(c.hex, cbMode), border: "1px solid rgba(0,0,0,0.12)" }} />
                                <div className="min-w-0">
                                    <div className="ff-body text-base font-semibold truncate" style={{ color: textHi }}>{nameSwatch(c.hex)}</div>
                                    <div className="ff-mono text-sm flex items-center gap-1" style={{ color: textFaint }}>{c.hex} {copiedHex === c.hex && <Check size={13} />}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Export */}
            {image && palette.length > 0 && (
                <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
                    <div className="ff-mono text-sm uppercase tracking-widest mb-4" style={{ color: textFaint }}>export <span className="normal-case" style={{ color: textFaint, opacity: 0.7 }}>· always exports true colors, regardless of preview mode above</span></div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <button onClick={downloadCss} className="flex items-center justify-center gap-2 rounded-xl py-4 ff-body text-base font-semibold transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                            <Download size={18} /> CSS
                        </button>
                        <button onClick={downloadJson} className="flex items-center justify-center gap-2 rounded-xl py-4 ff-body text-base font-semibold transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                            <Download size={18} /> JSON
                        </button>
                        <button onClick={() => exportSwatchSheetImage(palette, "png")} className="flex items-center justify-center gap-2 rounded-xl py-4 ff-body text-base font-semibold transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                            <Download size={18} /> PNG
                        </button>
                        <button onClick={() => exportSwatchSheetImage(palette, "jpeg")} className="flex items-center justify-center gap-2 rounded-xl py-4 ff-body text-base font-semibold transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                            <Download size={18} /> JPEG
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {APPS.map((app) => (
                            <div key={app.id} className="rounded-xl p-5 flex flex-col gap-4" style={{ background: panel, border: `1px solid ${border}` }}>
                                <div className="flex items-center gap-2">
                                    <app.icon size={19} style={{ color: textLo }} />
                                    <span className="ff-body text-base font-semibold" style={{ color: textHi }}>{app.label}</span>
                                </div>
                                <span className="ff-mono text-xs" style={{ color: textFaint }}>{app.format}</span>

                                <div className="flex gap-1.5 my-1 flex-wrap">
                                    {palette.slice(0, 8).map((c, i) => (
                                        <div key={i} className="rounded-full" style={{ width: "18px", height: "18px", background: c.hex }} />
                                    ))}
                                </div>

                                {app.id === "clip" && (
                                    <button onClick={() => exportAco(palette)} className="mt-auto ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                        Download .aco
                                    </button>
                                )}
                                {app.id === "procreate" && (
                                    <button onClick={() => exportProcreate(palette)} className="mt-auto ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                        Download .swatches
                                    </button>
                                )}
                                {app.id === "gimp" && (
                                    <button onClick={() => exportGpl(palette)} className="mt-auto ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                        Download .gpl
                                    </button>
                                )}
                                {app.id === "blender" && (
                                    <div className="mt-auto flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <button onClick={() => exportAco(palette)} className="flex-1 ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                                .aco
                                            </button>
                                            <button onClick={() => exportGpl(palette)} className="flex-1 ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                                .gpl
                                            </button>
                                        </div>
                                        <span className="ff-body text-xs leading-snug" style={{ color: textFaint }}>
                                            Enable Blender's bundled "Import Palettes" add-on first (Edit → Preferences → Add-ons, search "palette"), then File → Import → Palette.
                                        </span>
                                    </div>
                                )}
                                {app.id === "fresco" && (
                                    <div className="mt-auto flex flex-col gap-2">
                                        <button onClick={() => exportAco(palette)} className="ff-body text-sm font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85" style={{ background: textHi, color: bg }}>
                                            Download .aco
                                        </button>
                                        <span className="ff-body text-xs leading-snug" style={{ color: textFaint }}>
                                            Fresco needs this imported into Photoshop or Illustrator first, saved to a Creative Cloud Library — it'll then show up inside Fresco automatically.
                                        </span>
                                    </div>
                                )}
                                {app.id === "medibang" && (
                                    <div className="mt-auto flex flex-col gap-2">
                                        <span className="ff-body text-xs leading-snug" style={{ color: textFaint }}>
                                            MediBang doesn't support palette files at all — use the PNG/JPEG download above, import it as an image, and pick colors with the eyedropper.
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}