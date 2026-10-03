import React from 'react';
import defaultAppLogo from '../assets/images/favicon.svg';

interface LogoProps {
  className?: string;
  id?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = "w-20 h-20",
  id
}) => {
  return (
    <div
      className={`relative ${className} overflow-hidden flex items-center justify-center rounded-xl bg-transparent p-0.5`}
    >
      <img
        id={id}
        src={defaultAppLogo}
        alt="Media Intelligence Monitoring System"
        className="w-full h-full object-contain origin-center transition duration-300 transform-gpu scale-100"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
