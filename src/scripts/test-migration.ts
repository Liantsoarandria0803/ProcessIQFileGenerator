// Test simple de migration
import 'dotenv/config';
import axios from 'axios';

async function testAirtable() {
  console.log('🔍 Test Airtable...');
  console.log('API Token:', process.env.AIRTABLE_API_TOKEN?.substring(0, 10) + '...');
  console.log('Base ID:', process.env.AIRTABLE_BASE_ID);
  
  try {
    const response = await axios.get(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Liste%20des%20candidats`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        }
      }
    );
    
    console.log(`✅ Connexion OK: ${response.data.records.length} enregistrements`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erreur Airtable:', error.message);
    process.exit(1);
  }
}

testAirtable();
