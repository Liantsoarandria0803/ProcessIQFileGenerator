/**
 * Mappings et constantes pour la génération de PDF CERFA
 */

// =====================================================
// CODES DE RÉFÉRENCE CERFA
// =====================================================

// Codes diplômes
export const CODES_DIPLOMES: Record<string, string> = {
  "Doctorat": "80",
  "Master": "73",
  "Diplôme ingénieur": "75",
  "Diplôme école de commerce": "76",
  "Autre diplôme ou titre bac +5 ou plus": "79",
  "Licence professionnelle": "62",
  "Licence générale": "63",
  "Bachelor universitaire de technologie (BUT)": "64",
  "Autre diplôme ou titre bac +3 ou 4": "69",
  "Brevet de Technicien Supérieur (BTS)": "54",
  "BTS": "54",
  "BTS MCO": "54",
  "BTS NDRC": "54",
  "BTS COM": "54",
  "TP NTC": "58",
  "Bachelor RDC": "64",
  "Diplôme Universitaire de Technologie (DUT)": "55",
  "DUT": "55",
  "Autre diplôme ou titre bac +2": "58",
  "Baccalauréat professionnel": "41",
  "Bac Pro": "41",
  "Baccalauréat général": "42",
  "Bac général": "42",
  "Baccalauréat technologique": "43",
  "Bac techno": "43",
  "CAP": "33",
  "BEP": "34",
  "Diplôme National du Brevet": "25",
  "Brevet": "25",
  "Aucun diplôme ni titre professionnel": "13",
  "Aucun": "13",
};

// Codes type d'employeur
export const CODES_TYPE_EMPLOYEUR: Record<string, string> = {
  "11 Entreprise inscrite au répertoire des métiers ou au registre des entreprises pour lAlsace-Moselle": "11",
  "12 Entreprise inscrite uniquement au registre du commerce et des sociétés": "12",
  "13 Entreprises dont les salariés relèvent de la mutualité sociale agricole": "13",
  "14 Profession libérale": "14",
  "15 Association": "15",
  "16 Autre employeur privé": "16",
  "21 Service de lÉtat": "21",
  "22 Commune": "22",
  "23 Département": "23",
  "24 Région": "24",
  "25 Établissement public hospitalier": "25",
  "26 Établissement public local denseignement": "26",
  "27 Établissement public administratif de lÉtat": "27",
  "28 Établissement public administratif local": "28",
  "29 Autre employeur public": "29",
};

// Codes type de contrat
export const CODES_TYPE_CONTRAT: Record<string, string> = {
  "11 Premier contrat d apprentissage de l apprenti": "11",
  "21 Nouveau contrat avec un apprenti qui a terminé son précédent contrat auprès d un même employeur": "21",
  "22 Nouveau contrat avec un apprenti qui a terminé son précédent contrat auprès d un autre employeur": "22",
  "23 Nouveau contrat avec un apprenti dont le précédent contrat auprès d un autre employeur a été rompu": "23",
  "31 Contrat ouvrant droit à une exonération de cotisation": "31",
  "32 Changement d employeur dans le cadre d un contrat saisonnier": "32",
  "33 Changement d employeur hors contrat saisonnier": "33",
  "34 Apprenti inscrit dans un parcours de formation (passeport alternance)": "34",
  "35 Contrat avec avenant": "35",
  "36 Avenant portant modification du contrat": "36",
  "37 Prolongation du contrat suite à un échec à l examen": "37",
};

// Codes type de dérogation
export const CODES_TYPE_DEROGATION: Record<string, string> = {
  "Aucune": "0",
  "11 Age de l apprenti inférieur à 16 ans": "11",
  "12 Age de l apprenti supérieur à 29 ans": "12",
  "21 Réduction de la durée du contrat ou de la période d apprentissage": "21",
  "22 Allongement de la durée du contrat ou de la période d apprentissage": "22",
  "30 Début du contrat hors période de formation": "30",
  "40 Travail sur machines dangereuses": "40",
  "50 Employeur non sédentaire": "50",
};

