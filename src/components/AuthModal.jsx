import React, { useState } from "react";
import { X, LogOut } from "lucide-react";

export default function AuthModal({
    user,
    onLogin,
    onLogout,
    onClose,
    border,
    panel,
    textHi,
    textLo,
    textFaint,
}) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");

    const handleGoogleSimulate = (e) => {
        e.preventDefault();
        const userEmail = email.trim() || "artist@gmail.com";
        const userName = name.trim() || userEmail.split("@")[0];
        const newUser = {
            id: `usr_${Date.now()}`,
            name: userName,
            email: userEmail,
            avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(userEmail)}`,
        };
        onLogin(newUser);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-5 relative"
                style={{ background: "#E2E2E2", border: `1px solid ${border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <h3 className="ff-display text-2xl font-bold" style={{ color: textHi }}>
                        {user ? "Your Account" : "Sign In to Pretty Palette"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                        style={{ color: textLo }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {user ? (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3.5 p-3 rounded-xl border border-black/10" style={{ background: panel }}>
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-12 h-12 rounded-full border border-black/10 bg-white object-cover"
                            />
                            <div className="min-w-0">
                                <div className="ff-body font-semibold text-base truncate" style={{ color: textHi }}>
                                    {user.name}
                                </div>
                                <div className="ff-mono text-xs truncate" style={{ color: textFaint }}>
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <p className="ff-body text-xs leading-relaxed" style={{ color: textLo }}>
                            Your saved palettes and tags are synced with your account. You can access your collections anytime from this device.
                        </p>

                        <button
                            onClick={() => {
                                onLogout();
                                onClose();
                            }}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors ff-mono text-xs font-semibold mt-2"
                        >
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleGoogleSimulate} className="flex flex-col gap-4">
                        <p className="ff-body text-xs leading-relaxed" style={{ color: textLo }}>
                            Sign in with your Gmail to save palettes, organize them with custom tags, and access them across sessions.
                        </p>

                        {/* One-Click Google Action */}
                        <button
                            type="button"
                            onClick={handleGoogleSimulate}
                            className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-black/15 shadow-xs transition-all hover:bg-white bg-white/80 font-medium text-sm ff-body text-[#1F1F1F]"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            <span>Continue with Google</span>
                        </button>

                        <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-black/15" />
                            <span className="ff-mono text-[10px] uppercase text-neutral-500">or enter email</span>
                            <div className="flex-1 h-px bg-black/15" />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <div>
                                <label className="ff-mono text-[11px] block mb-1" style={{ color: textFaint }}>
                                    Gmail Address
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="yourname@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 ff-body text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                />
                            </div>
                            <div>
                                <label className="ff-mono text-[11px] block mb-1" style={{ color: textFaint }}>
                                    Display Name (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Nitya"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/15 ff-body text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="mt-2 py-3 rounded-xl font-medium text-sm ff-body text-white bg-black hover:opacity-85 transition-opacity"
                        >
                            Sign In / Save Profile
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
