
import { GoogleGenAI, Modality } from "@google/genai";
import { AIStylePreset, MagicRelightOption, AIDepthBlurAmount, GenerationQuality } from '../types';

// Ensure API_KEY is available in the environment
if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const fileToGenerativePart = (file: File): Promise<{ inlineData: { data: string; mimeType: string; } }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64, mimeType: file.type } });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const findImageInResponse = (response: any): string | null => {
    const part = response.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData && p.inlineData.mimeType.startsWith('image/')
    );
    return part?.inlineData?.data || null;
};


/**
 * Generates an edited image based on a base image and a text prompt.
 * @param base64Image The base64 encoded string of the original image with a transparent mask area.
 * @param mimeType The MIME type of the original image.
 * @param prompt The text prompt guiding the image edit.
 * @param quality The desired generation quality.
 * @param controlImageFiles An array of optional control images (edge, depth, pose maps).
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export async function generateInpaintedImage(
  base64Image: string,
  mimeType: string,
  prompt: string,
  quality: GenerationQuality,
  controlImageFiles: File[] = []
): Promise<string> {
  try {

    const controlImageParts = await Promise.all(controlImageFiles.map(fileToGenerativePart));

    const buildQualityInstructions = (): string => {
        if (quality === 'low') return ' Generation instructions: A low quality, draft, fast generation is acceptable.';
        if (quality === 'high') return ' Generation instructions: Generate a very high-quality, high-detail, and photorealistic result.';
        return '';
    }

    const fullPrompt = `You are an expert photo editor specializing in photorealistic inpainting.
Your task is to fill the transparent area of the provided image based on the user's prompt.
The generated content must seamlessly blend with the surrounding image. Pay close attention to:
- **Lighting and Shadows:** Match the existing light source direction, softness, and color.
- **Texture and Detail:** Replicate the texture and level of detail of the adjacent areas.
- **Color Grading:** Ensure the colors in the filled area are perfectly harmonized with the rest of the image.
- **Perspective:** The generated content must respect the image's perspective.

The final output must be a fully opaque, high-quality, and photorealistic image.
User's instruction: "${prompt}".
${buildQualityInstructions()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          ...controlImageParts,
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const generatedImage = findImageInResponse(response);
    if (generatedImage) {
        return generatedImage;
    }
    throw new Error("No image was generated in the API response.");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate image. Please check your API key and network connection.");
  }
}

/**
 * Expands an image by filling a transparent border using AI.
 * @param base64Image The base64 encoded string of the image with a transparent border.
 * @param mimeType The MIME type of the image.
 * @param quality The desired generation quality.
 * @returns A promise that resolves to the base64 encoded string of the expanded image.
 */
