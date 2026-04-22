import axios from 'axios';
import { Integration } from '../models/integration.model';
import { decryptSecret } from './integrationSecrets.service';

const buildAddress = (adresse: Record<string, any> = {}): string => {
  return [
    adresse.numeroVoieEtablissement,
    adresse.typeVoieEtablissement,
    adresse.libelleVoieEtablissement,
    adresse.codePostalEtablissement,
    adresse.libelleCommuneEtablissement,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
};

export const lookupCompanyBySiret = async (siret: string) => {
  const integration = await Integration.findOne({ type: 'api_insee_siren' }).sort({ updatedAt: -1 });

  if (!integration || !integration.encryptedApiKey || !integration.iv || !integration.authTag) {
    const error = new Error('Aucune integration API INSEE SIREN disponible');
    (error as any).statusCode = 404;
    throw error;
  }

  const apiKey = decryptSecret(integration.encryptedApiKey, integration.iv, integration.authTag);
  const apiSecret =
    integration.encryptedApiSecret && integration.secretIv && integration.secretAuthTag
      ? decryptSecret(integration.encryptedApiSecret, integration.secretIv, integration.secretAuthTag)
      : '';

  try {
    const response = await axios.get(`https://api.insee.fr/api-sirene/3.11/siret/${encodeURIComponent(siret)}`, {
      headers: {
        Accept: 'application/json',
        'X-Client-Id': apiKey,
        ...(apiSecret ? { 'X-Client-Secret': apiSecret } : {}),
      },
      timeout: 15000,
    });

    const etablissement = response.data?.etablissement || {};
    const uniteLegale = etablissement.uniteLegale || {};
    const adresse = etablissement.adresseEtablissement || {};

    return {
      integrationName: integration.name,
      siret,
      raisonSociale:
        uniteLegale.denominationUniteLegale ||
        uniteLegale.nomUniteLegale ||
        etablissement.enseigne1Etablissement ||
        'Non renseignee',
      adresse: buildAddress(adresse) || 'Adresse non renseignee',
      activitePrincipale:
        uniteLegale.activitePrincipaleUniteLegale || etablissement.activitePrincipaleRegistreMetiersEtablissement || 'Non renseignee',
      dateCreation: uniteLegale.dateCreationUniteLegale || 'Non renseignee',
      raw: response.data,
    };
  } catch (error: any) {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      const authError = new Error('Cle API INSEE invalide');
      (authError as any).statusCode = 401;
      throw authError;
    }

    if (status === 404) {
      const notFoundError = new Error('SIRET introuvable');
      (notFoundError as any).statusCode = 404;
      throw notFoundError;
    }

    const requestError = new Error(error?.response?.data?.message || error?.message || 'Erreur lors de la recherche SIRET');
    (requestError as any).statusCode = status || 500;
    throw requestError;
  }
};
