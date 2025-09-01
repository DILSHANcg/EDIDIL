
import React, { useMemo } from 'react';
import { Icon } from './Icon';
import { InpaintTool } from '../types';

interface BrushControlsProps {
  activeInpaintTool: InpaintTool;
  setActiveInpaintTool: (tool: InpaintTool) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

export const BrushControls: React.FC<BrushControlsProps> = ({
  activeInpaintTool,
  setActiveInpaintTool,
  brushSize,
  setBrushSize,
}) => {
  const sliderStyle = useMemo(() => ({
      '--track-fill': `${brushSize}%`,
      '--track-bg': 'linear-gradient(90deg, #ec4899, #f472b6)',
  }), [brushSize]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="w-full flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl segmented-control">
        <button
          onClick={() => setActiveInpaintTool(InpaintTool.BRUSH)}
          className={`w-full h-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${activeInpaintTool === InpaintTool.BRUSH ? 'active' : 'text-slate-300 hover:bg-slate-700/50'}`}
          aria-label="Select Brush Tool"
          aria-pressed={activeInpaintTool === InpaintTool.BRUSH}
        >
          <Icon icon="brush" className="w-4 h-4" />
          <span className="text-xs font-semibold">Brush</span>
        </button>
        <button
          onClick={() => setActiveInpaintTool(InpaintTool.ERASER)}
          className={`w-full h-8 rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${activeInpaintTool === InpaintTool.ERASER ? 'active' : 'text-slate-300 hover:bg-slate-700/50'}`}
          aria-label="Select Eraser Tool"
          aria-pressed={activeInpaintTool === InpaintTool.ERASER}
        >
          <Icon icon="eraser" className="w-4 h-4" />
           <span className="text-xs font-semibold">Eraser</span>
        </button>
      </div>
      <div className="w-full flex flex-col items-center gap-2">
        <div className="w-full flex justify-between items-center text-sm">
            <label htmlFor="brush-size" className="font-medium text-slate-300">Size</label>
            <span className="text-xs font-mono text-slate-400">{brushSize}</span>
        </div>
        <input
          id="brush-size"
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full custom-slider"
          style={sliderStyle as React.CSSProperties}
        />
      </div>
    </div>
  );
};
