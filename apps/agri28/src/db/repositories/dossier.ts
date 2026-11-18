import { db } from '../db';
import type { DossierDraft } from '@/domain/dossier';
import type { DossierItem } from '@/domain/types';
import type { DossierKind } from '@/content/schema';
import type { Lang } from '@/lib/lang';

function itemId(projectId: string, day: number, kind: string): string {
  return `${projectId}:${String(day).padStart(2, '0')}:${kind}`;
}

export async function listDossier(projectId: string): Promise<DossierItem[]> {
  const items = await db.dossierItems.where('projectId').equals(projectId).toArray();
  return items.sort((a, b) => a.day - b.day || a.kind.localeCompare(b.kind));
}

export async function listDossierByKind(
  projectId: string,
  kind: DossierKind,
): Promise<DossierItem[]> {
  return db.dossierItems.where('[projectId+kind]').equals([projectId, kind]).toArray();
}

export async function countDossierItems(projectId: string): Promise<number> {
  return db.dossierItems.where('projectId').equals(projectId).count();
}

/**
 * Enregistre les briques produites par une journée. Rejouer la journée
 * remplace ses briques au lieu d'en empiler des doublons, et incrémente
 * un numéro de version pour garder trace des reprises.
 */
export async function saveDossierDrafts(
  projectId: string,
  day: number,
  lessonId: string,
  lang: Lang,
  drafts: readonly DossierDraft[],
): Promise<DossierItem[]> {
  const now = Date.now();
  const saved: DossierItem[] = [];

  for (const draft of drafts) {
    const id = itemId(projectId, day, draft.kind);
    const existing = await db.dossierItems.get(id);
    const item: DossierItem = {
      id,
      projectId,
      day,
      kind: draft.kind as DossierKind,
      title: draft.title,
      lang,
      blocks: draft.blocks,
      sourceLessonId: lessonId,
      pinned: existing?.pinned ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      version: (existing?.version ?? 0) + 1,
    };
    await db.dossierItems.put(item);
    saved.push(item);
  }

  return saved;
}

export async function deleteDossierItem(id: string): Promise<void> {
  await db.dossierItems.delete(id);
}

export async function clearDossier(projectId: string): Promise<void> {
  await db.dossierItems.where('projectId').equals(projectId).delete();
}