// Données CFA Rush School par défaut
export const CFA_RUSH_SCHOOL: Record<string, string> = {
  "Dénomination CFA": "RUSH SCHOOL",
  "N° UAI du CFA": "0755845N",
  "N° SIRET CFA": "90837301600027",
  "N° Adresse CFA": "6",
  "Voie Adresse CFA": "Rue du Dr Finlay",
  "Code postal CFA": "75015",
  "Commune CFA": "Paris",
  "Complement adresse CFA": "",
};

// Mapping des formations
export const FORMATIONS_MAPPING: Record<string, {
  code_diplome: string;
  code_formation: string;
  code_rncp: string;
  intitule: string;
  heures: number;
}> = {
  "BTS MCO": {
    code_diplome: "32031210",
    code_formation: "32031210",
    code_rncp: "RNCP38362",
    intitule: "BTS Management Commercial Opérationnel",
    heures: 1350
  },
  "BTS MCO 1": {
    code_diplome: "32031210",
    code_formation: "32031210",
    code_rncp: "RNCP38362",
    intitule: "BTS Management Commercial Opérationnel",
    heures: 675
  },
  "BTS MCO 2": {
    code_diplome: "32031210",
    code_formation: "32031210",
    code_rncp: "RNCP38362",
    intitule: "BTS Management Commercial Opérationnel",
    heures: 675
  },
  "BTS NDRC": {
    code_diplome: "32031212",
    code_formation: "32031212",
    code_rncp: "RNCP38368",
    intitule: "BTS Négociation et Digitalisation de la Relation Client",
    heures: 1350
  },
  "BTS NDRC 1": {
    code_diplome: "32031212",
    code_formation: "32031212",
    code_rncp: "RNCP38368",
    intitule: "BTS Négociation et Digitalisation de la Relation Client",
    heures: 675
  },
  "BTS NDRC 2": {
    code_diplome: "32031212",
    code_formation: "32031212",
    code_rncp: "RNCP38368",
    intitule: "BTS Négociation et Digitalisation de la Relation Client",
    heures: 675
  },
  "TP NTC": {
    code_diplome: "26X31007",
    code_formation: "26X31007",
    code_rncp: "RNCP34079",
    intitule: "Titre Professionnel Négociateur Technico-Commercial",
    heures: 600
  },
  "Bachelor RDC": {
    code_diplome: "26X31204",
    code_formation: "26X31204",
    code_rncp: "RNCP36534",
    intitule: "Bachelor Responsable du Développement Commercial",
    heures: 500
  },
};

// =====================================================
// MAPPING DES CHAMPS PDF CERFA
// =====================================================

