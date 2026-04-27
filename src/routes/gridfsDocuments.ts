import { Router, Request, Response } from 'express';
import { getFileInfo, openDownloadStream, listFilesByCandidat } from '../services/gridfsService';
import { isMongoConnected } from '../config/database';
import logger from '../utils/logger';

const router = Router();

function buildContentDisposition(filename: string, forceDownload: boolean): string {
  const dispositionType = forceDownload ? 'attachment' : 'inline';
  return `${dispositionType}; filename="${encodeURIComponent(filename)}"`;
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
      data: files,
      count: files.length,
    });
  } catch (error: any) {
    logger.error('Erreur route /gridfs/candidat/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function streamGridfsFile(req: Request, res: Response, forceDownload: boolean): Promise<Response | void> {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB non connecte',
      });
    }

    const { fileId } = req.params;
    const fileInfo = await getFileInfo(fileId);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: 'Fichier non trouve',
      });
    }

    const metadata = (fileInfo as any).metadata || {};
    const contentType = metadata.contentType || 'application/octet-stream';
    const filename = fileInfo.filename || 'document';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', buildContentDisposition(filename, forceDownload));
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
  } catch (error: any) {
    logger.error('Erreur route /gridfs/:fileId:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

router.get('/:fileId/download', async (req: Request, res: Response) => {
  return streamGridfsFile(req, res, true);
});

router.get('/:fileId', async (req: Request, res: Response) => {
  const download = String(req.query.download || '').trim().toLowerCase();
  const forceDownload = download === '1' || download === 'true' || download === 'yes';
  return streamGridfsFile(req, res, forceDownload);
});

export default router;
