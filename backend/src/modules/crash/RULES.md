# Crash — Règles et fonctionnement (Dev 3)

Un multiplicateur part de **1,00×** et monte jusqu'à crasher à un moment aléatoire. On mise avant le départ,
on **encaisse quand on veut** (mise × multiplicateur). Pas encaissé avant le crash : la mise est perdue.
Tous les joueurs jouent la **même partie en direct**.

## Cycle (une boucle serveur unique)

```
MISES (8 s) → EN VOL → CRASH → PAUSE (3 s) → partie suivante
```

## Mathématiques (`engine/crash.math.ts`)

- Multiplicateurs en **centièmes entiers** (250 = 2,50×) : aucun arrondi flottant sur les gains.
- Courbe : `m(t) = e^(0,00006 × ms)` → 2× en ~11,5 s, 10× en ~38 s, 100× en ~77 s. Plafond : 1 000×.
- Point de crash : `crash = ⌊99 / (1 − r)⌋ / 100` (min 1,00×), `r` tiré des 52 premiers bits d'un HMAC.
  → `P(crash ≥ x) = 0,99 / x` : **marge de la maison 1 %**, quelle que soit la stratégie.
- Simulation sur 1 000 000 de parties : médiane 1,97×, crash ≥ 2× : 49,5 %, ≥ 10× : 9,9 %, ≥ 100× : 1 % ;
  retour moyen en encaissant toujours à 1,1× / 2× / 10× : 98,97 % / 98,91 % / 98,66 % des mises.
- Gains arrondis à l'entier inférieur.

## Provably fair

1. Avant la partie : publication de `seedHash = SHA-256(seed)` (graine de 32 octets, CSPRNG).
2. Crash = `crashPointFromHash(HMAC-SHA256(clé = seed, message = numéro de partie))`.
3. Après le crash : la graine est révélée. Le client re-vérifie tout dans le navigateur (WebCrypto).

## Sécurité

- Le point de crash et la graine ne quittent jamais le serveur avant le crash.
- L'encaissement est calculé à **l'heure du serveur** à la réception ; le client n'envoie jamais de multiplicateur.
- L'encaissement automatique est exécuté par le serveur au multiplicateur exact (indépendant de la latence).
- Une mise par joueur et par partie ; double mise / double encaissement impossibles (réservation avant tout `await`).
- Arrêt du serveur : les mises encore en jeu sont remboursées (CDC §4.4). Persistance Postgres : à faire avec le Dev 2.

## Joueurs de la maison (`crash.bots.ts`)

Pseudos crédibles, styles de jeu fixes (prudent, équilibré, gros joueur, chasseur de gros multiplicateurs).
Ils **n'influencent rien** (crash engagé par hash avant les mises) et **ne passent pas par le wallet**
(aucun jeton créé ou détruit). Mention discrète dans les règles côté client.

## Wallet (`GameType` : `'CRASH'`)

| Opération | `referenceId` |
| :-- | :-- |
| Mise | `crash:{roundId}:{userId}:bet` |
| Encaissement | `crash:{roundId}:{userId}:cashout` |
| Remboursement (arrêt serveur) | `crash:{roundId}:{userId}:refund` |

## WebSocket (namespace `/crash`, JWT au handshake)

| Sens | Événement | Contenu |
| :-- | :-- | :-- |
| → client | `state` | État complet à la connexion (dont ma mise) |
| → tous | `round:betting` | Numéro, `seedHash`, fin des mises, heure serveur |
| → tous | `round:started` | Heure de départ, heure serveur |
| → tous | `player:bet` / `player:cashout` | Joueur (identifiant opaque), mise / multiplicateur et gain |
| → tous | `round:crashed` | Point de crash, graine révélée |
| → mes onglets | `my:bet` / `my:cashout` | Ma mise / mon encaissement + nouveau solde |
| ← client (ack) | `bet` | `{ amount, autoCashOut? }` → `{ ok, newBalance }` ou `{ ok: false, error }` |
| ← client (ack) | `cashOut` | → `{ ok, newBalance, cashedOutAt, payout }` ou `{ ok: false, error }` |
