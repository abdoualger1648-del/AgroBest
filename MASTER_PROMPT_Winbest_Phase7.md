# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 7 (PORTAIL CLIENT PUBLIC)

> Consigne unique de la Phase 7. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur les Phases 0, 1, 3 (catalogue public issu du catalogue interne ; demande de devis alimentant le pipeline). Remplace/complète le site actuel winbest-dz.com.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le **portail client public** : un site vitrine relié au back-office, présentant l'entreprise et son catalogue, et permettant une **demande de devis en ligne** qui crée directement un prospect / une affaire dans le pipeline interne.

**Règle d'or :** conservation stricte de l'existant. **Prérequis :** Phases 0, 1, 3 « Done ». **Sécurité :** séparation stricte entre le front public (exposé) et le back-office interne — le public n'accède qu'à des données publiées et à un formulaire, jamais aux données de gestion.

---

## 1. OBJECTIF FONCTIONNEL

Remplacer le site statique actuel par un portail moderne, bilingue FR/AR (RTL), responsive, présentant : l'entreprise, les services (importation, étude de faisabilité, installation, mise en service, support), un **catalogue vitrine** sélectionné depuis le catalogue interne, et un **formulaire de demande de devis** qui entre dans le pipeline (Phase 1) comme AO/prospect à qualifier.

---

## 2. MODÈLE DE DONNÉES — PHASE 7

Migrations additives ; `.dev-memory/SCHEMA.md` à jour.

- **produit_publie** — id, produit_id (FK vers catalogue Phase 3), visible (bool), titre_fr, titre_ar, description_fr, description_ar, images, ordre. *(Sélection et enrichissement pour la vitrine ; ne publie pas les prix/stock internes sauf choix explicite.)*
- **page_contenu** — id, clé (accueil, à_propos, services, contact), titre_fr/ar, corps_fr/ar, média. *(CMS léger pour le contenu éditorial.)*
- **demande_devis** — id, nom, société, email, téléphone, wilaya, message, produits_intéressés (JSON), langue, source (portail), statut (nouvelle / qualifiée / convertie / rejetée), appel_offres_id/affaire_id (FK, nullable, après conversion), date, ip. *(Anti-spam requis.)*
- **parametre_public** — coordonnées, réseaux, horaires, implantations (Oran/Alger).

---

## 3. RÈGLES MÉTIER

1. **Catalogue vitrine** alimenté depuis le catalogue interne (Phase 3) via `produit_publie` — seuls les produits marqués visibles apparaissent ; les données sensibles (coût, stock) ne sont jamais exposées.
2. **Demande de devis** → crée une `demande_devis` et **notifie** le commercial ; à la qualification, conversion en entrée de pipeline (Phase 1) sans ressaisie.
3. **Séparation des privilèges** : le portail public utilise un accès en lecture seule aux données publiées et en écriture uniquement sur `demande_devis` ; aucune route interne exposée.
4. **Anti-abus** : protection anti-spam (captcha/honeypot + limitation de débit) sur le formulaire.
5. **Bilingue & SEO** : contenu FR/AR, balises méta, URLs propres, performances.
6. **Contenu éditable** depuis le back-office (CMS léger) sans redéploiement.

---

## 4. API & RBAC

- **Public** (non authentifié) : `GET` catalogue publié, pages de contenu ; `POST` demande de devis (rate-limited).
- **Interne** : `portail:manage` (publication produits, édition pages), `demande:read/qualifier` (traitement des demandes).
Rôles : **Commercial** (demandes), **Direction/Admin** (publication, contenu).
Routes publiques : `/api/public/produits`, `/api/public/pages`, `/api/public/demande-devis`. Routes internes : `/portail/produits-publies`, `/portail/pages`, `/demandes-devis`.

---

## 5. FRONT PUBLIC (bilingue FR/AR RTL, responsive)

- Pages : Accueil, À propos, Services, Catalogue (familles + fiches), Demande de devis, Contact (implantations Oran + Alger, carte).
- Design soigné, responsive, bascule FR/AR avec RTL correct.
- Formulaire de devis multi-produits relié au pipeline.
- Remplace le contenu de remplissage et les liens cassés du site actuel ; corrige l'exposition de l'ancien lien « Admin ».

---

## 6. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **7.1** Modèles + migration : produit_publie, page_contenu, demande_devis, parametre_public.
- **7.2** API publique (lecture catalogue/pages) avec séparation stricte des privilèges.
- **7.3** API demande de devis (POST public) + anti-spam + notification.
- **7.4** Back-office : publication produits + CMS léger des pages.
- **7.5** Qualification/conversion des demandes → pipeline (Phase 1).
- **7.6** Front public bilingue responsive (toutes pages).
- **7.7** SEO, performances, sécurité (durcissement, en-têtes, rate limiting).
- **7.8** Bascule/remplacement du site actuel ; revue et mémoire.

---

## 7. DEFINITION OF DONE — PHASE 7

1. Publier un produit du catalogue interne → il apparaît sur la vitrine, sans donnée sensible.
2. Éditer une page de contenu depuis le back-office → visible sur le site sans redéploiement.
3. Soumettre une demande de devis publique → elle arrive dans le back-office et notifie le commercial ; l'anti-spam bloque les abus.
4. Qualifier la demande → conversion en entrée de pipeline (Phase 1) sans ressaisie.
5. Aucune route interne accessible depuis le public ; en-têtes de sécurité et rate limiting en place.
6. Site bilingue FR/AR responsive, RTL correct ; ancien contenu de remplissage et lien Admin exposé supprimés.
7. Mémoire à jour.

---

## 8. POINTS À CONFIRMER (STATE.md)

- Publier ou non les prix indicatifs sur la vitrine.
- Nom de domaine et bascule depuis winbest-dz.com (redirection, coexistence).
- Charte graphique / logo à reprendre.
- Canal de notification des demandes (email interne, dans-app).

---

## 9. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape · **séparation stricte public/interne** (sécurité) · mémoire `.dev-memory/` · règles tokens · décisions → `STATE.md`.
