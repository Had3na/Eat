# Installer NÉON CUISINE sur ton téléphone (Android)

> ⚠️ Un `.exe` est un programme **Windows** : il ne s'installe pas sur Android.
> Sur Android, le format natif est l'`.apk`. Mais le plus simple et le plus
> rapide est d'installer l'app en **PWA** (un seul tap, sans store).

## Option A — PWA en 1 tap (recommandé, le plus rapide)

L'app est une **Progressive Web App** : installable directement depuis le
navigateur, plein écran, icône sur l'écran d'accueil, fonctionne hors-ligne.

1. Le déploiement **GitHub Pages** est automatique à chaque push sur `main`
   (workflow `.github/workflows/pages.yml`). Après le 1er déploiement, l'URL est :

   ```
   https://had3na.github.io/Eat/
   ```

   > Activation : dans le dépôt → **Settings → Pages → Source = GitHub Actions**
   > (le workflow tente de l'activer automatiquement). Le 1er run publie le site.

2. Sur ton **Android**, ouvre cette URL dans **Chrome**.
3. Menu **⋮** → **« Installer l'application »** (ou la bannière « Installer »
   qui apparaît, ou le bouton néon ⬇️ en bas à droite).
4. L'icône Néon Cuisine apparaît sur ton écran d'accueil. ✅

> iPhone : Safari → bouton **Partager** → **« Sur l'écran d'accueil »**.

## Option B — Un vrai fichier `.apk` (sideload / Play Store)

Si tu veux absolument un fichier installable `.apk` (ex. pour le partager) :

1. Va sur **https://www.pwabuilder.com**
2. Colle l'URL de la PWA : `https://had3na.github.io/Eat/`
3. Clique **Package For Stores → Android → Download**.
   PWABuilder génère un **`.apk`/`.aab` signé** (Trusted Web Activity) à partir
   de notre `manifest.webmanifest` et de nos icônes.
4. Transfère l'`.apk` sur le téléphone et installe-le (autorise « sources
   inconnues » si demandé).

> C'est la même app que l'option A, simplement empaquetée dans un `.apk`.
> Un vrai build natif (Android Studio / Capacitor) n'apporte rien de plus ici.

## Tester en local (sur le même Wi-Fi)

```bash
node web/serve.js          # http://localhost:5173
```

Puis, depuis le téléphone sur le même réseau, ouvre
`http://<ip-de-ton-pc>:5173/web/`.

> Note : l'**installation PWA** exige HTTPS (ou `localhost`). En local via IP
> (`http://`) l'app fonctionne mais le bouton « Installer » peut ne pas
> apparaître — utilise l'option A (GitHub Pages, en HTTPS) pour installer.
