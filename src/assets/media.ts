export const MEDIA = {
  heroCastle: '/src/assets/images/hero_kingdom_castle_1794875550663.jpg',
  portraitMale: '/src/assets/images/portrait_ruler_male_1794875551000.jpg',
  portraitFemale: '/src/assets/images/portrait_ruler_female_1794875551283.jpg',
  sceneWar: '/src/assets/images/scene_war_battlefield_1794875551543.jpg',
  sceneCourt: '/src/assets/images/scene_cathedral_court_1794875551695.jpg',
} as const;

export type SceneKey = 'castle' | 'war' | 'court';

export function getPortraitUrl(gender?: string): string {
  return gender === 'P' ? MEDIA.portraitFemale : MEDIA.portraitMale;
}

export function getSceneUrl(key: SceneKey): string {
  switch (key) {
    case 'war':
      return MEDIA.sceneWar;
    case 'court':
      return MEDIA.sceneCourt;
    case 'castle':
    default:
      return MEDIA.heroCastle;
  }
}

export function getBannerForRoute(route: string): { url: string; caption: string } {
  if (['pas', 'perang', 'wc', 'siege', 'kapal', 'salib', 'great', 'tani', 'hw'].includes(route)) {
    return {
      url: MEDIA.sceneWar,
      caption: 'Medan Kampanye & Kekuatan Militer',
    };
  }
  if (['dip', 'dc', 'pen', 'pj', 'job', 'ja', 'agama', 'sekte', 'reform', 'faksi', 'prot', 'kep', 'was', 'wasT', 'wasW', 'sr'].includes(route)) {
    return {
      url: MEDIA.sceneCourt,
      caption: 'Dewan Istana, Gereja & Diplomasi',
    };
  }
  return {
    url: MEDIA.heroCastle,
    caption: 'Kedaulatan, Wilayah & Dinasti',
  };
}
