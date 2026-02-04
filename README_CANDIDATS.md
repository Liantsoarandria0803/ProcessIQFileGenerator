# API Candidats - Node.js TypeScript

## Vue d'ensemble

Cette API gère les candidats avec leurs informations personnelles complètes, transcrite depuis le backend Python/FastAPI vers Node.js/Express avec TypeScript.

## Endpoints

### 1. Créer un nouveau candidat
**POST** `/api/admission/candidates`

Crée un nouveau candidat avec toutes ses informations personnelles.

**Body:**
```json
{
  "prenom": "Jean",
  "nom_naissance": "Dupont",
  "nom_usage": "Dupont-Martin",
  "sexe": "Masculin",
  "date_naissance": "2000-01-15",
  "nationalite": "France",
  "commune_naissance": "Paris",
  "departement": "75",
  "adresse_residence": "123 rue de la Paix",
  "code_postal": 75001,
  "ville": "Paris",
  "email": "jean.dupont@example.com",
  "telephone": "0612345678",
  "bac": "Baccalauréat général",
  "formation_souhaitee": "BTS MCO",
  "alternance": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Candidat créé avec succès",
  "record_id": "recXXXXXXXXXXXXXX",
  "candidate_info": { ... }
}
```

---

### 2. Mettre à jour un candidat
**PUT** `/api/admission/candidates/:recordId`

Met à jour les informations personnelles d'un candidat existant.

**Parameters:**
- `recordId` (path): ID du candidat dans Airtable

**Body:** Même structure que POST

**Response:**
```json
{
  "success": true,
  "message": "Informations mises à jour avec succès",
  "record_id": "recXXXXXXXXXXXXXX",
  "candidate_info": { ... }
}
```

---

### 3. Récupérer le profil d'un candidat
**GET** `/api/admission/candidates/:recordId`

Récupère le profil complet d'un candidat (informations + documents).

**Parameters:**
- `recordId` (path): ID du candidat dans Airtable

**Response:**
```json
{
  "record_id": "recXXXXXXXXXXXXXX",
  "informations_personnelles": {
    "prenom": "Jean",
    "nom_naissance": "Dupont",
    "email": "jean.dupont@example.com",
    ...
  },
  "documents": {
    "cv": true,
    "cin": false,
    "lettre_motivation": true,
    "carte_vitale": false,
    "dernier_diplome": true
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-20T14:25:00Z"
}
```

---

### 4. Supprimer un candidat
**DELETE** `/api/admission/candidates/:recordId`

Supprime complètement une candidature (Airtable + fichiers locaux).

**Parameters:**
- `recordId` (path): ID du candidat dans Airtable

**Response:**
```json
{
  "success": true,
  "message": "Candidature supprimée avec succès",
  "record_id": "recXXXXXXXXXXXXXX",
  "deleted_files": 5
}
```

---

## Structure des données

### InformationsPersonnelles

```typescript
interface InformationsPersonnelles {
  // Section 1: Informations personnelles
  prenom: string;
  nom_naissance: string;
  nom_usage?: string;
  sexe: string;
  date_naissance: string; // Format ISO: "2000-01-15"
  nationalite: string;
  commune_naissance: string;
  departement: string;

  // Représentant légal principal
  nom_representant_legal?: string;
  prenom_representant_legal?: string;
  voie_representant_legal?: string;
  lien_parente_legal?: string;
  numero_adress_legal?: string;
  complement_adresse_legal?: string;
  code_postal_legal?: number;
  commune_legal?: string;
  courriel_legal?: string;

  // Représentant légal secondaire
  nom_representant_legal2?: string;
  prenom_representant_legal2?: string;
  voie_representant_legal2?: string;
  lien_parente_legal2?: string;
  numero_adress_legal2?: string;
  complement_adresse_legal2?: string;
  code_postal_legal2?: number;
  commune_legal2?: string;
  courriel_legal2?: string;

  // Section 2: Coordonnées
  adresse_residence: string;
  code_postal: number;
  ville: string;
  email: string;
  telephone: string;
  nir?: string;

  // Section 3: Situations & déclarations
  situation?: string;
  regime_social?: string;
  declare_inscription_sportif_haut_niveau?: boolean;
  declare_avoir_projet_creation_reprise_entreprise?: boolean;
  declare_travailleur_handicape?: boolean;
  alternance?: boolean;

  // Section 4: Parcours scolaire
  dernier_diplome_prepare?: string;
  derniere_classe?: string;
  bac: string;
  intitulePrecisDernierDiplome?: string;

  // Section 5: Formation souhaitée
  formation_souhaitee?: string;
  date_de_visite?: string;
  date_de_reglement?: string;
  entreprise_d_accueil?: string;

  // Section 6: Informations supplémentaires
  connaissance_rush_how?: string;
  motivation_projet_professionnel?: string;
}
```

