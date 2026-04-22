/**
 * Service d'authentification OPCO - OAuth 2.0 Client Credentials
 * 
 * Standard : Client Credentials Grant (RFC 6749 section 4.4)
 * Chaque requête API OPCO Convergence nécessite :
 *   - Authorization: Bearer <token>
 *   - X-ApiKey: <api_key_spécifique_par_CFA_OPCO>
 * 
 * Le Bearer Token a une durée de vie ~60 min.
 * Nous le cachons localement (55 min) pour éviter de marteler l'auth server.
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

type GenericObject = Record<string, any>;

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // ms depuis epoch
}

interface OpcoAuthConfig {
  authServerUrl: string;
  clientId: string;
  clientSecret: string;
  tokenPath?: string;
  timeoutMs?: number;
}

/**
 * Service centralisé pour gérer les Bearer Tokens OAuth 2.0
 * Cache les tokens par client_id (multi-OPCO support)
 */
export class OpcoAuthService {
  private tokenCache = new Map<string, TokenCacheEntry>();
  private authClients = new Map<string, AxiosInstance>();

  /**
   * Obtient un Bearer Token valide, en utilisant le cache si disponible
   * 
   * @param config Configuration OAuth (clientId, secret, auth server)
   * @returns Bearer token string (prêt pour Authorization header)
   */
  async getAccessToken(config: OpcoAuthConfig): Promise<string> {
    const cacheKey = config.clientId;
    const now = Date.now();

    // Vérifier le cache : valable si expiration - 1 min < now
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - 60_000 > now) {
      logger.debug('🔄 Bearer Token trouvé en cache', { clientId: cacheKey });
      return cached.accessToken;
    }

    // Pas en cache ou expiré → demander un nouveau token
    logger.info('🔐 Obtention nouveau Bearer Token OPCO', { authServer: config.authServerUrl });
    const token = await this.fetchNewToken(config);

    // Cacher le token (TTL : 55 min pour avoir une marge)
    this.tokenCache.set(cacheKey, {
      accessToken: token.accessToken,
      expiresAt: now + (token.expiresIn * 1000 - 60_000),
    });

    return token.accessToken;
  }

  /**
   * Appelle l'Authorization Server OPCO pour obtenir un nouveau token
   */
  private async fetchNewToken(
    config: OpcoAuthConfig
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const client = this.getAuthClient(config);
    const tokenEndpoint = config.tokenPath || '/oauth/token';
    const timeoutMs = config.timeoutMs || 15_000;

    try {
      const response = await client.post(
        tokenEndpoint,
        {
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        },
        { timeout: timeoutMs }
      );

      const accessToken = response.data?.access_token;
      const expiresIn = Number(response.data?.expires_in || 3600);

      if (!accessToken) {
        throw new Error('Authorization Server: access_token manquant dans la réponse');
      }

      if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
        throw new Error('Authorization Server: expires_in invalide');
      }

      logger.info('✅ Bearer Token obtenu', {
        clientId: config.clientId,
        expiresInSeconds: expiresIn,
      });

      return { accessToken, expiresIn };
    } catch (error: any) {
      logger.error('❌ Erreur OAuth - Obtention Bearer Token échouée', {
        authServer: config.authServerUrl,
        clientId: config.clientId,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        message: error.message,
      });

      throw new Error(
        `OAuth échoué (${config.authServerUrl}): ${
          error.response?.data?.error_description || error.message || 'Erreur inconnue'
        }`
      );
    }
  }

  /**
   * Obtient ou crée un client Axios préconfigué pour cet auth server
   */
  private getAuthClient(config: OpcoAuthConfig): AxiosInstance {
    const key = config.authServerUrl;
    if (this.authClients.has(key)) {
      return this.authClients.get(key)!;
    }

    const client = axios.create({
      baseURL: config.authServerUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    this.authClients.set(key, client);
    return client;
  }

  /**
   * Invalide le cache pour forcer une nouvelle authentification
   * Utile si le token a été révoqué ou en cas d'erreur 401
   */
  invalidateCache(clientId: string): void {
    this.tokenCache.delete(clientId);
    logger.info('🔄 Cache token invalidé', { clientId });
  }

  /**
   * Invalide tout le cache (ex: au démarrage après changement de config)
   */
  clearAllCache(): void {
    this.tokenCache.clear();
    logger.info('🔄 Cache OAuth complètement vidé');
  }

  /**
   * Retourne des infos debug sur l'état du cache
   */
  getDebugInfo(): GenericObject {
    const entries = Array.from(this.tokenCache.entries()).map(([clientId, cached]) => ({
      clientId,
      expiresAt: new Date(cached.expiresAt).toISOString(),
      isValid: cached.expiresAt > Date.now(),
    }));

    return {
      cachedTokens: entries.length,
      entries,
    };
  }
}

// Export singleton
export const opcoAuthService = new OpcoAuthService();
