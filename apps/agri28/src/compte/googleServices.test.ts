import { describe, expect, it } from 'vitest';
import { PAQUET_ANDROID, controlerGoogleServices } from './googleServices';

/**
 * Le défaut qui a réellement cassé l'APK 1.7.0 : un `google-services.json`
 * téléchargé avant d'avoir activé Google dans Authentication, donc sans
 * client OAuth web. Le build réussissait, l'APK s'installait, et la connexion
 * échouait sur le téléphone en disant seulement « quelque chose n'a pas
 * fonctionné ».
 */
function fichier(options: { paquet?: string; clientsOauth?: unknown[] } = {}): string {
  return JSON.stringify({
    project_info: { project_id: 'agricole360-4a470' },
    client: [
      {
        client_info: { android_client_info: { package_name: options.paquet ?? PAQUET_ANDROID } },
        oauth_client: options.clientsOauth ?? [
          { client_id: 'xxx.apps.googleusercontent.com', client_type: 3 },
        ],
        api_key: [{ current_key: 'AIza...' }],
      },
    ],
  });
}

describe('contrôle de google-services.json', () => {
  it('accepte un fichier complet', () => {
    expect(controlerGoogleServices(fichier())).toEqual({
      defaut: null,
      message: '',
      typesTrouves: [3],
    });
  });

  it('dit ce qu’il a trouvé, pas seulement ce qui manque', () => {
    // Sans cela, chaque échec coûtait un aller-retour pour savoir si le
    // fichier était incomplet ou si le secret n'avait pas été remplacé.
    const resultat = controlerGoogleServices(
      fichier({ clientsOauth: [{ client_id: 'a', client_type: 1 }] }),
    );
    expect(resultat.typesTrouves).toEqual([1]);
    expect(resultat.message).toContain('client_type présents dans le fichier : 1');
  });

  it('signale « aucun » quand le tableau des clients est vide', () => {
    expect(controlerGoogleServices(fichier({ clientsOauth: [] })).message).toContain('aucun');
  });

  it('refuse un fichier sans client OAuth web — le défaut de l’APK 1.7.0', () => {
    // Exactement ce que Firebase livre quand Google n'est pas encore activé :
    // le client Android est là, le client web (type 3) non.
    const resultat = controlerGoogleServices(
      fichier({ clientsOauth: [{ client_id: 'yyy', client_type: 1 }] }),
    );
    expect(resultat.defaut).toBe('aucun_client_web');
    // Le message doit dire quoi faire, pas seulement ce qui manque.
    expect(resultat.message).toContain('Activez Google');
  });

  it('refuse un fichier sans aucun client OAuth', () => {
    expect(controlerGoogleServices(fichier({ clientsOauth: [] })).defaut).toBe('aucun_client_web');
  });

  it('accepte le client web déclaré à l’ancienne place', () => {
    // Les fichiers plus anciens le rangent dans `other_platform_oauth_client`,
    // et le greffon Gradle lit les deux endroits.
    const ancien = JSON.stringify({
      client: [
        {
          client_info: { android_client_info: { package_name: PAQUET_ANDROID } },
          oauth_client: [{ client_id: 'yyy', client_type: 1 }],
          services: {
            appinvite_service: {
              other_platform_oauth_client: [{ client_id: 'z', client_type: 3 }],
            },
          },
        },
      ],
    });
    expect(controlerGoogleServices(ancien).defaut).toBeNull();
  });

  it('refuse un fichier qui ne contient pas notre application', () => {
    const resultat = controlerGoogleServices(fichier({ paquet: 'com.exemple.autre' }));
    expect(resultat.defaut).toBe('paquet_absent');
    expect(resultat.message).toContain(PAQUET_ANDROID);
  });

  it('refuse un collage tronqué ou vide', () => {
    expect(controlerGoogleServices('{"client": [').defaut).toBe('illisible');
    expect(controlerGoogleServices('').defaut).toBe('illisible');
    expect(controlerGoogleServices('{}').defaut).toBe('aucun_client');
  });
});
