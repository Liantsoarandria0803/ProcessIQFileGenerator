/**
 * Mapping des champs PDF pour la Fiche de Renseignements
 * Transcription fidèle du fichier Python pdf_generator_service.py
 * 
 * Format: "Nom du champ PDF" -> ["source", "Colonne Airtable"]
 * source = "candidat" (table "Liste des candidats") ou "entreprise" (table "Fiche entreprise")
 * 
 * COLONNES VÉRIFIÉES SUR AIRTABLE LE 03/02/2026
 * Champs PDF vérifiés via pdf-lib scan: 75 champs "Champ de texte NNN"
 */

export const PDF_MAPPING: Record<string, [string, string]> = {
  // =====================================================
  // EMPLOYEUR / IDENTIFICATION (Table: Fiche entreprise)
  // =====================================================
  "Champ de texte 2": ["entreprise", "Raison sociale"],
  // Champ de texte 70: Adresse complète construite via buildAdresseEntreprise()
  "Champ de texte 70": ["entreprise", "__adresse_entreprise__"],
  "Champ de texte 79": ["entreprise", "Téléphone entreprise"],
  "Champ de texte 80": ["entreprise", "Email entreprise"],
  "Champ de texte 81": ["entreprise", "Numéro SIRET"],
  "Champ de texte 82": ["entreprise", "Type demployeur"],
  "Champ de texte 83": ["entreprise", "Employeur specifique"],
  "Champ de texte 84": ["entreprise", "Effectif salarié de l'entreprise"],
  "Champ de texte 85": ["entreprise", "Code APE/NAF"],
  "Champ de texte 86": ["entreprise", "Code IDCC"],
  "Champ de texte 87": ["entreprise", "Convention collective"],
  "Champ de texte 88": ["entreprise", "Caisse de retraite"],

  // =====================================================
  // OPCO (Table: Fiche entreprise)
  // =====================================================
  "Champ de texte 93": ["entreprise", "Nom OPCO"],

  // =====================================================
  // APPRENTI (Table: Liste des candidats)
  // =====================================================
  "Champ de texte 110": ["candidat", "Prénom"],
  "Champ de texte 111": ["candidat", "Téléphone"],
  "Champ de texte 112": ["candidat", "Département"],
  "Champ de texte 113": ["candidat", "Déclare être inscrits sur la liste des sportifs de haut niveau"],
  "Champ de texte 114": ["candidat", "Date de naissance"],
  "Champ de texte 115": ["candidat", "Nationalité"],
  "Champ de texte 117": ["candidat", "E-mail"],
  "Champ de texte 118": ["candidat", "Commune de naissance"],
  "Champ de texte 120": ["candidat", "Sexe"],
  "Champ de texte 121": ["candidat", "Régime social"],
  "Champ de texte 122": ["candidat", "Adresse lieu dexécution du contrat"],
  "Champ de texte 123": ["candidat", "NOM de naissance"],
  "Champ de texte 124": ["candidat", "NOM dusage"],
  "Champ de texte 125": ["candidat", "NIR"],
  "Champ de texte 126": ["candidat", "Déclare bénéficier de la reconnaissance travailleur handicapé"],
  "Champ de texte 127": ["candidat", "Situation avant le contrat"],
  "Champ de texte 128": ["candidat", "Dernier diplôme ou titre préparé"],
  "Champ de texte 129": ["candidat", "Dernière classe / année suivie"],
  "Champ de texte 130": ["candidat", "Intitulé précis du dernier diplôme ou titre préparé"],
  "Champ de texte 131": ["candidat", "BAC"],
  "Champ de texte 132": ["candidat", "Déclare avoir un projet de création ou de reprise dentreprise"],

  // =====================================================
  // MAÎTRE D'APPRENTISSAGE (Table: Fiche entreprise)
  // =====================================================
  "Champ de texte 133": ["entreprise", "Nom Maître apprentissage"],
  "Champ de texte 134": ["entreprise", "Prénom Maître apprentissage"],
  "Champ de texte 135": ["entreprise", "Date de naissance Maître apprentissage"],
  "Champ de texte 136": ["entreprise", "N de securite sociale maitre dapprentissage"],
  "Champ de texte 137": ["entreprise", "Fonction Maître apprentissage"],
  "Champ de texte 138": ["entreprise", "Diplôme Maître apprentissage"],
  "Champ de texte 142": ["entreprise", "Année experience pro Maître apprentissage"],
  "Champ de texte 143": ["entreprise", "Téléphone Maître apprentissage"],
  "Champ de texte 144": ["entreprise", "Email Maître apprentissage"],

  // =====================================================
  // CONTRAT (Table: Fiche entreprise)
  // =====================================================
  "Champ de texte 145": ["entreprise", "Type de contrat"],
  "Champ de texte 147": ["entreprise", "Type de dérogation"],
  "Champ de texte 151": ["entreprise", "Numéro DECA de ancien contrat"],
  "Champ de texte 154": ["entreprise", "Date de début exécution"],
  "Champ de texte 155": ["entreprise", "Fin du contrat apprentissage"],
  "Champ de texte 156": ["entreprise", "Nombre de mois du contrat"],
  "Champ de texte 157": ["entreprise", "Durée hebdomadaire"],
  "Champ de texte 158": ["entreprise", "Poste occupé"],
  "Champ de texte 159": ["entreprise", "Formation de lalternant(e) (pour les missions)"],

  // =====================================================
  // SALAIRE (Table: Fiche entreprise)
  // =====================================================
  "Champ de texte 160": ["entreprise", "Pourcentage du SMIC 1"],
  "Champ de texte 161": ["entreprise", "Salaire brut mensuel 1"],
};

/**
 * Champ spécial: "Champ de texte 70" utilise buildAdresseEntreprise()
 * au lieu d'une simple lecture de colonne Airtable.
 * L'adresse est construite en concaténant:
 *   - "Numéro entreprise"
 *   - "Voie entreprise"
 *   - "Complément dadresse entreprise"
 *   - "Code postal entreprise"
 *   - "Ville entreprise"
 */
export const ADRESSE_ENTREPRISE_FIELD = "Champ de texte 70";
