/**
 * Mappings et constantes pour la generation de PDF CERFA
 * Transcription EXACTE du fichier Python cerfa_generator_service.py
 * Les noms de champs correspondent aux noms reels dans le PDF cerfa.pdf
 */

// =====================================================
// CODES DE REFERENCE CERFA
// =====================================================

// Codes situation avant le contrat - CERFA
export const CODES_SITUATION_AVANT_CONTRAT: Record<string, string> = {
  // Valeurs Airtable avec numéros -> Codes CERFA
  "1 Scolaire": "1",
  "2 Prépa apprentissage": "2",
  "3 Etudiant": "3",
  "4 Contrat d'apprentissage": "4",
  "4 Contrat dapprentissage": "4",
  "5 Contrat de professionnalisation": "5",
  "6 Contrat aidé": "6",
  "7 Formation au CFA sous statut de stagiaire": "7",
  "8 Formation au CFA sans contrat après rupture": "8",
  "9 Autres situations stagiaire formation professionnelle": "9",
  "10 Salarié": "10",
  "11 Personne à la recherche d'un emploi": "11",
  "12 Inactif": "12",
  // Valeurs Airtable legacy sans numéros
  "Scolaire : (Bac / brevet...)": "1",
  "Scolaire": "1",
  "Prépa apprentissage": "2",
  "Etudiant : (Etude supérieur)": "3",
  "Etudiant": "3",
  "Contrat dapprentissage": "4",
  "Contrat d'apprentissage": "4",
  "Contrat de professionnalisation": "5",
  "Contrat pro": "5",
  "Contrat aidé": "6",
  "Formation CFA statut stagiaire avant contrat": "7",
  "Formation CFA sans contrat après rupture": "8",
  "Autres situations stagiaire formation professionnelle": "9",
  "Salarié : (CDD/CDI)": "10",
  "Salarié": "10",
  "CDD": "10",
  "CDI": "10",
  "Personne à la recherche d'un emploi": "11",
  "Demandeur d'emploi": "11",
  "Chômeur": "11",
  "Inactif": "12",
  "Service civique": "12",
  "Stage": "12",
  "Autre": "12",
};

// Codes départements français - CERFA
export const CODES_DEPARTEMENTS: Record<string, string> = {
  // Départements métropolitains
  "Ain": "01",
  "Aisne": "02",
  "Allier": "03",
  "Alpes-de-Haute-Provence": "04",
  "Hautes-Alpes": "05",
  "Alpes-Maritimes": "06",
  "Ardèche": "07",
  "Ardennes": "08",
  "Ariège": "09",
  "Aube": "10",
  "Aude": "11",
  "Aveyron": "12",
  "Bouches-du-Rhône": "13",
  "Calvados": "14",
  "Cantal": "15",
  "Charente": "16",
  "Charente-Maritime": "17",
  "Cher": "18",
  "Corrèze": "19",
  "Côte-d'Or": "21",
  "Côtes-d'Armor": "22",
  "Creuse": "23",
  "Dordogne": "24",
  "Doubs": "25",
  "Drôme": "26",
  "Eure": "27",
  "Eure-et-Loir": "28",
  "Finistère": "29",
  "Gard": "30",
  "Haute-Garonne": "31",
  "Gers": "32",
  "Gironde": "33",
  "Hérault": "34",
  "Ille-et-Vilaine": "35",
  "Indre": "36",
  "Indre-et-Loire": "37",
  "Isère": "38",
  "Jura": "39",
  "Landes": "40",
  "Loir-et-Cher": "41",
  "Loire": "42",
  "Haute-Loire": "43",
  "Loire-Atlantique": "44",
  "Loiret": "45",
  "Lot": "46",
  "Lot-et-Garonne": "47",
  "Lozère": "48",
  "Maine-et-Loire": "49",
  "Manche": "50",
  "Marne": "51",
  "Haute-Marne": "52",
  "Mayenne": "53",
  "Meurthe-et-Moselle": "54",
  "Meuse": "55",
  "Morbihan": "56",
  "Moselle": "57",
  "Nièvre": "58",
  "Nord": "59",
  "Oise": "60",
  "Orne": "61",
  "Pas-de-Calais": "62",
  "Puy-de-Dôme": "63",
  "Pyrénées-Atlantiques": "64",
  "Hautes-Pyrénées": "65",
  "Pyrénées-Orientales": "66",
  "Bas-Rhin": "67",
  "Haut-Rhin": "68",
  "Rhône": "69",
  "Haute-Saône": "70",
  "Saône-et-Loire": "71",
  "Sarthe": "72",
  "Savoie": "73",
  "Haute-Savoie": "74",
  "Paris": "75",
  "Seine-Maritime": "76",
  "Seine-et-Marne": "77",
  "Yvelines": "78",
  "Deux-Sèvres": "79",
  "Somme": "80",
  "Tarn": "81",
  "Tarn-et-Garonne": "82",
  "Var": "83",
  "Vaucluse": "84",
  "Vendée": "85",
  "Vienne": "86",
  "Haute-Vienne": "87",
  "Vosges": "88",
  "Yonne": "89",
  "Territoire de Belfort": "90",
  "Essonne": "91",
  "Hauts-de-Seine": "92",
  "Seine-Saint-Denis": "93",
  "Val-de-Marne": "94",
  "Val-d'Oise": "95",
  // Corse
  "Corse-du-Sud": "2A",
  "Haute-Corse": "2B",
  // DOM-TOM
  "Guadeloupe": "971",
  "Martinique": "972",
  "Guyane": "973",
  "La Réunion": "974",
  "Mayotte": "976",
  // Étranger
  "Étranger": "99",
  "Etranger": "99",
  "personne née à l'étranger": "99",
  "né à l'étranger": "99",
};

