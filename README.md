# Plateforme Web Casino & Poker (Play Money)

Socle technique commun modulaire (« Zéro Conflit Git ») conçu pour une équipe de **4 développeurs Full-Stack**. La référence est le [Cahier des Charges](./Cahier%20des%20Charges%20Technique%20-%20Projet%20Casino%20&%20Poker.md).

## 1. Stack Technique

- **Frontend (`frontend/`)** : Vue.js 3 (`<script setup lang="ts">`), TypeScript, Pinia, Vue Router, Vuetify 3 + Tailwind CSS (une seule des deux à garder, cf. CDC §2), Axios, Socket.IO Client.
- **Backend (`backend/`)** : Node.js / NestJS (TypeScript), API REST (`/api`) + WebSockets (Socket.IO), TypeORM, JWT, Jest.
- **Base de données & Cache (`docker-compose.yml`)** : PostgreSQL 16 + Redis 7.

## 2. Démarrage Rapide

### Étape 1 : Variables d'environnement et base de données locale
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

Au Jour 1, l'auth est bouchonnée : le front se connecte automatiquement en `PlayerOne` (n'importe quel pseudo fonctionne sur `/login`), avec 1 000 jetons en mémoire.

### Vérifications (identiques à la CI)
```bash
cd backend && npm run format:check && npm run lint:check && npm run build && npm test
cd frontend && npm run format:check && npm run lint:check && npm run build
```

## 3. Architecture Feature-Based & Répartition

| Module / Périmètre | Responsable | Dossier Frontend | Dossier Backend |
| :--- | :--- | :--- | :--- |
| **Core / Socle & Poker** | Dev 1 (Achile) | `frontend/src/features/poker/` & `core/` | `backend/src/modules/poker/` & `common/` |
| **Auth, Profil & Wallet** | Dev 2 | `frontend/src/features/auth-wallet/` & `home/` | `backend/src/common/auth/` & `wallet/` |
| **Blackjack** | Dev 3 | `frontend/src/features/blackjack/` | `backend/src/modules/blackjack/` |
| **Roulette** | Dev 4 | `frontend/src/features/roulette/` | `backend/src/modules/roulette/` |

## 4. Contrats du Socle Commun

### Backend
- **`WalletService`** (`common/wallet/`) — asynchrone et idempotent :
  - `getBalance(userId): Promise<number>`
  - `debit(userId, amount, gameType, referenceId): Promise<TransactionResult>`
  - `credit(userId, amount, gameType, referenceId): Promise<TransactionResult>`
  - Montants entiers > 0. `referenceId` **unique par opération** (ex: `` `blackjack:${handId}:bet` ``) : rejouer le même ne débite pas deux fois.
- **Identité** : jamais lue dans un body/payload.
  - REST : `@UseGuards(JwtAuthGuard)` + `@CurrentUser() user: AuthUser` (`user.sub` = userId).
  - WebSocket : `afterInit(ns) { useWsJwtAuth(ns, this.jwtService) }` puis `getSocketUser(client)` ; chaque joueur rejoint la room `user:{userId}`. Voir `modules/poker/poker.gateway.ts`.
- **Erreurs** : lever `AppException(code, message, status?, details?)` (`common/errors/`). Format renvoyé : `{ code, message, details }` (REST) ou événement `exception` (WS, avec `@UseFilters(new WsApiExceptionFilter())`).
- **RNG** : `secureRandomInt` / `cryptoShuffle` (`common/utils/csprng.util.ts`). `Math.random()` interdit.

### Frontend
- **`useWalletStore`** : `balance`, `setBalance(newBalance)`, `refresh()`. Le solde vient **toujours** du serveur (`newBalance` dans chaque réponse de jeu).
- **`httpClient`** (JWT automatique) et `toApiError(err)` pour afficher les erreurs.
- **`getSocketClient(namespace)`** : Socket.IO authentifié par JWT au handshake.
