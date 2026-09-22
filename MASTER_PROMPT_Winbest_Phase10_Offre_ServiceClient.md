# MASTER PROMPT — WINBEST BACK-OFFICE / PHASE 10 (OFFRE ÉLARGIE & SERVICE CLIENT)

> Consigne unique de la Phase 10. Lire **d'abord** `.dev-memory/STATE.md`. Affine le contexte de la vitrine : au-delà des produits physiques, l'offre inclut **services, logiciels et prestations sur mesure**, dont certaines exigent un **échange avec le service client**. Se greffe sur les Phases 3 (catalogue), 5 (facturation), 7/8 (public/e-commerce), 9 (marketing), et relie le pipeline (Phase 1) et le SAV (Phase 4). Développement piloté par la skill **`winbest-dev`**.

---

## 0. RÔLE, RÈGLE D'OR & PRÉREQUIS

Tu formalises l'**offre élargie** de la vitrine Win Best et la **couche de communication avec le service client**. L'objectif : présenter et vendre non seulement du matériel, mais aussi des services, des logiciels, et des prestations sur mesure qui passent par un dialogue avant-vente.

**Règle d'or :** conservation stricte de l'existant. **Prérequis :** Phases 3, 5, 7, 8 « Done » ; Phase 9 recommandée. La Phase 10 **étend** le catalogue et la boutique existants, elle ne les refait pas.

---

## 1. OBJECTIF FONCTIONNEL

La vitrine propose **quatre natures d'offre** :

1. **Produits (physiques)** — matériel de sécurité/surveillance : achat direct en ligne (Phase 8), stock-aware.
2. **Services associés** — installation, configuration, mise en service, formation, maintenance : soit achetables (prix fixe), soit sur devis.
3. **Logiciels** — VMS, licences de supervision, applications, modules : vente, **licence** ou **abonnement** (récurrent), avec activation/clé.
4. **Prestations sur mesure** — études, projets d'intégration, solutions personnalisées : **pas de prix fixe**, elles déclenchent une **demande** et un **échange avec le service client** avant devis.

La couche service client gère ces échanges (contact, demande de devis/rappel, chat, WhatsApp), les qualifie et les convertit en Affaire/pipeline (Phase 1) ou en commande.

---

## 2. SKILLS SPÉCIALISÉES À UTILISER