export async function expandImage(
  base64Image: string,
  mimeType: string,
  quality: GenerationQuality
): Promise<string> {
  try {
    const buildQualityInstructions = (): string => {
        if (quality === 'low') return ' Generation instructions: A low quality, draft, fast generation is acceptable.';
        if (quality === 'high') return ' Generation instructions: Generate a very high-quality, high-detail, and photorealistic result.';
        return '';
    }

    const prompt = `You are an expert photo editor specializing in photorealistic outpainting (image expansion).
Your task is to fill the transparent area of the provided image.
The generated content must seamlessly extend the original image. Pay close attention to:
- **Style and Content:** Continue the patterns, objects, and overall style of the original image.
- **Lighting and Shadows:** Match the existing light source direction, softness, and color.
- **Texture and Detail:** Replicate the texture and level of detail of the adjacent areas.
- **Perspective:** The generated content must respect the image's perspective.
The final output must be a fully opaque, high-quality, and photorealistic image that looks like a single, cohesive photograph.
${buildQualityInstructions()}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const generatedImage = findImageInResponse(response);
    if (generatedImage) {
        return generatedImage;
    }
    throw new Error("No image was generated in the API response for image expansion.");
  } catch (error) {
    console.error("Error calling Gemini API for image expansion:", error);
    throw new Error("Failed to expand image. Please check your API key and network connection.");
  }
}

/**
 * Applies a text prompt to an entire image.
 * @param base64Image The base64 encoded string of the original image.
 * @param mimeType The MIME type of the original image.
 * @param prompt The text prompt guiding the image edit.
 * @param quality The desired generation quality.
 * @returns A promise that resolves to the base64 encoded string of the newly generated image.
 */
export async function generateFullImageEdit(
    base64Image: string,
    mimeType: string,
    prompt: string,
    quality: GenerationQuality
): Promise<string> {
    try {
        const qualityInstruction =
            quality === 'low' ? ' A low quality, fast generation is acceptable.' :
            quality === 'high' ? ' Generate a very high-quality, high-detail, and photorealistic result.' :
            '';

        const fullPrompt = `You are a world-class AI photo editor. Your task is to apply a creative and photorealistic edit to the entire image based on the user's instructions.
Preserve the original subject and composition as much as possible, unless the user explicitly asks to change them.
The final result must be high-quality, believable, and visually stunning.

User's instruction: "${prompt}".
${qualityInstruction}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    { text: fullPrompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const generatedImage = findImageInResponse(response);
        if (generatedImage) {
            return generatedImage;
        }
        throw new Error("No image was generated in the API response for full image edit.");
    } catch (error) {
        console.error("Error calling Gemini API for full image edit:", error);
        throw new Error("Failed to generate full image edit. Please check your API key and network connection.");
    }
}


/**
 * Upscales an image to 2x its resolution using the Gemini API.
 * @param base64Image The base64 encoded string of the image to upscale.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the upscaled image.
 */
export async function upscaleImage(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = "Upscale this image to twice its original resolution. Enhance details, sharpness, and clarity. Do not add, remove, or change any content in the image. The output must be a high-fidelity, photorealistic upscaled version of the provided image.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const upscaledImage = findImageInResponse(response);
        if (upscaledImage) {
            return upscaledImage;
        }
        throw new Error("No upscaled image was generated in the API response.");
    } catch (error) {
        console.error("Error calling Gemini API for upscaling:", error);
        throw new Error("Failed to upscale image. Please try again later.");
    }
}

/**
 * Removes the background from an image using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the image with the background removed.
 */
export async function removeBackground(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = "Remove the background from this image. The subject should be perfectly isolated with clean, precise edges, especially around hair or fine details. The background must be fully transparent. The output must be a PNG image with an alpha channel.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) {
            return resultImage;
        }
        throw new Error("No image was returned from the background removal process.");
    } catch (error) {
        console.error("Error calling Gemini API for background removal:", error);
        throw new Error("Failed to remove background. Please try again later.");
    }
}

/**
 * Restores an old or damaged image using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the restored image.
 */
export async function restoreImage(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = `You are an expert photo restoration specialist. Your task is to restore the provided old or damaged photograph.
- **Remove Imperfections:** Carefully remove scratches, dust, creases, stains, and tears.
- **Color Correction:** If the image is faded, enhance the colors and contrast to their original vibrancy. For black and white photos, improve the tonal range.
- **Enhance Detail:** Sharpen blurry areas and recover lost details without creating an artificial look.
The final result must be a clean, natural, and respectfully restored version of the original image, preserving its authenticity.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) return resultImage;
        throw new Error("No image was returned from the restoration process.");
    } catch (error) {
        console.error("Error calling Gemini API for restoration:", error);
        throw new Error("Failed to restore image. Please try again later.");
    }
}

/**
 * Retouches a portrait using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the retouched image.
 */
export async function retouchImage(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = `You are a professional portrait retoucher. Your task is to perform a subtle, high-end retouch on the provided portrait.
- **Skin Smoothing:** Gently smooth the skin to reduce minor blemishes and wrinkles, while preserving natural skin texture. Avoid making the skin look plastic or artificial.
- **Blemish Removal:** Remove temporary imperfections like pimples or small scars.
- **Lighting and Contouring:** Subtly even out skin tones and balance the lighting to enhance the subject's features.
The final result must be a natural, flattering, and professional-quality portrait that looks like the best version of the subject on a great day.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) return resultImage;
        throw new Error("No image was returned from the retouching process.");
    } catch (error) {
        console.error("Error calling Gemini API for retouching:", error);
        throw new Error("Failed to retouch image. Please try again later.");
    }
}

/**
 * Colorizes a black and white image using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the colorized image.
 */
