/**
 * ============================================================
 * SCRIPT DE MIGRATION COMPLET : Airtable → MongoDB
 * ============================================================
 * Migre les tables Airtable V1 vers des collections MongoDB "flat legacy".
 * Les documents Mongo conservent :
 *   - `_airtableId` (ancien record id Airtable "rec...")
 *   - `_airtableCreatedTime`
 *   - `_migratedAt`
 *   - et copient TOUS les champs Airtable au top-level (clés nettoyées de . et $)
 *
 * Tables migrées :
 *   1. Liste(s) des candidats → Candidats
 *   2. Fiche entreprise       → entreprises
 *   3. Résultats PDF          → resultats_pdf
 *   4. Resultat entretien     → resultats_entretien
 *   5. projet pro             → projet_pro
 *   6. support bugs           → support_bugs
 *
 * Configuration Mongo supportée (compat) :
 *   - `MONGO_URI` / `DB_NAME`
 *   - `MONGODB_URI` / `MONGODB_DATABASE`
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-all-to-mongodb.ts
 *
 * Options via env:
 *   - `MIGRATE_WIPE=true` : supprime la collection avant import (par table)
 * ============================================================
 */

import axios from 'axios';
import * as dns from 'dns';
import * as https from 'https';
import * as dotenv from 'dotenv';
import { Collection, MongoClient, Db, GridFSBucket, ObjectId } from 'mongodb';
import { pipeline } from 'stream/promises';

// Charger .env puis .env.local (sans override) pour récupérer par ex. DNS_SERVERS
dotenv.config();
dotenv.config({ path: '.env.local', override: false });
dns.setDefaultResultOrder('ipv4first');

// Optionnel : override DNS pour résoudre les URIs mongodb+srv (Atlas) quand le DNS système est défaillant.
// Exemple: DNS_SERVERS=1.1.1.1,8.8.8.8
const DNS_SERVERS = String(process.env.DNS_SERVERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (DNS_SERVERS.length > 0) {
  try {
    dns.setServers(DNS_SERVERS);
    console.log(`🌐 DNS override activé: ${DNS_SERVERS.join(', ')}`);
  } catch {
    // ignore
  }
}

// IMPORTANT: dns.setServers n'affecte PAS la résolution getaddrinfo (dns.lookup) utilisée par net/tls.
// Sur certains réseaux, ça provoque ENOTFOUND sur les hosts shard Atlas.
// On override donc dns.lookup pour utiliser un Resolver basé sur DNS_SERVERS (CLI uniquement).
const DNS_LOOKUP_OVERRIDE = !['0', 'false', 'no', 'off'].includes(String(process.env.DNS_LOOKUP_OVERRIDE || 'true').trim().toLowerCase());
if (DNS_SERVERS.length > 0 && DNS_LOOKUP_OVERRIDE) {
  try {
    const resolver = new dns.Resolver();
    resolver.setServers(DNS_SERVERS);

    const originalLookup: any = dns.lookup;
    (dns as any).lookup = function lookup(hostname: any, options: any, callback: any) {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      const family = typeof options === 'number' ? options : (options && options.family) || 0;
      const all = Boolean(options && options.all);
      const host = String(hostname || '');

      if (!host || /^[0-9.]+$/.test(host) || host.includes(':')) {
        return originalLookup(hostname, options, callback);
      }

      const resolve = (family === 6)
        ? (resolver as any).resolve6.bind(resolver)
        : (resolver as any).resolve4.bind(resolver);

      resolve(host, (err: any, addresses: string[]) => {
        if (err || !addresses || addresses.length === 0) {
          return originalLookup(hostname, options, callback);
        }
        if (all) {
          return callback(null, addresses.map((address) => ({ address, family: family === 6 ? 6 : 4 })));
        }
        return callback(null, addresses[0], family === 6 ? 6 : 4);
      });
    };
  } catch {
    // ignore
  }
}

// Agent HTTPS forçant IPv4 (résout les problèmes de connexion)
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
  family: 4, // IPv4 only
});

// =====================================================
// CONFIGURATION
// =====================================================

