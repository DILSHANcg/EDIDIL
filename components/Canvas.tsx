

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Tool, InpaintTool, TextLayer } from '../types';
import { Loader } from './Loader';
import { Icon } from './Icon';

type CropBox = { x: number; y: number; width: number; height: number };
type DragState = { startX: number; startY: number; startBox: CropBox; handle: string | null };
type LoupeState = { x: number; y: number; color: string; visible: boolean; };
type TextDragState = { layerId: string; offsetX: number; offsetY: number; };

interface CanvasProps {
  image: HTMLImageElement | null;
  activeTool: Tool;
  activeInpaintTool: InpaintTool;
  brushSize: number;
  generatedImage: string | null;
  onMaskReady: (maskDataUrl: string) => void;
  onBrushStrokeEnd: (maskDataUrl: string) => void;
  isGenerating: boolean;
  loadingMessage: { title: string, stages: string[] };
  warmth: number;
  exposure: number;
  saturation: number;
  isFullImageGeneration: boolean;
  isMaskVisible: boolean;
  isComparing: boolean;
  setIsComparing: (isComparing: boolean) => void;
  cropBox: CropBox | null;
  setCropBox: (box: CropBox | null) => void;
  setPickedColor: (color: string) => void;
  textLayers: TextLayer[];
  selectedTextLayerId: string | null;
  onAddTextLayer: (x: number, y: number) => void;
  onUpdateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  onSelectTextLayer: (id: string | null) => void;
}

