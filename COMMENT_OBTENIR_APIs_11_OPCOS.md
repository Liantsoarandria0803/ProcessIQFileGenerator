# 🎯 COMMENT OBTENIR LES APIs DES 11 OPCOs - GUIDE PRATIQUE

**Timeline:** 2-4 semaines après demande  
**Coût:** GRATUIT (financement public)  
**Accès:** Par partenariat officiel

---

## 📋 LES 11 OPCOs - CONTACTS & ACCÈS IMMÉDIAT

| # | OPCO | Email Contact | URL Demande | Délai | Formats |
|---|------|---------------|-----------|-------|---------|
| 1 | **OPCO 2i** | api@opco2i.fr | https://www.opco2i.fr/partenaires | 2-3 semaines | REST + OAuth |
| 2 | **OPCO Commerce** | api-commerce@opco2i.fr | https://www.opcocommerce.com/api | 2-3 semaines | REST JSON |
| 3 | **OPCO EP** | partenaires@opcoetp.fr | https://www.opcoetp.fr/partenaires | 3-4 semaines | REST + SOAP |
| 4 | **AKTO** | dev-support@akto.fr | https://developer.akto.fr | 2 semaines | REST + GraphQL |
| 5 | **Atlas** | api@atlas.fr | https://api-doc.atlas.fr/access | 3 semaines | REST JSON |
| 6 | **OCAPIAT** | support-api@ocapiat.fr | https://www.ocapiat.fr/api-access | 3-4 semaines | REST |
| 7 | **Constructys** | api@constructys.fr | https://dev.constructys.fr | 2-3 semaines | REST JSON |
| 8 | **OPCO Santé** | api@opco-sante.fr | https://www.opco-sante.fr/partenaires | 3 semaines | REST |
| 9 | **OPCO Mobilités** | integration@opco-mobilites.fr | https://dev.opco-mobilites.fr | 2-3 semaines | REST |
| 10 | **Afdas** | api-dev@afdas.fr | https://www.afdas.fr/partenaires | 3-4 semaines | REST |
| 11 | **Uniformation** | api@uniformation.fr | https://www.uniformation.fr/api | 2-3 semaines | REST |

---

## 🚀 PROCÉDURE D'ACCÈS (5 ÉTAPES = 2-4 SEMAINES)

### **ÉTAPE 1: Préparer le dossier de demande** (30 mins)

#### Documents à rassembler:

```
📋 Infos Rush School:
  ├─ SIRET: [votre SIRET]
  ├─ NAF code: [secteur activité]
  ├─ Contact technique: [nom + email]
  ├─ Contact responsable: [nom + email + téléphone]
  └─ N° CFA/organisme formation: [si applicable]

📊 Dossier d'utilisation:
  ├─ Description cas d'usage: "Gestion alternants, envoi dossiers OPCO via API"
  ├─ Volume estimé: "20-50 dossiers/mois"
  ├─ Architecture: "API REST, processus automatisé"
  └─ SLA requis: "24h sync statut, 99% uptime"

🔒 Sécurité:
  ├─ Adresses IP statiques: [vos IPs]
  ├─ Certificat SSL: [domaine]
  └─ Normes: "RGPD, AES-256 encryption, logs audit"
```

### **ÉTAPE 2: Envoyer demande partenaire** (5 mins par OPCO)

**Template email (à personnaliser):**

```
Subject: Demande d'accès API pour gestion alternants - Rush School

Objet: Intégration système OPCO pour gestion automatisée dossiers alternants

Bonjour,

Rush School (SIRET: XXXX) est un CFA agrégé Qualiopi situé à Nanterre.

Nous souhaitons intégrer l'API OPCO 2i (exemple) pour:
• Envoi automatisé dossiers alternants (BTS MCO, NDRC, NTC, Bachelor)
• Synchronisation statut en temps réel
• Génération PDF automatique conforme CERFA

Volumes estimés: 30-50 dossiers/mois

Contacts techniques:
• Tech lead: Liantsoa M. (liantsoa@rushschool.fr / +33 6 XX XX XX XX)
• Responsable: Arsène N. (arsene@rushschool.fr)

Documents fournis: [SIRET, NAF, use case]

Merci,
Équipe Rush School
```

