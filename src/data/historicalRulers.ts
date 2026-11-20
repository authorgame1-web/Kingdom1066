export interface HistoricalPredecessor {
  nama: string;
  julukan?: string;
  dari: number;
  sampai: number;
  sebab?: string;
  regnalNumber?: number;
  dinastiNama?: string;
}

export interface HistoricalTitleSeed {
  titleId: string;
  predecessors: HistoricalPredecessor[];
  /** Jumlah penguasa lebih awal yang tercatat sebelum daftar di atas (untuk gelar kuno spt Paus/Bizantium/Venesia) */
  priorOffset?: number;
  priorNote?: string;
  current1066?: {
    charId: string;
    baseName: string;
    regnalNumber: number;
    forced?: boolean;
  };
}

export const HISTORICAL_TITLE_SEEDS: HistoricalTitleSeed[] = [
  {
    titleId: 'k_francia',
    predecessors: [
      { nama: 'Hugh Capet', julukan: 'Pendiri Wangsa Capet', dari: 987, sampai: 996, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Capet' },
      { nama: 'Robert II', julukan: 'yang Saleh', dari: 996, sampai: 1031, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Capet' },
      { nama: 'Henri I', dari: 1031, sampai: 1060, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Capet' },
    ],
    current1066: { charId: 'philip1', baseName: 'Philip', regnalNumber: 1, forced: true },
  },
  {
    titleId: 'e_hre',
    predecessors: [
      { nama: 'Otto I', julukan: 'yang Agung', dari: 962, sampai: 973, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Ottonian' },
      { nama: 'Otto II', julukan: 'yang Merah', dari: 973, sampai: 983, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Ottonian' },
      { nama: 'Otto III', julukan: 'Keajaiban Dunia', dari: 983, sampai: 1002, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Ottonian' },
      { nama: 'Henry II', julukan: 'yang Kudus', dari: 1002, sampai: 1024, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Ottonian' },
      { nama: 'Conrad II', julukan: 'Sang Salian', dari: 1024, sampai: 1039, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Salian (Franconia)' },
      { nama: 'Henry III', julukan: 'yang Hitam', dari: 1039, sampai: 1056, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Salian (Franconia)' },
    ],
    current1066: { charId: 'henry4', baseName: 'Henry', regnalNumber: 4, forced: true },
  },
  {
    titleId: 'k_italia',
    predecessors: [
      { nama: 'Berengar I', dari: 888, sampai: 924, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Unruoching' },
      { nama: 'Hugh', julukan: 'dari Arles', dari: 926, sampai: 947, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Bosonid' },
      { nama: 'Lothair II', dari: 947, sampai: 950, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Bosonid' },
      { nama: 'Berengar II', dari: 950, sampai: 961, sebab: 'ditaklukkan', regnalNumber: 2, dinastiNama: 'Anscarid' },
      { nama: 'Otto I', dari: 961, sampai: 973, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Ottonian' },
      { nama: 'Otto II', dari: 973, sampai: 983, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Ottonian' },
      { nama: 'Otto III', dari: 983, sampai: 1002, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Ottonian' },
      { nama: 'Arduin', dari: 1002, sampai: 1014, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Anscarid' },
      { nama: 'Henry II', dari: 1004, sampai: 1024, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Ottonian' },
      { nama: 'Conrad II', dari: 1026, sampai: 1039, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Salian (Franconia)' },
      { nama: 'Henry III', dari: 1039, sampai: 1056, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Salian (Franconia)' },
    ],
    current1066: { charId: 'henry4', baseName: 'Henry', regnalNumber: 4, forced: true },
  },
  {
    titleId: 'd_normandy',
    predecessors: [
      { nama: 'Rollo', julukan: 'Sang Pejalan', dari: 911, sampai: 927, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Normandia' },
      { nama: 'William', julukan: 'Pedang Panjang', dari: 927, sampai: 942, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Normandia' },
      { nama: 'Richard', julukan: 'yang Tak Kenal Takut', dari: 942, sampai: 996, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Normandia' },
      { nama: 'Richard', julukan: 'yang Baik', dari: 996, sampai: 1026, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Normandia' },
      { nama: 'Richard', dari: 1026, sampai: 1027, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Normandia' },
      { nama: 'Robert', julukan: 'yang Megah', dari: 1027, sampai: 1035, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Normandia' },
    ],
    current1066: { charId: 'william', baseName: 'William', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'k_inggris',
    predecessors: [
      { nama: 'Æthelstan', julukan: 'Raja Pertama Inggris Bersatu', dari: 927, sampai: 939, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Edmund', dari: 939, sampai: 946, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Eadred', dari: 946, sampai: 955, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Eadwig', dari: 955, sampai: 959, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Edgar', julukan: 'yang Damai', dari: 959, sampai: 975, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Edward', julukan: 'Sang Martir', dari: 975, sampai: 978, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Wessex' },
      { nama: 'Æthelred', julukan: 'yang Kurang Nasihat', dari: 978, sampai: 1016, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Wessex' },
      { nama: 'Sweyn', julukan: 'Janggut Garpu', dari: 1013, sampai: 1014, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Knýtlinga' },
      { nama: 'Edmund', julukan: 'Sisi Besi', dari: 1016, sampai: 1016, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Wessex' },
      { nama: 'Cnut', julukan: 'yang Agung', dari: 1016, sampai: 1035, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Knýtlinga' },
      { nama: 'Harold', julukan: 'Kaki Kelinci', dari: 1035, sampai: 1040, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Knýtlinga' },
      { nama: 'Harthacnut', dari: 1040, sampai: 1042, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Knýtlinga' },
      { nama: 'Edward', julukan: 'Sang Pengaku Iman', dari: 1042, sampai: 1066, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Wessex' },
    ],
    current1066: { charId: 'harold', baseName: 'Harold', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'k_skotlandia',
    predecessors: [
      { nama: 'Kenneth', julukan: 'MacAlpin', dari: 843, sampai: 858, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Donald', dari: 858, sampai: 862, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Constantine', dari: 862, sampai: 877, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Áed', dari: 877, sampai: 878, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Giric', dari: 878, sampai: 889, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Donald', dari: 889, sampai: 900, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Alpin' },
      { nama: 'Constantine', dari: 900, sampai: 943, sebab: 'turun_tahta', regnalNumber: 2, dinastiNama: 'Alpin' },
      { nama: 'Malcolm', dari: 943, sampai: 954, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Indulf', dari: 954, sampai: 962, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Dub', dari: 962, sampai: 967, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Cuilén', dari: 967, sampai: 971, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Alpin' },
      { nama: 'Kenneth', dari: 971, sampai: 995, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Alpin' },
      { nama: 'Constantine', dari: 995, sampai: 997, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Alpin' },
      { nama: 'Kenneth', dari: 997, sampai: 1005, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Alpin' },
      { nama: 'Malcolm', dari: 1005, sampai: 1034, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Alpin' },
      { nama: 'Duncan', dari: 1034, sampai: 1040, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Dunkeld' },
      { nama: 'Macbeth', dari: 1040, sampai: 1057, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Moray' },
      { nama: 'Lulach', dari: 1057, sampai: 1058, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Moray' },
    ],
    current1066: { charId: 'malcolm', baseName: 'Malcolm', regnalNumber: 3, forced: true },
  },
  {
    titleId: 'e_bizantium',
    priorOffset: 49,
    priorNote: '49 Kaisar Romawi Timur terdahulu sejak Konstantinus I Agung (324–886 M, mencakup Konstantinus I–VI)',
    predecessors: [
      { nama: 'Leo VI', julukan: 'yang Bijak', dari: 886, sampai: 912, sebab: 'wafat', regnalNumber: 6, dinastiNama: 'Makedonia' },
      { nama: 'Alexander', dari: 912, sampai: 913, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Makedonia' },
      { nama: 'Constantine', julukan: 'Porphyrogenitus', dari: 913, sampai: 959, sebab: 'wafat', regnalNumber: 7, dinastiNama: 'Makedonia' },
      { nama: 'Romanos I', julukan: 'Lekapenos', dari: 920, sampai: 944, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Lekapenos' },
      { nama: 'Romanos II', dari: 959, sampai: 963, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Makedonia' },
      { nama: 'Nikephoros II', julukan: 'Phokas', dari: 963, sampai: 969, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Phokas' },
      { nama: 'John I', julukan: 'Tzimiskes', dari: 969, sampai: 976, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Kourkouas' },
      { nama: 'Basil II', julukan: 'Pembantai Bulgar', dari: 976, sampai: 1025, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Makedonia' },
      { nama: 'Constantine', dari: 1025, sampai: 1028, sebab: 'wafat', regnalNumber: 8, dinastiNama: 'Makedonia' },
      { nama: 'Romanos III', julukan: 'Argyros', dari: 1028, sampai: 1034, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Argyros' },
      { nama: 'Michael IV', dari: 1034, sampai: 1041, sebab: 'wafat', regnalNumber: 4, dinastiNama: 'Paphlagonian' },
      { nama: 'Michael V', dari: 1041, sampai: 1042, sebab: 'ditaklukkan', regnalNumber: 5, dinastiNama: 'Kalaphates' },
      { nama: 'Constantine', julukan: 'Monomachos', dari: 1042, sampai: 1055, sebab: 'wafat', regnalNumber: 9, dinastiNama: 'Monomachos' },
      { nama: 'Theodora', dari: 1055, sampai: 1056, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Makedonia' },
      { nama: 'Michael VI', dari: 1056, sampai: 1057, sebab: 'turun_tahta', regnalNumber: 6, dinastiNama: 'Bringas' },
      { nama: 'Isaac I', julukan: 'Komnenos', dari: 1057, sampai: 1059, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Komnenos' },
    ],
    current1066: { charId: 'constantine_x', baseName: 'Constantine', regnalNumber: 10, forced: true },
  },
  {
    titleId: 'd_papal',
    priorOffset: 149,
    priorNote: '149 Paus terdahulu sejak Santo Petrus (30–1046 M)',
    predecessors: [
      { nama: 'Paus Clement II', dari: 1046, sampai: 1047, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Paus Damasus II', dari: 1048, sampai: 1048, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Paus Leo IX', dari: 1049, sampai: 1054, sebab: 'wafat', regnalNumber: 9 },
      { nama: 'Paus Victor II', dari: 1055, sampai: 1057, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Paus Stephen IX', dari: 1057, sampai: 1058, sebab: 'wafat', regnalNumber: 9 },
      { nama: 'Paus Nicholas II', dari: 1059, sampai: 1061, sebab: 'wafat', regnalNumber: 2 },
    ],
    current1066: { charId: 'paus', baseName: 'Paus Alexander', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'd_venice',
    priorOffset: 25,
    priorNote: '25 Doge Venesia terdahulu sejak Paolo Lucio Anafesto (697–991 M)',
    predecessors: [
      { nama: 'Pietro II Orseolo', dari: 991, sampai: 1009, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Orseolo' },
      { nama: 'Otto Orseolo', dari: 1009, sampai: 1026, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Orseolo' },
      { nama: 'Pietro Barbolano', dari: 1026, sampai: 1032, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Barbolano' },
      { nama: 'Domenico Flabanico', dari: 1032, sampai: 1043, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Flabanico' },
    ],
    current1066: { charId: 'doge', baseName: 'Domenico Contarini', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'k_bohemia',
    predecessors: [
      { nama: 'Bořivoj', dari: 870, sampai: 889, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Spytihněv', dari: 894, sampai: 915, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Vratislaus', dari: 915, sampai: 921, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Wenceslaus', julukan: 'Sang Kudus', dari: 921, sampai: 935, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Boleslaus', julukan: 'yang Kejam', dari: 935, sampai: 972, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Boleslaus', julukan: 'yang Saleh', dari: 972, sampai: 999, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Premyslid' },
      { nama: 'Boleslaus', dari: 999, sampai: 1003, sebab: 'ditaklukkan', regnalNumber: 3, dinastiNama: 'Premyslid' },
      { nama: 'Vladivoj', dari: 1002, sampai: 1003, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Piast' },
      { nama: 'Jaromír', dari: 1004, sampai: 1012, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Oldřich', dari: 1012, sampai: 1034, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Bretislaus', dari: 1035, sampai: 1055, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Premyslid' },
      { nama: 'Spytihněv', dari: 1055, sampai: 1061, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Premyslid' },
    ],
    current1066: { charId: 'vratislaus', baseName: 'Vratislaus', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'k_hungaria',
    predecessors: [
      { nama: 'Stephen I', julukan: 'Sang Rasul & Pendiri Kerajaan', dari: 997, sampai: 1038, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Árpád' },
      { nama: 'Peter Orseolo', dari: 1038, sampai: 1041, sebab: 'ditaklukkan', regnalNumber: 1, dinastiNama: 'Orseolo' },
      { nama: 'Samuel Aba', dari: 1041, sampai: 1044, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Aba' },
      { nama: 'Peter Orseolo', dari: 1044, sampai: 1046, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Orseolo' },
      { nama: 'Andrew I', dari: 1046, sampai: 1060, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Árpád' },
      { nama: 'Béla I', dari: 1060, sampai: 1063, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Árpád' },
    ],
    current1066: { charId: 'solomon_hungaria', baseName: 'Solomon', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'k_kroasia',
    predecessors: [
      { nama: 'Tomislav', dari: 925, sampai: 928, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Trpimir', dari: 928, sampai: 935, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Trpimirović' },
      { nama: 'Krešimir', dari: 935, sampai: 945, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Miroslav', dari: 945, sampai: 949, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Michael Krešimir', dari: 949, sampai: 969, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Trpimirović' },
      { nama: 'Stjepan Držislav', dari: 969, sampai: 997, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Svetoslav Suronja', dari: 997, sampai: 1000, sebab: 'ditaklukkan', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Petar Krešimir', dari: 1000, sampai: 1030, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Trpimirović' },
      { nama: 'Gojslav', dari: 1000, sampai: 1020, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
      { nama: 'Stjepan', dari: 1030, sampai: 1058, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Trpimirović' },
    ],
    current1066: { charId: 'petar_kresimir', baseName: 'Petar Krešimir', regnalNumber: 4, forced: true },
  },
  {
    titleId: 'k_duklja',
    predecessors: [
      { nama: 'Jovan Vladimir', dari: 1000, sampai: 1016, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vojislavljević' },
      { nama: 'Stefan Vojislav', dari: 1018, sampai: 1043, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vojislavljević' },
    ],
    current1066: { charId: 'mihailo_duklja', baseName: 'Mihailo', regnalNumber: 1, forced: true },
  },
  {
    titleId: 'k_castile_leon',
    predecessors: [
      { nama: 'Ferdinand I', julukan: 'yang Agung', dari: 1037, sampai: 1065, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Jimenez' },
    ],
    current1066: { charId: 'sancho_castile', baseName: 'Sancho', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'd_castile',
    predecessors: [
      { nama: 'Fernán González', dari: 931, sampai: 970, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Lara' },
      { nama: 'García Fernández', dari: 970, sampai: 995, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Lara' },
      { nama: 'Sancho García', dari: 995, sampai: 1017, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Lara' },
      { nama: 'García Sánchez', dari: 1017, sampai: 1029, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Lara' },
      { nama: 'Ferdinand I', dari: 1029, sampai: 1065, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Jimenez' },
    ],
    current1066: { charId: 'sancho_castile', baseName: 'Sancho', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'd_leon',
    predecessors: [
      { nama: 'Alfonso', julukan: 'yang Agung', dari: 866, sampai: 910, sebab: 'turun_tahta', regnalNumber: 3, dinastiNama: 'Astur-León' },
      { nama: 'García', dari: 910, sampai: 914, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Astur-León' },
      { nama: 'Ordoño', dari: 914, sampai: 924, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Astur-León' },
      { nama: 'Fruela', dari: 924, sampai: 925, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Astur-León' },
      { nama: 'Alfonso', dari: 925, sampai: 931, sebab: 'turun_tahta', regnalNumber: 4, dinastiNama: 'Astur-León' },
      { nama: 'Ramiro', dari: 931, sampai: 951, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Astur-León' },
      { nama: 'Ordoño', dari: 951, sampai: 956, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Astur-León' },
      { nama: 'Sancho', dari: 956, sampai: 966, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Astur-León' },
      { nama: 'Ramiro', dari: 966, sampai: 984, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Astur-León' },
      { nama: 'Bermudo', dari: 984, sampai: 999, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Astur-León' },
      { nama: 'Alfonso', dari: 999, sampai: 1028, sebab: 'wafat', regnalNumber: 5, dinastiNama: 'Astur-León' },
      { nama: 'Bermudo', dari: 1028, sampai: 1037, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Astur-León' },
      { nama: 'Ferdinand', dari: 1037, sampai: 1065, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Jimenez' },
    ],
    current1066: { charId: 'alfonso_leon', baseName: 'Alfonso', regnalNumber: 6, forced: true },
  },
  {
    titleId: 'k_aragon',
    predecessors: [
      { nama: 'Ramiro I', dari: 1035, sampai: 1063, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Jimenez' },
    ],
    current1066: { charId: 'sancho_aragon', baseName: 'Sancho Ramírez', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'd_portucale',
    predecessors: [
      { nama: 'Vímara Peres', dari: 868, sampai: 873, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Lucídio Vimaranes', dari: 873, sampai: 922, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Mumadona Dias', dari: 924, sampai: 950, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Gonçalo Mendes', dari: 950, sampai: 997, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Mendo Gonçalves', dari: 997, sampai: 1008, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Alvito Nunes', dari: 1008, sampai: 1015, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Nuno', dari: 1017, sampai: 1028, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Vimara Peres' },
      { nama: 'Mendo Nunes', dari: 1028, sampai: 1050, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Vimara Peres' },
    ],
    current1066: { charId: 'nuno_mendes', baseName: 'Nuno', regnalNumber: 2, forced: true },
  },
  {
    titleId: 'd_apulia',
    predecessors: [
      { nama: 'William', julukan: 'Lengan Besi', dari: 1042, sampai: 1046, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Hauteville (Altavilla)' },
      { nama: 'Drogo', dari: 1046, sampai: 1051, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Hauteville (Altavilla)' },
      { nama: 'Humphrey', dari: 1051, sampai: 1057, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Hauteville (Altavilla)' },
    ],
    current1066: { charId: 'guiscard', baseName: 'Robert Guiscard', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'm_tuscany',
    predecessors: [
      { nama: 'Boniface I', dari: 812, sampai: 823, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Adalbert I', dari: 847, sampai: 886, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Adalbert II', dari: 886, sampai: 915, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Guy', dari: 915, sampai: 929, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Lambert', dari: 929, sampai: 931, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Boso', dari: 931, sampai: 936, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Humbert', dari: 936, sampai: 961, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Hugh', julukan: 'yang Agung', dari: 961, sampai: 1001, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Boniface II', dari: 1004, sampai: 1011, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Rainier', dari: 1014, sampai: 1027, sebab: 'ditaklukkan', regnalNumber: 1 },
      { nama: 'Boniface III', dari: 1027, sampai: 1052, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Canossa' },
      { nama: 'Beatrice dari Bar', dari: 1052, sampai: 1055, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Canossa' },
    ],
    current1066: { charId: 'matilda', baseName: 'Matilda dari Canossa', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'm_emilia',
    predecessors: [
      { nama: 'Adalbert Atto', dari: 950, sampai: 988, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Canossa' },
      { nama: 'Tedald', dari: 988, sampai: 1012, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Canossa' },
      { nama: 'Boniface III', dari: 1012, sampai: 1052, sebab: 'wafat', regnalNumber: 3, dinastiNama: 'Canossa' },
      { nama: 'Beatrice dari Bar', dari: 1052, sampai: 1055, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Canossa' },
    ],
    current1066: { charId: 'matilda', baseName: 'Matilda dari Canossa', regnalNumber: 1, forced: false },
  },
  {
    titleId: 'd_bavaria',
    predecessors: [
      { nama: 'Arnulf', julukan: 'yang Jahat', dari: 907, sampai: 937, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Luitpolding' },
      { nama: 'Eberhard', dari: 937, sampai: 938, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Luitpolding' },
      { nama: 'Berthold', dari: 938, sampai: 947, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Luitpolding' },
      { nama: 'Henry I', dari: 948, sampai: 955, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Ottonian' },
      { nama: 'Henry II', julukan: 'Si Pendebat', dari: 955, sampai: 976, sebab: 'wafat', regnalNumber: 2, dinastiNama: 'Ottonian' },
      { nama: 'Otto I', dari: 976, sampai: 982, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Ottonian' },
      { nama: 'Henry III', dari: 983, sampai: 985, sebab: 'turun_tahta', regnalNumber: 3, dinastiNama: 'Luitpolding' },
      { nama: 'Henry IV', dari: 995, sampai: 1004, sebab: 'turun_tahta', regnalNumber: 4, dinastiNama: 'Ottonian' },
      { nama: 'Henry V', dari: 1004, sampai: 1026, sebab: 'wafat', regnalNumber: 5, dinastiNama: 'Luxembourg' },
      { nama: 'Henry VI', dari: 1027, sampai: 1042, sebab: 'turun_tahta', regnalNumber: 6, dinastiNama: 'Salian (Franconia)' },
      { nama: 'Henry VII', dari: 1042, sampai: 1047, sebab: 'wafat', regnalNumber: 7, dinastiNama: 'Luxembourg' },
      { nama: 'Conrad I', dari: 1049, sampai: 1053, sebab: 'ditaklukkan', regnalNumber: 1, dinastiNama: 'Ezzonen' },
      { nama: 'Agnes dari Poitou', dari: 1055, sampai: 1061, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Salian (Franconia)' },
    ],
  },
  {
    titleId: 'd_seljuk_timur',
    predecessors: [
      { nama: 'Tughril Beg', julukan: 'Pendiri Kesultanan Seljuk', dari: 1037, sampai: 1063, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Seljuk' },
    ],
  },
  {
    titleId: 'd_andalus_taifa',
    predecessors: [
      { nama: 'Abbad I', dari: 1023, sampai: 1042, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Abbadiyah' },
      { nama: "Abbad II al-Mu'tadid", dari: 1042, sampai: 1066, sebab: 'turun_tahta', regnalNumber: 2, dinastiNama: 'Abbadiyah' },
    ],
  },
  {
    titleId: 'k_maroko',
    predecessors: [
      { nama: 'Yahya ibn Umar al-Lamtuni', dari: 1053, sampai: 1056, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Al-Murabithun' },
      { nama: 'Abu Bakr ibn Umar', dari: 1056, sampai: 1061, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Al-Murabithun' },
    ],
  },
  {
    titleId: 'c_leinster',
    predecessors: [
      { nama: 'Máel Mórda mac Murchada', dari: 1003, sampai: 1014, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Uí Fáeláin' },
      { nama: 'Donnchad mac Dúnlainge', dari: 1018, sampai: 1036, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Uí Muiredaig' },
      { nama: 'Murchad mac Dúnlainge', dari: 1036, sampai: 1042, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Uí Muiredaig' },
    ],
  },
  // Major 1066 Duchies & Marches across France, HRE, Iberia & England (historical continuity even when custom-chosen)
  {
    titleId: 'd_aquitaine',
    predecessors: [
      { nama: 'William I', julukan: 'yang Saleh', dari: 893, sampai: 918, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'William II', dari: 918, sampai: 926, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Ebalus', dari: 927, sampai: 935, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'William III', dari: 935, sampai: 963, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'William IV', dari: 963, sampai: 995, sebab: 'wafat', regnalNumber: 4 },
      { nama: 'William V', julukan: 'yang Agung', dari: 995, sampai: 1030, sebab: 'wafat', regnalNumber: 5 },
      { nama: 'William VI', dari: 1030, sampai: 1038, sebab: 'wafat', regnalNumber: 6 },
      { nama: 'Odo', dari: 1038, sampai: 1039, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'William VII', dari: 1039, sampai: 1058, sebab: 'wafat', regnalNumber: 7 },
    ],
  },
  {
    titleId: 'd_burgundy',
    predecessors: [
      { nama: 'Richard', julukan: 'Sang Penegak Keadilan', dari: 880, sampai: 921, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Rudolph', dari: 921, sampai: 923, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Hugh', julukan: 'yang Hitam', dari: 923, sampai: 952, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Gilbert', dari: 952, sampai: 956, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Otto', dari: 956, sampai: 965, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Henry I', dari: 965, sampai: 1002, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Robert I', dari: 1032, sampai: 1066, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Capet' },
    ],
  },
  {
    titleId: 'd_flanders',
    predecessors: [
      { nama: 'Baldwin I', julukan: 'Lengan Besi', dari: 862, sampai: 879, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Baldwin II', dari: 879, sampai: 918, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Arnulf I', dari: 918, sampai: 965, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Baldwin III', dari: 958, sampai: 962, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'Arnulf II', dari: 965, sampai: 987, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Baldwin IV', dari: 987, sampai: 1035, sebab: 'wafat', regnalNumber: 4 },
      { nama: 'Baldwin V', dari: 1035, sampai: 1066, sebab: 'wafat', regnalNumber: 5 },
    ],
  },
  {
    titleId: 'd_toulouse',
    predecessors: [
      { nama: 'Fredelo', dari: 849, sampai: 852, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Raymond I', dari: 852, sampai: 863, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Odo', dari: 886, sampai: 918, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Raymond II', dari: 918, sampai: 924, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Raymond III', dari: 924, sampai: 961, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'William III', dari: 978, sampai: 1037, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'Pons', dari: 1037, sampai: 1060, sebab: 'wafat', regnalNumber: 1 },
    ],
  },
  {
    titleId: 'd_brittany',
    predecessors: [
      { nama: 'Nominoe', dari: 846, sampai: 851, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Erispoe', dari: 851, sampai: 857, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Salomon', dari: 857, sampai: 874, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Alan I', dari: 890, sampai: 907, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Alan II', dari: 938, sampai: 952, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Conan I', dari: 990, sampai: 992, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Geoffrey I', dari: 992, sampai: 1008, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Alan III', dari: 1008, sampai: 1040, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'Conan II', dari: 1040, sampai: 1066, sebab: 'wafat', regnalNumber: 2 },
    ],
  },
  {
    titleId: 'd_champagne',
    predecessors: [
      { nama: 'Herbert II', dari: 907, sampai: 943, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Robert I', dari: 943, sampai: 966, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Herbert III', dari: 966, sampai: 995, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'Stephen I', dari: 995, sampai: 1020, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Odo II', dari: 1022, sampai: 1037, sebab: 'wafat', regnalNumber: 2 },
    ],
  },
  {
    titleId: 'd_swabia',
    predecessors: [
      { nama: 'Burchard I', dari: 909, sampai: 911, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Burchard II', dari: 917, sampai: 926, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Hermann I', dari: 926, sampai: 949, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Liudolf', dari: 950, sampai: 954, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Otto I', dari: 973, sampai: 982, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Hermann II', dari: 997, sampai: 1003, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Hermann III', dari: 1003, sampai: 1012, sebab: 'wafat', regnalNumber: 3 },
      { nama: 'Ernest I', dari: 1012, sampai: 1015, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Ernest II', dari: 1015, sampai: 1030, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Otto II', dari: 1045, sampai: 1047, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Otto III', dari: 1048, sampai: 1057, sebab: 'wafat', regnalNumber: 3 },
    ],
  },
  {
    titleId: 'd_angria',
    predecessors: [
      { nama: 'Hermann Billung', dari: 953, sampai: 973, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Bernard I', dari: 973, sampai: 1011, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Bernard II', dari: 1011, sampai: 1059, sebab: 'wafat', regnalNumber: 2 },
    ],
  },
  {
    titleId: 'd_austria',
    predecessors: [
      { nama: 'Leopold I', dari: 976, sampai: 994, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Henry I', dari: 994, sampai: 1018, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Adalbert', dari: 1018, sampai: 1055, sebab: 'wafat', regnalNumber: 1 },
    ],
  },
  {
    titleId: 'd_upper_lotharingia',
    predecessors: [
      { nama: 'Frederick I', dari: 959, sampai: 978, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Theodoric I', dari: 978, sampai: 1026, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Frederick II', dari: 1026, sampai: 1033, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Gozelo I', dari: 1033, sampai: 1044, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Adalbert', dari: 1047, sampai: 1048, sebab: 'wafat', regnalNumber: 1 },
    ],
  },
  {
    titleId: 'd_brabant',
    predecessors: [
      { nama: 'Lambert I', dari: 988, sampai: 1015, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Henry I', dari: 1015, sampai: 1038, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Otto', dari: 1038, sampai: 1041, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Lambert II', dari: 1041, sampai: 1054, sebab: 'wafat', regnalNumber: 2 },
    ],
  },
  {
    titleId: 'd_barcelona',
    predecessors: [
      { nama: 'Wilfred', julukan: 'yang Berbulu', dari: 878, sampai: 897, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Wilfred II', dari: 897, sampai: 911, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Sunyer', dari: 911, sampai: 947, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Borrell II', dari: 947, sampai: 992, sebab: 'wafat', regnalNumber: 2 },
      { nama: 'Ramon Borrell', dari: 992, sampai: 1017, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Berenguer Ramon I', dari: 1017, sampai: 1035, sebab: 'wafat', regnalNumber: 1 },
    ],
  },
  {
    titleId: 'd_mercia',
    predecessors: [
      { nama: 'Ælfhere', dari: 957, sampai: 983, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Ælfric', dari: 983, sampai: 985, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Eadric Streona', dari: 1007, sampai: 1017, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Leofric', dari: 1030, sampai: 1057, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Ælfgar', dari: 1057, sampai: 1062, sebab: 'wafat', regnalNumber: 1 },
    ],
  },
  {
    titleId: 'd_northumbria',
    predecessors: [
      { nama: 'Osulf', dari: 954, sampai: 963, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Waltheof', dari: 963, sampai: 1006, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Uhtred', dari: 1006, sampai: 1016, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Siward', dari: 1033, sampai: 1055, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Tostig Godwinson', dari: 1055, sampai: 1065, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Godwin' },
    ],
  },
  {
    titleId: 'd_east_anglia',
    predecessors: [
      { nama: 'Æthelstan Half-King', dari: 932, sampai: 956, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Æthelwine', dari: 962, sampai: 992, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Ulfcytel', dari: 1004, sampai: 1016, sebab: 'wafat', regnalNumber: 1 },
      { nama: 'Thorkell', dari: 1017, sampai: 1021, sebab: 'turun_tahta', regnalNumber: 1 },
      { nama: 'Harold Godwinson', dari: 1045, sampai: 1053, sebab: 'turun_tahta', regnalNumber: 1, dinastiNama: 'Godwin' },
    ],
  },
  {
    titleId: 'd_kent',
    predecessors: [
      { nama: 'Godwin dari Wessex', dari: 1018, sampai: 1053, sebab: 'wafat', regnalNumber: 1, dinastiNama: 'Godwin' },
    ],
  },
];
