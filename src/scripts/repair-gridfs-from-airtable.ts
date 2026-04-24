import axios from 'axios';
import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { MongoClient, Db, GridFSBucket, ObjectId } from 'mongodb';
import { pipeline } from 'stream/promises';

dotenv.config();
dotenv.config({ path: '.env.local', override: false });

dns.setDefaultResultOrder('ipv4first');

const DNS_SERVERS = String(process.env.DNS_SERVERS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (DNS_SERVERS.length > 0) {
  try {
    dns.setServers(DNS_SERVERS);
    console.log(`🌐 DNS override activé: ${DNS_SERVERS.join(', ')}`);
  } catch {
    // ignore invalid DNS server values
  }
}

const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
  family: 4,
});

const MONGODB_URI = String(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq').trim();
const DB_NAME = String(process.env.DB_NAME || process.env.MONGODB_DATABASE || 'processiq').trim();
const GRIDFS_BUCKET_NAME = String(process.env.REPAIR_GRIDFS_BUCKET || 'documents').trim();
const AIRTABLE_TOKEN = String(process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_API_KEY || '').trim();
const AIRTABLE_BASE_ID = String(process.env.AIRTABLE_BASE_ID || '').trim();
const AIRTABLE_CANDIDATE_TABLES = String(
  process.env.REPAIR_AIRTABLE_CANDIDATE_TABLES || 'Liste des candidats,Listes des candidats'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const DRY_RUN = !['0', 'false', 'no', 'off'].includes(String(process.env.REPAIR_DRY_RUN || 'true').trim().toLowerCase());
const MAX_FILES = Number(String(process.env.REPAIR_MAX_FILES || '0').trim()) || 0;
const ONLY_CANDIDATE_IDS = String(process.env.REPAIR_CANDIDATE_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const REPORT_PATH = path.resolve(process.cwd(), process.env.REPAIR_REPORT_PATH || 'tmp/repair-gridfs-report.json');

type AttachmentLike = {
  id?: string;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  fileId?: string;
  gridfsFileId?: string;
  gridfsBucket?: string;
  gridfsError?: string;
  [key: string]: any;
};

type RepairIssue =
  | 'missingFileId'
  | 'airtableUrlOnly'
  | 'missingInGridFS'
  | 'gridfsFieldOnly'
  | 'urlUnavailable';

type RepairResult = {
  candidateId: string;
  candidateName: string;
  email: string | null;
  fieldName: string;
  filename: string | null;
  sourceUrl: string | null;
  previousFileId: string | null;
  issueTypes: RepairIssue[];
  status: 'repaired' | 'skipped' | 'failed' | 'would_repair';
  message: string;
  newFileId?: string | null;
};

type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
};

function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function isAttachmentLike(value: unknown): value is AttachmentLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' ||
    typeof candidate.fileId === 'string' ||
    typeof candidate.gridfsFileId === 'string' ||
    typeof candidate.filename === 'string'
  );
}

function sanitizePathSegment(value: string): string {
  return String(value || '').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 160);
}

function toGridFsUrl(fileId: string): string {
  return `/api/gridfs/${fileId}`;
}

function hasAirtableConfig(): boolean {
  return Boolean(AIRTABLE_TOKEN && AIRTABLE_BASE_ID && AIRTABLE_CANDIDATE_TABLES.length > 0);
}

