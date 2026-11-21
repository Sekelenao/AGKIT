# Spécification — `agkit` (CLI de gestion de templates IA d'entreprise)

## 1. Contexte & Objectif

Fournir aux équipes de développement des templates IA standardisés pour **OpenCode** (`AGENTS.md`, skills, agents, commandes) selon la stack du projet (ex: `flink`, `front`, `spring`), tout en évitant les limites d'un submodule Git :

- Permettre la **coexistence** entre les templates d'entreprise, les ajouts spécifiques au projet, et les configurations personnelles de chaque développeur.
- Faciliter la **mise à jour** des templates d'entreprise sur les projets existants sans écraser les personnalisations locales.

---

## 2. Architecture à 3 niveaux (Git & Coexistence)

| Niveau | Emplacement | Versionné (Git) | Géré par la CLI |
| --- | --- | --- | --- |
| **Entreprise** | `AGENTS.md`, `.opencode/` (fichiers listés dans le lockfile) | Oui (commité) | Oui (`init`, `sync`) |
| **Projet** | `.opencode/` (fichiers absents du lockfile, créés par l'équipe) | Oui (commité) | Non (jamais touché) |
| **Personnel** | `~/.config/opencode/` (natif OpenCode) + `opencode.json` | Non | Non |

### Avantages du commit sur le projet
- Le lockfile (`.opencode/.template-lock.json`) est partagé avec toute l'équipe : n'importe quel développeur peut lancer `sync` pour récupérer les dernières mises à jour du repo central et ouvrir une PR.
- Les autres membres de l'équipe reçoivent les mises à jour simplement via `git pull`.
- Aucun besoin de modifier le `.gitignore` du projet.

---

## 3. Périmètre OpenCode

### Inclus dans les templates
- `AGENTS.md` (instructions projet/stack)
- `.opencode/skills/`
- `.opencode/agents/`
- `.opencode/commands/`

### Exclu (hors scope)
- `opencode.json` / `opencode.jsonc` : les développeurs gardent le contrôle total sur leurs modèles, providers, permissions et serveurs MCP.

---

## 4. Structure du repo central de templates

Un projet correspond à **1 seul profil** (pas de multistack), chaque profil héritant d'un socle commun `base`.

```text
templates-repo/
├── base/                         # Socle commun appliqué à tous les profils
│   ├── AGENTS.md
│   └── .opencode/
│       ├── skills/
│       ├── agents/
│       └── commands/
└── profiles/
    ├── flink/
    │   ├── profile.json          # Métadonnées + déclaration des variables
    │   ├── AGENTS.md             # Surcharge ou complément pour Flink
    │   └── .opencode/
    ├── front/
    │   ├── profile.json
    │   └── ...
    └── spring/
        ├── profile.json
        └── ...
```

### Templating & Variables
- Les fichiers peuvent contenir des placeholders (ex: `{{projectName}}`, `{{javaVersion}}`).
- Les variables attendues sont déclarées dans `profile.json`, demandées interactivement lors de l'`init`, puis enregistrées dans le lockfile pour être réappliquées automatiquement lors des futurs `sync`.

---

## 5. Connexion au repo & Cache local

- La CLI s'appuie sur `git` en local pour cloner/mettre à jour le repo interne dans un cache utilisateur (ex: `~/.cache/agkit/repo`).
- Réutilise automatiquement les credentials SSH / HTTPS déjà configurés sur le poste du développeur.
- Supporte le choix d'une **branche** ou d'un **tag** (défaut : `main` ou dernier tag).

---

## 6. Lockfile & Gestion des conflits (`sync`)

Le fichier `.opencode/.template-lock.json` enregistre :
- L'URL du repo de templates et la ref (`branch` / `tag` / `commit`)
- Le profil utilisé (`flink`, `front`, `spring`, etc.)
- Les valeurs des variables renseignées à l'`init`
- La liste des fichiers gérés avec leur hash **SHA256** issu du dernier `sync`

### Règles de résolution lors d'un `sync`
1. **Fichier absent du lockfile** → fichier spécifique au projet, **jamais touché**.
2. **Fichier géré non modifié localement + modifié en upstream** → mise à jour automatique.
3. **Fichier géré supprimé en upstream + non modifié localement** → suppression automatique.
4. **Fichier géré modifié localement + modifié en upstream** → affichage du diff et choix interactif :
   - Écraser avec la version upstream
   - Conserver la version locale
   - Sauvegarder la version locale en `.bak` puis appliquer l'upstream
   - Flag `--force` disponible pour les scripts/CI.

---

## 7. Stack technique & Commandes de la CLI

### Stack & Distribution
- **Langage** : TypeScript / Node.js
- **Distribution** : Registry npm privé de l'entreprise (`npx @<scope>/agkit` ou `npm i -g @<scope>/agkit`)

### Commandes prévues
- `agkit config` : Configurer l'URL par défaut du repo de templates dans `~/.config/agkit/config.json`.
- `agkit list` : Lister les profils disponibles dans le repo de templates.
- `agkit init` : Choisir un profil, renseigner les variables, générer `AGENTS.md` + `.opencode/` et créer `.opencode/.template-lock.json`.
- `agkit sync` : Mettre à jour le cache Git, comparer les hashes du lockfile et synchroniser les fichiers gérés.
- `agkit status` / `agkit diff` : Afficher l'état des fichiers gérés (modifications locales vs mises à jour disponibles).
