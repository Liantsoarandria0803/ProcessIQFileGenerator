/**
 * Routes pour le module RH - Gestion des fiches de renseignement et CERFA
 * Transcription fidèle du fichier Python rh.py
 */
import { Router, Request, Response } from 'express';
import { CandidatRepository, EntrepriseRepository } from '../repositories';
import logger from '../utils/logger';

const router = Router();
const candidatRepo = new CandidatRepository();
const entrepriseRepo = new EntrepriseRepository();

// =====================================================
// INTERFACES DE RÉPONSE
// =====================================================

interface FicheInfo {
  url: string | null;
  filename: string | null;
}

interface EtudiantFicheRenseignement {
  record_id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  entreprise_raison_sociale: string | null;
  fiche_entreprise: FicheInfo | null;
  has_fiche_renseignement: boolean;
  cerfa: FicheInfo | null;
  has_cerfa: boolean;
  dossier_complet: boolean;
  alternance: boolean;
}

interface ListeEtudiantsFichesResponse {
  total: number;
  etudiants_avec_fiche: number;
  etudiants_avec_cerfa: number;
  etudiants_dossier_complet: number;
  etudiants_sans_documents: number;
  etudiants: EtudiantFicheRenseignement[];
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Extrait les infos d'un fichier PDF attaché dans Airtable
 */
function extractFicheInfo(pdfField: any): FicheInfo | null {
  if (!pdfField || !Array.isArray(pdfField) || pdfField.length === 0) {
    return null;
  }
  return {
    url: pdfField[0]?.url || null,
    filename: pdfField[0]?.filename || null,
  };
}

/**
 * Construit un objet EtudiantFicheRenseignement à partir des données
 */
function buildEtudiantFiche(
  recordId: string,
  fields: Record<string, any>,
  ficheEntreprise: Record<string, any> | null
): EtudiantFicheRenseignement {
  // Vérifier si l'étudiant a un PDF "Fiche entreprise"
  const fichePdf = fields['Fiche entreprise'];
  const hasFiche = Array.isArray(fichePdf) && fichePdf.length > 0;

  // Vérifier si l'étudiant a un PDF "cerfa"
  const cerfaPdf = fields['cerfa'];
  const hasCerfa = Array.isArray(cerfaPdf) && cerfaPdf.length > 0;

  // Dossier complet = fiche + CERFA
  const dossierComplet = hasFiche && hasCerfa;

  // Récupérer la raison sociale de l'entreprise si disponible
  const raisonSociale = ficheEntreprise?.fields?.['Raison sociale'] || null;

  return {
    record_id: recordId,
    nom: fields['NOM de naissance'] || null,
    prenom: fields['Prénom'] || null,
    email: fields['E-mail'] || null,
    telephone: fields['Téléphone'] || null,
    formation: fields['Formation'] || null,
    entreprise_raison_sociale: raisonSociale,
    fiche_entreprise: hasFiche ? extractFicheInfo(fichePdf) : null,
    has_fiche_renseignement: hasFiche,
    cerfa: hasCerfa ? extractFicheInfo(cerfaPdf) : null,
    has_cerfa: hasCerfa,
    dossier_complet: dossierComplet,
    alternance: false,
  };
}

// =====================================================
// GET /rh/etudiants-fiches
// =====================================================

/**
 * @swagger
 * /api/rh/etudiants-fiches:
 *   get:
 *     summary: Liste tous les étudiants avec leurs fiches et CERFA
 *     tags: [RH]
 *     description: |
 *       Récupère la liste de tous les étudiants avec :
 *       - Informations de base (nom, prénom, email, téléphone)
 *       - Fiche entreprise associée (PDF)
 *       - Fichier CERFA (PDF)
 *       - Statut du dossier (complet ou non)
 *     parameters:
 *       - in: query
 *         name: avec_fiche_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant une fiche de renseignement
 *       - in: query
 *         name: avec_cerfa_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant un CERFA
 *       - in: query
 *         name: dossier_complet_uniquement
 *         schema:
 *           type: boolean
 *         description: Si true, retourne uniquement les étudiants ayant fiche ET CERFA
 *     responses:
 *       200:
 *         description: Liste des étudiants avec leurs fiches
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 etudiants_avec_fiche:
 *                   type: integer
 *                 etudiants_avec_cerfa:
 *                   type: integer
 *                 etudiants_dossier_complet:
 *                   type: integer
 *                 etudiants_sans_documents:
 *                   type: integer
 *                 etudiants:
 *                   type: array
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/etudiants-fiches', async (req: Request, res: Response) => {
  try {
    // Parse des query params (string "true" → boolean)
    const avecFicheUniquement = req.query.avec_fiche_uniquement === 'true';
    const avecCerfaUniquement = req.query.avec_cerfa_uniquement === 'true';
    const dossierCompletUniquement = req.query.dossier_complet_uniquement === 'true';

    // 1. Récupérer tous les candidats
    const candidats = await candidatRepo.getAll();

    // 2. Récupérer toutes les fiches entreprise
    const fichesEntreprise = await entrepriseRepo.getAll();

    // Créer un dictionnaire pour accès rapide par recordIdetudiant
    const fichesParEtudiant: Record<string, any> = {};
    for (const fiche of fichesEntreprise) {
      const etudiantId = fiche.fields?.['recordIdetudiant'];
      if (etudiantId) {
        fichesParEtudiant[etudiantId] = fiche;
      }
    }

    // 3. Construire la liste des étudiants
    const etudiants: EtudiantFicheRenseignement[] = [];
    let etudiantsAvecFiche = 0;
    let etudiantsAvecCerfa = 0;
    let etudiantsDossierComplet = 0;
    let etudiantsSansDocuments = 0;

    for (const candidat of candidats) {
      const recordId = candidat.id;
      const fields = candidat.fields || {};

      // Chercher la fiche entreprise associée
      const ficheEntreprise = fichesParEtudiant[recordId] || null;

      // Construire l'objet étudiant
      const etudiant = buildEtudiantFiche(recordId, fields, ficheEntreprise);

      // Statistiques
      if (etudiant.has_fiche_renseignement) etudiantsAvecFiche++;
      if (etudiant.has_cerfa) etudiantsAvecCerfa++;
      if (etudiant.dossier_complet) etudiantsDossierComplet++;
      if (!etudiant.has_fiche_renseignement && !etudiant.has_cerfa) etudiantsSansDocuments++;

      // Filtrer si demandé
      if (avecFicheUniquement && !etudiant.has_fiche_renseignement) continue;
      if (avecCerfaUniquement && !etudiant.has_cerfa) continue;
      if (dossierCompletUniquement && !etudiant.dossier_complet) continue;

      etudiants.push(etudiant);
    }

    const response: ListeEtudiantsFichesResponse = {
      total: candidats.length,
      etudiants_avec_fiche: etudiantsAvecFiche,
      etudiants_avec_cerfa: etudiantsAvecCerfa,
      etudiants_dossier_complet: etudiantsDossierComplet,
      etudiants_sans_documents: etudiantsSansDocuments,
      etudiants,
    };

    res.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Erreur récupération étudiants-fiches:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des étudiants: ' + msg,
    });
  }
});

// =====================================================
// GET /rh/etudiants-fiches/:record_id
// =====================================================

/**
 * @swagger
 * /api/rh/etudiants-fiches/{record_id}:
 *   get:
 *     summary: Détails d'un étudiant avec sa fiche et CERFA
 *     tags: [RH]
 *     description: Récupère les détails complets d'un étudiant spécifique avec sa fiche de renseignement et CERFA
 *     parameters:
 *       - in: path
 *         name: record_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Airtable de l'étudiant
 *         example: rec1BBjsjxhdqEKuq
 *     responses:
 *       200:
 *         description: Détails de l'étudiant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/etudiants-fiches/:record_id', async (req: Request, res: Response) => {
  try {
    const { record_id } = req.params;

    // 1. Récupérer le candidat
    const candidat = await candidatRepo.getById(record_id);

    if (!candidat) {
      return res.status(404).json({
        success: false,
        error: `Étudiant avec l'ID ${record_id} non trouvé`,
      });
    }

    const fields = candidat.fields || {};

    // 2. Chercher la fiche entreprise associée
    let ficheEntreprise: any = null;
    try {
      const entreprise = await entrepriseRepo.getByEtudiantId(record_id);
      if (entreprise) {
        ficheEntreprise = entreprise;
      }
    } catch (e) {
      logger.warn('Erreur recherche fiche entreprise pour ' + record_id + ':', e);
    }

    // 3. Construire la réponse
    const etudiant = buildEtudiantFiche(record_id, fields, ficheEntreprise);

    res.json(etudiant);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Erreur récupération étudiant ' + req.params.record_id + ':', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'étudiant: ' + msg,
    });
  }
});

// =====================================================
// GET /rh/statistiques
// =====================================================

/**
 * @swagger
 * /api/rh/statistiques:
 *   get:
 *     summary: Statistiques globales RH
 *     tags: [RH]
 *     description: |
 *       Calcule les statistiques sur les étudiants, fiches de renseignement et CERFA:
 *       - Nombre total d'étudiants
 *       - Étudiants avec fiche PDF
 *       - Étudiants avec CERFA
 *       - Dossiers complets (fiche + CERFA)
 *       - Taux de complétion
 *     responses:
 *       200:
 *         description: Statistiques RH
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_etudiants:
 *                   type: integer
 *                 total_fiches_entreprise:
 *                   type: integer
 *                 etudiants_avec_fiche_pdf:
 *                   type: integer
 *                 taux_fiche_renseignement:
 *                   type: number
 *                 etudiants_avec_cerfa:
 *                   type: integer
 *                 taux_cerfa:
 *                   type: number
 *                 etudiants_dossier_complet:
 *                   type: integer
 *                 taux_dossier_complet:
 *                   type: number
 *                 etudiants_sans_documents:
 *                   type: integer
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/statistiques', async (req: Request, res: Response) => {
  try {
    // Récupérer tous les candidats
    const candidats = await candidatRepo.getAll();

    // Récupérer toutes les fiches entreprise
    const fichesEntreprise = await entrepriseRepo.getAll();

    // Calculer les statistiques
    const totalEtudiants = candidats.length;
    const totalFichesEntreprise = fichesEntreprise.length;

    let etudiantsAvecFichePdf = 0;
    let etudiantsAvecCerfa = 0;
    let etudiantsDossierComplet = 0;
    let etudiantsSansDocuments = 0;

    for (const candidat of candidats) {
      const fields = candidat.fields || {};

      // Vérifier fiche de renseignement
      const fichePdf = fields['Fiche entreprise'];
      const hasFiche = Array.isArray(fichePdf) && fichePdf.length > 0;

      // Vérifier CERFA
      const cerfaPdf = fields['cerfa'];
      const hasCerfa = Array.isArray(cerfaPdf) && cerfaPdf.length > 0;

      if (hasFiche) etudiantsAvecFichePdf++;
      if (hasCerfa) etudiantsAvecCerfa++;
      if (hasFiche && hasCerfa) etudiantsDossierComplet++;
      if (!hasFiche && !hasCerfa) etudiantsSansDocuments++;
    }

    // Calculer les taux
    const tauxFiche = totalEtudiants > 0
      ? Math.round((etudiantsAvecFichePdf / totalEtudiants) * 10000) / 100
      : 0;
    const tauxCerfa = totalEtudiants > 0
      ? Math.round((etudiantsAvecCerfa / totalEtudiants) * 10000) / 100
      : 0;
    const tauxComplet = totalEtudiants > 0
      ? Math.round((etudiantsDossierComplet / totalEtudiants) * 10000) / 100
      : 0;

    res.json({
      total_etudiants: totalEtudiants,
      total_fiches_entreprise: totalFichesEntreprise,
      // Statistiques Fiche de renseignement
      etudiants_avec_fiche_pdf: etudiantsAvecFichePdf,
      taux_fiche_renseignement: tauxFiche,
      // Statistiques CERFA
      etudiants_avec_cerfa: etudiantsAvecCerfa,
      taux_cerfa: tauxCerfa,
      // Dossier complet (fiche + CERFA)
      etudiants_dossier_complet: etudiantsDossierComplet,
      taux_dossier_complet: tauxComplet,
      // Sans documents
      etudiants_sans_documents: etudiantsSansDocuments,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Erreur statistiques RH:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des statistiques: ' + msg,
    });
  }
});

export default router;
