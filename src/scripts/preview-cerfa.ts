import fs from 'fs';
import path from 'path';
import { CerfaGeneratorService } from '../services/cerfaGeneratorService';

async function main() {
  const service = new CerfaGeneratorService();

  const candidatData: Record<string, any> = {
    'NOM de naissance': 'TEST',
    'Prénom': 'Preview',
    'Date de naissance': '2009-01-07',
    'Sexe': 'F',
    'Nationalité': 'Étranger',
    'Département': '971',
    'Commune de naissance': 'Fianarantsoa',
    'Adresse lieu dexécution du contrat': '12, Rue des Tests, 75012, Paris',
    'Code postal ': '75012',
    'ville': 'Paris',
    'Téléphone': '0336123456',
    'E-mail': 'test@example.com',
    'NIR': '349283948359202',
    'Situation avant le contrat': '1 Scolaire',
    'Régime social': 'URSSAF',
    'Dernier diplôme ou titre préparé': '69 Autre diplôme ou titre de niveau bac +3 ou 4',
    'Dernière classe / année suivie': 'Diplôme obtenu',
    'Intitulé précis du dernier diplôme ou titre préparé': '69',
    'BAC': '69',
    'Déclare être inscrits sur la liste des sportifs de haut niveau': 'Non',
    'Déclare bénéficier de la reconnaissance travailleur handicapé': 'Non',
    'Déclare avoir un projet de création ou de reprise dentreprise': 'Non',
    'Formation': 'Bachelor RDC'
  };

  const entrepriseData: Record<string, any> = {
    'Raison sociale': 'Entreprise Test',
    'Numéro SIRET': '12345678901234',
    'Numéro entreprise': '10',
    'Voie entreprise': 'Rue Exemple',
    'Complément dadresse entreprise': 'Bat A',
    'Code postal entreprise': '75010',
    'Ville entreprise': 'Paris',
    'Type demployeur': "11 Entreprise inscrite au répertoire des métiers ou au registre des entreprises pour l'Alsace Moselle",
    'Employeur specifique': '0',
    "Effectif salarié de l'entreprise": '11',
    'Code APE/NAF': '6201Z',
    'Convention collective': '1486',
    'Caisse de retraite': 'AGIRC-ARRCO',
    'Nom OPCO': 'AKTO',
    'Nom Maître apprentissage': 'Martin',
    'Prénom Maître apprentissage': 'Claire',
    'Date de naissance Maître apprentissage': '1985-06-12',
    'Fonction Maître apprentissage': 'Responsable commercial',
    'Diplôme Maître apprentissage': '6',
    'Année experience pro Maître apprentissage': '5',
    'Téléphone Maître apprentissage': '0612345678',
    'Email Maître apprentissage': 'claire.martin@example.com',
    'Type de contrat': "11 Contrat d'apprentissage",
    'Type de dérogation': '0',
    'Date de conclusion': '2026-04-02',
    'Date de début de formation pratique chez employeur': '2026-04-03',
    'Date de début exécution': '2026-04-03',
    'Fin du contrat apprentissage': '2027-07-17',
    'Durée hebdomadaire': '35h',
    'Poste occupé': 'Alternant commercial',
    'Lieu dexécution du contrat (si différent du siège)': '',
    'Formation de lalternant(e) (pour les missions)': 'Prospection et développement commercial',
    'Salaire brut mensuel 1': '1800'
  };

  const result = await service.generateCerfa(candidatData, entrepriseData);
  if (!result.success || !result.pdfBuffer) {
    throw new Error(result.error || 'CERFA generation failed');
  }

  const outDir = path.resolve(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'cerfa-preview.pdf');
  fs.writeFileSync(outPath, result.pdfBuffer);

  console.log(outPath);
  console.log(`fields=${result.fieldsCount} checkboxes=${result.checkboxesCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
