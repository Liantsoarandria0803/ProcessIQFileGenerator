import { CerfaGeneratorService } from '../services/cerfaGeneratorService';

const service = new CerfaGeneratorService() as any;

const candidatData = {
  'Dernier diplôme ou titre préparé': '69 Autre diplôme ou titre de niveau bac +3 ou 4',
  'BAC': '69',
  'Intitulé précis du dernier diplôme ou titre préparé': '69'
};

const entrepriseData = {
  'Type demployeur': "11 Entreprise inscrite au répertoire des métiers ou au registre des entreprises pour l'Alsace Moselle"
};

console.log('8_29', service.getFieldValue('candidat', 'Dernier diplôme ou titre préparé', candidatData, entrepriseData));
console.log('8_32', service.getFieldValue('candidat', 'BAC', candidatData, entrepriseData));
console.log('8_4', service.getFieldValue('entreprise', 'Type demployeur', candidatData, entrepriseData));
