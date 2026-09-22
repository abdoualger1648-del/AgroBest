# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 1 (MARCHÉS PUBLICS)

> **Usage :** consigne unique de la Phase 1. Vit à la racine du dépôt aux côtés de `MASTER_PROMPT.md` (Phase 0). À chaque session, lire **d'abord** `.dev-memory/STATE.md`. La Phase 1 se greffe sur le socle Phase 0 (auth, RBAC, multi-sites, audit, i18n, objet `Affaire` coquille) — **prérequis obligatoire**.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le **module Marchés publics** de la plateforme Win Best — le cœur métier, puisque le chiffre d'affaires provient principalement des appels d'offres publics (code des marchés publics algérien).

**Règle d'or (inchangée) :** conservation stricte de l'existant. Additif par défaut, destructif seulement sur consigne. Le socle Phase 0 ne doit **rien perdre** de ses fonctionnalités.

**Prérequis vérifiés avant de commencer (sinon, stop et signaler) :** Phase 0 « Done » — `docker-compose up` + migrations + seed fonctionnels, auth JWT, RBAC opérationnel, tables socle présentes, i18n FR/AR RTL en place. Si un prérequis manque, le consigner dans `STATE.md` et revenir en Phase 0.

---

## 1. OBJECTIF FONCTIONNEL DE LA PHASE 1

Couvrir tout le cycle d'un marché public, du repérage de l'appel d'offres jusqu'à la réception définitive et la garantie :

**Veille & pipeline** → **décision go/no-go** → **constitution du dossier de soumission** (offre technique + offre financière BPU/DQE) → **dépôt** → **résultat** → (si attribué) **marché & exécution** (OS, situations/décomptes, réceptions, délai de garantie) → **registre des cautions** avec échéances et mainlevées.

L'objet `Affaire` de la Phase 0 devient le pivot : une Affaire naît d'un appel d'offres (ou hors AO), porte le dossier, le marché, les cautions et alimentera plus tard les phases import/stock/chantier/SAV/facturation.

---

## 2. MODÈLE DE DONNÉES — PHASE 1

Migrations Alembic additives. Mettre `.dev-memory/SCHEMA.md` à jour à chaque migration.

### Entités de veille et soumission
- **organisme** — maître d'ouvrage / donneur d'ordre public : id, nom, type (APC, wilaya, ministère, EPIC, autre), wilaya, contacts, notes.
- **appel_offres** — id, référence, objet, organisme_id (FK), type_procédure (AO ouvert / AO restreint / consultation / gré à gré), source (BOMOP / ANEP / portail / consultation directe), date_publication, date_limite_dépôt, heure_limite, montant_estimé, caution_soumission_exigée (montant ou %), lieu_retrait_cahier, statut_pipeline, décision_go_nogo (null/go/no_go), motif_décision, site_id (FK), created_by (FK), timestamps.
  - `statut_pipeline` : repéré → en_analyse → go / no_go → dossier_en_cours → déposé → attribué / perdu / infructueux.
- **dossier_soumission** — id, appel_offres_id (FK), affaire_id (FK, créée à la décision go), date_dépôt, mode_dépôt, statut (brouillon / complet / déposé), montant_offre_financière, notes.
- **piece_dossier** — id, dossier_id (FK), catégorie (technique / financière / administrative), type (mémoire technique, agrément, attestation, référence, bilan, extrait RC, mise à jour CNAS/CASNOS, caution, BPU, DQE…), intitulé, fichier (chemin/objet), obligatoire (bool), statut (à_fournir / fourni / validé).
- **ligne_prix** — id, dossier_id ou affaire_id (FK), type (BPU / DQE), numéro, désignation, unité, quantité (DQE), prix_unitaire, montant (calculé DQE). Sert de base au bordereau et au devis quantitatif.

### Entités d'exécution (marché attribué)
- **marche** — id, affaire_id (FK), numéro_marché, date_notification, objet, montant_ht, montant_ttc, tva_taux (défaut 19), délai_exécution (jours), date_ordre_démarrage, délai_garantie (mois), statut (notifié / en_cours / réceptionné_provisoire / en_garantie / clôturé), site_id.
- **ordre_service** — id, marche_id (FK), numéro, type (démarrage / arrêt / reprise / divers), date, objet, impact_délai (jours).
- **situation** *(décompte)* — id, marche_id (FK), numéro, période, montant_travaux, taux_avancement, retenue_garantie, pénalités_retard, montant_net, statut (brouillon / soumise / validée / payée), date.
- **reception** — id, marche_id (FK), type (provisoire / définitive), date, pv_référence, réserves (texte), levée_réserves (bool), statut.

### Registre des cautions (transversal)
- **caution** — id, affaire_id (FK), marche_id (FK, nullable), type (soumission / bonne_exécution / avance / retenue_garantie), montant, devise (défaut DZD), banque, référence_bancaire, date_émission, date_échéance, date_mainlevée (nullable), statut (active / échue / mainlevée), alerte_échéance (bool). **Alertes sur échéances à générer.**

### Historique de pipeline (optionnel mais recommandé)
- **pipeline_event** — id, appel_offres_id (FK), ancien_statut, nouveau_statut, user_id, date, commentaire. Alimente aussi `audit_log` du socle.

---

## 3. RÈGLES MÉTIER À IMPLÉMENTER

