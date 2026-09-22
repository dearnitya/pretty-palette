import React, { useState } from "react";
import { X, Copy, Check, Code, FileCode, Layers } from "lucide-react";
import { generateTailwindConfig, generateCssVariables } from "../utils/exportFormats";

export default function CodeExportModal({
    isOpen,
    onClose,
    palette,
    border,
    textHi,
    textLo,
}) {
    const [tab, setTab] = useState("tailwind"); // 'tailwind' | 'css' | 'tokens'
    const [copied, setCopied] = useState(false);

    if (!isOpen || !palette) return null;

    let codeString = "";
    if (tab === "tailwind") {
        codeString = generateTailwindConfig(palette);
    } else if (tab === "css") {
        codeString = generateCssVariables(palette);
    } else {
        const tokens = {
            color: {
                palette: {}
            }
        };
        palette.forEach((c, i) => {
            const key = (c.name || "color").toLowerCase().replace(/[^a-z0-9]+/g, "-") + `-${i + 1}`;
            tokens.color.palette[key] = {
                value: c.hex,
                type: "color",
            };
        });
        codeString = JSON.stringify(tokens, null, 2);
    }

    const handleCopy = () => {
        navigator.clipboard?.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn" onClick={onClose}>
            <div
                className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh]"
                style={{ background: "#E2E2E2", border: `1px solid ${border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Code size={20} style={{ color: textHi }} />
                        <h3 className="ff-display text-2xl font-bold" style={{ color: textHi }}>
                            Developer & Token Export
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/10 transition-colors" style={{ color: textLo }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-black/10 pb-2">
                    <button
                        onClick={() => setTab("tailwind")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ff-mono text-xs font-medium transition-all ${
                            tab === "tailwind" ? "bg-black text-white" : "hover:bg-black/5 text-neutral-600"
                        }`}
                    >
                        <Layers size={13} /> Tailwind Config
                    </button>
                    <button
                        onClick={() => setTab("css")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ff-mono text-xs font-medium transition-all ${
                            tab === "css" ? "bg-black text-white" : "hover:bg-black/5 text-neutral-600"
                        }`}
                    >
                        <FileCode size={13} /> CSS Variables
                    </button>
                    <button
                        onClick={() => setTab("tokens")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ff-mono text-xs font-medium transition-all ${
                            tab === "tokens" ? "bg-black text-white" : "hover:bg-black/5 text-neutral-600"
                        }`}
                    >
                        <Code size={13} /> Figma / Penpot Tokens
                    </button>

                    <button
                        onClick={handleCopy}
                        className="ml-auto ff-mono text-xs font-semibold px-3 py-1.5 rounded-lg bg-black text-white hover:opacity-85 transition-opacity flex items-center gap-1.5"
                    >
                        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        <span>{copied ? "Copied!" : "Copy Code"}</span>
                    </button>
                </div>

                {/* Code Block */}
                <div className="relative rounded-xl overflow-hidden border border-black/10 bg-[#1E1E1E] text-neutral-200 p-4 font-mono text-xs overflow-x-auto max-h-[380px]">
                    <pre>
                        <code>{codeString}</code>
                    </pre>
                </div>
            </div>
        </div>
    );
}