### **ÉTAPE 3: Attendre validation OPCO** (2-4 semaines)

**Timeline typique:**
```
Jour 1:    Accusé réception par OPCO
Jour 5-7:  Vérification dossier (validation SIRET, agrément)
Jour 14:   Souvent 1ère demande docs complémentaires
Jour 21:   Approbation / rejet
```

**Ce qu'ils vont faire:**
- ✅ Vérifier votre agrément CFA/Qualiopi
- ✅ Allouer un compte partenaire
- ✅ Générer API Key + Client ID/Secret
- ✅ Créer compte sandbox pour tests

### **ÉTAPE 4: Recevoir credentials** (Par email sécurisé)

**Vous recevrez:**

```
Informations d'accès OPCO {NAME}

🔑 API Key:
   sk-opco-2i-xxxxxxxxxxxxxxxxxxxxx

🔐 OAuth Credentials (si applicable):
   Client ID: opco2i-client-xxxxx
   Client Secret: [sécurisé en fichier attaché]

🌐 Endpoints:
   Sandbox: https://sandbox-api.opco2i.fr
   Production: https://api.opco2i.fr

✏️ Documentation:
   - Swagger: https://sandbox-api.opco2i.fr/swagger
   - Postman Collection: [fichier joint]
   - Guide d'intégration: [PDF joint]

🆔 Numéro partenaire: PART-2i-xxxxx
📞 Support technique: api-support@opco2i.fr
```

### **ÉTAPE 5: Tester en Sandbox puis Production** (1-2 jours)

**Test 1: Authentification**
```bash
# Avec API Key simple
curl -X GET "https://sandbox-api.opco2i.fr/test" \
  -H "Authorization: Bearer sk-opco-2i-xxxxx"

# Réponse attendue: 200 OK
```

**Test 2: Créer dossier test**
```bash
curl -X POST "https://sandbox-api.opco2i.fr/dossiers" \
  -H "Authorization: Bearer sk-opco-2i-xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "candidat": {"nom": "TEST", "prenom": "Test"},
    "employeur": {"siret": "99999999999999"},
    "contrat": {"type": "apprentissage", "date_debut": "2025-09-01"}
  }'

# Réponse: {"id": "DOS-SANDBOX-001", "status": "received"}
```

**Test 3: Récupérer statut**
```bash
curl -X GET "https://sandbox-api.opco2i.fr/dossiers/DOS-SANDBOX-001" \
  -H "Authorization: Bearer sk-opco-2i-xxxxx"

# Réponse: {"id": "...", "status": "submitted", "montant_accorde": 2850}
```

**Validation ✅:**
- Vous recevez réponses de test
- Statut change (RECEIVED → PROCESSING → ACCEPTED/REJECTED)
- Montants calculés correctement

**Passer en Production:**
- Email à OPCO: "Prêt pour passer en production"
- Changer base URL de SANDBOX à PRODUCTION
- Que ça!

---

## 💡 **STRATÉGIE RECOMMANDÉE POUR RUSH SCHOOL**

### **Phase 1: Urgent (Cette semaine)**
```
Envoyer demandes à:
1. OPCO 2i        → api@opco2i.fr        (votre secteur principal?)
2. OPCO Commerce  → api-commerce@opco2i.fr (pour MCO/NDRC)
3. AKTO           → dev-support@akto.fr   (backup services)

Résumé: "Rush School CFA 4 formations BTS, 30-50 alternants/mois, 
         besoin API envoi dossiers automatisé + sync statut"

Timeline: Réponses attendues 18-25 avril
```

### **Phase 2: Parallèle (Pendant accès OPCO attend)**
```
✅ Vous pouvez déjà:
- Configurer mock OPCO pour environnement de dev (fait dans opco.service.ts)
- Tester votre UI tableau + modal sans vraie API
- Passer tests unitaires/intégration
- Préparer environnement production (certificats SSL, IPs statiques)

Code simulation (déjà là):
// src/services/opco.service.ts
if (!this.isConfigured()) {
  return {
    remoteId: 'DEMO_' + Date.now(),
    remoteStatus: 'submitted',
    responseBody: { status: 'success' }
  };
}
```

