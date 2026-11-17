import { db } from '../db';
import { getProfile, updateProfile } from './profile';
import { DEFAULT_UNIT, type Project, type ProjectType, type ScaleUnit } from '@/domain/types';

export interface ProjectInput {
  name: string;
  type: ProjectType;
  typeOther?: string;
  scaleValue: number;
  scaleUnit?: ScaleUnit;
  wilayaCode: string;
  commune?: string;
  objective: string;
  horizonMonths?: number;
  budgetCeilingDA?: number;
  waterSource?: Project['waterSource'];
  startMonth?: number;
}

function newId(): string {
  return crypto.randomUUID();
}

function toProject(input: ProjectInput, now: number, id: string, createdAt: number): Project {
  const project: Project = {
    id,
    name: input.name.trim(),
    type: input.type,
    scale: {
      value: input.scaleValue,
      unit: input.scaleUnit ?? DEFAULT_UNIT[input.type],
    },
    wilayaCode: input.wilayaCode,
    objective: input.objective.trim(),
    horizonMonths: input.horizonMonths ?? 12,
    createdAt,
    updatedAt: now,
  };

  if (input.typeOther?.trim()) project.typeOther = input.typeOther.trim();
  if (input.commune?.trim()) project.commune = input.commune.trim();
  if (input.budgetCeilingDA !== undefined) project.budgetCeilingDA = input.budgetCeilingDA;
  if (input.waterSource) project.waterSource = input.waterSource;
  if (input.startMonth !== undefined) project.startMonth = input.startMonth;

  return project;
}

/** Crée le projet et en fait le projet actif. */
export async function createProject(input: ProjectInput): Promise<Project> {
  const now = Date.now();
  const project = toProject(input, now, newId(), now);
  await db.projects.put(project);
  await updateProfile({ activeProjectId: project.id, onboardingDone: true });
  return project;
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function getActiveProject(): Promise<Project | null> {
  const profile = await getProfile();
  if (!profile.activeProjectId) return null;
  return (await db.projects.get(profile.activeProjectId)) ?? null;
}

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy('updatedAt').reverse().toArray();
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'createdAt'>>,
): Promise<Project> {
  const current = await db.projects.get(id);
  if (!current) throw new Error(`Projet introuvable : ${id}`);
  const next: Project = { ...current, ...patch, updatedAt: Date.now() };
  await db.projects.put(next);
  return next;
}

export async function setActiveProject(id: string): Promise<void> {
  await updateProfile({ activeProjectId: id });
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.progress, db.dossierItems, db.profile, async () => {
    await db.projects.delete(id);
    await db.progress.where('projectId').equals(id).delete();
    await db.dossierItems.where('projectId').equals(id).delete();
    const profile = await getProfile();
    if (profile.activeProjectId === id) await updateProfile({ activeProjectId: null });
  });
}
