# **Cahier des Charges Technique (STD) — Plateforme Web Casino & Poker**

---

**Équipe :** 4 Développeurs Full-Stack  
**Objectif du document :** Définir le socle technique commun, l'architecture modulaire, les contrats d'interface (Auth & Wallet) et le workflow Git afin de permettre aux 4 développeurs de travailler en parallèle sans conflits.  
**Version :** 1.1 — contrat Wallet asynchrone et idempotent, authentification WebSocket, résilience aux crashs, tests & CI.

---

## **1. Vue d'Ensemble & Répartition des Modules**

L'application est une plateforme de Casino en ligne (**Play Money uniquement** : aucun achat de jetons en argent réel, aucune conversion des jetons en valeur réelle) regroupant plusieurs jeux indépendants qui partagent un **Socle Commun (Core)** : l'authentification des joueurs et un portefeuille unique de jetons (Wallet).

| Module / Périmètre | Responsable | Type de communication | Description technique |
| :---- | :---- | :---- | :---- |
| **Core / Socle & Poker Engine** | Dev 1 (Achile) | WebSockets (Temps réel) + REST | Initialisation du repo, Layout global, Moteur Texas Hold'em No-Limit multijoueur (State Machine, Side Pots, Timers, Reconnexion). |
| **Auth, Profil & Wallet** | Dev 2 | API REST | Inscription/Connexion (JWT), gestion du profil, historique des transactions, boutique/rechargement gratuit de jetons, Lobby principal. **Chemin critique** : le vrai Wallet débloque tous les autres. |
| **Jeu Casino #1 (ex: Blackjack)** | Dev 3 | API REST (ou WS) | Jeu Joueur vs Banque. Gestion des états de partie, tirage sécurisé côté serveur, appels au WalletService. |
| **Jeu Casino #2 (ex: Roulette / Slots)** | Dev 4 | API REST (ou WS) | Jeu de mises rapides. Validation des grilles de mises, RNG cryptographique côté serveur, animations de tirage. |

> **Rééquilibrage de charge :** le module Poker (moteur + UI) représente nettement plus de travail que le Blackjack ou la Roulette. Une fois leur jeu au stade MVP, Dev 3 et/ou Dev 4 reprennent la branche `feat/poker-ui` (table, lobby poker, animations) pour que Dev 1 se concentre sur le moteur.

## **2. Stack Technique Commune**

* **Frontend :** Vue.js 3 (Composition API, `<script setup lang="ts">`), TypeScript, Pinia (State Management), Vue Router, Axios, Socket.IO Client.
  * **UI : Vuetify 3 + Tailwind CSS 4, avec un rôle chacun :**
    * **Vuetify = composants** (boutons, formulaires, cartes, dialogues, tables…). Ses classes utilitaires (`d-flex`, `ma-2`, `text-h1`…) et sa palette Material (`amber-accent-3`…) sont **désactivées**.
    * **Tailwind = mise en page** (flex/grid, espacement, typographie, bordures, responsive). Sa palette par défaut (`slate-900`, `amber-400`…) est **désactivée**.
    * **Couches CSS** (`frontend/public/layers.css`, chargé en premier) : reset Tailwind < Vuetify < utilitaires Tailwind. Une classe Tailwind posée sur un composant Vuetify s'applique donc toujours.
    * **Source unique des couleurs : le thème Vuetify** (`frontend/src/core/theme/casinoTheme.ts`). Les mêmes noms servent aux deux : `color="primary"` sur un composant, `bg-surface`, `text-muted`, `border-line`, `bg-primary/10` en Tailwind. Ajouter une couleur = l'ajouter au thème **et** déclarer son nom dans `frontend/src/styles/tailwind.css`.
    * Tokens disponibles : `background`, `surface`, `surface-bright`, `surface-variant`, `on-background`, `on-surface`, `muted`, `subtle`, `line`, `line-strong`, `primary` (or, Blackjack), `secondary` (émeraude, Poker), `accent` (rose, Roulette), `felt`, `felt-rim`, `success`, `info`, `warning`, `error`.
