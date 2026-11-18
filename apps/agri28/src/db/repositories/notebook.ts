import { db } from '../db';
import type { PromptEntry } from '@/domain/types';
import type { Lang } from '@/lib/lang';

export interface RecordPromptInput {
  projectId: string;
  day: number;
  lessonId: string;
  promptId: string;
  title: string;
  tool: string;
  lang: Lang;
  text: string;
  tags?: string[];
}

function entryId(input: Pick<RecordPromptInput, 'projectId' | 'lessonId' | 'promptId'>): string {
  return `${input.projectId}:${input.lessonId}:${input.promptId}`;
}

/**
 * Enregistre un prompt copié. Recopier le même prompt met à jour le texte
 * d'origine sans écraser les modifications de l'utilisateur ni le classement
 * en favori.
 */
export async function recordPrompt(input: RecordPromptInput): Promise<PromptEntry> {
  const id = entryId(input);
  const existing = await db.promptEntries.get(id);
  const now = Date.now();

  const entry: PromptEntry = {
    id,
    projectId: input.projectId,
    day: input.day,
    lessonId: input.lessonId,
    promptId: input.promptId,
    title: input.title,
    tool: input.tool,
    lang: input.lang,
    text: existing?.text !== existing?.originalText && existing ? existing.text : input.text,
    originalText: input.text,
    tags: existing?.tags ?? input.tags ?? [],
    favorite: existing?.favorite ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing?.resultNote) entry.resultNote = existing.resultNote;

  await db.promptEntries.put(entry);
  return entry;
}

export async function listPrompts(projectId: string): Promise<PromptEntry[]> {
  const entries = await db.promptEntries.where('projectId').equals(projectId).toArray();
  return entries.sort((a, b) => a.day - b.day || a.promptId.localeCompare(b.promptId));
}

export async function countPrompts(projectId: string): Promise<number> {
  return db.promptEntries.where('projectId').equals(projectId).count();
}

export type PromptPatch = Partial<Pick<PromptEntry, 'text' | 'tags' | 'resultNote' | 'favorite'>>;

export async function updatePrompt(id: string, patch: PromptPatch): Promise<PromptEntry> {
  const current = await db.promptEntries.get(id);
  if (!current) throw new Error(`Prompt introuvable : ${id}`);
  const next: PromptEntry = { ...current, ...patch, updatedAt: Date.now() };
  await db.promptEntries.put(next);
  return next;
}

export async function deletePrompt(id: string): Promise<void> {
  await db.promptEntries.delete(id);
}

export async function clearPrompts(projectId: string): Promise<void> {
  await db.promptEntries.where('projectId').equals(projectId).delete();
}
