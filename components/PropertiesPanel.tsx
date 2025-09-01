

import React, { useRef, useMemo, useState } from 'react';
import { ControlInputType, GenerationQuality, AIStylePreset, MagicRelightOption, AIDepthBlurAmount, OneClickAction, Tool, TextLayer } from '../types';
import { Icon } from './Icon';
import type { IconProps } from './Icon';

interface PropertiesPanelProps {
  onUpscale: () => void;
  onRemoveBackground: () => void;
  onRestore: () => void;
  onRetouch: () => void;
  onColorize: () => void;
  onAutoEnhance: () => void;
  onApplyStylePreset: (style: AIStylePreset) => void;
  onMagicRelight: (direction: MagicRelightOption) => void;
  isLoading: boolean;
  hasOriginalImage: boolean;
  quality: GenerationQuality;
  setQuality: (quality: GenerationQuality) => void;
  onApplyPose: () => void;
  onApplyDepthBlur: (amount: AIDepthBlurAmount) => void;
  onExportClick: () => void;
  onPoseReferenceChange: (file: File | null) => void;
  poseReferenceFile: File | null;
  loadingAction: OneClickAction | null;
  
  activeTool: Tool;
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  generatedImage: string | null;
  warmth: number;
  setWarmth: (value: number) => void;
  exposure: number;
  setExposure: (value: number) => void;
  saturation: number;
  setSaturation: (value: number) => void;
  onAccept: () => void;
  onCancel: () => void;
  isAccepting: boolean;

  onApplyCrop: () => void;
  onCancelCrop: () => void;

  selectedTextLayer: TextLayer | null;
  onUpdateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  onApplyText: () => void;
  onDeleteTextLayer: (id: string) => void;
}

const ACTION_ICONS: Record<string, IconProps['icon']> = {
  cinematic: 'clapperboard',
  vintage: 'camera-retro',
  noir: 'moon',
  cyberpunk: 'cpu',
  'neon-glow': 'zap',
  dreamy: 'cloud-drizzle',
  'hdr-realism': 'aperture',
  '3d-render': 'cube',
  cartoon: 'edit-3',
  anime: 'flower-2',
  'oil-painting': 'palette',
  ghibli: 'wind',
  upscale: 'upscale',
  'remove-bg': 'removeBg',
  restore: 'wand',
  retouch: 'bandAid',
  colorize: 'colorizeDroplets',
  'auto-enhance': 'sparkles',
};

const PanelCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`neumorphic-panel p-4 ${className}`}>
        <h3 className="font-bold text-slate-300 mb-3 px-1">{title}</h3>
        {children}
    </div>
);

const ActionChip: React.FC<{
  id: OneClickAction;
  label: string;
  icon: IconProps['icon'];
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}> = ({ id, label, icon, onClick, disabled, isLoading }) => (
    <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className="neumorphic-chip aspect-square flex flex-col items-center justify-center gap-1 p-1 text-center"
    >
        {isLoading ? (
            <Icon icon="spinner" className="w-6 h-6 animate-spin text-pink-400" />
        ) : (
            <Icon icon={icon} className="w-6 h-6" />
        )}
        <span className="text-xs font-semibold tracking-tight">{label}</span>
    </button>
);


const HarmonySlider: React.FC<{ 
    label: string, value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number, gradient: string
}> = ({ label, value, onChange, min = -50, max = 50, step = 1, gradient }) => {
    const fillPercent = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);
    const sliderStyle = useMemo(() => ({'--track-fill': `${fillPercent}%`, '--track-bg': gradient}), [fillPercent, gradient]);

    return (
        <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-center px-1">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <span className="text-xs font-mono bg-gray-900/50 px-2 py-0.5 rounded border border-white/10">{value}</span>
            </div>
            <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full custom-slider" style={sliderStyle as React.CSSProperties} />
        </div>
    );
};