* **Backend :** **Node.js / NestJS** (TypeScript), architecture modulaire, API REST (préfixe `/api`) + WebSockets (**Socket.IO**), TypeORM, JWT.
* **Base de données :**
  * **PostgreSQL 16 :** Persistance des utilisateurs, solde du Wallet, historique des transactions, historique des parties et jetons « en jeu » (voir §4.4).
  * **Redis 7 :** État des tables de poker et sessions temps réel (snapshot permettant la reprise après redémarrage).
* **Environnement & DevOps :** Docker & Docker Compose (BDD locale unifiée), ESLint + Prettier (formatage automatique obligatoire), GitHub Actions (CI, voir §7).

## **3. Architecture "Feature-Based" (Zéro Conflit Git)**

Pour éviter que les 4 développeurs ne modifient les mêmes fichiers en même temps, le projet est découpé **par domaine fonctionnel (Feature)**. Chaque développeur travaille exclusivement dans son dossier dédié.

### **3.1. Arborescence Frontend**

```
frontend/src/
├── core/                        # SOCLE COMMUN (Ne pas modifier sans accord de l'équipe)
│   ├── api/                     # Client HTTP (Axios avec intercepteur JWT) & Client WebSocket (JWT au handshake)
│   ├── layouts/                 # MainLayout.vue (Header avec solde temps réel + Navigation)
│   ├── stores/                  # useAuthStore.ts & useWalletStore.ts
│   └── types/                   # Interfaces globales (User, WalletTransaction, ApiError)
├── features/                    # 1 DOSSIER = 1 DÉVELOPPEUR
│   ├── home/                    # Page d'accueil / Lobby du Casino
│   ├── auth-wallet/             # Pages Login, Register, Profil, Boutique
│   ├── poker/                   # Table de Poker, Lobby Poker, pokerStore.ts, WebSockets Poker
│   ├── blackjack/               # Vue Blackjack, composants et store associés
│   └── roulette/                # Vue Roulette, composants et store associés
├── router/
│   └── index.ts                 # Pré-configuré au commit initial (importe les routes de chaque feature)
└── App.vue
```

### **3.2. Arborescence Backend**

```
backend/src/
├── common/                      # SOCLE COMMUN
│   ├── auth/                    # Sécurité, vérification JWT (HTTP + WebSocket), Guards
│   ├── user/                    # Entité User
│   └── wallet/                  # WalletService (Interface commune de débit/crédit atomique)
├── migrations/                  # Migrations TypeORM horodatées (voir §3.3)
├── modules/
│   ├── poker/                   # Moteur de jeu Poker, WebSockets, HandEvaluator, SidePots
│   ├── blackjack/               # Contrôleur et service Blackjack
│   └── roulette/                # Contrôleur et service Roulette
```

### **3.3. Fichiers partagés (exceptions au « Zéro Conflit »)**

Certains fichiers sont inévitablement touchés par plusieurs développeurs. Règles :

* **`backend/src/app.module.ts` et `frontend/src/router/index.ts` :** pré-câblés au commit initial avec tous les modules/routes. On n'y ajoute qu'une ligne d'import par feature, jamais de logique.
* **`package.json` / `package-lock.json` :** toute nouvelle dépendance est annoncée à l'équipe. En cas de conflit sur le lockfile, on ne le résout pas à la main : on reprend la version de `develop` puis on relance `npm install`.
* **Types partagés (`GameType`, `core/types`) :** modification uniquement via une PR dédiée, relue par l'équipe.
* **Base de données :** `synchronize: false` dans TypeORM. Tout changement de schéma passe par une **migration horodatée** (`npm run migration:generate`), une par PR.
* **Fichiers générés :** aucun fichier compilé (`.js`, `.d.ts` générés à côté des `.ts`/`.vue`, `dist/`) n'est commité. `vue-tsc` est lancé en `--noEmit`.