export async function colorizeImage(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = `You are an AI specializing in photo colorization. Your task is to colorize the provided black and white photograph.
- **Realistic Colors:** Apply natural and historically-appropriate colors to the subjects, clothing, and environment.
- **Consistent Tones:** Ensure the color palette is cohesive and the lighting is consistent throughout the image.
- **Preserve Details:** Maintain the original details, shadows, and highlights of the photograph.
The final result must be a vibrant, realistic, and believable color version of the original black and white image.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) return resultImage;
        throw new Error("No image was returned from the colorization process.");
    } catch (error) {
        console.error("Error calling Gemini API for colorization:", error);
        throw new Error("Failed to colorize image. Please try again later.");
    }
}

/**
 * Automatically enhances an image using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded string of the enhanced image.
 */
export async function autoEnhance(base64Image: string, mimeType: string): Promise<string> {
    try {
        const prompt = `You are an expert photo editor. Your task is to perform an automatic, one-click enhancement on this image. 
Intelligently adjust brightness, contrast, saturation, and sharpness to improve the overall quality, vibrancy, and clarity. 
The result should be a natural-looking, well-balanced image, not an over-processed HDR effect. Preserve the original content and intent of the photo.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: [{ inlineData: { data: base64Image, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) return resultImage;
        throw new Error("No image was returned from the auto-enhance process.");
    } catch (error) {
        console.error("Error calling Gemini API for auto-enhance:", error);
        throw new Error("Failed to auto-enhance image. Please try again later.");
    }
}


/**
 * Applies a full-image style preset using the Gemini API.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @param style The style preset to apply.
 * @returns A promise that resolves to the base64 encoded string of the styled image.
 */
export async function applyStylePreset(base64Image: string, mimeType: string, style: AIStylePreset): Promise<string> {
    let stylePrompt = '';
    switch (style) {
        case 'cinematic':
            stylePrompt = "Apply a cinematic style to this entire image. Enhance the colors with Hollywood-style color grading (like teal and orange), increase the contrast for dramatic lighting, and add a slight vignette. The result should look like a still from a high-budget film.";
            break;
        case 'vintage':
            stylePrompt = "Apply a vintage photo style to this entire image. Give it a warm, faded color tone reminiscent of old film photography from the 1970s, slightly reduced contrast, and add a light, realistic film grain. The result should look authentic and retro.";
            break;
        case 'noir':
            stylePrompt = "Convert this entire image to a dramatic, high-contrast black and white noir style. Emphasize deep shadows, sharp highlights, and a moody, mysterious atmosphere reminiscent of classic film noir.";
            break;
        case 'cyberpunk':
            stylePrompt = "Transform this image with a futuristic cyberpunk aesthetic. Introduce vibrant neon lights, especially blues, pinks, and purples. Add a sense of a high-tech, slightly dystopian city. Increase sharpness and add digital or holographic elements.";
            break;
        case 'neon-glow':
            stylePrompt = "Apply a fluorescent neon glow effect to the image. Make key elements and highlights radiate with bright, saturated neon colors. The overall mood should be electric and vibrant.";
            break;
        case 'dreamy':
            stylePrompt = "Give this image a soft, magical, and dreamy look. Use a pastel color palette, add a gentle haze or glow, and soften the focus slightly to create an ethereal, otherworldly atmosphere.";
            break;
        case 'hdr-realism':
            stylePrompt = "Apply a high-dynamic-range (HDR) effect to this image. Enhance the details in both the shadows and highlights, increase local contrast, and boost sharpness to create a hyper-realistic, crystal-clear result.";
            break;
        case '3d-render':
            stylePrompt = "Re-render this image to look like a polished 3D CGI render. Smooth out surfaces, enhance lighting to create a sense of volume and depth, and give it a clean, highly-detailed look characteristic of modern 3D animation.";
            break;
        case 'cartoon':
            stylePrompt = "Convert this image into a playful cartoon style. Simplify shapes, use bold outlines, and apply bright, flat colors. The result should look like a frame from an animated cartoon.";
            break;
        case 'anime':
            stylePrompt = "Redraw this image in a vibrant Japanese anime style. Feature characteristic large expressive eyes, cel-shaded colors, and dynamic line work. The background should be painterly and detailed.";
            break;
        case 'oil-painting':
            stylePrompt = "Transform this image into a classic oil painting. Apply visible, textured brushstrokes, rich colors, and a canvas-like texture. The style should emulate a traditional masterpiece.";
            break;
        case 'ghibli':
            stylePrompt = "Redraw this image in the enchanting, hand-painted style of Studio Ghibli. Use a soft, warm color palette, painterly backgrounds, and a sense of wonder and nostalgia. The final result should feel whimsical and heartwarming.";
            break;
    }
    
    const fullPrompt = `${stylePrompt} It is crucial that you preserve the original subject, details, and composition of the provided image. The result should be a high-quality, photorealistic reinterpretation of the original image in this new style, not a new image generated from scratch.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: fullPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) {
            return resultImage;
        }
        throw new Error(`No image was returned from the ${style} style preset process.`);
    } catch (error) {
        console.error(`Error calling Gemini API for ${style} preset:`, error);
        throw new Error(`Failed to apply ${style} preset. Please try again later.`);
    }
}

/**
 * Applies realistic relighting to an image from a specified direction.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @param direction The direction for the new primary light source.
 * @returns A promise that resolves to the base64 encoded string of the relit image.
 */
export async function magicRelight(base64Image: string, mimeType: string, direction: MagicRelightOption): Promise<string> {
    let prompt = `Realistically relight this image. The primary light source should now come from a new direction. All highlights and shadows must be redrawn to match this new light source. Preserve the original content, textures, and colors of the image. The result should be photorealistic and believable. The new primary light source is coming from: `;

    switch (direction) {
        case 'from-left':
            prompt += 'the left side of the frame.';
            break;
        case 'from-right':
            prompt += 'the right side of the frame.';
            break;
        case 'from-top':
            prompt += 'above the subject.';
            break;
        case 'frontal':
            prompt += 'the front, slightly above the camera (like a soft ring light).';
            break;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) {
            return resultImage;
        }
        throw new Error(`No image was returned from the magic relight process.`);
    } catch (error) {
        console.error(`Error calling Gemini API for magic relight:`, error);
        throw new Error(`Failed to apply magic relight. Please try again later.`);
    }
}

/**
 * Applies a pose from a reference image to a subject in the main image.
 * @param base64Image The base64 encoded string of the main image.
 * @param mimeType The MIME type of the main image.
 * @param poseReferenceFile The pose reference image file.
 * @returns A promise that resolves to the base64 encoded string of the image with the new pose.
 */
export async function applyPoseTransfer(base64Image: string, mimeType: string, poseReferenceFile: File): Promise<string> {
    try {
        const poseReferencePart = await fileToGenerativePart(poseReferenceFile);

        const prompt = `Transfer the pose from the second image (pose reference) to the main subject in the first image (main image). It is critical that you preserve the subject's identity, face, clothing, and appearance from the main image. The background, lighting, and overall style of the main image must also be preserved. The output should be a photorealistic image of the original subject in the new pose, seamlessly blended into the original background.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    poseReferencePart,
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) {
            return resultImage;
        }
        throw new Error("No image was returned from the pose transfer process.");
    } catch (error) {
        console.error("Error calling Gemini API for pose transfer:", error);
        throw new Error("Failed to apply pose transfer. Please try again later.");
    }
}

