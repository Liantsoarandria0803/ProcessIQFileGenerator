# 🎯 IMPLÉMENTATION OPCO FILIZ.IO - ProcessIQ

**Status:** ✅ Semaine 1 complète - Ready pour intégration UI  
**Deadline:** 30 avril 2026  
**Équipe:** Liantsoa + Jocelyn (Back) · Dola (QA) · Fiti + Aina (Front)

---

## 📋 RÉSUMÉ - Ce qui a été fait

### ✅ Backend Services Créés

#### 1. **nafOpcoMapping.service.ts** (NAF → OPCO)
- Import table France Compétences ~700 NAF → 11 OPCOs
- Fonction `getOPCOByNAF(codeNaf)` - identification automatique
- Fonction `searchByLibelle(query)` - autocomplete pour formulaires
- **Impact:** Éliminer les erreurs d'OPCO mal attribuée

#### 2. **franceCompetences.service.ts** (Barèmes de financement)
- Import barèmes 2025-2026 pour toutes formations
- Fonction `getFinancingForFormation()` - montant annuel par OPCO + formation
- Fonction `calculateTotalFinancing()` - ventilation complète (montant × durée)
- **Impact:** Montants calculés automatiquement, pas d'erreur manuel

#### 3. **opco.service.improved.ts** (Service principal amélioré)
- 🆕 Identification OPCO automatique par NAF lors création dossier
- 🆕 Calcul automatique montants France Compétences
- 🆕 Vérification délai critique (5 jours ouvrés)
- 🆕 11 statuts OPCO corrects + transitions d'état
- PDF généré + envoyé avant transmission OPCO
- Normalisation robuste réponse OPCO (40+ variantes)
- Historique immuable de tous les envois/synchronisations

### ✅ API Routes Créées

#### France Compétences Service
```
GET  /api/competences/opco/by-naf/:naf
     → Exple: /api/competences/opco/by-naf/4791B
     → Répond: {opcoCode, opcoName}

GET  /api/competences/financing/:opcoCode/:formation?duration=24&annee=2025
     → Montant financé (annuel, mensuel, total, horaire)

GET  /api/competences/naf/search?query=boucherie
     → Autocomplete NAF pour formulaires

GET  /api/competences/rates/:opcoCode?annee=2025
     → Toutes les formations financées par une OPCO

POST /api/competences/init
     → Initialiser tables (à faire UNE FOIS)
```

#### OPCO Dossiers Service (amélioré)
```
POST /api/opco/dossiers
     + body.codeNaf → identifie OPCO + calcule montant automatiquement

GET  /api/opco/dossiers/:id/deadline
     → Vérifier délai critique (5 jours ouvrés)

POST /api/opco/dossiers/:id/sync
     → Synchroniser statut avec OPCO (pull réponse OPCO)

POST /api/opco/dossiers/:id/resubmit
     → Renvoyer dossier après correction
```

### ✅ Fichiers Créés/Modifiés

| Fichier | Type | Statut | Description |
|---------|------|--------|-------------|
| `nafOpcoMapping.service.ts` | NEW | ✅ | NAF → OPCO mapping |
| `franceCompetences.service.ts` | NEW | ✅ | Barèmes financement |
| `opco.service.improved.ts` | NEW | ✅ | Service principal amélioré |
| `franceCompetences.routes.ts` | NEW | ✅ | API routes France Compétences |
| `opco.routes.ts` | MODIFIED | ✅ | Ajout codeNaf + /deadline |
| `opco-init.ts` | NEW | ✅ | Doc + initialisation |

---

## 🚀 ÉTAPE SUIVANTE - DÉPLOIEMENT (⏳ CETTE SEMAINE)

### 1️⃣ Intégration dans le serveur Express
```typescript
// src/server.ts
import { initializeOpcoTables } from './utils/opco-init';

app.listen(3000, async () => {
  await initializeOpcoTables(); // 🚀 Iitialiser OPCO tables
  console.log('Server running');
});
```

### 2️⃣ Ajouter france-competences router au serveur
```typescript
import franceCompetencesRouter from './routes/franceCompetences.routes';

app.use('/api/competences', franceCompetencesRouter);
```

