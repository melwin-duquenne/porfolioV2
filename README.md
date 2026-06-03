# Portfolio — Melwin Duquenne

Portfolio personnel one-page construit avec **Vue 3**, **Vite** et **Tailwind CSS v4**. Toutes les données sont externalisées en JSON pour permettre l'ajout de contenu sans toucher au code.

## Stack

- **Vue 3** + Composition API (`<script setup>`)
- **Vite 8**
- **Tailwind CSS v4** (plugin `@tailwindcss/vite`, zéro config file) + CSS maison dans `style.css`
- **Archivo** + **Playfair Display** + **Space Mono** (Google Fonts)
- Animations maison via composables (Web Animations API, IntersectionObserver)

## Structure du projet

```
portfolio/
├── public/
│   └── images/
│       └── projects/      # Captures d'écran des projets
├── src/
│   ├── data/              # ← Tout le contenu est ici
│   │   ├── about.json
│   │   ├── skills.json
│   │   ├── projects.json
│   │   └── legal.json
│   ├── components/
│   │   ├── ui/
│   │   │   ├── NavLink.vue
│   │   │   ├── SectionHead.vue
│   │   │   ├── SkillCard.vue
│   │   │   ├── SvgIcon.vue
│   │   │   ├── TimelineCol.vue
│   │   │   ├── CustomCursor.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── ProjectCard.vue
│   │   │   ├── ProjectModal.vue
│   │   │   └── LegalModal.vue
│   │   ├── layout/
│   │   │   ├── NavBar.vue
│   │   │   └── Footer.vue
│   │   └── sections/
│   │       ├── HeroSection.vue
│   │       ├── AboutSection.vue
│   │       ├── SkillsSection.vue
│   │       ├── ProjectsSection.vue
│   │       └── ContactSection.vue
│   ├── composables/        # Logique d'animation/scroll réutilisable
│   │   ├── useReveal.js         # reveal-on-scroll (IntersectionObserver + WAAPI)
│   │   ├── useScrollSpy.js      # section active dans la nav + état "scrolled"
│   │   ├── useScrollProgress.js # barre de progression de scroll
│   │   ├── useParallax.js       # parallax du hero (souris + scroll)
│   │   └── useMagnetic.js       # boutons magnétiques au survol
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
  "first": "Prénom",
  "last": "Nom",
  "role": "Développeur Full Stack",
  "email": "email@exemple.com",
  "github": "https://github.com/user",
  "location": "Ville (00), France",
  "formationShort": "Master … · École",
  "intro": "Phrase d'accroche du hero.",
  "lede": "Paragraphe de présentation (À propos). Le HTML inline est autorisé, ex. <em>…</em>.",
  "contactLede": "Phrase d'accroche de la section Contact.",
  "studies": [
    { "degree": "BTS SIO SLAM", "school": "École", "adress": "Ville", "year": "2021 – 2023" }
  ],
  "experiences": [
    { "role": "Alternance développeur web", "company": "Société", "year": "2024 · 1 an" }
  ]
}
```

- `first` / `last` alimentent le hero ; `name` reste utilisé pour le copyright et les mentions légales
- `lede` est rendu en HTML (`v-html`) — contenu de confiance uniquement

### `skills.json`

```json
{
  "marquee": ["Vue 3", "Symfony", "TypeScript", "Docker", "…"],
  "categories": [
    {
      "name": "Frontend",
      "skills": [
        { "name": "Vue.js", "level": 4, "mono": "V", "color": "#42b883", "fg": "#1a1a1a" }
      ]
    }
  ]
}
```

- `marquee` : liste de libellés défilant en boucle en tête de section
- `level` : entier de 1 à 5 (barre de progression)
- `mono` : 1–3 caractères affichés dans la pastille (plus d'images d'icônes)
- `color` : couleur de fond de la pastille
- `fg` : couleur du texte de la pastille (optionnel, blanc par défaut)

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
| Contact | `ContactSection.vue` | `about.json` (email, github, contactLede) |

## Fonctionnalités notables

- **Navbar** : fixe, devient opaque + ombre au scroll, lien actif mis en évidence (scrollspy via `useScrollSpy`)
- **Smooth scroll** : navigation par ancre (`#apropos`, `#competences`, `#projets`, `#contact`)
- **Barre de progression** de scroll en haut de page (`useScrollProgress`)
- **Reveal-on-scroll** : les éléments `.reveal` apparaissent à l'entrée dans le viewport (`useReveal`, Web Animations API)
- **Hero animé** : parallax de la photo (`useParallax`) et entrée des mots du nom
- **Curseur personnalisé** + boutons magnétiques (`CustomCursor`, `useMagnetic`) — désactivés sur écran tactile
- **Accessibilité mouvement** : tout est neutralisé si `prefers-reduced-motion` est actif (flag `anim-on`/`anim-off` posé dans `main.js`)
- **Modales** (`BaseModal`) : projet et mentions légales. Fermeture via ✕, clic backdrop ou touche `Échap`, scroll du body verrouillé
- **Section Compétences** : pastilles `mono`/`color` + barre de niveau ; bandeau marquee
- **ProjectCard** : effet de tilt au survol, fallback image élégant (initiale + dégradé)
- **Contact** : bouton « Copier l'adresse » (clipboard API avec repli silencieux)

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

**Vercel** — détection Vite automatique, aucune configuration nécessaire. Connecte le repo GitHub et déploie en un clic.

Pas de Vue Router → pas de redirects SPA à configurer.

## Ajouter du contenu

### Nouvelle compétence

Éditer `src/data/skills.json`, ajouter dans la bonne catégorie :
```json
{ "name": "NomTech", "level": 3, "mono": "Nt", "color": "#336699", "fg": "#fff" }
```
Aucune image à déposer : la pastille est rendue à partir de `mono` + `color`.
Pour l'ajouter au bandeau défilant, compléter le tableau `marquee`.

### Nouveau projet

Éditer `src/data/projects.json`, ajouter un objet dans le tableau `projects`.
Déposer une capture dans `public/images/projects/`.

### Nouvelle catégorie de compétences

Ajouter un objet `{ "name": "Catégorie", "skills": [...] }` dans le tableau `categories` de `skills.json`.
