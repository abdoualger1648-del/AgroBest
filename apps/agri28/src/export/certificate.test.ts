import { describe, expect, it } from 'vitest';
import { certificateLayout, type CertificateData, type CertificateLabels } from './certificate';

const data: CertificateData = {
  projectName: 'Élevage ovin Aïn Defla',
  lang: 'fr',
  completedOn: new Date('2026-11-18T10:00:00Z'),
  daysDone: 28,
};

const labels: CertificateLabels = {
  appName: 'Agricole DZ 360',
  title: 'Certificat de fin de parcours',
  intro: 'Ce certificat atteste que le projet',
  achievement: 'a suivi les 28 jours du parcours.',
  dateLine: 'Terminé le 18 novembre 2026',
  disclaimer:
    "Attestation de parcours : ce n'est ni un diplôme, ni une qualification professionnelle.",
};

describe('mise en page du certificat', () => {
  it('place le nom du projet et le titre', () => {
    const lines = certificateLayout(data, labels);
    const texts = lines.map((line) => line.text);

    expect(texts).toContain('Élevage ovin Aïn Defla');
    expect(texts).toContain('Certificat de fin de parcours');
    expect(texts[0]).toBe('Agricole DZ 360');
  });

  it('ordonne les lignes de haut en bas', () => {
    const positions = certificateLayout(data, labels).map((line) => line.y);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(Math.min(...positions)).toBeGreaterThan(0);
    expect(Math.max(...positions)).toBeLessThan(1);
  });

  it('met en avant le titre et le nom du projet', () => {
    const lines = certificateLayout(data, labels);
    const bold = lines.filter((line) => line.weight === 'bold').map((line) => line.text);
    expect(bold).toEqual(['Certificat de fin de parcours', 'Élevage ovin Aïn Defla']);
  });

  it('porte toujours la mention qui dit ce que le certificat n’est pas', () => {
    const lines = certificateLayout(data, labels);
    const last = lines[lines.length - 1];
    expect(last?.text).toBe(labels.disclaimer);
    expect(last?.muted).toBe(true);
  });

  it('fonctionne aussi avec un nom de projet en arabe', () => {
    const lines = certificateLayout({ ...data, lang: 'ar', projectName: 'تربية الأغنام' }, labels);
    expect(lines.map((line) => line.text)).toContain('تربية الأغنام');
  });
});