### 3️⃣ .env configuration requise
```env
# OPCO Configuration
OPCO_ENABLED=true
OPCO_NAME=OPCO_COMMERCE
OPCO_API_BASE_URL=https://api.opco-commerce.fr
OPCO_API_KEY=sk-xxxxx
OPCO_CREATE_DOSSIER_PATH=/dossiers
OPCO_STATUS_PATH=/dossiers/{externalId}
OPCO_TIMEOUT_MS=15000
```

### 4️⃣ Initialiser les tables (admin)
```bash
curl -X POST http://localhost:3000/api/competences/init \
  -H "Authorization: Bearer [ADMIN_TOKEN]"
```

---

## 📊 DONNÉES INTÉGRÉES

### 11 OPCOs Françaises
| OPCO | Secteurs | Barèmes |
|------|----------|---------|
| OPCO 2i | Ingénierie, électronique, informatique | 15 formations |
| OPCO Commerce | Retail, vente, e-commerce | 5 formations |
| AKTO | IT, services, comptabilité | 8 formations |
| OCAPIAT | Agriculture, agro-alimentaire | 3 formations |
| OPCO EP | BTP, artisanat, commerce de proximité | 6 formations |
| ATLAS | Transport, tourisme, hôtellerie | 5 formations |
| Constructys | Bâtiment, travaux publics | 4 formations |
| OPCO Santé | Santé, secteur social | 3 formations |
| OPCO MobilitésTransport, logistique | 2 formations |
| Afdas | Audiovisuel, spectacle, sports | 2 formations |

### Barèmes Financement 2025
- **Minimum:** 1700€/an (CAPA Agricole)
- **Maximum:** 4200€/an (Licence Informatique)
- **Plus courant:** 2800€-3500€/an (BTS standard)

---

## 🔴 **ALERTE DÉLAI CRITIQUE - F04 2.7**

Cahier des charges Filiz.io: **5 jours ouvrés** maximum pour envoyer dossier OPCO  
Depuis: Date de début du contrat

### Logique d'alerte
```javascript
const deadline = dateDebut + 5 business days;

if (daysRemaining < 0) {
  // 🔴 RETARD - contacter OPCO urgence
  status = 'red';
  label = `RETARD: ${Math.abs(days)} jour(s)`;
}
else if (daysRemaining <= 2) {
  // 🟠 CRITIQUE - 48h ou moins
  status = 'orange';
  label = `URGENT: ${daysRemaining} jour(s)`;
}
else {
  // 🟢 OK
  status = 'green';
  label = `${daysRemaining} jour(s) (${workDays} ouvrés)`;
}
```

### API pour vérifier délai
```bash
GET /api/opco/dossiers/:id/deadline

→ {
    "daysRemaining": 3,
    "workDaysRemaining": 2,
    "isUrgent": true,
    "isOverdue": false,
    "label": "URGENT: 3 jour(s) restant(s)",
    "color": "orange"
  }
```

---

## 🎨 **UI À FAIRE (SEMAINE 2) - Fiti + Aina**

### F04 2.8 - Tableau "Prises en charge OPCO"
```
[OPCO] | [Apprenti] | [Employeur] | [Montant] | [Date envoi] | [Délai] | [Statut] | [Actions]
-------|-----------|------------|-----------|-------------|--------|---------|----------
Commerc| Jean D.   | E-Commerce | 2850€/an  | 15 avr     | 🟠 2j  | EN_ATT  | 🔄 Sync
2i     | Anne M.   | Tech Inc   | 3500€/an  | 10 avr     | 🟢 5j  | ACCEPTE | 📋 View
```

**Colonnes à alimenter depuis backend:**
- `montantAnnuel` - calculé automatiquement
- `délaiStatus` - retourné par GET /deadline
- `dateLimiteEnvoi` - dateDebut + 5 jours

### F04 2.9 - Fiche détaillée dans modal
```
Onglet 1: Informations
  - OPCO name / code / portal link
  - Montant annuel + total
  - Délai (avec couleur)
  - Statut + transitions d'état

Onglet 2: Documents
  - Liste fichiers joints
  - PDF généré visible
  - Bouton upload document

Onglet 3: Historique
  - Timeline des changements
  - Dates creation/envoi/sync/acceptation
  - Messages réponse OPCO
```

---

## 💡 POINTS TECHNIQUES IMPORTANTS

### Identification Automatique NAF
**Avant:** Formulaire demandait de choisir l'OPCO manually → erreurs  
**Après:** `codeNaf` → système trouve OPCO + montants automatiquement