// Codes diplomes - EXACT Python
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
  "Diplôme de spécialisation professionnelle": "44",
  "Autre diplôme ou titre niveau bac": "49",
  "CAP": "33",
  "BEP": "34",
  "Certificat de spécialisation": "35",
  "Autre diplôme ou titre CAP/BEP": "38",
  "Diplôme National du Brevet": "25",
  "Brevet": "25",
  "Certificat de Formation Générale": "26",
  "Aucun diplôme ni titre professionnel": "13",
  "Aucun": "13",
};

// Codes derniere annee/classe suivie - EXACT Python
export const CODES_DERNIERE_CLASSE: Record<string, string> = {
  "Dernière année suivie et diplôme obtenu": "01",
  "Diplôme obtenu": "01",
  "1ère année suivie et validée": "11",
  "1ère année validée": "11",
  "1ère année suivie non validée": "12",
  "1ère année non validée": "12",
  "2ème année suivie et validée": "21",
  "2ème année validée": "21",
  "2ème année suivie non validée": "22",
  "2ème année non validée": "22",
  "3ème année suivie et validée": "31",
  "3ème année validée": "31",
  "3ème année suivie non validée": "32",
  "3ème année non validée": "32",
  "Fin du collège": "40",
  "Études interrompues en 3ème": "41",
  "Études interrompues en 4ème": "42",
};

// Codes type de contrat - EXACT Python
export const CODES_TYPE_CONTRAT: Record<string, string> = {
  "11 Premier contrat d apprentissage de l apprenti": "11",
  "21 Nouveau contrat avec un apprenti qui a terminé son précédent contrat auprès d un même employeur": "21",
  "22 Nouveau contrat avec un apprenti qui a terminé son précédent contrat auprès d un autre employeur": "22",
  "23 Nouveau contrat avec un apprenti dont le précédent contrat a été rompu": "23",
  "31 Modification de la situation juridique de l employeur": "31",
  "32 Changement d employeur dans le cadre d un contrat saisonnier": "32",
  "33 Prolongation du contrat suite à un échec à l examen de l apprenti": "33",
  "34 Prolongation du contrat suite à la reconnaissance de l apprenti comme travailleur handicapé": "34",
  "35 Diplôme supplémentaire préparé par l apprenti dans le cadre de l article L. 6222-22-1 du code du travail": "35",
  "36 Autres changements : changement de maître d apprentissage, de durée de travail hebdomadaire, réduction de durée, etc.": "36",
  "37 Modifications de lieu d exécution du contrat": "37",
  "38 Modification du lieu principale de réalisation de la formation théorique": "38",
};

// Codes type d'employeur - EXACT Python
export const CODES_TYPE_EMPLOYEUR: Record<string, string> = {
  "11 Entreprise inscrite au répertoire des métiers ou au registre des entreprises pour l Alsace-Moselle": "11",
  "12 Entreprise inscrite uniquement au registre du commerce et des sociétés": "12",
  "13 Entreprises dont les salariés relèvent de la mutualité sociale agricole": "13",
  "14 Profession libérale": "14",
  "15 Association": "15",
  "16 Autre employeur privé": "16",
  "21 Service de l État (administrations centrales et leurs services déconcentrés)": "21",
  "22 Commune": "22",
  "23 Département": "23",
  "24 Région": "24",
  "25 Etablissement public hospitalier": "25",
  "26 Etablissement public local d enseignement": "26",
  "27 Etablissement public administratif de l Etat": "27",
  "28 Etablissement public administratif local (y compris établissement public de coopération intercommunale EPCI)": "28",
  "29 Autre employeur public": "29",
  "30 Etablissement public industriel et commercial": "30",
};

