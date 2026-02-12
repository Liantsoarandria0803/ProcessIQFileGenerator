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

// Codes diplomes - EXACT Python
export const CODES_DIPLOMES: Record<string, string> = {
  "Doctorat": "80",
  "Master": "73",
  "Dipl\u00f4me ing\u00e9nieur": "75",
  "Dipl\u00f4me \u00e9cole de commerce": "76",
  "Autre dipl\u00f4me ou titre bac +5 ou plus": "79",
  "Licence professionnelle": "62",
  "Licence g\u00e9n\u00e9rale": "63",
  "Bachelor universitaire de technologie (BUT)": "64",
  "Autre dipl\u00f4me ou titre bac +3 ou 4": "69",
  "Brevet de Technicien Sup\u00e9rieur (BTS)": "54",
  "BTS": "54",
  "BTS MCO": "54",
  "BTS NDRC": "54",
  "BTS COM": "54",
  "TP NTC": "58",
  "Bachelor RDC": "64",
  "Dipl\u00f4me Universitaire de Technologie (DUT)": "55",
  "DUT": "55",
  "Autre dipl\u00f4me ou titre bac +2": "58",
  "Baccalaur\u00e9at professionnel": "41",
  "Bac Pro": "41",
  "Baccalaur\u00e9at g\u00e9n\u00e9ral": "42",
  "Bac g\u00e9n\u00e9ral": "42",
  "Baccalaur\u00e9at technologique": "43",
  "Bac techno": "43",
  "Dipl\u00f4me de sp\u00e9cialisation professionnelle": "44",
  "Autre dipl\u00f4me ou titre niveau bac": "49",
  "CAP": "33",
  "BEP": "34",
  "Certificat de sp\u00e9cialisation": "35",
  "Autre dipl\u00f4me ou titre CAP/BEP": "38",
  "Dipl\u00f4me National du Brevet": "25",
  "Brevet": "25",
  "Certificat de Formation G\u00e9n\u00e9rale": "26",
  "Aucun dipl\u00f4me ni titre professionnel": "13",
  "Aucun": "13",
};

// Codes derniere annee/classe suivie - EXACT Python
export const CODES_DERNIERE_CLASSE: Record<string, string> = {
  "Derni\u00e8re ann\u00e9e suivie et dipl\u00f4me obtenu": "01",
  "Dipl\u00f4me obtenu": "01",
  "1\u00e8re ann\u00e9e suivie et valid\u00e9e": "11",
  "1\u00e8re ann\u00e9e valid\u00e9e": "11",
  "1\u00e8re ann\u00e9e suivie non valid\u00e9e": "12",
  "1\u00e8re ann\u00e9e non valid\u00e9e": "12",
  "2\u00e8me ann\u00e9e suivie et valid\u00e9e": "21",
  "2\u00e8me ann\u00e9e valid\u00e9e": "21",
  "2\u00e8me ann\u00e9e suivie non valid\u00e9e": "22",
  "2\u00e8me ann\u00e9e non valid\u00e9e": "22",
  "3\u00e8me ann\u00e9e suivie et valid\u00e9e": "31",
  "3\u00e8me ann\u00e9e valid\u00e9e": "31",
  "3\u00e8me ann\u00e9e suivie non valid\u00e9e": "32",
  "3\u00e8me ann\u00e9e non valid\u00e9e": "32",
  "Fin du coll\u00e8ge": "40",
  "\u00c9tudes interrompues en 3\u00e8me": "41",
  "\u00c9tudes interrompues en 4\u00e8me": "42",
};

