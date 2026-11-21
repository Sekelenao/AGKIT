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

Les templates sont organisés en **composants (couches) composables** (ex: `base` + `java-base` + `flink`, ou `base` + `java-base` + `spring`, ou `base` + `front`), indépendants du harness cible (`opencode`, `agy`, etc.).

```text
templates-repo/
├── base/                         # Socle commun entreprise
│   ├── AGENTS.md
│   ├── skills/
│   ├── agents/
│   └── commands/
├── java-base/                    # Couche Java partagée (Spring, Flink...)
│   ├── module.json               # Métadonnées, extends: ["base"], variables
│   ├── AGENTS.md
│   └── skills/
├── flink/
│   ├── module.json               # extends: ["java-base"], variables
│   ├── AGENTS.md
│   └── skills/
├── spring/
│   ├── module.json               # extends: ["java-base"], variables
│   └── ...
└── front/
    ├── module.json               # extends: ["base"], variables
    └── ...
```

### Composition & Résolution des couches
- Les composants peuvent déclarer des dépendances via `extends` et être mixés librement à l'`init` (ex: `base + java-base + flink`).
- Les couches sont appliquées dans l'ordre résolu (de la plus générique à la plus spécifique) : en cas de skill/agent/commande du même nom, la couche la plus spécifique surcharge la précédente.
- Pour `AGENTS.md`, les sections de chaque couche sont concaténées dans l'ordre des couches.
- Le placement physique des fichiers dans le projet dépend du **harness** sélectionné (`opencode`, `antigravity` avec alias `agy`, etc.) via l'architecture `Harness` composée de sous-handlers (`SkillHandler`, etc.).

### Templating & Variables
- Les fichiers peuvent contenir des placeholders (ex: `{{projectName}}`, `{{javaVersion}}`).
- Les variables attendues sont déclarées dans `module.json`, demandées interactivement lors de l'`init`, puis enregistrées dans le lockfile pour être réappliquées automatiquement lors des futurs `sync`.

---

## 5. Connexion au repo & Stockage local

- Stockage utilisateur OS-agnostique sous `~/.agkit/` (Linux, macOS, Windows) :
  - Configuration : `~/.agkit/config.json` (`git_repository_url`, `default_ref` en `snake_case`, validé par `zod`).
  - Cache Git : `~/.agkit/cache/repo`.
- La CLI s'appuie sur `simple-git` avec `GIT_TERMINAL_PROMPT=0` : réutilise automatiquement les clés SSH / credential helpers du poste sans jamais bloquer sur un prompt username/mot de passe.
- Supporte le choix d'une **branche**, d'un **tag** ou d'un **commit** (défaut : branche par défaut du repo), y compris sur un repo fraîchement initialisé (vide).

---

## 6. Lockfile & Gestion des conflits (`sync`)

Le fichier `.opencode/.template-lock.json` (ou équivalent selon le harness) enregistre :
- Le harness cible (`opencode`, `agy`, etc.)
- L'URL du repo de templates et la ref (`branch` / `tag` / `commit`)
- Les composants sélectionnés (ex: `["base", "java-base", "flink"]`)
- Les valeurs des variables renseignées à l'`init`
- La liste des fichiers gérés avec leur hash **SHA256** (chemins normalisés POSIX `/` et fins de ligne LF) issu du dernier `sync`

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
- **Langage & Style** : TypeScript / Node.js (ESM, `>=20`), architecture **POO** (1 classe par fichier, injection par constructeur, interfaces par capacité).
- **Librairies standards retenues** : `commander` (CLI), `@inquirer/prompts` (mode interactif), `zod` (validation schémas JSON), `simple-git` (Git), `vitest` (tests).
- **Distribution** : Registry npm privé de l'entreprise (`npx @<scope>/agkit` ou `npm i -g @<scope>/agkit`).

### Modes d'utilisation & Commandes prévues
- **`agkit` (sans sous-commande — mode interactif pur)** :
  - Si `~/.agkit/config.json` n'existe pas encore, demande l'URL du repo Git (+ ref optionnelle), synchronise le cache et sauvegarde la config.
  - Affiche ensuite le menu interactif (`Initialize a project`, `Configure template repository`, et à terme `sync`, `list`…).
- **Sous-commandes CLI (mode scriptable pur, zéro prompt)** :
  - `agkit config --repo <url> [--ref <ref>]` : Configurer le repo de templates et synchroniser `~/.agkit/cache/repo`.
  - `agkit list` : Lister les composants disponibles dans le repo de templates.
  - `agkit init --harness <opencode|antigravity|agy> ...` : Générer les fichiers pour le harness et les composants choisis, et créer le lockfile.
  - `agkit sync` : Mettre à jour le cache Git, comparer les hashes du lockfile et synchroniser les fichiers gérés.
  - `agkit status` / `agkit diff` : Afficher l'état des fichiers gérés (modifications locales vs mises à jour disponibles).
