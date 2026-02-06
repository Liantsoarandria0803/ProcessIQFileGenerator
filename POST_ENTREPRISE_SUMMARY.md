# ✅ Transcription POST Entreprise - Python → TypeScript

## 🎯 Fichiers créés/modifiés

### 1. Types TypeScript
**Fichier**: `src/types/ficheEntreprise.ts` ✅

Sous-modèles créés :
- `IdentificationEntreprise` : Raison sociale, SIRET, NAF, type employeur, etc.
- `AdresseEntreprise` : Adresse complète de l'entreprise
- `MaitreApprentissage` : Informations du maître d'apprentissage
- `InformationsOPCO` : Nom de l'OPCO
- `InformationsContrat` : Toutes les informations du contrat (dates, salaires, SMIC, périodes)
- `FormationMissions` : Missions et formation interne

Modèle principal :
- `FicheRenseignementEntreprise` : Agrège tous les sous-modèles
- `FicheRenseignementEntrepriseResponse` : Réponse de création

### 2. Repository Entreprise
**Fichier**: `src/repositories/entrepriseRepository.ts` ✅

Méthode ajoutée :
- `create(fiche: FicheRenseignementEntreprise): Promise<string>`
  - Mappe toutes les données vers les colonnes Airtable
  - Gère tous les champs optionnels
  - Retourne l'ID du record créé

### 3. Routes Express
**Fichier**: `src/routes/admission.ts` ✅

Route ajoutée :
```typescript
POST /api/admission/entreprises
```

Fonctionnalités :
- Validation des données entrantes
- Création de la fiche entreprise via repository
- Gestion des erreurs avec logs détaillés
- Documentation Swagger complète

### 4. Schémas Swagger
**Fichier**: `src/config/swagger.ts` ✅

Schémas ajoutés :
- `IdentificationEntreprise`
- `AdresseEntreprise`
- `MaitreApprentissage`
- `InformationsOPCO`
- `InformationsContrat`
- `FormationMissions`
- `FicheRenseignementEntreprise`
- `FicheRenseignementEntrepriseResponse`

## 📊 Mapping des colonnes Airtable

### Identification
```typescript
'Raison sociale' ← identification.raison_sociale
'Numéro SIRET' ← identification.siret
'Code APE/NAF' ← identification.code_ape_naf
'Type demployeur' ← identification.type_employeur
"Effectif salarié de l'entreprise" ← identification.nombre_salaries
'Convention collective' ← identification.convention_collective
```

### Adresse
```typescript
'Numéro entreprise' ← adresse.numero
'Voie entreprise' ← adresse.voie
'Complément dadresse entreprise' ← adresse.complement
'Code postal entreprise' ← adresse.code_postal
'Ville entreprise' ← adresse.ville
'Téléphone entreprise' ← adresse.telephone
'Email entreprise' ← adresse.email
```

### Maître d'apprentissage
```typescript
'Nom Maître apprentissage' ← maitre_apprentissage.nom
'Prénom Maître apprentissage' ← maitre_apprentissage.prenom
'Date de naissance Maître apprentissage' ← maitre_apprentissage.date_naissance
'Fonction Maître apprentissage' ← maitre_apprentissage.fonction
'Diplôme Maître apprentissage' ← maitre_apprentissage.diplome_plus_eleve
'Année experience pro Maître apprentissage' ← maitre_apprentissage.annees_experience
'Téléphone Maître apprentissage' ← maitre_apprentissage.telephone
'Email Maître apprentissage' ← maitre_apprentissage.email
```

### Contrat
```typescript
'Type de contrat' ← contrat.type_contrat
'Type de dérogation' ← contrat.type_derogation
'Date de début de formation pratique chez employeur' ← contrat.date_debut
'Fin du contrat apprentissage' ← contrat.date_fin
'Durée hebdomadaire' ← contrat.duree_hebdomadaire
'Poste occupé' ← contrat.poste_occupe
'Lieu dexécution du contrat (si différent du siège)' ← contrat.lieu_execution

// SMIC et salaires
'Pourcentage du SMIC 1' ← contrat.pourcentage_smic1
'SMIC 1' ← contrat.smic1
'Salaire brut mensuel 1' ← contrat.montant_salaire_brut1
... (4 périodes de SMIC et salaires)

// Dates des périodes
'date_debut_2periode_1er_annee' ← contrat.date_debut_2periode_1er_annee
'date_fin_2periode_1er_annee' ← contrat.date_fin_2periode_1er_annee
... (toutes les périodes des 4 années)
```

### OPCO & Formation
```typescript
'Nom OPCO' ← opco.nom_opco
'Missions' ← formation_missions.missions
'Formation interne' ← formation_missions.formation_interne
```

### Lien avec le candidat
```typescript
'recordIdetudiant' ← record_id_etudiant
```

## 🚀 Test de la route

### Exemple de requête

```bash
curl -X POST http://localhost:8001/api/admission/entreprises \
  -H "Content-Type: application/json" \
  -d '{
    "identification": {
      "raison_sociale": "Entreprise ABC",
      "siret": "12345678901234",
      "code_ape_naf": "6201Z",
      "type_employeur": "Entreprise privée",
      "nombre_salaries": 50,
      "convention_collective": "Syntec"
    },
    "adresse": {
      "numero": "123",
      "voie": "Avenue des Champs-Élysées",
      "code_postal": 75008,
      "ville": "Paris",
      "telephone": "0123456789",
      "email": "contact@entreprise-abc.fr"
    },
    "maitre_apprentissage": {
      "nom": "Martin",
      "prenom": "Pierre",
      "fonction": "Responsable technique",
      "diplome_plus_eleve": "Master",
      "email": "p.martin@entreprise-abc.fr"
    },
    "opco": {
      "nom_opco": "OPCO Atlas"
    },
    "record_id_etudiant": "recXXXXXXXXXXXXXX"
  }'
```

### Réponse attendue

```json
{
  "success": true,
  "message": "Fiche entreprise créée avec succès",
  "record_id": "recYYYYYYYYYYYYYY",
  "entreprise_info": {
    "identification": { ... },
    "adresse": { ... },
    ...
  }
}
```

## 📚 Documentation Swagger

Après redémarrage du serveur, accédez à : **http://localhost:8001/api-docs**

Route disponible :
- `POST /api/admission/entreprises` : Créer une fiche entreprise

## ✅ Checklist

- [x] Types TypeScript créés (ficheEntreprise.ts)
- [x] Export des types ajouté (types/index.ts)
- [x] Méthode `create` dans EntrepriseRepository
- [x] Route POST /entreprises dans admission.ts
- [x] Schémas Swagger ajoutés
- [x] Mapping Airtable complet (tous les champs)
- [x] Gestion des erreurs
- [x] Logs détaillés
- [ ] Serveur redémarré
- [ ] Tests de la route

## ⚠️ Points importants

1. **Tous les champs sont optionnels** sauf `record_id_etudiant` (requis pour lier à un candidat)
2. **Le mapping Airtable est exact** - copié du code Python
3. **Les noms de colonnes Airtable** utilisent des apostrophes typographiques (')
4. **Le serveur se recharge automatiquement** avec ts-node-dev

## 🎯 Prochaines étapes

1. Redémarrer le serveur si nécessaire
2. Tester la création d'une fiche entreprise via Swagger
3. Vérifier que les données sont correctement enregistrées dans Airtable
4. Implémenter les autres routes (GET, PUT, DELETE) si nécessaire
