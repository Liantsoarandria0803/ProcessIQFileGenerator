import logger from './logger';

/**
 * Options pour la fonction retry
 */
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  retryOn?: (error: any) => boolean;
}

/**
 * Exécute une fonction avec retry automatique en cas d'erreur
 * Utilise un délai exponentiel entre les tentatives
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 2000,
    retryOn = (err) => {
      // Retry uniquement sur les erreurs réseau
      return err.code === 'ETIMEDOUT' || 
             err.code === 'ECONNRESET' || 
             err.code === 'ECONNREFUSED' ||
             err.type === 'system';
    }
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      
      if (attempt < maxRetries && retryOn(err)) {
        const delay = attempt * baseDelay;
        logger.warn(`⚠️ Tentative ${attempt}/${maxRetries} échouée: ${err.message}`);
        logger.info(`⏳ Attente de ${delay}ms avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!retryOn(err)) {
        // Si ce n'est pas une erreur réseau, on ne retry pas
        throw err;
      }
    }
  }

  throw lastError || new Error('Échec après plusieurs tentatives');
}

export default withRetry;