// Codes diplome maitre apprentissage - EXACT Python
export const CODES_DIPLOMES_MAITRE: Record<string, string> = {
  "Aucun diplôme": "13",
  "CAP, BEP": "34",
  "Baccalauréat": "41",
  "DEUG, BTS, DUT, DEUST": "54",
  "Licence, Licence professionnelle, BUT, Maîtrise": "64",
  "Master, Diplôme d'études approfondies, Diplôme d'études spécialisées, Diplôme d'ingénieur": "73",
  "Master, Diplôme d'études approfondies, Diplôme d études spécialisées, Diplôme d ingénieur": "73",
  "Master": "73",
  "Doctorat, Habilitation à diriger des recherches": "80",
  "Doctorat": "80",
};

// Codes employeur specifique - EXACT Python
export const CODES_EMPLOYEUR_SPECIFIQUE: Record<string, string> = {
  "Entreprise de travail temporaire": "1",
  "Travail temporaire": "1",
  "Groupement d'employeurs": "2",
  "Employeur saisonnier": "3",
  "Saisonnier": "3",
  "Apprentissage familial": "4",
  "Familial": "4",
  "Aucun de ces cas": "0",
  "Aucun": "0",
  "": "0",
};

// Codes type de derogation - EXACT Python
export const CODES_TYPE_DEROGATION: Record<string, string> = {
  "Aucune dérogation": "0",
  "Aucune": "0",
  "Age de l'apprenti inférieur à 16 ans": "11",
  "Âge inférieur à 16 ans": "11",
  "Âge supérieur à 29 ans: cas spécifiques prévus dans le code du travail": "12",
  "Âge supérieur à 29 ans": "12",
  "Réduction de la durée du contrat ou de la période d'apprentissage": "21",
  "Réduction durée": "21",
  "Allongement de la durée du contrat ou de la période d'apprentissage": "22",
  "Allongement durée": "22",
  "Cumul de dérogations": "50",
  "Cumul": "50",
  "Autre dérogation": "60",
  "Autre": "60",
  "": "0",
};

// Pays UE pour nationalite - EXACT Python
export const PAYS_UE: string[] = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Chypre", "Croatie",
  "Danemark", "Espagne", "Estonie", "Finlande", "France", "Grèce",
  "Hongrie", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Pologne", "Portugal", "République tchèque",
  "Roumanie", "Slovaquie", "Slovénie", "Suède", "Union Européenne",
];

// France identifiers
export const PAYS_FRANCE: string[] = ["Française"];

// Codes regime social - EXACT Python
export const CODES_REGIME_SOCIAL: Record<string, string> = {
  "MSA": "1",
  "Mutualité sociale agricole": "1",
  "URSSAF": "2",
  "URSAAF": "2",
  "Régime général": "2",
};

// =====================================================
// FORMATIONS MAPPING - EXACT Python
// =====================================================

export const FORMATIONS_MAPPING: Record<string, Record<string, string>> = {
  "BTS MCO A": {
    code_diplome: "54",
    intitule: "BTS Management Commercial Opérationnel",
    code_formation: "32031213",
    code_rncp: "RNCP38362",
    date_debut_formation_cfa: "04/09/2025",
    date_fin_epreuves: "30/06/2027",
    heures: "1680",
  },
  "BTS MCO 2": {
    code_diplome: "54",
    intitule: "BTS Management Commercial Opérationnel",
    code_formation: "32031213",
    code_rncp: "RNCP38362",
    date_debut_formation_cfa: "04/09/2025",
    date_fin_epreuves: "30/06/2027",
    heures: "1680",
  },
  "BTS NDRC 1": {
    code_diplome: "54",
    intitule: "BTS Négociation et Digitalisation de la Relation Client",
    code_formation: "32031212",
    code_rncp: "RNCP38368",
    date_debut_formation_cfa: "09/09/2025",
    date_fin_epreuves: "30/06/2027",
    heures: "1740",
  },
  "BTS COM": {
    code_diplome: "54",
    intitule: "BTS - Communication",
    code_formation: "32032002",
    code_rncp: "RNCP37198",
    date_debut_formation_cfa: "",
    date_fin_epreuves: "",
    heures: "1680",
  },
  "Titre Pro NTC": {
    code_diplome: "58",
    intitule: "Titre Professionnel Négociateur technico-commercial",
    code_formation: "36T3120",
    code_rncp: "RNCP39063",
    date_debut_formation_cfa: "07/01/2026",
    date_fin_epreuves: "11/07/2026",
    heures: "450",
  },
  "Titre Pro NTC B (rentrée decalée)": {
    code_diplome: "58",
    intitule: "Titre Professionnel Négociateur technico-commercial",
    code_formation: "36T3120",
    code_rncp: "RNCP39063",
    date_debut_formation_cfa: "07/01/2026",
    date_fin_epreuves: "11/07/2026",
    heures: "450",
  },
  "Bachelor RDC": {
    code_diplome: "64",
    intitule: "Bachelor Responsable du développement commercial",
    code_formation: "26X31015",
    code_rncp: "RNCP37849",
    date_debut_formation_cfa: "17/09/2025",
    date_fin_epreuves: "17/07/2027",
    heures: "500",
  },
};

