import * as dns from 'dns';
import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
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

function resolveMongoDbName(uri: string): string {
  const envDbName = String(process.env.DB_NAME || process.env.MONGODB_DATABASE || '').trim();
  if (envDbName) return envDbName;

  try {
    const url = new URL(uri);
    const pathname = (url.pathname || '').replace(/^\//, '').trim();
    if (pathname) return pathname;
  } catch {
    // ignore
  }

  return 'processiq';
}

async function main(): Promise<void> {
  const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  if (!mongoUri) {
    console.error('❌ MONGO_URI / MONGODB_URI requis');
    process.exit(1);
  }

  const dbName = resolveMongoDbName(mongoUri);

  console.log(`🔗 MongoDB URI: ${mongoUri.replace(/\/\/.*@/, '//*****@')}`);
  console.log(`📁 Database: ${dbName}`);
  console.log('📦 Collection: support_bugs');

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 90000,
    socketTimeoutMS: 120000,
    family: 4,
  });

  try {
    console.log('🔌 Connexion à MongoDB...');
    await connectWithRetry(client, 3);
    console.log('✅ Connecté');

    const db = client.db(dbName);
    const col = db.collection('support_bugs');

    console.log('🧩 Backfill champs manquants...');

    const deadlineRes = await col.updateMany(
      { deadline: { $exists: false } },
      { $set: { deadline: null } }
    );

    const assignationRes = await col.updateMany(
      { assignation: { $exists: false } },
      { $set: { assignation: '' } }
    );

    const total = await col.countDocuments();
    const withDeadline = await col.countDocuments({ deadline: { $exists: true } });
    const withAssignation = await col.countDocuments({ assignation: { $exists: true } });

    console.log('\n✅ Résultat:');
    console.log(`- Total documents: ${total}`);
    console.log(`- deadline ajoutée: matched=${deadlineRes.matchedCount}, modified=${deadlineRes.modifiedCount}`);
    console.log(`- assignation ajoutée: matched=${assignationRes.matchedCount}, modified=${assignationRes.modifiedCount}`);
    console.log(`- deadline présente sur: ${withDeadline}/${total}`);
    console.log(`- assignation présente sur: ${withAssignation}/${total}`);

  } finally {
    await client.close();
    console.log('\n🔌 Connexion MongoDB fermée');
  }
}

async function connectWithRetry(client: MongoClient, maxAttempts: number): Promise<void> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      return;
    } catch (err: any) {
      lastError = err;
      const msg = err?.message || err;
      console.warn(`⚠️ Connexion MongoDB échouée (tentative ${attempt}/${maxAttempts}): ${msg}`);
      if (attempt < maxAttempts) {
        const delayMs = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Erreur:', err?.message || err);
    process.exit(1);
  });
}
