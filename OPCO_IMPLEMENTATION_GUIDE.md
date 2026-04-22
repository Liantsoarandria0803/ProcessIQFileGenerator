# 🚀 GUIDE D'IMPLÉMENTATION OPCO CONVERGENCE

## État actuel de l'intégration

**Complété (80%):**
- ✅ Modèles de données Mongoose (OpcoSubmission, History, NAF mapping, Financing)
- ✅ Service OPCO core (création, sync, envoi)
- ✅ Règles de gestion (validation, calculs montants, délais)
- ✅ Routes REST basiques
- ✅ UI frontend (OpcoDossierDetail modal)
- ✅ Intégration secrets chiffrés (AES-256)

**Nouvellement ajouté (20% de la demande):**
- ✅ Service OAuth 2.0 Client Credentials avec cache token
- ✅ Service CFADock API (identification OPCO par SIRET)
- ✅ Modèle et service Mandat de gestion (obligatoire légal)
- ✅ 9 prévalidations OPCO (bloquages locaux)
- ✅ 7 nouveaux endpoints API
- ✅ Tests unitaires

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### Phase 1 : Intégration OAuth (CRITIQUE - 1 jour)

- [ ] **1.1** Intégrer `opcoAuth.service` dans `opco.service.ts`
  ```typescript
  // Dans opco.service.ts - sendCreateRequest()
  const token = await opcoAuthService.getAccessToken({
    authServerUrl: connection.authServerUrl,
    clientId: connection.clientId,
    clientSecret: connection.clientSecret,
    tokenPath: connection.tokenPath || '/oauth/token',
  });
  ```

- [ ] **1.2** Ajouter les headers OAuth à chaque requête OPCO
  ```typescript
  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-ApiKey': connection.apiKey, // API Key CFA-spécifique
    'Content-Type': 'application/json',
  };
  ```

- [ ] **1.3** Tester OAuth avec Akto ou OPCommerce (credentials de test)

- [ ] **1.4** Configurer les variables d'env:
  ```env
  OPCO_AKTO_AUTH_SERVER=https://api.akto.fr
  OPCO_AKTO_CLIENT_ID=xxxxx
  OPCO_AKTO_CLIENT_SECRET=xxxxx
  OPCO_AKTO_API_KEY=sk-xxxxx
  OPCO_AKTO_API_BASE_URL=https://api.akto.fr/convergence
  ```

### Phase 2 : CFADock et Identification OPCO (1 jour)

- [ ] **2.1** Ajouter endpoint `GET /api/opco/cfadock/search?searchTerm=12345678901234`
  ```typescript
  // controller
  searchOpcoViaCFADock = async (req: Request, res: Response) => {
    const opcoInfo = await cfadockService.searchOpco(req.query.searchTerm);
    return res.json({ success: true, data: opcoInfo });
  };
  ```

