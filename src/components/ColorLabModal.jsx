import React, { useMemo } from "react";
import { X, Plus, Copy, Check } from "lucide-react";
import { generateShadingRamp, generateHarmonies } from "../utils/colorHarmonies";
import { rgbToHsl } from "../utils/colorMath";

export default function ColorLabModal({
    activeSwatch,
    onClose,
    onAddColor,
    copiedHex,
    onCopyHex,
    border,
    panel,
    textHi,
    textLo,
    textFaint,
}) {
    const ramp = useMemo(() => (activeSwatch ? generateShadingRamp(activeSwatch.hex) : []), [activeSwatch]);
    const harmonies = useMemo(() => (activeSwatch ? generateHarmonies(activeSwatch.hex) : null), [activeSwatch]);

    if (!activeSwatch || !harmonies) return null;

    const [h, s, l] = rgbToHsl(activeSwatch.rgb[0], activeSwatch.rgb[1], activeSwatch.rgb[2]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                style={{ background: "#E2E2E2", border: `1px solid ${border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                        <div
                            className="w-12 h-12 rounded-xl shadow-xs border border-black/10 flex-shrink-0"
                            style={{ background: activeSwatch.hex }}
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="ff-display text-2xl font-bold" style={{ color: textHi }}>
                                    {activeSwatch.name}
                                </h3>
                                <button
                                    onClick={() => onCopyHex(activeSwatch.hex)}
                                    className="ff-mono text-xs px-2 py-0.5 rounded flex items-center gap-1 transition-colors hover:bg-black/10"
                                    style={{ color: textLo, background: panel }}
                                >
                                    {copiedHex === activeSwatch.hex ? <Check size={12} /> : <Copy size={12} />}
                                    {activeSwatch.hex.toUpperCase()}
                                </button>
                            </div>
                            <div className="ff-mono text-xs mt-0.5" style={{ color: textFaint }}>
                                HSL: {Math.round(h)}° {Math.round(s)}% {Math.round(l)}% · RGB({activeSwatch.rgb.join(", ")})
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg transition-colors hover:bg-black/10"
                        style={{ color: textLo }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 5-Step Shading Ramp */}
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="ff-mono text-xs uppercase tracking-widest font-semibold" style={{ color: textLo }}>
                            5-Step Shading Ramp <span className="normal-case opacity-70 font-normal">· Shadow to Highlight</span>
                        </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {ramp.map((step, i) => (
                            <div
                                key={i}
                                className="flex flex-col gap-1.5 p-2 rounded-xl border border-black/10 transition-all hover:scale-102"
                                style={{ background: panel }}
                            >
                                <div
                                    className="w-full h-14 sm:h-16 rounded-lg shadow-xs relative group cursor-pointer flex items-center justify-center"
                                    style={{ background: step.hex }}
                                    onClick={() => onCopyHex(step.hex)}
                                    title={`Click to copy ${step.hex}`}
                                >
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity ff-mono text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white flex items-center gap-1">
                                        {copiedHex === step.hex ? <Check size={10} /> : <Copy size={10} />}
                                        {step.hex}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <div className="ff-body text-[11px] font-semibold truncate" style={{ color: textHi }}>
                                        {step.label}
                                    </div>
                                    <div className="ff-mono text-[10px]" style={{ color: textFaint }}>
                                        {step.hex.toUpperCase()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAddColor(step.hex, step.rgb, step.name)}
                                    className="mt-auto py-1 px-1.5 rounded ff-mono text-[10px] font-medium flex items-center justify-center gap-1 transition-opacity hover:opacity-80"
                                    style={{ background: textHi, color: "#FFFFFF" }}
                                    title="Add to palette"
                                >
                                    <Plus size={11} /> Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Color Harmonies */}
                <div className="flex flex-col gap-3">
                    <span className="ff-mono text-xs uppercase tracking-widest font-semibold" style={{ color: textLo }}>
                        Color Harmonies
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Complementary */}
                        <div className="p-3.5 rounded-xl border border-black/10 flex flex-col gap-2" style={{ background: panel }}>
                            <div className="flex items-center justify-between">
                                <span className="ff-body text-xs font-semibold" style={{ color: textHi }}>Complementary (180°)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: activeSwatch.hex }} />
                                <div className="ff-mono text-xs" style={{ color: textFaint }}>+</div>
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.complementary[0].hex }} />
                                <div className="ml-auto flex items-center gap-2">
                                    <span className="ff-mono text-xs" style={{ color: textHi }}>{harmonies.complementary[0].hex.toUpperCase()}</span>
                                    <button
                                        onClick={() => onAddColor(harmonies.complementary[0].hex, harmonies.complementary[0].rgb, harmonies.complementary[0].name)}
                                        className="p-1.5 rounded-lg bg-black text-white hover:opacity-85 transition-opacity"
                                        title="Add to palette"
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Analogous */}
                        <div className="p-3.5 rounded-xl border border-black/10 flex flex-col gap-2" style={{ background: panel }}>
                            <div className="flex items-center justify-between">
                                <span className="ff-body text-xs font-semibold" style={{ color: textHi }}>Analogous (±30°)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.analogous[0].hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: activeSwatch.hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.analogous[1].hex }} />
                                <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                        onClick={() => {
                                            onAddColor(harmonies.analogous[0].hex, harmonies.analogous[0].rgb, harmonies.analogous[0].name);
                                            onAddColor(harmonies.analogous[1].hex, harmonies.analogous[1].rgb, harmonies.analogous[1].name);
                                        }}
                                        className="px-2 py-1 rounded ff-mono text-[11px] bg-black text-white hover:opacity-85 transition-opacity flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Both
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Triadic */}
                        <div className="p-3.5 rounded-xl border border-black/10 flex flex-col gap-2" style={{ background: panel }}>
                            <div className="flex items-center justify-between">
                                <span className="ff-body text-xs font-semibold" style={{ color: textHi }}>Triadic (120°, 240°)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: activeSwatch.hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.triadic[0].hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.triadic[1].hex }} />
                                <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                        onClick={() => {
                                            onAddColor(harmonies.triadic[0].hex, harmonies.triadic[0].rgb, harmonies.triadic[0].name);
                                            onAddColor(harmonies.triadic[1].hex, harmonies.triadic[1].rgb, harmonies.triadic[1].name);
                                        }}
                                        className="px-2 py-1 rounded ff-mono text-[11px] bg-black text-white hover:opacity-85 transition-opacity flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Both
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Split-Complementary */}
                        <div className="p-3.5 rounded-xl border border-black/10 flex flex-col gap-2" style={{ background: panel }}>
                            <div className="flex items-center justify-between">
                                <span className="ff-body text-xs font-semibold" style={{ color: textHi }}>Split-Complementary (150°, 210°)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: activeSwatch.hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.splitComplementary[0].hex }} />
                                <div className="w-9 h-9 rounded-lg border border-black/10" style={{ background: harmonies.splitComplementary[1].hex }} />
                                <div className="ml-auto flex items-center gap-1.5">
                                    <button
                                        onClick={() => {
                                            onAddColor(harmonies.splitComplementary[0].hex, harmonies.splitComplementary[0].rgb, harmonies.splitComplementary[0].name);
                                            onAddColor(harmonies.splitComplementary[1].hex, harmonies.splitComplementary[1].rgb, harmonies.splitComplementary[1].name);
                                        }}
                                        className="px-2 py-1 rounded ff-mono text-[11px] bg-black text-white hover:opacity-85 transition-opacity flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add Both
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
