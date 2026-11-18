/**
 * Construction d'un lien `mailto:` — la moitié « côté utilisateur » de la
 * décision D49 : l'application ne peut pas envoyer d'email toute seule, elle
 * ouvre donc la messagerie de l'utilisateur avec un message déjà écrit.
 *
 * Les textes arrivent traduits : rien n'est rédigé ici (convention i18n).
 */
export interface Mailto {
  destinataire: string;
  sujet: string;
  corps: string;
}

/**
 * `encodeURIComponent` laisse passer `!'()*`, que certaines messageries
 * interprètent, et encode l'espace en `%20` — ce qui est correct dans une
 * chaîne de requête, là où `+` serait lu comme un espace par les unes et comme
 * un plus littéral par les autres. On encode donc strictement, et les sauts de
 * ligne deviennent `%0A`, seule forme comprise partout.
 */
function encoder(valeur: string): string {
  return encodeURIComponent(valeur).replace(
    /[!'()*]/g,
    (caractere) => `%${caractere.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function construireMailto({ destinataire, sujet, corps }: Mailto): string {
  const parametres = `subject=${encoder(sujet)}&body=${encoder(corps)}`;
  return `mailto:${encoder(destinataire)}?${parametres}`;
}
