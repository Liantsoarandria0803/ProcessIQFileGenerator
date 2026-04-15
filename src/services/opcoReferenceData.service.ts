import { OpcoFinancementModel } from '../models/opco-financement.model';
import { OpcoNafMappingModel } from '../models/opco-naf-mapping.model';

const nafMappings = [
  { codeNaf: '6419Z', libelleActivite: 'Banque et services financiers', opcoCode: 'ATLAS', opcoNom: 'ATLAS - Services financiers et du conseil', opcoPortail: 'https://www.atlas-competences.fr', isAmbiguous: false },
  { codeNaf: '8010Z', libelleActivite: 'Securite privee', opcoCode: 'AKTO', opcoNom: 'AKTO', opcoPortail: 'https://www.akto.fr', isAmbiguous: false },
  { codeNaf: '4711F', libelleActivite: 'Hypermarches et supermarches', opcoCode: 'OPCO_COMMERCE', opcoNom: 'OPCO Commerce', opcoPortail: 'https://www.lopcommerce.com', isAmbiguous: false },
  { codeNaf: '4511Z', libelleActivite: 'Commerce automobile', opcoCode: 'OPCO_MOBILITES', opcoNom: 'OPCO Mobilites', opcoPortail: 'https://www.opcomobilites.fr', isAmbiguous: false },
  { codeNaf: '5610A', libelleActivite: 'Restauration rapide', opcoCode: 'AKTO', opcoNom: 'AKTO', opcoPortail: 'https://www.akto.fr', isAmbiguous: false },
  { codeNaf: '8542Z', libelleActivite: 'Enseignement superieur', opcoCode: 'OPCO_EP', opcoNom: 'OPCO EP', opcoPortail: 'https://www.opcoep.fr', isAmbiguous: false },
  { codeNaf: '6512Z', libelleActivite: 'Assurance', opcoCode: 'ATLAS', opcoNom: 'ATLAS - Services financiers et du conseil', opcoPortail: 'https://www.atlas-competences.fr', isAmbiguous: false },
];

const financements = [
  { opcoCode: 'ATLAS', diplomeRncp: 'RNCP38152', diplomeLibelle: 'BTS MCO', montantAnnuel: 6500, anneeValidite: 2025 },
  { opcoCode: 'ATLAS', diplomeRncp: 'BTS_NDRC', diplomeLibelle: 'BTS NDRC', montantAnnuel: 6500, anneeValidite: 2025 },
  { opcoCode: 'ATLAS', diplomeRncp: 'TP_NTC', diplomeLibelle: 'TP NTC', montantAnnuel: 5800, anneeValidite: 2025 },
  { opcoCode: 'ATLAS', diplomeRncp: 'BACHELOR_COMMERCE', diplomeLibelle: 'Bachelor Commerce', montantAnnuel: 9200, anneeValidite: 2025 },
  { opcoCode: 'AKTO', diplomeRncp: 'TP_NTC', diplomeLibelle: 'TP NTC', montantAnnuel: 5200, anneeValidite: 2025 },
  { opcoCode: 'OPCO_COMMERCE', diplomeRncp: 'RNCP38152', diplomeLibelle: 'BTS MCO', montantAnnuel: 5800, anneeValidite: 2025 },
  { opcoCode: 'OPCO_MOBILITES', diplomeRncp: 'BACHELOR_COMMERCE', diplomeLibelle: 'Bachelor Commerce', montantAnnuel: 8000, anneeValidite: 2025 },
];

export const ensureOpcoReferenceData = async (): Promise<void> => {
  for (const mapping of nafMappings) {
    await OpcoNafMappingModel.updateOne(
      { codeNaf: mapping.codeNaf, opcoCode: mapping.opcoCode },
      { $set: mapping },
      { upsert: true }
    );
  }

  for (const financement of financements) {
    await OpcoFinancementModel.updateOne(
      {
        opcoCode: financement.opcoCode,
        diplomeRncp: financement.diplomeRncp,
        anneeValidite: financement.anneeValidite,
      },
      { $set: financement },
      { upsert: true }
    );
  }
};
