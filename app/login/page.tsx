"use client";

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { Loader2, Mail, Lock, Phone, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAuthError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/');
                router.refresh();
            } else {
                if (password !== confirmPassword) {
                    setAuthError("Passwords do not match");
                    setIsLoading(false);
                    return;
                }
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                            phone_number: phone,
                        },
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;

                if (data.session) {
                    router.push('/');
                    router.refresh();
                } else {
                    setAuthError("Account created! Please verify your email.");
                    setIsLogin(true); // Switch back to login view
                }
            }
        } catch (error: any) {
            console.error(isLogin ? "Failed to login" : "Failed to sign up", error);
            setAuthError(error.message || "An authentication error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setAuthError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to login", error);
            setAuthError(error.message || "Google Sign-In is not configured yet.");
            setIsLoading(false);
        }
    };

    return (
        <main className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center p-3 sm:p-6 overflow-hidden overscroll-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}>
            {/* Decorative Blur Elements - Pinned beneath scrolling content */}
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0 transform-gpu" style={{ backgroundColor: 'var(--blur-1)' }}></div>
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[150px] pointer-events-none z-0 transform-gpu" style={{ backgroundColor: 'var(--blur-2)' }}></div>

            <div className="w-full max-w-sm relative z-10 flex flex-col justify-center h-full">
                <MotionConfig transition={{ duration: 0.4, ease: "easeInOut" }}>
                    <motion.div
                        layout
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="w-full max-w-sm p-5 sm:p-7 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col items-center border transition-colors duration-300"
                        style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border)' }}
                    >
                    <div className="relative w-10 h-10 flex items-center justify-center mb-3">
                        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13.5 6.5L19.5 10V17L13.5 20.5L7.5 17V10L13.5 6.5Z" className="fill-amber-400" />
                            <path d="M26.5 6.5L32.5 10V17L26.5 20.5L20.5 17V10L26.5 6.5Z" className="fill-yellow-400" />
                            <path d="M20 17.5L26 21V28L20 31.5L14 28V21L20 17.5Z" className="fill-orange-400" />
                        </svg>
                    </div>

                    <h1 className="text-xl md:text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
                        {isLogin ? 'Welcome back' : 'Create an Account'}
                    </h1>
                    <p className="text-[10px] md:text-xs mb-3 text-center font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>
                        {isLogin
                            ? 'Smart Trading analysis awaits. Please sign in.'
                            : 'Sign up to start tracking your trading history securely.'}
                    </p>

                    <motion.form layout transition={{ duration: 0.4, ease: "easeInOut" }} onSubmit={handleAuth} className="w-full flex flex-col gap-2 mb-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold ml-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl px-9 py-2.5 text-xs focus:outline-none transition-all"
                                    style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-primary)'
                                    }}
                                    required
                                />
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {!isLogin && (
                                <motion.div
                                    key="signupExtraInputs"
                                    initial={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                                    animate={{ opacity: 1, height: "auto", scale: 1, marginTop: 4, marginBottom: 4 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                                    className="flex flex-col gap-2 overflow-hidden"
                                >
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold ml-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="John Doe"
                                                className="w-full rounded-xl px-9 py-2.5 text-xs focus:outline-none transition-all"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)'
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold ml-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+1 (555) 000-0000"
                                                className="w-full rounded-xl px-9 py-2.5 text-xs focus:outline-none transition-all"
                                                style={{
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)'
                                                }}
                                                required
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold ml-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-xl px-9 py-2.5 text-xs focus:outline-none transition-all"
                                    style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-primary)'
                                    }}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {!isLogin && (
                                <motion.div
                                    key="confirmInput"
                                    initial={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                                    animate={{ opacity: 1, height: "auto", scale: 1, marginTop: 4, marginBottom: 4 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95, margin: 0 }}
                                    className="flex flex-col gap-1 overflow-hidden"
                                >
                                    <label className="text-[10px] font-bold ml-1 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full rounded-xl px-9 py-2.5 text-xs focus:outline-none transition-all"
                                            style={{
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-primary)'
                                            }}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            layout
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative flex items-center justify-center gap-2 px-6 py-2.5 mt-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{isLogin ? 'Sign In' : 'Sign Up'}</span>
                        </motion.button>

                        <AnimatePresence>
                            {authError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                    className="w-full rounded-xl px-4 py-2 mt-2 text-xs text-center border font-semibold flex items-center justify-center"
                                    style={{
                                        backgroundColor: authError.includes("created") ? 'var(--win-bg)' : 'var(--loss-bg)',
                                        borderColor: authError.includes("created") ? 'var(--win-border)' : 'var(--loss-border)',
                                        color: authError.includes("created") ? 'var(--win)' : 'var(--loss)',
                                    }}
                                >
                                    {authError}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.form>

                        <motion.div layout transition={{ duration: 0.4, ease: "easeInOut" }} className="relative w-full flex items-center mb-3">
                            <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }}></div>
                            <span className="px-3 text-[9px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>OR</span>
                            <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }}></div>
                        </motion.div>

                        <motion.button
                            layout
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            type="button"
                            className="w-full relative flex items-center justify-center gap-2 px-6 py-2.5 mb-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        <span>Continue with Google</span>
                    </motion.button>

                    <motion.p layout transition={{ duration: 0.4, ease: "easeInOut" }} className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setConfirmPassword(''); setPhone(''); }}
                            className="font-bold transition-colors ml-1 uppercase tracking-wide text-[10px] cursor-pointer hover:opacity-80"
                            style={{ color: 'var(--accent)' }}
                        >
                            {isLogin ? 'Sign Up' : 'Log In'}
                        </button>
                    </motion.p>
                </motion.div>
            </MotionConfig>
            </div>
        </main>
    );
}