// Champs texte CERFA
export const CERFA_TEXT_FIELDS: Record<string, [string, string]> = {
  // EMPLOYEUR
  "Zone de texte 8_2": ["entreprise", "Numéro SIRET"],
  "Zone de texte 8_3": ["entreprise", "Raison sociale"],
  "Zone de texte 8_4": ["entreprise", "Numéro entreprise"],
  "Zone de texte 8_5": ["entreprise", "Voie entreprise"],
  "Zone de texte 8_6": ["entreprise", "Complément dadresse entreprise"],
  "Zone de texte 8_7": ["entreprise", "Code postal entreprise"],
  "Zone de texte 8_8": ["entreprise", "Ville entreprise"],
  "Zone de texte 8_9": ["entreprise", "Téléphone entreprise"],
  "Zone de texte 8_10": ["entreprise", "Email entreprise"],
  "Zone de texte 8_11": ["entreprise", "Type demployeur"],
  "Zone de texte 8_12": ["entreprise", "Employeur specifique"],
  "Zone de texte 8_13": ["entreprise", "Code APE/NAF"],
  "Zone de texte 8_14": ["entreprise", "Effectif salarié de l'entreprise"],
  "Zone de texte 8_15": ["entreprise", "Convention collective"],
  
  // APPRENTI
  "Zone de texte 8_19": ["candidat", "NOM de naissance"],
  "Zone de texte 8_20": ["candidat", "Prénom"],
  "Zone de texte 8_21": ["candidat", "NIR"],
  "Zone de texte 8_28": ["candidat", "Nationalité"],
  "Zone de texte 8_30": ["candidat", "Département"],
  "Zone de texte 8_31": ["candidat", "Commune de naissance"],
  "Zone de texte 8_32": ["candidat", "Adresse lieu dexécution du contrat"],
  "Zone de texte 8_35": ["candidat", "Téléphone"],
  "Zone de texte 8_93": ["candidat", "E-mail"],
  "Zone de texte 8_36": ["candidat", "Dernier diplôme ou titre préparé"],
  "Zone de texte 8_37": ["candidat", "Dernière classe / année suivie"],
  "Zone de texte 8_38": ["candidat", "Intitulé précis du dernier diplôme ou titre préparé"],
  "Zone de texte 8_39": ["candidat", "BAC"],
  
  // MAÎTRE D'APPRENTISSAGE
  "Zone de texte 8_40": ["entreprise", "Nom Maître apprentissage"],
  "Zone de texte 8_41": ["entreprise", "Prénom Maître apprentissage"],
  "Zone de texte 8_44": ["entreprise", "Diplôme Maître apprentissage"],
  
  // CONTRAT
  "Zone de texte 8_49": ["entreprise", "Type de contrat"],
  "Zone de texte 8_50": ["entreprise", "Type de dérogation"],
  "Zone de texte 8_68": ["entreprise", "Durée hebdomadaire"],
  
  // RÉMUNÉRATION
  "Zone de texte 8_95": ["entreprise", "Pourcentage du SMIC 1"],
  "Zone de texte 8_96": ["entreprise", "SMIC 1"],
  "Zone de texte 8_56": ["entreprise", "Pourcentage du SMIC 1"],
  "Zone de texte 8_57": ["entreprise", "SMIC 1"],
  "Zone de texte 8_58": ["entreprise", "Pourcentage smic 2"],
  "Zone de texte 8_59": ["entreprise", "smic 2"],
  "Zone de texte 8_60": ["entreprise", "Pourcentage smic 2"],
  "Zone de texte 8_61": ["entreprise", "smic 2"],
  "Zone de texte 8_62": ["entreprise", "Pourcentage smic 3"],
  "Zone de texte 8_63": ["entreprise", "smic 3"],
  "Zone de texte 8_64": ["entreprise", "Pourcentage smic 3"],
  "Zone de texte 8_65": ["entreprise", "smic 3"],
  "Zone de texte 8_66": ["entreprise", "Pourcentage smic 4"],
  "Zone de texte 8_67": ["entreprise", "smic 4"],
  
  // FORMATION
  "Zone de texte 8_99": ["formation", "Dénomination CFA"],
  "Zone de texte 8_73": ["formation", "N° UAI du CFA"],
  "Zone de texte 8_74": ["formation", "N° SIRET CFA"],
  "Zone de texte 8_77": ["candidat", "Formation"],
  "Zone de texte 8_100": ["candidat", "Formation choisie"],
  "Zone de texte 8_75": ["candidat", "Code diplôme"],
  "Zone de texte 8_76": ["candidat", "Code RNCP"],
  "Zone de texte 8_79": ["formation", "N° Adresse CFA"],
  "Zone de texte 8_80": ["formation", "Voie Adresse CFA"],
  "Zone de texte 8_82": ["formation", "Code postal CFA"],
  "Zone de texte 8_78": ["formation", "Commune CFA"],
  "Zone de texte 8_81": ["formation", "Complement adresse CFA"],
  "Zone de texte 21_80": ["candidat", "Nombre heure formation"],
  
  // Caisse de retraite
  "Zone de texte 21_74": ["entreprise", "Caisse de retraite"],
};

