/**
 * GridFS Service
 * Stockage de fichiers (documents candidats) dans MongoDB via GridFS.
 *
 * Bucket name : "documents"
 * Metadata    : candidatId, documentType, originalFilename, contentType, uploadedAt
 *
 * Fonctionne uniquement si MongoDB est connecté (vérifié par l'appelant).
 *
 * IMPORTANT : on utilise mongoose.mongo (le driver mongodb embarqué par mongoose)
 * pour éviter les conflits de types entre le package "mongodb" direct et
 * celui embarqué dans "mongoose".
 */

import mongoose from 'mongoose';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';

// Récupérer GridFSBucket et ObjectId depuis le driver embarqué par mongoose
const { GridFSBucket, ObjectId } = mongoose.mongo;

const BUCKET_NAME = 'documents';

export interface GridFSFileInfo {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  metadata: Record<string, any>;
  /** URL relative pour servir le fichier via l'API */
  url: string;
}

// Types dérivés du driver mongoose.mongo
type GridFSBucketType = InstanceType<typeof GridFSBucket>;
type GridFSFileType = mongoose.mongo.GridFSFile;

/**
 * Retourne le GridFSBucket courant (lié à la connexion mongoose).
 * Lève une erreur si MongoDB n'est pas connecté.
 */
function getBucket(): GridFSBucketType {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB non connecté — GridFS indisponible');
  }
  return new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

// ────────────────────────────────────────────────────────────────
// UPLOAD
// ────────────────────────────────────────────────────────────────

/**
 * Upload un Buffer (ex: multer memoryStorage) dans GridFS.
 *
 * @param buffer       Le contenu du fichier
 * @param filename     Nom original du fichier
 * @param contentType  MIME type (ex: application/pdf)
 * @param metadata     Métadonnées libres (candidatId, documentType, …)
 * @returns            Informations sur le fichier stocké
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata: Record<string, any> = {},
): Promise<GridFSFileInfo> {
  const bucket = getBucket();

  return new Promise<GridFSFileInfo>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType,
        uploadedAt: new Date(),
      },
    });

    const readable = Readable.from(buffer);
    readable
      .pipe(uploadStream)
      .on('error', (err: any) => {
        logger.error(`❌ GridFS upload error (${filename}):`, err);
        reject(err);
      })
      .on('finish', () => {
        const fileId = uploadStream.id.toString();
        logger.info(`✅ GridFS upload OK → fileId=${fileId}, filename=${filename}`);
        resolve({
          fileId,
          filename,
          contentType,
          size: buffer.length,
          uploadedAt: new Date(),
          metadata,
          url: `/api/gridfs/${fileId}`,
        });
      });
  });
}

/**
 * Upload un fichier depuis le disque dans GridFS.
 *
 * @param filePath     Chemin absolu du fichier
 * @param contentType  MIME type (optionnel, déduit de l'extension si absent)
 * @param metadata     Métadonnées libres
 * @returns            Informations sur le fichier stocké
 */
export async function uploadFromDisk(
  filePath: string,
  contentType?: string,
  metadata: Record<string, any> = {},
): Promise<GridFSFileInfo> {
  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);
  const mime = contentType || guessMimeType(filename);
  return uploadBuffer(buffer, filename, mime, metadata);
}

// ────────────────────────────────────────────────────────────────
// DOWNLOAD / READ
// ────────────────────────────────────────────────────────────────

/**
 * Récupère les métadonnées d'un fichier GridFS par son ID.
 */
export async function getFileInfo(fileId: string): Promise<GridFSFileType | null> {
  try {
    const bucket = getBucket();
    const cursor = bucket.find({ _id: new ObjectId(fileId) });
    const files = await cursor.toArray();
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    logger.error(`❌ GridFS getFileInfo(${fileId}):`, error);
    return null;
  }
}

/**
 * Ouvre un ReadableStream pour télécharger le contenu du fichier.
 * L'appelant doit pipe ce stream dans la response HTTP.
 */
export function openDownloadStream(fileId: string): ReturnType<GridFSBucketType['openDownloadStream']> {
  const bucket = getBucket();
  return bucket.openDownloadStream(new ObjectId(fileId));
}

/**
 * Lit le contenu complet d'un fichier en mémoire (Buffer).
 * À utiliser pour les petits fichiers (< 50 MB).
 */
export async function readFileBuffer(fileId: string): Promise<Buffer | null> {
  try {
    const bucket = getBucket();
    const stream = bucket.openDownloadStream(new ObjectId(fileId));

    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: any) => {
        logger.error(`❌ GridFS readFileBuffer(${fileId}):`, err);
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`❌ GridFS readFileBuffer(${fileId}):`, error);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────
// DELETE
// ────────────────────────────────────────────────────────────────

/**
 * Supprime un fichier de GridFS.
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const bucket = getBucket();
    await bucket.delete(new ObjectId(fileId));
    logger.info(`✅ GridFS fichier supprimé: ${fileId}`);
    return true;
  } catch (error) {
    logger.error(`❌ GridFS deleteFile(${fileId}):`, error);
    return false;
  }
}

/**
 * Supprime tous les fichiers correspondant à un candidat + type de document.
 * Utile pour remplacer un document existant lors d'un re-upload.
 */
export async function deleteByMetadata(candidatId: string, documentType: string): Promise<number> {
  try {
    const bucket = getBucket();
    const cursor = bucket.find({
      'metadata.candidatId': candidatId,
      'metadata.documentType': documentType,
    });
    const files = await cursor.toArray();
    let count = 0;
    for (const file of files) {
      await bucket.delete(file._id);
      count++;
    }
    if (count > 0) {
      logger.info(`✅ GridFS: ${count} ancien(s) fichier(s) ${documentType} supprimé(s) pour candidat ${candidatId}`);
    }
    return count;
  } catch (error) {
    logger.error(`❌ GridFS deleteByMetadata:`, error);
    return 0;
  }
}

// ────────────────────────────────────────────────────────────────
// LIST
// ────────────────────────────────────────────────────────────────

/**
 * Liste tous les fichiers associés à un candidat.
 */
export async function listFilesByCandidat(candidatId: string): Promise<GridFSFileInfo[]> {
  try {
    const bucket = getBucket();
    const cursor = bucket.find({ 'metadata.candidatId': candidatId });
    const files = await cursor.toArray();
    return files.map(fileToInfo);
  } catch (error) {
    logger.error(`❌ GridFS listFilesByCandidat(${candidatId}):`, error);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

function fileToInfo(file: GridFSFileType): GridFSFileInfo {
  const metadata = (file as any).metadata || {};
  return {
    fileId: file._id.toString(),
    filename: file.filename || 'unknown',
    contentType: metadata.contentType || 'application/octet-stream',
    size: file.length,
    uploadedAt: file.uploadDate,
    metadata,
    url: `/api/gridfs/${file._id.toString()}`,
  };
}

function guessMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export default {
  uploadBuffer,
  uploadFromDisk,
  getFileInfo,
  openDownloadStream,
  readFileBuffer,
  deleteFile,
  deleteByMetadata,
  listFilesByCandidat,
};
