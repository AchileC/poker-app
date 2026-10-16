# **Cahier des Charges Technique (STD) — Plateforme Web Casino & Poker**

---

**Équipe :** 4 Développeurs Full-Stack  
**Objectif du document :** Définir le socle technique commun, l'architecture modulaire, les contrats d'interface (Auth & Wallet) et le workflow Git afin de permettre aux 4 développeurs de travailler en parallèle sans conflits.

## ---

**1\. Vue d'Ensemble & Répartition des Modules**

L'application est une plateforme de Casino en ligne (Play Money) regroupant plusieurs jeux indépendants qui partagent un **Socle Commun (Core)** : l'authentification des joueurs et un portefeuille unique de jetons (Wallet).

| Module / Périmètre | Responsable | Type de communication | Description technique   |
| :---- | :---- | :---- | :---- |
| **Core / Socle & Poker** | Dev 1 (Achile) | WebSockets (Temps réel) \+ REST | Initialisation du repo, Layout global, Moteur Texas Hold'em No-Limit multijoueur (State Machine, Side Pots, Timers). |
| **Auth, Profil & Wallet** | Dev 2 | API REST | Inscription/Connexion (JWT), gestion du profil, historique des transactions, boutique/rechargement gratuit de jetons, Lobby principal. |
| **Jeu Casino \#1 (ex: Blackjack)** | Dev 3 | API REST (ou WS) | Jeu Joueur vs Banque. Gestion des états de partie, tirage sécurisé côté serveur, appels au WalletService. |
| **Jeu Casino \#2 (ex: Roulette / Slots)** | Dev 4 | API REST (ou WS) | Jeu de mises rapides. Validation des grilles de mises, RNG cryptographique côté serveur, animations de tirage. |

## **2\. Stack Technique Commune**