// =====================================================
// CFA RUSH SCHOOL - VALEURS PAR DEFAUT - EXACT Python
// =====================================================

export const CFA_RUSH_SCHOOL: Record<string, string> = {
  "N° Adresse CFA": "6",
  "Voie Adresse CFA": "rue des Bateliers",
  "Code postal CFA": "92110",
  "Commune CFA": "CLICHY",
  "Complement adresse CFA": "",
  "Dénomination CFA": "Formation influence - Rush-School",
  "N° UAI du CFA": "0923033X",
  "N° SIRET CFA": "91870770400014",
  "CFA entreprise": "Non",
  "CFA est lieu principal": "Oui",
  "Ville organisme de formation": "NANTERRE",
};

// =====================================================
// TYPES EMPLOYEUR PRIVE / PUBLIC - EXACT Python
// =====================================================

export const TYPES_EMPLOYEUR_PRIVE: string[] = [
  "11 Entreprise inscrite au répertoire des métiers ou au registre des entreprises pour l Alsace-Moselle",
  "12 Entreprise inscrite uniquement au registre du commerce et des sociétés",
  "13 Entreprises dont les salariés relèvent de la mutualité sociale agricole",
  "14 Profession libérale",
  "15 Association",
  "16 Autre employeur privé",
];

export const TYPES_EMPLOYEUR_PUBLIC: string[] = [
  "21 Service de l État (administrations centrales et leurs services déconcentrés)",
  "22 Commune",
  "23 Département",
  "24 Région",
  "25 Etablissement public hospitalier",
  "26 Etablissement public local d enseignement",
  "27 Etablissement public administratif de l Etat",
  "28 Etablissement public administratif local (y compris établissement public de coopération intercommunale EPCI)",
  "29 Autre employeur public",
  "30 Etablissement public industriel et commercial",
];

// =====================================================
// CERFA TEXT FIELDS MAPPING - EXACT Python field names
// Format: { pdfFieldName: [source, airtable_column] }
// These field names match the actual PDF form field names
// =====================================================

