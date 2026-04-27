# Portfolio — Melwin Duquenne

Portfolio personnel one-page construit avec **Vue 3**, **Vite** et **Tailwind CSS v4**. Toutes les données sont externalisées en JSON pour permettre l'ajout de contenu sans toucher au code.

## Stack

- **Vue 3** + Composition API (`<script setup>`)
- **Vite 8**
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`, zéro config file)
- **DM Serif Display** + **Outfit** (Google Fonts)

## Structure du projet

```
portfolio/
├── public/
│   └── images/
│       ├── skills/        # Icônes SVG/PNG des technologies
│       └── projects/      # Captures d'écran des projets
├── src/
│   ├── data/              # ← Tout le contenu est ici
│   │   ├── about.json
│   │   ├── skills.json
│   │   └── projects.json
│   ├── components/
│   │   ├── ui/
│   │   │   ├── NavLink.vue
│   │   │   ├── SectionTitle.vue
│   │   │   ├── SkillBadge.vue
│   │   │   ├── ProjectCard.vue
│   │   │   └── ProjectModal.vue
│   │   ├── layout/
│   │   │   ├── NavBar.vue
│   │   │   └── Footer.vue
│   │   └── sections/
│   │       ├── HeroSection.vue
│   │       ├── AboutSection.vue
│   │       ├── SkillsSection.vue
│   │       ├── ProjectsSection.vue
│   │       └── ContactSection.vue
│   ├── App.vue
│   ├── main.js
│   └── style.css
├── index.html
├── vite.config.js
└── package.json
```

## Données JSON

Tout le contenu du portfolio se modifie uniquement dans `src/data/`. Aucun composant Vue à toucher.

### `about.json`

```json
{
  "name": "Prénom Nom",
  "title": "Développeur Full Stack",
  "intro": "Phrase d'accroche.",
  "email": "email@exemple.com",
  "studies": [
    { "degree": "BTS SIO SLAM", "school": "École", "adress": "Ville", "year": "2021 – 2023" }
  ],
  "experiences": [
    { "role": "Alternance développeur web", "company": "Société", "year": "2024 (1 an)" }
  ]
}
```

### `skills.json`

```json
{
  "categories": [
    {
      "name": "Frontend",
      "skills": [
        { "name": "Vue.js", "icon": "/images/skills/vuejs.svg", "level": 4 }
      ]
    }
  ]
}
```

- `level` : entier de 1 à 5 (affiché en ronds terracotta)
- `icon` : chemin vers `public/images/skills/`

### `projects.json`

```json
{
  "projects": [
    {
      "title": "Mon Projet",
      "description": "Texte court affiché sur la carte.",
      "fullDescription": "Texte long affiché dans le modal (contexte, défis, apprentissages).",
      "features": ["Fonctionnalité 1", "Fonctionnalité 2"],
      "image": "/images/projects/mon-projet.png",
      "github": "https://github.com/user/repo",
      "tags": ["Vue.js", "Node.js"]
    }
  ]
}
```

- `fullDescription` et `features` sont optionnels — la carte fonctionne sans eux
- Si `image` est manquante ou cassée, un fallback élégant (initiale + dégradé) s'affiche

## Sections

| Section | Fichier | Données |
|---|---|---|
| Hero | `HeroSection.vue` | `about.json` |
| À propos | `AboutSection.vue` | `about.json` |
| Compétences | `SkillsSection.vue` | `skills.json` |
| Projets | `ProjectsSection.vue` | `projects.json` |
| Contact | `ContactSection.vue` | `about.json` (email) |

## Fonctionnalités notables

- **Navbar** : fixe, devient opaque + ombre au scroll, menu burger sur mobile
- **Smooth scroll** : navigation par ancre (`#about`, `#skills`, etc.)
- **Modal projet** : clic sur une carte → modal avec description complète, features et lien GitHub. Fermeture via ✕, clic backdrop ou touche `Échap`
- **SkillBadge** : fallback automatique si l'icône est manquante (initiale colorée)
- **ProjectCard** : fallback image élégant, overlay "Voir plus" au hover

## Commandes

```bash
# Développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

## Déploiement

**Netlify** — réglages recommandés :
- Build command : `npm run build`
- Publish directory : `dist`

**Vercel** — détection Vite automatique, aucune configuration nécessaire.

Pas de Vue Router → pas de redirects SPA à configurer.

## Ajouter du contenu

### Nouvelle compétence

Éditer `src/data/skills.json`, ajouter dans la bonne catégorie :
```json
{ "name": "NomTech", "icon": "/images/skills/nomtech.svg", "level": 3 }
```
Déposer l'icône dans `public/images/skills/`.

### Nouveau projet

Éditer `src/data/projects.json`, ajouter un objet dans le tableau `projects`.
Déposer une capture dans `public/images/projects/`.

### Nouvelle catégorie de compétences

Ajouter un objet `{ "name": "Catégorie", "skills": [...] }` dans le tableau `categories` de `skills.json`.
