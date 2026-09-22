import React, { useState } from "react";
import { X, Trash2, Bookmark, Search, Tag, Share2, Check, ArrowRight } from "lucide-react";
import { getShareableUrl } from "../utils/urlState";

export default function SavedPalettesDrawer({
    isOpen,
    onClose,
    palettes,
    onSaveCurrent,
    onLoadPalette,
    onDeletePalette,
    currentPalette,
    border,
    panel,
    textHi,
    textLo,
    textFaint,
}) {
    const [title, setTitle] = useState("");
    const [tagInput, setTagInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTag, setSelectedTag] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    if (!isOpen) return null;

    // Collect unique tags
    const allTags = Array.from(new Set(palettes.flatMap((p) => p.tags || [])));

    // Filter palettes
    const filteredPalettes = palettes.filter((p) => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTag = selectedTag ? (p.tags || []).includes(selectedTag) : true;
        return matchesSearch && matchesTag;
    });

    const handleSave = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const tags = tagInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        onSaveCurrent(title.trim(), tags);
        setTitle("");
        setTagInput("");
    };

    const handleCopyShare = (palette) => {
        const url = getShareableUrl(palette.colors);
        navigator.clipboard?.writeText(url);
        setCopiedId(palette.id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
            <div
                className="w-full max-w-md h-full shadow-2xl p-6 flex flex-col gap-5 overflow-y-auto"
                style={{ background: "#E2E2E2", borderLeft: `1px solid ${border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bookmark size={20} style={{ color: textHi }} />
                        <h3 className="ff-display text-2xl font-bold" style={{ color: textHi }}>
                            Saved Palettes
                        </h3>
                        <span className="ff-mono text-xs px-2 py-0.5 rounded-full bg-black/10 font-bold" style={{ color: textHi }}>
                            {palettes.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                        style={{ color: textLo }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Save Current Section */}
                {currentPalette && currentPalette.length > 0 && (
                    <form onSubmit={handleSave} className="p-4 rounded-xl border border-black/10 flex flex-col gap-3" style={{ background: panel }}>
                        <div className="ff-mono text-xs uppercase font-semibold tracking-wider" style={{ color: textLo }}>
                            Save Current Palette
                        </div>

                        {/* Preview miniature swatches */}
                        <div className="flex h-5 rounded-md overflow-hidden border border-black/10">
                            {currentPalette.map((c, i) => (
                                <div key={i} className="flex-1 h-full" style={{ background: c.hex }} title={c.hex} />
                            ))}
                        </div>

                        <input
                            type="text"
                            required
                            placeholder='Palette Name (e.g. "Bowling Night ₊˚⊹")'
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-black/15 ff-body text-xs bg-white/70 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                        />

                        <input
                            type="text"
                            placeholder="Tags, comma-separated (e.g. Neon, Retro)"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-black/15 ff-body text-xs bg-white/70 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                        />

                        <button
                            type="submit"
                            className="py-2 px-4 rounded-lg ff-mono text-xs font-semibold bg-black text-white hover:opacity-85 transition-opacity flex items-center justify-center gap-1.5"
                        >
                            <Bookmark size={13} /> Save Palette
                        </button>
                    </form>
                )}

                {/* Search & Tags */}
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textFaint }} />
                        <input
                            type="text"
                            placeholder="Search saved palettes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-black/15 ff-body text-xs bg-white/60 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                        />
                    </div>

                    {allTags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => setSelectedTag(null)}
                                className={`ff-mono text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                    selectedTag === null ? "bg-black text-white border-black" : "bg-white/60 text-neutral-600 border-black/10"
                                }`}
                            >
                                All
                            </button>
                            {allTags.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                                    className={`ff-mono text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                        selectedTag === t ? "bg-black text-white border-black" : "bg-white/60 text-neutral-600 border-black/10"
                                    }`}
                                >
                                    <Tag size={9} /> {t}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Palettes List */}
                <div className="flex-1 flex flex-col gap-3">
                    {filteredPalettes.length === 0 ? (
                        <div className="text-center py-10 ff-body text-xs" style={{ color: textFaint }}>
                            {palettes.length === 0 ? "No saved palettes yet. Save one above to access it anytime!" : "No palettes match your search."}
                        </div>
                    ) : (
                        filteredPalettes.map((p) => (
                            <div
                                key={p.id}
                                className="p-3.5 rounded-xl border border-black/10 flex flex-col gap-2.5 transition-all hover:border-black/30"
                                style={{ background: panel }}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h4 className="ff-display font-bold text-base leading-snug" style={{ color: textHi }}>
                                            {p.title}
                                        </h4>
                                        <span className="ff-mono text-[10px]" style={{ color: textFaint }}>
                                            {new Date(p.createdAt).toLocaleDateString()} · {p.colors.length} colors
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleCopyShare(p)}
                                            className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                                            title="Copy share link"
                                            style={{ color: textLo }}
                                        >
                                            {copiedId === p.id ? <Check size={14} className="text-green-600" /> : <Share2 size={14} />}
                                        </button>
                                        <button
                                            onClick={() => onDeletePalette(p.id)}
                                            className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                                            title="Delete palette"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Swatches Ribbon */}
                                <div className="flex h-7 rounded-lg overflow-hidden border border-black/10">
                                    {p.colors.map((c, i) => (
                                        <div key={i} className="flex-1 h-full" style={{ background: c.hex }} title={`${c.name || c.hex}`} />
                                    ))}
                                </div>

                                {/* Tags & Load Button */}
                                <div className="flex items-center justify-between gap-2 pt-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {(p.tags || []).map((t) => (
                                            <span key={t} className="ff-mono text-[9px] px-1.5 py-0.5 rounded bg-black/5" style={{ color: textFaint }}>
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            onLoadPalette(p.colors);
                                            onClose();
                                        }}
                                        className="ff-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-black text-white hover:opacity-85 transition-opacity flex items-center gap-1 ml-auto"
                                    >
                                        Load <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
