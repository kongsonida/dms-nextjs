import { createWorker, QUEUE_NAMES, OcrJobData, VirusScanJobData, ThumbnailJobData, IndexJobData } from '../lib/queue';
import { processDocumentOcr } from '../lib/ocr';
import { scanFile } from '../lib/virus-scan';
import { indexDocument, removeDocumentFromIndex, DocumentSearchRecord } from '../lib/search';
import prisma from '../lib/prisma';
import { Job } from 'bullmq';

console.log('Starting DMS Background Worker...');

// OCR Worker
const ocrWorker = createWorker<OcrJobData>(
  QUEUE_NAMES.OCR,
  async (job: Job<OcrJobData>) => {
    console.log(`Processing OCR job for document: ${job.data.documentId}`);

    try {
      // Update status to processing
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: { ocrStatus: 'PROCESSING' },
      });

      const result = await processDocumentOcr(
        job.data.documentId,
        job.data.filePath,
        job.data.mimeType
      );

      if (result.success) {
        await prisma.document.update({
          where: { id: job.data.documentId },
          data: {
            ocrText: result.text,
            ocrStatus: 'COMPLETED',
          },
        });
        console.log(`OCR completed for document: ${job.data.documentId}`);
      } else {
        await prisma.document.update({
          where: { id: job.data.documentId },
          data: { ocrStatus: 'FAILED' },
        });
        console.error(`OCR failed for document: ${job.data.documentId}`, result.error);
      }

      return result;
    } catch (error) {
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: { ocrStatus: 'FAILED' },
      });
      throw error;
    }
  },
  2 // Concurrency
);

// Virus Scan Worker
const virusScanWorker = createWorker<VirusScanJobData>(
  QUEUE_NAMES.VIRUS_SCAN,
  async (job: Job<VirusScanJobData>) => {
    console.log(`Processing virus scan for document: ${job.data.documentId}`);

    try {
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: { virusScanStatus: 'SCANNING' },
      });

      const result = await scanFile(job.data.filePath);

      await prisma.document.update({
        where: { id: job.data.documentId },
        data: {
          virusScanStatus: result.isClean ? 'CLEAN' : 'INFECTED',
          virusScanResult: result.virusName || result.error || null,
          lastScannedAt: new Date(),
        },
      });

      console.log(
        `Virus scan ${result.isClean ? 'clean' : 'infected'} for document: ${job.data.documentId}`
      );

      return result;
    } catch (error) {
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: { virusScanStatus: 'ERROR' },
      });
      throw error;
    }
  },
  3 // Concurrency
);

// Search Indexing Worker
const indexWorker = createWorker<IndexJobData>(
  QUEUE_NAMES.INDEX,
  async (job: Job<IndexJobData>) => {
    console.log(`Processing index job for document: ${job.data.documentId}`);

    if (job.data.action === 'remove') {
      await removeDocumentFromIndex(job.data.documentId);
      console.log(`Removed document from index: ${job.data.documentId}`);
      return { removed: true };
    }

    const document = await prisma.document.findUnique({
      where: { id: job.data.documentId },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        folder: {
          select: { id: true, name: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!document) {
      console.log(`Document not found: ${job.data.documentId}`);
      return { error: 'Document not found' };
    }

    const searchRecord: DocumentSearchRecord = {
      id: document.id,
      title: document.title,
      description: document.description || '',
      fileName: document.fileName,
      documentNumber: document.documentNumber || '',
      documentType: document.documentType,
      direction: document.direction,
      status: document.status,
      ocrText: document.ocrText || '',
      tags: document.tags.map((t) => t.tag.name),
      ownerId: document.ownerId,
      ownerName: document.owner.name || 'Unknown',
      folderId: document.folderId || '',
      folderName: document.folder?.name || '',
      createdAt: document.createdAt.getTime(),
      updatedAt: document.updatedAt.getTime(),
    };

    await indexDocument(searchRecord);
    console.log(`Indexed document: ${job.data.documentId}`);

    return { indexed: true };
  },
  5 // Concurrency
);

// Handle worker events
[ocrWorker, virusScanWorker, indexWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down workers...');
  await Promise.all([
    ocrWorker.close(),
    virusScanWorker.close(),
    indexWorker.close(),
  ]);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('DMS Background Worker started successfully');
