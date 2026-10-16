# Blackjack — Règles du module (Dev 3)

Deux tables au choix, aux règles de vrais casinos. Les règles sont décrites dans
[`engine/blackjack.rules.ts`](./engine/blackjack.rules.ts) : ajouter une table = ajouter une config.

| Règle | 🇺🇸 Table « Vegas » | 🇫🇷 Table « Europe » |
| :-- | :-- | :-- |
| Sabot | 6 paquets, remélangé à chaque partie (CSPRNG + Fisher-Yates) | idem |
| Carte cachée | Oui : si le croupier montre un As ou une figure, il vérifie son blackjack avant que le joueur joue (*peek*) | Non : le croupier ne tire sa 2e carte qu'après le tour du joueur |
| Si le croupier a blackjack | Le joueur ne perd que sa mise de départ | Le joueur perd tout, y compris les mises de double et de split |
| Croupier sur soft 17 | Reste (S17) | Reste (S17) |
| Paiement du blackjack | 3:2 | 3:2 |
| Doubler | Sur 2 cartes quelconques | Seulement sur un total de 9, 10 ou 11 |
| Split | Jusqu'à 4 mains | Une seule fois (2 mains) |
| Doubler après split | Oui | Oui |
| Split d'As | Une seule carte par main, pas de re-split | idem |
| 21 après split | 21 normal, payé 1:1 (pas un blackjack) | idem |
| Abandon (*surrender*) | Tardif : après la vérification du croupier, récupère la moitié de la mise | Non |
| Assurance | Si le croupier montre un As : coûte la moitié de la mise, paie 2:1 | idem |
| Even money | Avec un blackjack face à un As : payé 1:1 immédiatement | idem |
| Limites de table | 10 à 500 | 10 à 500 |

- **Mises** : n'importe quel entier entre les limites de la table. Jetons de l'UI : 5, 25, 100, 500.
- **Arrondis** : un gain non entier (3:2, assurance, abandon sur mise impaire) est arrondi à l'entier inférieur,
  comme un casino qui ne paie pas en demi-jetons. Ex : blackjack sur 15 → gain de 22.
- **Split** : on peut séparer deux cartes de même valeur (ex : Roi + Dame).
- **21** : une main qui atteint 21 s'arrête automatiquement.

## Déroulement d'une partie

```
DISTRIBUTION → ASSURANCE (si As visible) → [Vegas : vérification du blackjack croupier]
             → TOUR DU JOUEUR (main par main) → TOUR DU CROUPIER → RÉGLÉE
```

## API (`/api/blackjack`, JWT obligatoire sauf `tables`)

| Méthode | Route | Corps | Réponse |
| :-- | :-- | :-- | :-- |
| `GET` | `/tables` | — | Règles des deux tables |
| `POST` | `/rounds` | `{ table: 'VEGAS' \| 'EUROPE', bet }` | `{ round, newBalance }` |
| `GET` | `/rounds/current` | — | `{ round \| null, newBalance }` (reprise après refresh) |
| `POST` | `/rounds/:id/actions` | `{ action, version }` | `{ round, newBalance }` |

Actions : `HIT`, `STAND`, `DOUBLE`, `SPLIT`, `SURRENDER`, `INSURANCE`, `EVEN_MONEY`, `NO_INSURANCE`.
`round.availableActions` liste celles autorisées ; `version` protège contre le double-clic
(une action avec une version périmée est refusée : `BLACKJACK_STALE_STATE`).

Sécurité : le sabot ne quitte jamais le serveur, la carte cachée est envoyée à `null` tant qu'elle
n'est pas retournée, une seule partie en cours par joueur.

## Wallet (`referenceId`)

| Opération | `referenceId` |
| :-- | :-- |
| Mise de départ | `blackjack:{roundId}:h0:bet` |
| Split (nouvelle main n) | `blackjack:{roundId}:h{n}:bet` |
| Double sur la main n | `blackjack:{roundId}:h{n}:double` |
| Assurance | `blackjack:{roundId}:insurance` |
| Gains de la partie (un seul crédit) | `blackjack:{roundId}:payout` |

## À faire quand le Postgres du Dev 2 sera prêt

Les parties sont en mémoire (`BlackjackRoundStore`). CDC §4.4 : persister les parties en cours et, au
redémarrage, rembourser les mises engagées d'une partie non terminée.
