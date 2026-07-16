import React, { useState } from 'react';
import { useAppState } from '../AppContext';
import { Key, UserCheck, X } from 'lucide-react';
import { Logo } from './Logo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAppState();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    
    if (success) {
      onClose();
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
        {/* Banner */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />
        
        {/* Header */}
        <div className="p-6 pb-4">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" id="auth-modal-close-icon"/>
          </button>
          
          <div className="flex flex-col items-center text-center pb-2">
            <div className="w-32 h-32 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-xs rounded-3xl border border-slate-100 dark:border-slate-800 p-4 flex items-center justify-center shadow-xs mb-3">
              <Logo className="w-24 h-24" id="auth-modal-wolf-logo" />
            </div>
            <h2 className="text-xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">Autentikasi Portal</h2>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Sesi Kredensial Diperlukan</p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-0 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">USERNAME</label>
            <div className="relative">
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan username" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">PASSWORD</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Portal'}
          </button>
        </form>
      </div>
    </div>
  );
};
