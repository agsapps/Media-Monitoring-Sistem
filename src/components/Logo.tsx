import React, { useRef } from 'react';
import { useAppState } from '../AppContext';
import { Upload } from 'lucide-react';

interface LogoProps {
  className?: string;
  id?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12", id }) => {
  const { user, settings, saveSettings } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLogoUrl = settings?.logoUrl || "https://www.image2url.com/r2/default/images/1780156246537-cd69ae8e-001c-4401-bc28-6450bd31ace9.png";
  const isAdmin = user?.role === 'Admin';

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isAdmin) {
      e.stopPropagation();
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran file logo terlalu besar. Maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      if (base64String) {
        try {
          await saveSettings({ logoUrl: base64String });
        } catch (error) {
          console.error("Gagal menyimpan logo baru:", error);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const isCustomLogo = !!settings?.logoUrl;

  return (
    <div className={`relative group ${className} overflow-hidden flex items-center justify-center rounded-xl bg-transparent`}>
      <img 
        id={id}
        src={activeLogoUrl} 
        alt="Logo" 
        className={`w-full h-full object-contain origin-center transition duration-300 transform-gpu ${isCustomLogo ? 'scale-[1.05]' : 'scale-[3.10]'}`}
        referrerPolicy="no-referrer"
      />
      
      {isAdmin && (
        <>
          <div 
            onClick={handleLogoClick}
            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white gap-0.5 z-10"
            title="Klik untuk mengganti logo instansi"
          >
            <Upload className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-200">Ganti</span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </>
      )}
    </div>
  );
};