/**
 * Applies a realistic depth-of-field blur to an image.
 * @param base64Image The base64 encoded string of the image.
 * @param mimeType The MIME type of the image.
 * @param amount The intensity of the blur.
 * @returns A promise that resolves to the base64 encoded string of the blurred image.
 */
export async function applyDepthBlur(base64Image: string, mimeType: string, amount: AIDepthBlurAmount): Promise<string> {
    let prompt = `You are a professional photo editor. Your task is to apply a realistic, photographic depth-of-field (bokeh) effect to this image.
    1. Intelligently identify the primary subject(s) of the photo.
    2. Keep the primary subject(s) perfectly sharp and in focus.
    3. Realistically blur the background to simulate a shallow depth of field from a professional DSLR camera with a wide aperture lens.
    4. The transition between the in-focus subject and the blurred background must be seamless and natural, with accurate edge detection.
    The desired intensity of the background blur is: ${amount}.
    The output must be a high-quality, photorealistic image.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const resultImage = findImageInResponse(response);
        if (resultImage) {
            return resultImage;
        }
        throw new Error(`No image was returned from the AI Depth Blur process.`);
    } catch (error) {
        console.error(`Error calling Gemini API for AI Depth Blur:`, error);
        throw new Error(`Failed to apply AI Depth Blur. Please try again later.`);
    }
}