## **4. Le Contrat d'Interface Central : Le Portefeuille (Wallet)**

Le point de convergence entre tous les jeux du casino est le solde de jetons du joueur. **Aucun jeu ne doit modifier directement la table users en base de données.** Tous les jeux doivent passer par le service commun WalletService.

### **4.1. Contrat Backend (WalletService)**

Le module Wallet expose des méthodes transactionnelles (avec verrouillage pessimiste ou mise à jour atomique en BDD pour éviter le *double spending*).

**Le contrat est asynchrone dès le Jour 1**, même si l'implémentation bouchonnée est en mémoire : ainsi, le passage à PostgreSQL ne casse le code d'aucun jeu.

```ts
type GameType = 'POKER' | 'BLACKJACK' | 'ROULETTE' | 'SHOP'; // SHOP = rechargements gratuits

getBalance(userId: string): Promise<number>
debit(userId: string, amount: number, gameType: GameType, referenceId: string): Promise<TransactionResult>
credit(userId: string, amount: number, gameType: GameType, referenceId: string): Promise<TransactionResult>
```

* **`getBalance`** — Retourne le solde disponible du joueur.
* **`debit`** — Débite le joueur (ex: mise à la roulette ou Buy-in à une table de poker). Lève `InsufficientFundsError` (code `INSUFFICIENT_FUNDS`) si le solde est insuffisant.
* **`credit`** — Crédite le joueur (ex: gain d'une partie ou Cash-out d'une table de poker).

**Règles du contrat :**

