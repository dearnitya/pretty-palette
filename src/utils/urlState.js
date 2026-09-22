import { hexToRgb, nameSwatch } from "./colorMath";

export function encodePaletteToHash(palette) {
    if (!palette || palette.length === 0) return "";
    const cleanHexes = palette.map((c) => c.hex.replace("#", "").toLowerCase());
    return `#c=${cleanHexes.join(",")}`;
}

export function decodePaletteFromHash() {
    try {
        const hash = window.location.hash;
        if (!hash || !hash.includes("c=")) return null;
        const match = hash.match(/c=([0-9a-fA-F,]+)/);
        if (!match || !match[1]) return null;

        const hexList = match[1].split(",").filter((h) => h.length === 3 || h.length === 6);
        if (hexList.length === 0) return null;

        return hexList.map((h) => {
            const hex = `#${h}`;
            const rgb = hexToRgb(hex);
            return {
                hex,
                rgb,
                weight: 1 / hexList.length,
                locked: false,
                name: nameSwatch(hex),
            };
        });
    } catch {
        return null;
    }
}

export function getShareableUrl(palette) {
    const hash = encodePaletteToHash(palette);
    const url = new URL(window.location.href);
    url.hash = hash;
    return url.toString();
}
