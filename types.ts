export enum Tool {
  INPAINT = 'INPAINT',
  MAGIC_ERASE = 'MAGIC_ERASE',
  EXPAND = 'EXPAND',
  CROP = 'CROP',
  EYEDROPPER = 'EYEDROPPER',
  TEXT = 'TEXT',
}

export enum InpaintTool {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER',
}

export type LoadingProgress = {
  stage: string;
  progress: number;
};

export type ControlInputType = 'edge' | 'depth' | 'pose';

export type GenerationQuality = 'low' | 'medium' | 'high';

export type ModelStyle = 'photoreal' | 'cinematic' | 'painterly' | 'vectorized';

export type AIStylePreset =
  | 'cinematic'
  | 'vintage'
  | 'noir'
  | 'cyberpunk'
  | 'neon-glow'
  | 'dreamy'
  | 'hdr-realism'
  | '3d-render'
  | 'cartoon'
  | 'anime'
  | 'oil-painting'
  | 'ghibli';

export type MagicRelightOption = 'from-left' | 'from-right' | 'from-top' | 'frontal';

export type AIDepthBlurAmount = 'subtle' | 'medium' | 'strong';

export type OneClickAction = 
  | 'upscale' 
  | 'remove-bg'
  | 'restore'
  | 'retouch'
  | 'colorize'
  | 'auto-enhance'
  | `style-${AIStylePreset}`
  | `relight-${MagicRelightOption}`
  | 'pose'
  | `blur-${AIDepthBlurAmount}`;

export type TextLayer = {
  id: string;
  content: string;
  fontFamily: 'Inter' | 'Lora' | 'Montserrat';
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  x: number; // percentage
  y: number; // percentage
};