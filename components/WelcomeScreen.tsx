import React from 'react';
import { Icon } from './Icon';

interface WelcomeScreenProps {
  onImageUpload: (file: File) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onImageUpload }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      onImageUpload(event.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-8 text-center" onDrop={handleDrop} onDragOver={handleDragOver}>
       <div className="flex items-center gap-2 mb-4 text-slate-200 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <Icon icon="logo" className="w-16 h-16 animate-pulse" />
      </div>
      <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-500 tracking-tight animate-fadeIn" style={{ animationDelay: '0.2s', textShadow: '0 2px 20px hsla(283, 48%, 58%, 0.5)' }}>EDIDIL</h1>
       <p className="text-xl text-slate-400 mb-12 animate-fadeIn" style={{ animationDelay: '0.3s', textShadow: 'var(--shadow-text)' }}>Your Imagination, Reimagined</p>

      <div
        className="w-full max-w-2xl h-64 card-style flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group animate-fadeIn"
        style={{ animationDelay: '0.4s' }}
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pink-500/10 to-transparent transition-transform duration-1000 transform -translate-x-full group-hover:translate-x-full"></div>
        <div 
          className="absolute inset-0 border-2 border-transparent rounded-3xl"
          style={{ animation: 'border-glow 8s linear infinite' }}
        />
        <Icon icon="upload" className="w-16 h-16 text-slate-400 mb-4 transition-transform duration-300 group-hover:scale-110" />
        <p className="text-xl font-semibold text-slate-100" style={{ textShadow: 'var(--shadow-text)' }}>Click to upload or drag & drop</p>
        <p className="text-slate-400 mt-1">PNG, JPG, WebP supported</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
        />
      </div>
    </div>
  );
};