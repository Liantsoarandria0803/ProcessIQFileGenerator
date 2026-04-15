# Guide des APIs OPCO Réelles en France

## 📍 Les Principaux OPCOs avec APIs

### 1️⃣ **OPCO 2i** (Interindustriel & Technologie)
- **Site officiel** : https://www.opco2i.fr
- **Portail de gestion** : https://www.opco2i.fr/formation/entreprises
- **Documentation API** : https://www.opco2i.fr/api (accès sur demande)
- **Contact** : api@opco2i.fr ou 0800 946 246
- **Format** : REST JSON over HTTPS
- **Authentification** : API Key + OAuth 2.0
- **Principales routes** :
  - `POST /dossiers` - Créer un dossier
  - `GET /dossiers/{id}` - Récupérer statut
  - `PATCH /dossiers/{id}` - Modifier dossier

### 2️⃣ **OPCO EP** (Entreprises de Proximité)
- **Site officiel** : https://www.opcoetp.fr
- **Portail** : https://mon.opcoetp.fr
- **API**: https://api.opcoetp.fr (demande accès partenaire)
- **Documentation** : https://docs.opcoetp.fr/api
- **Contact** : partenaires@opcoetp.fr
- **Format** : REST + SOAP (legacy)
- **Authentification** : Certificate + API Key

### 3️⃣ **OPCO Mobilités** (Transport & Logistique)
- **Site officiel** : https://www.opco-mobilites.fr
- **Portail** : https://moncompte.opco-mobilites.fr
- **API** : https://api.opco-mobilites.fr
- **Documentation** : https://dev.opco-mobilites.fr
- **Contact** : integration@opco-mobilites.fr
- **Format** : REST JSON + WebServices

### 4️⃣ **AKTO** (Branches généralistes & services)
- **Site officiel** : https://www.akto.fr
- **Portail** : https://espace-entreprise.akto.fr
- **API** : https://api.akto.fr
- **Documentation** : https://developer.akto.fr
- **Contact** : dev-support@akto.fr
- **Format** : REST JSON + GraphQL

### 5️⃣ **Atlas** (Services financiers & assurances)
- **Site officiel** : https://www.atlas.fr
- **Portail** : https://www.atlas.fr/espace-entreprise
- **API** : https://api.atlas.fr
- **Documentation** : https://api-doc.atlas.fr
- **Contact** : api@atlas.fr

### 6️⃣ **OCAPIAT** (Agriculture & Agroalimentaire)
- **Site officiel** : https://www.ocapiat.fr
- **API** : https://api.ocapiat.fr (demande accès)
- **Documentation** : https://wiki.ocapiat.fr/api
- **Contact** : support-api@ocapiat.fr

### 7️⃣ **Constructys** (Bâtiment & Travaux Publics)
- **Site officiel** : https://www.constructys.fr
- **Portail** : https://www.constructys.fr/services-entreprises
- **API** : https://api.constructys.fr
- **Documentation** : https://dev.constructys.fr
- **Contact** : api@constructys.fr

---

## 🔑 Comment Accéder aux APIs

### Démarche Standard

1. **S'inscrire comme partenaire** auprès de chaque OPCO
   - Besoin: Numéro SIRET, Responsable technique, Cahier des charges
   - Délai: 2-4 semaines généralement

2. **Demander les identifiants API**
   - Client ID + Client Secret (OAuth)
   - Ou API Key simple
   - Certificats SSL (pour OPCO EP)

3. **Accéder à la documentation développeur**
   - Swagger/OpenAPI (OPCO 2i, AKTO, Atlas)
   - Postman collections
   - Exemples code (Python, Node.js, Java)

4. **Tester en environnement SANDBOX**
   - Base URL: `https://sandbox-api.opco-*.fr`
   - Données de test fourniesproviders

5. **Déployer en PRODUCTION**
   - Base URL: `https://api.opco-*.fr`
   - Certificats SSL obligatoires

---

## 📝 Exemples de Payloads par OPCO

### OPCO 2i - Créer un dossier

```json
POST https://api.opco2i.fr/dossiers

{
  "candidat": {
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@email.com",
    "telephone": "0612345678"
  },
  "employeur": {
    "siret": "12345678901234",
    "raison_sociale": "ACME Corp",
    "adresse": "123 Rue de Paris",
    "code_postal": "75001",
    "ville": "Paris",
    "code_naf": "6419Z"
  },
  "contrat": {
    "type": "apprentissage",
    "date_debut": "2025-09-01",
    "date_fin": "2027-09-01",
    "formation": "BTS MCO",
    "code_rncp": "RNCP38152",
    "duree_hebdomadaire": 35,
    "montant_financement": 6500
  },
  "documents": [
    {
      "type": "convention",
      "url": "https://monapi.com/documents/conv-123.pdf",
      "filename": "convention_apprentissage.pdf"
    },
    {
      "type": "cerfa",
      "url": "https://monapi.com/documents/cerfa-123.pdf",
      "filename": "cerfa_2.pdf"
    }
  ]
}
```