1. **Décision go** → création automatique d'une `affaire` liée à l'`appel_offres`, et d'un `dossier_soumission` en brouillon.
2. **Complétude du dossier** : le dossier ne passe « complet » que si toutes les `piece_dossier` marquées `obligatoire` sont `fournies/validées`.
3. **Offre financière** = somme des `ligne_prix` de type DQE (quantité × prix_unitaire) ; le BPU liste les prix unitaires sans quantité.
4. **Attribution** : passer l'AO à `attribué` crée/complète le `marche` rattaché à l'Affaire ; `perdu`/`infructueux` clôt l'Affaire.
5. **Cautions** : une caution de soumission est exigée dès la préparation du dossier si l'AO le prévoit ; à la notification du marché, prévoir la caution de bonne exécution. Générer des **alertes** à J-30/J-15/J-7 avant `date_échéance`.
6. **Situations/décomptes** : cumul cohérent (le cumulé ne dépasse pas le montant du marché) ; retenue de garantie et pénalités déductibles du montant net.
7. **Réception définitive** possible uniquement après expiration du `délai_garantie` et levée des réserves.
8. **Traçabilité** : chaque changement de statut sensible (go/no-go, dépôt, attribution, réception, mainlevée) écrit dans `audit_log`.

---

## 4. API & RBAC

Endpoints FastAPI (sous `app/api/`), protégés par les permissions du socle. Nouvelles permissions à ajouter au seed :

`ao:read`, `ao:manage`, `pipeline:decide`, `dossier:read`, `dossier:manage`, `marche:read`, `marche:manage`, `situation:manage`, `reception:manage`, `caution:read`, `caution:manage`.

Affectation indicative aux rôles : **Commercial** (ao, pipeline, dossier), **Bureau d'études** (dossier technique, lignes de prix), **Direction** (décision go/no-go, validation, lecture globale), **Comptabilité** (cautions, situations), **Admin** (tout). À affiner avec Abdou.

Groupes de routes : `/appels-offres`, `/pipeline`, `/dossiers`, `/lignes-prix`, `/marches`, `/ordres-service`, `/situations`, `/receptions`, `/cautions`, `/organismes`. CRUD + transitions de statut ; filtres par site, statut, échéance.

---

## 5. UI (front bilingue FR/AR RTL)

- **Vue pipeline** (kanban ou tableau par statut) des appels d'offres, avec dates limites et montants ; alerte visuelle sur échéances proches.
- **Fiche AO** : détail, décision go/no-go, pièces exigées.
- **Écran dossier de soumission** : check-list des pièces (obligatoires distinguées), saisie BPU/DQE, total calculé.
- **Fiche Affaire/Marché** : OS, situations, réceptions.
- **Registre des cautions** : tableau filtrable, échéances, mainlevées, alertes.
- **Tableau de bord marchés publics** : AO en cours, taux de réussite, marchés en exécution, cautions à échéance. *(Si graphiques : appliquer la skill dataviz.)*

Tous les libellés via i18n FR/AR ; documents officiels en arabe standard (فصحى).

---

## 6. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

Une sous-étape à la fois, tests + mise à jour `STATE.md`/`TASKS.md` + commit, puis **GO** avant la suivante (sauf GO groupé). Ne pas déborder sur les phases 2+.

- **1.1** Modèles + migration : organisme, appel_offres, pipeline_event.
- **1.2** API veille & pipeline + transitions de statut + audit.
- **1.3** Modèles + API dossier_soumission, piece_dossier, ligne_prix (BPU/DQE) ; règle de complétude et calcul offre financière.
- **1.4** Décision go → création Affaire + dossier ; attribution → création Marché.
- **1.5** Modèles + API marche, ordre_service.
- **1.6** situation/décompte (cumul, retenue, pénalités) + reception (provisoire/définitive).
- **1.7** Registre des cautions + moteur d'alertes d'échéance.
- **1.8** UI : pipeline, fiche AO, dossier, marché, registre cautions, tableau de bord.
- **1.9** Extension du seed (permissions marchés publics) + jeu de données de démonstration.
- **1.10** Revue Phase 1, tests de bout en bout, mise à jour de la mémoire.

---

## 7. DEFINITION OF DONE — PHASE 1

1. Créer un AO, le passer `go` → une Affaire et un dossier brouillon sont créés automatiquement.
2. Compléter les pièces obligatoires + saisir un DQE → l'offre financière se calcule, le dossier passe `complet`.
3. Passer l'AO à `attribué` → un Marché est créé et lié à l'Affaire.
4. Émettre un OS, une situation (avec retenue et pénalité), une réception provisoire.
5. Enregistrer une caution de bonne exécution → elle apparaît au registre avec son échéance, et une alerte est générée à l'approche de la date.
6. Une transition sensible (go, dépôt, attribution, mainlevée) apparaît dans `audit_log`.
7. RBAC : un rôle non autorisé est refusé sur les routes marchés publics.
8. UI bilingue FR/AR opérationnelle, RTL correct en arabe.
9. `.dev-memory/STATE.md`, `SCHEMA.md`, `TASKS.md`, `DECISIONS.md` à jour.

---

## 8. POINTS À CONFIRMER AVEC ABDOU (consigner dans STATE.md)

- Sources de veille réelles à intégrer (BOMOP/ANEP/portail) : saisie manuelle en Phase 1, intégration automatique éventuelle plus tard ?
- Types de procédures exacts à gérer selon le code des marchés publics en vigueur.
- Barème des alertes d'échéance des cautions (J-30/J-15/J-7 proposé).
- Affectation fine permissions ↔ rôles (matrice §4 à valider).
- Pièces obligatoires standard d'un dossier (liste type à pré-remplir dans le seed).

---

## 9. RAPPELS PERMANENTS

Conservation stricte de l'existant · une sous-étape à la fois avec GO · mémoire dans `.dev-memory/` · règles d'optimisation des tokens (cibler, ne pas tout lire, ne pas tout réécrire, réponses denses) · toute décision structurante ou irréversible → `STATE.md` « En attente de décision » et demander à Abdou.
