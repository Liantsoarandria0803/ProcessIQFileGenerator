// src/scripts/migrate-airtable-to-mongodb.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import { Candidate } from '../models/candidate.model';
import { connectDB, disconnectDB } from '../config/database';

// Configuration Airtable (temporaire)
const AIRTABLE_CONFIG = {
  apiKey: process.env.AIRTABLE_API_TOKEN || '',
  baseId: process.env.AIRTABLE_BASE_ID || '',
  tableName: 'Liste des candidats'
};

async function migrateData() {
  console.log('🚀 Début de la migration Airtable → MongoDB...\n');
  
  try {
    // 1. Connexion MongoDB
    await connectDB();
    
    // 1.5. Vider la collection pour éviter les conflits
    console.log('🗑️  Nettoyage de la collection existante...');
    await Candidate.deleteMany({});
    console.log('✅ Collection vidée\n');
    
    // 2. Récupération données Airtable
    console.log('📥 Récupération des données Airtable...');
    
    const response = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_CONFIG.baseId}/${encodeURIComponent(AIRTABLE_CONFIG.tableName)}`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          view: 'Grid view'
        }
      }
    );
    
    const records = response.data.records;
    console.log(`✅ ${records.length} enregistrements trouvés\n`);
    
    // 3. Transformation et insertion
    console.log('🔄 Transformation des données...');
    
    // Tracer les NIR et emails pour éviter les doublons
    const nirMap = new Map();
    const emailMap = new Map();
    
    const candidates = records.map((record: any, index: number) => {
      const fields = record.fields;
      let nir = fields['NIR'] && fields['NIR'].trim() ? fields['NIR'] : undefined;
      let email = fields['E-mail'] && fields['E-mail'].trim() ? fields['E-mail'].toLowerCase() : '';
      
      // Si le NIR est déjà utilisé, on le remplace par undefined
      if (nir && nirMap.has(nir)) {
        console.log(`⚠️  NIR dupliqué ignoré: ${nir}`);
        nir = undefined;
      } else if (nir) {
        nirMap.set(nir, true);
      }
      
      // Si l'email est déjà utilisé, on ajoute un suffixe
      if (email && emailMap.has(email)) {
        console.log(`⚠️  Email dupliqué: ${email}, ajout d'un suffixe`);
        email = `${email.split('@')[0]}.${index}@${email.split('@')[1]}`;
      }
      if (email) {
        emailMap.set(email, true);
      }
      
      return {
        airtableId: record.id,
        firstName: fields['Prénom'] || '',
        lastName: fields['NOM de naissance'] || '',
        birthDate: fields['Date de naissance'] ? new Date(fields['Date de naissance']) : new Date(),
        birthPlace: fields['Commune de naissance'] || '',
        gender: fields['Sexe'] || 'Masculin',
        nationality: fields['Nationalité'] || '',
        nir: nir,
        
        email: email,
        phone: fields['Téléphone'],
        address: fields['Adresse lieu dexécution du contrat'] || '',
        postalCode: fields['Code postal ']?.toString() || '',
        city: fields['ville'] || '',
        country: 'France',
        
        program: fields['Formation'] || '',
        status: 'candidat', // À adapter selon ta logique
        enrollmentYear: new Date().getFullYear(),
        currentYear: 1,
        
        applicationDate: fields['Date de visite'] ? new Date(fields['Date de visite']) : new Date(),
        paymentDate: fields['Date denvoi du réglement'] ? new Date(fields['Date denvoi du réglement']) : undefined,
        alternance: fields['alternance'] === 'Oui',
        visitDate: fields['Date de visite'] ? new Date(fields['Date de visite']) : undefined,
        
        source: 'airtable',
        createdAt: fields['Date dérniere modif'] ? new Date(fields['Date dérniere modif']) : new Date(),
        updatedAt: fields['Date dérniere modif'] ? new Date(fields['Date dérniere modif']) : new Date(),
      };
    });
    
    // 4. Insertion MongoDB
    console.log('💾 Insertion dans MongoDB...');
    
    // Insert records one-by-one to tolerate duplicate key errors and log progress
    console.log('🚀 Insertion en mode résilient (séquentiel)...');
    let successCount = 0;
    let failCount = 0;
    const failures: any[] = [];

    for (const cand of candidates) {
      try {
        await Candidate.create(cand);
        successCount += 1;
      } catch (err: any) {
        failCount += 1;
        failures.push({ candidate: { airtableId: cand.airtableId, email: cand.email, nir: cand.nir }, error: err.message });
        console.warn(`⚠️ Erreur insertion (airtableId=${cand.airtableId}): ${err.message}`);
      }
    }

    console.log(`✅ ${successCount} candidats migrés avec succès`);
    if (failCount > 0) {
      console.log(`⚠️ ${failCount} enregistrements ont échoué. Voir détails ci-dessous.`);
      failures.slice(0, 10).forEach(f => console.log(f));
    }

    // 5. Vérification
    const totalInMongo = await Candidate.countDocuments();
    console.log(`📊 Total dans MongoDB: ${totalInMongo} candidats`);
    
  } catch (error: any) {
    console.error('❌ Erreur de migration:', error.message);
    
    if (error.response?.data) {
      console.error('Détails Airtable:', error.response.data);
    }
    
  } finally {
    // 6. Fermeture connexion
    await disconnectDB();
    console.log('\n🏁 Migration terminée');
    process.exit(0);
  }
}

// Exécuter le script
if (require.main === module) {
  migrateData();
}

export { migrateData };