const AIRTABLE_TOKEN = String(process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_API_KEY || '').trim();
const AIRTABLE_BASE_ID = String(process.env.AIRTABLE_BASE_ID || '').trim();

const MONGODB_URI = String(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/processiq').trim();
const MONGODB_DB_NAME = resolveMongoDbName(MONGODB_URI);

const MIGRATE_WIPE = String(process.env.MIGRATE_WIPE || '').trim().toLowerCase() === 'true'
  || String(process.env.MIGRATE_WIPE || '').trim() === '1';

// =====================================================
// MIGRATION DES FICHIERS (Airtable attachments -> GridFS)
// =====================================================

// Par défaut ON stocke les fichiers bruts (demande explicite).
const MIGRATE_FILES = !['0', 'false', 'no', 'off'].includes(String(process.env.MIGRATE_FILES || 'true').trim().toLowerCase());
const GRIDFS_BUCKET_NAME = String(process.env.GRIDFS_BUCKET_NAME || 'airtable_attachments').trim();

// Sécurité/perf : limite de taille (en MB) pour éviter de saturer la migration.
// Laisser vide / 0 pour désactiver.
const MIGRATE_FILES_MAX_MB = Number(String(process.env.MIGRATE_FILES_MAX_MB || '100').trim());
const MIGRATE_FILES_WIPE = String(process.env.MIGRATE_FILES_WIPE || '').trim().toLowerCase() === 'true'
  || String(process.env.MIGRATE_FILES_WIPE || '').trim() === '1';

type TableSpec = {
  logicalName: string;
  airtableCandidates: string[];
  mongoCollection: string;
};

type AirtableAttachment = {
  id: string;
  url: string;
  filename?: string;
  size?: number;
  type?: string;
};

// Tables Airtable V1 à migrer
const TABLES: TableSpec[] = [
  {
    logicalName: 'candidats',
    airtableCandidates: ['Liste des candidats', 'Listes des candidats'],
    mongoCollection: 'Candidats',
  },
  {
    logicalName: 'entreprises',
    airtableCandidates: ['Fiche entreprise', 'Fiche de Renseignement Entreprise', 'Fiche de Renseignement entreprise'],
    mongoCollection: 'entreprises',
  },
  {
    logicalName: 'resultats_pdf',
    airtableCandidates: ['Résultats PDF', 'Resultats PDF'],
    mongoCollection: 'resultats_pdf',
  },
  {
    logicalName: 'resultats_entretien',
    airtableCandidates: ['Resultat entretien', 'Résultat entretien', 'Résultats entretien'],
    mongoCollection: 'resultats_entretien',
  },
  {
    logicalName: 'projet_pro',
    airtableCandidates: ['projet pro', 'Projet pro', 'projet_pro'],
    mongoCollection: 'projet_pro',
  },
  {
    logicalName: 'support_bugs',
    airtableCandidates: [
      String(process.env.AIRTABLE_SUPPORT_TABLE || '').trim(),
      'support bugs',
      'Support Bugs',
      'Bug Reports',
      'Bugs',
    ].filter(Boolean),
    mongoCollection: 'support_bugs',
  },
];

function resolveMongoDbName(uri: string): string {
  const envDbName = String(process.env.DB_NAME || process.env.MONGODB_DATABASE || '').trim();
  if (envDbName) return envDbName;

  // Try to parse db from mongodb://.../<db>?query
  try {
    const url = new URL(uri);
    const pathname = (url.pathname || '').replace(/^\//, '').trim();
    if (pathname) return pathname;
  } catch {
    // Not a URL the WHATWG parser can parse (rare); fall through.
  }

  return 'processiq';
}

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

/**
 * Récupère TOUS les records d'une table Airtable (avec pagination)
 */
async function fetchAllAirtableRecords(tableName: string): Promise<any[]> {
  const allRecords: any[] = [];
  let offset: string | undefined;

  console.log(`  📥 Récupération de "${tableName}" depuis Airtable...`);

  do {
    const params: Record<string, any> = {};
    if (offset) params.offset = offset;

    const response = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 120000,
        httpsAgent, // Forcer IPv4
      }
    );

    const records = response.data.records || [];
    allRecords.push(...records);
    offset = response.data.offset;

    // Respect du rate limit Airtable (5 requêtes/seconde)
    if (offset) {
      await sleep(250);
    }

  } while (offset);

  console.log(`  ✅ ${allRecords.length} records récupérés de "${tableName}"`);
  return allRecords;
}

