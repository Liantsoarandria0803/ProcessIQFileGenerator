/**
 * Route de téléchargement de documents stockés dans GridFS.
 *
 * GET /api/documents/:fileId  →  Stream du fichier depuis GridFS
 * GET /api/documents/candidat/:candidatId  →  Liste des fichiers d'un candidat
 */

import { Router, Request, Response } from 'express';
import { getFileInfo, openDownloadStream, listFilesByCandidat } from '../services/gridfsService';
import { isMongoConnected } from '../config/database';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/documents/{fileId}:
 *   get:
 *     summary: Télécharge un fichier depuis GridFS
 *     tags: [Documents GridFS]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID GridFS du fichier (ObjectId)
 *     responses:
 *       200:
 *         description: Fichier streamé avec succès
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Fichier non trouvé
 *       503:
 *         description: MongoDB non connecté
 */
router.get('/:fileId', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB non connecté — téléchargement indisponible',
      });
    }

    const { fileId } = req.params;

    // Vérifier que le fichier existe
    const fileInfo = await getFileInfo(fileId);
    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        error: 'Fichier non trouvé',
      });
    }

    // Définir les headers HTTP
    const metadata = (fileInfo as any).metadata || {};
    const contentType = metadata.contentType || 'application/octet-stream';
    const filename = fileInfo.filename || 'document';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    if (fileInfo.length) {
      res.setHeader('Content-Length', fileInfo.length.toString());
    }

    // Stream le fichier vers la réponse
    const downloadStream = openDownloadStream(fileId);

    downloadStream.on('error', (err) => {
      logger.error(`❌ Erreur stream GridFS (${fileId}):`, err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Erreur lecture fichier' });
      }
    });

    downloadStream.pipe(res);
  } catch (error: any) {
    logger.error('❌ Erreur route /documents/:fileId:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/documents/candidat/{candidatId}:
 *   get:
 *     summary: Liste tous les documents d'un candidat
 *     tags: [Documents GridFS]
 *     parameters:
 *       - in: path
 *         name: candidatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liste des documents
 *       503:
 *         description: MongoDB non connecté
 */
router.get('/candidat/:candidatId', async (req: Request, res: Response) => {
  try {
    if (!isMongoConnected()) {
      return res.status(503).json({
        success: false,
        error: 'MongoDB non connecté',
      });
    }

    const files = await listFilesByCandidat(req.params.candidatId);

    res.json({
      success: true,
      data: files,
      count: files.length,
    });
  } catch (error: any) {
    logger.error('❌ Erreur route /documents/candidat/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
