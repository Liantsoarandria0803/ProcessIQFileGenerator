import { Router, Request, Response } from 'express';
import { getFileInfo, openDownloadStream, listFilesByCandidat } from '../services/gridfsService';
import { isMongoConnected } from '../config/database';
import config from '../config';
import logger from '../utils/logger';

const router = Router();

function toPublicApiUrl(url: string): string {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return cleanUrl;
  }

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }

  const baseUrl = String(config.publicBaseUrl || config.api?.baseUrl || '').trim().replace(/\/+$/, '');
  const normalizedPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

function buildContentDisposition(filename: string, mode: 'inline' | 'attachment'): string {
  const fallback = filename.replace(/[^\x20-\x7E]+/g, '_').replace(/["\\]/g, '_') || 'document';
  const utf8Name = encodeURIComponent(filename || 'document');
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${utf8Name}`;
}

async function streamGridFsFile(req: Request, res: Response, forceDownload = false): Promise<void> {
  if (!isMongoConnected()) {
    res.status(503).json({
      success: false,
      error: 'MongoDB non connecte',
    });
    return;
  }

  const { fileId } = req.params;
  const fileInfo = await getFileInfo(fileId);

  if (!fileInfo) {
    res.status(404).json({
      success: false,
      error: 'Fichier non trouve',
    });
    return;
  }

  const metadata = (fileInfo as any).metadata || {};
  const contentType = metadata.contentType || 'application/octet-stream';
  const filename = metadata.originalFilename || fileInfo.filename || 'document';
  const shouldDownload =
    forceDownload || ['1', 'true', 'yes'].includes(String(req.query.download || '').toLowerCase());

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', buildContentDisposition(filename, shouldDownload ? 'attachment' : 'inline'));
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
  if (fileInfo.length) {
    res.setHeader('Content-Length', fileInfo.length.toString());
  }

  const downloadStream = openDownloadStream(fileId);

  downloadStream.on('error', (err) => {
    logger.error(`Erreur stream GridFS (${fileId}):`, err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Erreur lecture fichier' });
    }
  });

  downloadStream.pipe(res);
}

router.get('/candidat/:candidatId', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB non connecte',
      });
    }

    const files = await listFilesByCandidat(req.params.candidatId);

    res.json({
      success: true,
      data: files.map((file) => ({
        ...file,
        url: toPublicApiUrl(file.url),
      })),
      count: files.length,
    });
  } catch (error: any) {
    logger.error('Erreur route /gridfs/candidat/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    await streamGridFsFile(req, res);
  } catch (error: any) {
    logger.error('Erreur route /gridfs/:fileId:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

router.get('/:fileId/download', async (req: Request, res: Response) => {
  try {
    await streamGridFsFile(req, res, true);
  } catch (error: any) {
    logger.error('Erreur route /gridfs/:fileId/download:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

export default router;
