/**
 * Script de diagnostic : détecte les URLs airtableusercontent.com
 * encore stockées dans les champs Attachment des candidats/entreprises en MongoDB.
 */

const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://ProcessIQ:processIQ@processiq.e1iwrik.mongodb.net/?appName=ProcessIQ';
const DB_NAME   = 'processiq';

async function main() {
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  console.log(`\n✅ Connecté à MongoDB : ${DB_NAME}\n`);

  // ─────────────────────────────────────────────────────
  // 1. Lister les collections disponibles
  // ─────────────────────────────────────────────────────
  const collections = await db.listCollections().toArray();
  console.log('📦 Collections disponibles :');
  collections.forEach(c => console.log('  -', c.name));
  console.log();

  // ─────────────────────────────────────────────────────
  // 2. Pour chaque collection, compter les documents
  // ─────────────────────────────────────────────────────
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name} : ${count} document(s)`);
  }
  console.log();

  // ─────────────────────────────────────────────────────
  // 3. Chercher des URLs Airtable dans les collections
  // ─────────────────────────────────────────────────────
  let totalAirtableUrls = 0;

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    let colAirtable = 0;
    const examples = [];

    for (const doc of docs) {
      const found = findAirtableUrls(doc, '');
      if (found.length > 0) {
        colAirtable++;
        if (examples.length < 3) {
          examples.push({ id: doc._id?.toString() || doc.id, fields: found });
        }
      }
    }

    if (colAirtable > 0) {
      console.log(`🔴 [${col.name}] ${colAirtable} document(s) avec URLs Airtable :`);
      for (const ex of examples) {
        console.log(`   • ID: ${ex.id}`);
        for (const f of ex.fields) {
          console.log(`     - ${f.path}: ${f.url.substring(0, 80)}...`);
        }
      }
      if (colAirtable > examples.length) {
        console.log(`   ... et ${colAirtable - examples.length} autres`);
      }
      console.log();
      totalAirtableUrls += colAirtable;
    } else {
      console.log(`✅ [${col.name}] Aucune URL Airtable trouvée`);
    }
  }

  console.log();
  if (totalAirtableUrls === 0) {
    console.log('🎉 Aucune URL Airtable dans toute la base de données !');
  } else {
    console.log(`⚠️  TOTAL : ${totalAirtableUrls} document(s) contiennent encore des URLs Airtable.`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Diagnostic terminé.');
}

function findAirtableUrls(obj, path) {
  const results = [];
  if (!obj || typeof obj !== 'object') return results;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      results.push(...findAirtableUrls(item, `${path}[${i}]`));
    });
    return results;
  }

  for (const [key, val] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (typeof val === 'string' && val.includes('airtable')) {
      results.push({ path: currentPath, url: val });
    } else if (typeof val === 'object' && val !== null) {
      results.push(...findAirtableUrls(val, currentPath));
    }
  }
  return results;
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