function escapeAirtableFormulaValue(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function buildCandidateName(doc: Record<string, any>): string {
  return [doc['Prénom'], doc['NOM de naissance']].filter(Boolean).join(' ').trim() || '(sans nom)';
}

function getIssueTypes(attachment: AttachmentLike, existingFileIds: Set<string>): RepairIssue[] {
  const issues: RepairIssue[] = [];
  const fileId = typeof attachment.fileId === 'string' && attachment.fileId.trim() ? attachment.fileId.trim() : null;
  const gridfsFileId = typeof attachment.gridfsFileId === 'string' && attachment.gridfsFileId.trim() ? attachment.gridfsFileId.trim() : null;
  const effectiveFileId = fileId || gridfsFileId;
  const url = typeof attachment.url === 'string' ? attachment.url.trim() : '';

  if (!fileId && gridfsFileId) {
    issues.push('gridfsFieldOnly');
  }

  if (!effectiveFileId) {
    issues.push('missingFileId');
    if (/airtable\.com|airtableusercontent\.com/i.test(url)) {
      issues.push('airtableUrlOnly');
    } else {
      issues.push('urlUnavailable');
    }
    return issues;
  }

  if (!ObjectId.isValid(effectiveFileId) || !existingFileIds.has(effectiveFileId)) {
    issues.push('missingInGridFS');
  }

  return issues;
}

async function uploadAttachmentToGridFS(params: {
  bucket: GridFSBucket;
  candidateId: string;
  fieldName: string;
  attachment: AttachmentLike;
}): Promise<{ fileId: string; contentType: string; size: number | null }> {
  const { bucket, candidateId, fieldName, attachment } = params;
  const url = String(attachment.url || '').trim();

  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('URL Airtable absente ou invalide');
  }

  const safeField = sanitizePathSegment(fieldName);
  const safeFilename = sanitizePathSegment(attachment.filename || 'attachment');
  const sourceAttachmentId = sanitizePathSegment(attachment.id || 'no_attachment_id');
  const gridFsFilename = `repair/${candidateId}/${safeField}/${sourceAttachmentId}-${safeFilename}`;

  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 180000,
    httpsAgent,
    headers: {
      'User-Agent': 'processiq-gridfs-repair/1.0',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const contentType = String(
    attachment.type ||
    response.headers?.['content-type'] ||
    'application/octet-stream'
  );

  const uploadStream = bucket.openUploadStream(gridFsFilename, {
    metadata: {
      source: 'airtable-repair',
      candidatId: candidateId,
      documentType: fieldName,
      originalFilename: attachment.filename || null,
      originalUrl: url,
      originalAttachmentId: attachment.id || null,
      contentType,
      uploadedAt: new Date(),
      repairedAt: new Date(),
    },
  });

  await pipeline(response.data, uploadStream);

  return {
    fileId: String(uploadStream.id),
    contentType,
    size: typeof attachment.size === 'number' ? attachment.size : null,
  };
}

async function fetchAirtableRecord(recordId: string): Promise<AirtableRecord | null> {
  if (!hasAirtableConfig()) {
    return null;
  }

  for (const tableName of AIRTABLE_CANDIDATE_TABLES) {
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
          httpsAgent,
          validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
        }
      );

      if (response.status === 404) {
        continue;
      }

      return response.data as AirtableRecord;
    } catch (error: any) {
      const status = error?.response?.status;
      const errorType = String(error?.response?.data?.error?.type || '').trim();
      if (status === 404) {
        continue;
      }
      // Quand un record Airtable ancien n'existe plus/plus accessible,
      // Airtable peut repondre 403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND.
      // Dans notre workflow, cela signifie surtout "lookup par _airtableId indisponible",
      // donc on laisse simplement le fallback par email prendre le relais.
      if (status === 403 && errorType === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
        continue;
      }
      throw error;
    }
  }

  return null;
}

