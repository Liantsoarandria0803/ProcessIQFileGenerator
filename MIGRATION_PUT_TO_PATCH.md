# Migration PUT vers PATCH

**Date**: 12 février 2026  
**Objectif**: Remplacer les méthodes PUT par PATCH pour les mises à jour partielles

---

## Changements effectués

### 1. Route entreprises

**Avant:**
```
PUT /api/admission/entreprises/:id
```

**Après:**
```
PATCH /api/admission/entreprises/:id
```

**Impact:**
- Permet la mise à jour partielle (seuls les champs fournis sont modifiés)
- Les champs non fournis conservent leur valeur actuelle
- Évite l'écrasement complet des données

---

### 2. Route candidats

**Avant:**
```
PUT /api/admission/candidates/:recordId
```

**Après:**
```
PATCH /api/admission/candidates/:recordId
```

**Impact:**
- Permet la mise à jour partielle des informations personnelles
- Les champs non fournis conservent leur valeur actuelle
- Évite l'écrasement complet des données

---

## Différence entre PUT et PATCH

### PUT (avant)
- Remplacement complet de la ressource
- Tous les champs doivent être fournis
- Les champs manquants sont supprimés/réinitialisés
- Méthode idempotente

### PATCH (après)
- Modification partielle de la ressource
- Seuls les champs à modifier doivent être fournis
- Les champs non fournis restent inchangés
- Méthode idempotente

---

## Exemples d'utilisation

### Mise à jour partielle d'un candidat

**Requête:**
```bash
curl -X PATCH http://localhost:8001/api/admission/candidates/rec123 \
  -H "Content-Type: application/json" \
  -d '{
    "Téléphone": "+33612345678"
  }'
```

**Résultat:**
- Seul le téléphone est mis à jour
- Tous les autres champs (nom, prénom, email, etc.) restent inchangés

### Mise à jour partielle d'une entreprise

**Requête:**
```bash
curl -X PATCH http://localhost:8001/api/admission/entreprises/rec456 \
  -H "Content-Type: application/json" \
  -d '{
    "Téléphone entreprise": "+33123456789",
    "Email entreprise": "contact@entreprise.fr"
  }'
```

**Résultat:**
- Seuls le téléphone et l'email sont mis à jour
- Tous les autres champs (raison sociale, SIRET, adresse, etc.) restent inchangés

---

## Rétrocompatibilité

Les anciennes routes PUT ne sont plus disponibles. Les clients doivent migrer vers PATCH:

| Ancienne route (PUT) | Nouvelle route (PATCH) | Statut |
|---------------------|------------------------|--------|
| `PUT /api/admission/entreprises/:id` | `PATCH /api/admission/entreprises/:id` | ✅ Migré |
| `PUT /api/admission/candidates/:recordId` | `PATCH /api/admission/candidates/:recordId` | ✅ Migré |

---

## Tests de validation

### Test 1: Route PATCH fonctionne
```bash
curl -X PATCH http://localhost:8001/api/admission/candidates/rec123 \
  -H "Content-Type: application/json" \
  -d '{"Téléphone": "+33612345678"}'
```
**Résultat attendu:** HTTP 200 (si le record existe) ou HTTP 404 (si non trouvé)

### Test 2: Route PUT n'existe plus
```bash
curl -X PUT http://localhost:8001/api/admission/candidates/rec123 \
  -H "Content-Type: application/json" \
  -d '{"Téléphone": "+33612345678"}'
```
**Résultat attendu:** HTTP 404 (route non trouvée)

---

## Documentation Swagger mise à jour

Les endpoints dans la documentation Swagger ont été mis à jour:

- Description modifiée: "Met à jour **partiellement**..." au lieu de "Met à jour toutes..."
- Méthode HTTP: `patch` au lieu de `put`
- Schéma inchangé (même structure de requête)

---

## Avantages de cette migration

1. **Sécurité**: Évite la perte accidentelle de données par écrasement complet
2. **Performance**: Moins de données à transférer (uniquement les champs modifiés)
3. **Flexibilité**: Permet des mises à jour ciblées sans connaître tous les champs
4. **Standard REST**: PATCH est la méthode recommandée pour les mises à jour partielles
5. **Simplicité**: Le client n'a pas besoin de récupérer toutes les données avant de modifier un champ

---

## Fichiers modifiés

- `/backend/node-api/src/routes/admission.ts`
  - Ligne ~444: Documentation Swagger entreprise (put → patch)
  - Ligne ~485: Route entreprise (router.put → router.patch)
  - Ligne ~617: Documentation Swagger candidat (put → patch)
  - Ligne ~646: Route candidat (router.put → router.patch)
