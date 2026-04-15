/**
 * 🚀 INITIALISATION OPCO - CAHIER DES CHARGES FILIZ.IO F04
 * 
 * Ce fichier doit être exécuté una fois au démarrage du serveur.
 * Les tables NAF→OPCO et France Compétences seront initialisées automatiquement.
 * 
 * Usage:
 * 1. Importer ce fichier dans src/server.ts
 * 2. Appeler initializeOpcoTables() dans app.listen()
 */

import { nafOpcoMappingService } from './services/nafOpcoMapping.service';
import { franceCompetencesService } from './services/franceCompetences.service';

export async function initializeOpcoTables() {
  try {
    console.log('\n🔄 Initialisation des tables France Compétences...');
    
    // Initialiser NAF → OPCO mapping
    await nafOpcoMappingService.initializeMapping();
    console.log('✅ Table NAF→OPCO initialisée (~700 entrées)');
    
    // Initialiser les barèmes France Compétences
    await franceCompetencesService.initializeRates();
    console.log('✅ Table barèmes France Compétences initialisée (~30 formations)');
    
    console.log('✅ OPCO Module prêt!\n');
    
  } catch (error: any) {
    console.error('❌ Erreur initialisation OPCO:', error?.message);
    // Ne pas bloquer le démarrage si les tables existent déjà
  }
}

/**
 * EXEMPLE D'UTILISATION - API OPCO ENDPOINTS
 * 
 * =========================
 * 1️⃣  IDENTIFICATION OPCO PAR NAF
 * =========================
 * GET /api/competences/opco/by-naf/4791B
 * 
 * Response:
 * {
 *   "naf": "4791B",
 *   "opcoCode": "OPCO_COMMERCE",
 *   "opcoName": "OPCO Commerce",
 *   "identified": true
 * }
 * 
 * =========================
 * 2️⃣  CALCUL MONTANT FINANCEMENT
 * =========================
 * GET /api/competences/financing/OPCO_COMMERCE/BTS%20MCO?duration=24&annee=2025
 * 
 * Response:
 * {
 *   "opcoCode": "OPCO_COMMERCE",
 *   "formationLabel": "BTS MCO",
 *   "durationMonths": 24,
 *   "annee": 2025,
 *   "montantAnnuel": 2850,
 *   "montantMensuel": 237.5,
 *   "montantTotal": 5700,
 *   "hoursPerWeek": 35,
 *   "montantHoraire": 13.79
 * }
 * 
 * =========================
 * 3️⃣  CRÉATION DOSSIER OPCO AUTO-IDENTIFIÉ
 * =========================
 * POST /api/opco/dossiers
 * Body:
 * {
 *   "codeNaf": "4791B",
 *   "candidateId": "...",
 *   "companyId": "...",
 *   "payload": {
 *     "apprenti": { "nom_complet": "Jean Dupont" },
 *     "employeur": { "raison_sociale": "E-Commerce Inc", "siret": "12345678901234" },
 *     "contrat": {
 *       "intitule_diplome": "BTS MCO",
 *       "date_debut": "2025-06-01"
 *     }
 *   },
 *   "autoSubmit": true
 * }
 * 
 * Response: Dossier créé avec:
 * - opcoCode/opcoName identifiés automatiquement
 * - montantAnnuel/Mensuel calculés
 * - dateLimiteEnvoi = date_debut + 5 jours ouvrés
 * - PDF généré et joint automatiquement
 * - Envoyé à l'OPCO en 1 appel
 * 
 * =========================
 * 4️⃣  VÉRIFIER DÉLAI CRITIQUE
 * =========================
 * GET /api/opco/dossiers/:id/deadline
 * 
 * Response:
 * {
 *   "daysRemaining": 3,
 *   "workDaysRemaining": 2,
 *   "isUrgent": true,
 *   "isOverdue": false,
 *   "label": "URGENT: 3 jour(s) restant(s)",
 *   "color": "orange"
 * }
 * 
 * =========================
 * 5️⃣  SYNCHRONISER STATUT OPCO
 * =========================
 * POST /api/opco/dossiers/:id/sync
 * 
 * Response: Dossier mis à jour avec:
 * - remoteStatus récupéré de l'OPCO
 * - status normalisé (ACCEPTE/REFUSE/EN_ATTENTE_VALIDATION/etc)
 * - lastSyncedAt = maintenant
 * 
 * =========================
 * STATUTS OPCO (11 valeurs)
 * =========================
 * 1. BROUILLON              - Dossier initial
 * 2. EN_PREPARATION         - Prêt à être envoyé
 * 3. ENVOYE                 - Transmis à l'OPCO
 * 4. EN_ATTENTE_VALIDATION  - OPCO l'analyse
 * 5. COMPLEMENT_DEMANDE     - OPCO demande infos supplémentaires
 * 6. ACCEPTE                - ✅ Approuvé
 * 7. REFUSE                 - ❌ Rejeté
 * 8. REFUSE_DEFINITIF       - ❌ Rejeté sans appel
 * 9. CLOTURE                - Dossier fermé
 * 10. ANNULE                - Annulé
 * 11. EN_REVISION           - Révision suite correction
 */

/**
 * EXEMPLE D'INTÉGRATION DANS src/server.ts
 * 
 * import { initializeOpcoTables } from './utils/opco-init';
 * 
 * const app = express();
 * 
 * // ... setup middleware ...
 * 
 * app.listen(3000, async () => {
 *   await initializeOpcoTables(); // 🚀 Initialiser OPCO au démarrage
 *   console.log('Server running on port 3000');
 * });
 */

/**
 * CONFIGURATION .env REQUISE
 * 
 * # OPCO Envoi automatique dossiers
 * OPCO_ENABLED=true
 * OPCO_NAME=OPCO_COMMERCE
 * OPCO_API_BASE_URL=https://api.opco-commerce.fr
 * OPCO_API_KEY=sk-opco-xxxxx
 * OPCO_CREATE_DOSSIER_PATH=/dossiers
 * OPCO_STATUS_PATH=/dossiers/{externalId}
 * OPCO_TIMEOUT_MS=15000
 * OPCO_CLIENT_ID=client-xxxxx  (optionnel pour OAuth)
 * OPCO_CLIENT_SECRET=secret-xxxxx  (optionnel pour OAuth)
 */
