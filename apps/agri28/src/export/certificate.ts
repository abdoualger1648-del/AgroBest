import type { Lang } from '@/lib/lang';

/**
 * Certificat de fin de parcours.
 *
 * Décision D5 : le texte est dessiné sur un canvas, puis l'image est placée
 * dans un PDF. Les bibliothèques PDF en JavaScript ne lient pas les lettres
 * arabes ; le moteur de texte du navigateur, lui, le fait correctement.
 * Compromis assumé : le texte du PDF n'est pas sélectionnable.
 */

export interface CertificateData {
  projectName: string;
  lang: Lang;
  completedOn: Date;
  daysDone: number;
}

export interface CertificateLabels {
  appName: string;
  title: string;
  /** « Ce certificat atteste que le projet … » */
  intro: string;
  /** « a suivi les 28 jours du parcours ». */
  achievement: string;
  dateLine: string;
  /** Mention honnête : attestation de parcours, pas un diplôme. */
  disclaimer: string;
}

export interface CertificateLine {
  text: string;
  /** Taille relative à la hauteur de l'image. */
  size: number;
  weight: 'normal' | 'bold';
  /** Position verticale relative (0 → haut, 1 → bas). */
  y: number;
  muted?: boolean;
}

/** Mise en page du certificat. Fonction pure, testable sans canvas. */
export function certificateLayout(
  data: CertificateData,
  labels: CertificateLabels,
): CertificateLine[] {
  return [
    { text: labels.appName, size: 0.035, weight: 'normal', y: 0.14, muted: true },
    { text: labels.title, size: 0.075, weight: 'bold', y: 0.28 },
    { text: labels.intro, size: 0.038, weight: 'normal', y: 0.43 },
    { text: data.projectName, size: 0.055, weight: 'bold', y: 0.55 },
    { text: labels.achievement, size: 0.038, weight: 'normal', y: 0.66 },
    { text: labels.dateLine, size: 0.032, weight: 'normal', y: 0.78, muted: true },
    { text: labels.disclaimer, size: 0.024, weight: 'normal', y: 0.9, muted: true },
  ];
}

const WIDTH = 2000;
const HEIGHT = 1414; // A4 paysage, rapport 1,414

const COLORS = {
  background: '#faf8f4',
  ink: '#1b2a21',
  muted: '#55665b',
  primary: '#2f6b46',
};

function fontStack(lang: Lang): string {
  return lang === 'ar'
    ? "'Noto Sans Arabic', 'Geeza Pro', 'Segoe UI', Tahoma, system-ui, sans-serif"
    : "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
}

/** Dessine le certificat et renvoie l'image. Nécessite un navigateur. */
export function drawCertificate(
  data: CertificateData,
  labels: CertificateLabels,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponible : impossible de produire le certificat.');

  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.strokeStyle = COLORS.primary;
  context.lineWidth = 10;
  context.strokeRect(60, 60, WIDTH - 120, HEIGHT - 120);
  context.lineWidth = 2;
  context.strokeRect(90, 90, WIDTH - 180, HEIGHT - 180);

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.direction = data.lang === 'ar' ? 'rtl' : 'ltr';

  for (const line of certificateLayout(data, labels)) {
    const size = Math.round(line.size * HEIGHT);
    context.font = `${line.weight === 'bold' ? '700' : '400'} ${String(size)}px ${fontStack(data.lang)}`;
    context.fillStyle = line.muted
      ? COLORS.muted
      : line.weight === 'bold'
        ? COLORS.primary
        : COLORS.ink;
    context.fillText(line.text, WIDTH / 2, line.y * HEIGHT, WIDTH - 260);
  }

  return canvas;
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Conversion du certificat en image impossible.'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)))
        .catch((error: unknown) =>
          reject(error instanceof Error ? error : new Error(String(error))),
        );
    }, 'image/png');
  });
}

/** Produit le certificat en PDF (A4 paysage). */
export async function buildCertificatePdf(
  data: CertificateData,
  labels: CertificateLabels,
): Promise<Blob> {
  const canvas = drawCertificate(data, labels);
  const png = await canvasToPngBytes(canvas);

  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setTitle(labels.title);
  pdf.setCreator(labels.appName);

  const image = await pdf.embedPng(png);
  // A4 paysage, en points PDF.
  const page = pdf.addPage([841.89, 595.28]);
  page.drawImage(image, { x: 0, y: 0, width: 841.89, height: 595.28 });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