function isTableNotFoundError(error: any): boolean {
  const status = error?.response?.status;
  const type = String(error?.response?.data?.error?.type || '');
  const message = String(error?.response?.data?.error?.message || error?.message || '');
  return (
    status === 404 ||
    type === 'NOT_FOUND' ||
    type === 'TABLE_NOT_FOUND' ||
    /table/i.test(message)
  );
}

async function fetchAllAirtableRecordsWithFallback(tableCandidates: string[]): Promise<{ tableName: string; records: any[] }> {
  let lastError: any = null;
  for (const candidate of tableCandidates) {
    const tableName = String(candidate || '').trim();
    if (!tableName) continue;
    try {
      const records = await fetchAllAirtableRecords(tableName);
      return { tableName, records };
    } catch (error: any) {
      lastError = error;
      if (!isTableNotFoundError(error)) {
        throw error;
      }
      const errMsg = error?.response?.data?.error?.message || error?.message || error;
      console.warn(`  ⚠️ Table Airtable introuvable/inaccessible: "${tableName}" (${JSON.stringify(errMsg)}) → tentative suivante...`);
    }
  }
  throw lastError || new Error('Aucune table Airtable candidate accessible');
}

/**
 * Transforme un record Airtable en document MongoDB
 * Garde la structure flat, ajoute l'airtableId et les timestamps
 */
function transformRecord(record: any): Record<string, any> {
  const doc: Record<string, any> = {
    _airtableId: record.id,
    _airtableCreatedTime: record.createdTime || null,
    _migratedAt: new Date(),
  };

  // Copier tous les fields Airtable tels quels
  if (record.fields) {
    for (const [key, value] of Object.entries(record.fields)) {
      // Nettoyer les noms de clés pour MongoDB (remplacer les . et $ qui sont interdits)
      const cleanKey = key.replace(/\./g, '_').replace(/\$/g, '_');
      doc[cleanKey] = value;
    }
  }

  return doc;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const sanitizePathSegment = (value: string): string => String(value || '').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 160);

function isAirtableAttachment(value: any): value is AirtableAttachment {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.url === 'string' &&
    /^https?:\/\//i.test(value.url)
  );
}

function isAirtableAttachmentArray(value: any): value is AirtableAttachment[] {
  return Array.isArray(value) && value.length > 0 && value.every(isAirtableAttachment);
}

function getGridFsCollections(bucketName: string): { files: string; chunks: string } {
  return {
    files: `${bucketName}.files`,
    chunks: `${bucketName}.chunks`,
  };
}

async function ensureGridFsIndexes(db: Db, bucketName: string): Promise<void> {
  const { files } = getGridFsCollections(bucketName);
  const col = db.collection(files);

  // Index pour lookup rapide d'idempotence
  try {
    await col.createIndex(
      { 'metadata.airtableBaseId': 1, 'metadata.airtableAttachmentId': 1 },
      { name: 'airtableBase_attachmentId' }
    );
  } catch (err: any) {
    console.warn(`  ⚠️ Index GridFS metadata: ${err?.message || err}`);
  }
}

async function maybeWipeGridFsBucket(db: Db, bucketName: string): Promise<void> {
  if (!MIGRATE_FILES_WIPE) return;
  const { files, chunks } = getGridFsCollections(bucketName);
  console.log(`\n🧹 MIGRATE_FILES_WIPE=true → suppression GridFS bucket "${bucketName}" (${files}, ${chunks})`);
  await db.collection(chunks).deleteMany({});
  await db.collection(files).deleteMany({});
}

async function findExistingGridFsFileId(db: Db, bucketName: string, baseId: string, attachmentId: string): Promise<ObjectId | null> {
  const { files } = getGridFsCollections(bucketName);
  const existing = await db.collection(files).findOne(
    { 'metadata.airtableBaseId': baseId, 'metadata.airtableAttachmentId': attachmentId },
    { projection: { _id: 1 } }
  );
  if (!existing?._id) return null;
  return existing._id instanceof ObjectId ? existing._id : new ObjectId(existing._id);
}