- **artifact-design / artifact-diagramming** : pages d'offre différenciées (produit vs service vs logiciel vs prestation), parcours « demander un devis / être rappelé », widget de contact.
- **dataviz** : tableau de bord avant-vente (demandes reçues, délai de réponse, taux de conversion par nature d'offre).
- **docx / pdf** : devis de prestations, contrats de licence/abonnement.
- **xlsx** : exports des demandes et du portefeuille d'abonnements.

---

## 3. MODÈLE DE DONNÉES — PHASE 10

Migrations Alembic additives ; `.dev-memory/SCHEMA.md` à jour.

### Typage de l'offre (extension du catalogue Phase 3)
- **article** *(extension de `produit`)* — ajouter `nature` (physique / service / logiciel / prestation), `mode_acquisition` (achat_direct / licence / abonnement / sur_devis), `contact_requis` (bool).
- **licence_logiciel** — id, article_id (FK), type_licence (perpétuelle / annuelle / mensuelle), périmètre (postes/caméras/canaux), clé_activation (générée), durée, renouvelable.
- **abonnement** — id, client_id (FK), article_id (FK), date_début, date_fin, périodicité (mensuelle / annuelle), montant_récurrent, statut (actif / suspendu / résilié / expiré), prochaine_échéance. *(Facturation récurrente reliée à la Phase 5.)*
- **prestation_type** — id, article_id (FK), description, livrables, sur_devis (bool), pré-requis. *(Prestations sur mesure présentées sans prix ferme.)*

### Communication service client (avant-vente / CRM léger)
- **demande_client** — id, numéro, type (devis / rappel / question / prestation / support_avant_vente), nature_offre (produit / service / logiciel / prestation), canal (formulaire / chat / whatsapp / téléphone / email), compte_client_web_id (FK, nullable), contact (nom, email, téléphone, société), objet, message, articles_concernés (JSON), statut (nouvelle / en_traitement / devis_envoyé / convertie / clôturée / sans_suite), assigné_à (FK user), affaire_id (FK, nullable), priorité, date, wilaya.
- **interaction** — id, demande_id (FK), canal, sens (entrant / sortant), agent_id (FK, nullable), contenu, pièce_jointe, date. *(Historique du fil d'échange par demande.)*
- **canal_contact** — id, type (chat / whatsapp / formulaire / rappel), actif, paramètres (numéro WhatsApp, horaires, délai_cible_réponse). 
- **plage_service_client** — id, jour, heure_début, heure_fin, site_id. *(Horaires affichés côté public ; hors plage → message + promesse de rappel.)*

---

## 4. RÈGLES MÉTIER

1. **Affichage selon la nature** : un produit physique montre prix + achat ; un service à prix fixe montre prix + achat/option ; un logiciel montre licence/abonnement ; une prestation sur mesure montre « Demander un devis / Être rappelé » **sans prix**.
2. **`contact_requis`** : tout article marqué ainsi n'est pas ajouté au panier — il ouvre une `demande_client` vers le service client.
3. **Qualification** : une demande est prise en charge, assignée, échangée (interactions), puis convertie en devis (Phase 5), en commande (Phase 8) ou en Affaire (Phase 1) selon l'ampleur ; sinon clôturée « sans suite ».
4. **Abonnements/licences** : génération de clé à l'activation ; échéancier de renouvellement ; facturation récurrente (Phase 5) ; alertes avant expiration ; suspension si impayé.
5. **SLA avant-vente** : délai cible de première réponse par canal ; alertes sur demandes non traitées.
6. **Continuité SAV** : après-vente d'un logiciel/service géré via les tickets de la Phase 4 ; l'avant-vente (Phase 10) reste distinct mais relié (historique client unifié).
7. **Multicanal unifié** : chat, WhatsApp, formulaire, rappel convergent dans une même file `demande_client` (pas de silo).
8. **Consentement** : les coordonnées collectées suivent les règles opt-in (Phase 9) si réutilisées en marketing.

---

## 5. API & RBAC

Permissions : `offre:manage` (nature, mode d'acquisition, contact requis), `licence:manage`, `abonnement:manage`, `demande:read/traiter`, `demande:assigner`, `canal:manage`.
Rôles : **Service client/Commercial** (demandes, interactions, devis), **Direction** (suivi, SLA, conversion), **Comptabilité** (abonnements, facturation récurrente), **Admin** (canaux, offre).
Routes publiques : `/api/shop/offre` (catalogue typé), `/contact`, `/demande`, `/chat`. Routes internes : `/offres`, `/licences`, `/abonnements`, `/demandes`, `/interactions`, `/canaux`, `/service-client/dashboard`.

---

## 6. FRONT (bilingue FR/AR RTL, responsive)

- **Vitrine typée** : sections Produits / Services / Logiciels / Prestations, avec fiches adaptées à chaque nature.
- **Fiche prestation** : présentation, livrables, bouton « Demander un devis » / « Être rappelé ».
- **Fiche logiciel** : options licence/abonnement, périmètre, activation.
- **Widget de contact / chat** + lien WhatsApp, horaires du service client, promesse de rappel hors plage.
- **Espace client** : suivi de ses demandes, ses abonnements/licences (renouvellement).
- **Back-office service client** : file des demandes multicanal, assignation, fil d'interactions, conversion en devis/commande/Affaire ; tableau de bord SLA (dataviz).

---

## 7. SÉQUENCEMENT PAR SOUS-ÉTAPES (avec GO)

- **10.1** Extension du catalogue : `nature`, `mode_acquisition`, `contact_requis` + migration ; affichage typé côté vitrine.
- **10.2** Logiciels : licences + activation (clés).
- **10.3** Abonnements + facturation récurrente (lien Phase 5) + alertes de renouvellement.
- **10.4** Prestations sur mesure : fiches sans prix + déclenchement `demande_client`.
- **10.5** Couche service client : demande_client + interactions + canaux + horaires (formulaire d'abord).
- **10.6** Multicanal : chat et WhatsApp reliés à la même file.
- **10.7** Qualification & conversion (devis Phase 5 / commande Phase 8 / Affaire Phase 1) + SLA + alertes.
- **10.8** Espace client (demandes, abonnements) + back-office service client + tableau de bord.
- **10.9** Seed + démonstration ; revue et mémoire.

---

## 8. DEFINITION OF DONE — PHASE 10

1. La vitrine distingue produits, services, logiciels et prestations ; chaque nature a l'action adaptée (acheter vs demander un devis).
2. Un logiciel se vend en licence/abonnement, avec clé d'activation et échéancier de renouvellement ; une alerte précède l'expiration.
3. Une prestation sur mesure ouvre une `demande_client` (sans prix) qui arrive au service client.
4. Une demande est assignée, échangée (fil d'interactions multicanal : formulaire + WhatsApp), puis convertie en devis/commande/Affaire.
5. Le SLA de première réponse est mesuré ; une demande en retard est signalée.
6. Facturation récurrente d'un abonnement générée (Phase 5) ; RBAC respecté ; tableau de bord service client fonctionnel.
7. Front bilingue FR/AR responsive ; mémoire à jour.

---

## 9. POINTS À CONFIRMER (STATE.md)

- Liste des services, logiciels et types de prestations à proposer (avec ceux « sur devis »).
- Canaux réels du service client (numéro WhatsApp Business, chat, horaires par site Oran/Alger).
- Périodicités et modèles de licences/abonnements (mensuel/annuel, périmètre).
- SLA cibles de première réponse par canal.
- Qui traite les demandes (équipe service client dédiée ou commercial).

---

## 10. RAPPELS PERMANENTS

Conservation stricte · GO par sous-étape · **file service client unifiée (pas de silo)** · **séparation public/interne** · consentement opt-in si réemploi marketing · mémoire `.dev-memory/` · règles tokens · décisions → `STATE.md`.