// Champs de date CERFA
export const CERFA_DATE_FIELDS: Record<string, {
  source: [string, string];
  jour: string;
  mois: string;
  annee: string;
}> = {
  // Date de naissance apprenti
  "date_naissance_apprenti": {
    source: ["candidat", "Date de naissance"],
    jour: "Zone de texte 21_1",
    mois: "Zone de texte 21_2",
    annee: "Zone de texte 21_3"
  },
  // Date de début de contrat
  "date_debut_contrat": {
    source: ["entreprise", "Date de début exécution"],
    jour: "Zone de texte 21_7",
    mois: "Zone de texte 21_8",
    annee: "Zone de texte 21_9"
  },
  // Date de fin de contrat
  "date_fin_contrat": {
    source: ["entreprise", "Fin du contrat apprentissage"],
    jour: "Zone de texte 21_10",
    mois: "Zone de texte 21_11",
    annee: "Zone de texte 21_12"
  },
  // Dates rémunération 1ère année période 2
  "date_debut_remuneration_1_2": {
    source: ["entreprise", "date_debut_2periode_1er_annee"],
    jour: "Zone de texte 21_37",
    mois: "Zone de texte 21_38",
    annee: "Zone de texte 21_39"
  },
  "date_fin_remuneration_1_2": {
    source: ["entreprise", "date_fin_2periode_1er_annee"],
    jour: "Zone de texte 21_40",
    mois: "Zone de texte 21_41",
    annee: "Zone de texte 21_42"
  },
  // Dates rémunération 2ème année
  "date_debut_remuneration_2_1": {
    source: ["entreprise", "date_debut_1periode_2eme_annee"],
    jour: "Zone de texte 21_43",
    mois: "Zone de texte 21_44",
    annee: "Zone de texte 21_45"
  },
  "date_fin_remuneration_2_1": {
    source: ["entreprise", "date_fin_1periode_2eme_annee"],
    jour: "Zone de texte 21_46",
    mois: "Zone de texte 21_47",
    annee: "Zone de texte 21_48"
  },
  "date_debut_remuneration_2_2": {
    source: ["entreprise", "date_debut_2periode_2eme_annee"],
    jour: "Zone de texte 21_49",
    mois: "Zone de texte 21_50",
    annee: "Zone de texte 21_51"
  },
  "date_fin_remuneration_2_2": {
    source: ["entreprise", "date_fin_2periode_2eme_annee"],
    jour: "Zone de texte 21_52",
    mois: "Zone de texte 21_53",
    annee: "Zone de texte 21_54"
  },
  // Dates rémunération 3ème année
  "date_debut_remuneration_3_1": {
    source: ["entreprise", "date_debut_1periode_3eme_annee"],
    jour: "Zone de texte 21_55",
    mois: "Zone de texte 21_56",
    annee: "Zone de texte 21_57"
  },
  "date_fin_remuneration_3_1": {
    source: ["entreprise", "date_fin_1periode_3eme_annee"],
    jour: "Zone de texte 21_58",
    mois: "Zone de texte 21_59",
    annee: "Zone de texte 21_60"
  },
};

// Cases à cocher CERFA
export const CERFA_CHECKBOXES: Record<string, {
  source: string;
  key: string;
  condition: string | string[];
}> = {
  // Sexe
  "Case à cocher 3": { source: "candidat", key: "Sexe", condition: "M" },
  "Case à cocher 4": { source: "candidat", key: "Sexe", condition: "F" },
  // Handicap
  "Case à cocher 5": { source: "candidat", key: "Déclare bénéficier de la reconnaissance travailleur handicapé", condition: "Oui" },
  "Case à cocher 6": { source: "candidat", key: "Déclare bénéficier de la reconnaissance travailleur handicapé", condition: "Non" },
};
