/**
 * Amazon Nova Canvas Tool Types
 */

/**
 * Image generation configuration
 */
export interface ImageGenerationConfig {
  seed: number;
  quality: 'standard';
  width: number;
  height: number;
  numberOfImages: number;
}

/**
 * Text to image parameters
 */
export interface TextToImageParams {
  text: string;
}

/**
 * Nova Canvas request payload
 */
export interface NovaCanvasRequest {
  taskType: 'TEXT_IMAGE';
  textToImageParams: TextToImageParams;
  imageGenerationConfig: ImageGenerationConfig;
}

/**
 * Nova Canvas response payload
 */
export interface NovaCanvasResponse {
  images: string[]; // Base64-encoded PNG images
}

/**
 * Image generation input parameters
 */
export interface GenerateImageInput {
  prompt: string;
  width?: number;
  height?: number;
  quality?: 'standard';
  numberOfImages?: number;
  seed?: number;
  saveToS3?: boolean;
  outputPath?: string;
}

/**
 * Image generation result
 */
export interface GenerateImageResult {
  success: boolean;
  images: string[]; // Base64-encoded image data
  seed: number;
  s3Paths?: string[]; // S3 paths if saved
  message: string;
}

/**
 * Bedrock runtime invocation response
 */
export interface BedrockInvokeResponse {
  body: {
    transformToString: () => Promise<string>;
  };
}
