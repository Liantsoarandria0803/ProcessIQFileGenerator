/**
 * Tests unitaires pour les services OPCO critiques
 * 
 * À exécuter avec : npm test -- opco.service.test.ts
 * Framework: Jest
 */

import { OpcoAuthService } from '../services/opcoAuth.service';
import { CFADockService } from '../services/cfadock.service';
import { OpcoValidationService } from '../services/opcoValidation.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpcoAuthService', () => {
  let authService: OpcoAuthService;

  beforeEach(() => {
    authService = new OpcoAuthService();
    authService.clearAllCache();
  });

  describe('getAccessToken', () => {
    test('🟢 Devrait retourner un Bearer Token valide', async () => {
      const config = {
        authServerUrl: 'https://auth.opco-commerce.fr',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        tokenPath: '/oauth/token',
        timeoutMs: 5000,
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: {
            access_token: 'test_token_123',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        }),
      } as any);

      const token = await authService.getAccessToken(config);
      expect(token).toBe('test_token_123');
    });

    test('🟢 Devrait cacher le token et le réutiliser', async () => {
      const config = {
        authServerUrl: 'https://auth.opco-commerce.fr',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      };

      let callCount = 0;
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            data: { access_token: `token_${callCount}`, expires_in: 3600 },
          });
        }),
      } as any);

      const token1 = await authService.getAccessToken(config);
      const token2 = await authService.getAccessToken(config);

      // Les deux tokens doivent être identiques (cache)
      expect(token1).toBe(token2);
      expect(callCount).toBe(1); // Seulement 1 appel OAuth
    });

    test('🔴 Devrait rejeter si access_token manquant', async () => {
      const config = {
        authServerUrl: 'https://auth.opco-commerce.fr',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: { expires_in: 3600 }, // access_token manquant
        }),
      } as any);

      await expect(authService.getAccessToken(config)).rejects.toThrow(
        'access_token manquant'
      );
    });

    test('🔴 Devrait lever erreur si connexion OPCO échoue', async () => {
      const config = {
        authServerUrl: 'https://auth.opco-commerce.fr',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      await expect(authService.getAccessToken(config)).rejects.toThrow(
        'OAuth échoué'
      );
    });
  });

  describe('invalidateCache', () => {
    test('🟢 Devrait invalider le cache d\'un client', async () => {
      const config = {
        authServerUrl: 'https://auth.opco-commerce.fr',
        clientId: 'test-client',
        clientSecret: 'test-secret',
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: { access_token: 'token', expires_in: 3600 },
        }),
      } as any);

      await authService.getAccessToken(config);
      authService.invalidateCache('test-client');

      const info = authService.getDebugInfo();
      expect(info.cachedTokens).toBe(0);
    });
  });
});

describe('CFADockService', () => {
  let cfadockService: CFADockService;

  beforeEach(() => {
    cfadockService = new CFADockService();
    cfadockService.clearCache();
  });

  describe('searchOpco', () => {
    test('🟢 Devrait identifier OPCO par SIRET', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              siret: '12345678901234',
              siren: '123456789',
              opco_code: 'OPCO_COMMERCE',
              opco_name: 'OPCO Commerce',
              opco_portal: 'https://www.lopcommerce.com',
              raison_sociale: 'E-Commerce Inc',
            },
          ],
        },
      };

      jest.spyOn(cfadockService['client'], 'get').mockResolvedValue(mockResponse);

      const result = await cfadockService.searchOpco('12345678901234');
      expect(result).toEqual({
        siret: '12345678901234',
        siren: '123456789',
        opcoCode: 'OPCO_COMMERCE',
        opcoName: 'OPCO Commerce',
        opcoPortal: 'https://www.lopcommerce.com',
        raison_sociale: 'E-Commerce Inc',
      });
    });

    test('🟢 Devrait cacher le résultat 7 jours', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              siret: '12345678901234',
              opco_code: 'OPCO_COMMERCE',
              opco_name: 'OPCO Commerce',
            },
          ],
        },
      };

      let callCount = 0;
      jest
        .spyOn(cfadockService['client'], 'get')
        .mockImplementation(() => {
          callCount++;
          return Promise.resolve(mockResponse);
        });

      await cfadockService.searchOpco('12345678901234');
      await cfadockService.searchOpco('12345678901234'); // 2e appel

      expect(callCount).toBe(1); // Cache utilisé
    });

    test('🔴 Devrait retourner null si OPCO non trouvé', async () => {
      jest
        .spyOn(cfadockService['client'], 'get')
        .mockResolvedValue({ data: { results: [] } });

      const result = await cfadockService.searchOpco('99999999999999');
      expect(result).toBeNull();
    });

    test('🔴 Devrait retourner null en cas d\'erreur API', async () => {
      jest
        .spyOn(cfadockService['client'], 'get')
        .mockRejectedValue(new Error('API Error'));

      const result = await cfadockService.searchOpco('12345678901234');
      expect(result).toBeNull();
    });
  });

  describe('searchBySiret', () => {
    test('🟢 Devrait accepter SIRET valide (14 chiffres)', async () => {
      jest
        .spyOn(cfadockService['client'], 'get')
        .mockResolvedValue({
          data: {
            results: [
              {
                siret: '12345678901234',
                opco_code: 'AKTO',
                opco_name: 'AKTO',
              },
            ],
          },
        });

      const result = await cfadockService.searchBySiret('12345678901234');
      expect(result).not.toBeNull();
      expect(result?.opcoCode).toBe('AKTO');
    });

    test('🔴 Devrait rejeter SIRET invalide', async () => {
      const result = await cfadockService.searchBySiret('123');
      expect(result).toBeNull();
    });
  });
});