async function fetchAirtableRecordByEmail(email: string): Promise<AirtableRecord | null> {
  if (!hasAirtableConfig()) {
    return null;
  }

  const cleanEmail = String(email || '').trim();
  if (!cleanEmail) {
    return null;
  }

  for (const tableName of AIRTABLE_CANDIDATE_TABLES) {
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_TOKEN}`,
            'Content-Type': 'application/json',
          },
          params: {
            maxRecords: 3,
            filterByFormula: `{E-mail}='${escapeAirtableFormulaValue(cleanEmail)}'`,
          },
          timeout: 30000,
          httpsAgent,
          validateStatus: (status) => (status >= 200 && status < 300) || status === 403 || status === 404,
        }
      );

      if (response.status === 403 || response.status === 404) {
        continue;
      }

      const records = Array.isArray(response.data?.records) ? response.data.records : [];
      const exactMatch = records.find((record: AirtableRecord) => String(record?.fields?.['E-mail'] || '').trim() === cleanEmail);
      if (exactMatch) {
        return exactMatch;
      }
      if (records[0]) {
        return records[0] as AirtableRecord;
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const errorType = String(error?.response?.data?.error?.type || '').trim();
      if (status === 404) {
        continue;
      }
      if (status === 403 && errorType === 'INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') {
        // Ici, un 403 signifie plutot que la table candidate n'est pas bonne
        // pour le token courant. On essaie simplement la suivante.
        continue;
      }
      throw error;
    }
  }

  return null;
}

function resolveAirtableAttachmentFromRecord(
  airtableRecord: AirtableRecord | null,
  fieldName: string,
  attachment: AttachmentLike
): AttachmentLike | null {
  if (!airtableRecord?.fields) {
    return null;
  }

  const fieldValue = airtableRecord.fields[fieldName];
  if (!Array.isArray(fieldValue)) {
    return null;
  }

  const attachments = fieldValue.filter(isAttachmentLike);
  if (attachments.length === 0) {
    return null;
  }

  const sourceAttachmentId = String(attachment.id || '').trim();
  if (sourceAttachmentId) {
    const byId = attachments.find((item) => String(item.id || '').trim() === sourceAttachmentId);
    if (byId) {
      return byId;
    }
  }

  const sourceFilename = String(attachment.filename || '').trim();
  if (sourceFilename) {
    const byFilename = attachments.find((item) => String(item.filename || '').trim() === sourceFilename);
    if (byFilename) {
      return byFilename;
    }
  }

  return attachments[0] || null;
}

async function repairGridFsFromAirtable(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   REPARATION GRIDFS DEPUIS AIRTABLE                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log(`🔗 MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//*****@')}`);
  console.log(`📁 Database: ${DB_NAME}`);
  console.log(`🪣 GridFS bucket: ${GRIDFS_BUCKET_NAME}`);
  console.log(`🛰️ Airtable refresh: ${hasAirtableConfig() ? 'oui' : 'non'}`);
  console.log(`🧪 Dry run: ${DRY_RUN ? 'oui' : 'non'}`);
  if (MAX_FILES > 0) {
    console.log(`🎯 Limite de fichiers: ${MAX_FILES}`);
  }
  if (ONLY_CANDIDATE_IDS.length > 0) {
    console.log(`👤 Filtre candidats: ${ONLY_CANDIDATE_IDS.join(', ')}`);
  }
  console.log('');

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
  });

  const report: {
    generatedAt: string;
    dryRun: boolean;
    database: string;
    bucketName: string;
    scannedCandidates: number;
    scannedAttachments: number;
    repaired: number;
    failed: number;
    skipped: number;
    wouldRepair: number;
    results: RepairResult[];
  } = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    database: DB_NAME,
    bucketName: GRIDFS_BUCKET_NAME,
    scannedCandidates: 0,
    scannedAttachments: 0,
    repaired: 0,
    failed: 0,
    skipped: 0,
    wouldRepair: 0,
    results: [],
  };

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME });
    const candidats = db.collection('Candidats');
    const gridfsFiles = db.collection(`${GRIDFS_BUCKET_NAME}.files`);
    const airtableRecordCache = new Map<string, AirtableRecord | null>();
    const airtableEmailCache = new Map<string, AirtableRecord | null>();

    const existingFileIds = new Set(
      (await gridfsFiles.find({}, { projection: { _id: 1 } }).toArray()).map((doc) => String(doc._id))
    );

    const query = ONLY_CANDIDATE_IDS.length > 0
      ? { _id: { $in: ONLY_CANDIDATE_IDS.filter((value) => ObjectId.isValid(value)).map((value) => new ObjectId(value)) } }
      : {};

    const candidateDocs = await candidats.find(query).toArray();
    report.scannedCandidates = candidateDocs.length;

    let processedRepairs = 0;

    for (const candidate of candidateDocs) {
      const candidateId = String(candidate._id);
      const candidateName = buildCandidateName(candidate);
      const email = candidate['E-mail'] || null;
      let hasChanges = false;

      for (const [fieldName, value] of Object.entries(candidate)) {
        if (!Array.isArray(value)) {
          continue;
        }

        const attachments = value.filter(isAttachmentLike);
        if (attachments.length === 0) {
          continue;
        }

        const updatedAttachments = [...value] as AttachmentLike[];

        for (let index = 0; index < updatedAttachments.length; index += 1) {
          const attachment = updatedAttachments[index];
          if (!isAttachmentLike(attachment)) {
            continue;
          }

          report.scannedAttachments += 1;

          const issueTypes = getIssueTypes(attachment, existingFileIds);
          if (issueTypes.length === 0) {
            continue;
          }

          const sourceUrl = typeof attachment.url === 'string' ? attachment.url : null;
          const previousFileId =
            (typeof attachment.fileId === 'string' && attachment.fileId.trim()) ||
            (typeof attachment.gridfsFileId === 'string' && attachment.gridfsFileId.trim()) ||
            null;

          const baseResult: Omit<RepairResult, 'status' | 'message'> = {
            candidateId,
            candidateName,
            email,
            fieldName,
            filename: attachment.filename || null,
            sourceUrl,
            previousFileId,
            issueTypes,
          };

          let repairAttachment: AttachmentLike = attachment;

          if (candidate._airtableId && hasAirtableConfig()) {
            const airtableRecordId = String(candidate._airtableId).trim();
            if (airtableRecordId) {
              if (!airtableRecordCache.has(airtableRecordId)) {
                airtableRecordCache.set(airtableRecordId, await fetchAirtableRecord(airtableRecordId));
              }
              const refreshedAttachment = resolveAirtableAttachmentFromRecord(
                airtableRecordCache.get(airtableRecordId) || null,
                fieldName,
                attachment
              );
              if (refreshedAttachment?.url) {
                repairAttachment = {
                  ...attachment,
                  ...refreshedAttachment,
                };
              }
            }
          }

          if (
            (!repairAttachment.url || String(repairAttachment.url).trim() === String(sourceUrl || '').trim()) &&
            email &&
            hasAirtableConfig()
          ) {
            const cleanEmail = String(email).trim();
            if (cleanEmail) {
              if (!airtableEmailCache.has(cleanEmail)) {
                airtableEmailCache.set(cleanEmail, await fetchAirtableRecordByEmail(cleanEmail));
              }
              const refreshedAttachmentByEmail = resolveAirtableAttachmentFromRecord(
                airtableEmailCache.get(cleanEmail) || null,
                fieldName,
                attachment
              );
              if (refreshedAttachmentByEmail?.url) {
                repairAttachment = {
                  ...attachment,
                  ...refreshedAttachmentByEmail,
                };
              }
            }
          }

          const canRepairFromUrl = Boolean(repairAttachment.url && /^https?:\/\//i.test(String(repairAttachment.url)));
          if (!canRepairFromUrl) {
            report.failed += 1;
            report.results.push({
              ...baseResult,
              status: 'failed',
              message: hasAirtableConfig()
                ? 'URL source indisponible meme apres refresh Airtable'
                : 'URL source indisponible pour retelechargement (config Airtable absente)',
            });
            continue;
          }

          if (MAX_FILES > 0 && processedRepairs >= MAX_FILES) {
            report.skipped += 1;
            report.results.push({
              ...baseResult,
              status: 'skipped',
              message: `Limite REPAIR_MAX_FILES atteinte (${MAX_FILES})`,
            });
            continue;
          }

          if (DRY_RUN) {
            report.wouldRepair += 1;
            processedRepairs += 1;
            report.results.push({
              ...baseResult,
              status: 'would_repair',
              message: 'Dry run: piece reparable depuis Airtable',
            });
            continue;
          }

          try {
            const upload = await uploadAttachmentToGridFS({
              bucket,
              candidateId,
              fieldName,
              attachment: repairAttachment,
            });

            existingFileIds.add(upload.fileId);

            updatedAttachments[index] = {
              ...attachment,
              ...repairAttachment,
              fileId: upload.fileId,
              gridfsFileId: upload.fileId,
              gridfsBucket: GRIDFS_BUCKET_NAME,
              url: toGridFsUrl(upload.fileId),
              type: upload.contentType || attachment.type,
              contentType: upload.contentType,
              gridfsError: undefined,
            };

            hasChanges = true;
            processedRepairs += 1;
            report.repaired += 1;
            report.results.push({
              ...baseResult,
              status: 'repaired',
              message: 'Piece reuploadee avec succes dans GridFS',
              newFileId: upload.fileId,
            });
          } catch (error: any) {
            report.failed += 1;
            report.results.push({
              ...baseResult,
              status: 'failed',
              message: String(error?.message || error),
            });
          }
        }

        if (hasChanges) {
          await candidats.updateOne(
            { _id: new ObjectId(candidateId) },
            {
              $set: {
                [fieldName]: updatedAttachments,
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    }
  } finally {
    ensureDirForFile(REPORT_PATH);
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    await client.close();
  }

  console.log('✅ Script terminé');
  console.log(`- Candidats scannés: ${report.scannedCandidates}`);
  console.log(`- Pièces scannées: ${report.scannedAttachments}`);
  console.log(`- Réparées: ${report.repaired}`);
  console.log(`- En échec: ${report.failed}`);
  console.log(`- Ignorées: ${report.skipped}`);
  console.log(`- Réparables (dry-run): ${report.wouldRepair}`);
  console.log(`- Rapport: ${REPORT_PATH}`);
}

repairGridFsFromAirtable().catch((error) => {
  console.error('❌ Erreur script repair-gridfs-from-airtable:', error);
  process.exit(1);
});
