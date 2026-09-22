import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    Upload,
    Copy,
    Check,
    Download,
    FileDown,
    Sparkles,
    Eye,
    Lock,
    Unlock,
    Shuffle,
    ArrowUpDown,
    Bookmark,
    User,
    Code,
    Share2,
    Palette
} from "lucide-react";

import {
    rgbToHsl,
    simulateColorBlind,
    nameSwatch,
    extractPalette
} from "../utils/colorMath";

import {
    exportProcreate,
    exportAco,
    exportAse,
    exportGpl,
    exportJascPal,
    exportSvgCard,
    exportFigmaTokens,
    exportSwatchSheetImage,
    downloadBlob
} from "../utils/exportFormats";

import { decodePaletteFromHash, encodePaletteToHash, getShareableUrl } from "../utils/urlState";

import ImageCanvas from "./ImageCanvas";
import ColorLabModal from "./ColorLabModal";
import SavedPalettesDrawer from "./SavedPalettesDrawer";
import AuthModal from "./AuthModal";
import CodeExportModal from "./CodeExportModal";

export default function PalettePop() {
    const [image, setImage] = useState(null);
    const [palette, setPalette] = useState([]);
    const [count, setCount] = useState(8);
    const [loading, setLoading] = useState(false);
    const [copiedHex, setCopiedHex] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [cbMode, setCbMode] = useState(null);
    const [cropRegion, setCropRegion] = useState(null);
    const [sortMode, setSortMode] = useState("dominance"); // 'dominance' | 'hue' | 'lightness' | 'saturation'

    // Modals & Drawers
    const [activeSwatch, setActiveSwatch] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [shareToast, setShareToast] = useState(null);

    // User & Storage
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("pretty_palette_user")) || null;
        } catch {
            return null;
        }
    });

    const [savedPalettes, setSavedPalettes] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("pretty_palette_saved")) || [];
        } catch {
            return [];
        }
    });

    const canvasRef = useRef(null);
    const imgElRef = useRef(null);

    // Check URL hash on initial load
    useEffect(() => {
        const shared = decodePaletteFromHash();
        if (shared && shared.length > 0) {
            setPalette(shared);
            setCount(shared.length);
            setShareToast("Loaded palette from shared link!");
            setTimeout(() => setShareToast(null), 3000);
        }
    }, []);

    // Update URL hash when palette changes
    useEffect(() => {
        if (palette.length > 0) {
            const hash = encodePaletteToHash(palette);
            if (window.location.hash !== hash) {
                window.history.replaceState(null, "", hash);
            }
        }
    }, [palette]);

    // Save user to localStorage
    const handleLogin = (newUser) => {
        setUser(newUser);
        localStorage.setItem("pretty_palette_user", JSON.stringify(newUser));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("pretty_palette_user");
    };

    // Save palette
    const handleSavePalette = (title, tags) => {
        const newEntry = {
            id: `pal_${Date.now()}`,
            title,
            tags,
            colors: palette,
            createdAt: new Date().toISOString(),
        };
        const updated = [newEntry, ...savedPalettes];
        setSavedPalettes(updated);
        localStorage.setItem("pretty_palette_saved", JSON.stringify(updated));
        setShareToast(`Saved "${title}" to your collection!`);
        setTimeout(() => setShareToast(null), 2500);
    };

    const handleDeletePalette = (id) => {
        const updated = savedPalettes.filter((p) => p.id !== id);
        setSavedPalettes(updated);
        localStorage.setItem("pretty_palette_saved", JSON.stringify(updated));
    };

    const handleLoadPalette = (colors) => {
        setPalette(colors);
        setCount(colors.length);
        setShareToast("Loaded saved palette!");
        setTimeout(() => setShareToast(null), 2000);
    };

    // Extraction runner
    const runExtraction = useCallback((imgEl, k, crop = null, locked = []) => {
        setLoading(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const maxDim = 320;
        const scale = Math.min(maxDim / imgEl.naturalWidth, maxDim / imgEl.naturalHeight, 1);
        canvas.width = Math.max(1, Math.round(imgEl.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(imgEl.naturalHeight * scale));
        ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);

        // Adjust crop region to scaled canvas space if provided
        let scaledCrop = null;
        if (crop) {
            scaledCrop = {
                x: crop.x * scale,
                y: crop.y * scale,
                width: crop.width * scale,
                height: crop.height * scale,
            };
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setTimeout(() => {
            const result = extractPalette(imageData, k, locked, scaledCrop);
            setPalette(result);
            setLoading(false);
        }, 30);
    }, []);

    const handleFile = (file) => {
        if (!file || !file.type.startsWith("image/")) return;
        const url = URL.createObjectURL(file);
        setImage(url);
        setCropRegion(null);
        const imgEl = new window.Image();
        imgEl.crossOrigin = "anonymous";
        imgEl.onload = () => {
            imgElRef.current = imgEl;
            runExtraction(imgEl, count, null, []);
        };
        imgEl.src = url;
    };

    const handleCountChange = (val) => {
        setCount(val);
        const locked = palette.filter((c) => c.locked);
        if (imgElRef.current) {
            runExtraction(imgElRef.current, val, cropRegion, locked);
        }
    };

    const handleReroll = () => {
        if (!imgElRef.current) return;
        const locked = palette.filter((c) => c.locked);
        runExtraction(imgElRef.current, count, cropRegion, locked);
    };

    const handleToggleLock = (index) => {
        setPalette((prev) =>
            prev.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c))
        );
    };

    const handlePickColor = (hex, rgb) => {
        const existing = palette.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
        if (existing) {
            setPalette((prev) =>
                prev.map((c) => (c.hex.toLowerCase() === hex.toLowerCase() ? { ...c, locked: true } : c))
            );
        } else {
            const newSwatch = {
                hex,
                rgb,
                weight: 0.05,
                locked: true,
                name: nameSwatch(hex),
            };
            setPalette((prev) => [newSwatch, ...prev]);
            setCount((prev) => prev + 1);
        }
    };

    const handleApplyCrop = (region) => {
        setCropRegion(region);
        if (imgElRef.current) {
            const locked = palette.filter((c) => c.locked);
            runExtraction(imgElRef.current, count, region, locked);
        }
    };

    const handleAddColorFromLab = (hex, rgb, name) => {
        const newSwatch = {
            hex,
            rgb,
            weight: 0.05,
            locked: true,
            name: name || nameSwatch(hex),
        };
        setPalette((prev) => [newSwatch, ...prev]);
        setCount((prev) => prev + 1);
        setShareToast(`Added ${hex.toUpperCase()} to palette!`);
        setTimeout(() => setShareToast(null), 1500);
    };

    // Quick Sort Options
    const handleSort = (mode) => {
        setSortMode(mode);
        const sorted = [...palette].sort((a, b) => {
            if (mode === "dominance") {
                return (b.weight || 0) - (a.weight || 0);
            }
            if (mode === "hue") {
                const [hA] = rgbToHsl(a.rgb[0], a.rgb[1], a.rgb[2]);
                const [hB] = rgbToHsl(b.rgb[0], b.rgb[1], b.rgb[2]);
                return hA - hB;
            }
            if (mode === "lightness") {
                const [, , lA] = rgbToHsl(a.rgb[0], a.rgb[1], a.rgb[2]);
                const [, , lB] = rgbToHsl(b.rgb[0], b.rgb[1], b.rgb[2]);
                return lA - lB;
            }
            if (mode === "saturation") {
                const [, sA] = rgbToHsl(a.rgb[0], a.rgb[1], a.rgb[2]);
                const [, sB] = rgbToHsl(b.rgb[0], b.rgb[1], b.rgb[2]);
                return sB - sA;
            }
            return 0;
        });
        setPalette(sorted);
    };

    const copyHex = (hex) => {
        navigator.clipboard?.writeText(hex);
        setCopiedHex(hex);
        setTimeout(() => setCopiedHex(null), 1200);
    };

    const copyShareUrl = () => {
        const url = getShareableUrl(palette);
        navigator.clipboard?.writeText(url);
        setShareToast("Share link copied to clipboard!");
        setTimeout(() => setShareToast(null), 2000);
    };

    const downloadJson = () => {
        const json = JSON.stringify(
            palette.map((c) => ({
                name: c.name || nameSwatch(c.hex),
                hex: c.hex,
                rgb: c.rgb,
                weight: +(c.weight || 0).toFixed(3),
            })),
            null,
            2
        );
        downloadBlob(new TextEncoder().encode(json), "palette.json", "application/json");
    };

    // Neutral theme
    const bg = "#E2E2E2", panel = "#ECECEC", panelLight = "#F4F4F4", border = "#C5C5C5";
    const textHi = "#1A1A1A", textLo = "#444444", textFaint = "#666666";

    return (
        <div className="min-h-screen w-full" style={{ background: bg }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .ff-display { font-family: 'Fraunces', serif; }
        .ff-body { font-family: 'Manrope', sans-serif; }
        .ff-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
            <canvas ref={canvasRef} className="hidden" />

            {/* Top Navigation Bar */}
            <header className="max-w-6xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles size={18} style={{ color: textLo }} />
                    <span className="ff-mono text-xs sm:text-sm tracking-widest uppercase font-semibold" style={{ color: textHi }}>
                        Palette Pop <span className="normal-case opacity-70 font-normal">₊˚⊹ ᰔ</span>
                    </span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Share Button */}
                    {palette.length > 0 && (
                        <button
                            onClick={copyShareUrl}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl ff-mono text-xs border border-black/10 hover:bg-black/5 transition-all"
                            style={{ background: panel, color: textHi }}
                            title="Copy shareable link"
                        >
                            <Share2 size={13} />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                    )}

                    {/* Saved Palettes Button */}
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl ff-mono text-xs border border-black/10 hover:bg-black/5 transition-all"
                        style={{ background: panel, color: textHi }}
                    >
                        <Bookmark size={13} />
                        <span className="hidden sm:inline">Collections</span>
                        {savedPalettes.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-black text-white text-[10px] font-bold">
                                {savedPalettes.length}
                            </span>
                        )}
                    </button>

                    {/* User Account / Google Sign-In */}
                    <button
                        onClick={() => setIsAuthOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl ff-mono text-xs border border-black/10 hover:bg-black/5 transition-all"
                        style={{ background: panel, color: textHi }}
                    >
                        {user ? (
                            <>
                                <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover border border-black/10" />
                                <span className="font-semibold truncate max-w-[90px]">{user.name}</span>
                            </>
                        ) : (
                            <>
                                <User size={14} />
                                <span>Sign In</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Global Toast Alert */}
            {shareToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/90 text-white px-4 py-2 rounded-full ff-mono text-xs shadow-2xl flex items-center gap-2 animate-fadeIn">
                    <Check size={14} className="text-green-400" />
                    <span>{shareToast}</span>
                </div>
            )}

            {/* Hero Section */}
            <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
                <h1 className="ff-display text-4xl sm:text-6xl md:text-7xl leading-none mb-3 flex items-center flex-wrap gap-2 sm:gap-4" style={{ color: textHi }}>
                    Palette Pop
                </h1>
                <p className="ff-body text-base sm:text-lg max-w-2xl" style={{ color: textLo }}>
                    Extract artist-ready color palettes from any image, inspect values, lock swatches, and generate dimensional shading ramps.
                </p>
            </div>

            {/* Upload & Workspace */}
            <div
                className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12"
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0]); }}
            >
                {!image ? (
                    <label
                        className="flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-2xl cursor-pointer transition-all h-[220px] sm:h-[300px] md:h-[360px]"
                        style={{ border: `3px dashed ${dragActive ? textLo : border}`, background: dragActive ? panelLight : panel }}
                    >
                        <Upload size={36} style={{ color: textLo }} />
                        <span className="ff-body text-sm sm:text-lg font-medium text-center px-4" style={{ color: textLo }}>
                            Drag an image here, or click to choose one
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </label>
                ) : (
                    <div
                        className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-start gap-6 sm:gap-10 rounded-2xl transition-all"
                        style={{
                            padding: dragActive ? "16px" : "0px",
                            border: dragActive ? `3px dashed ${textLo}` : "3px dashed transparent",
                            background: dragActive ? panelLight : "transparent",
                        }}
                    >
                        {/* Interactive Image Frame with Eyedropper & Crop */}
                        <ImageCanvas
                            imageUrl={image}
                            onPickColor={handlePickColor}
                            onApplyCrop={handleApplyCrop}
                            cropRegion={cropRegion}
                            border={border}
                            panel={panel}
                            panelLight={panelLight}
                            textHi={textHi}
                            textLo={textLo}
                            textFaint={textFaint}
                        />

                        {/* Controls Column */}
                        <div className="flex flex-col justify-between self-stretch min-h-[160px] gap-6">
                            <div>
                                <div className="flex items-baseline justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="ff-mono text-xs sm:text-sm uppercase tracking-widest" style={{ color: textFaint }}>
                                            colors extracted
                                        </span>
                                        {palette.filter((c) => c.locked).length > 0 && (
                                            <span className="ff-mono text-[11px] px-2 py-0.5 rounded-full bg-black/5" style={{ color: textLo }}>
                                                {palette.filter((c) => c.locked).length} locked
                                            </span>
                                        )}
                                    </div>
                                    <span className="ff-display text-2xl sm:text-3xl md:text-4xl" style={{ color: textHi }}>
                                        {palette.length}
                                    </span>
                                </div>

                                <input
                                    type="range"
                                    min={2}
                                    max={100}
                                    value={count}
                                    onChange={(e) => handleCountChange(Number(e.target.value))}
                                    className="w-full cursor-pointer"
                                    style={{ accentColor: textLo, height: "6px" }}
                                />
                                <div className="flex justify-between ff-mono text-xs mt-2" style={{ color: textFaint }}>
                                    <span>2</span>
                                    <span>100</span>
                                </div>
                            </div>

                            {/* Re-roll & Actions */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <button
                                    onClick={handleReroll}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl ff-mono text-xs font-semibold bg-black text-white hover:opacity-85 transition-opacity shadow-xs"
                                    title="Re-cluster unlocked swatches"
                                >
                                    <Shuffle size={14} /> Re-roll Palette
                                </button>

                                <label className="ff-body text-xs sm:text-sm underline cursor-pointer hover:opacity-80 transition-opacity" style={{ color: textFaint }}>
                                    Choose a different image
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Palette Ribbon & Inspection */}
            {palette.length > 0 && (
                <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-8 sm:pb-12">
                    {/* Vision Check & Sorting Bar */}
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                        {/* Vision filters */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Eye size={14} style={{ color: textFaint }} />
                            {[
                                { id: null, label: "Normal vision" },
                                { id: "grayscale", label: "Grayscale (Values)" },
                                { id: "protanopia", label: "Protanopia" },
                                { id: "deuteranopia", label: "Deuteranopia" },
                                { id: "tritanopia", label: "Tritanopia" },
                            ].map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setCbMode(opt.id)}
                                    className="ff-mono text-[11px] px-2.5 py-1 rounded-full transition-all"
                                    style={{
                                        background: cbMode === opt.id ? textHi : panel,
                                        color: cbMode === opt.id ? "#FFFFFF" : textFaint,
                                        border: `1px solid ${border}`,
                                    }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Quick Sort Options */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: panel, border: `1px solid ${border}` }}>
                            <ArrowUpDown size={12} className="ml-1.5" style={{ color: textFaint }} />
                            <span className="ff-mono text-[10px] uppercase tracking-wider mr-1" style={{ color: textFaint }}>Sort:</span>
                            {[
                                { id: "dominance", label: "Dominance" },
                                { id: "hue", label: "Hue" },
                                { id: "lightness", label: "Value" },
                                { id: "saturation", label: "Saturation" },
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSort(s.id)}
                                    className="ff-mono text-[10px] px-2 py-0.5 rounded-lg transition-all"
                                    style={{
                                        background: sortMode === s.id ? textHi : "transparent",
                                        color: sortMode === s.id ? "#FFFFFF" : textLo,
                                    }}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Palette Collage Grid */}
                    <div
                        className="grid gap-2.5 rounded-xl"
                        style={{
                            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                            opacity: loading ? 0.5 : 1,
                            transition: "opacity 0.2s",
                        }}
                    >
                        {palette.map((c, i) => (
                            <div
                                key={i}
                                className="relative group rounded-lg overflow-hidden transition-transform hover:scale-105 shadow-2xs"
                                style={{
                                    background: simulateColorBlind(c.hex, cbMode),
                                    aspectRatio: "1 / 1",
                                    border: "1px solid rgba(0,0,0,0.12)",
                                }}
                            >
                                {/* Lock Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleLock(i);
                                    }}
                                    className={`absolute top-1.5 left-1.5 p-1 rounded-md transition-opacity z-10 ${
                                        c.locked ? "opacity-100 bg-black/60 text-white" : "opacity-0 group-hover:opacity-80 bg-black/40 text-white hover:opacity-100"
                                    }`}
                                    title={c.locked ? "Unlock swatch" : "Lock swatch"}
                                >
                                    {c.locked ? <Lock size={11} /> : <Unlock size={11} />}
                                </button>

                                {/* Color Lab trigger */}
                                <button
                                    onClick={() => setActiveSwatch(c)}
                                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
                                    title="Open Color Lab & Shading Ramp"
                                >
                                    <Sparkles size={11} />
                                </button>

                                {/* Click to copy hex */}
                                <button
                                    onClick={() => copyHex(c.hex)}
                                    className="w-full h-full flex items-end justify-center pb-2.5"
                                    title={`Click to copy ${c.hex}`}
                                >
                                    <span className="ff-mono text-[11px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 text-white">
                                        {copiedHex === c.hex ? <Check size={11} /> : <Copy size={11} />}
                                        {c.hex}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Swatch Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
                        {palette.map((c, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3.5 rounded-xl p-3.5 text-left transition-transform hover:-translate-y-0.5 relative group"
                                style={{ background: panel, border: `1px solid ${border}` }}
                            >
                                <div
                                    className="rounded-lg flex-shrink-0 cursor-pointer relative"
                                    style={{
                                        width: "50px",
                                        height: "50px",
                                        background: simulateColorBlind(c.hex, cbMode),
                                        border: "1px solid rgba(0,0,0,0.12)",
                                    }}
                                    onClick={() => copyHex(c.hex)}
                                    title="Click to copy hex"
                                >
                                    {c.locked && (
                                        <div className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white">
                                            <Lock size={9} />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="ff-body text-sm font-semibold truncate" style={{ color: textHi }}>
                                        {c.name || nameSwatch(c.hex)}
                                    </div>
                                    <div className="ff-mono text-xs flex items-center gap-1 mt-0.5" style={{ color: textFaint }}>
                                        {c.hex.toUpperCase()} {copiedHex === c.hex && <Check size={12} className="text-green-600" />}
                                    </div>
                                </div>

                                {/* Quick action buttons */}
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleToggleLock(i)}
                                        className="p-1 rounded hover:bg-black/10 text-neutral-600"
                                        title={c.locked ? "Unlock" : "Lock"}
                                    >
                                        {c.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                    </button>
                                    <button
                                        onClick={() => setActiveSwatch(c)}
                                        className="p-1 rounded hover:bg-black/10 text-neutral-600"
                                        title="Color Lab (Ramps & Harmonies)"
                                    >
                                        <Palette size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Export Section */}
            {palette.length > 0 && (
                <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
                    <div className="ff-mono text-sm uppercase tracking-widest mb-4" style={{ color: textFaint }}>
                        export <span className="normal-case opacity-70">· always exports true colors, regardless of vision preview</span>
                    </div>

                    {/* Primary Quick Downloads */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-4">
                        <button
                            onClick={() => setIsCodeModalOpen(true)}
                            className="flex items-center justify-center gap-2 rounded-xl py-3.5 ff-body text-sm font-semibold transition-opacity hover:opacity-85 shadow-xs"
                            style={{ background: textHi, color: "#FFFFFF" }}
                        >
                            <Code size={16} /> Code / CSS / Tokens
                        </button>
                        <button
                            onClick={() => exportSvgCard(palette)}
                            className="flex items-center justify-center gap-2 rounded-xl py-3.5 ff-body text-sm font-semibold transition-opacity hover:opacity-85 shadow-xs"
                            style={{ background: textHi, color: "#FFFFFF" }}
                        >
                            <Download size={16} /> SVG Swatch Card
                        </button>
                        <button
                            onClick={() => exportSwatchSheetImage(palette, "png")}
                            className="flex items-center justify-center gap-2 rounded-xl py-3.5 ff-body text-sm font-semibold transition-opacity hover:opacity-85 shadow-xs"
                            style={{ background: textHi, color: "#FFFFFF" }}
                        >
                            <Download size={16} /> Swatch Sheet PNG
                        </button>
                        <button
                            onClick={downloadJson}
                            className="flex items-center justify-center gap-2 rounded-xl py-3.5 ff-body text-sm font-semibold transition-opacity hover:opacity-85 shadow-xs"
                            style={{ background: textHi, color: "#FFFFFF" }}
                        >
                            <Download size={16} /> JSON Data
                        </button>
                    </div>

                    {/* Creative Apps Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Photoshop / Clip Studio / Fresco (.aco) */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>
                                    Photoshop / Clip Studio
                                </span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>Adobe Swatch file (.aco)</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <button
                                onClick={() => exportAco(palette)}
                                className="mt-auto ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                            >
                                Download .aco
                            </button>
                        </div>

                        {/* Adobe Swatch Exchange (.ase) */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>
                                    Illustrator / InDesign
                                </span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>Adobe Swatch Exchange (.ase)</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <button
                                onClick={() => exportAse(palette)}
                                className="mt-auto ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                            >
                                Download .ase
                            </button>
                        </div>

                        {/* Procreate (.swatches) */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>Procreate</span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>Native .swatches zip format</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <button
                                onClick={() => exportProcreate(palette)}
                                className="mt-auto ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                            >
                                Download .swatches
                            </button>
                        </div>

                        {/* Aseprite & Pixel Art (.pal / .gpl) */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>
                                    Aseprite / Pixel Art
                                </span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>JASC-PAL (.pal) & GIMP (.gpl)</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <div className="mt-auto flex gap-2">
                                <button
                                    onClick={() => exportJascPal(palette)}
                                    className="flex-1 ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                                >
                                    .pal
                                </button>
                                <button
                                    onClick={() => exportGpl(palette, "Aseprite Palette")}
                                    className="flex-1 ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                                >
                                    .gpl
                                </button>
                            </div>
                        </div>

                        {/* GIMP / Krita / Blender (.gpl) */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>
                                    GIMP / Krita / Blender
                                </span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>.gpl palette file</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <button
                                onClick={() => exportGpl(palette)}
                                className="mt-auto ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                            >
                                Download .gpl
                            </button>
                        </div>

                        {/* Figma / Penpot Tokens JSON */}
                        <div className="rounded-xl p-5 flex flex-col gap-3.5" style={{ background: panel, border: `1px solid ${border}` }}>
                            <div className="flex items-center gap-2">
                                <FileDown size={18} style={{ color: textLo }} />
                                <span className="ff-body text-base font-semibold" style={{ color: textHi }}>
                                    Figma / Penpot Tokens
                                </span>
                            </div>
                            <span className="ff-mono text-xs" style={{ color: textFaint }}>W3C Design Tokens JSON</span>
                            <div className="flex gap-1.5 my-1 flex-wrap">
                                {palette.slice(0, 8).map((c, i) => (
                                    <div key={i} className="rounded-full" style={{ width: "16px", height: "16px", background: c.hex }} />
                                ))}
                            </div>
                            <button
                                onClick={() => exportFigmaTokens(palette)}
                                className="mt-auto ff-body text-xs font-medium rounded-lg py-2.5 transition-opacity hover:opacity-85 bg-black text-white"
                            >
                                Download Tokens JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Color Lab Modal (Shading Ramp & Harmonies) */}
            <ColorLabModal
                activeSwatch={activeSwatch}
                onClose={() => setActiveSwatch(null)}
                onAddColor={handleAddColorFromLab}
                copiedHex={copiedHex}
                onCopyHex={copyHex}
                border={border}
                panel={panel}
                panelLight={panelLight}
                textHi={textHi}
                textLo={textLo}
                textFaint={textFaint}
            />

            {/* Saved Palettes Drawer */}
            <SavedPalettesDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                palettes={savedPalettes}
                onSaveCurrent={handleSavePalette}
                onLoadPalette={handleLoadPalette}
                onDeletePalette={handleDeletePalette}
                currentPalette={palette}
                border={border}
                panel={panel}
                textHi={textHi}
                textLo={textLo}
                textFaint={textFaint}
            />

            {/* Auth / Google Sign-In Modal */}
            {isAuthOpen && (
                <AuthModal
                    user={user}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onClose={() => setIsAuthOpen(false)}
                    border={border}
                    panel={panel}
                    textHi={textHi}
                    textLo={textLo}
                    textFaint={textFaint}
                />
            )}

            {/* Code & Developer Export Modal */}
            <CodeExportModal
                isOpen={isCodeModalOpen}
                onClose={() => setIsCodeModalOpen(false)}
                palette={palette}
                border={border}
                textHi={textHi}
                textLo={textLo}
            />
        </div>
    );
}