# Refonte SEO du portfolio — Design

Date : 2026-06-19
Statut : approuvé

## Contexte

Portfolio one-page **Vue 3 + Vite (SPA)** déployé sur Vercel à
`https://porfolio-v2.vercel.app`. Le `index.html` ne sert qu'un `<div id="app">`
vide : les robots qui n'exécutent pas le JS (réseaux sociaux, Bing, aperçus de
partage) ne voient aucun contenu. Aucune méta-donnée, données structurées,
sitemap ni robots.txt. Objectif : être facilement trouvable, en particulier
par le nom « Melwin Duquenne ».

## Périmètre

### 1. Méta-données statiques (`index.html`)
Écrites en dur dans le template (visibles sans JS) :
- `<title>` + `<meta name="description">` (nom, rôle, stack, localisation)
- Open Graph : `og:title`, `og:description`, `og:url`, `og:image` (1200×630),
  `og:type`, `og:locale=fr_FR`, `og:site_name`, dimensions de l'image
- Twitter Card : `summary_large_image`
- `canonical`, `robots` (index,follow,max-image-preview:large), `author`,
  `theme-color`
- JSON-LD `Person` : `name`, `jobTitle`, `url`, `email`, `image`, `address`,
  `alumniOf`, `knowsAbout`, `sameAs` (GitHub + LinkedIn)

### 2. Prerendering SSG (sans navigateur headless)
- `src/entry-server.js` : `renderToString(createSSRApp(App))`
  (via `vue/server-renderer`, déjà fourni par `vue` — pas de dépendance runtime)
- `src/main.js` : `createApp` → `createSSRApp` (hydratation, pas de flash)
- `scripts/prerender.mjs` : injecte le HTML rendu dans `dist/index.html`
- `package.json` :
  `build = vite build && vite build --ssr src/entry-server.js --outDir .ssr-dist && node scripts/prerender.mjs`
- Tout l'accès aux API navigateur étant dans `onMounted`/handlers, le rendu
  serveur est sûr (vérifié dans le code existant).

### 3. `robots.txt` + `sitemap.xml` (`public/`)

### 4. og:image de marque (1200×630)
- `scripts/gen-og.mjs` : SVG de marque rasterisé en PNG via `@resvg/resvg-js`
  (devDependency), `public/og-image.png` commité, regénérable.

### 5. Bouton LinkedIn (demande utilisateur)
- `about.json` : champ `linkedin`
  (`https://www.linkedin.com/in/melwin-duquenne-89b55024b/`)
- `SvgIcon.vue` : icône `linkedin`
- `ContactSection.vue` : lien social LinkedIn
- LinkedIn ajouté au `sameAs` du JSON-LD.

## Repli
Si le double build SSR échoue (Vite 8 très récent), on conserve les sections
1, 3, 4, 5 — qui apportent l'essentiel du gain de findabilité.

## Vérification
- `npm run build` réussit.
- `dist/index.html` contient le texte rendu (nom, sections) + toutes les balises.
- Hydratation sans erreur en `npm run preview`.