```javascript
// Exemple création dossier
POST /api/opco/dossiers {
  "codeNaf": "4791B",          // ← Tapé par commercial
  "candidateId": "...",
  "payload": {...}
}

// Response: OPCO identifiée, montant calculé, PDF généré
→ {
    "opcoCode": "OPCO_COMMERCE",
    "opcoName": "OPCO Commerce",
    "montantAnnuel": 2850,
    "montantTotal": 5700,
    "status": "ENVOYE",
    "dateLimiteEnvoi": "2025-04-21"
  }
```

### Statuts Robustes (11 valeurs)
Réponse OPCO peut être en français/anglais, variantes nombreuses:
- Notre système normalise: `"accepted"` → `ACCEPTE`
- Analyse aussi `responseBody`: `montantAccorde` → `ACCEPTE`
- Fallback logique: pas d'info → `ENVOYE`

### Non-blocage PDF
Si génération PDF échoue:
- ✅ Continué sans PDF
- ✅ Document joint manuellement plus tard
- ✅ Dossier pas bloqué

---

## 🧪 TESTS RECOMMANDÉS (Dola)

### Unit Tests
- [ ] `nafOpcoMapping.getOPCOByNAF()` - tous les codes NAF
- [ ] `franceCompetences.calculateTotalFinancing()` - toutes formations + durées
- [ ] `opcoService.calculateDeadlineStatus()` - délais overdue/urgent/ok

### Integration Tests
- [ ] POST /api/opco/dossiers avec codeNaf → OPCO auto-identifiée
- [ ] GET /api/competences/financing → montants corrects
- [ ] Cycle complet: create → submit → sync → status change

### E2E Tests (avec mock OPCO)
- [ ] Création dossier déclenche PDF generation
- [ ] PDF visibleVisualVous dossier
- [ ] Sync statut change status

---

## 📞 CONTACTS RH & COMMERCIAUX

### Sur Quoi On Compte pour Semaines 2-3?

**Fiti + Aina (Front):**
- UI tableau dossiers OPCO (F04 2.8)
- UI fiche détaillée modal (F04 2.9)
- Intégrer délai alarm (🔴/🟠/🟢 badges)
- Tests UI avec mock data

**Dola (QA):**
- Tests backend OPCO services
- Tests API routes
- Validation délai critiques
- Mock OPCO API pour tests

**Arsène (Direction/Validation):**
- Tester workflow complet
- Validation pour Qualiopi
- Sign-off avant livraison v1

---

## 📝 PROCHAINES ÉTAPES PRIORITAIRES

### ✅ AUJOURD'HUI
1. Merger branche OPCO backend
2. Lancer `npm install` si nouvelles deps
3. Tester routes GET /api/competences/opco/by-naf/{naf}
4. Exécuter POST /api/competences/init pour initialiser BD

### ✅ DEMAIN-JEUDI
1. Fiti commence UI tableau F04 2.8
2. Aina commence UI fiche modal F04 2.9
3. Dola crée test suite backend OPCO

### ✅ SEMAINE 2 (21-25 avril)
1. UI 100% complète
2. Tests 100% complète
3. Intégration OPCO APIs réelles (si credentials reçues)
4. Livraison v1 prête

---

## 🎓 DOCUMENTATION POUR L'ÉQUIPE

**Pour les devs backed:**
- Lire `opco.service.improved.ts` - comprendre flow complet
- Tester avec Postman collection ci-dessous

**Pour les devs front:**
- `opco-init.ts` contient tous les exemples API calls
- Mock data: NAF = 4791B, OPCO = OPCO_COMMERCE

**Pour QA:**
- Test plan: voir section Tests Recommandés ci-dessus

---

## 📚 RESSOURCES

- **Cahier des charges:** `/ProcessIQ/CAHIER_DES_CHARGES.pdf`
- **OPCO API Guide:** `/ProcessIQFileGenerator/OPCO_API_GUIDE.md`
- **Services:** `/ProcessIQFileGenerator/src/services/`
- **Routes:** `/ProcessIQFileGenerator/src/routes/`
- **Init Script:** `/ProcessIQFileGenerator/src/utils/opco-init.ts`

---

**Version:** 1.0  
**Date:** 15 avril 2026  
**Next Review:** 21 avril 2026 (Semaine 2)
