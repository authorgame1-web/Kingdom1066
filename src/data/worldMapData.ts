export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 820;

export function lonLatToXY(lon: number, lat: number): [number, number] {
  const x = 30 + ((lon + 12.5) / 59) * 1140;
  const y = 30 + ((62.5 - lat) / 35) * 760;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

export function polygonFromLonLat(coords: [number, number][]): string {
  return coords
    .map(([lon, lat]) => {
      const [x, y] = lonLatToXY(lon, lat);
      return `${x},${y}`;
    })
    .join(' ');
}

export function centroidFromLonLat(coords: [number, number][]): [number, number] {
  if (!coords.length) return [600, 410];
  let sx = 0;
  let sy = 0;
  coords.forEach(([lon, lat]) => {
    const [x, y] = lonLatToXY(lon, lat);
    sx += x;
    sy += y;
  });
  return [Math.round((sx / coords.length) * 10) / 10, Math.round((sy / coords.length) * 10) / 10];
}

export interface MapRegionDef {
  id: string;
  label: string;
  zone: 'britain' | 'france' | 'iberia' | 'hre' | 'italia' | 'balkans' | 'byzantium' | 'africa';
  coords: [number, number][]; // [lon, lat]
  capitalLonLat?: [number, number];
  portLonLat?: [number, number];
}

export interface ContextRealmDef {
  id: string;
  label: string;
  sublabel: string;
  culture: string;
  coords: [number, number][];
}

// Wilayah tetangga konteks historis 1066 (mengacu 4 peta referensi: Eropa, Afrika Utara, Asia Barat, Rusia)
export const CONTEXT_1066_REALMS: ContextRealmDef[] = [
  {
    id: 'ctx_iceland',
    label: 'Islandia',
    sublabel: 'Persemakmuran Bebas Nordik (1066)',
    culture: 'norse',
    coords: [[-11.8, 61.6], [-8.8, 61.8], [-8.2, 60.5], [-11.5, 60.4]],
  },
  {
    id: 'ctx_norway',
    label: 'Kerajaan Norwegia',
    sublabel: 'Harald Hardrada / Olav III',
    culture: 'norse',
    coords: [[4.5, 58.0], [6.2, 61.8], [12.0, 62.2], [11.8, 59.0], [8.5, 58.2]],
  },
  {
    id: 'ctx_sweden',
    label: 'Kerajaan Swedia',
    sublabel: 'Dinasti Stenkil (1066)',
    culture: 'norse',
    coords: [[11.8, 59.0], [12.0, 62.2], [19.5, 62.2], [18.8, 59.0], [15.5, 56.0], [12.6, 56.2]],
  },
  {
    id: 'ctx_denmark',
    label: 'Kerajaan Denmark',
    sublabel: 'Sweyn II Estridsen (1066)',
    culture: 'norse',
    coords: [[8.1, 55.0], [8.4, 57.5], [10.8, 57.6], [12.6, 56.0], [11.5, 54.6], [9.4, 54.6]],
  },
  {
    id: 'ctx_poland',
    label: 'Kerajaan Polandia',
    sublabel: 'Dinasti Piast (Boleslaw II)',
    culture: 'polish',
    coords: [[14.5, 53.8], [19.5, 54.4], [23.8, 53.6], [23.5, 50.0], [19.2, 49.6], [17.0, 50.6], [14.8, 51.8]],
  },
  {
    id: 'ctx_baltic',
    label: 'Suku Baltik & Prussia',
    sublabel: 'Konfederasi Baltik Kuno (1066)',
    culture: 'polish',
    coords: [[19.5, 54.4], [21.5, 57.6], [26.8, 58.4], [27.5, 55.2], [23.8, 53.6]],
  },
  {
    id: 'ctx_kievan_rus',
    label: 'Rus Kiev (Rurikid)',
    sublabel: 'Kepangeranan Agung Kiev & Novgorod (1066)',
    culture: 'rus',
    coords: [[23.8, 53.6], [27.5, 55.2], [30.0, 59.8], [41.0, 60.5], [44.5, 55.0], [41.5, 49.0], [33.5, 47.0], [28.5, 47.5], [23.5, 50.0]],
  },
  {
    id: 'ctx_cuman',
    label: 'Stepa Cuman-Kipchak',
    sublabel: 'Konfederasi Nomaden Stepa Pontik & Kaspia',
    culture: 'pecheneg',
    coords: [[33.5, 47.0], [41.5, 49.0], [45.5, 47.0], [44.5, 43.2], [37.5, 45.2], [33.2, 45.2]],
  },
  {
    id: 'ctx_georgia',
    label: 'Kerajaan Georgia',
    sublabel: 'Bagrat IV (Kaukasus 1066)',
    culture: 'greek',
    coords: [[40.5, 42.6], [44.8, 43.0], [45.5, 40.8], [41.6, 41.2]],
  },
  {
    id: 'ctx_seljuk_great',
    label: 'Kekaisaran Seljuk Raya',
    sublabel: 'Alp Arslan (Persia, Irak & Suriah Utara 1066)',
    culture: 'turkish',
    coords: [[36.5, 36.8], [41.2, 37.8], [45.5, 40.8], [45.8, 30.5], [37.2, 31.5], [35.8, 35.0]],
  },
  {
    id: 'ctx_fatimid',
    label: 'Kekhalifahan Fatimiyah',
    sublabel: 'Mesir, Palestina & Levant Selatan (1066)',
    culture: 'maghrebi',
    coords: [[21.0, 32.0], [34.5, 31.6], [35.8, 35.0], [37.2, 31.5], [35.2, 28.0], [21.0, 28.0]],
  },
  {
    id: 'ctx_zirid_hammadid',
    label: 'Dinasti Hammadid & Zirid',
    sublabel: 'Aljazair, Tunisia & Tripolitania (1066)',
    culture: 'maghrebi',
    coords: [[-2.0, 35.2], [4.5, 36.8], [10.6, 37.1], [11.5, 33.2], [21.0, 32.0], [21.0, 28.0], [-2.0, 28.0]],
  },
  {
    id: 'ctx_corsica',
    label: 'Korsika (Pisa/Genova)',
    sublabel: 'Pulau Mediterania Barat',
    culture: 'italian',
    coords: [[8.5, 42.9], [9.5, 42.9], [9.4, 41.4], [8.6, 41.5]],
  },
  {
    id: 'ctx_polabian_slavia',
    label: 'Slavia Polabia',
    sublabel: 'Konfederasi Obotrit & Liutizi (1066)',
    culture: 'polish',
    coords: [[10.8, 54.0], [14.5, 53.8], [14.6, 52.2], [11.6, 52.3]],
  },
  {
    id: 'ctx_finn_sami',
    label: 'Finn & Sami',
    sublabel: 'Suku Finn, Sami & Karelia (1066)',
    culture: 'norse',
    coords: [[19.5, 62.2], [29.8, 62.3], [30.0, 59.8], [21.5, 59.8]],
  },
  {
    id: 'ctx_volga_bulgar',
    label: 'Bulgaria Volga',
    sublabel: 'Kekhanan Dagang Volga Tengah (1066)',
    culture: 'bulgarian',
    coords: [[41.8, 57.5], [46.2, 57.5], [46.0, 53.2], [42.0, 53.8]],
  },
  {
    id: 'ctx_syria_jazira',
    label: 'Emirat Suriah & Jazirah',
    sublabel: 'Dinasti Mirdasid & Uqaylid (1066)',
    culture: 'maghrebi',
    coords: [[35.8, 36.8], [41.2, 37.8], [41.5, 33.8], [36.0, 33.2]],
  },
];

export interface HistoricalLandmarkDef {
  id: string;
  label: string;
  sublabel: string;
  lonLat: [number, number];
  kind: 'battle' | 'city';
}

export const HISTORICAL_1066_LANDMARKS: HistoricalLandmarkDef[] = [
  {
    id: 'lm_stamford_bridge',
    label: 'Stamford Bridge (25 Sep 1066)',
    sublabel: 'Pertempuran Raja Harold II vs Harald Hardrada',
    lonLat: [-0.91, 53.99],
    kind: 'battle',
  },
  {
    id: 'lm_hastings',
    label: 'Hastings (14 Okt 1066)',
    sublabel: 'Pertempuran Penaklukan Norman atas Inggris',
    lonLat: [0.57, 50.86],
    kind: 'battle',
  },
  {
    id: 'lm_kordoba',
    label: 'Kordoba',
    sublabel: 'Pusat Keilmuan & Taifa Al-Andalus',
    lonLat: [-4.78, 37.88],
    kind: 'city',
  },
  {
    id: 'lm_novgorod',
    label: 'Novgorod',
    sublabel: 'Kota Dagang Utara Rus Kiev',
    lonLat: [31.27, 58.52],
    kind: 'city',
  },
  {
    id: 'lm_kiev',
    label: 'Kiev',
    sublabel: 'Ibukota Kepangeranan Agung Rus Kiev',
    lonLat: [30.52, 50.45],
    kind: 'city',
  },
  {
    id: 'lm_kairo',
    label: 'Kairo (al-Qahira)',
    sublabel: 'Ibukota Kekhalifahan Fatimiyah',
    lonLat: [31.24, 30.04],
    kind: 'city',
  },
  {
    id: 'lm_baghdad',
    label: 'Baghdad',
    sublabel: 'Kota Khalifah Abbasiyah di bawah Seljuk Agung',
    lonLat: [44.36, 33.31],
    kind: 'city',
  },
];

// Wilayah historis 1066 yang dipetakan ke ID gelar di gameData.json
export const MAP_REGIONS: MapRegionDef[] = [
  // === KEPULAUAN BRITANIA & IRLANDIA ===
  {
    id: 'd_moray',
    label: 'Moray',
    zone: 'britain',
    coords: [[-5.6, 58.5], [-2.0, 57.7], [-2.5, 56.9], [-5.2, 57.0]],
    portLonLat: [-2.1, 57.2],
  },
  {
    id: 'd_the_isles',
    label: 'The Isles',
    zone: 'britain',
    coords: [[-7.2, 58.2], [-5.5, 57.8], [-5.4, 55.6], [-6.5, 55.5]],
    portLonLat: [-5.8, 56.4],
  },
  {
    id: 'k_skotlandia',
    label: 'Skotlandia',
    zone: 'britain',
    coords: [[-5.2, 57.0], [-2.5, 56.9], [-2.7, 56.1], [-4.8, 56.0]],
    capitalLonLat: [-3.2, 56.3],
    portLonLat: [-2.8, 56.4],
  },
  {
    id: 'd_strathclyde',
    label: 'Strathclyde',
    zone: 'britain',
    coords: [[-5.4, 56.0], [-3.8, 56.0], [-3.6, 54.9], [-5.1, 54.8]],
    portLonLat: [-4.9, 55.4],
  },
  {
    id: 'd_lothian',
    label: 'Lothian',
    zone: 'britain',
    coords: [[-3.8, 56.0], [-2.1, 55.9], [-2.2, 55.2], [-3.6, 55.1]],
  },
  {
    id: 'd_northumbria',
    label: 'Northumbria',
    zone: 'britain',
    coords: [[-3.5, 55.1], [-1.6, 55.6], [-0.5, 54.2], [-2.8, 53.5], [-3.4, 54.4]],
    portLonLat: [-1.4, 55.0],
  },
  {
    id: 'd_mercia',
    label: 'Mercia',
    zone: 'britain',
    coords: [[-3.0, 53.5], [-0.4, 53.5], [-0.2, 51.8], [-2.8, 51.8]],
  },
  {
    id: 'd_east_anglia',
    label: 'East Anglia',
    zone: 'britain',
    coords: [[-0.2, 53.1], [1.7, 52.8], [1.4, 51.8], [-0.2, 51.8]],
    portLonLat: [1.3, 52.6],
  },
  {
    id: 'd_kent',
    label: 'Kent',
    zone: 'britain',
    coords: [[-0.5, 51.8], [1.4, 51.5], [1.2, 50.9], [-0.7, 50.9]],
    capitalLonLat: [1.0, 51.3],
    portLonLat: [1.3, 51.1],
  },
  {
    id: 'k_inggris',
    label: 'Inggris (Wessex)',
    zone: 'britain',
    coords: [[-5.7, 50.1], [-3.0, 51.8], [-0.7, 51.5], [-0.7, 50.7], [-5.2, 50.0]],
    capitalLonLat: [-1.3, 51.1],
    portLonLat: [-3.5, 50.4],
  },
  {
    id: 'd_gwynedd',
    label: 'Gwynedd',
    zone: 'britain',
    coords: [[-4.7, 53.3], [-3.0, 53.3], [-3.1, 52.3], [-4.3, 52.3]],
    portLonLat: [-4.1, 53.2],
  },
  {
    id: 'd_deheubarth',
    label: 'Deheubarth',
    zone: 'britain',
    coords: [[-5.2, 52.3], [-3.0, 52.3], [-2.9, 51.4], [-5.1, 51.6]],
    portLonLat: [-3.9, 51.6],
  },
  // Irlandia 1066
  {
    id: 'c_ulster',
    label: 'Ulster',
    zone: 'britain',
    coords: [[-7.0, 55.2], [-5.5, 55.2], [-5.5, 54.1], [-6.8, 54.1]],
    portLonLat: [-5.9, 54.6],
  },
  {
    id: 'c_ailech',
    label: 'Ailech',
    zone: 'britain',
    coords: [[-8.6, 55.3], [-7.0, 55.2], [-7.0, 54.4], [-8.5, 54.5]],
  },
  {
    id: 'c_oriel',
    label: 'Oriel',
    zone: 'britain',
    coords: [[-7.6, 54.4], [-6.2, 54.2], [-6.3, 53.6], [-7.6, 53.7]],
  },
  {
    id: 'd_connacht',
    label: 'Connacht',
    zone: 'britain',
    coords: [[-10.1, 54.3], [-7.7, 54.4], [-7.8, 53.0], [-9.9, 53.2]],
  },
  {
    id: 'c_dublin',
    label: 'Dublin',
    zone: 'britain',
    coords: [[-6.8, 53.7], [-6.0, 53.6], [-6.0, 53.1], [-6.9, 53.1]],
    capitalLonLat: [-6.26, 53.35],
    portLonLat: [-6.2, 53.35],
  },
  {
    id: 'c_leinster',
    label: 'Leinster',
    zone: 'britain',
    coords: [[-7.3, 53.1], [-6.0, 53.1], [-6.2, 52.2], [-7.3, 52.3]],
    portLonLat: [-6.4, 52.3],
  },
  {
    id: 'c_ossory',
    label: 'Ossory',
    zone: 'britain',
    coords: [[-7.9, 53.3], [-7.0, 53.2], [-7.0, 52.4], [-7.9, 52.5]],
  },
  {
    id: 'd_munster_ie',
    label: 'Munster',
    zone: 'britain',
    coords: [[-10.4, 52.9], [-7.6, 52.8], [-7.6, 51.8], [-10.2, 51.5]],
    portLonLat: [-8.5, 51.9],
  },

  // === SEMENANJUNG IBERIA & AFRIKA UTARA ===
  {
    id: 'd_galicia',
    label: 'Galicia',
    zone: 'iberia',
    coords: [[-9.3, 43.7], [-6.8, 43.6], [-6.9, 41.9], [-8.9, 41.9]],
    portLonLat: [-8.4, 43.4],
  },
  {
    id: 'd_portucale',
    label: 'Portucale',
    zone: 'iberia',
    coords: [[-8.9, 41.9], [-6.8, 41.9], [-6.8, 40.0], [-8.9, 40.1]],
    capitalLonLat: [-8.6, 41.15],
    portLonLat: [-8.7, 41.1],
  },
  {
    id: 'd_leon',
    label: 'León',
    zone: 'iberia',
    coords: [[-6.9, 43.6], [-4.6, 43.5], [-4.8, 40.4], [-6.9, 40.3]],
    capitalLonLat: [-5.57, 42.6],
    portLonLat: [-5.8, 43.5],
  },
  {
    id: 'k_castile_leon',
    label: 'Castile (Utara)',
    zone: 'iberia',
    coords: [[-4.7, 43.4], [-2.1, 43.3], [-2.1, 41.4], [-4.7, 41.4]],
    capitalLonLat: [-3.7, 42.34],
  },
  {
    id: 'd_castile',
    label: 'Castile (Selatan)',
    zone: 'iberia',
    coords: [[-5.0, 41.4], [-2.1, 41.4], [-2.4, 40.2], [-5.1, 40.2]],
  },
  {
    id: 'k_aragon',
    label: 'Aragon & Navarre',
    zone: 'iberia',
    coords: [[-2.1, 43.3], [0.8, 42.8], [0.7, 41.5], [-2.1, 41.5]],
    capitalLonLat: [-0.55, 42.57],
  },
  {
    id: 'd_barcelona',
    label: 'Barcelona',
    zone: 'iberia',
    coords: [[0.7, 42.6], [3.2, 42.4], [1.3, 40.6], [0.3, 41.0]],
    capitalLonLat: [2.17, 41.38],
    portLonLat: [2.2, 41.35],
  },
  {
    id: 'd_andalus_taifa',
    label: 'Taifa Al-Andalus',
    zone: 'iberia',
    coords: [[-9.4, 40.1], [-2.1, 41.4], [0.4, 40.8], [-0.3, 38.4], [-5.4, 36.0], [-9.0, 37.0]],
    capitalLonLat: [-5.98, 37.39],
    portLonLat: [-9.1, 38.7],
  },
  {
    id: 'd_fez',
    label: 'Fez & Rif',
    zone: 'africa',
    coords: [[-6.6, 35.8], [-2.0, 35.2], [-2.2, 33.1], [-6.8, 33.4]],
    portLonLat: [-5.8, 35.75],
  },
  {
    id: 'd_marrakech',
    label: 'Marrakech (Almoravid)',
    zone: 'africa',
    coords: [[-10.2, 33.4], [-2.2, 33.1], [-2.4, 29.0], [-10.5, 29.0]],
    capitalLonLat: [-8.0, 31.63],
    portLonLat: [-9.6, 30.4],
  },

  // === PRANCIS (1066) ===
  {
    id: 'd_brittany',
    label: 'Brittany',
    zone: 'france',
    coords: [[-4.8, 48.6], [-1.3, 48.6], [-1.3, 47.2], [-4.5, 47.7]],
    portLonLat: [-4.4, 48.35],
  },
  {
    id: 'd_normandy',
    label: 'Normandy',
    zone: 'france',
    coords: [[-1.9, 49.7], [1.6, 50.0], [1.6, 48.4], [-1.4, 48.5]],
    portLonLat: [-0.3, 49.3],
  },
  {
    id: 'd_flanders',
    label: 'Flanders',
    zone: 'france',
    coords: [[1.6, 51.0], [3.5, 51.3], [3.6, 50.2], [1.6, 50.0]],
    portLonLat: [2.3, 51.0],
  },
  {
    id: 'k_francia',
    label: 'Mahkota Prancis',
    zone: 'france',
    coords: [[-1.3, 48.5], [3.5, 50.1], [3.4, 46.5], [-1.2, 46.7]],
    capitalLonLat: [2.35, 48.86],
    portLonLat: [1.6, 50.7],
  },
  {
    id: 'd_champagne',
    label: 'Champagne',
    zone: 'france',
    coords: [[3.4, 50.0], [5.2, 49.8], [5.1, 47.8], [3.3, 47.9]],
  },
  {
    id: 'd_burgundy',
    label: 'Burgundy',
    zone: 'france',
    coords: [[3.3, 47.9], [5.4, 47.8], [5.2, 46.1], [3.4, 46.2]],
  },
  {
    id: 'd_aquitaine',
    label: 'Aquitaine',
    zone: 'france',
    coords: [[-1.8, 46.8], [3.3, 46.4], [2.4, 43.4], [-1.7, 43.3]],
    portLonLat: [-1.1, 44.6],
  },
  {
    id: 'd_toulouse',
    label: 'Toulouse',
    zone: 'france',
    coords: [[0.5, 44.5], [4.3, 44.5], [3.6, 42.6], [0.4, 42.8]],
    portLonLat: [3.0, 43.1],
  },

  // === KEKAISARAN ROMAWI SUCI (HRE 1066) ===
  {
    id: 'd_holland',
    label: 'Holland & Frisia',
    zone: 'hre',
    coords: [[3.5, 51.4], [7.0, 53.5], [7.0, 52.3], [4.2, 51.6]],
    portLonLat: [4.5, 52.4],
  },
  {
    id: 'd_utrecht',
    label: 'Utrecht',
    zone: 'hre',
    coords: [[4.5, 52.3], [7.0, 52.3], [6.8, 51.5], [4.6, 51.6]],
  },
  {
    id: 'd_brabant',
    label: 'Brabant & Koln',
    zone: 'hre',
    coords: [[3.6, 51.5], [7.3, 51.5], [7.2, 49.9], [3.6, 50.1]],
    capitalLonLat: [6.08, 50.78],
  },
  {
    id: 'd_upper_lotharingia',
    label: 'Lotharingia Atas',
    zone: 'hre',
    coords: [[5.1, 50.0], [7.6, 49.9], [7.3, 48.2], [5.1, 48.2]],
  },
  {
    id: 'd_angria',
    label: 'Saxony / Angria',
    zone: 'hre',
    coords: [[7.0, 53.8], [11.6, 54.0], [11.8, 51.3], [7.2, 51.3]],
    portLonLat: [8.8, 53.5],
  },
  {
    id: 'd_meissen',
    label: 'Meissen (Mark)',
    zone: 'hre',
    coords: [[11.6, 52.3], [13.8, 52.2], [13.5, 50.6], [11.4, 50.8]],
  },
  {
    id: 'd_lausitz',
    label: 'Lausitz (Mark)',
    zone: 'hre',
    coords: [[13.6, 52.4], [15.1, 52.2], [14.9, 50.8], [13.4, 50.8]],
  },
  {
    id: 'd_nordgau',
    label: 'Nordgau & Mainz',
    zone: 'hre',
    coords: [[7.3, 51.2], [12.1, 50.9], [11.8, 49.0], [7.5, 49.2]],
    capitalLonLat: [8.25, 50.0],
  },
  {
    id: 'd_swabia',
    label: 'Swabia',
    zone: 'hre',
    coords: [[6.8, 49.1], [10.4, 49.0], [10.1, 46.3], [6.6, 46.5]],
  },
  {
    id: 'd_bavaria',
    label: 'Bavaria',
    zone: 'hre',
    coords: [[10.3, 49.2], [13.6, 48.9], [13.3, 47.4], [10.3, 47.5]],
  },
  {
    id: 'd_tyrol',
    label: 'Tyrol',
    zone: 'hre',
    coords: [[10.1, 47.5], [12.6, 47.4], [12.4, 46.5], [10.1, 46.5]],
  },
  {
    id: 'd_salzburg',
    label: 'Salzburg',
    zone: 'hre',
    coords: [[12.5, 47.8], [13.8, 47.8], [13.7, 47.0], [12.5, 47.1]],
  },
  {
    id: 'd_savoy',
    label: 'Savoy & Jura',
    zone: 'hre',
    coords: [[5.2, 47.7], [7.2, 47.4], [6.9, 45.4], [5.1, 45.8]],
  },
  {
    id: 'd_provence',
    label: 'Provence',
    zone: 'hre',
    coords: [[4.3, 45.8], [7.1, 45.4], [7.3, 43.4], [4.4, 43.3]],
    portLonLat: [6.8, 43.6],
  },
  {
    id: 'k_bohemia',
    label: 'Bohemia',
    zone: 'hre',
    coords: [[12.2, 50.9], [17.8, 50.5], [17.5, 48.7], [13.4, 48.8]],
    capitalLonLat: [14.42, 50.08],
  },
  {
    id: 'd_austria',
    label: 'Austria (Ostmark)',
    zone: 'hre',
    coords: [[13.5, 48.9], [16.9, 48.7], [16.7, 47.6], [13.5, 47.7]],
  },
  {
    id: 'd_steyermark',
    label: 'Steyermark (Mark)',
    zone: 'hre',
    coords: [[13.6, 47.7], [16.5, 47.6], [16.2, 46.6], [13.6, 46.7]],
  },
  {
    id: 'd_carinthia',
    label: 'Carinthia & Istria',
    zone: 'hre',
    coords: [[12.5, 46.8], [15.4, 46.6], [14.5, 44.9], [13.4, 45.4]],
    portLonLat: [13.8, 45.4],
  },

  // === ITALIA & KEPAUSAN (1066) ===
  {
    id: 'm_turin',
    label: 'Mark Turin',
    zone: 'italia',
    coords: [[6.8, 45.9], [8.3, 45.8], [8.1, 44.3], [6.9, 44.4]],
  },
  {
    id: 'm_montferrat',
    label: 'Mark Montferrat',
    zone: 'italia',
    coords: [[7.8, 45.2], [9.0, 45.1], [8.7, 44.2], [7.8, 44.2]],
  },
  {
    id: 'd_genoa',
    label: 'Rep. Genova',
    zone: 'italia',
    coords: [[7.9, 44.5], [9.8, 44.4], [9.7, 44.0], [7.8, 43.9]],
    capitalLonLat: [8.93, 44.41],
    portLonLat: [8.93, 44.35],
  },
  {
    id: 'd_lombardy',
    label: 'Lombardia',
    zone: 'italia',
    coords: [[8.3, 46.3], [10.6, 46.2], [10.4, 45.0], [8.4, 45.1]],
    capitalLonLat: [9.19, 45.46],
  },
  {
    id: 'm_verona',
    label: 'Mark Verona',
    zone: 'italia',
    coords: [[10.5, 46.3], [12.3, 46.2], [12.1, 45.2], [10.5, 45.2]],
  },
  {
    id: 'd_venice',
    label: 'Venesia',
    zone: 'italia',
    coords: [[12.1, 45.7], [13.0, 45.7], [12.8, 45.1], [12.0, 45.1]],
    capitalLonLat: [12.32, 45.44],
    portLonLat: [12.4, 45.35],
  },
  {
    id: 'm_friuli',
    label: 'Mark Friuli',
    zone: 'italia',
    coords: [[12.3, 46.5], [13.6, 46.4], [13.6, 45.6], [12.3, 45.6]],
    portLonLat: [13.3, 45.7],
  },
  {
    id: 'm_emilia',
    label: 'Mark Emilia',
    zone: 'italia',
    coords: [[9.4, 45.1], [12.4, 45.0], [12.3, 44.1], [9.5, 44.2]],
    portLonLat: [12.2, 44.4],
  },
  {
    id: 'm_tuscany',
    label: 'Mark Tuscany',
    zone: 'italia',
    coords: [[9.8, 44.2], [12.1, 44.1], [11.9, 42.5], [10.2, 42.8]],
    capitalLonLat: [11.25, 43.77],
    portLonLat: [10.4, 43.7],
  },
  {
    id: 'd_spoleto',
    label: 'Spoleto',
    zone: 'italia',
    coords: [[11.9, 43.9], [13.9, 43.6], [13.6, 42.4], [12.0, 42.6]],
    portLonLat: [13.5, 43.6],
  },
  {
    id: 'd_papal',
    label: 'Negara Kepausan',
    zone: 'italia',
    coords: [[11.5, 42.6], [13.6, 42.4], [13.9, 41.2], [11.8, 41.5]],
    capitalLonLat: [12.48, 41.9],
    portLonLat: [11.9, 42.0],
  },
  {
    id: 'd_sardinia',
    label: 'Sardinia',
    zone: 'italia',
    coords: [[8.2, 41.1], [9.7, 41.1], [9.6, 39.0], [8.3, 39.0]],
    portLonLat: [9.1, 39.2],
  },
  {
    id: 'p_capua',
    label: 'Capua',
    zone: 'italia',
    coords: [[13.5, 41.6], [14.7, 41.5], [14.5, 40.9], [13.6, 41.0]],
    portLonLat: [13.7, 41.2],
  },
  {
    id: 'd_naples',
    label: 'Napoli',
    zone: 'italia',
    coords: [[13.8, 41.0], [14.6, 41.0], [14.5, 40.5], [13.8, 40.6]],
    capitalLonLat: [14.27, 40.85],
    portLonLat: [14.27, 40.8],
  },
  {
    id: 'p_salerno',
    label: 'Salerno',
    zone: 'italia',
    coords: [[14.5, 41.1], [15.7, 41.0], [15.6, 40.1], [14.5, 40.2]],
    portLonLat: [14.75, 40.65],
  },
  {
    id: 'd_apulia',
    label: 'Apulia & Calabria',
    zone: 'italia',
    coords: [[15.2, 41.8], [18.4, 40.2], [16.2, 38.0], [15.6, 38.2], [15.3, 40.2]],
    portLonLat: [16.87, 41.12],
  },
  {
    id: 'd_sicily',
    label: 'Emirat Sisilia',
    zone: 'italia',
    coords: [[12.4, 38.2], [15.5, 38.2], [15.1, 36.7], [12.5, 37.5]],
    capitalLonLat: [13.36, 38.12],
    portLonLat: [13.4, 38.1],
  },

  // === BALKAN, HUNGARIA & STEPPA ===
  {
    id: 'k_hungaria',
    label: 'Kerajaan Hungaria',
    zone: 'balkans',
    coords: [[16.5, 48.7], [24.2, 48.3], [24.8, 45.5], [19.5, 45.4], [16.5, 46.8]],
    capitalLonLat: [18.74, 47.79],
  },
  {
    id: 'k_kroasia',
    label: 'Kroasia & Dalmatia',
    zone: 'balkans',
    coords: [[14.6, 46.2], [18.7, 45.9], [18.5, 42.6], [16.0, 43.4], [14.5, 44.8]],
    capitalLonLat: [16.44, 43.51],
    portLonLat: [16.4, 43.5],
  },
  {
    id: 'k_duklja',
    label: 'Duklja / Zeta',
    zone: 'balkans',
    coords: [[18.5, 43.9], [21.9, 43.8], [21.5, 41.7], [18.6, 42.1]],
    capitalLonLat: [19.5, 42.06],
    portLonLat: [18.77, 42.42],
  },
  {
    id: 'd_pecheneg',
    label: 'Pecheneg',
    zone: 'balkans',
    coords: [[24.2, 48.2], [29.6, 46.2], [28.4, 43.6], [23.0, 43.8], [24.5, 45.6]],
    portLonLat: [28.6, 44.2],
  },

  // === KEKAISARAN BIZANTIUM & ANATOLIA TIMUR (1066) ===
  {
    id: 'd_bulgaria',
    label: 'Tema Bulgaria',
    zone: 'byzantium',
    coords: [[20.8, 43.8], [27.8, 43.7], [27.4, 41.2], [22.8, 40.3], [19.8, 41.2]],
    portLonLat: [22.94, 40.64],
  },
  {
    id: 'd_thrace',
    label: 'Konstantinopel & Thrace',
    zone: 'byzantium',
    coords: [[26.2, 42.2], [29.2, 41.6], [28.9, 40.8], [26.0, 40.2]],
    capitalLonLat: [28.98, 41.01],
    portLonLat: [28.98, 40.98],
  },
  {
    id: 'd_nikaea',
    label: 'Anatolia Barat',
    zone: 'byzantium',
    coords: [[26.4, 40.5], [31.5, 41.3], [31.0, 37.3], [26.8, 37.8]],
    portLonLat: [27.14, 38.42],
  },
  {
    id: 'd_anatolia_tengah',
    label: 'Kapadokia & Rum',
    zone: 'byzantium',
    coords: [[31.3, 41.4], [39.9, 41.2], [38.2, 37.3], [31.0, 37.3]],
    capitalLonLat: [32.48, 37.87],
    portLonLat: [39.72, 41.0],
  },
  {
    id: 'd_seljuk_timur',
    label: 'Perbatasan Seljuk',
    zone: 'byzantium',
    coords: [[39.6, 41.1], [44.2, 40.2], [44.0, 37.6], [38.5, 37.5]],
    capitalLonLat: [41.27, 39.9],
  },
];

export const MAP_REGION_BY_ID: Record<string, MapRegionDef> = Object.fromEntries(
  MAP_REGIONS.map((r) => [r.id, r])
);

export const COUNTY_OVERRIDES_LONLAT: Record<string, [number, number]> = {
  c_praha: [14.42, 50.08],
  c_olomouc: [17.25, 49.59],
  c_brno: [16.61, 49.19],
  c_munchen: [11.58, 48.14],
  c_augsburg: [10.9, 48.37],
  c_innsbruck: [11.4, 47.27],
  c_zurich: [8.54, 47.37],
  c_bern: [7.45, 46.95],
  c_strassburg: [7.75, 48.58],
  c_mainz: [8.25, 50.0],
  c_frankfurt: [8.68, 50.11],
  c_metz: [6.18, 49.12],
  c_trier: [6.64, 49.75],
  c_aachen: [6.08, 50.78],
  c_cologne: [6.96, 50.94],
  c_brabant: [4.35, 50.85],
  c_bremen: [8.8, 53.08],
  c_lubice: [10.68, 53.87],
  c_holland: [4.5, 52.2],
  c_zeeland: [3.8, 51.5],
  c_roma: [12.48, 41.9],
  c_florence: [11.25, 43.77],
  c_pisa: [10.4, 43.72],
  c_milan: [9.19, 45.46],
  c_venezia: [12.32, 45.44],
  c_genova: [8.93, 44.41],
  c_napoli: [14.27, 40.85],
  c_palermo: [13.36, 38.12],
  c_valois: [2.35, 48.86],
  c_bayeux: [-0.7, 49.28],
  c_reims: [4.03, 49.25],
  c_dorset: [-2.4, 50.75],
  c_norfolk: [1.3, 52.63],
  c_northumberland: [-1.6, 55.2],
  c_fife: [-3.1, 56.2],
  c_burgos: [-3.7, 42.34],
  c_leon: [-5.57, 42.6],
  c_porto: [-8.61, 41.15],
  c_lisbon: [-9.14, 38.72],
  c_sevilla: [-5.98, 37.39],
  c_cordoba: [-4.78, 37.88],
  c_toledo: [-4.02, 39.86],
  c_granada: [-3.6, 37.18],
  c_barcelona: [2.17, 41.38],
  c_marrakech: [-8.0, 31.63],
  c_tangier: [-5.81, 35.76],
  c_fez: [-5.0, 34.03],
  c_constantinople: [28.98, 41.01],
  c_thessalonica: [22.94, 40.64],
  c_smyrna: [27.14, 38.42],
  c_trebizond: [39.72, 41.0],
  c_konya: [32.48, 37.87],
  c_erzurum: [41.27, 39.9],
  c_esztergom: [18.74, 47.79],
  c_buda: [19.04, 47.5],
  c_split: [16.44, 43.51],
  c_dubrovnik: [18.09, 42.65],
  c_skadar: [19.51, 42.07],
};
