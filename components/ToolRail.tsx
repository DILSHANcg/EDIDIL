

import React, { useMemo } from 'react';
import { Icon } from './Icon';
// FIX: Import IconProps type to resolve 'Cannot find name' error.
import type { IconProps } from './Icon';
import { Tool, InpaintTool } from '../types';
import { BrushControls } from './BrushControls';

interface ToolRailProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  disabled: boolean;
  activeInpaintTool: InpaintTool;
  setActiveInpaintTool: (tool: InpaintTool) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  isMaskVisible: boolean;
  setIsMaskVisible: (visible: boolean) => void;
  promptTemplates: string[];
  pickedColor: string;
}

const ToolButton: React.FC<{
  label: string;
  icon: IconProps['icon'];
  isActive: boolean;
  onClick: () => void;
  disabled: boolean;
}> = ({ label, icon, isActive, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={label}
    className={`w-full h-16 flex items-center justify-center neumorphic-button ${isActive ? 'active' : ''}`}
    aria-label={label}
    aria-pressed={isActive}
  >
    <Icon icon={icon} className="w-7 h-7" />
  </button>
);

const ColorPreview: React.FC<{ color: string }> = ({ color }) => (
    <div className="neumorphic-panel p-3 animate-fadeIn flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full" style={{ backgroundColor: color, border: '4px solid var(--color-bg-mid)', boxShadow: 'var(--neumorphic-shadow-outset-sm)' }}></div>
        <p className="font-mono text-sm bg-gray-900/50 px-2 py-0.5 rounded border border-white/10 text-slate-200">{color}</p>
    </div>
);


export const ToolRail: React.FC<ToolRailProps> = ({ 
  activeTool, 
  setActiveTool, 
  disabled, 
  activeInpaintTool, 
  setActiveInpaintTool, 
  brushSize, 
  setBrushSize,
  prompt,
  setPrompt,
  isMaskVisible,
  setIsMaskVisible,
  promptTemplates,
  pickedColor,
}) => {

  const showBrushControls = (activeTool === Tool.INPAINT || activeTool === Tool.MAGIC_ERASE) && !disabled;
  const showPrompt = activeTool === Tool.INPAINT && !disabled;
  const placeholder = useMemo(() => promptTemplates[Math.floor(Math.random() * promptTemplates.length)], [promptTemplates]);

  return (
    <aside className="w-80 flex-shrink-0 h-full flex flex-col gap-3 animate-fadeIn">
      <div className="neumorphic-panel p-2 grid grid-cols-2 gap-2">
        <ToolButton label="Inpaint" icon="brush" isActive={activeTool === Tool.INPAINT} onClick={() => setActiveTool(Tool.INPAINT)} disabled={disabled} />
        <ToolButton label="Magic Erase" icon="magicErase" isActive={activeTool === Tool.MAGIC_ERASE} onClick={() => setActiveTool(Tool.MAGIC_ERASE)} disabled={disabled} />
        <ToolButton label="Expand" icon="frame" isActive={activeTool === Tool.EXPAND} onClick={() => setActiveTool(Tool.EXPAND)} disabled={disabled} />
        <ToolButton label="Crop" icon="crop" isActive={activeTool === Tool.CROP} onClick={() => setActiveTool(Tool.CROP)} disabled={disabled} />
        <ToolButton label="Eyedropper" icon="eyedropper" isActive={activeTool === Tool.EYEDROPPER} onClick={() => setActiveTool(Tool.EYEDROPPER)} disabled={disabled} />
        <ToolButton label="Text" icon="text" isActive={activeTool === Tool.TEXT} onClick={() => setActiveTool(Tool.TEXT)} disabled={disabled} />
      </div>
      
      {activeTool === Tool.EYEDROPPER && <ColorPreview color={pickedColor} />}

      {showBrushControls && (
        <div className="neumorphic-panel p-3 animate-fadeIn flex flex-col gap-4">
           <BrushControls
              activeInpaintTool={activeInpaintTool}
              setActiveInpaintTool={setActiveInpaintTool}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
           />
           <button 
              onClick={() => setIsMaskVisible(!isMaskVisible)}
              className="w-full h-9 flex items-center justify-center gap-2 neumorphic-button"
            >
              <Icon icon={isMaskVisible ? 'eye' : 'eye-off'} className="w-4 h-4" />
              <span className="text-sm font-semibold">{isMaskVisible ? 'Hide Mask' : 'Show Mask'}</span>
            </button>
        </div>
      )}
      {showPrompt && (
        <div className="neumorphic-panel p-3 animate-fadeIn flex-grow flex flex-col gap-2">
            <label htmlFor="prompt-input" className="text-sm font-semibold text-slate-300 px-1">Prompt</label>
            <textarea
                id="prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                className="w-full flex-grow bg-gray-900/50 border-none rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200 resize-none"
                disabled={disabled}
            />
        </div>
      )}
    </aside>
  );
};