---

## Validation

### Email
- Format: `example@domain.com`
- Automatiquement converti en minuscules

### Téléphone
- Formats acceptés: `0612345678`, `+33612345678`, `06 12 34 56 78`
- Automatiquement normalisé en format international (`+33...`)

### Âge
- Minimum: 8 ans
- Validé par rapport à la `date_naissance`

---

## Mapping Airtable

Le service gère automatiquement la conversion entre:
- Les structures TypeScript → Champs Airtable (création/mise à jour)
- Les champs Airtable → Structures TypeScript (lecture)

### Conversions automatiques:
- **Booléens** → "Oui"/"Non" pour Airtable
- **Téléphone** → Format international (+33)
- **Email** → Minuscules
- **Code postal** → String pour Airtable, Number en TypeScript

---

## Comparaison Python vs TypeScript

| Aspect | Python (FastAPI) | TypeScript (Express) |
|--------|-----------------|---------------------|
| **Service** | `AdmissionService` | `AdmissionService` |
| **Repository** | `CandidatRepository` | `CandidatRepository` |
| **Validation** | Pydantic models | Fonctions custom |
| **Types** | Pydantic BaseModel | Interfaces TypeScript |
| **Async** | `async def` | `async/await` |
| **Errors** | `HTTPException` | Status codes + JSON |

---

## Utilisation

### Démarrer le serveur
```bash
cd backend/node-api
npm install
npm run dev
```

### Tester les endpoints

```bash
# Créer un candidat
curl -X POST http://localhost:3000/api/admission/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "prenom": "Jean",
    "nom_naissance": "Dupont",
    "sexe": "Masculin",
    "date_naissance": "2000-01-15",
    "nationalite": "France",
    "commune_naissance": "Paris",
    "departement": "75",
    "adresse_residence": "123 rue de la Paix",
    "code_postal": 75001,
    "ville": "Paris",
    "email": "jean.dupont@example.com",
    "telephone": "0612345678",
    "bac": "Baccalauréat général"
  }'

# Récupérer un candidat
curl http://localhost:3000/api/admission/candidates/recXXXXXXXXXXXXXX

# Mettre à jour un candidat
curl -X PUT http://localhost:3000/api/admission/candidates/recXXXXXXXXXXXXXX \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Supprimer un candidat
curl -X DELETE http://localhost:3000/api/admission/candidates/recXXXXXXXXXXXXXX
```

---

## Fichiers créés

1. **Types**: `/src/types/admission.ts` - Interfaces TypeScript
2. **Service**: `/src/services/admissionService.ts` - Logique métier
3. **Routes**: `/src/routes/admission.ts` - Endpoints Express (ajoutés)

---

## Notes importantes

- ✅ Toutes les routes Python ont été transcrites
- ✅ Validation des emails et téléphones implémentée
- ✅ Mapping complet Airtable ↔ TypeScript
- ✅ Gestion d'erreurs avec codes HTTP appropriés
- ✅ Documentation Swagger intégrée
- ⚠️ La suppression des fichiers locaux reste à implémenter complètement
