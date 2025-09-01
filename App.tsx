

import React, { useState, useCallback, useEffect } from 'react';
import { Tool, InpaintTool, GenerationQuality, AIStylePreset, MagicRelightOption, AIDepthBlurAmount, OneClickAction, TextLayer } from './types';
import { generateInpaintedImage, expandImage, upscaleImage, removeBackground, applyStylePreset, magicRelight, applyPoseTransfer, applyDepthBlur, generateFullImageEdit, restoreImage, retouchImage, colorizeImage, autoEnhance } from './services/geminiService';
import { PropertiesPanel } from './components/PropertiesPanel';
import { Canvas } from './components/Canvas';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ExportModal } from './components/ExportModal';
import { Icon } from './components/Icon';
import { ToolRail } from './components/ToolRail';
import { SplashScreen } from './components/SplashScreen';


type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';
type CropBox = { x: number; y: number; width: number; height: number };
interface ImageFileState {
  file: File;
  dataUrl: string;
}
interface HistoryState {
    imageFile: File;
    maskDataUrl: string;
}

const defaultLoadingMessage = {
    title: "AI is creating...",
    stages: ["Analyzing Mask", "Generating Draft", "Refining Result", "Harmonizing", "Finalizing"]
};

const promptTemplates = [
    "A majestic cat wearing a tiny crown, golden hour lighting",
    "Transform the landscape into a surreal, alien planet",
    "Add bioluminescent mushrooms glowing on the forest floor",
    "Render the scene in the style of a Studio Ghibli anime",
    "Add a reflection of a distant galaxy in the water",
    "A tiny spaceship landing in the background",
    "Cover the ground in a layer of morning mist"
];

