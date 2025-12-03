import fs from 'fs/promises';
import path from 'path';
import { hashFile, sanitizeFilename, generateToken } from './utils';

// Use local storage path relative to project root
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600', 10); // 100MB default

export interface StoredFile {
  filePath: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
}

export interface UploadOptions {
  userId: string;
  documentId?: string;
  version?: number;
}

export async function ensureStorageDirectory(): Promise<void> {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'documents'), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'thumbnails'), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'temp'), { recursive: true });
  await fs.mkdir(path.join(STORAGE_PATH, 'versions'), { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  options: UploadOptions
): Promise<StoredFile> {
  await ensureStorageDirectory();

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
  }

  const fileHash = hashFile(buffer);
  const fileExt = path.extname(originalName);
  const safeFilename = sanitizeFilename(path.basename(originalName, fileExt));
  const uniqueFilename = `${safeFilename}-${generateToken(8)}${fileExt}`;

  // Create date-based directory structure
  const now = new Date();
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const relativePath = `documents/${yearMonth}/${options.userId}`;
  const fullDir = path.join(STORAGE_PATH, relativePath);

  await fs.mkdir(fullDir, { recursive: true });

  const filePath = path.join(relativePath, uniqueFilename);
  const fullPath = path.join(STORAGE_PATH, filePath);

  await fs.writeFile(fullPath, buffer);

  return {
    filePath,
    fileName: uniqueFilename,
    originalName,
    mimeType,
    fileSize: buffer.length,
    fileHash,
  };
}

export async function saveVersion(
  buffer: Buffer,
  documentId: string,
  version: number,
  originalName: string
): Promise<string> {
  await ensureStorageDirectory();

  const fileExt = path.extname(originalName);
  const versionFilename = `${documentId}-v${version}${fileExt}`;
  const relativePath = `versions/${documentId}`;
  const fullDir = path.join(STORAGE_PATH, relativePath);

  await fs.mkdir(fullDir, { recursive: true });

  const filePath = path.join(relativePath, versionFilename);
  const fullPath = path.join(STORAGE_PATH, filePath);

  await fs.writeFile(fullPath, buffer);

  return filePath;
}

export async function saveThumbnail(
  buffer: Buffer,
  documentId: string
): Promise<string> {
  await ensureStorageDirectory();

  const thumbnailFilename = `${documentId}-thumb.png`;
  const relativePath = 'thumbnails';
  const fullDir = path.join(STORAGE_PATH, relativePath);

  await fs.mkdir(fullDir, { recursive: true });

  const filePath = path.join(relativePath, thumbnailFilename);
  const fullPath = path.join(STORAGE_PATH, filePath);

  await fs.writeFile(fullPath, buffer);

  return filePath;
}

export async function getFile(filePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  return fs.readFile(fullPath);
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    console.error(`Failed to delete file: ${fullPath}`, error);
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileStats(filePath: string): Promise<{ size: number; mtime: Date }> {
  const fullPath = path.join(STORAGE_PATH, filePath);
  const stats = await fs.stat(fullPath);
  return {
    size: stats.size,
    mtime: stats.mtime,
  };
}

export async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  const sourceFullPath = path.join(STORAGE_PATH, sourcePath);
  const destFullPath = path.join(STORAGE_PATH, destPath);
  const destDir = path.dirname(destFullPath);

  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(sourceFullPath, destFullPath);
}

export function getStoragePath(): string {
  return STORAGE_PATH;
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

export async function getStorageUsage(userId: string): Promise<bigint> {
  // This would be calculated from the database
  // For now, return 0
  return BigInt(0);
}

export async function cleanupTempFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
  const tempDir = path.join(STORAGE_PATH, 'temp');

  try {
    const files = await fs.readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
}