export const CERFA_TEXT_FIELDS: Record<string, [string, string]> = {
  // =====================================================
  // L'EMPLOYEUR
  // =====================================================
  "Zone de texte 8_54": ["entreprise", "Mode contractuel de lapprentissage"],
  "Zone de texte 8": ["entreprise", "Raison sociale"],
  "Zone de texte 8_2": ["entreprise", "Numéro SIRET"],
  "Zone de texte 8_3": ["entreprise", "Type demployeur"],
  "Zone de texte 8_14": ["entreprise", "Numéro entreprise"],
  "Zone de texte 8_13": ["entreprise", "Voie entreprise"],
  "Zone de texte 8_4": ["entreprise", "Employeur specifique"],
  "Zone de texte 8_8": ["entreprise", "Complément dadresse entreprise"],
  "Zone de texte 8_7": ["entreprise", "Code APE/NAF"],
  "Zone de texte 8_9": ["entreprise", "Code postal entreprise"],
  "Zone de texte 8_10": ["entreprise", "Ville entreprise"],
  "Zone de texte 8_5": ["entreprise", "Effectif salarié de l'entreprise"],
  "Zone de texte 8_11": ["entreprise", "Téléphone entreprise"],
  "Zone de texte 8_12": ["entreprise", "Email entreprise"],
  "Zone de texte 8_6": ["entreprise", "Convention collective"],

  // =====================================================
  // L'APPRENTI(E)
  // =====================================================
  "Zone de texte 8_15": ["candidat", "NOM de naissance"],
  "Zone de texte 8_16": ["candidat", "NOM dusage"],
  "Zone de texte 8_17": ["candidat", "Prénom"],
  "Zone de texte 8_18": ["candidat", "NIR"],
  "Zone de texte 8_19": ["candidat", "Numéro de voie"],
  "Zone de texte 8_20": ["candidat", "Nom de la rue"],
  "Zone de texte 8_23": ["candidat", "Ville"],
  "Zone de texte 8_21": ["candidat", "Complement adresse"],
  "Zone de texte 8_22": ["candidat", "Code postal"],
  "Zone de texte 8_27": ["candidat", "Commune de naissance"],
  "Zone de texte 8_26": ["candidat", "Département"],
  "Zone de texte 8_33": ["candidat", "Nationalité"],
  "Zone de texte 8_34": ["candidat", "Régime social"],
  "Zone de texte 8_24": ["candidat", "Téléphone"],
  "Zone de texte 8_25": ["candidat", "E-mail"],
  "Zone de texte 8_28": ["candidat", "Situation avant le contrat"],
  "Zone de texte 8_29": ["candidat", "Dernier diplôme ou titre préparé"],
  "Zone de texte 8_36": ["candidat", "Voie représentant légal"],
  "Zone de texte 8_30": ["candidat", "Dernière classe / année suivie"],
  "Zone de texte 8_32": ["candidat", "Dernier diplôme ou titre préparé"],
  "Zone de texte 8_31": ["candidat", "Intitulé précis du dernier diplôme ou titre préparé"],
  "Zone de texte 8_37": ["candidat", "Numéro de voie représentant légal"],
  "Zone de texte 8_35": ["candidat", "Nom du representant legal"],
  "Zone de texte 8_38": ["candidat", "Complément adresse représentant légal"],
  "Zone de texte 8_39": ["candidat", "Code postal représentant légal"],
  "Zone de texte 8_40": ["candidat", "Commune représentant légal"],
  "Zone de texte 8_41": ["candidat", "Courriel représentant légal"],

  // =====================================================
  // LE MAÎTRE D'APPRENTISSAGE N°1
  // =====================================================
  "Zone de texte 8_42": ["entreprise", "Nom Maître apprentissage"],
  "Zone de texte 8_43": ["entreprise", "Prénom Maître apprentissage"],
  "Zone de texte 8_44": ["entreprise", "Email Maître apprentissage"],
  "Zone de texte 8_45": ["entreprise", "Fonction Maître apprentissage"],
  "Zone de texte 8_50": ["entreprise", "Diplôme Maître apprentissage"],
  "Zone de texte 8_52": ["entreprise", "Diplôme Maître apprentissage"],

  // =====================================================
  // LE MAÎTRE D'APPRENTISSAGE N°2 (optionnel)
  // =====================================================
  "Zone de texte 8_46": ["entreprise", "Nom Maître apprentissage 2"],
  "Zone de texte 8_47": ["entreprise", "Prénom Maître apprentissage 2"],
  "Zone de texte 8_48": ["entreprise", "Email Maître apprentissage 2"],
  "Zone de texte 8_49": ["entreprise", "Fonction Maître apprentissage 2"],
  "Zone de texte 8_51": ["entreprise", "Diplôme Maître apprentissage 2"],
  "Zone de texte 8_53": ["entreprise", "Diplôme Maître apprentissage 2"],

  // =====================================================
  // LE CONTRAT
  // =====================================================
  "Zone de texte 8_71": ["entreprise", "Type de contrat"],
  "Zone de texte 8_70": ["entreprise", "Type de dérogation"],
  "Zone de texte 8_55": ["entreprise", "Numéro DECA de ancien contrat"],
  "Zone de texte 8_68": ["entreprise", "Durée hebdomadaire"],

  // =====================================================
  // RÉMUNÉRATION
  // Layout PDF vérifié par coordonnées:
  // 1ère année (y=669): 8_95/8_96 (période 1) + 8_97/8_98 (période 2)
  // 2ème année (y=655): 8_56/8_57 (période 1) + 8_58/8_59 (période 2)
  // 3ème année (y=641): 8_60/8_61 (période 1) + 8_62/8_63 (période 2)
  // 4ème année (y=627): 8_64/8_65 (période 1) + 8_66/8_67 (période 2)
  // =====================================================
  // 1ère année - 1ère période
  "Zone de texte 8_95": ["entreprise", "Pourcentage du SMIC 1"],
  "Zone de texte 8_96": ["entreprise", "SMIC 1"],
  // 1ère année - 2ème période
  "Zone de texte 8_97": ["entreprise", "Pourcentage du SMIC 1"],
  "Zone de texte 8_98": ["entreprise", "SMIC 1"],
  // 2ème année - 1ère période
  "Zone de texte 8_56": ["entreprise", "Pourcentage smic 2"],
  "Zone de texte 8_57": ["entreprise", "smic 2"],
  // 2ème année - 2ème période
  "Zone de texte 8_58": ["entreprise", "Pourcentage smic 2"],
  "Zone de texte 8_59": ["entreprise", "smic 2"],
  // 3ème année - 1ère période
  "Zone de texte 8_60": ["entreprise", "Pourcentage smic 3"],
  "Zone de texte 8_61": ["entreprise", "smic 3"],
  // 3ème année - 2ème période
  "Zone de texte 8_62": ["entreprise", "Pourcentage smic 3"],
  "Zone de texte 8_63": ["entreprise", "smic 3"],
  // 4ème année - 1ère période
  "Zone de texte 8_64": ["entreprise", "Pourcentage smic 4"],
  "Zone de texte 8_65": ["entreprise", "smic 4"],
  // 4ème année - 2ème période
  "Zone de texte 8_66": ["entreprise", "Pourcentage smic 4"],
  "Zone de texte 8_67": ["entreprise", "smic 4"],
  "Zone de texte 8_72": ["entreprise", "Salaire brut mensuel 1"],
  "Zone de texte 21_73": ["entreprise", "Salaire brut mensuel 1"],
  "Zone de texte 21_74": ["entreprise", "Caisse de retraite"],
  "Zone de texte 21_75": ["entreprise", "Avantage nourriture euros"],
  "Zone de texte 21_76": ["entreprise", "Avantage nourriture centimes"],
  "Zone de texte 21_77": ["entreprise", "Avantage logement euros"],
  "Zone de texte 21_78": ["entreprise", "Avantage logement centimes"],
  "Zone de texte 21_79": ["entreprise", "Autre avantage"],

  // =====================================================
  // LA FORMATION
  // =====================================================
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
  "Zone de texte 8_102": ["entreprise", "Heures formation à distance"],
  "Zone de texte 8_90": ["formation", "Ville organisme de formation"],
  "Zone de texte 8_101": ["formation", "Dénomination du CFA responsable"],
  "Zone de texte 8_84": ["formation", "Numéro UAI du CFA"],
  "Zone de texte 8_83": ["formation", "Numéro SIRET du CFA"],
  "Zone de texte 8_86": ["formation", "Adresse du CFA"],
  "Zone de texte 8_88": ["formation", "Complément adresse CFA"],
  "Zone de texte 8_89": ["formation", "Code postal CFA"],
  "Zone de texte 8_85": ["formation", "Commune CFA"],
};

