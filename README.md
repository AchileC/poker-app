# Plateforme Web Casino & Poker (Play Money)

Socle technique commun modulaire (« Zéro Conflit Git ») conçu pour une équipe de **4 développeurs Full-Stack**.

## 1. Stack Technique

- **Frontend (`frontend/`)** : Vue.js 3 (`<script setup lang="ts">`), TypeScript, Pinia, Vue Router, Vuetify 3 + Tailwind CSS, Axios, Socket.IO Client.
- **Backend (`backend/`)** : Node.js / NestJS (TypeScript), API REST + WebSockets (Socket.IO), TypeORM, JWT.
- **Base de données & Cache (`docker-compose.yml`)** : PostgreSQL 16 + Redis 7.

## 2. Démarrage Rapide

### Étape 1 : Lancer la base de données locale (PostgreSQL & Redis)
```bash
cp .env.example .env
docker compose up -d
```

### Étape 2 : Lancer le Backend (Port 3000)
```bash
cd backend
npm install
npm run start:dev
```

### Étape 3 : Lancer le Frontend (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

## 3. Architecture Feature-Based & Répartition

| Module / Périmètre | Responsable | Dossier Frontend | Dossier Backend |
| :--- | :--- | :--- | :--- |
| **Core / Socle & Poker** | Dev 1 (Achile) | `frontend/src/features/poker/` & `core/` | `backend/src/modules/poker/` & `common/` |
| **Auth, Profil & Wallet** | Dev 2 | `frontend/src/features/auth-wallet/` & `home/` | `backend/src/common/auth/` & `wallet/` |
| **Blackjack** | Dev 3 | `frontend/src/features/blackjack/` | `backend/src/modules/blackjack/` |
| **Roulette** | Dev 4 | `frontend/src/features/roulette/` | `backend/src/modules/roulette/` |

## 4. Contrats du Socle Commun (`Wallet`)

- **Backend (`WalletService`)** :
  - `getBalance(userId: string): number`
  - `debit(userId: string, amount: number, gameType: 'POKER' | 'BLACKJACK' | 'ROULETTE', referenceId: string): TransactionResult`
  - `credit(userId: string, amount: number, gameType: 'POKER' | 'BLACKJACK' | 'ROULETTE', referenceId: string): TransactionResult`
- **Frontend (`useWalletStore`)** :
  - `balance` (`Ref<number>`, mocké à `1000` jetons par défaut au Jour 1)
  - `setBalance(newBalance: number)`
  - `adjustBalance(delta: number)`