async function downloadAttachmentToGridFS(params: {
  db: Db;
  bucket: GridFSBucket;
  bucketName: string;
  baseId: string;
  tableName: string;
  mongoCollection: string;
  airtableRecordId: string;
  fieldName: string;
  attachment: AirtableAttachment;
}): Promise<ObjectId> {
  const { db, bucket, bucketName, baseId, tableName, mongoCollection, airtableRecordId, fieldName, attachment } = params;

  const existingId = await findExistingGridFsFileId(db, bucketName, baseId, attachment.id);
  if (existingId) return existingId;

  const sizeBytes = Number(attachment.size || 0);
  if (MIGRATE_FILES_MAX_MB > 0 && sizeBytes > MIGRATE_FILES_MAX_MB * 1024 * 1024) {
    throw new Error(`Fichier trop volumineux (${Math.round(sizeBytes / 1024 / 1024)}MB > ${MIGRATE_FILES_MAX_MB}MB)`);
  }

  const safeTable = sanitizePathSegment(mongoCollection || tableName);
  const safeField = sanitizePathSegment(fieldName);
  const safeFile = sanitizePathSegment(attachment.filename || 'attachment');
  const gridFsFileName = `${safeTable}/${airtableRecordId}/${safeField}/${attachment.id}-${safeFile}`;

  const response = await axios.get(attachment.url, {
    responseType: 'stream',
    timeout: 180000,
    httpsAgent,
    headers: {
      // Certains endpoints refusent des UA vides
      'User-Agent': 'processiq-migration/1.0',
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const resolvedMimeType = String(
    attachment.type ||
    response.headers?.['content-type'] ||
    'application/octet-stream'
  );

  const uploadStream = bucket.openUploadStream(gridFsFileName, {
    metadata: {
      source: 'airtable',
      airtableBaseId: baseId,
      airtableTableName: tableName,
      mongoCollection,
      airtableRecordId,
      airtableFieldName: fieldName,
      airtableAttachmentId: attachment.id,
      originalFileName: attachment.filename || null,
      originalUrl: attachment.url,
      originalSize: attachment.size ?? null,
      originalType: attachment.type ?? null,
      resolvedMimeType,
      migratedAt: new Date(),
    },
  });

  await pipeline(response.data, uploadStream);
  return new ObjectId(uploadStream.id);
}

async function migrateAttachmentsInDoc(params: {
  db: Db;
  bucket: GridFSBucket;
  bucketName: string;
  baseId: string;
  tableName: string;
  mongoCollection: string;
  doc: Record<string, any>;
}): Promise<{ processed: number; stored: number; skipped: number; failed: number }> {
  const { db, bucket, bucketName, baseId, tableName, mongoCollection, doc } = params;

  let processed = 0;
  let stored = 0;
  let skipped = 0;
  let failed = 0;

  const airtableRecordId = String(doc._airtableId || '');

  for (const [fieldName, value] of Object.entries(doc)) {
    if (fieldName.startsWith('_')) continue;
    if (!isAirtableAttachmentArray(value)) continue;

    const updated: any[] = [];

    for (const attachment of value) {
      processed += 1;
      try {
        const existingId = await findExistingGridFsFileId(db, bucketName, baseId, attachment.id);
        if (existingId) {
          skipped += 1;
          updated.push({ ...attachment, gridfsBucket: GRIDFS_BUCKET_NAME, gridfsFileId: existingId });
          continue;
        }

        const fileId = await downloadAttachmentToGridFS({
          db,
          bucket,
          bucketName,
          baseId,
          tableName,
          mongoCollection,
          airtableRecordId,
          fieldName,
          attachment,
        });
        stored += 1;
        updated.push({ ...attachment, gridfsBucket: GRIDFS_BUCKET_NAME, gridfsFileId: fileId });
      } catch (err: any) {
        failed += 1;
        // Ne pas casser la migration : on garde l'attachment original (URL) + une trace d'erreur
        updated.push({ ...attachment, gridfsError: String(err?.message || err) });
      }
    }

    // Remplacer le champ par la version enrichie
    (doc as any)[fieldName] = updated;
  }

  return { processed, stored, skipped, failed };
}

/**
 * Crée les index recommandés pour chaque collection
 */
async function createIndexes(db: Db): Promise<void> {
  console.log('\n📇 Création des index...');

  const ensureUniqueSparseAirtableIdIndex = async (collection: Collection): Promise<void> => {
    const desiredKey = { _airtableId: 1 };
    const desiredName = '_airtableId_1';
    try {
      const indexes = await collection.indexes();
      const existing = indexes.find((i: any) => i.name === desiredName);
      const keyMatches = existing && JSON.stringify(existing.key) === JSON.stringify(desiredKey);
      const uniqueMatches = existing && Boolean(existing.unique) === true;
      const sparseMatches = existing && Boolean(existing.sparse) === true;

      if (existing && keyMatches && uniqueMatches && sparseMatches) {
        return;
      }

      if (existing) {
        await collection.dropIndex(desiredName);
      }
    } catch (err: any) {
      // Si l'index ne peut pas être lu/drop, on tente quand même createIndex plus bas.
      console.warn(`  ⚠️ ensure _airtableId_1: ${err?.message || err}`);
    }

    await collection.createIndex({ _airtableId: 1 }, { unique: true, sparse: true, name: '_airtableId_1' });
  };

  // Candidats (collection legacy attendue par ProcessIQFileGenerator-main-release)
  try {
    const candidats = db.collection('Candidats');
    await ensureUniqueSparseAirtableIdIndex(candidats);
    await candidats.createIndex({ 'E-mail': 1 });
    await candidats.createIndex({ 'NOM de naissance': 1, 'Prénom': 1 });
    await candidats.createIndex({ 'Formation': 1 });
    await candidats.createIndex({ 'Numero Inscription': 1 });
    console.log('  ✅ Index Candidats créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index Candidats: ${err?.message || err}`);
  }

  // Entreprises
  try {
    const entreprises = db.collection('entreprises');
    await ensureUniqueSparseAirtableIdIndex(entreprises);
    await entreprises.createIndex({ 'recordIdetudiant': 1 });
    await entreprises.createIndex({ 'Raison sociale': 1 });
    await entreprises.createIndex({ 'Numéro SIRET': 1 });
    console.log('  ✅ Index entreprises créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index entreprises: ${err?.message || err}`);
  }

  // Résultats PDF
  try {
    const resultatsPdf = db.collection('resultats_pdf');
    await ensureUniqueSparseAirtableIdIndex(resultatsPdf);
    await resultatsPdf.createIndex({ 'E-mail': 1 });
    console.log('  ✅ Index resultats_pdf créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index resultats_pdf: ${err?.message || err}`);
  }

  // Résultats entretien
  try {
    const resultatsEntretien = db.collection('resultats_entretien');
    await ensureUniqueSparseAirtableIdIndex(resultatsEntretien);
    await resultatsEntretien.createIndex({ 'E-mail': 1 });
    console.log('  ✅ Index resultats_entretien créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index resultats_entretien: ${err?.message || err}`);
  }

  // projet_pro
  try {
    const projetPro = db.collection('projet_pro');
    await ensureUniqueSparseAirtableIdIndex(projetPro);
    await projetPro.createIndex({ 'E-mail': 1 });
    console.log('  ✅ Index projet_pro créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index projet_pro: ${err?.message || err}`);
  }

  // support_bugs
  try {
    const supportBugs = db.collection('support_bugs');
    await ensureUniqueSparseAirtableIdIndex(supportBugs);
    await supportBugs.createIndex({ 'reporter email': 1 });
    await supportBugs.createIndex({ status: 1, 'created At': -1 });
    console.log('  ✅ Index support_bugs créés');
  } catch (err: any) {
    console.warn(`  ⚠️ Index support_bugs: ${err?.message || err}`);
  }
}

// =====================================================
// MIGRATION PRINCIPALE
// =====================================================

async function migrateAll() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   MIGRATION AIRTABLE → MONGODB                      ║');
  console.log('║   6 tables V1 : candidats, entreprises, PDF, etc.   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Validation config
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('❌ AIRTABLE_API_TOKEN et AIRTABLE_BASE_ID requis dans .env');
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error('❌ MONGO_URI / MONGODB_URI requis dans .env');
    process.exit(1);
  }

  console.log(`🔗 MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//*****@')}`);
  console.log(`📁 Database: ${MONGODB_DB_NAME}\n`);

  if (MIGRATE_WIPE) {
    console.log('🧹 MIGRATE_WIPE=true → les collections seront vidées avant import');
  }

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4, // Forcer IPv4
    maxPoolSize: 2,
    retryWrites: true,
  });

  try {
    // 1. Connexion MongoDB
    console.log('🔌 Connexion à MongoDB...');
    await client.connect();
    console.log('✅ Connecté à MongoDB\n');

    const db = client.db(MONGODB_DB_NAME);

    // 2. Créer les index
    await createIndexes(db);

    // 2.5 GridFS
    let gridFsBucket: GridFSBucket | null = null;
    if (MIGRATE_FILES) {
      console.log(`\n🗄️  Migration des fichiers activée → GridFS bucket: "${GRIDFS_BUCKET_NAME}"`);
      gridFsBucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME });
      await ensureGridFsIndexes(db, GRIDFS_BUCKET_NAME);
      await maybeWipeGridFsBucket(db, GRIDFS_BUCKET_NAME);
    } else {
      console.log('\n🗄️  Migration des fichiers désactivée (MIGRATE_FILES=false)');
    }

    // 3. Migrer chaque table
    const stats: { table: string; fetched: number; inserted: number; errors: number; files?: { processed: number; stored: number; skipped: number; failed: number } }[] = [];

    for (const table of TABLES) {
      console.log(`\n${'='.repeat(55)}`);
      console.log(`📦 Migration: ${table.logicalName} → "${table.mongoCollection}"`);
      console.log('='.repeat(55));

      try {
        // Récupérer les données depuis Airtable (avec fallback sur plusieurs noms de table)
        const { tableName: resolvedAirtableTable, records } = await fetchAllAirtableRecordsWithFallback(table.airtableCandidates);
        console.log(`  🧭 Table Airtable utilisée: "${resolvedAirtableTable}"`);

        if (records.length === 0) {
          console.log(`  ⚠️ Aucun record trouvé dans "${resolvedAirtableTable}", skip.`);
          stats.push({ table: resolvedAirtableTable, fetched: 0, inserted: 0, errors: 0 });
          continue;
        }

        // Transformer les records
        const documents = records.map(transformRecord);

        const collection = db.collection(table.mongoCollection);
        if (MIGRATE_WIPE) {
          const existingCount = await collection.countDocuments();
          if (existingCount > 0) {
            console.log(`  🗑️  ${existingCount} documents existants trouvés → suppression...`);
            await collection.deleteMany({});
          }
        }

        // Upsert des documents un par un (idempotent + résilient)
        let insertedOrUpdated = 0;
        let errors = 0;
        const failures: string[] = [];

        const fileStats = { processed: 0, stored: 0, skipped: 0, failed: 0 };

        for (const doc of documents) {
          try {
            if (MIGRATE_FILES && gridFsBucket) {
              const r = await migrateAttachmentsInDoc({
                db,
                bucket: gridFsBucket,
                bucketName: GRIDFS_BUCKET_NAME,
                baseId: AIRTABLE_BASE_ID,
                tableName: resolvedAirtableTable,
                mongoCollection: table.mongoCollection,
                doc,
              });
              fileStats.processed += r.processed;
              fileStats.stored += r.stored;
              fileStats.skipped += r.skipped;
              fileStats.failed += r.failed;
            }

            const { _airtableId, ...rest } = doc;
            const update: any = { $set: { _airtableId, ...rest } };
            if (table.logicalName === 'support_bugs') {
              // Champs côté Mongo (non Airtable) : ne pas écraser si déjà renseignés.
              update.$setOnInsert = { deadline: null, assignation: '' };
            }
            await collection.updateOne({ _airtableId }, update, { upsert: true });
            insertedOrUpdated++;
          } catch (err: any) {
            errors++;
            const errorMsg = `airtableId=${doc._airtableId}: ${err.message}`;
            failures.push(errorMsg);
            if (errors <= 5) {
              console.log(`  ⚠️ ${errorMsg}`);
            }
          }
        }

        // Afficher le résultat
        const total = await collection.countDocuments();
        console.log(`\n  📊 Résultat migration "${resolvedAirtableTable}":`);
        console.log(`     Récupérés depuis Airtable: ${records.length}`);
        console.log(`     Upserts MongoDB:           ${insertedOrUpdated}`);
        console.log(`     Erreurs:                   ${errors}`);
        console.log(`     Total dans collection:     ${total}`);

        if (MIGRATE_FILES) {
          console.log(`     Fichiers (attachments):    processed=${fileStats.processed}, stored=${fileStats.stored}, skipped=${fileStats.skipped}, failed=${fileStats.failed}`);
        }

        if (errors > 5) {
          console.log(`     (${errors - 5} erreurs supplémentaires masquées)`);
        }

        stats.push({ table: resolvedAirtableTable, fetched: records.length, inserted: insertedOrUpdated, errors, files: MIGRATE_FILES ? fileStats : undefined });

      } catch (err: any) {
        const errMsg = err.response?.data?.error?.message || err.response?.data || err.message || err;
        const errStatus = err.response?.status || 'N/A';
        console.error(`  ❌ Erreur migration "${table.logicalName}" (HTTP ${errStatus}): ${JSON.stringify(errMsg)}`);
        stats.push({ table: table.logicalName, fetched: 0, inserted: 0, errors: 1 });
      }
    }

    // 4. Résumé final
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║               RÉSUMÉ DE LA MIGRATION                ║');
    console.log('╠══════════════════════════════════════════════════════╣');

    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;

    for (const s of stats) {
      const status = s.errors === 0 ? '✅' : '⚠️';
      console.log(`║ ${status} ${s.table.padEnd(28)} ${String(s.inserted).padStart(4)}/${String(s.fetched).padStart(4)} records ║`);
      totalFetched += s.fetched;
      totalInserted += s.inserted;
      totalErrors += s.errors;
    }

    console.log('╠══════════════════════════════════════════════════════╣');
    console.log(`║ 📊 TOTAL: ${String(totalInserted).padStart(4)} insérés / ${String(totalFetched).padStart(4)} récupérés / ${String(totalErrors).padStart(3)} erreurs ║`);
    console.log('╚══════════════════════════════════════════════════════╝');

    // 5. Vérification finale - afficher un sample (best effort, ne doit pas faire échouer la migration)
    try {
      console.log('\n🔍 Vérification - Premier document de chaque collection:');
      for (const table of TABLES) {
        const sample = await db.collection(table.mongoCollection).findOne({});
        if (sample) {
          const keys = Object.keys(sample).filter(k => !k.startsWith('_'));
          console.log(`\n  📄 ${table.mongoCollection} (${keys.length} champs):`);
          console.log(`     ID Airtable: ${sample._airtableId}`);
          keys.slice(0, 5).forEach(k => {
            const val = (sample as any)[k];
            const display = typeof val === 'string' ? val.substring(0, 50) : JSON.stringify(val)?.substring(0, 50);
            console.log(`     ${k}: ${display}`);
          });
          if (keys.length > 5) {
            console.log(`     ... et ${keys.length - 5} autres champs`);
          }
        }
      }
    } catch (err: any) {
      console.warn(`\n⚠️ Vérification finale ignorée: ${err?.message || err}`);
    }

  } catch (error: any) {
    console.error('\n❌ ERREUR FATALE:', error.message);
    if (error.code) console.error('   Code:', error.code);
  } finally {
    await client.close();
    console.log('\n🔌 Connexion MongoDB fermée');
    console.log('🏁 Migration terminée');
    process.exit(0);
  }
}

// =====================================================
// EXÉCUTION
// =====================================================
migrateAll().catch((err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});