// =====================================================
// CASES À COCHER - EXACT Python
// Note: "Case à cocher" uses real accent à (decoded from #C3#A0 in PDF)
// =====================================================

export const CERFA_CHECKBOXES: Record<string, [string, string, string]> = {
  "Case à cocher 1": ["entreprise", "Secteur", "Privé"],
  "Case à cocher 2": ["entreprise", "Secteur", "Public"],
  "Case à cocher 3": ["candidat", "Sexe", "Masculin"],
  "Case à cocher 4": ["candidat", "Sexe", "Féminin"],
  "Case à cocher 5": ["candidat", "Déclare être inscrits sur la liste des sportifs de haut niveau", "Oui"],
  "Case à cocher 5_2": ["candidat", "Déclare être inscrits sur la liste des sportifs de haut niveau", "Non"],
  "Case à cocher 5_3": ["candidat", "Déclare bénéficier de la reconnaissance travailleur handicapé", "Oui"],
  "Case à cocher 5_4": ["candidat", "Déclare bénéficier de la reconnaissance travailleur handicapé", "Non"],
  "Case à cocher 5_5": ["candidat", "Équivalence jeunes RQTH", "Oui"],
  "Case à cocher 5_6": ["candidat", "Équivalence jeunes RQTH", "Non"],
  "Case à cocher 5_7": ["candidat", "Extension BOE", "Oui"],
  "Case à cocher 5_8": ["candidat", "Extension BOE", "Non"],
  "Case à cocher 5_9": ["candidat", "Déclare avoir un projet de création ou de reprise dentreprise", "Oui"],
  "Case à cocher 5_10": ["candidat", "Déclare avoir un projet de création ou de reprise dentreprise", "Non"],
  "Case à cocher 5_11": ["formation", "CFA entreprise", "Oui"],
  "Case à cocher 5_12": ["formation", "CFA entreprise", "Non"],
  "Case à cocher 7": ["formation", "CFA est lieu principal", "Oui"],
  "Case à cocher 8": ["entreprise", "Pièces justificatives", "Oui"],
  "Case à cocher 5_13": ["entreprise", "Travail sur machines dangereuses ou exposition à des risques particuliers", "Oui"],
  "Case à cocher 5_14": ["entreprise", "Travail sur machines dangereuses ou exposition à des risques particuliers", "Non"],
  "Case à cocher 6": ["entreprise", "Attestation maitre apprentissage", "Oui"],
};

