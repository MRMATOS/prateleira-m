
/// <reference types="vite/client" />

// Add TypeScript declaration for Tesseract.js
interface Window {
  Tesseract: {
    recognize: (
      image: File | Blob | string | HTMLImageElement | HTMLCanvasElement,
      lang: string,
      options?: {
        logger?: (progress: any) => void;
        tessedit_pageseg_mode?: number;
        [key: string]: any;
      }
    ) => Promise<{
      data: {
        text: string;
        [key: string]: any;
      };
      [key: string]: any;
    }>;
  };
}
