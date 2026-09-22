# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 9 (MARKETING & COMMUNICATION)

> Consigne unique de la Phase 9. Lire **d'abord** `.dev-memory/STATE.md`. Se greffe sur les Phases 7 (portail) et 8 (e-commerce, offres, packs). Développement piloté par la skill **`winbest-dev`**.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu développes le module **Marketing & Communication** : acquisition, animation commerciale et fidélisation autour de la vitrine et de la boutique — campagnes, promotions, contenus, réseaux sociaux, mesure de performance. **Prérequis :** Phases 7 et 8 « Done » (les offres/packs et le catalogue e-commerce existent).

**Règle d'or :** conservation stricte de l'existant.

---

## 1. OBJECTIF FONCTIONNEL

Donner à Win Best les leviers pour attirer et retenir des clients : campagnes email/SMS/WhatsApp, promotions et codes déjà modélisés (Phase 8) exploités dans des campagnes, contenus éditoriaux et bannières, intégration des réseaux sociaux (dominants en Algérie : Facebook, Instagram, WhatsApp Business), programme de fidélité, et **tableaux de bord** de performance marketing et ventes.

---

## 2. SKILLS SPÉCIALISÉES À UTILISER

- **dataviz** : tableaux de bord marketing/ventes (acquisition, conversion, ROI campagne, meilleures références/packs) — à charger avant tout graphique.
- **artifact-design** : maquettes de landing pages, bannières, emails.
- **docx / pdf** : supports commerciaux (fiches offres, catalogues promo imprimables).
- **xlsx** : exports de segments, listes de diffusion, rapports.

---

## 3. MODÈLE DE DONNÉES — PHASE 9

Migrations additives ; `.dev-memory/SCHEMA.md` à jour.

### Audience & campagnes
- **contact_marketing** — id, compte_client_web_id (FK, nullable), email, téléphone, nom, wilaya, source (site / e-commerce / import / salon), consentement (bool, date), langue, statut (abonné / désabonné). *(Base opt-in ; respect du consentement.)*
- **segment** — id, libellé, critères (JSON : wilaya, type client, historique d'achat, panier abandonné…), dynamique (bool).
- **campagne** — id, libellé, canal (email / sms / whatsapp / réseau_social), segment_id (FK), offre_id (FK Phase 8, nullable), objet, contenu_fr, contenu_ar, statut (brouillon / planifiée / envoyée / clôturée), date_envoi, budget.
- **envoi_campagne** — id, campagne_id (FK), contact_id (FK), statut (envoyé / ouvert / cliqué / converti / échec), date. *(Mesure de performance.)*

### Contenu & fidélité
- **contenu_editorial** — id, type (article / actualité / guide / bannière), titre_fr/ar, corps_fr/ar, média, publié, date, seo_meta. *(Blog/actus pour SEO et communication.)*
- **banniere** — id, emplacement (accueil / catégorie / pack), image, lien, période, active.
- **programme_fidelite** — id, règle_gain (JSON : points par montant), règle_échange, actif. **points_client** — compte_id (FK), solde, historique. *(Optionnel selon décision.)*
- **lien_reseau_social** — id, plateforme (facebook / instagram / whatsapp / tiktok), url, actif. *(Liens et éventuels flux/catalogue social.)*

---

## 4. RÈGLES MÉTIER

1. **Opt-in & consentement** : n'adresser que les contacts consentants ; désabonnement simple et respecté (obligation légale et bonne pratique).
2. **Segmentation** : les segments dynamiques se recalculent (ex. « paniers abandonnés 7 jours », « clients Oran », « acheteurs de caméras »).
3. **Campagnes** : une campagne cible un segment, porte éventuellement une offre/code (Phase 8), et mesure ouvertures/clics/conversions.
4. **Relance panier abandonné** : segment automatique + campagne déclenchée (levier de conversion majeur en e-commerce).
5. **Contenu SEO** : articles et fiches optimisés (balises méta, URLs propres) pour l'acquisition organique.
6. **Réseaux sociaux** : au minimum liens et boutons de partage ; option catalogue social (Facebook/Instagram Shopping) si pertinent.
7. **Fidélité** (si activée) : gain de points à l'achat, échange en remise, sans casser la cohérence des prix.
8. **Mesure** : chaque campagne a un tableau de bord (taux d'ouverture, clic, conversion, CA attribué).

---

## 5. API & RBAC

Permissions : `marketing:read`, `contact:manage`, `segment:manage`, `campagne:manage`, `campagne:envoyer`, `contenu:manage`, `fidelite:manage`.
Rôles : **Commercial/Marketing** (campagnes, contenus, segments), **Direction** (validation, budgets, lecture ROI), **Admin** (configuration canaux).
Routes : `/contacts`, `/segments`, `/campagnes`, `/envois`, `/contenus`, `/bannieres`, `/fidelite`, `/reseaux`, `/marketing/dashboard`.
Intégrations externes (email/SMS/WhatsApp) : via connecteurs paramétrables, clés stockées de façon sécurisée.

---

## 6. UI (bilingue FR/AR RTL)

- Gestionnaire de campagnes (création, ciblage, planification, contenu bilingue, aperçu).
- Éditeur de contenu/bannières (CMS, lien Phase 7).
- Vue segments et contacts (avec consentement).
- **Tableau de bord marketing** (dataviz) : acquisition, conversion, ROI par campagne, top produits/packs, paniers abandonnés récupérés.
- Programme de fidélité (si activé) : règles et soldes clients.

---

## 7. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **9.1** Modèles + migration : contact_marketing, segment.
- **9.2** Base opt-in + import de contacts (xlsx) + gestion du consentement/désabonnement.
- **9.3** Campagnes + intégration d'un premier canal (email) via connecteur.
- **9.4** Mesure des envois (ouvertures/clics/conversions) + relance panier abandonné.
- **9.5** Canaux SMS / WhatsApp (connecteurs) — selon disponibilité.
- **9.6** Contenu éditorial + bannières + SEO (lien Phase 7).
- **9.7** Réseaux sociaux (liens, partage, option catalogue social).
- **9.8** Programme de fidélité (si décidé).
- **9.9** Tableau de bord marketing (dataviz).
- **9.10** Seed + démonstration ; revue et mémoire.

---

## 8. DEFINITION OF DONE — PHASE 9

1. Constituer un segment (ex. clients Oran consentants), créer et envoyer une campagne email portant une offre.
2. Les ouvertures/clics/conversions remontent ; un panier abandonné déclenche une relance.
3. Publier un article SEO et une bannière depuis le back-office (visibles sur le site).
4. Les liens réseaux sociaux fonctionnent ; le partage est possible.
5. (Si activé) un achat crédite des points de fidélité échangeables en remise.
6. Le tableau de bord marketing affiche acquisition, conversion et ROI par campagne.
7. Consentement respecté ; désabonnement effectif ; RBAC ok ; mémoire à jour.

---

## 9. POINTS À CONFIRMER (STATE.md)

- Canaux prioritaires (email, SMS, WhatsApp Business) et prestataires/connecteurs disponibles.
- Programme de fidélité : activé ou non.
- Présence réseaux sociaux existante à relier (pages Facebook/Instagram).
- Catalogue social (Facebook/Instagram Shopping) souhaité.
- Contraintes légales locales sur le marketing direct (consentement, horaires SMS).

---

## 10. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape · **consentement opt-in respecté** · mémoire `.dev-memory/` · règles tokens · clés d'intégration stockées de façon sécurisée · décisions → `STATE.md`.
