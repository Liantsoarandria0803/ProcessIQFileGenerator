/**
 * Service CFADock - Identification OPCO à partir du SIRET
 * 
 * API: https://www.cfadock.fr/Home/ApiDescription
 * Type: REST (gratuit, non authentifié)
 * 
 * Permet d'identifier automatiquement l'OPCO de rattachement d'une entreprise
 * via son SIRET, SIREN ou IDCC.
 * 
 * Implémentation avec cache local (Redis ou in-memory) pour éviter
 * les appels répétés et respecter les rate limits.
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

type GenericObject = Record<string, any>;

interface CFADockOpcoInfo {
  siret: string;
  siren: string;
  opcoCode: string;
  opcoName: string;
  opcoPortal?: string;
  raison_sociale: string;
}

interface CFADockCacheEntry {
  data: CFADockOpcoInfo;
  cachedAt: number; // ms
  ttl: number; // ms
}

/**
 * Service pour identifier l'OPCO d'une entreprise via CFADock
 * Cache les résultats pour respecter les limites et la perf
 */
export class CFADockService {
  private readonly baseUrl = 'https://www.cfadock.fr/api';
  private readonly searchPath = '/search';
  private readonly timeoutMs = 10_000;
  private client: AxiosInstance;
  private cache = new Map<string, CFADockCacheEntry>();
  private readonly cacheTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 jours

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProcessIQ/1.0 (EduIQ OPCO Integration)',
      },
    });
  }

  /**
   * Recherche l'OPCO d'une entreprise par SIRET, SIREN ou IDCC
   * 
   * @param searchTerm SIRET (14 chiffres), SIREN (9 chiffres) ou IDCC
   * @returns Info OPCO identifiée ou null si non trouvé
   */
  async searchOpco(searchTerm: string): Promise<CFADockOpcoInfo | null> {
    if (!searchTerm || typeof searchTerm !== 'string') {
      return null;
    }

    const normalized = searchTerm.trim().replace(/\s/g, '');
    const cacheKey = `opco:${normalized}`;

    // Vérifier le cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cached.ttl) {
      logger.debug('🔄 Info OPCO trouvée en cache', { searchTerm: normalized });
      return cached.data;
    }

    // Appeler CFADock
    logger.info('🔍 Recherche OPCO via CFADock', { searchTerm: normalized });

    try {
      const response = await this.client.get(this.searchPath, {
        params: {
          q: normalized, // CFADock accepte SIRET, SIREN, IDCC
        },
      });

      const results = response.data?.results || [];
      if (!results.length) {
        logger.warn('⚠️  Aucun OPCO trouvé via CFADock', { searchTerm: normalized });
        return null;
      }

      // Prendre le premier résultat (théoriquement le seul)
      const firstResult = results[0];
      const opcoInfo: CFADockOpcoInfo = {
        siret: String(firstResult.siret || normalized).replace(/\s/g, ''),
        siren: String(firstResult.siren || '').replace(/\s/g, ''),
        opcoCode: String(firstResult.opco_code || firstResult.opco || '').trim().toUpperCase(),
        opcoName: String(firstResult.opco_name || firstResult.opco_nom || '').trim(),
        opcoPortal: String(firstResult.opco_portal || firstResult.opco_portail || '').trim() || undefined,
        raison_sociale: String(firstResult.raison_sociale || firstResult.company_name || '').trim(),
      };

      // Valider les données critiques
      if (!opcoInfo.opcoCode || !opcoInfo.opcoName) {
        logger.warn('⚠️  Réponse CFADock incomplète (OPCO code/name manquant)', {
          searchTerm: normalized,
          result: firstResult,
        });
        return null;
      }

      // Cacher le résultat
      this.cache.set(cacheKey, {
        data: opcoInfo,
        cachedAt: Date.now(),
        ttl: this.cacheTtlMs,
      });

      logger.info('✅ OPCO identifiée via CFADock', {
        searchTerm: normalized,
        opcoCode: opcoInfo.opcoCode,
        opcoName: opcoInfo.opcoName,
      });

      return opcoInfo;
    } catch (error: any) {
      logger.error('❌ Erreur CFADock - Recherche OPCO échouée', {
        searchTerm: normalized,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        message: error.message,
      });

      // En cas d'erreur, retourner null (fallback vers saisie manuelle)
      return null;
    }
  }

  /**
   * Recherche par SIRET spécifiquement
   */
  async searchBySiret(siret: string): Promise<CFADockOpcoInfo | null> {
    if (!/^\d{14}$/.test((siret || '').replace(/\s/g, ''))) {
      return null;
    }
    return this.searchOpco(siret);
  }

  /**
   * Recherche par SIREN spécifiquement
   */
  async searchBySiren(siren: string): Promise<CFADockOpcoInfo | null> {
    if (!/^\d{9}$/.test((siren || '').replace(/\s/g, ''))) {
      return null;
    }
    return this.searchOpco(siren);
  }

  /**
   * Invalide une entrée du cache (ex: après modification)
   */
  invalidateCache(searchTerm: string): void {
    const cacheKey = `opco:${searchTerm.trim().replace(/\s/g, '')}`;
    this.cache.delete(cacheKey);
    logger.info('🔄 Cache CFADock invalidé', { searchTerm });
  }

  /**
   * Vide tout le cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('🔄 Cache CFADock complètement vidé');
  }

  /**
   * Retourne des infos debug sur l'état du cache
   */
  getDebugInfo(): GenericObject {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      cachedAt: new Date(entry.cachedAt).toISOString(),
      expiresAt: new Date(entry.cachedAt + entry.ttl).toISOString(),
      isValid: Date.now() - entry.cachedAt < entry.ttl,
    }));

    return {
      totalCached: entries.length,
      entries,
    };
  }
}

// Export singleton
export const cfadockService = new CFADockService();