> * **Frontend :** Vue.js 3 (Composition API, \<script setup lang="ts"\>), TypeScript, Pinia (State Management), Vue Router, Vuetify / Tailwind CSS.  
> * **Backend :** Architecture modulaire (Spring Boot ou Node.js/NestJS selon validation finale de l'équipe), API REST \+ WebSockets.  
> * **Base de données :**  
  * **PostgreSQL :** Persistance des utilisateurs, solde du Wallet, historique des transactions et historique des parties.  
  * **Redis (Optionnel / Temps réel) :** État des tables de poker en mémoire et sessions temps réel.  
> * **Environnement & DevOps :** Docker & Docker Compose (BDD locale unifiée), ESLint \+ Prettier (formatage automatique obligatoire).

## **3\. Architecture "Feature-Based" (Zéro Conflit Git)**

Pour éviter que les 4 développeurs ne modifient les mêmes fichiers en même temps, le projet est découpé **par domaine fonctionnel (Feature)**. Chaque développeur travaille exclusivement dans son dossier dédié.

### **3.1. Arborescence Frontend**

frontend/src/  
├── core/                        \# SOCLE COMMUN (Ne pas modifier sans accord de l'équipe)  
│   ├── api/                     \# Client HTTP (Axios avec intercepteur JWT) & Client WebSocket  
│   ├── layouts/                 \# MainLayout.vue (Header avec solde temps réel \+ Navigation)  
│   ├── stores/                  \# useAuthStore.ts & useWalletStore.ts  
│   └── types/                   \# Interfaces globales (User, WalletTransaction)  
├── features/                    \# 1 DOSSIER \= 1 DÉVELOPPEUR  
│   ├── home/                    \# Page d'accueil / Lobby du Casino  
│   ├── auth-wallet/             \# Pages Login, Register, Profil, Boutique  
│   ├── poker/                   \# Table de Poker, Lobby Poker, pokerStore.ts, WebSockets Poker  
│   ├── blackjack/               \# Vue Blackjack, composants et store associés  
│   └── roulette/                \# Vue Roulette, composants et store associés  
├── router/  
│   └── index.ts                 \# Pré-configuré au commit initial (importe les routes de chaque feature)  
└── App.vue

### **3.2. Arborescence Backend**

backend/src/  
├── common/                      \# SOCLE COMMUN  
│   ├── auth/                    \# Sécurité, vérification JWT, Guards/Middlewares  
│   ├── user/                    \# Entité User  
│   └── wallet/                  \# WalletService (Interface commune de débit/crédit atomique)  
├── modules/  
│   ├── poker/                   \# Moteur de jeu Poker, WebSockets, HandEvaluator, SidePots  
│   ├── blackjack/               \# Contrôleur et service Blackjack  
│   └── roulette/                \# Contrôleur et service Roulette

## **4\. Le Contrat d'Interface Central : Le Portefeuille (Wallet)**

Le point de convergence entre tous les jeux du casino est le solde de jetons du joueur. **Aucun jeu ne doit modifier directement la table users en base de données.** Tous les jeux doivent passer par le service commun WalletService.

### **4.1. Contrat Backend (WalletService)**

Le module Wallet expose des méthodes transactionnelles (avec verrouillage pessimiste ou atomique en BDD pour éviter le *double spending*) :

> * getBalance(userId: string): number — Retourne le solde disponible du joueur.  
> * debit(userId: string, amount: number, gameType: 'POKER' | 'BLACKJACK' | 'ROULETTE', referenceId: string): TransactionResult — Débite le joueur (ex: mise à la roulette ou Buy-in d'entrée à une table de poker). Lève une erreur si le solde est insuffisant.  
> * credit(userId: string, amount: number, gameType: 'POKER' | 'BLACKJACK' | 'ROULETTE', referenceId: string): TransactionResult — Crédite le joueur (ex: gain d'une partie ou sortie d'une table de poker / Cash-out).

### **4.2. Fonctionnement spécifique pour le Poker (Buy-in / Cash-out)**

Contrairement à la Roulette où chaque tour débite/crédite directement le portefeuille global, le Poker fonctionne par **Cave (Stack sur table)** :

> 1. **Sit-in (Entrée à la table) :** Le joueur choisit d'entrer avec 1 000 jetons. Le module Poker appelle walletService.debit(userId, 1000, 'POKER', tableId). Les 1 000 jetons sont placés dans la mémoire de la table.  
> 2. **Pendant les mains :** Les échanges de jetons entre joueurs se font uniquement en mémoire dans le moteur de Poker (ultra-rapide, pas d'appel BDD à chaque relance).  
> 3. **Leave / Sit-out (Sortie de table) :** Le joueur quitte la table avec 2 450 jetons. Le module Poker appelle walletService.credit(userId, 2450, 'POKER', tableId).

### **4.3. Contrat Frontend (useWalletStore)**

Côté Vue.js, tous les jeux mettent à jour l'affichage du solde dans la barre de navigation via le store Pinia commun :

// core/stores/useWalletStore.ts  
export const useWalletStore \= defineStore('wallet', () \=\> {  
  const balance \= ref\<number\>(1000); // Solde affiché dans la Navbar

  function setBalance(newBalance: number) {  
    balance.value \= newBalance;  
  }

  function adjustBalance(delta: number) {  
    balance.value \+= delta;  
  }

  return { balance, setBalance, adjustBalance };  
});

## **5\. Règles de Sécurité & RNG (Obligatoire pour tous les jeux)**

> 1. **Server-Authoritative (Zéro logique de gain côté Front) :** Le Frontend n'est qu'une interface d'affichage. Un client ne doit jamais envoyer "J'ai gagné 500 jetons au Blackjack". Il envoie uniquement son action ("HIT", "STAND", "RAISE 100") et c'est le serveur qui calcule le résultat.  
> 2. **Génération Aléatoire Cryptographique (CSPRNG) :** L'utilisation de Math.random() est proscrite côté serveur pour le tirage des cartes ou de la roulette. Utiliser impérativement le module cryptographique du langage (ex: SecureRandom en Java ou crypto.randomInt en Node.js) avec un mélange de **Fisher-Yates** pour les paquets de cartes.  
> 3. **Étanchéité des données :** Au Blackjack (carte cachée du croupier) comme au Poker (mains des adversaires), le serveur ne doit jamais envoyer la valeur d'une carte face cachée dans le JSON/WebSocket tant qu'elle n'est pas officiellement retournée.

## **6\. Spécifications du Module Poker (Périmètre Dev 1\)**

> * **Format :** Texas Hold'em No-Limit (6-max), Cash Game.  
> * **Machine à états serveur :** WAITING → BLINDS → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN.  
> * **Gestion des Pots :** Calcul automatique du *Main Pot* et des *Side Pots* multiples en cas de *All-in* avec des tapis inégaux, ainsi que le remboursement immédiat des mises non suivies (*Uncalled bets*).  
> * **Canaux WebSocket :**  
  * Canal public de table (/topic/table/{id}) : Diffuse l'état public (board, pots, stacks, joueur actif, timer).  
  * Canal privé joueur (/user/queue/poker) : Envoie uniquement au joueur concerné ses 2 cartes privées (holeCards).  
> * **Timers & Reconnexion :** Chaque tour de parole possède un turnExpiresAt (timestamp). Si le joueur ne répond pas à temps, le serveur exécute un Check (si gratuit) ou un Fold automatique.

## **7\. Workflow Git & Conventions d'Équipe**

> * **Branches principales :**  
  * main : Code stable de production/démo (protégée).  
  * develop : Branche d'intégration commune.  
> * **Branches de travail (1 par fonctionnalité/jeu) :**  
  * feat/core-setup (Initialisation du socle)  
  * feat/poker-engine, feat/poker-ui  
  * feat/auth-wallet  
  * feat/blackjack  
  * feat/roulette  
> * **Règle de Merge :** Toute fusion vers develop passe par une **Pull Request (PR)** avec validation d'au moins un autre membre de l'équipe et vérification que le build TypeScript compile sans erreur.  
> * **Convention de Commits :** Utilisation des *Conventional Commits* (feat(poker): ..., fix(wallet): ..., chore(core): ...).

## **8\. Plan de Démarrage (Jour 1\)**

> 1. **Étape 1 (Dev 1\) :** Création du dépôt GitHub, initialisation du squelette Front \+ Back \+ docker-compose.yml, création des routes vides (/poker, /blackjack, /roulette, /login) et d'un useWalletStore bouchonné (mocké avec 1 000 jetons par défaut).  
> 2. **Étape 2 (Toute l'équipe) :** Clone du dépôt, lancement de docker compose up \-d, création des branches respectives.  
> 3. **Étape 3 (Développement en parallèle) :** Chacun développe son jeu dans son dossier features/\<mon-jeu\> en utilisant le store Wallet mocké. Dès que le Dev 2 termine le vrai module Auth/Wallet, il remplace le mock par les vrais appels API sans casser le code des 3 autres jeux.