# MODÈLE DE DONNÉES — état courant

Aucune table créée à ce stade (sous-étape 0.1 = arborescence uniquement, pas de migration encore).

## Cible Phase 0 (sous-étape 0.3), pour référence — voir MASTER_PROMPT.md §6
- site — id, code (ORAN/ALGER), nom, adresse, type
- user — id, nom, email (unique), mot_de_passe_hash, actif, site_id (FK), langue (fr/ar), created_at
- role — id, code, libelle_fr, libelle_ar
- permission — id, code, libelle
- role_permission — role_id (FK), permission_id (FK)
- user_role — user_id (FK), role_id (FK)
- affaire (coquille) — id, reference, libelle, statut, site_id (FK), created_by (FK user), created_at
- parametre — id, cle (unique), valeur, type, description
- audit_log — id, user_id, action, entite, entite_id, details (JSON), ip, created_at