// =====================================================
// DATES SPÉCIALES (jour/mois/année séparés) - EXACT Python
// =====================================================

export const CERFA_DATE_FIELDS: Record<string, {
  source: [string, string];
  jour: string;
  mois: string;
  annee: string;
}> = {
  "date_naissance_apprenti": {
    source: ["candidat", "Date de naissance"],
    jour: "Zone de texte 21_7",
    mois: "Zone de texte 21_8",
    annee: "Zone de texte 21_9",
  },
  "date_naissance_maitre_1": {
    source: ["entreprise", "Date de naissance Maître apprentissage"],
    jour: "Zone de texte 21_4",
    mois: "Zone de texte 21_5",
    annee: "Zone de texte 21_6",
  },
  "date_naissance_maitre_2": {
    source: ["entreprise", "Date naissance maitre dapprentissage 2"],
    jour: "Zone de texte 21",
    mois: "Zone de texte 21_2",
    annee: "Zone de texte 21_3",
  },
  "date_conclusion": {
    source: ["entreprise", "Date de conclusion"],
    jour: "Zone de texte 21_16",
    mois: "Zone de texte 21_17",
    annee: "Zone de texte 21_18",
  },
  "date_debut_execution": {
    source: ["entreprise", "Date de début exécution"],
    jour: "Zone de texte 21_19",
    mois: "Zone de texte 21_20",
    annee: "Zone de texte 21_21",
  },
  "date_debut_formation_pratique": {
    source: ["entreprise", "Date de début de formation pratique chez employeur"],
    jour: "Zone de texte 21_22",
    mois: "Zone de texte 21_23",
    annee: "Zone de texte 21_24",
  },
  "date_effet_avenant": {
    source: ["entreprise", "date Si avenant"],
    jour: "Zone de texte 21_13",
    mois: "Zone de texte 21_14",
    annee: "Zone de texte 21_15",
  },
  "date_fin_contrat": {
    source: ["entreprise", "Fin du contrat apprentissage"],
    jour: "Zone de texte 21_10",
    mois: "Zone de texte 21_11",
    annee: "Zone de texte 21_12",
  },
  "date_debut_remuneration_1_1": {
    source: ["entreprise", "Date de début exécution"],
    jour: "Zone de texte 21_81",
    mois: "Zone de texte 21_82",
    annee: "Zone de texte 21_83",
  },
  "date_fin_remuneration_1_1": {
    source: ["entreprise", "Date de conclusion"],
    jour: "Zone de texte 21_84",
    mois: "Zone de texte 21_85",
    annee: "Zone de texte 21_86",
  },
  // --- 1ère année - 2ème période (y=669, droite: 21_87→21_92) ---
  "date_debut_remuneration_1_2": {
    source: ["entreprise", "date_debut_2periode_1er_annee"],
    jour: "Zone de texte 21_87",
    mois: "Zone de texte 21_88",
    annee: "Zone de texte 21_89",
  },
  "date_fin_remuneration_1_2": {
    source: ["entreprise", "date_fin_2periode_1er_annee"],
    jour: "Zone de texte 21_90",
    mois: "Zone de texte 21_91",
    annee: "Zone de texte 21_92",
  },
  // --- 2ème année - 1ère période (y=655, gauche: 21_37→21_42) ---
  "date_debut_remuneration_2_1": {
    source: ["entreprise", "date_debut_1periode_2eme_annee"],
    jour: "Zone de texte 21_37",
    mois: "Zone de texte 21_38",
    annee: "Zone de texte 21_39",
  },
  "date_fin_remuneration_2_1": {
    source: ["entreprise", "date_fin_1periode_2eme_annee"],
    jour: "Zone de texte 21_40",
    mois: "Zone de texte 21_41",
    annee: "Zone de texte 21_42",
  },
  // --- 2ème année - 2ème période (y=655, droite: 21_43→21_48) ---
  "date_debut_remuneration_2_2": {
    source: ["entreprise", "date_debut_2periode_2eme_annee"],
    jour: "Zone de texte 21_43",
    mois: "Zone de texte 21_44",
    annee: "Zone de texte 21_45",
  },
  "date_fin_remuneration_2_2": {
    source: ["entreprise", "date_fin_2periode_2eme_annee"],
    jour: "Zone de texte 21_46",
    mois: "Zone de texte 21_47",
    annee: "Zone de texte 21_48",
  },
  // --- 3ème année - 1ère période (y=641, gauche: 21_49→21_54) ---
  "date_debut_remuneration_3_1": {
    source: ["entreprise", "date_debut_1periode_3eme_annee"],
    jour: "Zone de texte 21_49",
    mois: "Zone de texte 21_50",
    annee: "Zone de texte 21_51",
  },
  "date_fin_remuneration_3_1": {
    source: ["entreprise", "date_fin_1periode_3eme_annee"],
    jour: "Zone de texte 21_52",
    mois: "Zone de texte 21_53",
    annee: "Zone de texte 21_54",
  },
  // --- 3ème année - 2ème période (y=641, droite: 21_55→21_60) ---
  "date_debut_remuneration_3_2": {
    source: ["entreprise", "date_debut_2periode_3eme_annee"],
    jour: "Zone de texte 21_55",
    mois: "Zone de texte 21_56",
    annee: "Zone de texte 21_57",
  },
  "date_fin_remuneration_3_2": {
    source: ["entreprise", "date_fin_2periode_3eme_annee"],
    jour: "Zone de texte 21_58",
    mois: "Zone de texte 21_59",
    annee: "Zone de texte 21_60",
  },
  // --- 4ème année - 1ère période (y=627, gauche: 21_61→21_66) ---
  "date_debut_remuneration_4_1": {
    source: ["entreprise", "date_debut_1periode_4eme_annee"],
    jour: "Zone de texte 21_61",
    mois: "Zone de texte 21_62",
    annee: "Zone de texte 21_63",
  },
  "date_fin_remuneration_4_1": {
    source: ["entreprise", "date_fin_1periode_4eme_annee"],
    jour: "Zone de texte 21_64",
    mois: "Zone de texte 21_65",
    annee: "Zone de texte 21_66",
  },
  // --- 4ème année - 2ème période (y=627, droite: 21_67→21_72) ---
  "date_debut_remuneration_4_2": {
    source: ["entreprise", "date_debut_2periode_4eme_annee"],
    jour: "Zone de texte 21_67",
    mois: "Zone de texte 21_68",
    annee: "Zone de texte 21_69",
  },
  "date_fin_remuneration_4_2": {
    source: ["entreprise", "date_fin_2periode_4eme_annee"],
    jour: "Zone de texte 21_70",
    mois: "Zone de texte 21_71",
    annee: "Zone de texte 21_72",
  },
  "date_debut_formation_cfa": {
    source: ["entreprise", "Date début formation"],
    jour: "Zone de texte 21_25",
    mois: "Zone de texte 21_26",
    annee: "Zone de texte 21_27",
  },
  "date_fin_epreuves": {
    source: ["entreprise", "Date fin formation"],
    jour: "Zone de texte 21_28",
    mois: "Zone de texte 21_29",
    annee: "Zone de texte 21_30",
  },
  // NOTE: Les champs Zone de texte 21_31 à 21_36 correspondent à
  // "Date de réception du dossier complet" et "Date de la décision" dans le CERFA
  // Ces dates ne doivent PAS être remplies automatiquement (comme en Python)
};