**Réponse succès (201)**:
```json
{
  "id": "DOS-2025-001234",
  "numero_dossier": "2025/001234",
  "status": "submitted",
  "date_reception": "2025-01-15T10:30:00Z",
  "montant_accorde": 6500,
  "url_suivi": "https://www.opco2i.fr/suivi/DOS-2025-001234"
}
```

### AKTO - Créer un dossier

```json
POST https://api.akto.fr/v2/dossiers

{
  "apprenti": {
    "nom_complet": "Jean DUPONT",
    "email": "jean.dupont@email.com"
  },
  "entreprise": {
    "siret": "12345678901234",
    "raison_sociale": "ACME Corp"
  },
  "contrat": {
    "date_debut_execution": "2025-09-01",
    "intitule_diplome": "BTS MCO",
    "code_rncp": "RNCP38152"
  },
  "type": "apprentissage"
}
```

**Réponse succès (200)**:
```json
{
  "numero_dossier": "AKTO-2025-98765",
  "statut": "enregistre",
  "message": "Dossier créé avec succès",
  "lien_suivi": "https://espace-entreprise.akto.fr/dossiers/AKTO-2025-98765"
}
```

### Atlas - Créer un dossier

```json
POST https://api.atlas.fr/apprentissage/dossiers

Authorization: Bearer <access_token>

{
  "apprentice": {
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean@email.com"
  },
  "employer": {
    "siret": "12345678901234",
    "companyName": "ACME Corp"
  },
  "contract": {
    "startDate": "2025-09-01",
    "training": "BTS MCO",
    "rncp": "RNCP38152"
  }
}
```

---

## 🧪 Tester les APIs

### Avec cURL

```bash
# Test OPCO 2i
curl -X POST https://sandbox-api.opco2i.fr/dossiers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @payload.json

# Récupérer statut
curl -X GET https://sandbox-api.opco2i.fr/dossiers/DOS-2025-001234 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Avec Postman

1. Importer collection depuis: https://www.postman.com/opco-2i
2. Configurer variables d'environnement:
   - `{{base_url}}` = https://sandbox-api.opco2i.fr
   - `{{api_key}}` = votre clé API
   - `{{client_id}}` = votre client ID

### Avec Python

```python
import requests

api_key = "YOUR_API_KEY"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "candidat": { ... },
    "employeur": { ... },
    "contrat": { ... }
}

response = requests.post(
    "https://api.opco2i.fr/dossiers",
    json=payload,
    headers=headers
)

print(response.json())  # {"id": "DOS-...", "status": "submitted"}
```

---

## 📊 Dashboard de Suivi

Chaque OPCO fournit un portail pour suivre les dossiers:

| OPCO | URL Portail | Accès |
|------|------------|-------|
| **OPCO 2i** | https://www.opco2i.fr/suivi | Login entreprise |
| **OPCO EP** | https://mon.opcoetp.fr/dossiers | Login + MFA |
| **AKTO** | https://espace-entreprise.akto.fr | Login entreprise |
| **Atlas** | https://www.atlas.fr/espace-entreprise | Login |
| **Constructys** | https://www.constructys.fr/suivi-dossiers | Login entreprise |

---

## ⚙️ Configuration dans ProcessIQ

Une fois que vous avez vos identifiants OPCO, configurez le `.env`:

```env
# Pour OPCO 2i
OPCO_ENABLED=true
OPCO_NAME=OPCO 2i
OPCO_API_BASE_URL=https://api.opco2i.fr
OPCO_API_KEY=sk-opco2i-xxxxxxxxxxxx
OPCO_API_KEY_HEADER=Authorization
OPCO_CLIENT_ID=your_client_id
OPCO_CLIENT_SECRET=your_client_secret
OPCO_CREATE_DOSSIER_PATH=/dossiers
OPCO_STATUS_PATH=/dossiers/{externalId}
OPCO_TIMEOUT_MS=15000
```

---

## 📞 Support & Partenariats

**Pour demander l'accès API** :

1. **Préparez lors de votre demande** :
   - SIRET de votre organisation
   - Nombre de dossiers par mois estimé
   - Responsable technique (nom, email, tel)
   - Cas d'usage (apprentissage, formation continue, etc.)

2. **Contact selon OPCO** :
   ```
   OPCO 2i: api@opco2i.fr
   OPCO EP: partenaires@opcoetp.fr
   AKTO: dev-support@akto.fr
   Atlas: api@atlas.fr
   Constructys: api@constructys.fr
   ```

3. **Délai d'accès** : 2-4 semaines après validation

---

## 🚀 Prochaines étapes

1. ✅ Identifier votre OPCO principal (par secteur NAF)
2. ✅ Demander accès API (contacter support)
3. ✅ Récupérer identifiants (API Key, OAuth, etc.)
4. ✅ Tester avec notre service `opco.service.ts`
5. ✅ Configurer `.env` avec vos identifiants
6. ✅ Déployer en production

Besoin d'aide pour identifier **quel OPCO est applicable** à votre entreprise ? 🎓
