import { describe, expect, it } from 'vitest';
import { construireMailto } from './mailto';

describe('construireMailto', () => {
  it('place le destinataire, le sujet et le corps', () => {
    const lien = construireMailto({
      destinataire: 'admin@example.dz',
      sujet: 'Demande',
      corps: 'Bonjour',
    });
    expect(lien).toBe('mailto:admin%40example.dz?subject=Demande&body=Bonjour');
  });

  it('encode les sauts de ligne en %0A, et jamais en + ni en espace brut', () => {
    const lien = construireMailto({
      destinataire: 'a@b.dz',
      sujet: 's',
      corps: 'ligne un\nligne deux',
    });
    expect(lien).toContain('body=ligne%20un%0Aligne%20deux');
    expect(lien).not.toContain('+');
  });

  it('encode les caractères que certaines messageries interprètent', () => {
    const lien = construireMailto({
      destinataire: 'a@b.dz',
      sujet: 'Activation (urgent)*',
      corps: "c'est ça !",
    });
    expect(lien).toContain('subject=Activation%20%28urgent%29%2A');
    expect(lien).toContain('body=c%27est%20%C3%A7a%20%21');
  });

  it('survit à l’arabe et aux accents', () => {
    const lien = construireMailto({
      destinataire: 'a@b.dz',
      sujet: 'طلب التفعيل',
      corps: 'Élevage ovin',
    });
    expect(lien).toContain('subject=%D8%B7%D9%84%D8%A8');
    expect(lien).toContain('body=%C3%89levage%20ovin');
  });

  it('n’introduit jamais d’espace littéral, qui casserait le lien', () => {
    const lien = construireMailto({
      destinataire: 'a@b.dz',
      sujet: 'a b',
      corps: 'c d',
    });
    expect(lien).not.toMatch(/ /);
  });
});
