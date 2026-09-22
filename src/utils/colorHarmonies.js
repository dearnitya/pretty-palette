import { hexToRgb, rgbToLab, labToRgb, rgbToHex, rgbToHsl, hslToRgb, nameSwatch } from "./colorMath";

/**
 * Generates a 5-step shading ramp from a base color:
 * [Deep Shadow, Mid Shadow, Base, Soft Highlight, Bright Highlight]
 * Uses CIE L*a*b* space to control lightness naturally while slightly
 * shifting temperature (cool shadow / warm highlight) like classical painters.
 */
export function generateShadingRamp(baseHex) {
    const [r, g, b] = hexToRgb(baseHex);
    const [L, a, labB] = rgbToLab(r, g, b);
    const [, s] = rgbToHsl(r, g, b);

    // Lightness targets
    const lShadowDeep = Math.max(8, L * 0.35);
    const lShadowMid = Math.max(16, L * 0.68);
    const lHighSoft = Math.min(94, L + (100 - L) * 0.45);
    const lHighBright = Math.min(98, L + (100 - L) * 0.78);

    // Artistic hue shifting in HSL:
    // Shadows lean slightly cooler/richer (+10deg toward blue/purple or increased saturation)
    // Highlights lean slightly warmer/clearer (-6deg toward golden daylight)
    const buildStep = (targetL, hueOffset, satMultiplier, label) => {
        // First get LAB base at new L
        const [nr, ng, nb] = labToRgb(targetL, a, labB);
        const [nh] = rgbToHsl(nr, ng, nb);
        const adjustedHue = (nh + hueOffset + 360) % 360;
        const adjustedSat = Math.max(5, Math.min(100, s * satMultiplier));
        const [fr, fg, fb] = hslToRgb(adjustedHue, adjustedSat, (targetL / 100) * 100);
        const hex = rgbToHex(fr, fg, fb);
        return {
            label,
            hex,
            rgb: [fr, fg, fb],
            name: nameSwatch(hex),
        };
    };

    return [
        buildStep(lShadowDeep, 12, 1.15, "Deep Shadow"),
        buildStep(lShadowMid, 6, 1.05, "Shadow"),
        { label: "Base", hex: baseHex, rgb: [r, g, b], name: nameSwatch(baseHex) },
        buildStep(lHighSoft, -5, 0.9, "Soft Highlight"),
        buildStep(lHighBright, -10, 0.75, "Specular / Rim"),
    ];
}

/**
 * Generates classical color harmonies:
 * Complementary (180°), Split-Complementary (150°, 210°),
 * Triadic (120°, 240°), Analogous (-30°, +30°)
 */
export function generateHarmonies(baseHex) {
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);

    const makeSwatch = (degOffset, label) => {
        const newH = (h + degOffset + 360) % 360;
        const [nr, ng, nb] = hslToRgb(newH, s, l);
        const hex = rgbToHex(nr, ng, nb);
        return {
            label,
            hex,
            rgb: [nr, ng, nb],
            name: nameSwatch(hex),
        };
    };

    return {
        complementary: [
            makeSwatch(180, "Complementary"),
        ],
        splitComplementary: [
            makeSwatch(150, "Split 1"),
            makeSwatch(210, "Split 2"),
        ],
        triadic: [
            makeSwatch(120, "Triadic 1"),
            makeSwatch(240, "Triadic 2"),
        ],
        analogous: [
            makeSwatch(-30, "Analogous -"),
            makeSwatch(30, "Analogous +"),
        ],
    };
}
