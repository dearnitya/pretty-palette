import React, { useState, useRef, useEffect, useCallback } from "react";
import { Pipette, Crop, X, Check, Sparkles } from "lucide-react";
import { rgbToHex } from "../utils/colorMath";

export default function ImageCanvas({
    imageUrl,
    onPickColor,
    onApplyCrop,
    cropRegion,
    border,
    panel,
    textHi,
    textLo,
    textFaint,
}) {
    const [activeTool, setActiveTool] = useState(null); // 'eyedropper' | 'crop' | null
    const [hoverPos, setHoverPos] = useState(null); // { x, y, hex, rgb }
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [cropStart, setCropStart] = useState(null);
    const [tempCrop, setTempCrop] = useState(null);
    const [pickedAlert, setPickedAlert] = useState(null);

    const containerRef = useRef(null);
    const imgRef = useRef(null);
    const offscreenCanvasRef = useRef(null);

    // Prepare offscreen canvas for pixel inspection
    useEffect(() => {
        if (!imageUrl) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);
            offscreenCanvasRef.current = { canvas, ctx, width: img.naturalWidth, height: img.naturalHeight };
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // Convert client coords on image to natural image coords
    const getImgCoords = useCallback((e) => {
        if (!imgRef.current || !offscreenCanvasRef.current) return null;
        const rect = imgRef.current.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        if (
            clientX < rect.left ||
            clientX > rect.right ||
            clientY < rect.top ||
            clientY > rect.bottom
        ) {
            return null;
        }

        const scaleX = offscreenCanvasRef.current.width / rect.width;
        const scaleY = offscreenCanvasRef.current.height / rect.height;

        const imgX = Math.round((clientX - rect.left) * scaleX);
        const imgY = Math.round((clientY - rect.top) * scaleY);

        return {
            pixelX: Math.max(0, Math.min(offscreenCanvasRef.current.width - 1, imgX)),
            pixelY: Math.max(0, Math.min(offscreenCanvasRef.current.height - 1, imgY)),
            dispX: clientX - rect.left,
            dispY: clientY - rect.top,
            dispWidth: rect.width,
            dispHeight: rect.height,
        };
    }, []);

    // Eyedropper mouse move handler
    const handleMouseMove = (e) => {
        if (!offscreenCanvasRef.current) return;

        if (activeTool === "eyedropper") {
            const coords = getImgCoords(e);
            if (!coords) {
                setHoverPos(null);
                return;
            }
            const { ctx } = offscreenCanvasRef.current;
            const pixel = ctx.getImageData(coords.pixelX, coords.pixelY, 1, 1).data;
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            setHoverPos({
                dispX: coords.dispX,
                dispY: coords.dispY,
                pixelX: coords.pixelX,
                pixelY: coords.pixelY,
                hex,
                rgb: [pixel[0], pixel[1], pixel[2]],
            });
        } else if (activeTool === "crop" && isDraggingCrop && cropStart) {
            const coords = getImgCoords(e);
            if (!coords) return;
            const curX = coords.dispX;
            const curY = coords.dispY;
            const x = Math.min(cropStart.dispX, curX);
            const y = Math.min(cropStart.dispY, curY);
            const width = Math.abs(curX - cropStart.dispX);
            const height = Math.abs(curY - cropStart.dispY);
            setTempCrop({ x, y, width, height });
        }
    };

    const handleMouseLeave = () => {
        if (activeTool === "eyedropper") setHoverPos(null);
        if (isDraggingCrop) setIsDraggingCrop(false);
    };

    const handleMouseDown = (e) => {
        if (activeTool === "crop") {
            const coords = getImgCoords(e);
            if (!coords) return;
            setCropStart(coords);
            setIsDraggingCrop(true);
            setTempCrop({ x: coords.dispX, y: coords.dispY, width: 0, height: 0 });
        }
    };

    const handleMouseUp = () => {
        if (activeTool === "crop" && isDraggingCrop && tempCrop && imgRef.current && offscreenCanvasRef.current) {
            setIsDraggingCrop(false);
            if (tempCrop.width > 10 && tempCrop.height > 10) {
                const rect = imgRef.current.getBoundingClientRect();
                const scaleX = offscreenCanvasRef.current.width / rect.width;
                const scaleY = offscreenCanvasRef.current.height / rect.height;
                const naturalCrop = {
                    x: tempCrop.x * scaleX,
                    y: tempCrop.y * scaleY,
                    width: tempCrop.width * scaleX,
                    height: tempCrop.height * scaleY,
                };
                onApplyCrop(naturalCrop);
            }
            setTempCrop(null);
        }
    };

    const handleClick = () => {
        if (activeTool === "eyedropper" && hoverPos) {
            onPickColor(hoverPos.hex, hoverPos.rgb);
            setPickedAlert(hoverPos.hex);
            setTimeout(() => setPickedAlert(null), 1400);
        }
    };

    // System Eyedropper API (Chrome/Edge/Opera)
    const handleSystemEyeDropper = async () => {
        if (window.EyeDropper) {
            try {
                const dropper = new window.EyeDropper();
                const result = await dropper.open();
                if (result?.sRGBHex) {
                    const hex = result.sRGBHex;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    onPickColor(hex, [r, g, b]);
                    setPickedAlert(hex);
                    setTimeout(() => setPickedAlert(null), 1400);
                }
            } catch {
                // User cancelled or unsupported
            }
        }
    };

    return (
        <div className="flex flex-col gap-2.5 self-start">
            {/* Tool Toolbar */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl w-fit" style={{ background: panel, border: `1px solid ${border}` }}>
                <button
                    onClick={() => setActiveTool(activeTool === "eyedropper" ? null : "eyedropper")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg ff-mono text-xs font-medium transition-all"
                    style={{
                        background: activeTool === "eyedropper" ? textHi : "transparent",
                        color: activeTool === "eyedropper" ? "#FFFFFF" : textLo,
                    }}
                    title="Click image to pick exact color"
                >
                    <Pipette size={14} />
                    <span>Eyedropper</span>
                </button>

                {window.EyeDropper && (
                    <button
                        onClick={handleSystemEyeDropper}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg ff-mono text-xs transition-colors hover:bg-black/5"
                        style={{ color: textFaint }}
                        title="Sample any pixel from your entire screen"
                    >
                        <Sparkles size={13} />
                        <span className="hidden sm:inline">Screen</span>
                    </button>
                )}

                <button
                    onClick={() => setActiveTool(activeTool === "crop" ? null : "crop")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg ff-mono text-xs font-medium transition-all"
                    style={{
                        background: activeTool === "crop" ? textHi : "transparent",
                        color: activeTool === "crop" ? "#FFFFFF" : textLo,
                    }}
                    title="Drag a box to extract colors from a specific region"
                >
                    <Crop size={14} />
                    <span>Focus Region</span>
                </button>

                {cropRegion && (
                    <button
                        onClick={() => onApplyCrop(null)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg ff-mono text-xs text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Reset crop to full image"
                    >
                        <X size={13} />
                        <span>Reset Crop</span>
                    </button>
                )}
            </div>

            {/* Instruction hint */}
            {activeTool === "eyedropper" && (
                <div className="ff-mono text-[11px] flex items-center gap-1 animate-fadeIn" style={{ color: textFaint }}>
                    <span>Hover over the image and click to pin a custom color.</span>
                </div>
            )}
            {activeTool === "crop" && (
                <div className="ff-mono text-[11px] flex items-center gap-1 animate-fadeIn" style={{ color: textFaint }}>
                    <span>Click and drag a box across the artwork to extract from that section.</span>
                </div>
            )}

            {/* Frame & Image */}
            <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden self-start w-fit max-w-full sm:max-w-[360px] md:max-w-[420px] select-none"
                style={{
                    border: `1px solid ${border}`,
                    background: panel,
                    cursor: activeTool === "eyedropper" || activeTool === "crop" ? "crosshair" : "default",
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onClick={handleClick}
            >
                <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="uploaded"
                    className="w-auto h-auto max-w-full max-h-[500px] object-contain block rounded-2xl"
                    draggable={false}
                />

                {/* Magnifier Loupe Overlay for Eyedropper */}
                {activeTool === "eyedropper" && hoverPos && (
                    <div
                        className="pointer-events-none absolute z-30 flex flex-col items-center"
                        style={{
                            left: `${hoverPos.dispX}px`,
                            top: `${hoverPos.dispY}px`,
                            transform: "translate(-50%, -120%)",
                        }}
                    >
                        <div
                            className="w-16 h-16 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative overflow-hidden"
                            style={{ background: hoverPos.hex }}
                        >
                            {/* Crosshair */}
                            <div className="w-full h-px bg-white/60 absolute" />
                            <div className="h-full w-px bg-white/60 absolute" />
                            <div className="w-2.5 h-2.5 rounded-full border border-white/90 bg-transparent z-10" />
                        </div>
                        <div className="mt-1 px-2 py-0.5 rounded ff-mono text-[11px] font-bold shadow-md bg-black/80 text-white">
                            {hoverPos.hex.toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Crop Marquee Box */}
                {activeTool === "crop" && tempCrop && (
                    <div
                        className="absolute pointer-events-none border-2 border-dashed border-white bg-black/25 z-20"
                        style={{
                            left: `${tempCrop.x}px`,
                            top: `${tempCrop.y}px`,
                            width: `${tempCrop.width}px`,
                            height: `${tempCrop.height}px`,
                        }}
                    />
                )}

                {/* Color Added Toast Alert */}
                {pickedAlert && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-black/85 text-white px-3 py-1.5 rounded-full ff-mono text-xs flex items-center gap-1.5 shadow-lg animate-bounce">
                        <Check size={13} className="text-green-400" />
                        <span>Added {pickedAlert.toUpperCase()}!</span>
                    </div>
                )}
            </div>
        </div>
    );
}