// Codes type de contrat - EXACT Python
export const CODES_TYPE_CONTRAT: Record<string, string> = {
  "11 Premier contrat d apprentissage de l apprenti": "11",
  "21 Nouveau contrat avec un apprenti qui a termin\u00e9 son pr\u00e9c\u00e9dent contrat aupr\u00e8s d un m\u00eame employeur": "21",
  "22 Nouveau contrat avec un apprenti qui a termin\u00e9 son pr\u00e9c\u00e9dent contrat aupr\u00e8s d un autre employeur": "22",
  "23 Nouveau contrat avec un apprenti dont le pr\u00e9c\u00e9dent contrat a \u00e9t\u00e9 rompu": "23",
  "31 Modification de la situation juridique de l employeur": "31",
  "32 Changement d employeur dans le cadre d un contrat saisonnier": "32",
  "33 Prolongation du contrat suite \u00e0 un \u00e9chec \u00e0 l examen de l apprenti": "33",
  "34 Prolongation du contrat suite \u00e0 la reconnaissance de l apprenti comme travailleur handicap\u00e9": "34",
  "35 Dipl\u00f4me suppl\u00e9mentaire pr\u00e9par\u00e9 par l apprenti dans le cadre de l article L. 6222-22-1 du code du travail": "35",
  "36 Autres changements : changement de ma\u00eetre d apprentissage, de dur\u00e9e de travail hebdomadaire, r\u00e9duction de dur\u00e9e, etc.": "36",
  "37 Modifications de lieu d ex\u00e9cution du contrat": "37",
  "38 Modification du lieu principale de r\u00e9alisation de la formation th\u00e9orique": "38",
};

// Codes type d'employeur - EXACT Python
export const CODES_TYPE_EMPLOYEUR: Record<string, string> = {
  "11 Entreprise inscrite au r\u00e9pertoire des m\u00e9tiers ou au registre des entreprises pour l Alsace-Moselle": "11",
  "12 Entreprise inscrite uniquement au registre du commerce et des soci\u00e9t\u00e9s": "12",
  "13 Entreprises dont les salari\u00e9s rel\u00e8vent de la mutualit\u00e9 sociale agricole": "13",
  "14 Profession lib\u00e9rale": "14",
  "15 Association": "15",
  "16 Autre employeur priv\u00e9": "16",
  "21 Service de l \u00c9tat (administrations centrales et leurs services d\u00e9concentr\u00e9s)": "21",
  "22 Commune": "22",
  "23 D\u00e9partement": "23",
  "24 R\u00e9gion": "24",
  "25 Etablissement public hospitalier": "25",
  "26 Etablissement public local d enseignement": "26",
  "27 Etablissement public administratif de l Etat": "27",
  "28 Etablissement public administratif local (y compris \u00e9tablissement public de coop\u00e9ration intercommunale EPCI)": "28",
  "29 Autre employeur public": "29",
  "30 Etablissement public industriel et commercial": "30",
};

// Codes diplome maitre apprentissage - EXACT Python
export const CODES_DIPLOMES_MAITRE: Record<string, string> = {
  "Aucun dipl\u00f4me": "13",
  "CAP, BEP": "34",
  "Baccalaur\u00e9at": "41",
  "DEUG, BTS, DUT, DEUST": "54",
  "Licence, Licence professionnelle, BUT, Ma\u00eetrise": "64",
  "Master, Dipl\u00f4me d'\u00e9tudes approfondies, Dipl\u00f4me d \u00e9tudes sp\u00e9cialis\u00e9es, Dipl\u00f4me d ing\u00e9nieur": "73",
  "Doctorat, Habilitation \u00e0 diriger des recherches": "80",
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
  "Aucune d\u00e9rogation": "0",
  "Aucune": "0",
  "Age de l'apprenti inf\u00e9rieur \u00e0 16 ans": "11",
  "\u00c2ge inf\u00e9rieur \u00e0 16 ans": "11",
  "\u00c2ge sup\u00e9rieur \u00e0 29 ans: cas sp\u00e9cifiques pr\u00e9vus dans le code du travail": "12",
  "\u00c2ge sup\u00e9rieur \u00e0 29 ans": "12",
  "R\u00e9duction de la dur\u00e9e du contrat ou de la p\u00e9riode d'apprentissage": "21",
  "R\u00e9duction dur\u00e9e": "21",
  "Allongement de la dur\u00e9e du contrat ou de la p\u00e9riode d'apprentissage": "22",
  "Allongement dur\u00e9e": "22",
  "Cumul de d\u00e9rogations": "50",
  "Cumul": "50",
  "Autre d\u00e9rogation": "60",
  "Autre": "60",
  "": "0",
};

