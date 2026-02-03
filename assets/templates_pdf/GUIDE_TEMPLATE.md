# 📝 Guide de création du Template CV

## 🎯 Comment créer votre template.docx

### Étape 1: Ouvrir Word/LibreOffice

Prenez votre CV modèle (comme celui d'Ezechiel Monrou) et remplacez les données par des **placeholders** (balises).

### Étape 2: Syntaxe des placeholders

Utilisez la syntaxe **Jinja2** :

```
{{ variable }}           → Affiche une variable
{% for item in liste %}  → Boucle sur une liste
{% endfor %}             → Fin de boucle
{% if condition %}       → Condition
{% endif %}              → Fin de condition
```

### Étape 3: Variables disponibles

#### Informations personnelles
| Placeholder | Description |
|------------|-------------|
| `{{ full_name }}` | Nom complet |
| `{{ email }}` | Email |
| `{{ phone }}` | Téléphone |
| `{{ address }}` | Adresse |
| `{{ linkedin }}` | LinkedIn (optionnel) |
| `{{ portfolio }}` | Portfolio (optionnel) |
| `{{ summary }}` | Résumé/Profil |

#### Expériences (boucle)
```
{% for exp in experiences %}
{{ exp.job_title }} - {{ exp.company }}
({{ exp.start_date }} - {{ exp.end_date }})
{% for line in exp.description_lines %}
• {{ line }}
{% endfor %}
{% endfor %}
```

#### Formation (boucle)
```
{% for edu in education %}
{{ edu.degree }}
({{ edu.start_date }} - {{ edu.end_date }}, {{ edu.institution }})
{{ edu.description }}
{% endfor %}
```

#### Compétences (boucle)
```
{% for skill in skills %}
• {{ skill.display }}
{% endfor %}
```

#### Langues (boucle)
```
{% for lang in languages %}
• {{ lang.display }}
{% endfor %}
```

#### Centres d'intérêt (boucle)
```
{% for hobby in hobbies %}
• {{ hobby }}
{% endfor %}
```

### Étape 4: Exemple de template

Voici à quoi devrait ressembler votre template :

```
┌──────────────────┬────────────────────────────────────┐
│    COLONNE       │        COLONNE DROITE              │
│    GAUCHE        │                                    │
│                  │   {{ full_name }}                  │
│  CONTACT         │   Candidat                         │
│  ──────────      │                                    │
│  {{ phone }}     │   PROFIL                           │
│  {{ email }}     │   ──────────                       │
│  {{ address }}   │   {{ summary }}                    │
│                  │                                    │
│  COMPETENCES     │   FORMATION                        │
│  ──────────      │   ──────────                       │
│  {% for skill    │   {% for edu in education %}       │
│  in skills %}    │   {{ edu.degree }}                 │
│  • {{ skill.     │   ({{ edu.start_date }} -          │
│  display }}      │   {{ edu.end_date }},              │
│  {% endfor %}    │   {{ edu.institution }})           │
│                  │   {% endfor %}                     │
│  LANGUES         │                                    │
│  ──────────      │   EXPERIENCES                      │
│  {% for lang     │   ──────────                       │
│  in languages %} │   {% for exp in experiences %}     │
│  • {{ lang.      │   {{ exp.job_title }} -            │
│  display }}      │   {{ exp.company }}                │
│  {% endfor %}    │   ({{ exp.start_date }} -          │
│                  │   {{ exp.end_date }})              │
│  CENTRES         │   {% for line in                   │
│  D'INTERET       │   exp.description_lines %}         │
│  ──────────      │   • {{ line }}                     │
│  {% for hobby    │   {% endfor %}                     │
│  in hobbies %}   │   {% endfor %}                     │
│  • {{ hobby }}   │                                    │
│  {% endfor %}    │                                    │
└──────────────────┴────────────────────────────────────┘
```

### Étape 5: Sauvegarder

Sauvegardez votre fichier template sous:
```
backend/app/templates/template.docx
```

### 🚨 Important

1. **Gardez le design** : Le template conservera toutes les polices, couleurs, mises en page
2. **Testez les boucles** : Assurez-vous que les boucles `{% for %}...{% endfor %}` sont sur des lignes séparées
3. **Vérifiez les espaces** : Les placeholders doivent être exactement comme indiqué

### 📌 Placeholders rapides à copier-coller

```
{{ full_name }}
{{ email }}
{{ phone }}
{{ address }}
{{ summary }}

{% for exp in experiences %}
{{ exp.job_title }}
{{ exp.company }}
{{ exp.start_date }}
{{ exp.end_date }}
{% for line in exp.description_lines %}
{{ line }}
{% endfor %}
{% endfor %}

{% for edu in education %}
{{ edu.degree }}
{{ edu.institution }}
{{ edu.start_date }}
{{ edu.end_date }}
{% endfor %}

{% for skill in skills %}
{{ skill.display }}
{% endfor %}

{% for lang in languages %}
{{ lang.display }}
{% endfor %}

{% for hobby in hobbies %}
{{ hobby }}
{% endfor %}
```