// =====================================================
// FONT SIZES SPECIALES
// =====================================================

export const SMALL_FONT_FIELDS: Set<string> = new Set([
  "Zone de texte 8",
  "Zone de texte 8_2",
  "Zone de texte 8_13",
  "Zone de texte 8_8",
  "Zone de texte 8_6",
  "Zone de texte 8_12",
  "Zone de texte 8_16",
  "Zone de texte 8_15",
  "Zone de texte 8_17",
  "Zone de texte 8_20",
  "Zone de texte 8_21",
  "Zone de texte 8_25",
  "Zone de texte 8_31",
  "Zone de texte 8_41",
  "Zone de texte 8_44",
  "Zone de texte 8_48",
  "Zone de texte 8_99",
  "Zone de texte 8_100",
  "Zone de texte 8_80",
  "Zone de texte 8_81",
  "Zone de texte 8_101",
  "Zone de texte 8_88",
  "Zone de texte 8_55",
  "Zone de texte 21_74",
  "Zone de texte 8_90",
  "Zone de texte 8_85",
  "Zone de texte 8_87",
]);

export const EXTRA_SMALL_FONT_FIELDS: Set<string> = new Set([
  "Zone de texte 8_73",
  "Zone de texte 8_74",
  "Zone de texte 8_84",
  "Zone de texte 8_83",
  "Zone de texte 8_18",
]);