const Loupe: React.FC<{ image: HTMLImageElement; canvasSize: {width: number, height: number}; state: LoupeState }> = ({ image, canvasSize, state }) => {
    if (!state.visible) return null;
    const size = 120; // Loupe size
    const zoom = 8; // Zoom level
    return (
        <div 
            className="absolute pointer-events-none rounded-full overflow-hidden border-4 border-white shadow-2xl"
            style={{ 
                left: state.x - size / 2, 
                top: state.y - size / 2, 
                width: size, height: size,
                display: state.visible ? 'block' : 'none'
            }}
        >
            <div style={{
                position: 'absolute',
                width: canvasSize.width * zoom,
                height: canvasSize.height * zoom,
                left: -state.x * zoom + size / 2,
                top: -state.y * zoom + size / 2,
                backgroundImage: `url(${image.src})`,
                backgroundSize: '100% 100%',
                imageRendering: 'pixelated'
            }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-px h-full bg-white/50"></div>
                 <div className="absolute w-full h-px bg-white/50"></div>
                 <div className="absolute w-4 h-4 rounded-full border-2" style={{ borderColor: state.color === '#000000' ? '#FFFFFF' : '#000000' }}></div>
            </div>
        </div>
    );
};

export const Canvas: React.FC<CanvasProps> = ({ 
    image, activeTool, brushSize, generatedImage, onMaskReady, onBrushStrokeEnd, isGenerating, loadingMessage,
    warmth, exposure, saturation, activeInpaintTool, isFullImageGeneration, isMaskVisible,
    isComparing, setIsComparing, cropBox, setCropBox, setPickedColor,
    textLayers, selectedTextLayerId, onAddTextLayer, onUpdateTextLayer, onSelectTextLayer,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [loadedGeneratedImage, setLoadedGeneratedImage] = useState<HTMLImageElement | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isSliding, setIsSliding] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [textDragState, setTextDragState] = useState<TextDragState | null>(null);
  const [loupeState, setLoupeState] = useState<LoupeState>({ x: 0, y: 0, color: '#000000', visible: false });

  const getCoords = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);
  
  // Text Tool Handlers
  const handleTextContainerClick = (e: React.MouseEvent) => {
      if (activeTool !== Tool.TEXT) return;
      if (e.target === e.currentTarget) {
          onSelectTextLayer(null);
      }
  };

  const handleCanvasClickForText = (e: React.MouseEvent) => {
      if (activeTool !== Tool.TEXT || textDragState) return;
      const coords = getCoords(e);
      if (!coords) return;
      if (e.target === drawingCanvasRef.current) {
         onAddTextLayer(coords.x / canvasSize.width * 100, coords.y / canvasSize.height * 100);
      }
  };
  
  const handleTextMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    onSelectTextLayer(layerId);
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const parentRect = containerRef.current!.getBoundingClientRect();
    setTextDragState({
      layerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  };

  const handleTextMouseMove = useCallback((e: MouseEvent) => {
    if (!textDragState || !containerRef.current) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - parentRect.left - textDragState.offsetX) / canvasSize.width) * 100;
    const y = ((e.clientY - parentRect.top - textDragState.offsetY) / canvasSize.height) * 100;
    onUpdateTextLayer(textDragState.layerId, { x, y });
  }, [textDragState, onUpdateTextLayer, canvasSize.width, canvasSize.height]);
  
  const handleTextMouseUp = useCallback(() => setTextDragState(null), []);

  useEffect(() => {
    if (textDragState) {
        window.addEventListener('mousemove', handleTextMouseMove);
        window.addEventListener('mouseup', handleTextMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleTextMouseMove);
        window.removeEventListener('mouseup', handleTextMouseUp);
    }
  }, [textDragState, handleTextMouseMove, handleTextMouseUp]);


  // Eyedropper Logic
  const handleEyedropperMove = useCallback((e: React.MouseEvent) => {
    if (activeTool !== Tool.EYEDROPPER || !image) return;
    const coords = getCoords(e);
    if (!coords) return;
    const ctx = imageCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
    const color = `#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`;
    setLoupeState({ x: coords.x, y: coords.y, color, visible: true });
  }, [activeTool, image, getCoords]);

  const handleEyedropperClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== Tool.EYEDROPPER) return;
    const coords = getCoords(e);
    if (!coords) return;
    const ctx = imageCanvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
    const color = `#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`;
    setPickedColor(color.toUpperCase());
  }, [activeTool, getCoords, setPickedColor]);

  const handleEyedropperLeave = useCallback(() => setLoupeState(prev => ({ ...prev, visible: false })), []);
  

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoords(e);
    if (!coords) return;
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (activeInpaintTool === InpaintTool.BRUSH) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)'; 
    } else {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [isDrawing, getCoords, brushSize, activeInpaintTool]);
  
  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e as any);
    if (!coords) return;
    setIsDrawing(true);
    const ctx = drawingCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }, [getCoords]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hasDrawing = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) {
        hasDrawing = true;
        break;
      }
    }
    const mask = hasDrawing ? canvas.toDataURL() : '';
    onMaskReady(mask);
    onBrushStrokeEnd(mask);
  }, [isDrawing, onMaskReady, onBrushStrokeEnd]);

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas || (activeTool !== Tool.INPAINT && activeTool !== Tool.MAGIC_ERASE)) return;
    const options = { passive: false };
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, options);
    canvas.addEventListener('touchmove', draw, options);
    canvas.addEventListener('touchend', stopDrawing);
    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing, activeTool]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0 || !image) return;
      const { width, height } = entries[0].contentRect;
      const imageAspectRatio = image.width / image.height;
      const containerAspectRatio = width / height;
      let newWidth, newHeight;
      if (imageAspectRatio > containerAspectRatio) {
        newWidth = width;
        newHeight = width / imageAspectRatio;
      } else {
        newHeight = height;
        newWidth = height * imageAspectRatio;
      }
      setCanvasSize({ width: newWidth, height: newHeight });
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [image]);

  useEffect(() => {
    if (generatedImage) {
      const img = new Image();
      img.onload = () => { setLoadedGeneratedImage(img); setSliderPosition(50); };
      img.src = generatedImage;
    } else {
      setLoadedGeneratedImage(null);
    }
  }, [generatedImage]);

  useEffect(() => {
    if (!image || !canvasSize.width || !canvasSize.height) return;
    [imageCanvasRef, drawingCanvasRef, afterCanvasRef].forEach(ref => {
      if (ref.current) {
        ref.current.width = canvasSize.width;
        ref.current.height = canvasSize.height;
      }
    });
    const imageCtx = imageCanvasRef.current?.getContext('2d');
    const drawingCtx = drawingCanvasRef.current?.getContext('2d');
    if (imageCtx) {
      imageCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      imageCtx.drawImage(image, 0, 0, canvasSize.width, canvasSize.height);
    }
    if (drawingCtx && !generatedImage) drawingCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
  }, [image, canvasSize, generatedImage]);

  useEffect(() => {
    if (!canvasSize.width || !imageCanvasRef.current || !afterCanvasRef.current || !drawingCanvasRef.current || !loadedGeneratedImage) return;
    const afterCtx = afterCanvasRef.current.getContext('2d');
    if (!afterCtx) return;

    afterCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    const offscreenCanvas = new OffscreenCanvas(canvasSize.width, canvasSize.height);
    const offscreenCtx = offscreenCanvas.getContext('2d');
    if (!offscreenCtx) return;

    offscreenCtx.filter = `brightness(${1 + exposure / 100}) saturate(${1 + saturation / 100})`;
    offscreenCtx.drawImage(loadedGeneratedImage, 0, 0, canvasSize.width, canvasSize.height);
    offscreenCtx.filter = 'none';
    if (warmth !== 0) {
        offscreenCtx.globalCompositeOperation = 'overlay';
        offscreenCtx.fillStyle = warmth > 0 ? `rgba(255, 165, 0, ${warmth / 150})` : `rgba(0, 150, 255, ${Math.abs(warmth) / 150})`;
        offscreenCtx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
    if (isFullImageGeneration) {
      afterCtx.drawImage(offscreenCanvas, 0, 0);
    } else {
      afterCtx.drawImage(imageCanvasRef.current, 0, 0, canvasSize.width, canvasSize.height);
      offscreenCtx.globalCompositeOperation = 'destination-in';
      offscreenCtx.drawImage(drawingCanvasRef.current, 0, 0, canvasSize.width, canvasSize.height);
      afterCtx.drawImage(offscreenCanvas, 0, 0);
    }
  }, [loadedGeneratedImage, canvasSize, warmth, exposure, saturation, image, isFullImageGeneration]);

  // Handle slider drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isSliding || !canvasWrapperRef.current) return;
        const rect = canvasWrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percent);
    };
    const handleMouseUp = () => setIsSliding(false);

    if (isSliding) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSliding, setSliderPosition]);


  const handleCropMouseDown = (e: React.MouseEvent, handle: string | null) => {
    if (!cropBox) return;
    setDragState({ startX: e.clientX, startY: e.clientY, startBox: { ...cropBox }, handle });
  };
  
  const handleCropMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !cropBox || !setCropBox) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    let newBox = { ...dragState.startBox };
    const { handle } = dragState;

    if (handle) {
      if (handle.includes('e')) newBox.width += dx;
      if (handle.includes('w')) { newBox.width -= dx; newBox.x += dx; }
      if (handle.includes('s')) newBox.height += dy;
      if (handle.includes('n')) { newBox.height -= dy; newBox.y += dy; }
    } else {
      newBox.x += dx;
      newBox.y += dy;
    }
    
    newBox.width = Math.max(20, Math.min(newBox.width, canvasSize.width - newBox.x));
    newBox.height = Math.max(20, Math.min(newBox.height, canvasSize.height - newBox.y));
    newBox.x = Math.max(0, Math.min(newBox.x, canvasSize.width - newBox.width));
    newBox.y = Math.max(0, Math.min(newBox.y, canvasSize.height - newBox.height));
    
    setCropBox(newBox);
  }, [dragState, cropBox, setCropBox, canvasSize]);

  const handleCropMouseUp = useCallback(() => setDragState(null), []);
  
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleCropMouseMove);
      window.addEventListener('mouseup', handleCropMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleCropMouseMove);
      window.removeEventListener('mouseup', handleCropMouseUp);
    };
  }, [dragState, handleCropMouseMove, handleCropMouseUp]);

  const showBrushUI = (activeTool === Tool.INPAINT || activeTool === Tool.MAGIC_ERASE) && !generatedImage;
  const showSlider = generatedImage && !isComparing;
  
  let cursorStyle = 'default';
  if (showBrushUI) cursorStyle = 'crosshair';
  if (activeTool === Tool.EYEDROPPER) cursorStyle = 'copy';
  if (activeTool === Tool.TEXT) cursorStyle = 'text';
  if (isSliding) cursorStyle = 'ew-resize';

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative touch-none"
      style={{ backgroundColor: '#111827', backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)', backgroundSize: '24px 24px', backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px' }}
      onMouseMove={(e) => {
          if (activeTool === Tool.EYEDROPPER) handleEyedropperMove(e);
      }}
      onClick={(e) => {
          if (activeTool === Tool.EYEDROPPER) handleEyedropperClick(e);
          if (activeTool === Tool.TEXT) handleCanvasClickForText(e);
      }}
      onMouseLeave={handleEyedropperLeave}
    >
      <div ref={canvasWrapperRef} className="relative" style={{ width: canvasSize.width, height: canvasSize.height, cursor: cursorStyle }}>
        <canvas ref={imageCanvasRef} className={`absolute top-0 left-0 transition-opacity ${isComparing ? 'opacity-100' : ''}`} />
        <canvas ref={afterCanvasRef} className={`absolute top-0 left-0 ${isComparing ? 'opacity-0' : ''}`} style={{ clipPath: showSlider ? `inset(0 ${100 - sliderPosition}% 0 0)` : 'none' }} />
        <canvas ref={drawingCanvasRef} className={`absolute top-0 left-0 ${generatedImage ? 'opacity-0 pointer-events-none' : ''} ${isMaskVisible ? 'opacity-50' : 'opacity-0 pointer-events-none'}`} />
        
        {image && <Loupe image={image} canvasSize={canvasSize} state={loupeState} />}

        {showSlider && (
          <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-purple-500 shadow-lg cursor-ew-resize z-10 group" style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }} onMouseDown={(e) => { e.preventDefault(); setIsSliding(true); }} >
            <div className="absolute top-1/2 -translate-y-1/2 -left-[19px] w-10 h-10 rounded-full bg-slate-900/50 backdrop-blur-sm shadow-xl border-2 border-white/20 flex items-center justify-center text-white transition-transform duration-200 group-hover:scale-110">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 animate-pulse"></div>
            </div>
          </div>
        )}

        {generatedImage && (
             <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} className="absolute top-3 right-3 z-20 h-10 w-10 bg-slate-900/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-slate-900/80 transition-all border border-white/20">
                <Icon icon="compare" className="w-5 h-5" />
            </button>
        )}

        {activeTool === Tool.CROP && cropBox && (
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-black/60" style={{ clipPath: `path("M0 0 H${canvasSize.width} V${canvasSize.height} H0Z M${cropBox.x} ${cropBox.y} V${cropBox.y + cropBox.height} H${cropBox.x + cropBox.width} V${cropBox.y}Z")`, clipRule: 'evenodd' }}></div>
            <div className="absolute border-2 border-dashed border-white/80" style={{ left: cropBox.x, top: cropBox.y, width: cropBox.width, height: cropBox.height, cursor: 'move' }} onMouseDown={(e) => handleCropMouseDown(e, null)}>
              {['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(handle => (
                <div key={handle} onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, handle); }} style={{ position: 'absolute', width: '16px', height: '16px', background: 'rgba(255,255,255,0.9)', border: '2px solid #333', borderRadius: '50%',
                  top: handle.includes('n') ? '-8px' : handle.includes('s') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                  left: handle.includes('w') ? '-8px' : handle.includes('e') ? 'calc(100% - 8px)' : 'calc(50% - 8px)',
                  cursor: `${handle}-resize`
                }}></div>
              ))}
            </div>
          </div>
        )}
        
        {activeTool === Tool.TEXT && (
            <div className="absolute inset-0" onClick={handleTextContainerClick}>
                {textLayers.map(layer => (
                    <div
                        key={layer.id}
                        className={`text-layer ${selectedTextLayerId === layer.id ? 'selected' : ''}`}
                        style={{
                            left: `${layer.x}%`,
                            top: `${layer.y}%`,
                            fontFamily: layer.fontFamily,
                            fontSize: `${layer.fontSize}px`,
                            color: layer.color,
                            fontWeight: layer.bold ? 'bold' : 'normal',
                            fontStyle: layer.italic ? 'italic' : 'normal',
                            textAlign: layer.align,
                        }}
                        onMouseDown={e => handleTextMouseDown(e, layer.id)}
                        onDoubleClick={e => (e.currentTarget as HTMLDivElement).focus()}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={e => onUpdateTextLayer(layer.id, { content: e.currentTarget.innerText })}
                    >
                        {layer.content}
                    </div>
                ))}
            </div>
        )}

        {isGenerating && <Loader title={loadingMessage.title} stages={loadingMessage.stages} />}
      </div>
    </div>
  );
};