const TextPanel: React.FC<Pick<PropertiesPanelProps, 'selectedTextLayer' | 'onUpdateTextLayer' | 'onApplyText' | 'onDeleteTextLayer'>> = ({ selectedTextLayer, onUpdateTextLayer, onApplyText, onDeleteTextLayer }) => {
    if (!selectedTextLayer) {
        return (
            <PanelCard title="TEXT TOOL">
                <p className="text-sm text-slate-400 px-1">Click on the canvas to add a new text layer, or select an existing one to edit its properties.</p>
            </PanelCard>
        );
    }
    
    const { id, content, fontFamily, fontSize, color, bold, italic, align } = selectedTextLayer;
    const handleUpdate = (updates: Partial<TextLayer>) => onUpdateTextLayer(id, updates);

    const sliderStyle = useMemo(() => ({
      '--track-fill': `${((fontSize - 8) / (128 - 8)) * 100}%`,
      '--track-bg': 'linear-gradient(90deg, #ec4899, #8b5cf6)',
    }), [fontSize]);

    return (
        <div className="flex flex-col h-full">
            <PanelCard title="TEXT PROPERTIES">
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-300 px-1 mb-1 block">Content</label>
                        <textarea value={content} onChange={(e) => handleUpdate({ content: e.target.value })} rows={3} className="w-full bg-gray-900/50 border-none rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200 resize-none" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-300 px-1 mb-1 block">Font</label>
                        <select value={fontFamily} onChange={(e) => handleUpdate({ fontFamily: e.target.value as TextLayer['fontFamily'] })} className="w-full h-10 bg-gray-900/50 border-none rounded-lg px-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <option value="Inter">Inter</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Lora">Lora</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="flex-grow">
                             <div className="flex justify-between items-center text-sm px-1 mb-1">
                                <label className="font-medium text-slate-300">Size</label>
                                <span className="font-mono">{fontSize}px</span>
                             </div>
                             <input type="range" min="8" max="128" value={fontSize} onChange={e => handleUpdate({ fontSize: Number(e.target.value)})} className="w-full custom-slider" style={sliderStyle as React.CSSProperties} />
                         </div>
                         <div className="flex-shrink-0">
                            <label className="text-sm font-medium text-slate-300 px-1 mb-1 block">Color</label>
                            <input type="color" value={color} onChange={e => handleUpdate({ color: e.target.value })} className="w-10 h-10 bg-transparent rounded-lg cursor-pointer" />
                         </div>
                    </div>
                    <div>
                         <label className="text-sm font-medium text-slate-300 px-1 mb-2 block">Style</label>
                         <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-xl">
                            <div className="flex items-center gap-1 bg-slate-700/70 p-1 rounded-lg">
                                <button onClick={() => handleUpdate({ bold: !bold })} className={`w-full h-8 rounded-lg font-bold ${bold ? 'bg-pink-500 text-white' : ''}`}>B</button>
                                <button onClick={() => handleUpdate({ italic: !italic })} className={`w-full h-8 rounded-lg italic ${italic ? 'bg-pink-500 text-white' : ''}`}>I</button>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-700/70 p-1 rounded-lg">
                                <button onClick={() => handleUpdate({ align: 'left' })} className={`w-full h-6 rounded-md ${align === 'left' ? 'bg-pink-500 text-white' : ''}`}>L</button>
                                <button onClick={() => handleUpdate({ align: 'center' })} className={`w-full h-6 rounded-md ${align === 'center' ? 'bg-pink-500 text-white' : ''}`}>C</button>
                                <button onClick={() => handleUpdate({ align: 'right' })} className={`w-full h-6 rounded-md ${align === 'right' ? 'bg-pink-500 text-white' : ''}`}>R</button>
                            </div>
                         </div>
                    </div>
                </div>
            </PanelCard>
            <div className="mt-auto pt-2 flex flex-col gap-3">
                <button onClick={() => onDeleteTextLayer(id)} className="w-full h-12 neumorphic-button font-semibold text-red-400 hover:text-red-300">Delete Layer</button>
                <button onClick={onApplyText} className="w-full h-14 gradient-button-primary">Apply Text to Image</button>
            </div>
        </div>
    )
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = (props) => {
  const { 
    onUpscale, onRemoveBackground, onRestore, onRetouch, onColorize, onAutoEnhance, onApplyStylePreset, onMagicRelight, isLoading, hasOriginalImage,
    quality, setQuality,
    onApplyPose, onApplyDepthBlur, onExportClick, onPoseReferenceChange, poseReferenceFile, loadingAction,
    activeTool, onGenerate, isGenerateDisabled, generatedImage,
    warmth, setWarmth, exposure, setExposure, saturation, setSaturation,
    onAccept, onCancel, isAccepting,
    onApplyCrop, onCancelCrop,
    selectedTextLayer, onUpdateTextLayer, onApplyText, onDeleteTextLayer,
  } = props;
  
  const poseFileInputRef = useRef<HTMLInputElement>(null);
  const [posePreview, setPosePreview] = useState<string | null>(null);

  const handlePoseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          onPoseReferenceChange(file);
          const reader = new FileReader();
          reader.onload = () => setPosePreview(reader.result as string);
          reader.readAsDataURL(file);
      } else {
          onPoseReferenceChange(null);
          setPosePreview(null);
      }
  };

  const isGlobalDisabled = isLoading || !hasOriginalImage;
  const isActionLoading = loadingAction !== null;
  const getButtonDisabled = (action: OneClickAction) => isGlobalDisabled || (isActionLoading && loadingAction !== action);
  const hasGeneratedImage = !!generatedImage;

  if (activeTool === Tool.TEXT) {
    return (
        <aside className="w-[320px] flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2 pb-2 animate-fadeIn">
            <TextPanel 
                selectedTextLayer={selectedTextLayer}
                onUpdateTextLayer={onUpdateTextLayer}
                onApplyText={onApplyText}
                onDeleteTextLayer={onDeleteTextLayer}
            />
        </aside>
    );
  }

  if (activeTool === Tool.CROP) {
    return (
        <aside className="w-[320px] flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2 pb-2 animate-fadeIn">
            <PanelCard title="CROP IMAGE">
                <p className="text-sm text-slate-400 mb-4 px-1">Drag the handles on the canvas to adjust the crop area.</p>
                <div className="grid grid-cols-2 gap-3">
                     <button onClick={onCancelCrop} className="w-full h-12 neumorphic-button font-bold"><span>Cancel</span></button>
                    <button onClick={onApplyCrop} className="w-full h-12 gradient-button-primary">Apply Crop</button>
                </div>
            </PanelCard>
        </aside>
    )
  }

  return (
    <aside className="w-[320px] flex-shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-2 pb-2 animate-fadeIn">
        {!hasGeneratedImage ? (
            <>
                <PanelCard title="QUICK ACTIONS">
                    <div className="grid grid-cols-3 gap-2">
                        <ActionChip id="remove-bg" label="Remove BG" icon={ACTION_ICONS['remove-bg']} onClick={onRemoveBackground} disabled={getButtonDisabled('remove-bg')} isLoading={loadingAction === 'remove-bg'} />
                        <ActionChip id="upscale" label="Upscale" icon={ACTION_ICONS['upscale']} onClick={onUpscale} disabled={getButtonDisabled('upscale')} isLoading={loadingAction === 'upscale'} />
                        <ActionChip id="restore" label="Restore" icon={ACTION_ICONS['restore']} onClick={onRestore} disabled={getButtonDisabled('restore')} isLoading={loadingAction === 'restore'} />
                        <ActionChip id="retouch" label="Retouch" icon={ACTION_ICONS['retouch']} onClick={onRetouch} disabled={getButtonDisabled('retouch')} isLoading={loadingAction === 'retouch'} />
                        <ActionChip id="colorize" label="Colorize" icon={ACTION_ICONS['colorize']} onClick={onColorize} disabled={getButtonDisabled('colorize')} isLoading={loadingAction === 'colorize'} />
                        <ActionChip id="auto-enhance" label="Auto Enhance" icon={ACTION_ICONS['auto-enhance']} onClick={onAutoEnhance} disabled={getButtonDisabled('auto-enhance')} isLoading={loadingAction === 'auto-enhance'} />
                    </div>
                </PanelCard>
                
                <PanelCard title="AI ADJUSTMENTS">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">Magic Relight</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {(['from-left', 'from-top', 'from-right', 'frontal'] as MagicRelightOption[]).map((dir, i) => (
                                    <button key={dir} onClick={() => onMagicRelight(dir)} disabled={getButtonDisabled(`relight-${dir}`)} className="neumorphic-button aspect-square flex items-center justify-center">
                                        <Icon icon={['arrow-left', 'arrow-up', 'arrow-right', 'arrow-down'][i] as IconProps['icon']} className="w-6 h-6" />
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">AI Depth Blur</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {(['subtle', 'medium', 'strong'] as AIDepthBlurAmount[]).map(amount => (
                                    <button key={amount} onClick={() => onApplyDepthBlur(amount)} disabled={getButtonDisabled(`blur-${amount}`)} className="neumorphic-button h-10 text-xs font-bold">
                                        <span>{amount.toUpperCase()}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </PanelCard>
                
                <PanelCard title="AI POSE TRANSFER">
                    <div className="flex flex-col gap-3">
                        <button onClick={() => poseFileInputRef.current?.click()} className="w-full h-20 bg-slate-900/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-700 hover:border-pink-500 transition-colors">
                            {posePreview ? (
                                <img src={posePreview} alt="Pose Preview" className="w-full h-full object-contain rounded" />
                            ) : (
                                <div className="text-center text-slate-400">
                                    <Icon icon="upload" className="w-6 h-6 mx-auto mb-1" />
                                    <span className="text-sm font-semibold">Upload Pose Image</span>
                                </div>
                            )}
                        </button>
                        <input type="file" ref={poseFileInputRef} onChange={handlePoseFileChange} className="hidden" accept="image/*" />
                        <button onClick={onApplyPose} disabled={!poseReferenceFile || getButtonDisabled('pose')} className="gradient-button-primary h-12 text-sm">
                           {loadingAction === 'pose' ? 'Applying Pose...' : 'Apply Pose'}
                        </button>
                    </div>
                </PanelCard>

                <PanelCard title="AI STYLE PRESETS">
                     <div className="grid grid-cols-4 gap-2">
                        {(Object.keys(ACTION_ICONS).filter(k => !['upscale', 'remove-bg', 'restore', 'retouch', 'colorize', 'auto-enhance'].includes(k)) as AIStylePreset[]).map(style => (
                             <ActionChip 
                                key={style} 
                                id={`style-${style}`}
                                label={style === 'hdr-realism' ? 'HDR Realism' : style.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                icon={ACTION_ICONS[style]}
                                onClick={() => onApplyStylePreset(style)} 
                                disabled={getButtonDisabled(`style-${style}`)} 
                                isLoading={loadingAction === `style-${style}`}
                            />
                        ))}
                    </div>
                </PanelCard>

            </>
        ) : (
            <PanelCard title="HARMONY CONTROLS" className="animate-fadeIn">
                 <div className="flex flex-col gap-4">
                    <HarmonySlider label="Warmth" value={warmth} onChange={setWarmth} gradient="linear-gradient(90deg, #60a5fa, #fcd34d)" />
                    <HarmonySlider label="Exposure" value={exposure} onChange={setExposure} gradient="linear-gradient(90deg, #a78bfa, #fde047)" />
                    <HarmonySlider label="Saturation" value={saturation} onChange={setSaturation} gradient="linear-gradient(90deg, #9ca3af, #f472b6)" />
                 </div>
            </PanelCard>
        )}

        <div className="mt-auto pt-2 flex flex-col gap-3">
             {!hasGeneratedImage ? (
                <button
                    onClick={onGenerate}
                    disabled={isGenerateDisabled || isLoading}
                    className="w-full h-14 gradient-button-primary text-lg flex items-center justify-center gap-2"
                >
                    {isLoading && !loadingAction ? (
                        <><Icon icon="spinner" className="w-6 h-6 animate-spin"/>Generating...</>
                    ) : (
                        <><Icon icon="sparkles" className="w-6 h-6" />Generate</>
                    )}
                </button>
             ) : (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={onCancel} disabled={isAccepting} className="w-full h-14 neumorphic-button font-bold"><span>Cancel</span></button>
                    <button onClick={onAccept} disabled={isAccepting} className="w-full h-14 gradient-button-primary">
                        {isAccepting ? 'Applying...' : 'Accept'}
                    </button>
                </div>
             )}
             <button onClick={onExportClick} disabled={!hasOriginalImage || isLoading} className="w-full h-12 neumorphic-button font-semibold">
                <span>EXPORT</span>
             </button>
        </div>
    </aside>
  );
};