const fileToB64 = (file: File) => new Promise<{ b64: string; mime: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const b64 = result.split(',')[1];
      resolve({ b64, mime: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const loadImageFromFile = (file: File) => new Promise<{ element: HTMLImageElement; file: File }>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({ element: img, file });
        img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
});

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>(Tool.INPAINT);
  const [activeInpaintTool, setActiveInpaintTool] = useState<InpaintTool>(InpaintTool.BRUSH);
  const [brushSize, setBrushSize] = useState<number>(40);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState(defaultLoadingMessage);
  const [loadingAction, setLoadingAction] = useState<OneClickAction | null>(null);

  const [originalImage, setOriginalImage] = useState<{ element: HTMLImageElement; file: File; } | null>(null);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [maskDataUrl, setMaskDataUrl] = useState<string>('');
  const [isMaskVisible, setIsMaskVisible] = useState<boolean>(true);
  const [isFullImageGeneration, setIsFullImageGeneration] = useState<boolean>(false);

  const [quality, setQuality] = useState<GenerationQuality>('medium');
  const [warmth, setWarmth] = useState<number>(0);
  const [exposure, setExposure] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(0);
  const [poseReferenceFile, setPoseReferenceFile] = useState<File | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportModalDimensions, setExportModalDimensions] = useState<{width: number, height: number} | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [pickedColor, setPickedColor] = useState<string>('#FFFFFF');

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isComparing, setIsComparing] = useState(false);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);


  const saveToHistory = useCallback((newState: HistoryState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    const { element, file: newFile } = await loadImageFromFile(file);
    setOriginalImage({ element, file: newFile });
    resetForNewImage();
    saveToHistory({ imageFile: newFile, maskDataUrl: '' });
  }, [saveToHistory]);
  
  const handleBrushStrokeEnd = useCallback((newMask: string) => {
    if (originalImage && newMask !== maskDataUrl) {
      saveToHistory({ imageFile: originalImage.file, maskDataUrl: newMask });
    }
  }, [originalImage, maskDataUrl, saveToHistory]);
  
  const handleUndo = useCallback(async () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const prevState = history[newIndex];
    const { element, file } = await loadImageFromFile(prevState.imageFile);
    setOriginalImage({ element, file });
    setMaskDataUrl(prevState.maskDataUrl);
    setGeneratedImage(null);
  }, [history, historyIndex]);

  const handleRedo = useCallback(async () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const nextState = history[newIndex];
    const { element, file } = await loadImageFromFile(nextState.imageFile);
    setOriginalImage({ element, file });
    setMaskDataUrl(nextState.maskDataUrl);
    setGeneratedImage(null);
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'c' && generatedImage) {
        e.preventDefault();
        setIsComparing(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c') {
        setIsComparing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, generatedImage]);

  useEffect(() => {
    if (!originalImage) return;
    if (activeTool === Tool.CROP && !cropBox) {
        const { width, height } = originalImage.element;
        setCropBox({ x: 0, y: 0, width, height });
    } else if (activeTool !== Tool.CROP && activeTool !== Tool.TEXT) {
        setCropBox(null);
        setSelectedTextLayerId(null);
    }
  }, [activeTool, originalImage, cropBox]);

  const handleApplyCrop = useCallback(async () => {
    if (!originalImage || !cropBox) return;
    const { element: img } = originalImage;
    const canvas = document.createElement('canvas');
    const scaleX = img.naturalWidth / cropBox.width;
    const scaleY = img.naturalHeight / cropBox.height;
    canvas.width = cropBox.width * scaleX;
    canvas.height = cropBox.height * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, cropBox.x * scaleX, cropBox.y * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        await handleImageUpload(new File([blob], originalImage.file.name, { type: blob.type }));
        setActiveTool(Tool.INPAINT);
      }
    }, originalImage.file.type);
  }, [originalImage, cropBox, handleImageUpload]);

  const handleCancelCrop = () => setActiveTool(Tool.INPAINT);
  
  // Text Tool Logic
  const addTextLayer = (x: number, y: number) => {
      const newLayer: TextLayer = {
          id: `text_${Date.now()}`,
          content: 'New Text',
          fontFamily: 'Inter',
          fontSize: 48,
          color: '#FFFFFF',
          bold: false,
          italic: false,
          align: 'left',
          x,
          y,
      };
      setTextLayers(prev => [...prev, newLayer]);
      setSelectedTextLayerId(newLayer.id);
  };
  
  const updateTextLayer = (id: string, updates: Partial<TextLayer>) => {
      setTextLayers(prev => prev.map(layer => layer.id === id ? { ...layer, ...updates } : layer));
  };
  
  const deleteTextLayer = (id: string) => {
      setTextLayers(prev => prev.filter(layer => layer.id !== id));
      if (selectedTextLayerId === id) {
          setSelectedTextLayerId(null);
      }
  };
  
  const handleApplyText = async () => {
    if (!originalImage || textLayers.length === 0) return;
    const { element: img, file } = originalImage;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    textLayers.forEach(layer => {
        const fontStyle = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.fontSize}px ${layer.fontFamily}`;
        ctx.font = fontStyle;
        ctx.fillStyle = layer.color;
        ctx.textAlign = layer.align;
        const xPos = (layer.x / 100) * canvas.width;
        const yPos = (layer.y / 100) * canvas.height + layer.fontSize;
        ctx.fillText(layer.content, xPos, yPos);
    });

    canvas.toBlob(async (blob) => {
        if (blob) {
            await handleImageUpload(new File([blob], file.name, { type: blob.type }));
            setTextLayers([]);
            setSelectedTextLayerId(null);
            setActiveTool(Tool.INPAINT);
        }
    }, file.type);
  };

  const compositeCanvasToBlob = useCallback(async (format: ExportFormat, targetWidth: number, targetHeight: number, quality: number): Promise<Blob> => {
    if (!originalImage) throw new Error("No original image to export.");
    const { element: baseImage } = originalImage;
    const compositeCanvas = document.createElement('canvas');

    let genImgForSizing: HTMLImageElement | null = null;
    if (generatedImage) {
      genImgForSizing = new Image();
      await new Promise<void>((res, rej) => { genImgForSizing.onload = () => res(); genImgForSizing.onerror = rej; genImgForSizing.src = generatedImage; });
    }
    const nativeWidth = genImgForSizing ? genImgForSizing.naturalWidth : baseImage.naturalWidth;
    const nativeHeight = genImgForSizing ? genImgForSizing.naturalHeight : baseImage.naturalHeight;
    compositeCanvas.width = nativeWidth;
    compositeCanvas.height = nativeHeight;

    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not get canvas context for compositing.");
    if (format !== 'image/png') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); }
    if (!isFullImageGeneration) ctx.drawImage(baseImage, 0, 0, baseImage.naturalWidth, baseImage.naturalHeight);
    
    if (generatedImage && genImgForSizing) {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = compositeCanvas.width;
      offscreenCanvas.height = compositeCanvas.height;
      const offscreenCtx = offscreenCanvas.getContext('2d');
      if (!offscreenCtx) throw new Error("Could not create offscreen canvas for export.");
      offscreenCtx.filter = `brightness(${1 + exposure / 100}) saturate(${1 + saturation / 100})`;
      offscreenCtx.drawImage(genImgForSizing, 0, 0, compositeCanvas.width, compositeCanvas.height);
      offscreenCtx.filter = 'none';
      if (warmth !== 0) {
          offscreenCtx.globalCompositeOperation = 'overlay';
          offscreenCtx.fillStyle = warmth > 0 ? `rgba(255, 165, 0, ${warmth / 150})` : `rgba(0, 150, 255, ${Math.abs(warmth) / 150})`;
          offscreenCtx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height);
          offscreenCtx.globalCompositeOperation = 'source-over';
      }
      if (isFullImageGeneration) {
          ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);
          if (format !== 'image/png') { ctx.fillStyle = 'white'; ctx.fillRect(0, 0, compositeCanvas.width, compositeCanvas.height); }
          ctx.drawImage(offscreenCanvas, 0, 0);
      } else if (maskDataUrl) {
          const maskImg = new Image();
          await new Promise<void>((res, rej) => { maskImg.onload = () => res(); maskImg.onerror = rej; maskImg.src = maskDataUrl; });
          const fullResMask = document.createElement('canvas');
          fullResMask.width = compositeCanvas.width;
          fullResMask.height = compositeCanvas.height;
          const maskCtx = fullResMask.getContext('2d');
          if (maskCtx) {
              maskCtx.drawImage(maskImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
              offscreenCtx.globalCompositeOperation = 'destination-in';
              offscreenCtx.drawImage(fullResMask, 0, 0);
              ctx.drawImage(offscreenCanvas, 0, 0);
          }
      } else {
          ctx.drawImage(offscreenCanvas, 0, 0);
      }
    }

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error("Could not get final canvas context.");
    finalCtx.drawImage(compositeCanvas, 0, 0, targetWidth, targetHeight);

    const fontSize = Math.max(12, Math.min(finalCanvas.width / 60, finalCanvas.height / 60));
    finalCtx.font = `bold ${fontSize.toFixed(0)}px "Inter", sans-serif`;
    finalCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    finalCtx.textAlign = 'right';
    finalCtx.textBaseline = 'bottom';
    finalCtx.fillText('Created with EDIDIL', finalCanvas.width - (fontSize * 0.75), finalCanvas.height - (fontSize * 0.75));
    
    return new Promise((resolve, reject) => {
      finalCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed.")), format, (format === 'image/jpeg' || format === 'image/webp') ? quality : undefined);
    });
  }, [originalImage, generatedImage, maskDataUrl, warmth, exposure, saturation, isFullImageGeneration]);

  const handleExport = useCallback(async (options: { format: ExportFormat; width: number; height: number; quality: number }) => {
    if (!originalImage) return;
    setIsExporting(true);
    try {
        const blob = await compositeCanvasToBlob(options.format, options.width, options.height, options.quality / 100);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-image-${Date.now()}.${options.format.split('/')[1]}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export failed:", error);
        alert("An error occurred during export.");
    } finally {
        setIsExporting(false);
        setIsExportModalOpen(false);
    }
  }, [compositeCanvasToBlob, originalImage]);

  const handleOpenExportModal = async () => {
    let dims = { width: 1024, height: 1024 };
    if (originalImage) {
        if (generatedImage) {
            const genImg = new Image();
            await new Promise<void>(res => { genImg.onload = () => res(); genImg.src = generatedImage; });
            dims = { width: genImg.naturalWidth, height: genImg.naturalHeight };
        } else {
            dims = { width: originalImage.element.naturalWidth, height: originalImage.element.naturalHeight };
        }
    }
    setExportModalDimensions(dims);
    setIsExportModalOpen(true);
  }

  const handleAccept = useCallback(async () => {
    if (!originalImage) return;
    setIsAccepting(true);
    try {
      let finalWidth = originalImage.element.naturalWidth;
      let finalHeight = originalImage.element.naturalHeight;
      if (generatedImage) {
          const genImg = new Image();
          await new Promise<void>(res => { genImg.onload = () => res(); genImg.src = generatedImage; });
          finalWidth = genImg.naturalWidth;
          finalHeight = genImg.naturalHeight;
      }

      const blob = await compositeCanvasToBlob('image/png', finalWidth, finalHeight, 1);
      const newFile = new File([blob], originalImage.file.name, { type: blob.type });
      await handleImageUpload(newFile);
    } catch (error) {
      console.error("Failed to accept changes:", error);
    } finally {
      setIsAccepting(false);
    }
  }, [compositeCanvasToBlob, handleImageUpload, originalImage, generatedImage]);
  
  const handleCancel = () => {
    setGeneratedImage(null);
    setIsFullImageGeneration(false);
  };

  const resetForNewImage = () => {
      setGeneratedImage(null);
      setMaskDataUrl('');
      setPrompt('');
      setWarmth(0);
      setExposure(0);
      setSaturation(0);
      setIsAccepting(false);
      setIsLoading(false);
      setLoadingMessage(defaultLoadingMessage);
      setLoadingAction(null);
      setActiveTool(Tool.INPAINT);
      setActiveInpaintTool(InpaintTool.BRUSH);
      setPoseReferenceFile(null);
      setIsFullImageGeneration(false);
      setIsMaskVisible(true);
      setTextLayers([]);
      setSelectedTextLayerId(null);
  };
  
  const handleGenerate = async () => {
    if (!originalImage) return;
    setIsLoading(true);
    setGeneratedImage(null);
    try {
      const { file } = originalImage;
      const { b64: baseB64, mime } = await fileToB64(file);
      let generatedB64 = '';
      
      if (activeTool === Tool.EXPAND) {
        setLoadingMessage({ title: 'Expanding Canvas...', stages: ['Analyzing image content', 'Generating new pixels', 'Blending seams', 'Finalizing expansion'] });
        setIsFullImageGeneration(true);
        const expandedCanvas = document.createElement('canvas');
        const img = originalImage.element;
        expandedCanvas.width = img.naturalWidth * 1.5;
        expandedCanvas.height = img.naturalHeight * 1.5;
        const ctx = expandedCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas for expansion.");
        ctx.drawImage(img, expandedCanvas.width * 0.1666, expandedCanvas.height * 0.1666, img.naturalWidth, img.naturalHeight);
        const expandedB64 = expandedCanvas.toDataURL(mime).split(',')[1];
        generatedB64 = await expandImage(expandedB64, mime, quality);
      } else if (activeTool === Tool.INPAINT && maskDataUrl) {
        setLoadingMessage(defaultLoadingMessage);
        setIsFullImageGeneration(false);
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = originalImage.element.naturalWidth;
        compositeCanvas.height = originalImage.element.naturalHeight;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context.");
        ctx.drawImage(originalImage.element, 0, 0);
        const maskImg = new Image();
        await new Promise(resolve => { maskImg.onload = resolve; maskImg.src = maskDataUrl; });
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
        const compositeB64 = compositeCanvas.toDataURL(mime).split(',')[1];
        generatedB64 = await generateInpaintedImage(compositeB64, mime, prompt, quality);
      } else if (activeTool === Tool.INPAINT && !maskDataUrl) {
        setLoadingMessage({ title: "Reimagining your image...", stages: ["Analyzing prompt", "Applying creative style", "Rendering new version", "Finalizing details"] });
        setIsFullImageGeneration(true);
        generatedB64 = await generateFullImageEdit(baseB64, mime, prompt, quality);
      } else if (activeTool === Tool.MAGIC_ERASE) {
        setLoadingMessage({ title: 'Erasing Object...', stages: ['Identifying object', 'Reconstructing background', 'Seamlessly blending'] });
        setIsFullImageGeneration(false);
        if (!maskDataUrl) throw new Error("Magic Erase requires a mask.");
        const compositeCanvas = document.createElement('canvas');
        compositeCanvas.width = originalImage.element.naturalWidth;
        compositeCanvas.height = originalImage.element.naturalHeight;
        const ctx = compositeCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not create canvas context.");
        ctx.drawImage(originalImage.element, 0, 0);
        const maskImg = new Image();
        await new Promise(resolve => { maskImg.onload = resolve; maskImg.src = maskDataUrl; });
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskImg, 0, 0, compositeCanvas.width, compositeCanvas.height);
        const compositeB64 = compositeCanvas.toDataURL(mime).split(',')[1];
        generatedB64 = await generateInpaintedImage(compositeB64, mime, 'Remove the object in the masked area', quality);
      }
      setGeneratedImage(`data:${mime};base64,${generatedB64}`);
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const runOneClickAction = async (action: OneClickAction, actionFn: () => Promise<string>) => {
      if (!originalImage) return;
      setLoadingAction(action);
      setIsLoading(true);
      setGeneratedImage(null);
      setIsFullImageGeneration(true);
      try {
        const generatedB64 = await actionFn();
        setGeneratedImage(`data:${originalImage.file.type};base64,${generatedB64}`);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
      } finally {
        setIsLoading(false);
        setLoadingAction(null);
      }
  };

  const handleUpscale = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('upscale', () => upscaleImage(b64, mime));
  };
  
  const handleRemoveBackground = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('remove-bg', () => removeBackground(b64, mime));
  };
  
  const handleRestore = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('restore', () => restoreImage(b64, mime));
  };

  const handleRetouch = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('retouch', () => retouchImage(b64, mime));
  };

  const handleColorize = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('colorize', () => colorizeImage(b64, mime));
  };
  
  const handleAutoEnhance = async () => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('auto-enhance', () => autoEnhance(b64, mime));
  };

  const handleApplyStylePreset = async (style: AIStylePreset) => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction(`style-${style}`, () => applyStylePreset(b64, mime, style));
  };
  
  const handleMagicRelight = async (direction: MagicRelightOption) => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction(`relight-${direction}`, () => magicRelight(b64, mime, direction));
  };
  
  const handleApplyPose = async () => {
    if (!originalImage || !poseReferenceFile) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction('pose', () => applyPoseTransfer(b64, mime, poseReferenceFile));
  };

  const handleApplyDepthBlur = async (amount: AIDepthBlurAmount) => {
    if (!originalImage) return;
    const { b64, mime } = await fileToB64(originalImage.file);
    runOneClickAction(`blur-${amount}`, () => applyDepthBlur(b64, mime, amount));
  };
  
  const onNewProject = () => {
      setOriginalImage(null);
      setGeneratedImage(null);
      setMaskDataUrl('');
      setPrompt('');
      setWarmth(0);
      setExposure(0);
      setSaturation(0);
      setIsAccepting(false);
      setIsLoading(false);
      setLoadingMessage(defaultLoadingMessage);
      setLoadingAction(null);
      setActiveTool(Tool.INPAINT);
      setPoseReferenceFile(null);
      setTextLayers([]);
      setSelectedTextLayerId(null);
      setHistory([]);
      setHistoryIndex(-1);
  };
  
  const initialImageLoad = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const { element, file: newFile } = await loadImageFromFile(file);
    setOriginalImage({ element, file: newFile });
    resetForNewImage();
    saveToHistory({ imageFile: newFile, maskDataUrl: '' });
  };


  if (showSplash) return <SplashScreen />;
  if (!originalImage) return <WelcomeScreen onImageUpload={initialImageLoad} />;
  
  const generativeTools = [Tool.INPAINT, Tool.MAGIC_ERASE, Tool.EXPAND];
  const isGenerateDisabled = isLoading || !generativeTools.includes(activeTool) || (activeTool === Tool.MAGIC_ERASE && !maskDataUrl) || (activeTool === Tool.INPAINT && !maskDataUrl && !prompt);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const selectedTextLayer = textLayers.find(l => l.id === selectedTextLayerId) || null;

  return (
    <>
      <main className="w-screen h-screen flex flex-col p-4 gap-4">
        <header className="flex-shrink-0 flex justify-between items-center px-2">
          <div className="flex items-center gap-2 text-slate-200">
            <Icon icon="logo" className="w-10 h-10" />
            <h1 className="text-2xl font-bold tracking-tight">EDIDIL</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={!canUndo} className="w-10 h-10 flex items-center justify-center neumorphic-button"><Icon icon="undo" className="w-5 h-5"/></button>
            <button onClick={handleRedo} disabled={!canRedo} className="w-10 h-10 flex items-center justify-center neumorphic-button"><Icon icon="redo" className="w-5 h-5"/></button>
            <button onClick={onNewProject} className="flex items-center gap-2 px-4 h-10 text-sm font-semibold neumorphic-button">
                <Icon icon="newProject" className="w-5 h-5"/> <span>New Project</span>
            </button>
          </div>
        </header>
        <div className="flex-grow flex gap-4 min-h-0">
          <ToolRail 
            activeTool={activeTool} 
            setActiveTool={setActiveTool} 
            disabled={isLoading || !!generatedImage || !!textLayers.length}
            activeInpaintTool={activeInpaintTool}
            setActiveInpaintTool={setActiveInpaintTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            prompt={prompt}
            setPrompt={setPrompt}
            isMaskVisible={isMaskVisible}
            setIsMaskVisible={setIsMaskVisible}
            promptTemplates={promptTemplates}
            pickedColor={pickedColor}
          />
          <div className="flex-grow flex flex-col min-w-0">
            <Canvas
              image={originalImage.element}
              activeTool={activeTool}
              activeInpaintTool={activeInpaintTool}
              brushSize={brushSize}
              generatedImage={generatedImage}
              onMaskReady={setMaskDataUrl}
              onBrushStrokeEnd={handleBrushStrokeEnd}
              isGenerating={isLoading}
              loadingMessage={loadingMessage}
              warmth={warmth}
              exposure={exposure}
              saturation={saturation}
              isFullImageGeneration={isFullImageGeneration}
              isMaskVisible={isMaskVisible}
              isComparing={isComparing}
              setIsComparing={setIsComparing}
              cropBox={cropBox}
              setCropBox={setCropBox}
              setPickedColor={setPickedColor}
              textLayers={textLayers}
              selectedTextLayerId={selectedTextLayerId}
              onAddTextLayer={addTextLayer}
              onUpdateTextLayer={updateTextLayer}
              onSelectTextLayer={setSelectedTextLayerId}
            />
          </div>
          <PropertiesPanel 
            onUpscale={handleUpscale}
            onRemoveBackground={handleRemoveBackground}
            onRestore={handleRestore}
            onRetouch={handleRetouch}
            onColorize={handleColorize}
            onAutoEnhance={handleAutoEnhance}
            onApplyStylePreset={handleApplyStylePreset}
            onMagicRelight={handleMagicRelight}
            isLoading={isLoading}
            hasOriginalImage={!!originalImage}
            quality={quality}
            setQuality={setQuality}
            onApplyPose={handleApplyPose}
            onApplyDepthBlur={handleApplyDepthBlur}
            onExportClick={handleOpenExportModal}
            onPoseReferenceChange={setPoseReferenceFile}
            poseReferenceFile={poseReferenceFile}
            loadingAction={loadingAction}
            activeTool={activeTool}
            onGenerate={handleGenerate}
            isGenerateDisabled={isGenerateDisabled}
            generatedImage={generatedImage}
            warmth={warmth}
            setWarmth={setWarmth}
            exposure={exposure}
            setExposure={setExposure}
            saturation={saturation}
            setSaturation={setSaturation}
            onAccept={handleAccept}
            onCancel={handleCancel}
            isAccepting={isAccepting}
            onApplyCrop={handleApplyCrop}
            onCancelCrop={handleCancelCrop}
            selectedTextLayer={selectedTextLayer}
            onUpdateTextLayer={updateTextLayer}
            onApplyText={handleApplyText}
            onDeleteTextLayer={deleteTextLayer}
          />
        </div>
      </main>
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        isExporting={isExporting}
        imageDimensions={exportModalDimensions}
      />
    </>
  );
}

export default App;