import React from 'react';

interface LogoProps {
  className?: string;
  id?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12", id }) => {
  return (
    <div className={`${className} overflow-hidden flex items-center justify-center rounded-xl bg-transparent`}>
      <img 
        id={id}
        src="https://www.image2url.com/r2/default/images/1780156246537-cd69ae8e-001c-4401-bc28-6450bd31ace9.png" 
        alt="Logo" 
        className="w-full h-full object-contain scale-[2.70] origin-center transition duration-300 transform-gpu"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
