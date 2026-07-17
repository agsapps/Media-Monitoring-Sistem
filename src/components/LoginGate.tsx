import React, { useState } from 'react';
import { useAppState } from '../AppContext';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { 
  Lock, User, Eye, EyeOff, ShieldAlert
} from 'lucide-react';

export const LoginGate: React.FC = () => {
  const { login, settings } = useAppState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await login(username, password);
      if (!success) {
        setErrorMsg('Username atau password yang dimasukkan tidak valid.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 px-4 w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white dark:bg-[#121118]/90 border border-slate-200 dark:border-white/5 rounded-[24px] shadow-2xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-white/5 p-3 flex items-center justify-center shadow-md mb-3.5 animate-fade-in">
            <Logo className="w-18 h-18" />
          </div>
          <h2 className="text-xl font-black font-display text-slate-900 dark:text-white tracking-tight uppercase leading-none">
            LOGIN
          </h2>
          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mt-1.5">
            {settings.companyName || 'Media Intelligence Monitoring'}
          </p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2.5"
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Kunci Pengguna (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/70 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all font-medium disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
              Sandi Keamanan (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/70 focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700 transition-all font-mono disabled:opacity-50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-800 dark:hover:bg-violet-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-blue-700/10 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
          >
            {loading ? 'Mengotentikasi...' : 'Masuk Portal'}
          </button>
        </form>

        <p className="mt-5 text-[10px] text-center text-slate-400 dark:text-slate-500 tracking-wide leading-relaxed font-semibold">
          Otoritas Log aktivitas data anda akan dicatat.
        </p>
      </motion.div>
    </div>
  );
};
