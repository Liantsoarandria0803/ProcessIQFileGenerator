/**
 * Mapping des champs PDF pour la Fiche de Renseignements
 */

export const PDF_MAPPING: Record<string, [string, string]> = {
  // Informations de l'étudiant
  "Nom 1": ["candidat", "NOM de naissance"],
  "Prénom 1": ["candidat", "Prénom"],
  "Date de naissance 1": ["candidat", "Date de naissance"],
  "Lieu de naissance 1": ["candidat", "Commune de naissance"],
  "Nationalité 1": ["candidat", "Nationalité"],
  "Adresse postale": ["candidat", "Adresse"],
  "E-mail 1": ["candidat", "E-mail"],
  "Téléphone 1": ["candidat", "Téléphone"],
  "Formation": ["candidat", "Formation choisie"],
  "Rentrée": ["candidat", "Niveau d'études visé"],
  
  // Représentant légal
  "Responsable Nom": ["candidat", "Nom Parent 1"],
  "Responsable prénom": ["candidat", "Prénom Parent 1"],
  "Responsable Numéro de téléphone": ["candidat", "Téléphone Parent 1"],
  "Responsable E-Mail": ["candidat", "Email Parent 1"],
  
  // Informations entreprise
  "Entreprise Nom": ["entreprise", "Raison sociale"],
  "Entreprise siret": ["entreprise", "Numéro SIRET"],
  "Entreprise Adresse": ["entreprise", "Adresse entreprise (complète)"],
  "Entreprise Numéro de téléphone": ["entreprise", "Téléphone entreprise"],
  "Entreprise E-Mail": ["entreprise", "Email entreprise"],
  "Entreprise Opco": ["entreprise", "Nom OPCO"],
  
  // Tuteur
  "Tuteur Nom": ["entreprise", "Nom Maître apprentissage"],
  "Tuteur prénom": ["entreprise", "Prénom Maître apprentissage"],
  "Tuteur Numéro de téléphone": ["entreprise", "Téléphone du Maître apprentissage"],
  "Tuteur E-Mail": ["entreprise", "Mail Maître apprentissage"],
  
  // Informations contrat
  "Date début contrat": ["entreprise", "Date de début exécution"],
  "Date fin contrat": ["entreprise", "Fin du contrat apprentissage"],
  "Durée Contrat": ["entreprise", "Durée totale du contrat"],
  
  // Informations RH
  "RH nom": ["entreprise", "Nom responsable RH"],
  "RH prénom": ["entreprise", "Prénom responsable RH"],
  "RH Email": ["entreprise", "E-mail responsable RH"],
  "RH Numéro de téléphone": ["entreprise", "Téléphone responsable RH"],
};
