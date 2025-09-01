import React from 'react';
import { Icon } from './Icon';

export const SplashScreen: React.FC = () => {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-black animate-splash-fade-out">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-64 h-64 bg-purple-600 rounded-full blur-3xl opacity-20 animate-pulsate-glow"></div>
        <Icon icon="logo" className="w-32 h-32 animate-logo-zoom-in" />
      </div>
      <h1 
        className="mt-4 text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500 tracking-tight animate-text-fade-in" 
        style={{ textShadow: '0 2px 20px hsla(283, 48%, 58%, 0.5)' }}
      >
        EDIDIL
      </h1>
    </div>
  );
};