// Pays UE pour nationalite - EXACT Python
export const PAYS_UE: string[] = [
  "Allemagne", "Autriche", "Belgique", "Bulgarie", "Chypre", "Croatie",
  "Danemark", "Espagne", "Estonie", "Finlande", "France", "Gr\u00e8ce",
  "Hongrie", "Irlande", "Italie", "Lettonie", "Lituanie", "Luxembourg",
  "Malte", "Pays-Bas", "Pologne", "Portugal", "R\u00e9publique tch\u00e8que",
  "Roumanie", "Slovaquie", "Slov\u00e9nie", "Su\u00e8de", "Union Europ\u00e9enne",
];

// France identifiers
export const PAYS_FRANCE: string[] = ["Fran\u00e7aise"];

// Codes regime social - EXACT Python
export const CODES_REGIME_SOCIAL: Record<string, string> = {
  "MSA": "1",
  "Mutualit\u00e9 sociale agricole": "1",
  "URSSAF": "2",
  "URSAAF": "2",
  "R\u00e9gime g\u00e9n\u00e9ral": "2",
};

// =====================================================
// FORMATIONS MAPPING - EXACT Python
// =====================================================

export const FORMATIONS_MAPPING: Record<string, Record<string, string>> = {
  "BTS MCO A": {
    code_diplome: "54",
    intitule: "BTS Management Commercial Op\u00e9rationnel",
    code_formation: "32031213",
    code_rncp: "RNCP38362",
    date_debut_formation_cfa: "04/09/2025",
    date_fin_epreuves: "30/06/2027",
    heures: "1680",
  },
  "BTS MCO 2": {
    code_diplome: "54",
    intitule: "BTS Management Commercial Op\u00e9rationnel",
    code_formation: "32031213",
    code_rncp: "RNCP38362",
    date_debut_formation_cfa: "04/09/2025",
    date_fin_epreuves: "30/06/2027",
    heures: "1680",
  },
  "BTS NDRC 1": {
    code_diplome: "54",
    intitule: "BTS N\u00e9gociation et Digitalisation de la Relation Client",
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
    intitule: "Titre Professionnel N\u00e9gociateur technico-commercial",
    code_formation: "36T3120",
    code_rncp: "RNCP39063",
    date_debut_formation_cfa: "07/01/2026",
    date_fin_epreuves: "11/07/2026",
    heures: "450",
  },
  "Titre Pro NTC B (rentr\u00e9e decal\u00e9e)": {
    code_diplome: "58",
    intitule: "Titre Professionnel N\u00e9gociateur technico-commercial",
    code_formation: "36T3120",
    code_rncp: "RNCP39063",
    date_debut_formation_cfa: "07/01/2026",
    date_fin_epreuves: "11/07/2026",
    heures: "450",
  },
  "Bachelor RDC": {
    code_diplome: "64",
    intitule: "Bachelor Responsable du d\u00e9veloppement commercial",
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
  "N\u00b0 Adresse CFA": "6",
  "Voie Adresse CFA": "rue des Bateliers",
  "Code postal CFA": "92110",
  "Commune CFA": "CLICHY",
  "Complement adresse CFA": "",
  "D\u00e9nomination CFA": "Formation influence - Rush-School",
  "N\u00b0 UAI du CFA": "0923033X",
  "N\u00b0 SIRET CFA": "91870770400014",
  "CFA entreprise": "Non",
  "CFA est lieu principal": "Oui",
};

// =====================================================
// TYPES EMPLOYEUR PRIVE / PUBLIC - EXACT Python
// =====================================================

export const TYPES_EMPLOYEUR_PRIVE: string[] = [
  "11 Entreprise inscrite au r\u00e9pertoire des m\u00e9tiers ou au registre des entreprises pour l Alsace-Moselle",
  "12 Entreprise inscrite uniquement au registre du commerce et des soci\u00e9t\u00e9s",
  "13 Entreprises dont les salari\u00e9s rel\u00e8vent de la mutualit\u00e9 sociale agricole",
  "14 Profession lib\u00e9rale",
  "15 Association",
  "16 Autre employeur priv\u00e9",
];

export const TYPES_EMPLOYEUR_PUBLIC: string[] = [
  "21 Service de l \u00c9tat (administrations centrales et leurs services d\u00e9concentr\u00e9s)",
  "22 Commune",
  "23 D\u00e9partement",
  "24 R\u00e9gion",
  "25 Etablissement public hospitalier",
  "26 Etablissement public local d enseignement",
  "27 Etablissement public administratif de l Etat",
  "28 Etablissement public administratif local (y compris \u00e9tablissement public de coop\u00e9ration intercommunale EPCI)",
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
  "Zone de texte 8_2": ["entreprise", "Num\u00e9ro SIRET"],
  "Zone de texte 8_3": ["entreprise", "Type demployeur"],
  "Zone de texte 8_14": ["entreprise", "Num\u00e9ro entreprise"],
  "Zone de texte 8_13": ["entreprise", "Voie entreprise"],
  "Zone de texte 8_4": ["entreprise", "Employeur specifique"],
  "Zone de texte 8_8": ["entreprise", "Compl\u00e9ment dadresse entreprise"],
  "Zone de texte 8_7": ["entreprise", "Code APE/NAF"],
  "Zone de texte 8_9": ["entreprise", "Code postal entreprise"],
  "Zone de texte 8_10": ["entreprise", "Ville entreprise"],
  "Zone de texte 8_5": ["entreprise", "Effectif salari\u00e9 de l'entreprise"],
  "Zone de texte 8_11": ["entreprise", "T\u00e9l\u00e9phone entreprise"],
  "Zone de texte 8_12": ["entreprise", "Email entreprise"],
  "Zone de texte 8_6": ["entreprise", "Convention collective"],

  // =====================================================
  // L'APPRENTI(E)
  // =====================================================
  "Zone de texte 8_15": ["candidat", "NOM de naissance"],
  "Zone de texte 8_16": ["candidat", "NOM dusage"],
  "Zone de texte 8_17": ["candidat", "Pr\u00e9nom"],
  "Zone de texte 8_18": ["candidat", "NIR"],
  "Zone de texte 8_19": ["candidat", "Num\u00e9ro de voie"],
  "Zone de texte 8_20": ["candidat", "Nom de la rue"],
  "Zone de texte 8_23": ["candidat", "Ville"],
  "Zone de texte 8_21": ["candidat", "Complement adresse"],
  "Zone de texte 8_22": ["candidat", "Code postal"],
  "Zone de texte 8_27": ["candidat", "Commune de naissance"],
  "Zone de texte 8_26": ["candidat", "D\u00e9partement"],
  "Zone de texte 8_33": ["candidat", "Nationalit\u00e9"],
  "Zone de texte 8_34": ["candidat", "R\u00e9gime social"],
  "Zone de texte 8_24": ["candidat", "T\u00e9l\u00e9phone"],
  "Zone de texte 8_25": ["candidat", "E-mail"],
  "Zone de texte 8_28": ["candidat", "Situation avant le contrat"],
  "Zone de texte 8_29": ["candidat", "Dernier dipl\u00f4me ou titre pr\u00e9par\u00e9"],
  "Zone de texte 8_36": ["candidat", "Voie repr\u00e9sentant l\u00e9gal"],
  "Zone de texte 8_30": ["candidat", "Derni\u00e8re classe / ann\u00e9e suivie"],
  "Zone de texte 8_32": ["candidat", "Dernier dipl\u00f4me ou titre pr\u00e9par\u00e9"],
  "Zone de texte 8_31": ["candidat", "Intitul\u00e9 pr\u00e9cis du dernier dipl\u00f4me ou titre pr\u00e9par\u00e9"],
  "Zone de texte 8_37": ["candidat", "Num\u00e9ro de voie repr\u00e9sentant l\u00e9gal"],
  "Zone de texte 8_35": ["candidat", "Nom du representant legal"],
  "Zone de texte 8_38": ["candidat", "Compl\u00e9ment adresse repr\u00e9sentant l\u00e9gal"],
  "Zone de texte 8_39": ["candidat", "Code postal repr\u00e9sentant l\u00e9gal"],
  "Zone de texte 8_40": ["candidat", "Commune repr\u00e9sentant l\u00e9gal"],
  "Zone de texte 8_41": ["candidat", "Courriel repr\u00e9sentant l\u00e9gal"],

  // =====================================================
  // LE MA\u00ceTRE D'APPRENTISSAGE N\u00b01
  // =====================================================
  "Zone de texte 8_42": ["entreprise", "Nom Ma\u00eetre apprentissage"],
  "Zone de texte 8_43": ["entreprise", "Pr\u00e9nom Ma\u00eetre apprentissage"],
  "Zone de texte 8_44": ["entreprise", "Email Ma\u00eetre apprentissage"],
  "Zone de texte 8_45": ["entreprise", "Fonction Ma\u00eetre apprentissage"],
  "Zone de texte 8_50": ["entreprise", "Dipl\u00f4me Ma\u00eetre apprentissage"],
  "Zone de texte 8_52": ["entreprise", "Dipl\u00f4me Ma\u00eetre apprentissage"],

  // =====================================================
  // LE MA\u00ceTRE D'APPRENTISSAGE N\u00b02 (optionnel)
  // =====================================================
  "Zone de texte 8_46": ["entreprise", "Nom Ma\u00eetre apprentissage 2"],
  "Zone de texte 8_47": ["entreprise", "Pr\u00e9nom Ma\u00eetre apprentissage 2"],
  "Zone de texte 8_48": ["entreprise", "Email Ma\u00eetre apprentissage 2"],
  "Zone de texte 8_49": ["entreprise", "Fonction Ma\u00eetre apprentissage 2"],
  "Zone de texte 8_51": ["entreprise", "Dipl\u00f4me Ma\u00eetre apprentissage 2"],
  "Zone de texte 8_53": ["entreprise", "Dipl\u00f4me Ma\u00eetre apprentissage 2"],

  // =====================================================
  // LE CONTRAT
  // =====================================================
  "Zone de texte 8_71": ["entreprise", "Type de contrat"],
  "Zone de texte 8_70": ["entreprise", "Type de d\u00e9rogation"],
  "Zone de texte 8_55": ["entreprise", "Num\u00e9ro DECA de ancien contrat"],
  "Zone de texte 8_68": ["entreprise", "Dur\u00e9e hebdomadaire"],

  // =====================================================
  // R\u00c9MUN\u00c9RATION
  // =====================================================
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
  "Zone de texte 8_99": ["formation", "D\u00e9nomination CFA"],
  "Zone de texte 8_73": ["formation", "N\u00b0 UAI du CFA"],
  "Zone de texte 8_74": ["formation", "N\u00b0 SIRET CFA"],
  "Zone de texte 8_77": ["candidat", "Formation"],
  "Zone de texte 8_100": ["candidat", "Formation choisie"],
  "Zone de texte 8_75": ["candidat", "Code dipl\u00f4me"],
  "Zone de texte 8_76": ["candidat", "Code RNCP"],
  "Zone de texte 8_79": ["formation", "N\u00b0 Adresse CFA"],
  "Zone de texte 8_80": ["formation", "Voie Adresse CFA"],
  "Zone de texte 8_82": ["formation", "Code postal CFA"],
  "Zone de texte 8_78": ["formation", "Commune CFA"],
  "Zone de texte 8_81": ["formation", "Complement adresse CFA"],
  "Zone de texte 21_80": ["candidat", "Nombre heure formation"],
  "Zone de texte 8_102": ["entreprise", "Heures formation \u00e0 distance"],
  "Zone de texte 8_101": ["formation", "D\u00e9nomination du CFA responsable"],
  "Zone de texte 8_84": ["formation", "Num\u00e9ro UAI du CFA"],
  "Zone de texte 8_83": ["formation", "Num\u00e9ro SIRET du CFA"],
  "Zone de texte 8_86": ["formation", "Adresse du CFA"],
  "Zone de texte 8_88": ["formation", "Compl\u00e9ment adresse CFA"],
  "Zone de texte 8_89": ["formation", "Code postal CFA"],
  "Zone de texte 8_85": ["formation", "Commune CFA"],
};

// =====================================================
// CASES \u00c0 COCHER - EXACT Python
// Note: "Case \u00e0 cocher" uses real accent \u00e0 (decoded from #C3#A0 in PDF)
// =====================================================

export const CERFA_CHECKBOXES: Record<string, [string, string, string]> = {
  "Case \u00e0 cocher 1": ["entreprise", "Secteur", "Priv\u00e9"],
  "Case \u00e0 cocher 2": ["entreprise", "Secteur", "Public"],
  "Case \u00e0 cocher 3": ["candidat", "Sexe", "Masculin"],
  "Case \u00e0 cocher 4": ["candidat", "Sexe", "F\u00e9minin"],
  "Case \u00e0 cocher 5": ["candidat", "D\u00e9clare \u00eatre inscrits sur la liste des sportifs de haut niveau", "Oui"],
  "Case \u00e0 cocher 5_2": ["candidat", "D\u00e9clare \u00eatre inscrits sur la liste des sportifs de haut niveau", "Non"],
  "Case \u00e0 cocher 5_3": ["candidat", "D\u00e9clare b\u00e9n\u00e9ficier de la reconnaissance travailleur handicap\u00e9", "Oui"],
  "Case \u00e0 cocher 5_4": ["candidat", "D\u00e9clare b\u00e9n\u00e9ficier de la reconnaissance travailleur handicap\u00e9", "Non"],
  "Case \u00e0 cocher 5_5": ["candidat", "\u00c9quivalence jeunes RQTH", "Oui"],
  "Case \u00e0 cocher 5_6": ["candidat", "\u00c9quivalence jeunes RQTH", "Non"],
  "Case \u00e0 cocher 5_7": ["candidat", "Extension BOE", "Oui"],
  "Case \u00e0 cocher 5_8": ["candidat", "Extension BOE", "Non"],
  "Case \u00e0 cocher 5_9": ["candidat", "D\u00e9clare avoir un projet de cr\u00e9ation ou de reprise dentreprise", "Oui"],
  "Case \u00e0 cocher 5_10": ["candidat", "D\u00e9clare avoir un projet de cr\u00e9ation ou de reprise dentreprise", "Non"],
  "Case \u00e0 cocher 5_11": ["formation", "CFA entreprise", "Oui"],
  "Case \u00e0 cocher 5_12": ["formation", "CFA entreprise", "Non"],
  "Case \u00e0 cocher 7": ["formation", "CFA est lieu principal", "Oui"],
  "Case \u00e0 cocher 8": ["entreprise", "Pi\u00e8ces justificatives", "Oui"],
  "Case \u00e0 cocher 5_13": ["entreprise", "Travail sur machines dangereuses ou exposition \u00e0 des risques particuliers", "Oui"],
  "Case \u00e0 cocher 5_14": ["entreprise", "Travail sur machines dangereuses ou exposition \u00e0 des risques particuliers", "Non"],
};

// =====================================================
// DATES SP\u00c9CIALES (jour/mois/ann\u00e9e s\u00e9par\u00e9s) - EXACT Python
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
    source: ["entreprise", "Date de naissance Ma\u00eetre apprentissage"],
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
    source: ["entreprise", "Date de d\u00e9but ex\u00e9cution"],
    jour: "Zone de texte 21_19",
    mois: "Zone de texte 21_20",
    annee: "Zone de texte 21_21",
  },
  "date_debut_formation_pratique": {
    source: ["entreprise", "Date de d\u00e9but de formation pratique chez employeur"],
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
    source: ["entreprise", "Date de d\u00e9but ex\u00e9cution"],
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
  "date_debut_remuneration_1_2": {
    source: ["entreprise", "date_debut_2periode_1er_annee"],
    jour: "Zone de texte 21_37",
    mois: "Zone de texte 21_38",
    annee: "Zone de texte 21_39",
  },
  "date_fin_remuneration_1_2": {
    source: ["entreprise", "date_fin_2periode_1er_annee"],
    jour: "Zone de texte 21_40",
    mois: "Zone de texte 21_41",
    annee: "Zone de texte 21_42",
  },
  "date_debut_remuneration_2_1": {
    source: ["entreprise", "date_debut_1periode_2eme_annee"],
    jour: "Zone de texte 21_43",
    mois: "Zone de texte 21_44",
    annee: "Zone de texte 21_45",
  },
  "date_fin_remuneration_2_1": {
    source: ["entreprise", "date_fin_1periode_2eme_annee"],
    jour: "Zone de texte 21_46",
    mois: "Zone de texte 21_47",
    annee: "Zone de texte 21_48",
  },
  "date_debut_remuneration_2_2": {
    source: ["entreprise", "date_debut_2periode_2eme_annee"],
    jour: "Zone de texte 21_49",
    mois: "Zone de texte 21_50",
    annee: "Zone de texte 21_51",
  },
  "date_fin_remuneration_2_2": {
    source: ["entreprise", "date_fin_2periode_2eme_annee"],
    jour: "Zone de texte 21_52",
    mois: "Zone de texte 21_53",
    annee: "Zone de texte 21_54",
  },
  "date_debut_remuneration_3_1": {
    source: ["entreprise", "date_debut_1periode_3eme_annee"],
    jour: "Zone de texte 21_55",
    mois: "Zone de texte 21_56",
    annee: "Zone de texte 21_57",
  },
  "date_fin_remuneration_3_1": {
    source: ["entreprise", "date_fin_1periode_3eme_annee"],
    jour: "Zone de texte 21_58",
    mois: "Zone de texte 21_59",
    annee: "Zone de texte 21_60",
  },
  "date_debut_remuneration_3_2": {
    source: ["entreprise", "date_debut_2periode_3eme_annee"],
    jour: "Zone de texte 21_61",
    mois: "Zone de texte 21_62",
    annee: "Zone de texte 21_63",
  },
  "date_fin_remuneration_3_2": {
    source: ["entreprise", "date_fin_2periode_3eme_annee"],
    jour: "Zone de texte 21_64",
    mois: "Zone de texte 21_65",
    annee: "Zone de texte 21_66",
  },
  "date_debut_remuneration_4": {
    source: ["entreprise", "date_debut_1periode_4eme_annee"],
    jour: "Zone de texte 21_67",
    mois: "Zone de texte 21_68",
    annee: "Zone de texte 21_69",
  },
  "date_fin_remuneration_4": {
    source: ["entreprise", "date_fin_1periode_4eme_annee"],
    jour: "Zone de texte 21_70",
    mois: "Zone de texte 21_71",
    annee: "Zone de texte 21_72",
  },
  "date_debut_formation_cfa": {
    source: ["entreprise", "Date d\u00e9but formation"],
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
