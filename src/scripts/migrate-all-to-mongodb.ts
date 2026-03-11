/**
 * ============================================================
 * SCRIPT DE MIGRATION COMPLET : Airtable → MongoDB Atlas
 * ============================================================
 * Migre les 4 tables Airtable vers 4 collections MongoDB :
 *   1. Liste des candidats  → candidats
 *   2. Fiche entreprise     → entreprises
 *   3. Résultats PDF        → resultats_pdf
 *   4. Resultat entretien   → resultats_entretien
 *
 * Usage: npx ts-node src/scripts/migrate-all-to-mongodb.ts
 * ============================================================
 */

import axios from 'axios';
import * as dns from 'dns';
import * as https from 'https';
import * as dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

// Agent HTTPS forçant IPv4 (résout les problèmes de connexion)
const httpsAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true,
  family: 4, // IPv4 only
});

// =====================================================
// CONFIGURATION
// =====================================================

const AIRTABLE_TOKEN = process.env.AIRTABLE_API_TOKEN || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || '';

// MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI
  || 'mongodb+srv://ProcessIQ:processIQ@processiq.e1iwrik.mongodb.net/?appName=ProcessIQ';

const MONGODB_DB_NAME = 'processiq';

// Tables Airtable à migrer
const TABLES = [
  { airtableName: 'Liste des candidats',   mongoCollection: 'Candidats' },
  { airtableName: 'Fiche entreprise',       mongoCollection: 'entreprises' },
  { airtableName: 'Résultats PDF',          mongoCollection: 'resultats_pdf' },
  { airtableName: 'Resultat entretien',     mongoCollection: 'resultats_entretien' },
];

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

/**
 * Crée les index recommandés pour chaque collection
 */
async function createIndexes(db: Db): Promise<void> {
  console.log('\n📇 Création des index...');

  // Candidats
  const candidats = db.collection('candidats');
  await candidats.createIndex({ _airtableId: 1 }, { unique: true });
  await candidats.createIndex({ 'E-mail': 1 });
  await candidats.createIndex({ 'NOM de naissance': 1, 'Prénom': 1 });
  await candidats.createIndex({ 'Formation': 1 });
  await candidats.createIndex({ 'Numero Inscription': 1 });
  console.log('  ✅ Index candidats créés');

  // Entreprises
  const entreprises = db.collection('entreprises');
  await entreprises.createIndex({ _airtableId: 1 }, { unique: true });
  await entreprises.createIndex({ 'recordIdetudiant': 1 });
  await entreprises.createIndex({ 'Raison sociale': 1 });
  await entreprises.createIndex({ 'Numéro SIRET': 1 });
  console.log('  ✅ Index entreprises créés');

  // Résultats PDF
  const resultatsPdf = db.collection('resultats_pdf');
  await resultatsPdf.createIndex({ _airtableId: 1 }, { unique: true });
  await resultatsPdf.createIndex({ 'E-mail': 1 });
  console.log('  ✅ Index resultats_pdf créés');

  // Résultats entretien
  const resultatsEntretien = db.collection('resultats_entretien');
  await resultatsEntretien.createIndex({ _airtableId: 1 }, { unique: true });
  await resultatsEntretien.createIndex({ 'E-mail': 1 });
  console.log('  ✅ Index resultats_entretien créés');
}

// =====================================================
// MIGRATION PRINCIPALE
// =====================================================

async function migrateAll() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   MIGRATION AIRTABLE → MONGODB ATLAS                ║');
  console.log('║   4 tables : candidats, entreprises, résultats      ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Validation config
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    console.error('❌ AIRTABLE_API_TOKEN et AIRTABLE_BASE_ID requis dans .env');
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI requis dans .env');
    process.exit(1);
  }

  console.log(`🔗 MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//*****@')}`);
  console.log(`📁 Database: ${MONGODB_DB_NAME}\n`);

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    family: 4, // Forcer IPv4
  });

  try {
    // 1. Connexion MongoDB Atlas
    console.log('🔌 Connexion à MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connecté à MongoDB Atlas\n');

    const db = client.db(MONGODB_DB_NAME);

    // 2. Créer les index
    await createIndexes(db);

    // 3. Migrer chaque table
    const stats: { table: string; fetched: number; inserted: number; errors: number }[] = [];

    for (const table of TABLES) {
      console.log(`\n${'='.repeat(55)}`);
      console.log(`📦 Migration: "${table.airtableName}" → "${table.mongoCollection}"`);
      console.log('='.repeat(55));

      try {
        // Récupérer les données depuis Airtable
        const records = await fetchAllAirtableRecords(table.airtableName);

        if (records.length === 0) {
          console.log(`  ⚠️ Aucun record trouvé dans "${table.airtableName}", skip.`);
          stats.push({ table: table.airtableName, fetched: 0, inserted: 0, errors: 0 });
          continue;
        }

        // Transformer les records
        const documents = records.map(transformRecord);

        // Vider la collection existante (optionnel - décommenter si besoin)
        const collection = db.collection(table.mongoCollection);
        const existingCount = await collection.countDocuments();
        if (existingCount > 0) {
          console.log(`  🗑️  ${existingCount} documents existants trouvés → suppression...`);
          await collection.deleteMany({});
        }

        // Insérer les documents un par un (résilient aux erreurs)
        let inserted = 0;
        let errors = 0;
        const failures: string[] = [];

        for (const doc of documents) {
          try {
            await collection.insertOne(doc);
            inserted++;
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
        console.log(`\n  📊 Résultat migration "${table.airtableName}":`);
        console.log(`     Récupérés depuis Airtable: ${records.length}`);
        console.log(`     Insérés dans MongoDB:      ${inserted}`);
        console.log(`     Erreurs:                   ${errors}`);
        console.log(`     Total dans collection:     ${total}`);

        if (errors > 5) {
          console.log(`     (${errors - 5} erreurs supplémentaires masquées)`);
        }

        stats.push({ table: table.airtableName, fetched: records.length, inserted, errors });

      } catch (err: any) {
        const errMsg = err.response?.data?.error?.message || err.response?.data || err.message || err;
        const errStatus = err.response?.status || 'N/A';
        console.error(`  ❌ Erreur migration "${table.airtableName}" (HTTP ${errStatus}): ${JSON.stringify(errMsg)}`);
        stats.push({ table: table.airtableName, fetched: 0, inserted: 0, errors: 1 });
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

    // 5. Vérification finale - afficher un sample
    console.log('\n🔍 Vérification - Premier document de chaque collection:');
    for (const table of TABLES) {
      const sample = await db.collection(table.mongoCollection).findOne({});
      if (sample) {
        const keys = Object.keys(sample).filter(k => !k.startsWith('_'));
        console.log(`\n  📄 ${table.mongoCollection} (${keys.length} champs):`);
        console.log(`     ID Airtable: ${sample._airtableId}`);
        // Afficher les 5 premiers champs
        keys.slice(0, 5).forEach(k => {
          const val = sample[k];
          const display = typeof val === 'string' ? val.substring(0, 50) : JSON.stringify(val)?.substring(0, 50);
          console.log(`     ${k}: ${display}`);
        });
        if (keys.length > 5) {
          console.log(`     ... et ${keys.length - 5} autres champs`);
        }
      }
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
