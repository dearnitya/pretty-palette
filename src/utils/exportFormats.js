import { rgbToHsb, rgbToHsl, nameSwatch } from "./colorMath";

export function downloadBlob(bytes, filename, type) {
    const blob = new Blob([bytes], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ================= CRC32 (for ZIP) =================
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

// ================= Minimal Stored-Mode ZIP Writer =================
export function makeZip(files) {
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

// ================= Procreate .swatches =================
export function exportProcreate(palette, name = "Palette Pop") {
    const swatches = palette.map((c) => {
        const [h, s, b] = rgbToHsb(c.rgb[0], c.rgb[1], c.rgb[2]);
        return { hue: h, saturation: s, brightness: b, alpha: 1, colorSpace: 0 };
    });
    const json = JSON.stringify({ name, swatches });
    const bytes = new TextEncoder().encode(json);
    const zip = makeZip([{ name: "Swatches.json", data: bytes }]);
    downloadBlob(zip, `${name.toLowerCase().replace(/\s+/g, "-")}.swatches`, "application/zip");
}

// ================= Clip Studio / Photoshop .aco =================
export function exportAco(palette, name = "palette") {
    const n = palette.length;

    // v1 block
    const v1 = new DataView(new ArrayBuffer(4 + n * 10));
    v1.setUint16(0, 1, false);
    v1.setUint16(2, n, false);
    palette.forEach((c, i) => {
        const off = 4 + i * 10;
        const [r, g, b] = c.rgb;
        v1.setUint16(off, 0, false);
        v1.setUint16(off + 2, Math.round((r / 255) * 65535), false);
        v1.setUint16(off + 4, Math.round((g / 255) * 65535), false);
        v1.setUint16(off + 6, Math.round((b / 255) * 65535), false);
        v1.setUint16(off + 8, 0, false);
    });

    // v2 block with names
    const names = palette.map((c) => c.name || nameSwatch(c.hex));
    let v2Len = 4;
    const nameBytesList = names.map((nm) => Array.from(nm).map((ch) => ch.charCodeAt(0)));
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

    const out = new Uint8Array(v1.buffer.byteLength + v2.buffer.byteLength);
    out.set(new Uint8Array(v1.buffer), 0);
    out.set(new Uint8Array(v2.buffer), v1.buffer.byteLength);
    downloadBlob(out, `${name}.aco`, "application/octet-stream");
}

// ================= Adobe Swatch Exchange (.ase) binary export =================
export function exportAse(palette, name = "Palette Pop") {
    const blocks = [];
    let totalLen = 12; // 4 bytes ASEF + 4 bytes version + 4 bytes block count

    palette.forEach((c) => {
        const colorName = c.name || nameSwatch(c.hex);
        const nameLen = colorName.length + 1; // including null terminator
        // Block: 2 bytes type (0x0001) + 4 bytes length
        // Data: 2 bytes name length + (nameLen * 2) bytes UTF-16 BE + 4 bytes "RGB " + 12 bytes (3 floats) + 2 bytes color type
        const dataLen = 2 + (nameLen * 2) + 4 + 12 + 2;
        const blockBuf = new ArrayBuffer(6 + dataLen);
        const dv = new DataView(blockBuf);

        dv.setUint16(0, 0x0001, false); // Color entry
        dv.setUint32(2, dataLen, false);

        dv.setUint16(6, nameLen, false);
        let cur = 8;
        for (let i = 0; i < colorName.length; i++) {
            dv.setUint16(cur, colorName.charCodeAt(i), false);
            cur += 2;
        }
        dv.setUint16(cur, 0, false); // null terminator
        cur += 2;

        // Model: 'RGB '
        dv.setUint8(cur, 0x52);     // 'R'
        dv.setUint8(cur + 1, 0x47); // 'G'
        dv.setUint8(cur + 2, 0x42); // 'B'
        dv.setUint8(cur + 3, 0x20); // ' '
        cur += 4;

        // Float32 values for R, G, B normalized 0..1
        dv.setFloat32(cur, c.rgb[0] / 255, false);
        dv.setFloat32(cur + 4, c.rgb[1] / 255, false);
        dv.setFloat32(cur + 8, c.rgb[2] / 255, false);
        cur += 12;

        // Color type: 0 = Global, 2 = Normal
        dv.setUint16(cur, 0, false);

        blocks.push(new Uint8Array(blockBuf));
        totalLen += 6 + dataLen;
    });

    const headerBuf = new ArrayBuffer(12);
    const hdv = new DataView(headerBuf);
    hdv.setUint8(0, 0x41); // 'A'
    hdv.setUint8(1, 0x53); // 'S'
    hdv.setUint8(2, 0x45); // 'E'
    hdv.setUint8(3, 0x46); // 'F'
    hdv.setUint16(4, 1, false); // Major
    hdv.setUint16(6, 0, false); // Minor
    hdv.setUint32(8, blocks.length, false); // Block count

    const out = new Uint8Array(totalLen);
    out.set(new Uint8Array(headerBuf), 0);
    let off = 12;
    blocks.forEach((b) => {
        out.set(b, off);
        off += b.length;
    });

    downloadBlob(out, `${name.toLowerCase().replace(/\s+/g, "-")}.ase`, "application/octet-stream");
}

// ================= GIMP / Krita / Blender / Aseprite .gpl =================
export function exportGpl(palette, name = "Pretty Palette") {
    const lines = [`GIMP Palette`, `Name: ${name}`, `Columns: 0`, `#`];
    palette.forEach((c) => {
        const [r, g, b] = c.rgb;
        lines.push(`${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${c.name || nameSwatch(c.hex)}`);
    });
    downloadBlob(new TextEncoder().encode(lines.join("\n")), `${name.toLowerCase().replace(/\s+/g, "-")}.gpl`, "text/plain");
}

// ================= JASC-PAL (Aseprite & Pixel Art) =================
export function exportJascPal(palette, name = "palette") {
    const lines = [
        "JASC-PAL",
        "0100",
        String(palette.length),
        ...palette.map((c) => `${c.rgb[0]} ${c.rgb[1]} ${c.rgb[2]}`)
    ];
    downloadBlob(new TextEncoder().encode(lines.join("\r\n")), `${name}.pal`, "text/plain");
}

// ================= SVG Swatch Card =================
export function exportSvgCard(palette, name = "Pretty Palette") {
    const cardWidth = 800;
    const padding = 40;
    const swatchWidth = 720;
    const cols = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(palette.length))));
    const cellWidth = Math.floor((swatchWidth - (cols - 1) * 12) / cols);
    const cellHeight = 90;
    const rows = Math.ceil(palette.length / cols);
    const cardHeight = padding * 2 + 80 + rows * (cellHeight + 12);

    let swatchesSvg = "";
    palette.forEach((c, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = padding + col * (cellWidth + 12);
        const y = padding + 80 + row * (cellHeight + 12);
        const [, , l] = rgbToHsl(c.rgb[0], c.rgb[1], c.rgb[2]);
        const textFill = l > 60 ? "#1A1A1A" : "#FFFFFF";

        swatchesSvg += `
        <g transform="translate(${x}, ${y})">
            <rect width="${cellWidth}" height="${cellHeight}" rx="10" fill="${c.hex}" stroke="rgba(0,0,0,0.1)" stroke-width="1" />
            <text x="10" y="${cellHeight - 26}" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="${textFill}">${c.name || nameSwatch(c.hex)}</text>
            <text x="10" y="${cellHeight - 10}" font-family="monospace" font-size="11" fill="${textFill}" opacity="0.85">${c.hex.toUpperCase()}</text>
        </g>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cardWidth} ${cardHeight}" width="${cardWidth}" height="${cardHeight}">
    <rect width="100%" height="100%" fill="#E2E2E2" rx="20"/>
    <text x="${padding}" y="${padding + 34}" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="#1A1A1A">${name} ₊˚⊹</text>
    <text x="${padding}" y="${padding + 58}" font-family="system-ui, sans-serif" font-size="13" fill="#666666">${palette.length} Colors · Extracted with Pretty Palette</text>
    ${swatchesSvg}
</svg>`;

    downloadBlob(new TextEncoder().encode(svg), `${name.toLowerCase().replace(/\s+/g, "-")}-swatch-card.svg`, "image/svg+xml");
}

// ================= Figma & Penpot Design Tokens JSON =================
export function exportFigmaTokens(palette, name = "Pretty Palette") {
    const tokens = {
        color: {
            [name.toLowerCase().replace(/\s+/g, "-")]: {}
        }
    };

    palette.forEach((c, i) => {
        const tokenKey = (c.name || nameSwatch(c.hex)).toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${i + 1}`;
        tokens.color[name.toLowerCase().replace(/\s+/g, "-")][tokenKey] = {
            value: c.hex,
            type: "color",
            description: `RGB(${c.rgb.join(", ")}) · Extracted from image`
        };
    });

    downloadBlob(new TextEncoder().encode(JSON.stringify(tokens, null, 2)), `${name.toLowerCase().replace(/\s+/g, "-")}-tokens.json`, "application/json");
}

// ================= Image (PNG/JPEG) Swatch Sheet =================
export function exportSwatchSheetImage(palette, format = "png") {
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
        ctx.font = "600 14px Arial";
        ctx.fillText(c.hex.toUpperCase(), x + 12, y + cell - 16);
    });
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `palette-swatch-sheet.${format === "jpeg" ? "jpg" : "png"}`;
        a.click();
    }, mime, 0.95);
}

// ================= Tailwind & CSS Variables Generators =================
export function generateTailwindConfig(palette) {
    const obj = {};
    palette.forEach((c, i) => {
        const key = (c.name || nameSwatch(c.hex)).toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${i + 1}`;
        obj[key] = c.hex;
    });

    return `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: ${JSON.stringify(obj, null, 8).replace(/^{/, "{\n").replace(/}$/, "      }")}
    }
  }
};`;
}

export function generateCssVariables(palette) {
    const lines = palette.map((c, i) => {
        const varName = (c.name || nameSwatch(c.hex)).toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${i + 1}`;
        return `  --color-${varName}: ${c.hex};`;
    });
    return `:root {\n${lines.join("\n")}\n}`;
}
