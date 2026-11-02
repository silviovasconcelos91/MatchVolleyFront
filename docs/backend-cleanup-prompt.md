# Contexte

Le front MatchVolley (React Native + Expo, maintenant aussi déployé en web/PWA) a été simplifié. Le **mode « Match classique » a été supprimé** : il n'existe plus qu'un seul mode, la **saisie temps réel (live stats)**. Les écrans « Stats matchs » (détail d'un match classique) ont aussi été retirés. La base de données repartira de zéro, donc aucune migration de données n'est nécessaire.

Ta mission : **supprimer côté backend Kotlin tout ce qui ne sert plus au front**, et vérifier que ce qui reste est cohérent avec le flux live.

Avant de supprimer quoi que ce soit, liste ce que tu comptes retirer (endpoints, services, repositories, entités/tables, DTO, tests) et attends ma validation.

# Endpoints que le front N'APPELLE PLUS → à supprimer

| Méthode | Route | Ancien usage |
|---|---|---|
| POST | `/api/v1/match-stats` | Envoi d'un match classique en fin de match (`MatchStatRequest` : match, sets, stats par joueur, timeline, meta) |
| GET | `/api/v1/match-stats/{matchId}` | Détail d'un match classique (`MatchDetailResponse` : stats équipe, timeline, stats par set, stats par joueur) |

Supprime aussi tout ce qui n'est utilisé que par ces deux endpoints : services, repositories, entités/tables (stats classiques par joueur et par set, timeline classique, etc.), DTO (`MatchStatRequest`, `MatchDetailResponse`, `SetStatDto`, `PlayerSetStatDto`, `PlayerStatDto`, `TimelineEntryDto`…) et les tests associés. Vérifie chaque élément avant de le supprimer : certains DTO (ex. `StatsDto`, `MatchDto`) peuvent encore servir aux endpoints conservés ci-dessous.

# Endpoints TOUJOURS utilisés → à conserver

**Auth**
- POST `/api/v1/auth:login`
- POST `/api/v1/auth:register`
- POST `/api/v1/auth:refresh`
- POST `/api/v1/auth:logout`

**Équipes**
- GET `/api/v1/teams`
- POST `/api/v1/teams`
- DELETE `/api/v1/teams/{id}`
- POST `/api/v1/teams/{id}:assignPlayers`
- POST `/api/v1/teams/{id}:removePlayers`
- GET `/api/v1/teams/{id}/matches`. Utilisé par l'écran « Stats match » pour lister les matchs d'une équipe. Champs lus par le front : `id`, `title`, `home`, `date`, `result` (`"won"`/autre), `mySets`, `oppSets`.

**Joueurs**
- GET `/api/v1/players`
- POST `/api/v1/players`
- PUT `/api/v1/players/{id}`
- DELETE `/api/v1/players/{id}`
- GET `/api/v1/players/{id}/season-stats`. **Conserver** : l'écran « Stats joueurs » est seulement désactivé temporairement côté front.

**Live stats (le seul mode de match)**
- POST `/api/v1/matches/{matchId}/live-stats`. Envoi du match en fin de partie.
- GET `/api/v1/matches/{matchId}/live-stats/analysis`. Analyse d'un match. Doit renvoyer 404 s'il n'y a pas de stats live.

# Points à vérifier / adapter

1. **`GET /api/v1/teams/{id}/matches` doit lister les matchs live.** Si cet endpoint lit aujourd'hui la table des matchs classiques (alimentée par `POST /match-stats`), il faut le rebrancher sur les matchs enregistrés via `POST /matches/{matchId}/live-stats`. Sinon la liste sera toujours vide. Les champs à renvoyer se dérivent du payload live :
   - `id` = `matchId`
   - `title` = `title`
   - `home` = `venue === 'home'`
   - `date` = `recordedAt`
   - `mySets`/`oppSets` = `setsWon.mine`/`setsWon.opp`
   - `result` = `"won"` si `mySets > oppSets`
2. **Nouveau champ `title` dans le payload live.** Le front envoie désormais `title: string` (nom du match saisi en début de match, ex. "VSL vs Grenoble") dans le payload de `POST /api/v1/matches/{matchId}/live-stats`. Stocke-le et renvoie-le comme `title` dans `GET /api/v1/teams/{id}/matches`. Payload complet : `matchId, teamId, teamName, title, venue, recordedAt, setsWon, sets[]`.
3. **Joueurs : `age` et `taille` ne sont plus envoyés ni affichés par le front** (POST/PUT `/players`). Tu peux les retirer du modèle joueur, des DTO et de la table, ou au minimum les rendre optionnels.
4. **CORS** : le front tourne maintenant aussi dans un navigateur (dev : `http://localhost:8082` ; prod : domaine Vercel). Vérifie que l'API autorise ces origines, y compris pour les requêtes avec `Authorization` et les preflight `OPTIONS`.
5. Mets à jour la spec OpenAPI exposée par le back (pour que le client généré côté front ne contienne plus `saveMatchStat` / `getMatchStat`), ainsi que la doc d'API si elle existe.

# Livrable attendu

1. La liste de ce que tu vas supprimer et modifier, **pour validation avant d'agir**.
2. Après validation : les suppressions, la compilation, les tests au vert.
3. Un résumé des changements de contrat éventuels (points 1 à 3) pour que je les reporte côté front.
