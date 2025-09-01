import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';

type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

interface ExportOptions {
  format: ExportFormat;
  width: number;
  height: number;
  quality: number; // 1-100
}
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
  imageDimensions: { width: number; height: number } | null;
}

const FormatButton: React.FC<{
  label: string;
  format: ExportFormat;
  selectedFormat: ExportFormat;
  onClick: (format: ExportFormat) => void;
}> = ({ label, format, selectedFormat, onClick }) => (
  <button
    onClick={() => onClick(format)}
    className={`px-4 py-2 rounded-lg transition-colors w-full text-center font-semibold ${
      selectedFormat === format
        ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20'
        : 'bg-slate-700/70 text-slate-200 hover:bg-slate-600/70'
    }`}
  >
    {label}
  </button>
);

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, isExporting, imageDimensions }) => {
  const [format, setFormat] = useState<ExportFormat>('image/png');
  const [width, setWidth] = useState(imageDimensions?.width || 1024);
  const [height, setHeight] = useState(imageDimensions?.height || 1024);
  const [quality, setQuality] = useState(95);
  const [isAspectRatioLocked, setIsAspectRatioLocked] = useState(true);
  const aspectRatio = useRef((imageDimensions?.width || 1) / (imageDimensions?.height || 1));
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) setIsShowing(true);
    else setIsShowing(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && imageDimensions) {
      setWidth(imageDimensions.width);
      setHeight(imageDimensions.height);
      aspectRatio.current = imageDimensions.width / imageDimensions.height;
    }
  }, [isOpen, imageDimensions]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10) || 0;
    setWidth(newWidth);
    if (isAspectRatioLocked) {
      setHeight(Math.round(newWidth / aspectRatio.current));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10) || 0;
    setHeight(newHeight);
    if (isAspectRatioLocked) {
      setWidth(Math.round(newHeight * aspectRatio.current));
    }
  };

  const handleExport = () => {
    onExport({ format, width, height, quality });
  };
  
  const qualitySliderStyle = useMemo(() => ({
      '--track-fill': `${quality}%`,
      '--track-bg': 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
  }), [quality]);

  if (!isOpen) return null;

  return (
    <div 
        className={`absolute inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
    >
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'}`}></div>
      <div 
        className={`neumorphic-panel p-8 w-full max-w-lg shadow-2xl transition-all duration-300 ${isShowing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-100">Export Image</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white">
                <Icon icon="close" className="w-4 h-4" />
            </button>
        </div>
        <p className="text-slate-400 mb-6">Choose your desired format and settings to download the image.</p>
        
        <div className="flex flex-col gap-6">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Format</label>
            <div className="grid grid-cols-3 items-center gap-2 bg-slate-900/50 p-1 rounded-xl">
              <FormatButton label="PNG" format="image/png" selectedFormat={format} onClick={setFormat} />
              <FormatButton label="JPG" format="image/jpeg" selectedFormat={format} onClick={setFormat} />
              <FormatButton label="WebP" format="image/webp" selectedFormat={format} onClick={setFormat} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Dimensions</label>
            <div className="flex items-center gap-2">
              <input type="number" value={width} onChange={handleWidthChange} className="neumorphic-input text-center" placeholder="Width" />
              <button onClick={() => setIsAspectRatioLocked(!isAspectRatioLocked)} className="p-2 h-12 w-12 flex-shrink-0 flex items-center justify-center neumorphic-button">
                <Icon icon={isAspectRatioLocked ? 'lock' : 'unlock'} className="w-5 h-5" />
              </button>
              <input type="number" value={height} onChange={handleHeightChange} className="neumorphic-input text-center" placeholder="Height" />
            </div>
          </div>

          {(format === 'image/jpeg' || format === 'image/webp') && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-slate-300">Quality</label>
                <span className="text-xs font-mono bg-gray-900/50 px-2 py-0.5 rounded border border-white/10">{quality}</span>
              </div>
              <input type="range" min="1" max="100" value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full custom-slider" style={qualitySliderStyle as React.CSSProperties} />
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 neumorphic-button font-semibold"
          >
            <span>Cancel</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-3 gradient-button-primary flex items-center justify-center gap-2 w-40"
          >
            {isExporting ? <Icon icon="spinner" className="w-5 h-5 animate-spin"/> : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
};