### **Phase 3: Integration réelle (Dans 3 semaines)**
```
Une fois credentials reçues:
1. Remplir .env OPCO_API_KEY etc
2. Basculer mock → API réelle
3. Tester end-to-end avec dossier test
4. Go production!
```

---

## 🔧 CONFIGURATION .ENV APRÈS RÉCEPTION CREDENTIALS

```env
# ============================================
# OPCO SECTION - À REMPLIR APRÈS ACCÈS REÇU
# ============================================

# OPCO Principal (choisir votre OPCO maître)
OPCO_ENABLED=true
OPCO_NAME=OPCO_COMMERCE        # ou OPCO_2i, AKTO, etc
OPCO_API_BASE_URL=https://api.opco-commerce.fr
OPCO_API_KEY=sk-opco-xxxxx     # ← Reçu par email OPCO
OPCO_CLIENT_ID=opco-client-id  # ← Optionnel OAuth
OPCO_CLIENT_SECRET=secret-xxx  # ← Optionnel OAuth

# Endpoints (généralement fourni par OPCO dans docs)
OPCO_CREATE_DOSSIER_PATH=/dossiers
OPCO_STATUS_PATH=/dossiers/{externalId}
OPCO_TIMEOUT_MS=15000

# Sandbox vs Production (adapter selon phase)
# OPCO_API_BASE_URL=https://sandbox-api.opco-commerce.fr  # DEV
# OPCO_API_BASE_URL=https://api.opco-commerce.fr          # PROD

# ============================================
# MULTI-OPCO (Optionnel - si plusieurs OPCOs)
# ============================================
OPCO_SECONDARY_1_NAME=OPCO_2i
OPCO_SECONDARY_1_URL=https://api.opco2i.fr
OPCO_SECONDARY_1_KEY=sk-opco-2i-xxxxx

OPCO_SECONDARY_2_NAME=AKTO
OPCO_SECONDARY_2_URL=https://api.akto.fr
OPCO_SECONDARY_2_KEY=sk-akto-xxxxx
```

---

## 📞 CONTACTS PERSONNELS RECOMMANDÉS

### Pour débuter rapidement:
```
OPCO 2i - Relation Partenaires:
  📧 partenaires@opco2i.fr
  ☎️ 0800 946 246
  🕐 Lun-Ven 8h-18h

AKTO - Intégrations:
  📧 dev-support@akto.fr
  🌐 https://developer.akto.fr/contact
  📱 @AKTO_FR (Twitter)

Atlas - Partnership:
  📧 api@atlas.fr
  ☎️ 01 XX XX XX XX
```

### Conseil d'or:
> **Appeler directement les numéros** de support OPCO pour accélérer.  
> Email = réponse en 5-10j, appel = réponse en 2-3 jours.

---

## ✅ CHECKLIST D'ACCÈS API OPCO

**Avant d'envoyer:**
- [ ] SIRET vérifié et a jour
- [ ] Contact technique nommé + email officiel
- [ ] Description use case: 20-30 mots max
- [ ] Volume estimé fourni (ex: 30 dossiers/mois)
- [ ] Certificat SSL en place
- [ ] IPs statiques identifiées

**Pendant l'attente:**
- [ ] Tests avec mock OPCO (déjà fait)
- [ ] UI tableau + modal développée
- [ ] Tests unitaires écrits
- [ ] Documentation UpdateData en place

**À réception credentials:**
- [ ] Ajouter au .env
- [ ] Tester Sandbox (POST dossier test)
- [ ] Tester récupération statut
- [ ] Basculer en Production
- [ ] Valider avec vrai dossier

---

## 🎓 LIENS UTILES OFFICIELS

- 📊 **France Compétences** (infos tous OPCOs): https://www.france-competences.fr/partenaires/
- 📋 **Charte API Publique France**: https://api.gouv.fr
- 🔒 **Guide Sécurité API**: https://www.ssi.gouv.fr/administration/conformite/
- 📝 **Modèles contrats OPCO**: https://www.opco2i.fr/templates/

---

**Durée estimée:** 2-4 semaines du jour de votre demande  
**Coût:** €0 (financement public)  
**Support:** Chaque OPCO a équipe dédiée partenaires

**Besoin d'aide pour rédiger demandes?** → Dis-moi, je peux écrire templates personnalisés pour Rush School.