1. **Montants entiers :** les jetons sont des entiers strictement positifs (`Number.isInteger(amount) && amount > 0`). En base, colonnes `BIGINT`, jamais de flottants.
2. **`referenceId` unique par opération (clé d'idempotence) :** chaque débit/crédit possède un identifiant unique (ex: `poker:{tableId}:buyin:{uuid}`, `blackjack:{handId}:bet`, `roulette:{spinId}:payout:{userId}`). Une contrainte d'unicité `(referenceId, type)` en base garantit qu'un retry réseau ou un double clic ne débite/crédite jamais deux fois : un second appel avec le même `referenceId` renvoie la transaction existante sans la rejouer.
3. **`TransactionResult` renvoie toujours `newBalance`**, que le jeu transmet au client (voir §4.3).

### **4.2. Fonctionnement spécifique pour le Poker (Buy-in / Cash-out)**

Contrairement à la Roulette où chaque tour débite/crédite directement le portefeuille global, le Poker fonctionne par **Cave (Stack sur table)** :

1. **Sit-in (Entrée à la table) :** Le joueur choisit d'entrer avec 1 000 jetons. Le module Poker appelle `walletService.debit(userId, 1000, 'POKER', 'poker:{tableId}:buyin:{uuid}')`. Les 1 000 jetons sont placés dans la mémoire de la table. Une recave génère un nouveau `referenceId`.
2. **Pendant les mains :** Les échanges de jetons entre joueurs se font uniquement en mémoire dans le moteur de Poker (ultra-rapide, pas d'appel BDD à chaque relance). L'état de la table est snapshoté dans Redis à la fin de chaque main.
3. **Leave / Sit-out (Sortie de table) :** Le joueur quitte la table avec 2 450 jetons. Le module Poker appelle `walletService.credit(userId, 2450, 'POKER', 'poker:{tableId}:cashout:{uuid}')`.

### **4.3. Contrat Frontend (useWalletStore)**

Côté Vue.js, tous les jeux mettent à jour l'affichage du solde dans la barre de navigation via le store Pinia commun.

**Le solde affiché est toujours celui renvoyé par le serveur** : le front ne calcule jamais de solde lui-même (pas de `adjustBalance(delta)`, qui fait dériver l'affichage). Chaque réponse d'action de jeu (REST ou WS) contient `newBalance`, que le jeu passe à `setBalance`.

```ts
// core/stores/useWalletStore.ts
export const useWalletStore = defineStore('wallet', () => {
  const balance = ref<number>(1000); // Solde affiché dans la Navbar (mock Jour 1)

  function setBalance(newBalance: number) {
    balance.value = newBalance;
  }

  async function refresh() {
    const { data } = await httpClient.get<{ balance: number }>('/wallet/balance');
    balance.value = data.balance;
  }

  return { balance, setBalance, refresh };
});
```

### **4.4. Résilience aux crashs (jetons en jeu)**

Un redémarrage du serveur ne doit jamais faire disparaître des jetons déjà débités.

* **Poker :** les stacks de chaque table sont persistés (snapshot Redis en fin de main). Au démarrage, toute table non restaurable est clôturée et chaque joueur assis est **remboursé de son dernier stack connu** via `credit` (avec un `referenceId` dédié, donc idempotent). Une main interrompue en cours est annulée : les mises de cette main sont rendues.
* **Blackjack / Roulette :** une partie en cours est persistée (statut `IN_PROGRESS` en base avec la mise). Au démarrage, toute partie `IN_PROGRESS` est soit reprise, soit remboursée de sa mise.

### **4.5. Format d'erreur API commun**

Toutes les erreurs REST et WebSocket suivent le même format, pour que le front les traite de façon uniforme :

```json
{ "code": "INSUFFICIENT_FUNDS", "message": "Solde insuffisant (200 jetons disponibles, 500 requis).", "details": {} }
```

Codes communs : `UNAUTHORIZED`, `VALIDATION_ERROR`, `INSUFFICIENT_FUNDS`, `NOT_YOUR_TURN`, `INVALID_ACTION`, `GAME_NOT_FOUND`, `NOT_FOUND`, `CONFLICT` (ex: `referenceId` réutilisé pour une autre opération), `INTERNAL_ERROR`. Côté WebSocket, les erreurs sont émises sur l'événement `exception`. Chaque module peut ajouter ses propres codes préfixés (`POKER_…`, `BLACKJACK_…`, `ROULETTE_…`).

## **5. Règles de Sécurité & RNG (Obligatoire pour tous les jeux)**

1. **Server-Authoritative (Zéro logique de gain côté Front) :** Le Frontend n'est qu'une interface d'affichage. Un client ne doit jamais envoyer "J'ai gagné 500 jetons au Blackjack". Il envoie uniquement son action ("HIT", "STAND", "RAISE 100") et c'est le serveur qui calcule le résultat.
2. **Identité dérivée du JWT uniquement :** le `userId` n'est **jamais** lu dans un body HTTP ou un payload WebSocket. Il provient exclusivement du token vérifié (`JwtAuthGuard` en REST, vérification du JWT au **handshake** Socket.IO — connexion refusée sans token valide). Toutes les actions de jeu sont validées côté serveur (tour de parole, montant min/max, stack disponible).
3. **Génération Aléatoire Cryptographique (CSPRNG) :** L'utilisation de `Math.random()` est proscrite côté serveur pour le tirage des cartes ou de la roulette. Utiliser impérativement `crypto.randomInt` (Node.js) avec un mélange de **Fisher-Yates** pour les paquets de cartes (utilitaire commun `common/utils/csprng.util.ts`).
4. **Étanchéité des données :** Au Blackjack (carte cachée du croupier) comme au Poker (mains des adversaires), le serveur ne doit jamais envoyer la valeur d'une carte face cachée dans le JSON/WebSocket tant qu'elle n'est pas officiellement retournée.
5. **CORS restreint :** origine autorisée = `CORS_ORIGIN` (variable d'environnement), y compris pour les gateways WebSocket. Pas de `origin: '*'`.

## **6. Spécifications du Module Poker (Périmètre Dev 1)**

* **Format :** Texas Hold'em No-Limit (6-max), Cash Game.
* **Machine à états serveur :** WAITING → BLINDS → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN.
* **Gestion des Pots :** Calcul automatique du *Main Pot* et des *Side Pots* multiples en cas de *All-in* avec des tapis inégaux, ainsi que le remboursement immédiat des mises non suivies (*Uncalled bets*).
* **Canaux WebSocket (Socket.IO, namespace `/poker`) :**
  * **Room publique de table** `table:{id}` : diffuse l'état public (board, pots, stacks, joueur actif, `turnExpiresAt`).
  * **Messages privés joueur** : envoyés uniquement au(x) socket(s) du joueur concerné (room `user:{userId}`, rejointe automatiquement à la connexion après vérification du JWT) : ses 2 cartes privées (holeCards).
* **Timers :** Chaque tour de parole possède un `turnExpiresAt` (timestamp serveur). Si le joueur ne répond pas à temps, le serveur exécute un Check (si gratuit) ou un Fold automatique.
* **Reconnexion :** à la reconnexion, le serveur renvoie l'état public de la table + les holeCards du joueur. Un joueur déconnecté reste assis ; après 2 timeouts consécutifs, il passe en *sit-out* automatique, puis est sorti de la table (cash-out) après 5 minutes de sit-out.
* **Tests obligatoires :** `HandEvaluator` (toutes les combinaisons, départages par kicker, split pots) et calcul des Side Pots (all-in multiples à tapis inégaux, uncalled bets) couverts par des tests unitaires avant tout merge du moteur.

## **7. Workflow Git & Conventions d'Équipe**

* **Branches principales (toutes deux protégées, pas de push direct) :**
  * `main` : Code stable de production/démo.
  * `develop` : Branche d'intégration commune.
* **Branches de travail (1 par fonctionnalité/jeu) :**
  * `feat/core-setup` (Initialisation du socle)
  * `feat/poker-engine`, `feat/poker-ui`
  * `feat/auth-wallet`
  * `feat/blackjack`
  * `feat/roulette`
* **Règle de Merge :** Toute fusion vers `develop` passe par une **Pull Request (PR)** avec validation d'au moins un autre membre de l'équipe et une **CI verte**.
* **CI (GitHub Actions, sur chaque PR) :** lint (ESLint + Prettier), build TypeScript front (`vue-tsc --noEmit`) et back (`nest build`), tests unitaires.
* **Convention de Commits :** Utilisation des *Conventional Commits* (`feat(poker): ...`, `fix(wallet): ...`, `chore(core): ...`).

## **8. Périmètre MVP**

Le MVP (démo jouable de bout en bout) comprend :

* Inscription / connexion, solde persistant, historique des transactions, rechargement gratuit de jetons.
* Une table de poker 6-max fonctionnelle (blinds fixes) avec side pots, timers et reconnexion.
* Blackjack (hit / stand / double ; split hors MVP).
* Roulette européenne (mises simples et multiples).

**Hors MVP :** tournois, chat, avatars, statistiques avancées, provably fair, slots.

**Date cible de la démo MVP :** _à définir en équipe_.

## **9. Plan de Démarrage (Jour 1)**

1. **Étape 1 (Dev 1) :** Création du dépôt GitHub, initialisation du squelette Front + Back + docker-compose.yml, création des routes vides (/poker, /blackjack, /roulette, /login), d'un `WalletService` bouchonné **au contrat asynchrone** et d'un `useWalletStore` mocké (1 000 jetons par défaut). Mise en place de la CI et de la protection des branches.
2. **Étape 2 (Toute l'équipe) :** Clone du dépôt, `cp .env.example .env`, lancement de `docker compose up -d`, création des branches respectives. Choix de la date de démo.
3. **Étape 3 (Développement en parallèle) :** Chacun développe son jeu dans son dossier `features/<mon-jeu>` en utilisant le Wallet bouchonné (avec `await` et des `referenceId` uniques dès le départ). Dès que le Dev 2 termine le vrai module Auth/Wallet, il remplace le mock par l'implémentation PostgreSQL sans changer la signature : le code des 3 autres jeux ne bouge pas.
