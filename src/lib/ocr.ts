import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { getStoragePath } from './storage';

const execAsync = promisify(exec);

const OCR_ENABLED = process.env.OCR_ENABLED === 'true';
const TESSERACT_LANG = process.env.TESSERACT_LANG || 'eng';

interface OcrResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

// Supported file types for OCR
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
];

const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];

export function isOcrSupported(mimeType: string): boolean {
  return [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES].includes(mimeType);
}

export async function extractTextFromImage(imagePath: string, language: string = TESSERACT_LANG): Promise<OcrResult> {
  if (!OCR_ENABLED) {
    return { success: false, error: 'OCR is disabled' };
  }

  try {
    const fullPath = path.join(getStoragePath(), imagePath);

    // Check if file exists
    await fs.access(fullPath);

    // Run tesseract OCR
    const { stdout, stderr } = await execAsync(
      `tesseract "${fullPath}" stdout -l ${language} --oem 3 --psm 3`,
      { maxBuffer: 50 * 1024 * 1024 } // 50MB buffer
    );

    if (stderr && stderr.includes('Error')) {
      return { success: false, error: stderr };
    }

    const text = stdout.trim();

    return {
      success: true,
      text: text || '',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR processing failed',
    };
  }
}

export async function extractTextFromPdf(pdfPath: string, language: string = TESSERACT_LANG): Promise<OcrResult> {
  if (!OCR_ENABLED) {
    return { success: false, error: 'OCR is disabled' };
  }

  try {
    const fullPath = path.join(getStoragePath(), pdfPath);
    const tempDir = path.join(getStoragePath(), 'temp', `ocr-${Date.now()}`);

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Convert PDF to images using ImageMagick/pdftoppm
    // First, try pdftoppm (from poppler-utils)
    try {
      await execAsync(
        `pdftoppm -png -r 300 "${fullPath}" "${tempDir}/page"`,
        { maxBuffer: 100 * 1024 * 1024 }
      );
    } catch {
      // Fall back to ImageMagick convert
      await execAsync(
        `convert -density 300 "${fullPath}" "${tempDir}/page.png"`,
        { maxBuffer: 100 * 1024 * 1024 }
      );
    }

    // Get all generated images
    const files = await fs.readdir(tempDir);
    const imageFiles = files
      .filter((f) => f.endsWith('.png'))
      .sort();

    // OCR each page
    const textParts: string[] = [];

    for (const imageFile of imageFiles) {
      const imagePath = path.join(tempDir, imageFile);
      const { stdout } = await execAsync(
        `tesseract "${imagePath}" stdout -l ${language} --oem 3 --psm 3`,
        { maxBuffer: 50 * 1024 * 1024 }
      );
      textParts.push(stdout.trim());
    }

    // Cleanup temp files
    for (const file of files) {
      await fs.unlink(path.join(tempDir, file));
    }
    await fs.rmdir(tempDir);

    const fullText = textParts.join('\n\n--- Page Break ---\n\n');

    return {
      success: true,
      text: fullText,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF OCR processing failed',
    };
  }
}

export async function extractText(filePath: string, mimeType: string): Promise<OcrResult> {
  if (!isOcrSupported(mimeType)) {
    return { success: false, error: `Unsupported file type: ${mimeType}` };
  }

  if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return extractTextFromImage(filePath);
  }

  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(filePath);
  }

  return { success: false, error: `Unsupported file type: ${mimeType}` };
}

export async function checkTesseractInstalled(): Promise<boolean> {
  try {
    await execAsync('tesseract --version');
    return true;
  } catch {
    return false;
  }
}

export async function getAvailableLanguages(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tesseract --list-langs');
    const lines = stdout.split('\n');
    // Skip the first line which is "List of available languages"
    return lines.slice(1).map((l) => l.trim()).filter(Boolean);
  } catch {
    return ['eng'];
  }
}

export async function processDocumentOcr(
  documentId: string,
  filePath: string,
  mimeType: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  if (!OCR_ENABLED) {
    return { success: true, text: '' };
  }

  const result = await extractText(filePath, mimeType);

  return {
    success: result.success,
    text: result.text,
    error: result.error,
  };
}