describe('OpcoValidationService', () => {
  let validationService: OpcoValidationService;

  beforeEach(() => {
    validationService = new OpcoValidationService();
  });

  describe('validateBeforeSubmission', () => {
    test('🟢 Devrait passer validation complète', async () => {
      const payload = {
        apprenti: {
          nom_complet: 'Jean Dupont',
          date_de_naissance: '2006-05-15',
          nir: '1234567890123',
        },
        employeur: {
          siret: '12345678901234',
          raison_sociale: 'E-Commerce Inc',
        },
        contrat: {
          id: 'contract-123',
          date_debut: '2025-09-01',
          intitule_diplome: 'BTS MCO',
          code_rncp: 'RNCP12345',
        },
        salaire_mensuel: 2000,
        maitre_apprentissage: {
          nom: 'Pierre Martin',
        },
      };

      // Mock mandat signé
      jest.spyOn(validationService as any, 'checkMandateSigned').mockResolvedValue(null);

      const result = await validationService.validateBeforeSubmission('submission-id', payload);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('🔴 Devrait détecter mandat manquant', async () => {
      jest
        .spyOn(validationService as any, 'checkMandateSigned')
        .mockResolvedValue({
          code: 'MANDATE_MISSING',
          severity: 'error',
          message: 'Mandat manquant',
        });

      const result = await validationService.validateBeforeSubmission('submission-id', {});
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MANDATE_MISSING')).toBe(true);
    });

    test('🔴 Devrait détecter apprenti trop jeune', async () => {
      const payload = {
        apprenti: {
          nom_complet: 'Jean Dupont',
          date_de_naissance: '2010-05-15', // 14 ans
          nir: '1234567890123',
        },
        employeur: {
          siret: '12345678901234',
          raison_sociale: 'Test Inc',
        },
        contrat: {
          id: 'contract-123',
          date_debut: '2025-09-01',
          intitule_diplome: 'BTS',
          code_rncp: 'RNCP12345',
        },
        salaire_mensuel: 2000,
        maitre_apprentissage: { nom: 'Test' },
      };

      jest.spyOn(validationService as any, 'checkMandateSigned').mockResolvedValue(null);

      const result = await validationService.validateBeforeSubmission('submission-id', payload);
      const ageError = result.errors.find((e) => e.code === 'TOO_YOUNG');
      expect(ageError).toBeDefined();
      expect(ageError?.severity).toBe('error');
    });

    test('🔴 Devrait détecter NIR manquant', async () => {
      const payload = {
        apprenti: {
          nom_complet: 'Jean Dupont',
          date_de_naissance: '2006-05-15',
          // NIR manquant
        },
        employeur: {
          siret: '12345678901234',
          raison_sociale: 'Test Inc',
        },
        contrat: {
          id: 'contract-123',
          date_debut: '2025-09-01',
          intitule_diplome: 'BTS',
          code_rncp: 'RNCP12345',
        },
        salaire_mensuel: 2000,
        maitre_apprentissage: { nom: 'Test' },
      };

      jest.spyOn(validationService as any, 'checkMandateSigned').mockResolvedValue(null);

      const result = await validationService.validateBeforeSubmission('submission-id', payload);
      const nirError = result.errors.find((e) => e.code === 'MISSING_NIR');
      expect(nirError).toBeDefined();
    });

    test('🔴 Devrait détecter salaire < SMIC', async () => {
      const payload = {
        apprenti: {
          nom_complet: 'Jean Dupont',
          date_de_naissance: '2006-05-15',
          nir: '1234567890123',
        },
        employeur: {
          siret: '12345678901234',
          raison_sociale: 'Test Inc',
        },
        contrat: {
          id: 'contract-123',
          date_debut: '2025-09-01',
          intitule_diplome: 'BTS',
          code_rncp: 'RNCP12345',
        },
        salaire_mensuel: 1000, // < SMIC ~1800
        maitre_apprentissage: { nom: 'Test' },
      };

      jest.spyOn(validationService as any, 'checkMandateSigned').mockResolvedValue(null);

      const result = await validationService.validateBeforeSubmission('submission-id', payload);
      const salaryError = result.errors.find((e) => e.code === 'SALARY_TOO_LOW');
      expect(salaryError).toBeDefined();
    });
  });

  describe('formatErrorsForUI', () => {
    test('🟢 Devrait séparer erreurs et avertissements', () => {
      const errors = [
        {
          code: 'ERROR_1',
          severity: 'error' as const,
          message: 'Erreur bloquante',
        },
        {
          code: 'WARNING_1',
          severity: 'warning' as const,
          message: 'Avertissement info',
        },
      ];

      const formatted = OpcoValidationService.formatErrorsForUI(errors);
      expect(formatted.blocking).toHaveLength(1);
      expect(formatted.warnings).toHaveLength(1);
      expect(formatted.blocking[0].code).toBe('ERROR_1');
      expect(formatted.warnings[0].code).toBe('WARNING_1');
    });
  });
});