- [ ] **2.2** Tester avec vrais SIRET (récupérer via INSEE API d'abord)

- [ ] **2.3** Mettre en cache les résultats (7 jours)

- [ ] **2.4** Intégrer dans le UI: afficher OPCO détecté lors de la saisie SIRET

### Phase 3 : Mandat de Gestion (2 jours)

- [ ] **3.1** Implémentation complète service mandat:
  ```typescript
  // opcoMandate.service.ts - méthodes à compléter:
  - generateMandatePdf() // Utiliser pdf-lib
  - launchSignatureWorkflow() // Intégrer DocuSign
  - updateSignatureFromDocuSign() // Webhook DocuSign
  ```

- [ ] **3.2** Générer le PDF mandat (Article 7 du Vade-mecum)
  ```typescript
  // Inclure: logo CFA, identification signataires, 
  // texte légal, dates, signature attestation
  ```

- [ ] **3.3** Intégrer DocuSign pour signature tripartite
  ```typescript
  // Utiliser docusign.service.ts existant
  // Créer enveloppe avec 3 signataires (CFA, Employeur, Apprenti)
  ```

- [ ] **3.4** Bloquer la soumission API si mandat non signé
  ```typescript
  // opco.service.ts submitExisting()
  const isSigned = await opcoMandateService.isSignedAndValid(mandateId);
  if (!isSigned) {
    throw new Error('Mandat de gestion non signé. Obligatoire avant envoi.');
  }
  ```

- [ ] **3.5** Ajouter onglet "Mandat" dans OpcoDossierDetail.tsx (UI)

### Phase 4 : Prévalidations (1 jour)

- [ ] **4.1** Créer endpoint `POST /api/opco/dossiers/:id/validate`
  ```typescript
  validateBeforeSubmission = async (req, res) => {
    const validation = await opcoValidationService.validateBeforeSubmission(
      req.params.id,
      req.body.payload
    );
    return res.json(validation);
  };
  ```

- [ ] **4.2** Implémenter les 9 contrôles (dans opcoValidation.service.ts):
  1. ✅ Mandat signé
  2. ✅ Pas doublon Cerfa
  3. ✅ Formation RNCP éligible
  4. ✅ Âge apprenti (16-29)
  5. ✅ Maître d'apprentissage qualifié
  6. ✅ Salaire ≥ SMIC
  7. ⏳ Qualiopi CFA (intégrer API France Compétences)
  8. ✅ NIR présent et valide
  9. ✅ Données minimales

- [ ] **4.3** Afficher les erreurs bloquantes avant submit dans l'UI
  ```typescript
  // Frontend: appeler /validate avant de permettre submit
  const validation = await api.post(`/api/opco/dossiers/${id}/validate`, payload);
  if (!validation.isValid) {
    // Afficher erreurs bloquantes
    // Bloquer le bouton submit
  }
  ```

### Phase 5 : Endpoints supplémentaires (3 jours)

- [ ] **5.1** Endpoint `GET /api/opco/dossiers/:id/schedules`
  ```typescript
  // Appeler l'API Convergence pour récupérer les échéanciers
  // Champs: periodeDebut, periodeFin, montantPedagogique, montantRQTH, 
  //         numeroPeriode, montantRegle, montantEnCours
  ```

- [ ] **5.2** Endpoint `POST /api/opco/dossiers/:id/invoices`
  ```typescript
  // Envoyer factures à l'OPCO
  // Vérifier cohérence avec Cerfa avant envoi
  ```

- [ ] **5.3** Endpoint `POST /api/opco/match-historical`
  ```typescript
  // Appairage dossiers historiques
  // Critères: nom + prénom + DNaissance + SIRET + date début
  // Retourner matches depuis 01/01/2020
  ```

- [ ] **5.4** Polling automatique (cron job)
  ```typescript
  // À ajouter dans src/jobs/ ou src/cron/
  // Tous les jours à 9h: syncStatus pour dossiers EN_ATTENTE_VALIDATION
  ```

### Phase 6 : Frontend UI (2 jours)

- [ ] **6.1** Créer composant OpcoSubmissionWizard.tsx
  ```
  Étapes:
  1. Saisie SIRET + détection OPCO
  2. Prévalidations (affichage erreurs bloquantes)
  3. Mandat (affichage statut + bouton signature)
  4. Confirm submit
  5. Success/Error
  ```

- [ ] **6.2** Mettre à jour OpcoDossierDetail.tsx
  ```typescript
  - Ajouter onglet "Mandat" avec statut signatures
  - Ajouter onglet "Échéanciers" avec timeline
  - Afficher motif refus + numéro DECA si REFUSE
  ```

- [ ] **6.3** Ajouter validation form côté client
  ```typescript
  // Appeler /validate avant chaque tentative submit
  // Afficher toast avec erreurs bloquantes
  ```

### Phase 7 : Tests (1 jour)

- [ ] **7.1** Exécuter tests unitaires
  ```bash
  npm test -- opco.service.test.ts
  ```

- [ ] **7.2** Tests d'intégration OAuth
  ```bash
  npm test -- opco.integration.test.ts
  # Tester avec credentials Akto/OPCommerce de test
  ```

- [ ] **7.3** Tests E2E du workflow complet
  ```bash
  npm run test:e2e -- opco-workflow.e2e.ts
  # Créer dossier → Valider → Signer mandat → Soumettre → Sync statut
  ```

- [ ] **7.4** Documentation API (Swagger/OpenAPI)
  ```typescript
  // Ajouter @swagger annotations pour les 7 nouveaux endpoints
  ```

---

## Variables d'environnement à configurer

### OAuth Client Credentials (obligatoire)

```env
# OPCO AKTO
OPCO_AKTO_AUTH_SERVER=https://api.akto.fr
OPCO_AKTO_CLIENT_ID=client_akto_dev
OPCO_AKTO_CLIENT_SECRET=secret_akto_dev
OPCO_AKTO_API_KEY=sk_akto_dev_xxxxx
OPCO_AKTO_TOKEN_PATH=/oauth/token
OPCO_AKTO_API_BASE_URL=https://api.akto.fr/convergence
OPCO_AKTO_CREATE_DOSSIER_PATH=/dossiers
OPCO_AKTO_STATUS_PATH=/dossiers/{externalId}

# OPCO COMMERCE
OPCO_COMMERCE_AUTH_SERVER=https://api.opco-commerce.fr
OPCO_COMMERCE_CLIENT_ID=client_commerce_dev
OPCO_COMMERCE_CLIENT_SECRET=secret_commerce_dev
OPCO_COMMERCE_API_KEY=sk_commerce_dev_xxxxx
# etc...
```

### DocuSign (pour signatures)

```env
DOCUSIGN_ENABLED=true
DOCUSIGN_AUTH_SERVER=account-d.docusign.com
DOCUSIGN_INTEGRATION_KEY=xxxxx
DOCUSIGN_USER_ID=xxxxx
DOCUSIGN_ACCOUNT_ID=xxxxx
DOCUSIGN_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
DOCUSIGN_RETURN_URL=https://app.processiq.fr/opco/signature-callback
```

### Chiffrement des secrets

```env
INTEGRATIONS_ENCRYPTION_SECRET=votre_clé_secrete_256bit_base64
```

---

## Intégration avec opco.service.ts existant

### 1. Ajouter imports au début

```typescript
import { opcoAuthService } from './opcoAuth.service';
import { cfadockService } from './cfadock.service';
import { opcoMandateService } from './opcoMandate.service';
import { opcoValidationService } from './opcoValidation.service';
```

### 2. Modifier `sendCreateRequest()` pour utiliser OAuth

```typescript
private async sendCreateRequest(
  payload: GenericObject,
  connection: OpcoConnection
): Promise<RemoteSubmitResult> {
  // Obtenir Bearer Token
  const token = await opcoAuthService.getAccessToken({
    authServerUrl: connection.baseUrl.replace(/\/api.*/, ''), // auth server
    clientId: connection.clientId,
    clientSecret: connection.clientSecret,
    tokenPath: connection.tokenPath || '/oauth/token',
  });

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-ApiKey': connection.apiKey,
    'Content-Type': 'application/json',
  };

  // Rest du code inchangé...
}
```

### 3. Modifier `submitExisting()` pour vérifier mandat

```typescript
async submitExisting(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
  const submission = await OpcoSubmissionModel.findById(id);
  if (!submission) throw new Error('Dossier OPCO introuvable');

  // 🆕 Vérifier mandat signé (OBLIGATOIRE)
  const signedMandate = await opcoMandateService.getSignedMandateForSubmission(
    submission._id.toString()
  );
  if (!signedMandate) {
    throw new Error(
      'Mandat de gestion non signé. Impossible de soumettre le dossier. ' +
      'Le mandat est obligatoire (Article 7 - Vade-mecum inter-OPCO).'
    );
  }

  // Rest du code existant...
}
```

### 4. Ajouter prévalidations avant submit

```typescript
async submitExisting(id: string, updatedBy?: string): Promise<IOpcoSubmission> {
  // ... vérifications existantes ...

  // 🆕 Lancer prévalidations
  const validation = await opcoValidationService.validateBeforeSubmission(
    id,
    submission.payload
  );

  if (!validation.isValid) {
    const blockingErrors = validation.errors
      .filter(e => e.severity === 'error')
      .map(e => e.message)
      .join('; ');
    
    throw new Error(
      `Validation échouée avant envoi OPCO:\n${blockingErrors}`
    );
  }

  // Rest du code...
}
```

---

## Aide-mémoire API Convergence (RFC OpenAPI)

### Endpoints OPCO standards

```bash
# Créer dossier
POST /api/convergence/dossiers
Headers: Authorization: Bearer <token>, X-ApiKey: <key>
Body: { apprenti, employeur, contrat, formation, ... }
Response: { id, reference, numeroOPCO, dateReception }

# Consulter statut
GET /api/convergence/dossiers/{dossierId}
Response: { status, montantAccorde, motifRefus?, dateReponse, ... }

# Consulter échéanciers
GET /api/convergence/dossiers/{dossierId}/schedules
Response: { schedules: [{periodeDebut, montantPedagogique, ...}] }

# Envoyer facture
POST /api/convergence/dossiers/{dossierId}/factures
Body: { numero, montant, periode, ... }

# Appairage historique
POST /api/convergence/dossiers/search
Body: { apprentiNom, dateNaissance, siretEntreprise, dateDebut }
Response: { matches: [{dossierId, ...}] }
```

---

## Ressources externes

1. **CFADock**: https://www.cfadock.fr/Home/ApiDescription
   - Endpoint: `https://www.cfadock.fr/api/search?q=SIRET`
   - Gratuit, non authentifié, ~500ms/req

2. **API Convergence**: https://www.cfadock.fr/portail_developpeur
   - Spécification OpenAPI disponible en téléchargement
   - Vérifier la version supportée par chaque OPCO

3. **DocuSign**: https://developers.docusign.com
   - JWT OAuth 2.0 (déjà configuré dans le projet)
   - Webhooks pour suivi signatures

4. **France Compétences**: https://www.francecompetences.fr
   - RNCP (referentiel national certifications)
   - Qualiopi (certification CFA)

---

## Notes importantes

⚠️ **Sécurité NIR**: 
- Toujours chiffrer en transit (TLS 1.3 minimum)
- Logs: jamais afficher les 13 chiffres complets
- At-rest: stocker chiffré dans MongoDB

⚠️ **Multi-OPCO**: 
- Chaque OPCO peut avoir une version différente de l'API Convergence
- Tester les migrations de version
- Maintenir compatibilité backward si possible

⚠️ **Délai critique**: 
- Dossier doit être envoyé dans **5 jours ouvrés** après signature du contrat
- Afficher alerte visuelle si < 2 jours (couleur orange)
- Bloquer après dépassement (statut ERROR)

---

## Prochaines étapes après implémentation

1. ✅ Déployer v1 avec OAuth + Mandat + Validations
2. ⏳ Intégrer polling automatique (cron)
3. ⏳ Ajouter gestion factures + échéanciers
4. ⏳ Implémenter appairage dossiers historiques
5. ⏳ Optimiser perf (cache, index MongoDB)
6. ⏳ Monitoring/alertes (Sentry, DataDog)
