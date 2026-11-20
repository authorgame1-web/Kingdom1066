import defaultGameData from '../data/gameData.json';
import { HISTORICAL_TITLE_SEEDS } from '../data/historicalRulers';
import { sfx } from '../utils/audio';
import {
  deleteLocalSaveSlot,
  downloadJsonFile,
  getLocalSaveSlot,
  listLocalSaveSlots,
  LocalSaveSlot,
  putLocalSaveSlot,
} from '../utils/localSaveDb';
import {
  ActiveEvent,
  Character,
  DiplomacyModal,
  Dynasty,
  FaithLeadership,
  GameData,
  GameState,
  MarriageRecord,
  PregnancyRecord,
  Province,
  ReligionDef,
  RouteEntry,
  RulerRelation,
  RulerRelationStatus,
  SermonTheme,
  Title,
  WorshipFocus,
  WorshipSite,
} from './types';

export const RULER_REL_LABELS: Record<RulerRelationStatus, { label: string; color: string; desc: string }> = {
  kekasih: { label: 'Kekasih / Asmara', color: 'bg-[#FDF2F8] text-[#9D174D] border-[#FBCFE8]', desc: 'Ikatan romansa pribadi yang mendalam.' },
  sekutu_akrab: { label: 'Sekutu Akrab', color: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', desc: 'Aliansi terpercaya dengan kepercayaan penuh.' },
  sahabat: { label: 'Sahabat Karib', color: 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]', desc: 'Hubungan persahabatan erat antar penguasa.' },
  ramah: { label: 'Ramah & Bersahabat', color: 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]', desc: 'Saling menghormati di panggung diplomasi.' },
  netral: { label: 'Netral', color: 'bg-[#FAF8F2] text-[#57534E] border-[#D6CFC0]', desc: 'Hubungan diplomatik standar.' },
  tegang: { label: 'Tegang & Curiga', color: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]', desc: 'Ketidakpercayaan mulai merusak diplomasi.' },
  rival: { label: 'Rival Politik', color: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]', desc: 'Persaingan terbuka memperebutkan pengaruh.' },
  musuh_bebuyutan: { label: 'Musuh Bebuyutan', color: 'bg-[#7F1D1D] text-white border-[#7F1D1D]', desc: 'Permusuhan mendalam dan siap berperang.' },
};

const KEY = 'k1066';

const slug = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const R = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T,>(a: T[]): T => a[R(0, a.length - 1)];
const cl = (v: number): number => Math.max(0, Math.min(100, v));
const sumObj = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRule = any;

export interface StartFormInput {
  pr: string;
  nm: string;
  dn: string;
  gn: 'L' | 'P';
  bd: string;
  ag: string;
  s1: string;
  s2: string;
  pf: string;
  lc: string;
  tk: string;
  bg?: string;
  lawSuccession?: string;
  lawGender?: string;
}

export const REL_RANKS = [
  { id: 'biarawan', nama: 'Pastor / Biarawan', minPiety: 0, minAge: 18, bonus: { kesalehan: 1 } },
  { id: 'diakon', nama: 'Diakon', minPiety: 25, minAge: 20, bonus: { emas: 1, kesalehan: 2 } },
  { id: 'imam', nama: 'Imam Paroki', minPiety: 60, minAge: 23, bonus: { emas: 2, prestise: 1 } },
  { id: 'uskup', nama: 'Uskup', minPiety: 120, minAge: 27, bonus: { emas: 5, prestise: 3 } },
  { id: 'uskup_agung', nama: 'Uskup Agung', minPiety: 220, minAge: 32, bonus: { emas: 9, prestise: 5 } },
  { id: 'kardinal', nama: 'Kardinal', minPiety: 350, minAge: 36, bonus: { emas: 12, prestise: 8 } },
  { id: 'paus', nama: 'Paus', minPiety: 500, minAge: 40, bonus: { emas: 25, prestise: 20 } },
];

export const HERALDS = [
  { id: 'singa', nama: 'Singa Emas', simbol: '🦁', makna: 'Keberanian & Kedaulatan' },
  { id: 'elang', nama: 'Elang Kekaisaran', simbol: '🦅', makna: 'Penguasaan & Visi' },
  { id: 'salib', nama: 'Salib Ksatria', simbol: '✠', makna: 'Kesalehan & Perang Suci' },
  { id: 'naga', nama: 'Naga Merah', simbol: '🐉', makna: 'Kekuatan & Legenda' },
  { id: 'mahkota', nama: 'Mahkota Tiga', simbol: '👑', makna: 'Warisan Raja' },
  { id: 'bunga', nama: 'Fleur-de-Lis', simbol: '⚜', makna: 'Kemuliaan & Tradisi' },
  { id: 'pedang', nama: 'Pedang Kembar', simbol: '⚔', makna: 'Kejayaan Militer' },
  { id: 'menara', nama: 'Benteng Batu', simbol: '🏰', makna: 'Ketahanan Wilayah' },
];

export const BACKGROUNDS: Record<
  string,
  { nama: string; desc: string; emas?: number; prestise?: number; kesalehan?: number; sk?: Record<string, number>; sp?: Record<string, number> }
> = {
  noble: {
    nama: 'Bangsawan Terdidik',
    desc: 'Tumbuh di istana terhormat dengan tata krama istana dan warisan keluarga.',
    emas: 25,
    prestise: 15,
    sk: { diplomasi: 6, administrasi: 4 },
  },
  warrior: {
    nama: 'Ksatria Lapangan',
    desc: 'Terbiasa di medan tempur, turnamen, dan memimpin pasukan garda depan.',
    prestise: 10,
    sk: { perang: 8 },
    sp: { duel: 10, kesehatan: 5 },
  },
  scholar: {
    nama: 'Sarjana Biara',
    desc: 'Menghabiskan masa muda menelaah manuskrip, hukum kanon, dan filsafat.',
    kesalehan: 20,
    sk: { pembelajaran: 10, administrasi: 4 },
  },
  merchant: {
    nama: 'Saudagar Kota',
    desc: 'Paham neraca perdagangan, jaringan gilda, dan rute kapal niaga.',
    emas: 60,
    sk: { administrasi: 8, diplomasi: 4 },
  },
  schemer: {
    nama: 'Ahli Intrik Istana',
    desc: 'Lihai membaca bisik-bisik lorong istana, rahasia bangsawan, dan spionase.',
    prestise: 5,
    sk: { spionase: 10, diplomasi: 4 },
  },
};

export const TUTORS: Record<string, { nama: string; biaya: number; stat: string; gain: number; desc: string }> = {
  militer: { nama: 'Pelatih Militer', biaya: 15, stat: 'perang', gain: 6, desc: 'Latihan taktik medan & duel (+Perang)' },
  sarjana: { nama: 'Sarjana Istana', biaya: 15, stat: 'pembelajaran', gain: 6, desc: 'Bahasa Latin, hukum & naskah (+Pembelajaran)' },
  diplomat: { nama: 'Guru Tata Krama', biaya: 15, stat: 'diplomasi', gain: 6, desc: 'Retorika istana & negosiasi (+Diplomasi)' },
  bendahara: { nama: 'Guru Dagang', biaya: 15, stat: 'administrasi', gain: 6, desc: 'Hitung pajak & logistik (+Administrasi)' },
};

export const ORDERS: Record<string, { nama: string; biaya: number; prestiseMin: number; bonus: string }> = {
  templar: { nama: 'Ordo Ksatria Templar', biaya: 40, prestiseMin: 25, bonus: '+2 Prestise/th, +5 Duel' },
  hospitaller: { nama: 'Ordo St. Yohanes (Hospitaller)', biaya: 35, prestiseMin: 15, bonus: '+2 Kesalehan/th, +5 Kesehatan' },
  teutonik: { nama: 'Ordo Teutonik', biaya: 45, prestiseMin: 30, bonus: '+2 Perang, +1 Prestise/th' },
  st_george: { nama: 'Ordo St. George', biaya: 30, prestiseMin: 20, bonus: '+5 Moral Pasukan, +3 Duel' },
};

export const ACHIEVEMENTS: { id: string; nama: string; desc: string; icon: string }[] = [
  { id: 'first_win', nama: 'Penakluk Pertama', desc: 'Memenangkan perang pertamamu', icon: '⚔️' },
  { id: 'rich_500', nama: 'Pundi Penuh Emas', desc: 'Memiliki 500 emas sekaligus', icon: '💰' },
  { id: 'great_dynasty', nama: 'Dinasti Agung', desc: 'Mencapai 500 prestise dinasti', icon: '👑' },
  { id: 'tier_king', nama: 'Mahkota Raja', desc: 'Menjadi Raja / Ratu berdaulat', icon: '🏰' },
  { id: 'tier_emperor', nama: 'Kaisar Eropa', desc: 'Mencapai gelar Kekaisaran (Tier 7)', icon: '🦅' },
  { id: 'crusader', nama: 'Ksatria Salib', desc: 'Memenangkan Perang Salib', icon: '✠' },
  { id: 'long_reign', nama: 'Penguasa Panjang Umur', desc: 'Hidup mencapai usia 70 tahun', icon: '🕯️' },
  { id: 'marry_5', nama: 'Keluarga Besar', desc: 'Memiliki minimal 5 anak', icon: '👨‍👩‍👧‍👦' },
  { id: 'pope', nama: 'Wakil Santo Petrus', desc: 'Menjabat sebagai Paus Gereja Katolik', icon: '⛪' },
  { id: 'protestant', nama: 'Reformator Iman', desc: 'Memeluk atau memicu gerakan Reformasi', icon: '📜' },
  { id: 'expedition_win', nama: 'Penjelajah Samudra', desc: 'Sukses menuntaskan ekspedisi laut', icon: '🧭' },
  { id: 'survive_plague', nama: 'Selamat dari Pes Hitam', desc: 'Bertahan melewati wabah besar', icon: '🛡️' },
];

export const OFFICE_TRAITS = ['jujur', 'korup', 'jenius', 'setia', 'malas', 'ambisius'] as const;

export const HONORIFICS: {
  id: string;
  nama: string;
  desc: string;
  opBonus: number;
  rulerPrestige: number;
  cost: number;
  perangBonus?: number;
}[] = [
  {
    id: 'pembawa_pedang',
    nama: 'Pembawa Pedang Kerajaan',
    desc: 'Pembawa pedang upacara penguasa (+20 Opini penerima, +2 Perang, +2 Prestise/th).',
    opBonus: 20,
    rulerPrestige: 2,
    cost: 25,
    perangBonus: 2,
  },
  {
    id: 'pelindung_mahkota',
    nama: 'Pelindung Mahkota',
    desc: 'Wali kehormatan penopang takhta (+25 Opini penerima, +3 Prestise/th).',
    opBonus: 25,
    rulerPrestige: 3,
    cost: 35,
  },
  {
    id: 'pengawas_perbendaharaan',
    nama: 'Pengawas Perbendaharaan Agung',
    desc: 'Gelar kehormatan bagi pengelola atau vasal kaya (+18 Opini, +2 Prestise/th).',
    opBonus: 18,
    rulerPrestige: 2,
    cost: 20,
  },
  {
    id: 'penjaga_perbatasan',
    nama: 'Penjaga Perbatasan Utama',
    desc: 'Kehormatan penjaga tapal batas kerajaan (+22 Opini, +2 Prestise/th, +2 Perang).',
    opBonus: 22,
    rulerPrestige: 2,
    cost: 30,
    perangBonus: 2,
  },
  {
    id: 'penasihat_agung',
    nama: 'Penasihat Agung Kehormatan',
    desc: 'Gelar kehormatan sesepuh & tokoh istana berjasa (+15 Opini, +2 Prestise/th).',
    opBonus: 15,
    rulerPrestige: 2,
    cost: 20,
  },
];

export const LUXURY_GOODS: Record<
  string,
  { id: string; nama: string; asal: string; bonusText: string; happiness?: number; admin?: number; perang?: number; prestigePerYear?: number }
> = {
  sutra_bizantium: { id: 'sutra_bizantium', nama: 'Sutra Kekaisaran Bizantium', asal: 'Yunani / Konstantinopel', bonusText: '+3 Prestise/th, +2 Diplomasi', prestigePerYear: 3 },
  rempah_timur: { id: 'rempah_timur', nama: 'Rempah-Rempah Levant', asal: 'Timur Tengah / Andalusia', bonusText: '+4 Kebahagiaan Rakyat, +2 Admin', happiness: 4, admin: 2 },
  baja_damaskus: { id: 'baja_damaskus', nama: 'Baja Damaskus', asal: 'Suriah / Andalusia', bonusText: '+3 Perang, +5% Kekuatan Tempur', perang: 3 },
  ambar_baltik: { id: 'ambar_baltik', nama: 'Ambar Kuning Baltik', asal: 'Pesisir Utara & Baltik', bonusText: '+2 Prestise/th, +3 Kebahagiaan Rakyat', prestigePerYear: 2, happiness: 3 },
  anggur_bordeaux: { id: 'anggur_bordeaux', nama: 'Anggur Bangsawan Bordeaux', asal: 'Prancis Barat', bonusText: '+3 Kebahagiaan Rakyat, +2 Prestise/th', prestigePerYear: 2, happiness: 3 },
  permadani_andalusia: { id: 'permadani_andalusia', nama: 'Permadani & Kertas Cordoba', asal: 'Andalusia / Maghribi', bonusText: '+3 Administrasi, +2 Prestise/th', admin: 3, prestigePerYear: 2 },
};

export const ILLNESS_DEFS: Record<
  string,
  { id: string; nama: string; statPenalty: number; healthDrain: number; mortalityRisk: number; desc: string }
> = {
  demam_musiman: { id: 'demam_musiman', nama: 'Demam Musiman', statPenalty: 3, healthDrain: 4, mortalityRisk: 0.02, desc: 'Demam tinggi saat pergantian musim (-3 semua stat).' },
  radang_paru: { id: 'radang_paru', nama: 'Radang Paru Musim Dingin', statPenalty: 6, healthDrain: 8, mortalityRisk: 0.06, desc: 'Sesak napas berat akibat dingin ekstrem (-6 semua stat).' },
  disentri: { id: 'disentri', nama: 'Disentri Kamp', statPenalty: 5, healthDrain: 7, mortalityRisk: 0.05, desc: 'Penyakit perkemahan pasukan (-5 semua stat).' },
  asam_urat: { id: 'asam_urat', nama: 'Sakit Persendian (Gout)', statPenalty: 4, healthDrain: 3, mortalityRisk: 0.02, desc: 'Pembengkakan sendi bangsawan (-4 semua stat).' },
  wabah_pes: { id: 'wabah_pes', nama: 'Infeksi Wabah Pes', statPenalty: 10, healthDrain: 14, mortalityRisk: 0.16, desc: 'Penyakit mematikan dari wilayah terjangkit wabah (-10 semua stat).' },
};

export const FEUDAL_LAW_LABELS: Record<
  string,
  { category: string; desc: string; options: Record<string, { nama: string; efek: string }> }
> = {
  tarif_pajak_feodal: {
    category: 'Tarif Pajak Feodal',
    desc: 'Menentukan beban pajak resmi kerajaan terhadap tanah demesne & vasal.',
    options: {
      ringan: { nama: 'Pajak Ringan', efek: 'Pajak x0.85 · +6 Kebahagiaan Rakyat · +8 Opini Vasal' },
      seimbang: { nama: 'Pajak Seimbang', efek: 'Pajak x1.0 · Stabilitas standar' },
      eksploitatif: { nama: 'Pajak Eksploitatif', efek: 'Pajak x1.25 · -6 Kebahagiaan Rakyat · -12 Opini Vasal' },
    },
  },
  hukuman_kriminal: {
    category: 'Hukuman Pelanggaran Hukum',
    desc: 'Menentukan kerasnya penegakan hukum terhadap bandit & penjahat.',
    options: {
      denda_ringan: { nama: 'Denda & Kompensasi', efek: '+3 Kebahagiaan Rakyat · Risiko kejahatan sedikit lebih tinggi' },
      hukum_raja: { nama: 'Pengadilan Raja', efek: 'Kejahatan terkendali seimbang · +1 Legitimasi/th' },
      tangan_besi: { nama: 'Hukuman Tangan Besi', efek: 'Kejahatan & bandit ditekan keras · -4 Kebahagiaan Rakyat' },
    },
  },
  hak_bangsawan: {
    category: 'Hak Istimewa Bangsawan',
    desc: 'Mengatur perimbangan kuasa antara Mahkota dan para bangsawan feodal.',
    options: {
      otonomi_luas: { nama: 'Otonomi Bangsawan Luas', efek: '+12 Opini Vasal · Pajak vasal -20% · Risiko kudeta turun' },
      keseimbangan_feodal: { nama: 'Piagam Feodal Seimbang', efek: 'Keseimbangan hak & kewajiban standar' },
      sentralisasi_mahkota: { nama: 'Sentralisasi Mahkota', efek: '+2 Batas Provinsi · +20% Pajak Vasal · -12 Opini Vasal' },
    },
  },
};

export interface CulturalHeritageInfo {
  nama: string;
  sifat: string[];
  sk: Partial<Record<'diplomasi' | 'spionase' | 'perang' | 'administrasi' | 'pembelajaran', number>>;
  milBonus: { pedang?: number; pemanah?: number; kavaleri?: number; morale?: number };
  opSameCulture: number;
  researchBoost?: number;
  desc: string;
}

export const CULTURAL_HERITAGE: Record<string, CulturalHeritageInfo> = {
  norman: {
    nama: 'Warisan Ksatria Norman',
    sifat: ['Pemberani', 'Penunggang Ulung'],
    sk: { perang: 5, spionase: 2 },
    milBonus: { kavaleri: 0.18, morale: 5 },
    opSameCulture: 10,
    desc: 'Serbuan kavaleri berat tak tertandingi (+18% Kavaleri, +5 Perang, +5 Moral).',
  },
  saxon: {
    nama: 'Warisan Dinding Perisai Saxon',
    sifat: ['Tabah', 'Penjaga Adat'],
    sk: { perang: 3, administrasi: 4 },
    milBonus: { pedang: 0.15 },
    opSameCulture: 12,
    desc: 'Formasi infanteri dinding perisai yang kokoh (+15% Pasukan Pedang, +4 Administrasi).',
  },
  scots: {
    nama: 'Warisan Klan Gaelik Skotlandia',
    sifat: ['Gigih', 'Bangga'],
    sk: { perang: 4, diplomasi: 2 },
    milBonus: { pedang: 0.12, morale: 4 },
    opSameCulture: 15,
    desc: 'Solidaritas klan tinggi & tombak daratan tinggi (+12% Pedang, +15 Opini sesama budaya).',
  },
  irish: {
    nama: 'Warisan Cendekia Gaelik Irlandia',
    sifat: ['Pujangga', 'Mandiri'],
    sk: { pembelajaran: 5, diplomasi: 3 },
    milBonus: { pemanah: 0.1 },
    opSameCulture: 15,
    researchBoost: 0.2,
    desc: 'Tradisi biara & syair kuno (+5 Pembelajaran, +20% Riset Skriptorium).',
  },
  welsh: {
    nama: 'Warisan Busur Panjang Welsh',
    sifat: ['Waspada', 'Penembak Jitu'],
    sk: { perang: 3, spionase: 3 },
    milBonus: { pemanah: 0.2 },
    opSameCulture: 12,
    desc: 'Ahli busur panjang legendaris (+20% Pemanah, +3 Spionase).',
  },
  german: {
    nama: 'Warisan Kekaisaran Jerman',
    sifat: ['Teratur', 'Berwibawa'],
    sk: { administrasi: 4, perang: 3 },
    milBonus: { kavaleri: 0.1, pedang: 0.08 },
    opSameCulture: 8,
    desc: 'Tata feodal kekaisaran yang disiplin (+4 Administrasi, +10% Kavaleri).',
  },
  frankish: {
    nama: 'Warisan Ksatria Franka',
    sifat: ['Kesatria', 'Sopan'],
    sk: { diplomasi: 5, perang: 3 },
    milBonus: { kavaleri: 0.14 },
    opSameCulture: 10,
    desc: 'Pusat tradisi chivalry & diplomasi Eropa (+5 Diplomasi, +14% Kavaleri).',
  },
  maghrebi: {
    nama: 'Warisan Ilmu Andalusia & Maghribi',
    sifat: ['Cendekia', 'Saudagar'],
    sk: { pembelajaran: 6, administrasi: 4 },
    milBonus: { kavaleri: 0.1 },
    opSameCulture: 12,
    researchBoost: 0.5,
    desc: 'Mercusuar perpustakaan & niaga Mediterania (+6 Pembelajaran, +50% Riset).',
  },
  greek: {
    nama: 'Warisan Kekaisaran Bizantium',
    sifat: ['Diplomatis', 'Strategis'],
    sk: { pembelajaran: 5, diplomasi: 4, spionase: 3 },
    milBonus: { kavaleri: 0.12 },
    opSameCulture: 10,
    researchBoost: 0.45,
    desc: 'Pewaris administrasi Romawi Timur & Katafrak (+5 Pembelajaran, +45% Riset).',
  },
  turkish: {
    nama: 'Warisan Kavaleri Steppe Turki',
    sifat: ['Lincah', 'Penakluk'],
    sk: { perang: 6, spionase: 2 },
    milBonus: { kavaleri: 0.18, pemanah: 0.12 },
    opSameCulture: 12,
    desc: 'Pemanah berkuda cepat & disiplin tempur tinggi (+18% Kavaleri, +12% Pemanah).',
  },
  italian: {
    nama: 'Warisan Dagang & Kota Italia',
    sifat: ['Komersial', 'Artistik'],
    sk: { administrasi: 5, pembelajaran: 4, diplomasi: 3 },
    milBonus: { pemanah: 0.1 },
    opSameCulture: 8,
    researchBoost: 0.3,
    desc: 'Perbankan kota & juru tulis terampil (+5 Administrasi, +30% Riset).',
  },
  castilian: {
    nama: 'Warisan Reconquista Kastilia',
    sifat: ['Teguh', 'Religius'],
    sk: { perang: 4, diplomasi: 3 },
    milBonus: { pedang: 0.1, kavaleri: 0.1 },
    opSameCulture: 10,
    desc: 'Semangat ksatria perbatasan Iberia (+4 Perang, +10% Pedang & Kavaleri).',
  },
  norse: {
    nama: 'Warisan Pelaut & Penjelajah Nordik',
    sifat: ['Berani', 'Pelaut Ulung'],
    sk: { perang: 5, administrasi: 2 },
    milBonus: { pedang: 0.16, morale: 6 },
    opSameCulture: 12,
    desc: 'Pasukan garda kapak Nordik yang ditakuti (+16% Pedang, +6 Moral).',
  },
};

// Akurat berdasarkan geografi Eropa, Afrika Utara & Anatolia abad ke-11: hanya wilayah dengan akses laut/samudra yang memiliki perairan
export const COASTAL_TITLE_IDS = new Set<string>([
  // Inggris, Skotlandia, Wales, Irlandia & Kepulauan
  'c_dorset', 'c_devon', 'c_cornwall', 'd_kent', 'c_norfolk', 'c_northumberland', 'c_durham', 'c_cumberland',
  'c_fife', 'c_buchan', 'c_sutherland', 'c_galloway', 'c_carrick', 'c_argyll', 'c_pulau_man',
  'c_penllyn', 'c_perfeddwlad', 'c_glamorgan',
  'c_ormond', 'c_desmond', 'c_leinster', 'c_ulster', 'c_dublin',
  // Laut Utara, Selat Inggris & Baltik (HRE & Prancis)
  'c_holland', 'c_zeeland', 'c_frisia', 'c_dokkum',
  'c_oldenburg', 'c_bremen', 'c_stade', 'c_ostfriesland', 'c_lubice',
  'c_lille', 'c_boulogne', 'c_guines', 'c_amiens',
  'c_eu', 'c_bayeux', 'c_avranches', 'c_cornouaille', 'c_penthievre', 'c_leon',
  'c_montaigu', 'c_albret', 'c_carcassonne', 'c_nice', 'c_istria', 'c_krain', 'c_treviso',
  // Semenanjung Iberia & Afrika Utara
  'c_asturias', 'c_santiago', 'c_coruna', 'c_porto', 'c_coimbra', 'c_lisbon', 'c_algarve',
  'c_sevilla', 'c_granada', 'c_barcelona', 'c_tarragona',
  'c_tangier', 'c_sous',
  // Italia, Sisilia & Sardinia
  'c_genova', 'c_savona', 'c_pisa', 'c_lucca', 'c_siena', 'c_roma', 'c_viterbo', 'c_terracina',
  'c_venezia', 'c_chioggia', 'c_aquileia', 'c_ferrara', 'c_ravenna', 'c_ancona', 'c_fermo',
  'c_gaeta', 'c_napoli', 'c_amalfi', 'c_sorrento', 'c_salerno',
  'c_bari', 'c_taranto', 'c_brindisi', 'c_lecce', 'c_cosenza', 'c_reggio_calabria', 'c_catanzaro',
  'c_cagliari', 'c_arborea', 'c_torres', 'c_gallura',
  'c_palermo', 'c_messina', 'c_catania', 'c_siracusa', 'c_agrigento', 'c_trapani',
  // Adriatik, Aegea, Laut Hitam & Anatolia Pesisir
  'c_split', 'c_zadar', 'c_dubrovnik', 'c_kotor', 'c_skadar',
  'c_thessalonica', 'c_constantinople', 'c_gallipoli',
  'c_nicaea', 'c_bursa', 'c_smyrna', 'c_ephesus', 'c_trebizond',
  'c_dobruja', 'c_silistra', 'c_moldavia',
]);

export const CAPITAL_TITLE_IDS: Record<string, { label: string; kind: 'empire' | 'kingdom' | 'duchy' }> = {
  c_mainz: { label: 'Mainz / Frankfurt (Pusat HRE)', kind: 'empire' },
  c_aachen: { label: 'Aachen (Tahta Charlemagne)', kind: 'empire' },
  c_constantinople: { label: 'Konstantinopel (Ibukota Bizantium)', kind: 'empire' },
  c_roma: { label: 'Roma (Takhta Suci)', kind: 'kingdom' },
  c_praha: { label: 'Praha (Ibukota Bohemia)', kind: 'kingdom' },
  c_valois: { label: 'Paris / Île-de-France', kind: 'kingdom' },
  c_dorset: { label: 'Winchester / Inggris Selatan', kind: 'kingdom' },
  d_kent: { label: 'Canterbury / Kent', kind: 'duchy' },
  c_fife: { label: 'Dunfermline / Skotlandia', kind: 'kingdom' },
  c_burgos: { label: 'Burgos (Ibukota Castile)', kind: 'kingdom' },
  c_leon: { label: 'León', kind: 'duchy' },
  c_jaca: { label: 'Jaca / Pamplona (Aragon)', kind: 'kingdom' },
  c_barcelona: { label: 'Barcelona', kind: 'duchy' },
  c_porto: { label: 'Porto / Portucale', kind: 'duchy' },
  c_sevilla: { label: 'Sevilla / Córdoba (Al-Andalus)', kind: 'duchy' },
  c_marrakech: { label: 'Marrakech (Ibukota Almoravid)', kind: 'kingdom' },
  c_esztergom: { label: 'Esztergom / Buda (Hungaria)', kind: 'kingdom' },
  c_split: { label: 'Split / Zadar (Kroasia)', kind: 'kingdom' },
  c_skadar: { label: 'Skadar (Duklja)', kind: 'kingdom' },
  c_venezia: { label: 'Venesia (Serenissima)', kind: 'duchy' },
  c_genova: { label: 'Genova', kind: 'duchy' },
  c_palermo: { label: 'Palermo (Sisilia)', kind: 'duchy' },
  c_napoli: { label: 'Napoli', kind: 'duchy' },
  c_milan: { label: 'Milan (Lombardia)', kind: 'duchy' },
  c_florence: { label: 'Florence (Tuscany)', kind: 'duchy' },
  c_dublin: { label: 'Dublin', kind: 'duchy' },
  c_konya: { label: 'Konya / Iconium', kind: 'duchy' },
  c_erzurum: { label: 'Erzurum / Manzikert', kind: 'duchy' },
};

// Warna resmi peta berdasarkan tingkatan gelar yang dipegang:
// Kaisar = Kuning, King = Merah, Marquis = Biru, Duke = Oren, Count = Merah, Viscount = Hijau, Baron = Hitam
export const TIER_MAP_COLORS: Record<
  'emperor' | 'king' | 'marquis' | 'duke' | 'count' | 'viscount' | 'baron' | 'vacant',
  { label: string; fill: string; stroke: string; text: string; badgeBg: string; badgeText: string }
> = {
  emperor: { label: 'Kaisar (Tier 7)', fill: '#FACC15', stroke: '#A16207', text: '#422006', badgeBg: '#FACC15', badgeText: '#422006' },
  king: { label: 'King / Raja (Tier 6)', fill: '#EF4444', stroke: '#991B1B', text: '#FFFFFF', badgeBg: '#EF4444', badgeText: '#FFFFFF' },
  marquis: { label: 'Marquis (Tier 4 / March)', fill: '#2563EB', stroke: '#1E3A8A', text: '#FFFFFF', badgeBg: '#2563EB', badgeText: '#FFFFFF' },
  duke: { label: 'Duke (Tier 5)', fill: '#F97316', stroke: '#9A3412', text: '#FFFFFF', badgeBg: '#F97316', badgeText: '#FFFFFF' },
  count: { label: 'Count / Earl (Tier 3)', fill: '#DC2626', stroke: '#7F1D1D', text: '#FFFFFF', badgeBg: '#DC2626', badgeText: '#FFFFFF' },
  viscount: { label: 'Viscount (Tier 2)', fill: '#16A34A', stroke: '#14532D', text: '#FFFFFF', badgeBg: '#16A34A', badgeText: '#FFFFFF' },
  baron: { label: 'Baron (Tier 1)', fill: '#1C1917', stroke: '#09090B', text: '#FAF8F2', badgeBg: '#1C1917', badgeText: '#FAF8F2' },
  vacant: { label: 'Tak Bertuan', fill: '#D6CFC0', stroke: '#78716C', text: '#44403C', badgeBg: '#E7E5E4', badgeText: '#44403C' },
};

export function getTierColorKey(tier: number, isMarquis?: boolean): keyof typeof TIER_MAP_COLORS {
  if (tier >= 7) return 'emperor';
  if (tier === 6) return 'king';
  if (tier === 4 || (tier === 5 && isMarquis)) return 'marquis';
  if (tier === 5) return 'duke';
  if (tier === 3) return 'count';
  if (tier === 2) return 'viscount';
  if (tier === 1) return 'baron';
  return 'vacant';
}

export const CULTURE_MAP_COLORS: Record<string, { nama: string; fill: string; text: string }> = {
  german: { nama: 'Jerman (HRE)', fill: '#94A3B8', text: '#0F172A' },
  czech: { nama: 'Bohemia / Ceko', fill: '#7C3AED', text: '#FFFFFF' },
  flemish: { nama: 'Flemish / Belanda', fill: '#F59E0B', text: '#451A03' },
  lombard: { nama: 'Lombard (Italia Utara)', fill: '#0EA5E9', text: '#FFFFFF' },
  italian: { nama: 'Italia', fill: '#10B981', text: '#FFFFFF' },
  frankish: { nama: 'Franka / Prancis', fill: '#2563EB', text: '#FFFFFF' },
  norman: { nama: 'Norman', fill: '#DC2626', text: '#FFFFFF' },
  breton: { nama: 'Breton', fill: '#14B8A6', text: '#FFFFFF' },
  occitan: { nama: 'Occitan (Prancis Selatan)', fill: '#8B5CF6', text: '#FFFFFF' },
  saxon: { nama: 'Anglo-Saxon (Inggris)', fill: '#E11D48', text: '#FFFFFF' },
  scots: { nama: 'Skotlandia (Gaelik)', fill: '#0284C7', text: '#FFFFFF' },
  irish: { nama: 'Irlandia (Gaelik)', fill: '#16A34A', text: '#FFFFFF' },
  welsh: { nama: 'Welsh (Wales)', fill: '#15803D', text: '#FFFFFF' },
  norse_gael: { nama: 'Norse-Gael', fill: '#4F46E5', text: '#FFFFFF' },
  norse: { nama: 'Norse / Skandinavia', fill: '#1D4ED8', text: '#FFFFFF' },
  castilian: { nama: 'Kastilia / Spanyol', fill: '#EAB308', text: '#422006' },
  portuguese: { nama: 'Portugis', fill: '#059669', text: '#FFFFFF' },
  maghrebi: { nama: 'Maghribi / Al-Andalus', fill: '#65A30D', text: '#FFFFFF' },
  sicilian_arab: { nama: 'Arab-Sisilia', fill: '#84CC16', text: '#1A2E05' },
  greek: { nama: 'Yunani (Bizantium)', fill: '#9333EA', text: '#FFFFFF' },
  turkish: { nama: 'Turki (Seljuk)', fill: '#EA580C', text: '#FFFFFF' },
  hungarian: { nama: 'Hungaria / Magyar', fill: '#B45309', text: '#FFFFFF' },
  croatian: { nama: 'Kroasia / Dalmatia', fill: '#DB2777', text: '#FFFFFF' },
  serbian: { nama: 'Serbia / Duklja', fill: '#991B1B', text: '#FFFFFF' },
  bulgarian: { nama: 'Bulgaria', fill: '#4D7C0F', text: '#FFFFFF' },
  pecheneg: { nama: 'Pecheneg / Stepa', fill: '#D97706', text: '#FFFFFF' },
  polish: { nama: 'Polandia', fill: '#F43F5E', text: '#FFFFFF' },
  rus: { nama: 'Rus Kiev', fill: '#0D9488', text: '#FFFFFF' },
};



class GameEngine {
  public D: GameData;
  public T: Record<string, Title> = {};
  public C: Record<string, Character> = {};
  public DY: Record<string, Dynasty> = {};
  public P: Record<string, Province[]> = {};
  public G!: GameState;
  public stack: RouteEntry[] = [{ view: 'start' }];
  public toastMessage: string | null = null;

  private listeners = new Set<() => void>();

  // Derived caches from D.teks_game and D.event_*
  private NM: Record<'L' | 'P', string[]> = { L: ['Anon'], P: ['Anna'] };
  private RUM: string[] = ['{n} dikabarkan sibuk.'];
  private SEAS: { d: string; e: Record<string, number> }[] = [{ d: '', e: {} }];
  public FAKSI: Record<string, { nama: string; efek: string; icon: string }> = {};
  public FACTION_RANKS: { min: number; nama: string; efek: Record<string, number> }[] = [
    { min: 0, nama: 'Netral', efek: {} },
  ];
  public CRUSADE_TARGETS: {
    id: string;
    nama: string;
    kekuatan: number;
    hadiah: { emas: number; prestise: number; kesalehan: number };
    region?: string;
    jarak?: number;
  }[] = [];

  private TRI: Record<string, string> = { pedang: 'kavaleri', pemanah: 'pedang', kavaleri: 'pemanah' };
  private INV: Record<string, string> = { pedang: 'pemanah', pemanah: 'kavaleri', kavaleri: 'pedang' };
  private CEV: Record<string, { t: string; d: string; e: Record<string, number | [number, number]>; c: ((p: Character) => boolean) | null }[]> = {};
  private CHAINS: {
    id: string;
    title: string;
    teks: string;
    ulang?: number;
    peluang?: number;
    when: () => boolean;
    pilihan: { teks: string; fn: () => string }[];
  }[] = [];
  private FAM_EVENTS: typeof this.CHAINS = [];
  private AT_KEY: 'rankY' | 'kelasY' = 'rankY';

  constructor() {
    this.D = this.loadStoredData() || this.cloneData(defaultGameData);
    this.applyTeks();
    this.newWorld();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const flush = () => this.flushSave();
      window.addEventListener('pagehide', flush);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
      });
    }
  }

  private cloneData(d: GameData): GameData {
    return JSON.parse(JSON.stringify(d));
  }

  private loadStoredData(): GameData | null {
    try {
      const custom = localStorage.getItem(KEY + 'custom');
      const raw = localStorage.getItem(KEY + 'd');
      if (custom && raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.jabatan) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public notify(): void {
    this.candCache = null;
    this.listeners.forEach((fn) => fn());
  }

  public currentRoute(): RouteEntry {
    return this.stack[this.stack.length - 1] || { view: 'start' };
  }

  public go(view: string, arg?: string): void {
    sfx.playClick();
    this.stack = [...this.stack, { view, arg }];
    this.notify();
  }

  public back(): void {
    sfx.playClick();
    if (this.stack.length > 1) {
      this.stack = this.stack.slice(0, -1);
    }
    this.notify();
  }

  public home(): void {
    this.stack = [{ view: 'main' }];
    this.notify();
  }

  public toStart(): void {
    this.newWorld();
    this.stack = [{ view: 'start' }];
    this.notify();
  }

  public clearToast(): void {
    this.toastMessage = null;
    this.notify();
  }

  public showToast(s: string): void {
    this.toastMessage = s;
    this.notify();
  }

  public hasSave(): boolean {
    try {
      return !!localStorage.getItem(KEY + 's');
    } catch {
      return false;
    }
  }

  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savePending = false;

  /** PERF: simpan ditunda & digabung. Ratusan KB JSON tidak lagi menahan layar tiap pergantian tahun. */
  public save(): void {
    this.savePending = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushSave();
    }, 1500);
  }

  /** Tulis segera bila ada simpanan tertunda (dipanggil saat app ke background / ditutup). */
  public flushSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.savePending) return;
    this.savePending = false;
    this.saveNow();
  }

  public saveNow(): void {
    this.savePending = false;
    const payload = JSON.stringify({ T: this.T, C: this.C, DY: this.DY, P: this.P, G: this.G });
    try {
      localStorage.setItem(KEY + 's', payload);
    } catch {
      // ignore storage quota errors
    }
    if (this.G?.pid && this.C[this.G.pid]) {
      const ruler = this.full(this.C[this.G.pid]);
      void putLocalSaveSlot({
        id: 'autosave',
        label: 'Simpan Otomatis',
        year: this.G.tahun,
        ruler,
        savedAt: Date.now(),
        payload,
      });
    }
  }

  public loadSave(): boolean {
    try {
      const raw = localStorage.getItem(KEY + 's');
      if (!raw) {
        void this.loadAutosaveFromLocalDb();
        return false;
      }
      const s = JSON.parse(raw);
      this.T = s.T;
      this.C = s.C;
      this.DY = s.DY;
      this.P = s.P;
      this.G = s.G;
      this.migrateState();
      this.stack = [{ view: 'main' }];
      this.notify();
      return true;
    } catch {
      this.showToast('Gagal memuat save.');
      return false;
    }
  }

  private async loadAutosaveFromLocalDb(): Promise<void> {
    const slot = await getLocalSaveSlot('autosave');
    if (slot?.payload) {
      this.importSaveText(slot.payload);
    } else {
      this.showToast('Save tidak ditemukan.');
    }
  }

  public async loadCustomJsonFiles(files: FileList | File[]): Promise<string> {
    const arr = Array.from(files);
    if (!arr.length) return 'Tidak ada file dipilih.';
    try {
      const texts = await Promise.all(arr.map((f) => f.text()));
      const combined: GameData = {};
      texts.forEach((t) => Object.assign(combined, JSON.parse(t)));
      if (!combined.jabatan) {
        return 'File JSON belum lengkap (pilih semua file di folder data/ atau satu data_v3.json gabungan).';
      }
      this.D = combined;
      this.applyTeks();
      try {
        localStorage.setItem(KEY + 'd', JSON.stringify(combined));
        localStorage.setItem(KEY + 'custom', '1');
      } catch {
        // ignore
      }
      this.newWorld();
      this.stack = [{ view: 'start' }];
      this.notify();
      return 'Data kustom berhasil dimuat.';
    } catch (err) {
      return 'JSON tidak valid: ' + (err instanceof Error ? err.message : String(err));
    }
  }

  public resetCustomData(): void {
    try {
      localStorage.removeItem(KEY + 'custom');
      localStorage.removeItem(KEY + 'd');
    } catch {
      // ignore
    }
    this.D = this.cloneData(defaultGameData);
    this.applyTeks();
    this.newWorld();
    this.stack = [{ view: 'start' }];
    this.notify();
  }

  // ============ RULES HELPERS ============
  public RG = (): AnyRule => this.D.aturan_game || {};
  public RP = (): AnyRule => this.D.aturan_pertunangan || {};
  public RWf = (): AnyRule => this.D.aturan_pasangan_wafat || {};
  public RD = (): AnyRule => this.D.aturan_dinasti || {};
  public RT = (): AnyRule => this.D.aturan_turun_tahta || {};
  public RAg = (): AnyRule => this.D.aturan_agama || {};
  public LAW = (id: string): string | null => {
    if (this.G?.laws?.[id]) return this.G.laws[id];
    if (id === 'suksesi_gender') return 'agnatik_kognatik';
    if (id === 'suksesi_kekaisaran') return 'turun_temurun';
    const h = (this.D.hukum || []).find((x: AnyRule) => x.id === id);
    return h ? h.aktif : null;
  };
  public setLaw(id: string, val: string): void {
    const p = this.me();
    if (!p || !this.isRuler(p)) {
      return this.msg('Hukum Feodal & Suksesi Kerajaan hanya dapat ditetapkan oleh Bangsawan penguasa wilayah.');
    }
    const prev = this.LAW(id);
    if (prev === val) return;
    if (!this.G.laws) this.G.laws = {};
    this.G.laws[id] = val;

    if (id === 'suksesi_kerajaan') {
      if (val === 'pemilihan') this.G.laws['suksesi_kekaisaran'] = 'pemilihan_elektor';
      else this.G.laws['suksesi_kekaisaran'] = 'turun_temurun';
    } else if (id === 'suksesi_kekaisaran') {
      if (val === 'pemilihan_elektor') this.G.laws['suksesi_kerajaan'] = 'pemilihan';
      else if (this.G.laws['suksesi_kerajaan'] === 'pemilihan') this.G.laws['suksesi_kerajaan'] = 'primogenitur';
    }

    if (id.startsWith('suksesi_') && p && this.held(p.id).length > 0) {
      const isInitialGrace = this.G.tahun <= this.G.startYear + 1;
      if (!isInitialGrace) {
        this.G.legitimacy = Math.max(0, Math.min(100, (this.G.legitimacy ?? 85) - 6));
        this.G.lastLawChangeYear = this.G.tahun;
        this.held(p.id).forEach((t) =>
          t.kids.forEach((kid) => {
            const v = this.T[kid]?.pem ? this.C[this.T[kid].pem!] : null;
            if (v && v.hidup && v.id !== p.id) this.bump(v, -6);
          })
        );
      }
      const label = this.successionLawLabel(val).nama;
      this.G.log.unshift(
        isInitialGrace
          ? `Hukum suksesi ditetapkan menjadi ${label}.`
          : `Hukum suksesi diubah menjadi ${label} (-6 Legitimasi, -6 opini vasal).`
      );
      this.msg(`Hukum pewarisan aktif kini: ${label}.`);
      return;
    } else if (['tarif_pajak_feodal', 'hukuman_kriminal', 'hak_bangsawan'].includes(id) && p) {
      this.G.lastLawChangeYear = this.G.tahun;
      if (id === 'hak_bangsawan' && val === 'sentralisasi_mahkota') {
        this.held(p.id).forEach((t) =>
          t.kids.forEach((kid) => {
            const v = this.T[kid]?.pem ? this.C[this.T[kid].pem!] : null;
            if (v && v.hidup && v.id !== p.id) this.bump(v, -10);
          })
        );
      } else if (id === 'hak_bangsawan' && val === 'otonomi_luas') {
        this.held(p.id).forEach((t) =>
          t.kids.forEach((kid) => {
            const v = this.T[kid]?.pem ? this.C[this.T[kid].pem!] : null;
            if (v && v.hidup && v.id !== p.id) this.bump(v, 10);
          })
        );
      }
      this.G.log.unshift(`Hukum Feodal diperbarui: ${FEUDAL_LAW_LABELS[id]?.options[val]?.nama || val}.`);
    }
    this.save();
    this.notify();
  }

  public getEffectiveSuccessionLaw(c: Character): string {
    if (!c) return 'primogenitur';
    if (c.id === this.G?.pid) {
      const base = this.LAW('suksesi_kerajaan') || 'primogenitur';
      if (this.tierOf(c) >= 7 && this.LAW('suksesi_kekaisaran') === 'pemilihan_elektor') {
        return 'pemilihan';
      }
      return base;
    }
    const pt = this.primaryTitle(c);
    if (pt?.successionLaw) return pt.successionLaw;
    if (pt?.id === 'e_hre') return 'pemilihan';
    const b = (pt?.budaya || c.budaya || '').toLowerCase();
    if (['irlandia', 'skotlandia', 'welsh', 'gaelik'].some((k) => b.includes(k))) return 'tanistri';
    if (['norse', 'rusia', 'skandinavia', 'viking'].some((k) => b.includes(k))) return 'terbagi';
    if (b === 'german' && pt && pt.tier >= 5) return 'terbagi';
    return 'primogenitur';
  }

  public getTitleRights(tier: number, isMarquis = false): {
    tier: number;
    nama: string;
    maksProvinsi: number;
    maksVasal: number;
    bobotSuara: number;
    taxBonusPct: number;
    ket: string;
  } {
    const effectiveTier = isMarquis && tier === 5 ? 4 : tier;
    const def = this.tn(effectiveTier);
    const centBonus = this.LAW('hak_bangsawan') === 'sentralisasi_mahkota' ? 2 : 0;
    return {
      tier: effectiveTier,
      nama: def.nama || `Tier ${tier}`,
      maksProvinsi: (def.maks_provinsi || 1) + centBonus,
      maksVasal: def.maks_vasal ?? (effectiveTier <= 1 ? 0 : effectiveTier * 2),
      bobotSuara: def.bobot_suara ?? Math.max(1, effectiveTier),
      taxBonusPct: effectiveTier >= 6 ? 12 : effectiveTier >= 4 ? 7 : effectiveTier >= 3 ? 3 : 0,
      ket: def.ket || '',
    };
  }

  public getCulturalHeritage(budaya?: string): CulturalHeritageInfo {
    const key = (budaya || 'german').toLowerCase();
    if (CULTURAL_HERITAGE[key]) return CULTURAL_HERITAGE[key];
    if (['danish', 'swedish', 'norwegian'].includes(key)) return CULTURAL_HERITAGE.norse;
    if (['aragonese', 'portuguese', 'occitan'].includes(key)) return CULTURAL_HERITAGE.castilian;
    if (['lombard', 'venetian'].includes(key)) return CULTURAL_HERITAGE.italian;
    if (['polish', 'hungarian', 'russian', 'croatian', 'bohemian', 'serbian', 'bulgarian'].includes(key)) {
      return {
        nama: `Warisan Ksatria ${key.charAt(0).toUpperCase() + key.slice(1)}`,
        sifat: ['Tangguh', 'Penjaga Tapal Batas'],
        sk: { perang: 4, administrasi: 2 },
        milBonus: { kavaleri: 0.14 },
        opSameCulture: 12,
        desc: 'Pasukan berkuda perbatasan Eropa Tengah/Timur (+14% Kavaleri, +4 Perang).',
      };
    }
    if (['pecheneg', 'cuman', 'alan'].includes(key)) return CULTURAL_HERITAGE.turkish;
    return {
      nama: `Tradisi Bangsa ${key.charAt(0).toUpperCase() + key.slice(1)}`,
      sifat: ['Tradisional'],
      sk: { diplomasi: 2, perang: 2 },
      milBonus: { pedang: 0.08 },
      opSameCulture: 10,
      desc: 'Tradisi kesatria & adat daerah (+2 Perang, +2 Diplomasi, +8% Pedang).',
    };
  }

  public getActiveCharacters(): Character[] {
    return Object.values(this.C).filter((c) => Boolean(c && c.hidup));
  }

  public unlocked = (id: string): boolean => {
    const m = (this.D.modernisasi || []).find((x: AnyRule) => x.id === id);
    return m ? this.G.tahun >= m.tahun : true;
  };
  public SB = (k: string, f: string, df: AnyRule): AnyRule => {
    const o = (this.D?.sistem_besar || {})[k];
    return o && o[f] !== undefined ? o[f] : df;
  };
  public TG = (k: string, df: AnyRule): AnyRule => (this.D?.teks_game && this.D.teks_game[k]) || df;

  public applyTeks(): void {
    if (this.D?.pasukan_segitiga) {
      this.TRI = this.D.pasukan_segitiga;
      this.INV = Object.fromEntries(Object.entries(this.TRI).map(([a, b]) => [b as string, a]));
    }
    this.CEV = this.AT_cev(this.D.event_kelas);
    this.CHAINS = this.AT_events(this.D.event_berantai);
    this.FAM_EVENTS = this.AT_events(this.D.event_keluarga);
    const t = this.D?.teks_game;
    if (!t) return;
    if (t.nama_acak) this.NM = t.nama_acak;
    if (t.rumor) this.RUM = t.rumor;
    if (t.musim) this.SEAS = t.musim;
    if (t.faksi_istana) this.FAKSI = t.faksi_istana;
    if (t.pangkat_faksi) this.FACTION_RANKS = t.pangkat_faksi;
    if (t.target_perang_salib) this.CRUSADE_TARGETS = t.target_perang_salib;
  }

  // ============ BASIC HELPERS ============
  public me = (): Character => this.C[this.G.pid];
  public umur = (c: Character): number => (c.hidup || !c.wafat ? this.G.tahun : c.wafat) - c.lahir;
  public tn = (t: number): AnyRule =>
    this.D.tingkatan_gelar.find((x: AnyRule) => x.tier === t) || this.D.tingkatan_gelar[0];
  // PERF: indeks sementara "pemegang -> gelar". Hanya aktif di dalam withHeldMemo() (operasi baca-saja),
  // jadi tidak pernah basi karena tidak ada perubahan data selama indeks hidup.
  private heldMemo: Map<string, Title[]> | null = null;

  public withHeldMemo<R>(fn: () => R): R {
    if (this.heldMemo) return fn();
    const memo = new Map<string, Title[]>();
    const T = this.T;
    for (const k in T) {
      const t = T[k];
      if (t.pem) {
        const arr = memo.get(t.pem);
        if (arr) arr.push(t);
        else memo.set(t.pem, [t]);
      }
    }
    this.heldMemo = memo;
    try {
      return fn();
    } finally {
      this.heldMemo = null;
    }
  }

  public held = (id: string): Title[] => {
    const memo = this.heldMemo;
    if (memo) return (memo.get(id) || []).slice();
    const out: Title[] = [];
    const T = this.T;
    for (const k in T) {
      const t = T[k];
      if (t.pem === id) out.push(t);
    }
    return out;
  };
  public tierOf = (c: Character): number => {
    let m = 0;
    const memo = this.heldMemo;
    if (memo) {
      const arr = memo.get(c.id);
      if (arr) for (let i = 0; i < arr.length; i++) if (arr[i].tier > m) m = arr[i].tier;
      return m;
    }
    const T = this.T;
    for (const k in T) {
      const t = T[k];
      if (t.pem === c.id && t.tier > m) m = t.tier;
    }
    return m;
  };

  public PN = (f: AnyRule, c?: Character): string =>
    (f.nama_per_agama && c && f.nama_per_agama[c.agama]) || f.nama;

  public noMarry = (f: AnyRule, c: Character): boolean =>
    f.boleh_menikah === false && !(f.boleh_menikah_agama || []).includes(c.agama);

  public jenjangOf(c: Character): AnyRule | null {
    const f = this.D.profesi.find((x: AnyRule) => x.id === c.profesi);
    if (!f || !f.jenjang || !this.D.jenjang_karier) return null;
    const id = typeof f.jenjang === 'string' ? f.jenjang : f.jenjang[c.agama] || f.jenjang.default;
    const J = this.D.jenjang_karier[id];
    return J ? Object.assign({ id }, J) : null;
  }

  public rankIdx = (c: Character, J: AnyRule): number =>
    Math.min((c.rank || {})[J.id] || 0, J.pangkat.length - 1);

  public rankNama(c: Character): string | null {
    const J = this.jenjangOf(c);
    return J ? J.pangkat[this.rankIdx(c, J)].nama : null;
  }

  public rankInc(c: Character): number {
    const J = this.jenjangOf(c);
    return J ? J.pangkat[this.rankIdx(c, J)].pendapatan || 0 : 0;
  }

  public tTitle(c: Character): string {
    const t = this.tierOf(c);
    const relId = c.agama === 'katolik' ? this.relRankOf(c) : '';
    const relDef = relId ? this.relRankDef(relId) : null;
    const leaderTitle = this.faithLeaderTitle(c);
    const J = c.profesi ? this.jenjangOf(c) : null;
    const careerTitle = J ? this.rankNama(c) : null;
    if (t) {
      const pt = this.primaryTitle(c);
      const isMarq = t === 4 || Boolean(pt?.marquis && t === 5);
      const b = isMarq
        ? c.gender === 'P'
          ? 'Marchioness (Perbatasan)'
          : 'Marquis (Perbatasan)'
        : c.gender === 'P'
          ? this.tn(t).nama_wanita
          : this.tn(t).nama;
      if (relDef && relId !== 'biarawan') return `${b} · ${relDef.nama}`;
      if (leaderTitle) return `${b} · ${leaderTitle}`;
      if (J && (this.rankIdx(c, J) > 0 || (c.profesi === 'pendeta' && careerTitle))) {
        return `${b} · ${careerTitle}`;
      }
      return b;
    }
    if (relDef) return relDef.nama;
    if (leaderTitle) return leaderTitle;
    const p = this.D.profesi.find((x: AnyRule) => x.id === c.profesi);
    return p
      ? careerTitle || this.PN(p, c)
      : c.kelas === 'rakyat_jelata'
        ? 'Rakyat Jelata'
        : c.kelas === 'warga_kota'
          ? 'Warga Kota'
          : c.kelas === 'ksatria'
            ? c.gender === 'P'
              ? 'Ksatria (Dame)'
              : 'Ksatria (Sir)'
            : 'Bangsawan';
  }

  public primaryTitle(c: Character): Title | undefined {
    if (this.G.primary && this.T[this.G.primary] && this.T[this.G.primary].pem === c.id) {
      return this.T[this.G.primary];
    }
    return this.held(c.id).sort((a, b) => b.tier - a.tier)[0];
  }

  public mainT(c: Character): string {
    const h = this.primaryTitle(c);
    const jb =
      this.G.job && this.G.job.id === c.id
        ? this.D.jabatan.find((j: AnyRule) => j.id === this.G.job?.j)
        : null;
    const jbName = jb ? (jb.id === 'uskup' ? 'Kapelan Istana' : jb.nama) : '';
    return (h ? ' dari ' + h.nama : '') + (jbName ? ' · ' + jbName : '');
  }

  public full(c: Character): string {
    const dy = c.dinasti ? this.DY[c.dinasti] : undefined;
    const dName = dy?.nama || '';
    const pt = this.primaryTitle(c);
    const baseName = (pt && c.regnalNames?.[pt.id]) || c.nama;
    const regNum = pt ? this.getEffectiveRegnalNumber(c, pt) : 0;
    const showRoman = Boolean(pt && (regNum > 1 || (regNum === 1 && c.regnalForced?.[pt.id])));
    const romanStr = showRoman ? this.toRoman(regNum) : '';
    const alreadyHasRoman = Boolean(romanStr && new RegExp(`\\b${romanStr}$`, 'i').test(baseName.trim()));
    const roman = romanStr && !alreadyHasRoman ? ` ${romanStr}` : '';
    const appendDynasty =
      (dName.startsWith('von ') || dy?.gen) &&
      !baseName.includes(dName) &&
      !baseName.includes('von');
    return (c.gp ? c.gp + ' ' : '') + baseName + roman + (appendDynasty ? ' ' + dName : '');
  }

  public toRoman(num: number): string {
    if (!num || num < 1) return '';
    const map: [number, string][] = [
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let n = Math.floor(num);
    let out = '';
    for (const [val, sym] of map) {
      while (n >= val) {
        out += sym;
        n -= val;
      }
    }
    return out;
  }

  public getRegnalStatsForTitle(
    titleId: string,
    baseName: string,
    dynastyId?: string | null,
    excludeCharId?: string
  ): {
    totalPastRulers: number;
    ordinalIfCurrent: number;
    sameNameAllCount: number;
    maxNumAll: number;
    sameNameDynCount: number;
    maxNumDyn: number;
    maxNumLineage: number;
    lineageAncestorName: string | null;
    lastDynastyId: string | null;
    lastDynastyName: string;
  } {
    const stripRoman = (s: string) => (s || '').trim().replace(/\s+(?:[IVXLC]+)$/i, '').trim().toLowerCase();
    const hist = this.G?.rulers?.[titleId] || [];
    const offset = this.G?.titleHistoricalOffsets?.[titleId]?.count || 0;
    const clean = stripRoman(baseName || '');
    const sameAll = hist.filter((r) => stripRoman(r.nama || '') === clean);
    const sameDyn = dynastyId
      ? sameAll.filter((r) => r.dinasti === dynastyId || (this.DY[dynastyId]?.nama && r.dinastiNama === this.DY[dynastyId]?.nama))
      : sameAll;
    const maxNumAll = sameAll.reduce((mx, r, idx) => Math.max(mx, r.regnalNumber || idx + 1), 0);
    const maxNumDyn = sameDyn.reduce((mx, r, idx) => Math.max(mx, r.regnalNumber || idx + 1), 0);

    // Check family & dynasty lineage (ancestors + past/current titled kin sharing this name)
    let maxNumLineage = 0;
    let lineageAncestorName: string | null = null;
    if (clean) {
      const seen = new Set<string>();
      const checkCharLineage = (ch: Character | undefined) => {
        if (!ch || ch.id === excludeCharId || seen.has(ch.id)) return;
        seen.add(ch.id);
        const chTitleNames = ch.regnalNames ? Object.values(ch.regnalNames) : [];
        const matchesName =
          stripRoman(ch.nama) === clean ||
          chTitleNames.some((rn) => stripRoman(rn) === clean);
        if (matchesName && (!ch.hidup || this.held(ch.id).length > 0 || (ch.regnalNumbers && Object.keys(ch.regnalNumbers).length > 0))) {
          const existingMax = ch.regnalNumbers
            ? Math.max(1, ...Object.values(ch.regnalNumbers))
            : 1;
          if (existingMax >= maxNumLineage) {
            maxNumLineage = existingMax;
            lineageAncestorName = ch.nama;
          }
        }
      };

      // Direct ancestors of excludeCharId (if any)
      if (excludeCharId && this.C[excludeCharId]) {
        const queue: (string | null | undefined)[] = [this.C[excludeCharId].ayah, this.C[excludeCharId].ibu];
        for (let depth = 0; depth < 3 && queue.length; depth++) {
          const nextQ: (string | null | undefined)[] = [];
          queue.forEach((id) => {
            if (!id) return;
            const anc = this.C[id];
            if (anc) {
              checkCharLineage(anc);
              nextQ.push(anc.ayah, anc.ibu);
            }
          });
          queue.length = 0;
          queue.push(...nextQ);
        }
      }

      // Past or living rulers of the same dynasty across any title
      if (dynastyId) {
        Object.values(this.G?.rulers || {}).forEach((list) => {
          list.forEach((r) => {
            if (r.id !== excludeCharId && r.dinasti === dynastyId && stripRoman(r.nama || '') === clean) {
              const num = r.regnalNumber || 1;
              if (num >= maxNumLineage) {
                maxNumLineage = num;
                lineageAncestorName = r.nama;
              }
            }
          });
        });
        Object.values(this.C || {}).forEach((ch) => {
          if (ch.dinasti === dynastyId) checkCharLineage(ch);
        });
      }
    }

    const lastEntry = hist[hist.length - 1];
    const lastDynId = lastEntry?.dinasti ?? null;
    const lastDynName =
      (lastDynId && this.DY[lastDynId]?.nama) ||
      lastEntry?.dinastiNama ||
      'Dinasti Sebelumnya';
    return {
      totalPastRulers: offset + hist.length,
      ordinalIfCurrent: offset + hist.length + 1,
      sameNameAllCount: sameAll.length,
      maxNumAll,
      sameNameDynCount: sameDyn.length,
      maxNumDyn,
      maxNumLineage,
      lineageAncestorName,
      lastDynastyId: lastDynId,
      lastDynastyName: lastDynName,
    };
  }

  public getEffectiveRegnalNumber(c: Character, title?: Title): number {
    const pt = title || this.primaryTitle(c);
    if (!pt) return 0;
    if (c.regnalNumbers?.[pt.id]) return c.regnalNumbers[pt.id];
    const stats = this.getRegnalStatsForTitle(pt.id, c.regnalNames?.[pt.id] || c.nama, c.dinasti, c.id);
    if (stats.maxNumAll > 0) return stats.maxNumAll + 1;
    return 1;
  }

  public getTitleOrdinalInfo(
    c: Character,
    title?: Title
  ): {
    title: Title;
    rankName: string;
    ordinal: number;
    regnalNumber: number;
    roman: string;
    label: string;
  } | null {
    const t = title || this.primaryTitle(c);
    if (!t) return null;
    const isMarq = t.tier === 4 || Boolean(t.marquis && t.tier === 5);
    const rankName =
      t.tier === 0
        ? c.gender === 'P'
          ? 'Dame (Ksatria)'
          : 'Sir (Ksatria)'
        : isMarq
          ? c.gender === 'P'
            ? 'Marchioness'
            : 'Marquis'
          : c.gender === 'P'
            ? this.tn(t.tier).nama_wanita
            : this.tn(t.tier).nama;
    const hist = this.G?.rulers?.[t.id] || [];
    const offset = this.G?.titleHistoricalOffsets?.[t.id]?.count || 0;
    const totalPast = offset + hist.length;
    const ordinal = t.pem === c.id ? totalPast + 1 : Math.max(1, totalPast);
    const regnalNumber = this.getEffectiveRegnalNumber(c, t);
    const roman = regnalNumber > 1 || c.regnalForced?.[t.id] ? this.toRoman(regnalNumber) : '';
    const titTag = t.titular ? ' (Tituler)' : '';
    return {
      title: t,
      rankName,
      ordinal,
      regnalNumber,
      roman,
      label: `${rankName}${titTag} ke-${ordinal} dari ${t.nama}`,
    };
  }

  public getTitleSuccessionHistory(titleId: string): {
    title: Title | null;
    currentOwner: Character | null;
    currentOrdinal: number;
    priorOffset: number;
    priorNote: string;
    entries: {
      order: number;
      displayName: string;
      julukan?: string;
      dari: number;
      sampai: number | 'Sekarang';
      sebab?: string;
      dinastiNama?: string;
      isCurrent?: boolean;
    }[];
  } {
    const t = this.T[titleId] || null;
    const cur = t?.pem ? this.C[t.pem] || null : null;
    const off = this.G?.titleHistoricalOffsets?.[titleId];
    const priorOffset = off?.count || 0;
    const priorNote = off?.note || '';
    const hist = this.G?.rulers?.[titleId] || [];
    const entries: {
      order: number;
      displayName: string;
      julukan?: string;
      dari: number;
      sampai: number | 'Sekarang';
      sebab?: string;
      dinastiNama?: string;
      isCurrent?: boolean;
    }[] = hist.map((r, idx) => {
      const stripRoman = (s: string) => (s || '').trim().replace(/\s+(?:[IVXLC]+)$/i, '').trim();
      const base = stripRoman(r.nama);
      const rom = r.regnalNumber && (r.regnalNumber > 1 || /\s+I$/i.test(r.nama)) ? ` ${this.toRoman(r.regnalNumber)}` : '';
      const displayName = /\s+(?:[IVXLC]+)$/i.test(r.nama) ? r.nama : `${base}${rom}`;
      const dynNm = r.dinastiNama || (r.dinasti && this.DY[r.dinasti]?.nama) || undefined;
      return {
        order: priorOffset + idx + 1,
        displayName,
        julukan: r.julukan || undefined,
        dari: r.dari,
        sampai: r.sampai as number | 'Sekarang',
        sebab: r.sebab || undefined,
        dinastiNama: dynNm,
        isCurrent: false,
      };
    });
    const currentOrdinal = priorOffset + hist.length + (cur ? 1 : 0);
    if (cur && t) {
      const regNum = this.getEffectiveRegnalNumber(cur, t);
      const baseName = cur.regnalNames?.[t.id] || cur.nama;
      const showRoman = regNum > 1 || cur.regnalForced?.[t.id];
      const romanStr = showRoman ? this.toRoman(regNum) : '';
      const alreadyHas = Boolean(romanStr && new RegExp(`\\b${romanStr}$`, 'i').test(baseName.trim()));
      const displayName = romanStr && !alreadyHas ? `${baseName} ${romanStr}` : baseName;
      const lastPrevYear = hist.length ? hist[hist.length - 1].sampai : Math.min(this.G.tahun, cur.lahir + 16);
      entries.push({
        order: priorOffset + hist.length + 1,
        displayName,
        dari: Math.min(this.G.tahun, Math.max(lastPrevYear, cur.lahir + 12)),
        sampai: 'Sekarang',
        dinastiNama: cur.dinasti ? this.DY[cur.dinasti]?.nama : undefined,
        isCurrent: true,
      });
    }
    return {
      title: t,
      currentOwner: cur,
      currentOrdinal: Math.max(1, currentOrdinal),
      priorOffset,
      priorNote,
      entries,
    };
  }

  public describeCharacterIdentity(c: Character): {
    primaryRole: string;
    ordinalLabel: string;
    regnalTag: string;
    allTitleOrdinals: { id: string; label: string; domain: string }[];
  } {
    const held = this.held(c.id).sort((a, b) => b.tier - a.tier);
    const dy = c.dinasti ? this.DY[c.dinasti] : null;
    const pt = this.primaryTitle(c);
    const ord = pt ? this.getTitleOrdinalInfo(c, pt) : null;
    const baseName = (pt && c.regnalNames?.[pt.id]) || c.nama;
    const regTag =
      ord && ord.roman
        ? `${baseName} ${ord.roman}`
        : ord
          ? `${baseName} I`
          : baseName;

    if (held.length > 0 && ord) {
      return {
        primaryRole: `${ord.rankName}${ord.title.titular ? ' Tituler' : ''} — ${ord.title.nama}`,
        ordinalLabel: `${ord.rankName}${ord.title.titular ? ' Tituler (Tanpa Wilayah)' : ''} ke-${ord.ordinal} di ${ord.title.nama}${dy ? ` · Wangsa ${dy.nama}` : ''}`,
        regnalTag: regTag,
        allTitleOrdinals: held.map((t) => {
          const info = this.getTitleOrdinalInfo(c, t)!;
          return {
            id: t.id,
            label: `${info.rankName}${t.titular ? ' Tituler' : ''} ke-${info.ordinal}`,
            domain: t.nama,
          };
        }),
      };
    }

    const parentNobles = [c.ayah ? this.C[c.ayah] : null, c.ibu ? this.C[c.ibu] : null].filter(
      (x): x is Character => Boolean(x && this.tierOf(x) >= 3)
    );
    const roleDesc =
      parentNobles.length > 0
        ? `${c.gender === 'P' ? 'Putri' : 'Pangeran / Putra'} dari ${this.full(parentNobles[0])} (${this.tTitle(parentNobles[0])})`
        : `${this.tTitle(c)}${c.kelas ? ` (Status: ${c.kelas.replace(/_/g, ' ')})` : ''}`;

    return {
      primaryRole: roleDesc,
      ordinalLabel: dy ? `Anggota Wangsa ${dy.nama} (${c.budaya})` : `Tokoh ${c.budaya}`,
      regnalTag: c.nama,
      allTitleOrdinals: [],
    };
  }

  public AG(id: string): ReligionDef {
    return (
      (this.D.agama as ReligionDef[])
        .concat(this.G?.ag || [])
        .find((x) => x.id === id) || { id, nama: id, keluarga: 'x', efek: {} }
    );
  }

  public lv = (): number => (this.G.tahun >= 1350 ? 3 : this.G.tahun >= 1200 ? 2 : 1);
  public bi = (id: string): AnyRule => this.D.bangunan.find((x: AnyRule) => x.id === id);
  public kin = (a: Character, b: Character): boolean =>
    Boolean((a.ibu && a.ibu === b.ibu) || a.anak.includes(b.id) || b.anak.includes(a.id));
  public rawOpn = (a: Character, b: Character): number => a.op[b.id] ?? (this.kin(a, b) ? 20 : 0);
  public relBaseOpinion(a: Character, b: Character): number {
    if (!a || !b || a.id === b.id) return 0;
    if (a.agama === b.agama) return 5;
    const ra = this.AG(a.agama);
    const rb = this.AG(b.agama);
    const medieval = (this.G?.tahun || 1066) < 1550;
    if (a.agama === 'pagan' || b.agama === 'pagan') {
      return medieval ? -45 : -25;
    }
    const involvesIslam = a.agama === 'islam' || b.agama === 'islam';
    const involvesCatholic = a.agama === 'katolik' || b.agama === 'katolik';
    if (involvesIslam && (ra.keluarga === 'kristen' || rb.keluarga === 'kristen')) {
      if (involvesCatholic) return medieval ? -50 : -35;
      return medieval ? -35 : -25;
    }
    if (involvesCatholic && (a.agama === 'protestan' || b.agama === 'protestan' || a.agama === 'anglikan' || b.agama === 'anglikan')) {
      return -30;
    }
    if (involvesCatholic && (a.agama === 'ortodoks' || b.agama === 'ortodoks')) {
      return -15;
    }
    if (ra.keluarga === rb.keluarga) return ra.sekte || rb.sekte ? -20 : -10;
    return -35;
  }
  public isFriend = (id: string): boolean => Boolean(this.G?.friends?.includes(id));
  public isRival = (id: string): boolean => Boolean(this.G?.rivals?.includes(id));

  public dynRelKey(d1: string, d2: string): string {
    return d1 < d2 ? `${d1}__${d2}` : `${d2}__${d1}`;
  }

  public getDynastyRelation(d1?: string | null, d2?: string | null): number {
    if (!d1 || !d2 || d1 === d2) return 0;
    return this.G?.dynRel?.[this.dynRelKey(d1, d2)] || 0;
  }

  public adjustDynastyRelation(d1?: string | null, d2?: string | null, delta = 0): void {
    if (!d1 || !d2 || d1 === d2 || !delta) return;
    if (!this.G.dynRel) this.G.dynRel = {};
    const k = this.dynRelKey(d1, d2);
    this.G.dynRel[k] = Math.max(-100, Math.min(100, (this.G.dynRel[k] || 0) + delta));
  }

  public getCharacterHonorific(cid: string): (typeof HONORIFICS)[number] | null {
    const entries = Object.entries(this.G?.honorifics || {});
    for (const [hid, rid] of entries) {
      if (rid === cid) return HONORIFICS.find((h) => h.id === hid) || null;
    }
    return null;
  }

  public opn = (a: Character, b: Character): number => {
    let relMod = 0;
    if (this.G?.pid) {
      if (a.id === this.G.pid && this.isFriend(b.id)) relMod = 25;
      else if (b.id === this.G.pid && this.isFriend(a.id)) relMod = 25;
      else if (a.id === this.G.pid && this.isRival(b.id)) relMod = -35;
      else if (b.id === this.G.pid && this.isRival(a.id)) relMod = -35;
    }
    const dynBonus =
      a.dinasti && b.dinasti && a.dinasti !== b.dinasti
        ? Math.round(Math.max(-35, Math.min(35, this.getDynastyRelation(a.dinasti, b.dinasti) * 0.5)))
        : 0;
    const cultBonus =
      a.budaya === b.budaya ? this.getCulturalHeritage(a.budaya).opSameCulture : 0;
    let feudalLawMod = 0;
    let honorBonus = 0;
    let legitMod = 0;
    if (this.G?.pid && b.id === this.G.pid && this.held(a.id).some((t) => t.atas && this.T[t.atas]?.pem === b.id)) {
      const hak = this.LAW('hak_bangsawan');
      if (hak === 'otonomi_luas') feudalLawMod += 12;
      else if (hak === 'sentralisasi_mahkota') feudalLawMod -= 12;
      const paj = this.LAW('tarif_pajak_feodal');
      if (paj === 'ringan') feudalLawMod += 8;
      else if (paj === 'eksploitatif') feudalLawMod -= 12;
      const vt = this.held(a.id)[0];
      if (vt && this.G.vassalObligations?.[vt.id]) {
        const ob = this.G.vassalObligations[vt.id];
        if (ob.tax === 'rendah') feudalLawMod += 8;
        else if (ob.tax === 'tinggi') feudalLawMod -= 12;
        if (ob.levy === 'rendah') feudalLawMod += 6;
        else if (ob.levy === 'tinggi') feudalLawMod -= 10;
      }
      const leg = this.G.legitimacy ?? 85;
      if (leg < 45) legitMod = -15;
      else if (leg >= 85) legitMod = 6;
    }
    if (this.G?.pid && b.id === this.G.pid) {
      const hon = this.getCharacterHonorific(a.id);
      if (hon) honorBonus = hon.opBonus;
    }
    const kanselir =
      this.G?.pid && b.id === this.G.pid && this.G.pen?.kanselir && this.C[this.G.pen.kanselir]?.hidup
        ? Math.round((this.C[this.G.pen.kanselir].sk.diplomasi * this.officeEfficiency('kanselir')) / 12)
        : 0;
    let rulerRelMod = 0;
    if (this.G?.pid && this.G.rulerRelations) {
      const otherId = a.id === this.G.pid ? b.id : b.id === this.G.pid ? a.id : null;
      if (otherId && this.G.rulerRelations[otherId]) {
        const rr = this.G.rulerRelations[otherId];
        rulerRelMod = Math.round(rr.trust * 0.25 + rr.romance * 0.35 + (rr.status === 'sekutu_akrab' ? 12 : rr.status === 'musuh_bebuyutan' ? -25 : 0));
      }
    }
    return Math.max(
      -100,
      Math.min(100, this.rawOpn(a, b) + this.relBaseOpinion(a, b) + relMod + dynBonus + cultBonus + feudalLawMod + honorBonus + legitMod + kanselir + rulerRelMod)
    );
  };
  public hv = (s: string): number => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100, 7);
  public SRT = (): AnyRule[] => this.D.surat || [];
  public PJK = (): AnyRule[] => this.D.pajak || [];
  public ef2 = (e?: Record<string, number>): string =>
    Object.entries(e || {})
      .map(([k, v]) => `${k.replace(/_/g, ' ')} ${v > 0 ? '+' : ''}${v}`)
      .join(', ');
  public ageOK = (c: Character): boolean => this.umur(c) >= 16 && c.hidup;
  public single(c: Character): boolean {
    const f = this.D.profesi.find((x: AnyRule) => x.id === c.profesi);
    if (f && this.noMarry(f, c)) return false;
    return !c.pasangan && ['lajang', 'janda', 'duda', 'bercerai'].includes(c.sn) && this.umur(c) >= 16;
  }
  public lifeSpan = (c: Character): string =>
    c.hidup ? `lahir ${c.lahir}` : `${c.lahir}–${c.wafat || '?'}`;
  public lifeText = (c: Character): string =>
    `Lahir ${c.lahir} · ${
      c.hidup
        ? `Hidup, usia ${this.umur(c)}`
        : `Wafat ${c.wafat || 'tahun tak tercatat'} (usia ${this.umur(c)})`
    }`;

  // ============ PROVINCES & BUILDINGS ============
  public provs(t: Title): Province[] {
    if (!this.P[t.id]) {
      const nm = t.prov || [t.nama.replace(/^\S+\s/, '')];
      this.P[t.id] = nm.map((n) => {
        const d =
          (this.D.provinsi_detail || []).find((x: AnyRule) => x.nama === n && x.wilayah === t.id) || {};
        const isCoastal = d.pesisir !== undefined ? Boolean(d.pesisir) : COASTAL_TITLE_IDS.has(t.id);
        return {
          nama: n,
          dev: d.perkembangan || R(15, 35),
          eko: 8,
          b: [],
          pes: isCoastal,
          agama: d.agama || t.agama || t.budaya,
          agamaP: d.agama || t.budaya,
          culture: d.budaya || t.budaya,
        };
      });
    }
    return this.P[t.id];
  }

  public provEffects(c: Character): Record<string, number> {
    const eff: Record<string, number> = {
      maks_pasukan: 0,
      pasukan_tahunan: 0,
      pembelajaran: 0,
      administrasi: 0,
      biaya_rekrut_persen: 0,
      ekonomi: 0,
      kesalehan_per_tahun: 0,
    };
    this.held(c.id).forEach((t) => {
      if (t.tier <= 3 && !t.titular) {
        this.provs(t).forEach((v) => {
          v.b.forEach((b) => {
            const x = this.bi(b);
            if (x && x.efek) {
              for (const [k, val] of Object.entries(x.efek as Record<string, number>)) {
                if (k in eff) eff[k] += val;
              }
            }
          });
        });
      }
    });
    return eff;
  }

  public slotProv(v: Province): number {
    return 2 + Math.floor(v.dev / 25);
  }

  // ============ TRAITS & CHARACTER CREATION ============
  private applyTr(c: Character): void {
    c.sifat.forEach((i) => {
      const e = (this.D.sifat.find((s: AnyRule) => s.id === i) || { efek: {} }).efek;
      for (const k in e) {
        if (k in c.sk) (c.sk as AnyRule)[k] = cl((c.sk as AnyRule)[k] + e[k]);
        else if (k in c.sp) (c.sp as AnyRule)[k] = cl((c.sp as AnyRule)[k] + e[k]);
      }
    });
  }

  private yr(p: Character, k: string): number {
    return (
      p.sifat.reduce(
        (a, i) => a + ((this.D.sifat.find((s: AnyRule) => s.id === i) || { efek: {} }).efek[k] || 0),
        0
      ) + ((this.AG(p.agama).efek || {})[k] || 0)
    );
  }

  private oppose(c: Character): string | null {
    const opp = this.D.sifat.find((x: AnyRule) => x.id === c.sifat[0]);
    if (!opp || !opp.lawan) return null;
    if (c.sifat.includes(opp.lawan)) {
      const lawan = this.D.sifat.find((x: AnyRule) => x.id === opp.lawan);
      return `Konflik sifat: ${opp.nama} vs ${lawan?.nama || opp.lawan}`;
    }
    return null;
  }

  public pickCultureName(g: 'L' | 'P', budaya?: string): string {
    const alias: Record<string, string> = {
      bohemian: 'czech',
      ceko: 'czech',
      french: 'frankish',
      prancis: 'frankish',
      anglo_saxon: 'saxon',
      inggris: 'saxon',
      spanish: 'castilian',
      spanyol: 'castilian',
      arabic: 'maghrebi',
      arab: 'maghrebi',
      byzantine: 'greek',
      bizantium: 'greek',
      dutch: 'flemish',
      belanda: 'flemish',
      scottish: 'scots',
      skotlandia: 'scots',
      irlandia: 'irish',
      turki: 'turkish',
      italia: 'italian',
    };
    const key = budaya ? alias[budaya.toLowerCase()] || budaya.toLowerCase() : '';
    const dMap = this.D?.generator?.nama_budaya as Record<string, Record<'L' | 'P', string[]>> | undefined;
    const defMap = (defaultGameData as GameData)?.generator?.nama_budaya as
      | Record<string, Record<'L' | 'P', string[]>>
      | undefined;
    const pool =
      (key && dMap?.[key]?.[g]?.length ? dMap[key][g] : undefined) ||
      (key && defMap?.[key]?.[g]?.length ? defMap[key][g] : undefined) ||
      this.NM[g];
    return pick(pool && pool.length ? pool : this.NM[g]);
  }

  public formatDynastyName(budaya: string, root: string): string {
    const b = (budaya || 'german').toLowerCase();
    const cleanRoot = root.trim();
    if (!cleanRoot) return 'Hohenstein';
    if (b === 'maghrebi' || b === 'sicilian_arab') {
      return cleanRoot.startsWith('Al-') || cleanRoot.startsWith('Banu ') ? cleanRoot : `Al-${cleanRoot}`;
    }
    if (b === 'turkish') {
      return /(?:oglu|oğlu|id)$/i.test(cleanRoot) ? cleanRoot : `${cleanRoot}oğlu`;
    }
    if (b === 'greek') {
      return /(?:os|es|as|is)$/i.test(cleanRoot) ? cleanRoot : `${cleanRoot}os`;
    }
    if (b === 'german') return `von ${cleanRoot}`;
    if (b === 'czech' || b === 'polish') return `z ${cleanRoot}`;
    if (b === 'flemish') return `van ${cleanRoot}`;
    if (b === 'italian' || b === 'lombard') return `di ${cleanRoot}`;
    if (['frankish', 'norman', 'breton', 'occitan', 'castilian', 'portuguese', 'hungarian'].includes(b)) {
      return `de ${cleanRoot}`;
    }
    if (b === 'saxon' || b === 'scots') return `of ${cleanRoot}`;
    if (b === 'irish') return `O'${cleanRoot}`;
    if (b === 'welsh') return `ap ${cleanRoot}`;
    if (b === 'norse_gael' || b === 'norse') return `af ${cleanRoot}`;
    if (b === 'croatian' || b === 'serbian') return `od ${cleanRoot}`;
    if (b === 'bulgarian') return `ot ${cleanRoot}`;
    if (b === 'rus') return `iz ${cleanRoot}`;
    if (b === 'pecheneg') return cleanRoot;
    return `de ${cleanRoot}`;
  }

  public pickCultureDynastyName(budaya?: string): string {
    const key = (budaya || 'german').toLowerCase();
    const GN = this.D?.generator || (defaultGameData as GameData).generator || {};
    const defGN = (defaultGameData as GameData).generator || {};
    const prefs: string[] = GN.prefix_dinasti?.[key] || defGN.prefix_dinasti?.[key] || ['de'];
    const roots: string[] = GN.akar_dinasti?.[key] || defGN.akar_dinasti?.[key] || ['Hohenstein'];
    const pref = pick(prefs);
    const root = pick(roots);
    if (!pref) return root;
    if (pref === 'Al-' || pref === "O'" || pref === 'Fitz' || pref === 'Ker') return `${pref}${root}`;
    return `${pref} ${root}`;
  }

  public mkC(o: Partial<Character>): Character {
    const g: 'L' | 'P' = o.gender || pick(['L', 'P']);
    const c: Character = Object.assign(
      {
        id: 'n' + ++this.G.n,
        gender: g,
        nama: o.nama || this.pickCultureName(g, o.budaya),
        lahir: this.G.tahun - R(18, 45),
        budaya: 'german',
        agama: 'katolik',
        sifat: [],
        sn: 'lajang',
        pasangan: null,
        anak: [],
        ibu: null,
        ayah: null,
        hidup: true,
        dinasti: null,
        kelas: 'bangsawan',
        profesi: null,
        op: {},
        items: [],
        sp: {
          kebahagiaan: R(30, 70),
          kesehatan: R(40, 90),
          penampilan: R(20, 80),
          kesuburan: R(30, 90),
          duel: R(5, 40),
        },
        sk: {
          diplomasi: R(5, 70),
          spionase: R(5, 70),
          perang: R(5, 70),
          administrasi: R(5, 70),
          pembelajaran: R(5, 70),
        },
        res: { prestise: R(5, 40), emas: R(10, 60), kesalehan: R(20, 60) },
        claims: [],
        marriageHistory: [],
        health: { illness: null, severity: 0, since: 0 },
      },
      o
    );
    const ch = this.getCulturalHeritage(c.budaya);
    for (const [k, v] of Object.entries(ch.sk)) {
      if (v && k in c.sk) {
        (c.sk as AnyRule)[k] = cl((c.sk as AnyRule)[k] + v);
      }
    }
    this.C[c.id] = c;
    this.applyTr(c);
    return c;
  }

  // ============ WORLD INIT ============
  public newWorld(): void {
    this.T = {};
    this.C = {};
    this.DY = {};
    this.P = {};
    this.G = {
      tahun: this.D.meta.tahun_mulai,
      startYear: this.D.meta.tahun_mulai,
      n: 0,
      pid: '',
      log: [],
      tr: { pedang: 0, pemanah: 0, kavaleri: 0 },
      tun: [],
      was: { allowTiri: false, perWilayah: {}, wali: null },
      us: [],
      q: [],
      tab: 0,
      done: {},
      ev: null,
      kpt: 0,
      pen: {},
      al: [],
      ag: [],
      sh: {},
      sel: [],
      md: null,
      f: '',
      fav: [],
      jail: {},
      paj: 1,
      primary: null,
      claims: {},
      sieges: {},
      war: null,
      modern: [],
      divorce: [],
      widows: {},
      rakyat: { bahagia: 50 },
      rumorLog: [],
      plague: {},
      chainDone: {},
      faction: null,
      factionRep: { militer: 0, gereja: 0, _nextGen: {} },
      deeds: {},
      dynHist: {},
      rulers: {},
      regency: null,
      crusades: [],
      crusadeHistory: [],
      reformed: [],
      treeExpand: {},
      treeDepth: 3,
      treeUp: 2,
      greatWars: [],
      greatWarHistory: [],
      cadetBranches: {},
      renaissance: { unlocked: false, points: 0 },
      blackDeath: null,
      peasantRevolt: null,
      protestantStarted: false,
      thirtyYearsWar: null,
      hw: {},
      hwLog: [],
      relRank: {},
      church: {
        pope: null,
        cardinals: [],
        bishops: [],
        archbishops: {},
        saints: [],
        doctrine: 'ortodoks',
        excom: {},
        interdict: {},
        antiPope: null,
      },
      laws: {
        suksesi_kerajaan: 'primogenitur',
        suksesi_gender: 'agnatik_kognatik',
        suksesi_kekaisaran: 'turun_temurun',
      },
      notifs: [],
      timeline: [],
      trade: [],
      loans: [],
      books: [],
      crimes: {},
      popeHistory: [],
      expeditions: [],
      siegeDetail: {},
      spyAct: null,
      histDone: {},
      background: 'noble',
      council: [],
      councilVote: null,
      achievements: [],
      anglican: false,
      tudorSpawned: false,
      anneSpawned: false,
      lutherSpawned: false,
      coups: [],
      prices: { grain: 2, iron: 5, cloth: 4, spice: 10 },
      orders: {},
      morale: 80,
      travel: null,
      childTutor: {},
      office: {},
      officerHistory: [],
      logistics: { supply: 100, morale: 85, forage: 0 },
      warCampaign: null,
      familyView: { depth: 3, showSpouses: true, showDead: false, centered: '' },
      familyFocus: '',
      worship: {},
      faithLeadership: {
        patriarch: null,
        syekhulIslam: null,
        synodModerator: null,
        anglicanPrimate: null,
        activeFatwa: null,
        orthodoxCanon: 'Kanon Konsili Ekumenis',
        protestantConfession: 'Pengakuan Iman Augsburg',
        anglicanAct: false,
      },
      friends: [],
      rivals: [],
      homeLevel: 0,
      dynRel: {},
      vassalObligations: {},
      legitimacy: 85,
      honorifics: {},
      secretTreaties: [],
      luxuryGoods: [],
      tech: { military: 0, economy: 0, activeProject: null },
      courtBudget: { admin: 1, military: 1, court: 1 },
      successionCrisis: null,
      pregnancies: [],
      intimacyCooldown: {},
      pendingNaming: [],
      pendingBirthInfo: {},
      rulerRelations: {},
      pendingCoronation: null,
    };

    const add = (node: AnyRule, up: string | null) => {
      if (typeof node === 'string') node = { nama: node };
      const tier = node.tier || 3;
      const id = node.id || (tier === 3 ? 'c_' : 't_') + slug(node.nama);
      this.T[id] = {
        id,
        nama: tier === 3 && !/^Wilayah/.test(node.nama) ? 'Wilayah ' + node.nama : node.nama,
        tier,
        pem: node.pemegang || null,
        atas: up,
        budaya: node.budaya || (up && this.T[up]?.budaya) || 'german',
        agama: node.agama || (up && this.T[up]?.agama) || 'katolik',
        prov: node.provinsi || null,
        kids: [],
        marquis: Boolean(node.marquis),
        kas: this.initTitleKas(tier, Boolean(node.marquis)),
      };
      if (up && this.T[up]) this.T[up].kids.push(id);
      (node.wilayah || []).forEach((w: AnyRule) => add(w, id));
      (node.bawahan || []).forEach((b: AnyRule) => add(b, id));
    };

    add(this.D.dunia, null);
    (this.D.dunia_lain || []).forEach((x: AnyRule) => add(x, null));
    (this.D.independen || []).forEach((x: AnyRule) => add(x, null));
    (this.D.dinasti || []).forEach((d: AnyRule) => {
      this.DY[d.id] = { ...d };
    });

    (this.D.karakter || []).forEach((k: AnyRule) => {
      const c = this.mkC({
        id: k.id,
        nama: k.nama,
        gender: k.gender,
        lahir: k.lahir,
        budaya: k.budaya,
        agama: k.agama,
        sifat: (k.sifat || []).slice(),
        sn: k.status_nikah || 'lajang',
        pasangan: k.pasangan || null,
        anak: (k.anak || []).slice(),
        ibu: k.ibu || null,
        ayah: k.ayah || null,
        dinasti: k.dinasti,
        kelas: k.kelas || 'bangsawan',
        profesi: k.profesi || null,
        gp: k.gelar_depan,
      });
      if (k.stat_pribadi) c.sp = { ...k.stat_pribadi };
      if (k.stat_kerajaan) c.sk = { ...k.stat_kerajaan };
      if (k.sumber_daya) {
        const s = k.sumber_daya;
        c.res = {
          prestise: s.prestise || 0,
          emas: s.emas || 0,
          kesalehan: s.kesalehan || 0,
        };
        if (s.pasukan) c.pas = s.pasukan;
      }
    });

    (this.D.klaim_gelar_tambahan || []).forEach((k: AnyRule) => {
      const cid = Object.keys(k)[0].replace('_klaim', '');
      if (this.C[cid]) {
        this.G.claims[cid] = this.G.claims[cid] || [];
        this.G.claims[cid].push({ id: k[cid], nama: k.nama, kendali: k.kendali });
      }
    });

    (this.D.hubungan_awal || []).forEach((h: AnyRule) => {
      if (this.C[h.dari] && this.C[h.ke]) {
        this.C[h.dari].op[h.ke] = h.nilai;
        this.C[h.ke].op[h.dari] = h.nilai;
      }
    });

    Object.values(this.C).forEach((c) => {
      const cf = this.oppose(c);
      if (cf) this.G.log.push(cf);
    });

    if (this.C['william'] && this.T['k_inggris']) {
      this.G.claims['william'] = this.G.claims['william'] || [];
      if (!this.G.claims['william'].some((clm) => clm.id === 'k_inggris')) {
        this.G.claims['william'].push({ id: 'k_inggris', nama: this.T['k_inggris'].nama, kendali: 1 });
      }
    }

    if (this.C['paus']?.hidup) {
      this.G.church.pope = 'paus';
      this.G.relRank['paus'] = 'paus';
      this.G.popeHistory.push({ id: 'paus', y: this.G.tahun });
    }
    this.seedChurchHierarchy();
    this.seedFaithLeaders();
    this.seedHistoricalRulers(false);
    this.seedDynHist();
  }

  private seedHistoricalRulers(isMigration = false): void {
    if (!this.G.rulers) this.G.rulers = {};
    if (!this.G.titleHistoricalOffsets) this.G.titleHistoricalOffsets = {};

    const dynByName = new Map<string, string>();
    Object.values(this.DY || {}).forEach((d) => {
      if (d?.nama) dynByName.set(d.nama.trim().toLowerCase(), d.id);
    });

    HISTORICAL_TITLE_SEEDS.forEach((seed) => {
      if (!this.T[seed.titleId]) return;
      if (seed.priorOffset) {
        this.G.titleHistoricalOffsets![seed.titleId] = {
          count: seed.priorOffset,
          note: seed.priorNote || '',
        };
      }
      const existing = this.G.rulers[seed.titleId] || [];
      const existingIds = new Set(existing.map((e) => e.id));
      const seededEntries = seed.predecessors.map((pr, idx) => {
        const dynId = pr.dinastiNama ? dynByName.get(pr.dinastiNama.trim().toLowerCase()) || null : null;
        return {
          id: `hist_${seed.titleId}_${idx}`,
          nama: pr.nama,
          julukan: pr.julukan || '',
          dari: pr.dari,
          sampai: pr.sampai,
          sebab: pr.sebab || 'wafat',
          regnalNumber: pr.regnalNumber || 1,
          dinasti: dynId,
          dinastiNama: pr.dinastiNama,
        };
      });

      if (!isMigration) {
        this.G.rulers[seed.titleId] = seededEntries;
      } else {
        const missing = seededEntries.filter((e) => !existingIds.has(e.id));
        if (missing.length > 0) {
          this.G.rulers[seed.titleId] = [...missing, ...existing];
        }
      }

      if (seed.current1066) {
        const ch = this.C[seed.current1066.charId];
        if (ch) {
          ch.regnalNames = ch.regnalNames || {};
          ch.regnalNumbers = ch.regnalNumbers || {};
          ch.regnalForced = ch.regnalForced || {};
          if (!ch.regnalNames[seed.titleId]) {
            ch.regnalNames[seed.titleId] = seed.current1066.baseName;
          }
          if (!ch.regnalNumbers[seed.titleId]) {
            ch.regnalNumbers[seed.titleId] = seed.current1066.regnalNumber;
          }
          if (seed.current1066.forced && ch.regnalForced[seed.titleId] === undefined) {
            ch.regnalForced[seed.titleId] = true;
          }
        }
      }
    });
    this.G._histRulersSeeded = true;
  }

  private seedChurchHierarchy(): void {
    if (!this.G.church.archbishops) this.G.church.archbishops = {};
    this.G.church.cardinals = (this.G.church.cardinals || []).filter(
      (id) => this.C[id] && this.C[id].hidup && this.C[id].agama === 'katolik'
    );
    const availDyns = Object.keys(this.DY);
    const presetCards = [
      { nama: 'Odo de Châtillon', budaya: 'frankish', prefDyn: 'capet' },
      { nama: 'Ugo di Remiremont', budaya: 'german', prefDyn: 'salian' },
      { nama: 'Pietro Damiani', budaya: 'italian', prefDyn: 'contarini' },
      { nama: 'Goffredo di Milano', budaya: 'lombard', prefDyn: 'canossa' },
      { nama: 'Lanfranc di Pavia', budaya: 'norman', prefDyn: 'normandia' },
      { nama: 'Desiderio di Montecassino', budaya: 'italian', prefDyn: '' },
      { nama: 'Anselmo di Aosta', budaya: 'italian', prefDyn: '' },
      { nama: 'Ildebrando da Soana', budaya: 'italian', prefDyn: '' },
      { nama: 'Gerardo di Ostia', budaya: 'italian', prefDyn: '' },
      { nama: 'Uberto di Silva Candida', budaya: 'frankish', prefDyn: '' },
      { nama: 'Stefano di Besançon', budaya: 'frankish', prefDyn: '' },
      { nama: 'Beno di Osnabrück', budaya: 'german', prefDyn: 'neuburg' },
      { nama: 'Bernardo di Toledo', budaya: 'castilian', prefDyn: 'jimenez' },
      { nama: 'Gelmiro di Santiago', budaya: 'castilian', prefDyn: '' },
      { nama: 'Teobaldo di Canterbury', budaya: 'saxon', prefDyn: 'godwin' },
      { nama: 'Rainiero di Bleda', budaya: 'italian', prefDyn: '' },
      { nama: 'Cono di Palestrina', budaya: 'german', prefDyn: '' },
      { nama: 'Giovanni di Tusculum', budaya: 'italian', prefDyn: '' },
      { nama: 'Guido di Vienne', budaya: 'frankish', prefDyn: '' },
      { nama: 'Lamberto di Fagnano', budaya: 'italian', prefDyn: '' },
      { nama: 'Miklós di Esztergom', budaya: 'hungarian', prefDyn: 'arpad' },
      { nama: 'Lovro di Split', budaya: 'croatian', prefDyn: 'trpimirovic' },
      { nama: 'Turgot di Durham', budaya: 'scots', prefDyn: 'dunkeld' },
      { nama: 'Raimundo di Coimbra', budaya: 'portuguese', prefDyn: 'portucale_vimara' },
      { nama: 'Alfanus di Salerno', budaya: 'norman', prefDyn: 'hauteville' },
    ];
    let idx = 0;
    while (this.G.church.cardinals.length < 23 && idx < presetCards.length) {
      const tpl = presetCards[idx++];
      if (Object.values(this.C).some((x) => x.hidup && x.nama === tpl.nama && this.G.church.cardinals.includes(x.id))) {
        continue;
      }
      let dynId = tpl.prefDyn && this.DY[tpl.prefDyn] ? tpl.prefDyn : availDyns[idx % Math.max(1, availDyns.length)] || null;
      if (!dynId) {
        const dId = 'y' + ++this.G.n;
        this.DY[dId] = {
          id: dId,
          nama: 'di Roma',
          prestise: R(180, 360),
          status: 'bangsawan_tinggi',
          status_tier: 3,
          kepala: null,
          gen: true,
        };
        dynId = dId;
      }
      const c = this.mkC({
        nama: tpl.nama,
        gender: 'L',
        agama: 'katolik',
        budaya: tpl.budaya,
        dinasti: dynId,
        lahir: this.G.tahun - R(40, 60),
        profesi: 'pendeta',
        kelas: 'rohaniwan',
        sn: 'selibat',
        res: { prestise: R(60, 155), emas: R(45, 95), kesalehan: R(360, 495) },
        sk: {
          diplomasi: R(45, 86),
          spionase: R(25, 58),
          perang: R(10, 30),
          administrasi: R(45, 78),
          pembelajaran: R(62, 92),
        },
      });
      if (dynId && this.DY[dynId] && !this.DY[dynId].kepala) {
        this.DY[dynId].kepala = c.id;
      }
      this.G.church.cardinals.push(c.id);
      this.G.relRank[c.id] = 'kardinal';
      c.rank = c.rank || {};
      c.rank['gereja_katolik'] = 4;
    }
    const cardCultures = ['italian', 'frankish', 'german', 'castilian', 'norman', 'hungarian', 'croatian'];
    while (this.G.church.cardinals.length < 23) {
      const cul = pick(cardCultures);
      const c = this.mkC({
        nama: `Kardinal ${this.pickCultureName('L', cul)}`,
        gender: 'L',
        agama: 'katolik',
        budaya: cul,
        dinasti: availDyns.length ? pick(availDyns) : null,
        lahir: this.G.tahun - R(40, 58),
        profesi: 'pendeta',
        kelas: 'rohaniwan',
        sn: 'selibat',
        res: { prestise: R(50, 130), emas: R(40, 90), kesalehan: R(355, 480) },
        sk: {
          diplomasi: R(45, 80),
          spionase: R(20, 55),
          perang: R(10, 28),
          administrasi: R(45, 75),
          pembelajaran: R(60, 90),
        },
      });
      this.G.church.cardinals.push(c.id);
      this.G.relRank[c.id] = 'kardinal';
      c.rank = c.rank || {};
      c.rank['gereja_katolik'] = 4;
    }
  }

  private migrateState(): void {
    if (!this.G.startYear) this.G.startYear = this.D.meta.tahun_mulai;
    if (!this.G.rakyat) this.G.rakyat = { bahagia: 50 };
    if (!this.G.rumorLog) this.G.rumorLog = [];
    if (!this.G.plague) this.G.plague = {};
    if (!this.G.chainDone) this.G.chainDone = {};
    if (this.G.faction === undefined) this.G.faction = null;
    if (!this.G.deeds) this.G.deeds = {};
    if (!this.G.dynHist) this.G.dynHist = {};
    if (!this.G.rulers) this.G.rulers = {};
    if (!this.G.titleHistoricalOffsets) this.G.titleHistoricalOffsets = {};
    if (!this.G._histRulersSeeded) this.seedHistoricalRulers(true);
    if (!this.G.was) this.G.was = {};
    if (this.G.was.allowTiri === undefined) this.G.was.allowTiri = false;
    if (!this.G.was.perWilayah) this.G.was.perWilayah = {};
    if (this.G.was.wali === undefined) this.G.was.wali = null;
    if (this.G.regency === undefined) {
      this.G.regency = null;
    } else if (this.G.regency) {
      const rh = this.C[this.G.regency.player];
      const expired =
        !rh ||
        !rh.hidup ||
        rh.id !== this.G.pid ||
        this.umur(rh) >= 16 ||
        (this.G.regency.until > 100
          ? this.G.tahun >= this.G.regency.until
          : this.umur(rh) >= this.G.regency.until);
      if (expired) {
        this.G.regency = null;
      }
    }
    if (!this.G.factionRep) this.G.factionRep = { militer: 0, gereja: 0, _nextGen: {} };
    if (!this.G.factionRep._nextGen) this.G.factionRep._nextGen = {};
    if (!this.G.crusades) this.G.crusades = [];
    if (!this.G.crusadeHistory) this.G.crusadeHistory = [];
    if (!this.G.reformed) this.G.reformed = [];
    if (!this.G.treeExpand) this.G.treeExpand = {};
    if (this.G.treeDepth === undefined) this.G.treeDepth = 3;
    if (this.G.treeUp === undefined) this.G.treeUp = 2;
    if (!this.G.greatWars) this.G.greatWars = [];
    if (!this.G.greatWarHistory) this.G.greatWarHistory = [];
    if (!this.G.cadetBranches) this.G.cadetBranches = {};
    if (!this.G.renaissance) this.G.renaissance = { unlocked: false, points: 0 };
    if (this.G.blackDeath === undefined) this.G.blackDeath = null;
    if (this.G.peasantRevolt === undefined) this.G.peasantRevolt = null;
    if (this.G.protestantStarted === undefined) this.G.protestantStarted = false;
    if (this.G.thirtyYearsWar === undefined) this.G.thirtyYearsWar = null;
    if (!this.G.hw) this.G.hw = {};
    if (!this.G.hwLog) this.G.hwLog = [];
    if (!this.G.relRank) this.G.relRank = {};
    if (!this.G.church) {
      this.G.church = {
        pope: this.C['paus']?.hidup ? 'paus' : null,
        cardinals: [],
        bishops: [],
        archbishops: {},
        saints: [],
        doctrine: 'ortodoks',
        excom: {},
        interdict: {},
        antiPope: null,
      };
    }
    if (!this.G.church.archbishops) this.G.church.archbishops = {};
    if (!this.G.laws) this.G.laws = {};
    // Enforce max 1 living Archbishop per realm in existing saves
    const seenArchRealms: Record<string, string> = {};
    Object.entries(this.G.relRank).forEach(([cid, r]) => {
      const ch = this.C[cid];
      if (!ch || !ch.hidup) return;
      if (r === 'uskup_agung') {
        const rid = this.realmOf(ch).id;
        const existing = seenArchRealms[rid] || this.G.church.archbishops![rid];
        if (!existing || !this.C[existing]?.hidup || existing === cid) {
          seenArchRealms[rid] = cid;
          this.G.church.archbishops![rid] = cid;
        } else {
          this.G.relRank[cid] = 'uskup';
          if (!this.G.church.bishops.includes(cid)) this.G.church.bishops.push(cid);
        }
      }
    });
    if (this.G.church.lastConclave === undefined) this.G.church.lastConclave = null;
    this.seedChurchHierarchy();
    this.cleanupDeadTitleHolders();
    if (!this.G.notifs) this.G.notifs = [];
    if (!this.G.timeline) this.G.timeline = [];
    if (!this.G.trade) this.G.trade = [];
    if (!this.G.loans) this.G.loans = [];
    if (!this.G.books) this.G.books = [];
    if (!this.G.crimes) this.G.crimes = {};
    if (!this.G.popeHistory) this.G.popeHistory = [];
    if (!this.G.expeditions) this.G.expeditions = [];
    if (!this.G.siegeDetail) this.G.siegeDetail = {};
    if (!this.G.histDone) this.G.histDone = {};
    if (!this.G.background) this.G.background = 'noble';
    if (!this.G.council) this.G.council = [];
    if (this.G.councilVote === undefined) this.G.councilVote = null;
    if (!this.G.achievements) this.G.achievements = [];
    if (this.G.anglican === undefined) this.G.anglican = false;
    if (this.G.tudorSpawned === undefined) this.G.tudorSpawned = false;
    if (this.G.anneSpawned === undefined) this.G.anneSpawned = false;
    if (this.G.lutherSpawned === undefined) this.G.lutherSpawned = false;
    if (!this.G.coups) this.G.coups = [];
    if (!this.G.prices) this.G.prices = { grain: 2, iron: 5, cloth: 4, spice: 10 };
    if (!this.G.orders) this.G.orders = {};
    if (this.G.morale === undefined) this.G.morale = 80;
    if (this.G.travel === undefined) this.G.travel = null;
    if (!this.G.childTutor) this.G.childTutor = {};
    if (!this.G.office) this.G.office = {};
    if (!this.G.officerHistory) this.G.officerHistory = [];
    if (!this.G.logistics) this.G.logistics = { supply: 100, morale: 85, forage: 0 };
    if (this.G.warCampaign === undefined) this.G.warCampaign = null;
    if (!this.G.familyView) this.G.familyView = { depth: 3, showSpouses: true, showDead: false, centered: this.G.pid || '' };
    if (!this.G.familyFocus) this.G.familyFocus = this.G.pid || '';
    if (!this.G.worship) this.G.worship = {};
    if (!this.G.faithLeadership) {
      this.G.faithLeadership = {
        patriarch: null,
        syekhulIslam: null,
        synodModerator: null,
        anglicanPrimate: null,
        activeFatwa: null,
        orthodoxCanon: 'Kanon Konsili Ekumenis',
        protestantConfession: 'Pengakuan Iman Augsburg',
        anglicanAct: Boolean(this.G.anglican),
      };
    }
    this.seedFaithLeaders();
    if (!this.G.friends) this.G.friends = [];
    if (!this.G.rivals) this.G.rivals = [];
    if (this.G.homeLevel === undefined) this.G.homeLevel = 0;
    if (!this.G.dynRel) this.G.dynRel = {};
    if (!this.G.vassalObligations) this.G.vassalObligations = {};
    if (this.G.legitimacy === undefined) this.G.legitimacy = 85;
    if (!this.G.honorifics) this.G.honorifics = {};
    if (!this.G.secretTreaties) this.G.secretTreaties = [];
    if (!this.G.luxuryGoods) this.G.luxuryGoods = [];
    if (!this.G.tech) this.G.tech = { military: 0, economy: 0, activeProject: null };
    if (!this.G.courtBudget) this.G.courtBudget = { admin: 1, military: 1, court: 1 };
    if (this.G.successionCrisis === undefined) this.G.successionCrisis = null;
    if (!this.G.pregnancies) this.G.pregnancies = [];
    if (!this.G.intimacyCooldown) this.G.intimacyCooldown = {};
    if (!this.G.pendingNaming) this.G.pendingNaming = [];
    if (!this.G.pendingBirthInfo) this.G.pendingBirthInfo = {};
    if (!this.G.rulerRelations) this.G.rulerRelations = {};
    if (this.G.pendingCoronation === undefined) this.G.pendingCoronation = null;
    Object.values(this.C).forEach((ch) => {
      if (!ch.marriageHistory) ch.marriageHistory = [];
      if (!ch.health) ch.health = { illness: null, severity: 0, since: 0 };
    });
    Object.values(this.C).forEach((ch) => {
      this.materializeMarriageHistoryFor(ch);
    });
    Object.values(this.T).forEach((t) => {
      if (t.kas === undefined) t.kas = this.initTitleKas(t.tier, Boolean(t.marquis));
    });
    this.purgeDeadReferences();
    if (this.G.tahun >= 1400) {
      this.ensureRenaissanceBuildings();
    }
    this.seedDynHist();
  }

  private materializeMarriageHistoryFor(c: Character): void {
    if (!c) return;
    c.marriageHistory = c.marriageHistory || [];
    // 1. Ensure active marriage has a record
    if (c.pasangan && c.sn === 'menikah' && this.C[c.pasangan]) {
      const sp = this.C[c.pasangan];
      if (!c.marriageHistory.some((m) => m.spouseId === sp.id && !m.endedYear)) {
        c.marriageHistory.push({
          spouseId: sp.id,
          spouseName: this.full(sp),
          dynastyName: sp.dinasti ? this.DY[sp.dinasti]?.nama : undefined,
          year: c.marriageStartYear || Math.max(c.lahir + 16, this.G.tahun - 2),
        });
      }
    }
    // 2. Recover missing ended marriages (e.g. divorced before marriageHistory was pushed) from children's other biological parent
    if (c.anak && c.anak.length > 0) {
      c.anak.forEach((kidId) => {
        const kid = this.C[kidId];
        if (!kid) return;
        const otherId = c.gender === 'L' ? kid.ibu : c.gender === 'P' ? kid.ayah : null;
        if (!otherId || otherId === c.pasangan) return;
        const other = this.C[otherId];
        if (!other) return;
        if (!c.marriageHistory!.some((m) => m.spouseId === other.id)) {
          const isDiv = other.hidup;
          const reason = isDiv ? 'Bercerai' : 'Pasangan wafat';
          const estStart = Math.max(c.lahir + 16, Math.min(kid.lahir - 1, this.G.tahun - 2));
          const estEnd = isDiv
            ? Math.max(kid.lahir, Math.min(this.G.tahun, this.G.tahun - 1))
            : other.wafat || Math.max(kid.lahir, this.G.tahun - 1);
          c.marriageHistory!.push({
            spouseId: other.id,
            spouseName: this.full(other),
            dynastyName: other.dinasti ? this.DY[other.dinasti]?.nama : undefined,
            year: estStart,
            endedYear: estEnd,
            reason,
          });
          other.marriageHistory = other.marriageHistory || [];
          if (!other.marriageHistory.some((m) => m.spouseId === c.id)) {
            other.marriageHistory.push({
              spouseId: c.id,
              spouseName: this.full(c),
              dynastyName: c.dinasti ? this.DY[c.dinasti]?.nama : undefined,
              year: estStart,
              endedYear: estEnd,
              reason,
            });
          }
        }
      });
    }
    if (c.marriageHistory.length === 0) return;
    const spouseG: 'L' | 'P' = c.gender === 'P' ? 'L' : 'P';
    const endedPairs: { rec: AnyRule; char: Character }[] = [];

    c.marriageHistory.forEach((rec) => {
      if (!rec.spouseId) return;
      const reasonLow = (rec.reason || '').toLowerCase();
      const isDivorce = reasonLow.includes('cerai');
      let ex = this.C[rec.spouseId];
      if (!ex) {
        const endY = rec.endedYear || Math.max(rec.year + 1, this.G.tahun - 1);
        const startY = rec.year || endY - R(3, 8);
        const ageAtMarriage = R(18, 28);
        const lahir = Math.min(startY - ageAtMarriage, c.lahir + R(-6, 4));
        ex = this.mkC({
          id: rec.spouseId,
          nama: rec.spouseName || this.pickCultureName(spouseG, c.budaya),
          gender: spouseG,
          lahir,
          wafat: isDivorce ? undefined : endY,
          hidup: isDivorce,
          budaya: c.budaya,
          agama: c.agama,
          kelas: c.kelas,
          sn: isDivorce ? 'bercerai' : 'menikah',
          dinasti: null,
          loc: c.loc,
        });
        // Ensure exact id from record
        if (ex.id !== rec.spouseId) {
          delete this.C[ex.id];
          ex.id = rec.spouseId;
          this.C[ex.id] = ex;
        }
        ex.marriageHistory = [
          {
            spouseId: c.id,
            spouseName: this.full(c),
            dynastyName: c.dinasti ? this.DY[c.dinasti]?.nama : undefined,
            year: startY,
            endedYear: rec.endedYear,
            reason: rec.reason || (isDivorce ? 'Bercerai' : 'Wafat'),
            morganatic: rec.morganatic,
          },
        ];
      }
      if (rec.endedYear || rec.spouseId !== c.pasangan) {
        endedPairs.push({ rec, char: ex });
      }
    });

    // Ensure children missing their other biological parent get linked to matching ended marriage spouse
    if (endedPairs.length > 0 && c.anak && c.anak.length > 0) {
      c.anak.forEach((kidId) => {
        const kid = this.C[kidId];
        if (!kid) return;
        const missingFather = c.gender === 'P' && !kid.ayah;
        const missingMother = c.gender === 'L' && !kid.ibu;
        if (!missingFather && !missingMother) return;
        const match =
          endedPairs.find(
            ({ rec }) =>
              kid.lahir >= (rec.year || 0) - 1 &&
              kid.lahir <= (rec.endedYear || this.G.tahun) + 1
          ) || endedPairs[0];
        if (!match) return;
        if (missingFather) kid.ayah = match.char.id;
        if (missingMother) kid.ibu = match.char.id;
        if (!match.char.anak.includes(kid.id)) match.char.anak.push(kid.id);
      });
    }
  }

  private seedPriorMarriagesAndKids(
    c: Character,
    opts: {
      count: number;
      withChildren: boolean;
      kelas: Character['kelas'];
      cul: string;
      agama: string;
      dinasti: string | null;
      loc?: string;
      includeDivorceFirst?: boolean;
    }
  ): void {
    const count = Math.max(1, Math.min(3, opts.count));
    const oppG: 'L' | 'P' = c.gender === 'P' ? 'L' : 'P';
    const myAge = this.umur(c);
    const earliestMarriage = c.lahir + Math.max(16, Math.min(20, myAge - count * 4));
    const spanEnd = this.G.tahun - 1;
    const totalSpan = Math.max(count * 3, spanEnd - earliestMarriage);
    const step = Math.max(3, Math.floor(totalSpan / count));

    c.marriageHistory = c.marriageHistory || [];

    for (let idx = 0; idx < count; idx++) {
      const mStart = Math.min(spanEnd - 2, earliestMarriage + idx * step);
      const isLast = idx === count - 1;
      const mEnd = isLast ? spanEnd - R(0, 1) : Math.min(spanEnd - 2, mStart + Math.max(2, step - 1));
      const isDivorce = Boolean(opts.includeDivorceFirst && idx === 0 && (count > 1 || c.sn === 'bercerai'));
      const reason = isDivorce ? 'Bercerai' : 'Pasangan wafat';

      const ex = this.mkC({
        gender: oppG,
        lahir: mStart - R(19, 28),
        wafat: isDivorce ? undefined : mEnd,
        hidup: isDivorce,
        budaya: opts.cul,
        agama: opts.agama,
        dinasti: null,
        kelas: opts.kelas,
        sn: isDivorce ? 'bercerai' : 'menikah',
        loc: opts.loc,
      });

      const rec: MarriageRecord = {
        spouseId: ex.id,
        spouseName: this.full(ex),
        year: mStart,
        endedYear: mEnd,
        reason,
      };
      c.marriageHistory.push(rec);
      ex.marriageHistory = [
        {
          spouseId: c.id,
          spouseName: this.full(c),
          dynastyName: c.dinasti ? this.DY[c.dinasti]?.nama : undefined,
          year: mStart,
          endedYear: mEnd,
          reason: isDivorce ? 'Bercerai' : 'Wafat',
        },
      ];

      if (opts.withChildren) {
        const kidsHere = count === 1 ? R(1, 2) : 1;
        for (let k = 0; k < kidsHere; k++) {
          const cg: 'L' | 'P' = (idx + k) % 2 === 0 ? 'L' : 'P';
          const birthY = Math.min(mEnd, Math.max(mStart + 1, mStart + R(1, Math.max(1, mEnd - mStart))));
          const child = this.mkC({
            gender: cg,
            lahir: Math.min(this.G.tahun - 1, birthY),
            budaya: opts.cul,
            agama: opts.agama,
            dinasti: opts.dinasti,
            kelas: opts.kelas,
            ayah: c.gender === 'L' ? c.id : ex.id,
            ibu: c.gender === 'P' ? c.id : ex.id,
            loc: opts.loc,
          });
          c.anak.push(child.id);
          ex.anak.push(child.id);
        }
      }
    }
  }

  private seedDynHist(): void {
    if (this.G._v8seed) return;
    (this.D.dinasti || []).forEach((d: AnyRule) => {
      if (!this.G.dynHist[d.id]) this.G.dynHist[d.id] = [];
      if (this.G.dynHist[d.id].length) return;
      const age = Math.min(200, Math.floor(d.prestise / 5));
      const word =
        d.prestise >= 800
          ? 'kuno dan agung'
          : d.prestise >= 300
            ? 'tua dan terhormat'
            : d.prestise >= 100
              ? 'berakar dalam'
              : 'muda';
      this.G.dynHist[d.id].push({
        y: this.D.meta.tahun_mulai - age,
        text: `Dinasti ${d.nama} (${word}) tercatat sejak abad lampau`,
      });
      if (d.prestise >= 300) {
        const nm = pick(this.TG('nama_leluhur', ['Heinrich']));
        const jl = pick(this.TG('julukan_leluhur', ['yang Berani']));
        this.G.dynHist[d.id].push({
          y: this.D.meta.tahun_mulai - age + 30,
          text: `Leluhur ${nm} ${jl} memperluas wilayah dinasti`,
        });
      }
      if (d.prestise >= 600) {
        this.G.dynHist[d.id].push({
          y: this.D.meta.tahun_mulai - age + 80,
          text: `Dinasti mencapai puncak kejayaan di bawah ${pick(['Konrad', 'Otto', 'Friedrich'])} yang Agung`,
        });
      }
    });
    this.G._v8seed = true;
  }

  private npc(t: Title): void {
    const raw = t.nama.replace(/^\S+\s/, '');
    const st =
      t.tier >= 7
        ? 'dinasti_kekaisaran'
        : t.tier >= 6
          ? 'dinasti_kerajaan'
          : t.tier >= 4
            ? 'bangsawan_tinggi'
            : 'bangsawan_lokal';
    const dy: Dynasty = {
      id: 'y' + ++this.G.n,
      nama: this.formatDynastyName(t.budaya, raw),
      prestise: t.tier * 30,
      status: st,
      kepala: null,
    };
    this.DY[dy.id] = dy;
    const c = this.mkC({
      lahir: this.G.tahun - R(24, 58),
      budaya: t.budaya,
      agama: t.agama || 'katolik',
      dinasti: dy.id,
      kelas: 'penguasa',
    });
    c.res.emas = t.tier * 30 + R(0, 40);
    dy.kepala = c.id;
    t.pem = c.id;
  }

  private pool(n: number): void {
    const NT = (this.D.teks_game && this.D.teks_game.nama_tempat) || {};
    const A = (NT.awal || ['Hohen']) as string[];
    const B = (NT.akhir || ['burg']) as string[];
    const counties = Object.values(this.T).filter((x) => x.tier === 3);
    if (!counties.length) return;
    for (let i = 0; i < n; i++) {
      const t = pick(counties);
      const isViscount = i % 3 === 0;
      const tier = isViscount ? 2 : 1;
      const dyName = this.pickCultureDynastyName(t.budaya);
      const dy: Dynasty = {
        id: 'y' + ++this.G.n,
        nama: dyName,
        budaya: t.budaya,
        prestise: isViscount ? 18 : 5,
        status: 'bangsawan_lokal',
        kepala: null,
      };
      this.DY[dy.id] = dy;
      const gender: 'L' | 'P' = i % 4 === 0 ? 'P' : 'L';
      const age = i % 7 === 0 ? R(56, 72) : i % 6 === 0 ? R(12, 17) : R(18, 52);
      const sn = age >= 24 && i % 5 === 0 ? (gender === 'P' ? 'janda' : 'duda') : 'lajang';
      const c = this.mkC({
        gender,
        lahir: this.G.tahun - age,
        budaya: t.budaya,
        agama: t.agama || 'katolik',
        dinasti: dy.id,
        kelas: 'bangsawan',
        sn,
        loc: t.id,
      });
      if ((sn === 'janda' || sn === 'duda') && i % 2 === 0) {
        this.seedPriorMarriagesAndKids(c, {
          count: i % 10 === 0 && age >= 28 ? 2 : 1,
          withChildren: true,
          kelas: 'bangsawan',
          cul: t.budaya,
          agama: t.agama || 'katolik',
          dinasti: dy.id,
          loc: t.id,
          includeDivorceFirst: i % 10 === 0,
        });
      }
      dy.kepala = c.id;
      const bt: Title = {
        id: (isViscount ? 'v_' : 'b_') + c.id,
        nama: `${isViscount ? 'Viscount' : 'Baron'} ${pick(A)}${pick(B)}`,
        tier,
        pem: c.id,
        atas: t.id,
        kids: [],
        budaya: t.budaya,
        agama: t.agama,
        prov: null,
        kas: this.initTitleKas(tier, false),
      };
      this.T[bt.id] = bt;
      t.kids.push(bt.id);
    }

    // Additional unlanded fictional characters of any age, class, and marital status (widows, youths, elders, commoners)
    for (let i = 0; i < 18; i++) {
      const t = pick(counties);
      const gender: 'L' | 'P' = i % 2 === 0 ? 'P' : 'L';
      const age = i % 4 === 0 ? R(55, 74) : i % 4 === 1 ? R(10, 17) : R(18, 46);
      const isWidow = age >= 22 && i % 3 === 0;
      const sn = isWidow ? (gender === 'P' ? 'janda' : 'duda') : 'lajang';
      const cls: Character['kelas'] =
        i % 3 === 0 ? 'rakyat_jelata' : i % 3 === 1 ? 'warga_kota' : 'bangsawan';
      const prof =
        age < 16
          ? null
          : cls === 'rakyat_jelata'
            ? pick(['petani', 'pedagang', 'pengrajin', 'tentara_bayaran'])
            : cls === 'warga_kota'
              ? pick(['pedagang', 'pengusaha', 'cendekiawan'])
              : pick(['pelayan_istana', 'tentara', 'cendekiawan']);
      this.mkC({
        gender,
        lahir: this.G.tahun - age,
        budaya: t.budaya,
        agama: t.agama || 'katolik',
        kelas: cls,
        profesi: prof,
        sn,
        loc: t.id,
      });
    }
  }

  public fill(): void {
    Object.values(this.T).forEach((t) => {
      if (!t.pem) this.npc(t);
    });
    this.pool(30);
    this.fillFamilies14();
  }

  private fillFamilies14(): void {
    const GN = this.D?.generator || {};
    const K = GN.keluarga || {};
    const minM = K.min_anggota_dinasti || 4;
    const cnt: Record<string, number> = {};
    Object.values(this.C).forEach((c) => {
      if (c.dinasti) cnt[c.dinasti] = (cnt[c.dinasti] || 0) + 1;
    });
    const mk = (d: Dynasty, h: Character, o: Partial<Character>) => {
      const effKelas: Character['kelas'] =
        h.kelas === 'rakyat_jelata' || h.kelas === 'warga_kota' ? h.kelas : 'bangsawan';
      const c = this.mkC(
        Object.assign({ dinasti: d.id, budaya: h.budaya, agama: h.agama, kelas: effKelas }, o)
      );
      if (!o.nama) {
        c.nama = this.pickCultureName(o.gender || 'L', h.budaya);
      }
      return c;
    };

    Object.values(this.DY).forEach((d) => {
      if (d.fam14 || (cnt[d.id] || 0) >= minM) return;
      const h = d.kepala ? this.C[d.kepala] : undefined;
      if (!h || !h.hidup) return;
      d.fam14 = 1;
      const ha = this.umur(h);
      if (!h.ayah && !h.ibu) {
        const fa = mk(d, h, { gender: 'L', lahir: h.lahir - R(20, 34) });
        const mo = mk(d, h, { gender: 'P', lahir: h.lahir - R(18, 30) });
        [fa, mo].forEach((x) => {
          const a = this.G.tahun - x.lahir;
          if (a > 68 || Math.random() < 0.5) {
            x.hidup = false;
            x.wafat = Math.min(this.G.tahun - 1, Math.max(h.lahir + R(0, 25), x.lahir + R(40, 70)));
          }
        });
        fa.pasangan = mo.id;
        mo.pasangan = fa.id;
        fa.sn = mo.sn = 'menikah';
        const pStartY = Math.min(this.G.tahun - 1, h.lahir - 1);
        fa.marriageStartYear = mo.marriageStartYear = pStartY;
        fa.marriageHistory = fa.marriageHistory || [];
        mo.marriageHistory = mo.marriageHistory || [];
        fa.marriageHistory.push({ spouseId: mo.id, spouseName: this.full(mo), dynastyName: d.nama, year: pStartY });
        mo.marriageHistory.push({ spouseId: fa.id, spouseName: this.full(fa), dynastyName: d.nama, year: pStartY });
        fa.anak.push(h.id);
        mo.anak.push(h.id);
        h.ayah = fa.id;
        h.ibu = mo.id;
        const ns = R(0, K.saudara_maks ?? 2);
        for (let i = 0; i < ns; i++) {
          const g: 'L' | 'P' = Math.random() < 0.5 ? 'L' : 'P';
          const s = mk(d, h, { gender: g, lahir: h.lahir + R(-6, 6), ayah: fa.id, ibu: mo.id });
          fa.anak.push(s.id);
          mo.anak.push(s.id);
          if (s.lahir >= this.G.tahun) s.lahir = this.G.tahun - 1;
        }
      }
      const profObj = h.profesi ? this.D.profesi.find((x: AnyRule) => x.id === h.profesi) : null;
      const forbidMarry =
        h.sn === 'selibat' ||
        (h.profesi === 'pendeta' && h.agama === 'katolik') ||
        Boolean(profObj && this.noMarry(profObj, h));
      if (!forbidMarry && ha >= (K.umur_nikah_min || 18) && !h.pasangan && Math.random() < (K.peluang_menikah ?? 0.8)) {
        const spProf =
          h.kelas === 'rakyat_jelata'
            ? pick(['petani', 'pedagang', 'pengrajin'])
            : h.kelas === 'warga_kota'
              ? pick(['pedagang', 'pengrajin'])
              : undefined;
        const sp = mk(d, h, {
          gender: h.gender === 'L' ? 'P' : 'L',
          lahir: h.lahir + R(-4, 8),
          kelas: h.kelas === 'rakyat_jelata' ? 'rakyat_jelata' : h.kelas === 'warga_kota' ? 'warga_kota' : 'bangsawan',
          profesi: spProf,
        });
        if (this.umur(sp) < 16) sp.lahir = this.G.tahun - 16;
        h.pasangan = sp.id;
        sp.pasangan = h.id;
        h.sn = sp.sn = 'menikah';
        const mStartY = Math.max(h.lahir + 16, sp.lahir + 16, this.G.tahun - R(1, 5));
        const clampedStartY = Math.min(this.G.tahun, mStartY);
        h.marriageStartYear = sp.marriageStartYear = clampedStartY;
        h.marriageHistory = h.marriageHistory || [];
        sp.marriageHistory = sp.marriageHistory || [];
        h.marriageHistory.push({ spouseId: sp.id, spouseName: this.full(sp), dynastyName: d.nama, year: clampedStartY });
        sp.marriageHistory.push({ spouseId: h.id, spouseName: this.full(h), dynastyName: d.nama, year: clampedStartY });
        const n = ha >= 20 ? R(K.anak_min ?? 1, K.anak_maks ?? 4) : 0;
        for (let i = 0; i < n; i++) {
          const bl = Math.min(this.G.tahun - i, h.lahir + R(18, 32) + i * R(1, 3));
          if (bl > this.G.tahun) continue;
          const g: 'L' | 'P' = Math.random() < 0.5 ? 'L' : 'P';
          const f = h.gender === 'L' ? h : sp;
          const m = h.gender === 'L' ? sp : h;
          const k = mk(d, h, { gender: g, lahir: bl, ayah: f.id, ibu: m.id });
          h.anak.push(k.id);
          sp.anak.push(k.id);
        }
      }
    });
  }

  public prepareTokohChoices(): Character[] {
    if (!this.G.fam14 && Object.keys(this.C).length < 55) {
      this.fill();
      this.seedFaithLeaders();
    }
    return Object.values(this.C)
      .filter((c) => c.hidup && c.id !== 'paus')
      .sort((a, b) => this.tierOf(b) - this.tierOf(a) || b.res.prestise - a.res.prestise);
  }

  public startNewGame(input: StartFormInput): void {
    const pr = input.pr;
    const keepPreview =
      pr === 'tokoh' &&
      Boolean(this.C[input.tk]) &&
      this.G.tahun === this.D.meta.tahun_mulai &&
      !this.G.fam14;
    if (!keepPreview) {
      this.newWorld();
    }
    if (pr === 'king' || pr === 'emperor' || pr === 'tokoh') {
      this.G.pid = input.tk;
    } else {
      const po = (this.D.pengaturan_mulai?.peran_awal || []).find((x: AnyRule) => x.id === pr) || {};
      const id = 'pl';
      const did = 'dy_pl';
      this.DY[did] = {
        id: did,
        nama: input.dn || 'Baru',
        prestise: po.prestise_awal || 0,
        status: po.tier ? 'bangsawan_lokal' : 'rakyat_biasa',
        kepala: id,
        warna: '#9A6614',
      };
      const effProf =
        pr === 'pengusaha'
          ? 'pengusaha'
          : pr === 'rakyat_jelata'
            ? this.checkProfessionRestriction(input.pf, { kelas: 'rakyat_jelata', agama: input.ag } as Character, input.lc).ok
              ? input.pf
              : 'pedagang'
            : null;
      const c = this.mkC({
        id,
        nama: input.nm || 'Pemain',
        gender: input.gn,
        lahir: this.G.tahun - R(18, 30),
        budaya: input.bd,
        agama: input.ag,
        dinasti: did,
        kelas: pr === 'rakyat_jelata' ? 'rakyat_jelata' : pr === 'pengusaha' ? 'warga_kota' : 'bangsawan',
        profesi: effProf,
        sn: pr === 'rakyat_jelata' && effProf === 'pendeta' && input.ag === 'katolik' ? 'selibat' : 'lajang',
        loc: input.lc,
        sifat: [...new Set([input.s1, input.s2])].filter(Boolean),
      });
      const isNobleRole = Boolean(po.tier);
      c.res = {
        prestise: po.prestise_awal || 0,
        emas: isNobleRole ? Math.round((po.emas_awal || 40) * 0.45) : (po.emas_awal || 10),
        kesalehan: 30,
      };
      this.G.pid = id;
      if (po.tier === 1 || po.tier === 2) {
        this.makeBaron(c, input.lc, po.tier);
      } else if (pr === 'duke' && input.lc.startsWith('__new_duke__')) {
        const countyId = input.lc.replace('__new_duke__', '');
        const county = this.T[countyId];
        if (county) {
          const newId = `d_pl_${countyId}`;
          const oldParent = county.atas ? this.T[county.atas] : null;
          if (oldParent) oldParent.kids = oldParent.kids.filter((k) => k !== countyId);
          this.T[newId] = {
            id: newId,
            nama: `Kadipaten ${county.nama.replace(/^Wilayah\s+/, '')}`,
            tier: 5,
            pem: id,
            atas: county.atas,
            budaya: county.budaya,
            agama: county.agama,
            prov: null,
            kids: [countyId],
            kas: Math.max(this.initTitleKas(5, false), po.emas_awal || 200),
          };
          if (oldParent) oldParent.kids.push(newId);
          county.atas = newId;
          county.pem = id;
          c.loc = countyId;
          this.G.primary = newId;
        }
      } else if (pr === 'marquis' && input.lc.startsWith('__new_marquis__')) {
        const countyId = input.lc.replace('__new_marquis__', '');
        const county = this.T[countyId];
        if (county) {
          const newId = `m_pl_${countyId}`;
          const oldParent = county.atas ? this.T[county.atas] : null;
          if (oldParent) oldParent.kids = oldParent.kids.filter((k) => k !== countyId);
          this.T[newId] = {
            id: newId,
            nama: `Mark ${county.nama.replace(/^Wilayah\s+/, '')}`,
            tier: 4,
            marquis: true,
            pem: id,
            atas: county.atas,
            budaya: county.budaya,
            agama: county.agama,
            prov: null,
            kids: [countyId],
            kas: Math.max(this.initTitleKas(4, true), po.emas_awal || 180),
          };
          if (oldParent) oldParent.kids.push(newId);
          county.atas = newId;
          county.pem = id;
          c.loc = countyId;
          this.G.primary = newId;
        }
      } else if (po.tier && this.T[input.lc]) {
        const selTitle = this.T[input.lc];
        selTitle.pem = id;
        selTitle.kas = Math.max(selTitle.kas || 0, po.emas_awal || 100);
        if (pr === 'marquis') selTitle.marquis = true;
        if (selTitle.tier >= 4) {
          this.G.primary = selTitle.id;
          const capCountyId = selTitle.kids.find((kid) => this.T[kid]?.tier === 3);
          const capCounty = capCountyId ? this.T[capCountyId] : null;
          if (capCounty) {
            c.loc = capCounty.id;
            if (!capCounty.pem) capCounty.pem = id;
          }
        }
      }
    }
    if (!keepPreview) {
      this.fill();
    }
    if ((pr === 'tokoh') && !this.C[this.G.pid]) {
      const fallback = Object.values(this.C).find((x) => x.hidup);
      if (fallback) this.G.pid = fallback.id;
    }
    this.seedFaithLeaders();
    if (input.bg && pr !== 'king' && pr !== 'emperor' && pr !== 'tokoh') {
      this.applyBackground(input.bg);
    } else if (input.bg) {
      this.G.background = input.bg;
    }
    this.G.homeLevel = this.getEffectiveHomeLevel(this.me());
    const p = this.me();
    this.G.familyFocus = p.id;
    this.G.familyView.centered = p.id;
    const t = this.tierOf(p);
    const tot = p.pas || (t ? Math.round(this.tn(t).pasukan_maks * 0.25) : 0);
    this.G.tr = {
      pedang: Math.round(tot * 0.55),
      pemanah: Math.round(tot * 0.3),
      kavaleri: Math.round(tot * 0.15),
    };
    this.G.log.unshift(`Permainan dimulai tahun ${this.G.tahun}.`);
    this.notifyLog(`Memulai perjalanan sebagai ${this.full(p)} di tahun ${this.G.tahun}`, '🏰');
    if (input.lawSuccession || input.lawGender) {
      if (!this.G.laws) this.G.laws = {};
      if (input.lawSuccession) {
        this.G.laws['suksesi_kerajaan'] = input.lawSuccession;
        this.G.laws['suksesi_kekaisaran'] =
          input.lawSuccession === 'pemilihan' ? 'pemilihan_elektor' : 'turun_temurun';
      }
      if (input.lawGender) {
        this.G.laws['suksesi_gender'] = input.lawGender;
      }
    }
    this.G.fam14 = 1;
    this.save();
    sfx.playChime();
    this.stack = [{ view: 'main' }];
    this.notify();
  }

  public startRandomWorld(): void {
    this.newWorld();
    const GN = this.D.generator;
    if (!GN) {
      this.showToast('Data generator belum tersedia.');
      return;
    }
    let s = Date.now();
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const rInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
    const rPick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];

    this.DY = {};
    this.C = {};
    this.G.n = 0;
    this.G.claims = {};
    this.G.rulers = {};
    this.G.titleHistoricalOffsets = {};
    const NUM_DYN = GN.jumlah_dinasti || 100;
    const NUM_CHR = GN.jumlah_karakter || 1000;
    const titles = Object.values(this.T).filter((t) => t.tier >= 3);
    const dynList: Dynasty[] = [];

    for (let i = 0; i < NUM_DYN; i++) {
      const c = rPick<string>(GN.budaya);
      const prefs = (GN.prefix_dinasti && GN.prefix_dinasti[c]) || ['de'];
      const roots = (GN.akar_dinasti && GN.akar_dinasti[c]) || ['Hohenstein'];
      const pref = rPick<string>(prefs);
      const root = rPick<string>(roots);
      const nm = !pref
        ? root
        : pref === 'Al-' || pref === "O'" || pref === 'Fitz' || pref === 'Ker'
          ? `${pref}${root}`
          : `${pref} ${root}`;
      const pr = rInt(0, 800);
      let st2 = 'bangsawan_lokal';
      if (pr >= 800) st2 = 'dinasti_kekaisaran';
      else if (pr >= 300) st2 = 'dinasti_kerajaan';
      else if (pr >= 100) st2 = 'bangsawan_tinggi';
      const id = 'dy' + i;
      const dy: Dynasty = {
        id,
        nama: nm,
        budaya: c,
        prestise: pr,
        status: st2,
        moto: '',
        warna: rPick<string>(GN.warna),
        kepala: null,
        gen: true,
      };
      this.DY[id] = dy;
      dynList.push(dy);
    }

    dynList.sort((a, b) => b.prestise - a.prestise);
    const sT = titles.slice().sort((a, b) => b.tier - a.tier);
    let di = 0;
    sT.forEach((t) => {
      t._dy = dynList[di++ % dynList.length].id;
    });

    let n = 0;
    dynList.forEach((d) => {
      const g: 'L' | 'P' = rnd() < 0.8 ? 'L' : 'P';
      const c = this.mkC({
        lahir: this.G.tahun - rInt(30, 55),
        dinasti: d.id,
        gender: g,
        budaya: d.budaya || 'german',
        kelas: 'penguasa',
      });
      c.nama = this.pickCultureName(g, d.budaya || 'german');
      d.kepala = c.id;
      n++;
    });

    sT.forEach((t) => {
      const d = t._dy ? this.DY[t._dy] : undefined;
      if (!d || !d.kepala) return;
      t.pem = d.kepala;
      const h = this.C[d.kepala];
      h.titles = h.titles || [];
      h.titles.push(t.id);
      if (t.tier >= 4) h.kelas = 'penguasa';
      delete t._dy;
    });

    const roles = ['family', 'family', 'family', 'family', 'courtier', 'knight', 'knight', 'clergy'];
    let at = 0;
    while (n < NUM_CHR && at < NUM_CHR * 5) {
      at++;
      const d = rPick(dynList);
      const role = rPick(roles);
      const g: 'L' | 'P' = rnd() < 0.5 ? 'L' : 'P';
      const c = this.mkC({
        lahir: this.G.tahun - rInt(16, 65),
        dinasti: d.id,
        gender: g,
        budaya: d.budaya || 'german',
        kelas: role === 'knight' ? 'ksatria' : 'bangsawan',
      });
      c.nama = this.pickCultureName(g, d.budaya || 'german');
      if (role === 'family') {
        const head = d.kepala ? this.C[d.kepala] : undefined;
        if (head && rnd() < 0.6 && this.umur(head) >= this.umur(c) + 16) {
          c.ayah = head.id;
          head.anak.push(c.id);
        }
      }
      n++;
    }

    this.fill();
    const top = Object.values(this.C)
      .filter((c) => c.hidup && this.held(c.id).length)
      .sort((a, b) => this.tierOf(b) - this.tierOf(a));
    if (top.length) this.G.pid = top[0].id;
    const p = this.me();
    const t = this.tierOf(p);
    const tot = t ? Math.round(this.tn(t).pasukan_maks * 0.25) : 0;
    this.G.tr = {
      pedang: Math.round(tot * 0.55),
      pemanah: Math.round(tot * 0.3),
      kavaleri: Math.round(tot * 0.15),
    };
    this.G.log = [`Dunia acak terbentuk: ${NUM_DYN} dinasti, ${Object.keys(this.C).length} karakter.`];
    this.G.genWorld = true;
    this.G.fam14 = 1;
    this.save();
    sfx.playChime();
    this.stack = [{ view: 'main' }];
    this.notify();
  }

  // ============ SUCCESSION & KINSHIP ============
  public ancD(c: Character | undefined, d = 0, m = new Map<string, number>()): Map<string, number> {
    if (!c || (m.has(c.id) && (m.get(c.id) ?? 99) <= d)) return m;
    m.set(c.id, d);
    if (c.ibu) this.ancD(this.C[c.ibu], d + 1, m);
    if (c.ayah) this.ancD(this.C[c.ayah], d + 1, m);
    return m;
  }

  public dist(a: Character, b: Character): number {
    const A = this.ancD(a);
    const B = this.ancD(b);
    let r = 99;
    A.forEach((v, k) => {
      if (B.has(k)) r = Math.min(r, v + (B.get(k) ?? 99));
    });
    return r;
  }

  public blood = (a: Character, b: Character): boolean => this.dist(a, b) < 99;

  public isStep(parent: Character, child: Character): boolean {
    if (!parent || !child || this.blood(parent, child)) return false;
    const sp = parent.pasangan ? this.C[parent.pasangan] : null;
    if (sp && (sp.anak?.includes(child.id) || child.ibu === sp.id || child.ayah === sp.id)) return true;
    const widowedIds = (parent.marriageHistory || [])
      .filter((m) => m.endedYear && !(m.reason || '').toLowerCase().includes('cerai'))
      .map((m) => m.spouseId);
    for (const sid of widowedIds) {
      const wsp = this.C[sid];
      if (wsp && (wsp.anak?.includes(child.id) || child.ibu === wsp.id || child.ayah === wsp.id)) return true;
    }
    return false;
  }

  public getElectiveStandings(c: Character): { char: Character; votes: number; score: number }[] {
    const gen = this.LAW('suksesi_gender') || 'agnatik_kognatik';
    const voters: Character[] = [];
    this.held(c.id).forEach((t) =>
      t.kids.forEach((kid) => {
        const v = this.T[kid]?.pem ? this.C[this.T[kid].pem!] : null;
        if (v && v.hidup && v.id !== c.id && !voters.some((x) => x.id === v.id)) voters.push(v);
      })
    );
    Object.values(this.G.pen || {}).forEach((cid) => {
      const v = cid ? this.C[cid] : null;
      if (v && v.hidup && v.id !== c.id && !voters.some((x) => x.id === v.id)) voters.push(v);
    });

    let cands = Object.values(this.C).filter(
      (x) =>
        x.hidup &&
        x.id !== c.id &&
        ((c.dinasti && x.dinasti === c.dinasti) || this.blood(c, x) || voters.some((v) => v.id === x.id))
    );
    if (gen === 'agnatik') {
      const male = cands.filter((x) => x.gender === 'L');
      if (male.length) cands = male;
    }

    const res = cands.map((cand) => {
      let votes = 0;
      let score =
        cand.sk.diplomasi * 0.7 +
        cand.sk.perang * 0.4 +
        cand.res.prestise * 0.15 +
        (cand.dinasti === c.dinasti ? 20 : 0) +
        (c.anak.includes(cand.id) ? 15 : 0) +
        (this.umur(cand) >= 16 ? 15 : -20);
      if (voters.length > 0) {
        voters.forEach((v) => {
          const w = Math.max(1, this.getTitleRights(this.tierOf(v), Boolean(this.held(v.id)[0]?.marquis)).bobotSuara);
          const vScore = this.opn(v, cand) + (v.id === cand.id ? 35 : 0) + cand.sk.diplomasi * 0.3;
          if (vScore >= 0) {
            votes += w;
            score += w * 4;
          }
        });
      } else {
        votes = Math.max(1, Math.round(score / 25));
      }
      if (this.G.was?.heir === cand.id && c.id === this.G.pid) {
        score += 18;
        votes += 2;
      }
      return { char: cand, votes, score: Math.round(score) };
    });

    return res.sort((a, b) => b.votes - a.votes || b.score - a.score);
  }

  public getSuccessionOrder(c: Character, limit = 4): Character[] {
    if (!c) return [];
    const pl = c.id === this.G.pid;
    const ok = (x: Character | null | undefined): x is Character => Boolean(x && x.hidup && x.id !== c.id);
    const law = this.getEffectiveSuccessionLaw(c);
    const gen = this.LAW('suksesi_gender') || 'agnatik_kognatik';
    const order: Character[] = [];
    const pushUnique = (x: Character | undefined | null) => {
      if (ok(x) && !order.some((y) => y.id === x.id)) order.push(x);
    };

    if (pl && this.G.was?.heir && law !== 'pemilihan') {
      const chosen = this.C[this.G.was.heir];
      if (ok(chosen) && (this.blood(c, chosen) || (this.G.was.allowTiri && this.isStep(c, chosen)) || law === 'tunjukan')) {
        pushUnique(chosen);
      }
    }

    const Ac = this.ancD(c);
    const g = (x: Character) => (Ac.has(x.id) ? 2 : this.ancD(x).has(c.id) ? 0 : 1);
    const ageOrder = (a: Character, b: Character) => (law === 'ultimogenitur' ? b.lahir - a.lahir : a.lahir - b.lahir);
    const srt = (a: Character, b: Character) => {
      if (gen === 'kesetaraan') return ageOrder(a, b);
      const ga = a.gender === 'L' ? 0 : 1;
      const gb = b.gender === 'L' ? 0 : 1;
      return ga - gb || ageOrder(a, b);
    };

    let kids = c.anak.map((i) => this.C[i]).filter((x): x is Character => Boolean(x && x.hidup));
    if (gen === 'agnatik') {
      const maleKids = kids.filter((x) => x.gender === 'L');
      if (maleKids.length > 0) kids = maleKids;
    }

    if (law === 'pemilihan') {
      this.getElectiveStandings(c).forEach((s) => pushUnique(s.char));
    } else if (law === 'senioritas') {
      let dynMems = Object.values(this.C).filter((x) => ok(x) && ((c.dinasti && x.dinasti === c.dinasti) || this.blood(c, x)));
      if (gen === 'agnatik') {
        const male = dynMems.filter((x) => x.gender === 'L');
        if (male.length > 0) dynMems = male;
      }
      dynMems.sort((a, b) => a.lahir - b.lahir || srt(a, b)).forEach(pushUnique);
    } else if (law === 'tanistri') {
      const sibs = Object.values(this.C)
        .filter((x) => ok(x) && ((c.ibu && x.ibu === c.ibu) || (c.ayah && x.ayah === c.ayah)))
        .filter((x) => gen !== 'agnatik' || x.gender === 'L')
        .sort(srt);
      sibs.forEach(pushUnique);
      kids.slice().sort(srt).forEach(pushUnique);
    } else {
      kids.slice().sort(srt).forEach(pushUnique);
      let rels = Object.values(this.C).filter((x) => ok(x) && this.dist(c, x) <= 8);
      if (gen === 'agnatik') {
        const maleRels = rels.filter((x) => x.gender === 'L');
        if (maleRels.length > 0) rels = maleRels;
      }
      rels
        .sort((a, b) => g(a) - g(b) || this.dist(c, a) - this.dist(c, b) || srt(a, b))
        .forEach(pushUnique);
    }

    if (pl && this.G.was?.allowTiri) {
      const sp = c.pasangan ? this.C[c.pasangan] : null;
      if (sp) {
        sp.anak
          .map((i) => this.C[i])
          .filter((x): x is Character => Boolean(x && x.hidup && x.id !== c.id && !this.blood(c, x)))
          .sort(srt)
          .forEach(pushUnique);
      }
      Object.values(this.C)
        .filter((x) => x.hidup && x.id !== c.id && this.isStep(c, x))
        .sort(srt)
        .forEach(pushUnique);
    }
    return order.slice(0, limit);
  }

  public heir(c: Character, pl: boolean): Character | null {
    const ok = (x: Character | undefined): x is Character => Boolean(x && x.hidup && x.id !== c.id);
    const law = this.getEffectiveSuccessionLaw(c);
    if (pl && this.G.was?.heir && law !== 'pemilihan') {
      const chosen = this.C[this.G.was.heir];
      if (ok(chosen) && (this.blood(c, chosen) || (this.G.was.allowTiri && this.isStep(c, chosen)) || law === 'tunjukan')) {
        return chosen;
      }
    }
    return this.getSuccessionOrder(c, 1)[0] || null;
  }

  public assignLandHeir(tid: string, charId: string | null): void {
    const p = this.me();
    const t = this.T[tid];
    if (!t || t.pem !== p.id) return this.msg('Kamu tidak memegang gelar tanah ini.');
    if (!this.G.was) this.G.was = { perWilayah: {} };
    if (!this.G.was.perWilayah) this.G.was.perWilayah = {};
    if (!charId) {
      delete this.G.was.perWilayah[tid];
      this.save();
      this.notify();
      return;
    }
    const target = this.C[charId];
    if (!target || !target.hidup) return this.msg('Ahli waris tanah tidak valid atau telah wafat.');
    this.G.was.perWilayah[tid] = charId;
    this.G.log.unshift(`Tanah ${t.nama} ditetapkan untuk diwariskan kepada ${this.full(target)}.`);
    this.save();
    this.notify();
  }

  public successionLawLabel(id: string): { nama: string; desc: string } {
    const map: Record<string, { nama: string; desc: string }> = {
      primogenitur: { nama: 'Primogenitur (Anak Tertua)', desc: 'Anak tertua mewarisi seluruh wilayah & gelar utama secara utuh.' },
      ultimogenitur: { nama: 'Ultimogenitur (Anak Bungsu)', desc: 'Anak termuda menjadi pewaris utama seluruh wilayah & gelar.' },
      terbagi: { nama: 'Terbagi (Gavelkind)', desc: 'Wilayah county dibagi ke anak-anak kecuali jika diatur khusus di Pembagian Tanah.' },
      tanistri: { nama: 'Tanistri (Saudara Tertua)', desc: 'Saudara sekandung didahulukan sebelum anak.' },
      senioritas: { nama: 'Senioritas Dinasti', desc: 'Anggota tertua dalam seluruh wangsa mewarisi takhta demi mencegah pemecahan wilayah.' },
      pemilihan: { nama: 'Pemilihan Bangsawan (Elektif)', desc: 'Dewan Kerajaan & para vasal memilih pewaris berdasarkan opini, prestise, dan kekuatan.' },
      tunjukan: { nama: 'Tunjukan (Wasiat Mutlak)', desc: 'Pewaris utama mengikuti nama yang ditunjuk langsung di Wasiat.' },
      pemilihan_elektor: { nama: 'Pemilihan Pangeran Elektor (Kekaisaran)', desc: 'Para pangeran elektor & vasal utama memilih Kaisar baru.' },
      turun_temurun: { nama: 'Pewarisan Dinasti Turun-Temurun', desc: 'Mahkota Kekaisaran mengikuti hukum suksesi kerajaan pemain tanpa pemilu elektor.' },
      agnatik: { nama: 'Agnatik (Hanya Laki-laki)', desc: 'Hanya keturunan laki-laki yang diprioritaskan selama masih ada.' },
      agnatik_kognatik: { nama: 'Agnatik-Kognatik', desc: 'Laki-laki didahulukan; perempuan bisa mewarisi jika tak ada laki-laki.' },
      kesetaraan: { nama: 'Kesetaraan Gender', desc: 'Urutan usia berlaku sama bagi putra maupun putri.' },
    };
    return map[id] || { nama: id, desc: '' };
  }

  public triggerSuccessionCrisis(newRuler: Character, reason: string, claimant?: Character | null): void {
    const vassals = this.held(newRuler.id)
      .flatMap((t) => t.kids.map((k) => this.T[k]?.pem))
      .map((id) => (id ? this.C[id] : null))
      .filter((x): x is Character => Boolean(x && x.hidup && x.id !== newRuler.id));
    const candClaimant =
      claimant && claimant.hidup && claimant.id !== newRuler.id
        ? claimant
        : vassals.sort((a, b) => this.opn(a, newRuler) - this.opn(b, newRuler))[0] ||
          Object.values(this.C).find((x) => x.hidup && x.id !== newRuler.id && x.dinasti === newRuler.dinasti && this.umur(x) >= 16) ||
          null;
    if (!candClaimant) return;
    if (!this.G.coups.some((cp) => cp.rebelId === candClaimant.id)) {
      this.G.coups.push({ rebelId: candClaimant.id, y: this.G.tahun });
    }
    this.G.successionCrisis = {
      claimantId: candClaimant.id,
      reason,
      year: this.G.tahun,
    };
    this.G.legitimacy = Math.max(15, (this.G.legitimacy ?? 70) - 20);
    this.notifyLog(`KRISIS SUKSESI! ${this.full(candClaimant)} memimpin faksi pembangkang (${reason}).`, '🚨');
    this.G.log.unshift(`KRISIS SUKSESI! ${reason} — ${this.full(candClaimant)} menggalang perang saudara!`);
    if (!this.G.ev) {
      this.G.ev = {
        judul: 'Krisis Suksesi Takhta!',
        teks: `${reason}. ${this.full(candClaimant)} menolak legitimasi ${this.full(newRuler)} dan menggerakkan faksi pembangkang bersenjata!`,
        pilihan: [
          {
            teks: 'Kerahkan pasukan & tumpas pemberontak!',
            fn: () => {
              this.resolveKudeta('perang');
              this.G.successionCrisis = null;
              return `Pasukan kerajaan bergerak menghadapi pemberontakan ${this.full(candClaimant)}!`;
            },
          },
          {
            teks: 'Konsesi emas & piagam hak bangsawan (-50 Emas, +Otonomi)',
            fn: () => {
              if (newRuler.res.emas >= 50 || this.stateTreasury(newRuler) >= 50) {
                if (!this.spendStateFunds(50, newRuler)) newRuler.res.emas = Math.max(0, newRuler.res.emas - 50);
                this.G.coups = this.G.coups.filter((cp) => cp.rebelId !== candClaimant.id);
                this.G.successionCrisis = null;
                this.bump(candClaimant, 35);
                this.G.legitimacy = Math.max(25, (this.G.legitimacy ?? 60) - 10);
                return `Krisis suksesi diredam dengan konsesi 50 emas kepada faksi ${this.full(candClaimant)}.`;
              }
              return 'Emas tidak cukup untuk meredam faksi — bersiaplah bertempur!';
            },
          },
          {
            teks: 'Janji penegakan hukum & gelar kehormatan (+15 Legitimasi, -15 Prestise)',
            fn: () => {
              newRuler.res.prestise = Math.max(0, newRuler.res.prestise - 15);
              this.G.legitimacy = Math.min(100, (this.G.legitimacy ?? 60) + 15);
              this.bump(candClaimant, 20);
              this.G.coups = this.G.coups.filter((cp) => cp.rebelId !== candClaimant.id);
              this.G.successionCrisis = null;
              return 'Kesepakatan politik dicapai dengan Dewan Bangsawan untuk memulihkan stabilitas takhta.';
            },
          },
        ],
        isChain: true,
      };
    }
  }

  // ============ DEATH & BIRTH ============
  public die(c: Character, a: number): void {
    if (!c.hidup && this.held(c.id).length === 0) return;
    const wasPlayer = c.id === this.G.pid;
    const player = this.me();
    const wasCloseToPlayer =
      !wasPlayer &&
      player &&
      (this.kin(player, c) ||
        player.pasangan === c.id ||
        this.held(c.id).some((t) => t.atas && this.T[t.atas]?.pem === player.id) ||
        this.held(player.id).some((t) => t.atas && this.T[t.atas]?.pem === c.id));
    const titlesBefore = this.held(c.id).slice();
    const dSave = c.dinasti;
    const ep = this.computeEpithet(c);

    // Clear church & honorific offices held by the deceased
    if (this.G.church) {
      if (this.G.church.pope === c.id) {
        this.G.church.pope = null;
        this.notifyLog(`Paus ${this.full(c)} wafat! Takhta Suci kosong — Konklaf Pemilihan Paus dibuka.`, '⛪');
      }
      this.G.church.bishops = (this.G.church.bishops || []).filter((id) => id !== c.id);
      this.G.church.cardinals = (this.G.church.cardinals || []).filter((id) => id !== c.id);
      if (this.G.church.archbishops) {
        Object.keys(this.G.church.archbishops).forEach((rid) => {
          if (this.G.church.archbishops![rid] === c.id) delete this.G.church.archbishops![rid];
        });
      }
    }
    if (this.G.honorifics) {
      Object.keys(this.G.honorifics).forEach((hid) => {
        if (this.G.honorifics[hid] === c.id) delete this.G.honorifics[hid];
      });
    }
    c.honorific = null;

    // Explicit per-wilayah assignment for player (prevents gavelkind fragmentation)
    if (wasPlayer) {
      this.held(c.id)
        .filter((t) => t.pem === c.id)
        .forEach((t) => {
          const targetId = this.G.was.perWilayah?.[t.id];
          if (targetId) {
            const r = this.C[targetId];
            if (r && r.hidup && r.id !== c.id) t.pem = r.id;
          }
        });
    }

    c.hidup = false;
    c.wafat = this.G.tahun;
    const wasBetrothed = c.sn === 'bertunangan';
    const s = c.pasangan ? this.C[c.pasangan] : null;
    if (s) {
      if (wasBetrothed) {
        s.sn = 'lajang';
      } else {
        s.sn = s.gender === 'P' ? 'janda' : 'duda';
        if (!s.marriageHistory) s.marriageHistory = [];
        const existingRec = s.marriageHistory.find((m) => m.spouseId === c.id && !m.endedYear);
        if (existingRec) {
          existingRec.endedYear = this.G.tahun;
          existingRec.reason = 'Pasangan wafat';
        } else {
          s.marriageHistory.push({
            spouseId: c.id,
            spouseName: this.full(c),
            dynastyName: dSave ? this.DY[dSave]?.nama : undefined,
            year: c.marriageStartYear || s.marriageStartYear || this.G.tahun,
            endedYear: this.G.tahun,
            reason: 'Pasangan wafat',
          });
        }
        if (!c.marriageHistory) c.marriageHistory = [];
        const myRec = c.marriageHistory.find((m) => m.spouseId === s.id && !m.endedYear);
        if (myRec) {
          myRec.endedYear = this.G.tahun;
          myRec.reason = 'Wafat';
        }
      }
      s.pasangan = null;
      if (!wasBetrothed && s.gender === 'P' && this.RWf().janda) {
        const myTitles = this.held(c.id).filter((t) => t.tier <= 3);
        const wn = Math.floor((myTitles.length * (this.RWf().janda.tanah_janda_persen || 20)) / 100);
        for (let i = 0; i < wn && i < myTitles.length; i++) {
          myTitles[i].pem = s.id;
          this.G.widows[s.id] = this.G.widows[s.id] || [];
          this.G.widows[s.id].push(myTitles[i].id);
        }
      }
    }
    c.pasangan = null;

    this.G.tun = this.G.tun.filter((x) => x.a !== c.id && x.b !== c.id);
    const h = this.heir(c, wasPlayer);
    const was = this.G.was || {};
    const bag = this.held(c.id).filter((t) => t.tier <= 3 && t.pem === c.id);
    const curLaw = this.getEffectiveSuccessionLaw(c);

    if (
      wasPlayer &&
      was.heir &&
      curLaw !== 'pemilihan' &&
      this.C[was.heir]?.hidup &&
      (this.blood(c, this.C[was.heir]) || (was.allowTiri && this.isStep(c, this.C[was.heir])) || curLaw === 'tunjukan')
    ) {
      bag.forEach((t) => (t.pem = was.heir!));
    } else if (curLaw === 'terbagi' && bag.length > 1) {
      const kids = c.anak.map((i) => this.C[i]).filter((x): x is Character => Boolean(x && x.hidup));
      bag.forEach((t, i) => {
        if (kids[i]) t.pem = kids[i].id;
        else if (h) t.pem = h.id;
        else {
          t.pem = null;
          this.npc(t);
        }
      });
    } else if (h) {
      bag.forEach((t) => (t.pem = h.id));
    } else {
      bag.forEach((t) => {
        t.pem = null;
        this.npc(t);
      });
    }

    const hi = this.held(c.id).filter((t) => t.tier > 3 && t.pem === c.id);
    hi.forEach((t) => {
      if (h && h.id !== c.id && h.hidup) t.pem = h.id;
      else {
        t.pem = null;
        this.npc(t);
      }
    });
    c.titles = [];

    if (h) {
      h.res.emas += c.res.emas * 0.8;
      h.res.prestise += c.res.prestise * 0.5;
      if (wasPlayer && was.gereja) {
        h.res.emas -= c.res.emas * 0.2;
        h.res.kesalehan += 25;
      }
    }

    const dy = c.dinasti ? this.DY[c.dinasti] : undefined;
    if (dy && dy.kepala === c.id) {
      const mem = Object.values(this.C)
        .filter((x) => x.hidup && x.dinasti === c.dinasti)
        .sort((x, y) => this.tierOf(y) - this.tierOf(x) || this.umur(y) - this.umur(x));
      dy.kepala = mem[0] ? mem[0].id : null;
    }

    if (wasPlayer) {
      if (h) {
        this.G.pid = h.id;
        this.G.was.heir = null;
        this.G.was.perWilayah = {};
        this.G.log.push(`${this.full(c)} wafat (usia ${a}). Kamu kini bermain sebagai ${this.full(h)}.`);
      } else {
        this.G.over = 1;
      }
    } else if (this.kin(this.me(), c)) {
      this.G.log.push(`${this.full(c)} wafat pada usia ${a}.`);
    }

    // Record v8 rulers & chronicle
    titlesBefore.forEach((t) => {
      if (!this.G.rulers[t.id]) this.G.rulers[t.id] = [];
      const regNum = this.getEffectiveRegnalNumber(c, t);
      this.G.rulers[t.id].push({
        id: c.id,
        nama: (c.regnalNames?.[t.id]) || c.nama,
        julukan: ep,
        dari: Math.max(c.lahir + 16, this.G.tahun - Math.max(1, a - 16)),
        sampai: this.G.tahun,
        sebab: 'wafat',
        regnalNumber: regNum,
        dinasti: c.dinasti,
      });
      if (this.G.rulers[t.id].length > 120) this.G.rulers[t.id] = this.G.rulers[t.id].slice(-120);
    });

    if (dSave) {
      if (ep) this.dynLog(dSave, `${this.full(c)} wafat — dikenang sebagai "${ep}"`);
      else this.dynLog(dSave, `${this.full(c)} wafat pada usia ${a}`);
      if (titlesBefore.length) {
        this.dynLog(dSave, `Masa pemerintahan ${this.full(c)} atas ${titlesBefore.map((t) => t.nama).join(', ')} berakhir`);
      }
    }

    // Secret claim pact activation when rival ruler dies
    if (!wasPlayer && this.G.secretTreaties?.length) {
      const claimPact = this.G.secretTreaties.find((st) => st.active && st.withId === c.id && st.type === 'secret_claim');
      if (claimPact && titlesBefore.length && player) {
        const topTitle = titlesBefore.sort((x, y) => y.tier - x.tier)[0];
        this.G.claims[player.id] = this.G.claims[player.id] || [];
        if (!this.G.claims[player.id].some((clm) => clm.id === topTitle.id)) {
          this.G.claims[player.id].push({ id: topTitle.id, nama: topTitle.nama, kendali: 1 });
          this.notifyLog(`Klaim suksesi rahasia atas ${topTitle.nama} kini dapat dituntut sepeninggal ${this.full(c)}!`, '🗡️');
        }
        claimPact.active = false;
      }
    }

    if (wasPlayer && this.G.pid && this.G.pid !== c.id) {
      const np = this.C[this.G.pid];
      if (np) {
        let legShift = -6;
        if (this.isStep(c, np)) {
          this.dynLog(dSave, `${this.full(np)} (anak tiri) mewarisi gelar keluarga`);
          legShift -= 22;
        } else if (this.blood(c, np)) {
          this.dynLog(dSave, `${this.full(np)} mewarisi gelar dari ${this.full(c)}`);
        }
        if (this.umur(np) < 16) legShift -= 15;
        if (np.res.prestise >= 80) legShift += 8;
        this.G.legitimacy = Math.max(15, Math.min(100, (this.G.legitimacy ?? 80) + legShift));

        if (this.umur(np) < 16) {
          let regent: Character | null = null;
          if (this.G.was.wali && this.C[this.G.was.wali]?.hidup) {
            regent = this.C[this.G.was.wali];
          } else {
            const cs = Object.values(this.C)
              .filter((x) => x.hidup && x.id !== np.id && x.id !== c.id && x.dinasti === c.dinasti)
              .sort((x, y) => this.umur(y) - this.umur(x));
            regent = cs[0] || null;
          }
          this.G.regency = { player: np.id, regent: regent ? regent.id : null, until: np.lahir + 16 };
          this.G.log.push(
            `${this.full(np)} masih di bawah umur. ${regent ? this.full(regent) + ' menjadi wali.' : 'Tidak ada wali.'}`
          );
        }
        if (this.G.factionRep._nextGen?.[this.G.pid]) {
          const ng = this.G.factionRep._nextGen[this.G.pid];
          (this.G.factionRep as AnyRule)[ng.faction] = ((this.G.factionRep as AnyRule)[ng.faction] || 0) + ng.rep;
          if (!this.G.faction) this.G.faction = ng.faction;
          this.G.log.push(`Mewarisi reputasi faksi ${ng.faction} (+${ng.rep})`);
          delete this.G.factionRep._nextGen[this.G.pid];
        }

        // Check Succession Crisis first if legitimacy is low, minor regency with angry vassals, or recent contested law
        const myVassals = this.held(np.id)
          .flatMap((t) => t.kids.map((k) => this.T[k]?.pem))
          .map((id) => (id ? this.C[id] : null))
          .filter((v): v is Character => Boolean(v && v.hidup && v.id !== np.id));
        const angryVassal = myVassals.find((v) => this.opn(v, np) < -20);
        const recentLaw = this.G.lastLawChangeYear !== undefined && this.G.tahun - this.G.lastLawChangeYear <= 5;
        const crisisTriggered =
          this.held(np.id).length > 0 &&
          ((this.G.legitimacy < 52 && myVassals.length > 0) ||
            (this.umur(np) < 16 && Boolean(angryVassal)) ||
            (this.isStep(c, np) && myVassals.length > 0) ||
            (recentLaw && Boolean(angryVassal)));

        if (wasPlayer && np) {
          const topPt = this.primaryTitle(np);
          if (topPt) {
            const isDiffDyn = Boolean(c.dinasti && np.dinasti && c.dinasti !== np.dinasti);
            this.G.pendingCoronation = {
              charId: np.id,
              titleId: topPt.id,
              prevDynastyId: c.dinasti,
              prevDynastyName: c.dinasti && this.DY[c.dinasti] ? this.DY[c.dinasti].nama : undefined,
              birthName: np.nama,
              isDifferentDynasty: isDiffDyn,
              preferredMode: np.preferredRegnalMode,
            };
          }
        }
        if (crisisTriggered) {
          const reason = this.isStep(c, np)
            ? 'Pewaris bukan keturunan sedarah langsung'
            : this.umur(np) < 16
              ? 'Penguasa baru masih di bawah umur (masa perwalian)'
              : recentLaw
                ? 'Vasal menentang perubahan aturan suksesi'
                : 'Legitimasi pewaris terlalu lemah';
          this.triggerSuccessionCrisis(np, reason, angryVassal);
        } else if (!this.G.ev) {
          // Trigger 'Pewarisan Gelar & Pemakaman' event affecting vassal opinions
          const deadName = this.full(c);
          const heirName = this.full(np);
          this.G.ev = {
            judul: 'Pewarisan Gelar & Upacara Pemakaman',
            teks: `${deadName} telah berpulang pada usia ${a} tahun. Seluruh bangsawan menanti upacara pemakaman serta penobatan ${heirName} sebagai penerus sah.`,
            pilihan: [
              {
                teks: 'Gelar Pemakaman Agung & Penobatan Resmi (-30 Emas, +15 Opini Vasal, +12 Legitimasi)',
                fn: () => {
                  if (np.res.emas < 30 && this.stateTreasury(np) < 30) {
                    return 'Dana tidak cukup; upacara digelar secara sederhana (+5 Kesalehan).';
                  }
                  if (!this.spendStateFunds(30, np)) np.res.emas = Math.max(0, np.res.emas - 30);
                  np.res.prestise += 20;
                  this.G.legitimacy = Math.min(100, (this.G.legitimacy ?? 75) + 12);
                  myVassals.forEach((v) => this.bump(v, 15));
                  return `Pemakaman agung mengharumkan nama wangsa (+20 Prestise, +12 Legitimasi, +15 Opini Vasal).`;
                },
              },
              {
                teks: 'Pemakaman Religius & Doa Arwah (+20 Kesalehan, +6 Opini Vasal)',
                fn: () => {
                  np.res.kesalehan += 20;
                  this.G.legitimacy = Math.min(100, (this.G.legitimacy ?? 75) + 5);
                  myVassals.forEach((v) => this.bump(v, 6));
                  return 'Upacara doa khidmat merangkul dukungan kaum rohaniwan dan vasal.';
                },
              },
              {
                teks: 'Penobatan Cepat & Hemat Kas (+10 Prestise, -6 Opini Vasal)',
                fn: () => {
                  np.res.prestise += 10;
                  myVassals.forEach((v) => this.bump(v, -6));
                  return 'Penobatan berlangsung ringkas tanpa pesta besar (kas kerajaan utuh).';
                },
              },
            ],
            isChain: true,
          };
        }
      }
    } else if (wasCloseToPlayer && player && player.hidup && !this.G.ev) {
      const deadName = this.full(c);
      const isMyVassal = titlesBefore.some((tb) => this.T[tb.id]?.atas && this.T[tb.id]?.atas !== undefined && this.held(player.id).some((pt) => pt.id === this.T[tb.id].atas));
      const newHolder = h && h.hidup ? h : null;
      this.G.ev = {
        judul: isMyVassal ? 'Pemakaman & Pewarisan Gelar Vasal' : 'Kabar Duka: Upacara Pemakaman',
        teks: `${deadName} wafat pada usia ${a} tahun.${newHolder ? ` Gelar dan kedudukannya kini diwarisi oleh ${this.full(newHolder)}.` : ''}`,
        pilihan: [
          {
            teks: 'Hadiri Pemakaman & Beri Penghormatan (-15 Emas, +14 Opini Pewaris/Keluarga, +10 Prestise)',
            fn: () => {
              if (player.res.emas >= 15) player.res.emas -= 15;
              player.res.prestise += 10;
              if (newHolder) this.bump(newHolder, 14);
              return `Kehadiranmu di pemakaman ${deadName} sangat dihargai oleh keluarga & vasal.`;
            },
          },
          {
            teks: 'Kirim Utusan & Doa Belasungkawa (+8 Kesalehan, +5 Opini)',
            fn: () => {
              player.res.kesalehan += 8;
              if (newHolder) this.bump(newHolder, 5);
              return `Utusan kerajaan menyampaikan doa belasungkawa atas wafatnya ${deadName}.`;
            },
          },
        ],
        isChain: true,
      };
    }
    this.purgeDeadReferences();
  }

  public purgeDeadReferences(): void {
    const alive = (id?: string | null): boolean => Boolean(id && this.C[id]?.hidup);
    // Guarantee no living character retains a dead spouse/betrothed pointer
    Object.values(this.C).forEach((ch) => {
      if (!ch.hidup) {
        ch.pasangan = null;
        return;
      }
      if (ch.pasangan && !alive(ch.pasangan)) {
        const deadSp = this.C[ch.pasangan];
        const hadMarriage = ch.sn === 'menikah';
        if (hadMarriage && deadSp) {
          ch.marriageHistory = ch.marriageHistory || [];
          const rec = ch.marriageHistory.find((m) => m.spouseId === deadSp.id && !m.endedYear);
          if (rec) {
            rec.endedYear = deadSp.wafat || this.G.tahun;
            rec.reason = 'Pasangan wafat';
          } else {
            ch.marriageHistory.push({
              spouseId: deadSp.id,
              spouseName: this.full(deadSp),
              dynastyName: deadSp.dinasti ? this.DY[deadSp.dinasti]?.nama : undefined,
              year: ch.marriageStartYear || Math.max(ch.lahir + 16, (deadSp.wafat || this.G.tahun) - 3),
              endedYear: deadSp.wafat || this.G.tahun,
              reason: 'Pasangan wafat',
            });
          }
        }
        ch.pasangan = null;
        ch.sn = hadMarriage ? (ch.gender === 'P' ? 'janda' : 'duda') : 'lajang';
      }
    });
    if (this.G.pen) {
      Object.keys(this.G.pen).forEach((jid) => {
        const cid = this.G.pen[jid];
        if (cid && !alive(cid)) {
          this.G.pen[jid] = null;
          delete this.G.office[jid];
        }
      });
    }
    if (this.G.fav) this.G.fav = this.G.fav.filter((id) => alive(id));
    if (this.G.was) {
      if (this.G.was.heir && !alive(this.G.was.heir)) this.G.was.heir = null;
      if (this.G.was.wali && !alive(this.G.was.wali)) this.G.was.wali = null;
      if (this.G.was.perWilayah) {
        Object.keys(this.G.was.perWilayah).forEach((tid) => {
          if (!alive(this.G.was.perWilayah![tid])) delete this.G.was.perWilayah![tid];
        });
      }
    }
    if (this.G.job && (!alive(this.G.job.r) || !alive(this.G.job.id))) {
      this.G.job = null;
    }
    if (this.G.honorifics) {
      Object.keys(this.G.honorifics).forEach((hid) => {
        if (!alive(this.G.honorifics[hid])) delete this.G.honorifics[hid];
      });
    }
    if (this.G.secretTreaties) {
      this.G.secretTreaties = this.G.secretTreaties.filter((st) => alive(st.withId) || st.type === 'secret_claim');
    }
    if (this.G.council) this.G.council = this.G.council.filter((id) => alive(id));
    if (this.G.friends) this.G.friends = this.G.friends.filter((id) => alive(id));
    if (this.G.rivals) this.G.rivals = this.G.rivals.filter((id) => alive(id));
    if (this.G.coups) this.G.coups = this.G.coups.filter((cp) => alive(cp.rebelId));
    if (this.G.tun) this.G.tun = this.G.tun.filter((t) => alive(t.a) && alive(t.b));
    if (this.G.al) this.G.al = this.G.al.filter((a) => alive(a.id));
    if (this.G.trade) this.G.trade = this.G.trade.filter((tr) => alive(tr.with));
    if (this.G.jail) {
      Object.keys(this.G.jail).forEach((cid) => {
        if (!alive(cid)) delete this.G.jail[cid];
      });
    }
    if (this.G.regency && this.G.regency.regent && !alive(this.G.regency.regent)) {
      this.G.regency.regent = null;
    }
    if (this.G.church) {
      if (this.G.church.pope && !alive(this.G.church.pope)) this.G.church.pope = null;
      if (this.G.church.antiPope && !alive(this.G.church.antiPope)) this.G.church.antiPope = null;
      this.G.church.cardinals = (this.G.church.cardinals || []).filter((id) => alive(id));
      this.G.church.bishops = (this.G.church.bishops || []).filter((id) => alive(id));
      if (this.G.church.archbishops) {
        Object.keys(this.G.church.archbishops).forEach((rid) => {
          if (!alive(this.G.church.archbishops![rid])) delete this.G.church.archbishops![rid];
        });
      }
    }
    if (this.G.faithLeadership) {
      const fl = this.G.faithLeadership;
      if (fl.patriarch && !alive(fl.patriarch)) fl.patriarch = null;
      if (fl.syekhulIslam && !alive(fl.syekhulIslam)) fl.syekhulIslam = null;
      if (fl.synodModerator && !alive(fl.synodModerator)) fl.synodModerator = null;
      if (fl.anglicanPrimate && !alive(fl.anglicanPrimate)) fl.anglicanPrimate = null;
    }
    if (this.G.worship) {
      Object.values(this.G.worship).forEach((s) => {
        if (s.keeperId && !alive(s.keeperId)) s.keeperId = null;
      });
    }
    Object.values(this.DY).forEach((d) => {
      if (d.kepala && !alive(d.kepala)) {
        const mem = Object.values(this.C)
          .filter((x) => x.hidup && x.dinasti === d.id)
          .sort((a, b) => this.tierOf(b) - this.tierOf(a) || this.umur(b) - this.umur(a));
        d.kepala = mem[0]?.id || null;
      }
    });
  }

  public cleanupDeadTitleHolders(): void {
    Object.values(this.T).forEach((t) => {
      const o = t.pem ? this.C[t.pem] : null;
      if (o && !o.hidup && o.id !== this.G.pid) {
        const n = this.heir(o, false);
        if (n && n.hidup) t.pem = n.id;
        else {
          t.pem = null;
          this.npc(t);
        }
      }
    });
    this.purgeDeadReferences();
  }

  private triggerPregnancyEvent(mother: Character, father: Character, legitimate: boolean, dueYear: number): void {
    const p = this.me();
    if (!p || (mother.id !== p.id && father.id !== p.id)) return;
    if (this.G.ev) return;
    const findPreg = () => (this.G.pregnancies || []).find((pr) => pr.motherId === mother.id && pr.fatherId === father.id);
    this.G.ev = {
      judul: 'Kabar Kehamilan di Istana',
      teks: `${this.full(mother)} telah mengandung buah hati dari ${this.full(father)}! Persalinan diperkirakan berlangsung pada tahun ${dueYear}.${
        legitimate ? ' Istana bersiap menyambut calon pewaris wangsa.' : ' Kabar ini disimpan erat dalam lingkungan istana.'
      }`,
      pilihan: [
        {
          teks: 'Panggil Tabib & Bidan Istana Terbaik (-15 Emas, +12 Kesehatan Ibu & Bayi)',
          fn: () => {
            if (p.res.emas >= 15 || this.stateTreasury(p) >= 15) {
              if (!this.spendStateFunds(15, p)) p.res.emas = Math.max(0, p.res.emas - 15);
              mother.sp.kesehatan = cl(mother.sp.kesehatan + 12);
              const pr = findPreg();
              if (pr) {
                pr.careBonus = 12;
                pr.careLabel = 'Dirawat Tabib & Bidan Istana';
              }
              return `Tabib istana merawat ${this.full(mother)} sepanjang kehamilan (+12 Kesehatan Ibu & Bayi).`;
            }
            mother.sp.kesehatan = cl(mother.sp.kesehatan + 5);
            const pr = findPreg();
            if (pr) {
              pr.careBonus = 5;
              pr.careLabel = 'Perawatan Ramuan Herbal';
            }
            return `Kas terbatas; tabib meracik ramuan herbal sederhana (+5 Kesehatan Ibu).`;
          },
        },
        {
          teks: 'Doa Syukur & Sedekah Keselamatan (-10 Emas, +15 Kesalehan, +6 Kebahagiaan)',
          fn: () => {
            if (p.res.emas >= 10) p.res.emas -= 10;
            p.res.kesalehan += 15;
            mother.sp.kebahagiaan = cl(mother.sp.kebahagiaan + 6);
            p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 6);
            const pr = findPreg();
            if (pr) {
              pr.careBonus = 8;
              pr.careLabel = 'Diberkati Doa Keselamatan Istana';
            }
            return `Doa dan sedekah dipanjatkan untuk keselamatan ${this.full(mother)} dan sang jabang bayi.`;
          },
        },
        {
          teks: 'Rawat dengan Ketenangan Keluarga (Gratis, +5 Kebahagiaan)',
          fn: () => {
            mother.sp.kebahagiaan = cl(mother.sp.kebahagiaan + 5);
            mother.sp.kesehatan = cl(mother.sp.kesehatan + 3);
            const pr = findPreg();
            if (pr) {
              pr.careBonus = 4;
              pr.careLabel = 'Perawatan Keluarga Sederhana';
            }
            return `Keluarga menjaga ketenangan ${this.full(mother)} menanti hari kelahiran tahun depan.`;
          },
        },
      ],
      isChain: true,
    };
  }

  private spawnChild(mother: Character, father: Character, legitimate = true, preg?: PregnancyRecord): Character {
    const dynId = legitimate ? father.dinasti || mother.dinasti : mother.id === this.G.pid ? mother.dinasti : father.dinasti;
    const k = this.mkC({
      lahir: this.G.tahun,
      dinasti: dynId,
      budaya: father.id === this.G.pid || mother.id === this.G.pid ? this.me().budaya : father.budaya,
      agama: father.id === this.G.pid || mother.id === this.G.pid ? this.me().agama : father.agama,
      ibu: mother.id,
      ayah: father.id,
      kelas: father.kelas,
    });
    if (preg?.careBonus) {
      k.sp.kesehatan = cl(k.sp.kesehatan + preg.careBonus);
    }
    mother.anak.push(k.id);
    father.anak.push(k.id);
    if (mother.id === this.G.pid || father.id === this.G.pid) {
      if (!this.G.pendingNaming) this.G.pendingNaming = [];
      if (!this.G.pendingBirthInfo) this.G.pendingBirthInfo = {};
      this.G.pendingNaming.push(k.id);
      this.G.pendingBirthInfo[k.id] = {
        legitimate,
        careLabel: preg?.careLabel,
        careBonus: preg?.careBonus,
      };
      this.G.log.unshift(
        `Kelahiran ${k.gender === 'L' ? 'Putra' : 'Putri'}: ${this.full(k)}${legitimate ? '' : ' (anak di luar nikah)'}.`
      );
      this.notifyLog(`Bayi lahir! Beri nama untuk ${k.gender === 'L' ? 'putra' : 'putri'} barumu (${k.nama}).`, '👶');
      if (this.G.faction && this.G.factionRep && (this.G.factionRep as AnyRule)[this.G.faction]) {
        this.G.factionRep._nextGen = this.G.factionRep._nextGen || {};
        this.G.factionRep._nextGen[k.id] = {
          faction: this.G.faction,
          rep: Math.floor(((this.G.factionRep as AnyRule)[this.G.faction] || 0) / 2),
        };
      }
    }
    if (k && k.dinasti && this.DY[k.dinasti] && this.DY[k.dinasti].prestise >= 100) {
      this.dynLog(k.dinasti, `Kelahiran ${this.full(k)} (anak ${this.full(mother)})`);
    }
    return k;
  }

  private processPregnanciesTick(): void {
    if (!this.G.pregnancies?.length) return;
    const remaining: PregnancyRecord[] = [];
    this.G.pregnancies.forEach((pr) => {
      const m = this.C[pr.motherId];
      const f = this.C[pr.fatherId];
      if (!m || !m.hidup || !f) return;
      if (pr.dueYear <= this.G.tahun) {
        this.spawnChild(m, f, pr.legitimate, pr);
        // Rare twin birth (7%)
        if (Math.random() < 0.07) {
          const twin = this.spawnChild(m, f, pr.legitimate, pr);
          if (this.G.pendingBirthInfo?.[twin.id]) {
            this.G.pendingBirthInfo[twin.id].isTwin = true;
          }
          if (m.id === this.G.pid || f.id === this.G.pid) {
            this.notifyLog(`Kelahiran kembar! ${this.full(m)} melahirkan bayi kembar.`, '👶');
          }
        }
      } else {
        remaining.push(pr);
      }
    });
    this.G.pregnancies = remaining;
  }

  private birth(c: Character): void {
    if (c.gender !== 'P' || c.sn !== 'menikah' || !c.pasangan || !this.C[c.pasangan]?.hidup) return;
    if ((this.G.pregnancies || []).some((pr) => pr.motherId === c.id)) return;
    const pf = this.D.profesi.find((x: AnyRule) => x.id === c.profesi);
    if (pf && this.noMarry(pf, c)) return;
    const a = this.umur(c);
    if (a < 16 || a > 42 || Math.random() > (this.RG().peluang_hamil_per_tahun_pasangan * c.sp.kesuburan) / 100) return;
    const f = this.C[c.pasangan];
    if (c.id === this.G.pid || f.id === this.G.pid) {
      if (!this.G.pregnancies) this.G.pregnancies = [];
      const dueYear = this.G.tahun + 1;
      this.G.pregnancies.push({
        motherId: c.id,
        fatherId: f.id,
        dueYear,
        conceivedYear: this.G.tahun,
        legitimate: true,
      });
      this.G.log.unshift(`Kabar kehamilan! ${this.full(c)} mengandung anak dari ${this.full(f)} (lahir Thn ${dueYear}).`);
      this.notifyLog(`${this.full(c)} mengandung! Bayi diperkirakan lahir tahun ${dueYear}.`, '🤰');
      this.triggerPregnancyEvent(c, f, true, dueYear);
      return;
    }
    this.spawnChild(c, f, true);
  }

  // ============ INCOME & MILITARY ============
  public factionRank(rep: number): { min: number; nama: string; efek: Record<string, number> } {
    let r = this.FACTION_RANKS[0] || { min: 0, nama: 'Netral', efek: {} };
    for (const x of this.FACTION_RANKS) {
      if (rep >= x.min) r = x;
    }
    return r;
  }

  public initTitleKas(tier: number, isMarquis = false): number {
    const baseTable = [0, 35, 65, 110, 260, 260, 620, 1400];
    const base = baseTable[tier] ?? 50;
    return isMarquis && tier === 5 ? 290 : base;
  }

  public stateTreasury(c?: Character): number {
    const ch = c || this.me();
    if (!ch) return 0;
    return Math.round(this.held(ch.id).reduce((s, t) => s + (t.kas || 0), 0) * 10) / 10;
  }

  public addStateFunds(amt: number, c?: Character): void {
    const ch = c || this.me();
    if (!ch) return;
    const titles = this.held(ch.id);
    if (!titles.length) {
      ch.res.emas = Math.max(0, Math.round((ch.res.emas + amt) * 10) / 10);
      return;
    }
    const pri = this.primaryTitle(ch) || titles[0];
    pri.kas = Math.max(0, Math.round(((pri.kas || 0) + amt) * 10) / 10);
  }

  public spendStateFunds(amt: number, c?: Character): boolean {
    const ch = c || this.me();
    if (!ch) return false;
    const titles = this.held(ch.id);
    if (!titles.length) {
      if (ch.res.emas < amt) return false;
      ch.res.emas = Math.round((ch.res.emas - amt) * 10) / 10;
      return true;
    }
    if (this.stateTreasury(ch) < amt) return false;
    let rem = amt;
    const ordered = [this.primaryTitle(ch), ...titles.filter((x) => x.id !== this.primaryTitle(ch)?.id)].filter(
      (x): x is Title => Boolean(x)
    );
    for (const t of ordered) {
      const k = t.kas || 0;
      const take = Math.min(k, rem);
      t.kas = Math.round((k - take) * 10) / 10;
      rem -= take;
      if (rem <= 0.001) break;
    }
    return true;
  }

  public depositToStateKas(amt: number): void {
    const p = this.me();
    if (!this.held(p.id).length) return this.msg('Kamu belum memiliki wilayah/negara; kelola uang pribadi saja.');
    if (amt <= 0 || p.res.emas < amt) return this.msg(`Uang pribadi tidak cukup (tersedia ${Math.floor(p.res.emas)} emas).`);
    p.res.emas = Math.round((p.res.emas - amt) * 10) / 10;
    this.addStateFunds(amt, p);
    this.msg(`Menyetor ${amt} emas dari dompet pribadi ke Kas Negara/Wilayah.`);
  }

  public drawStateStipend(amt: number): void {
    const p = this.me();
    const titles = this.held(p.id);
    if (!titles.length) return this.msg('Tidak ada Kas Negara/Wilayah.');
    if (this.G.done['stipend']) return this.msg('Penarikan tunjangan penguasa sudah dilakukan tahun ini.');
    const kas = this.stateTreasury(p);
    if (kas < amt) return this.msg(`Kas Negara tidak cukup (tersedia ${Math.floor(kas)} emas).`);
    this.G.done['stipend'] = 1;
    this.spendStateFunds(amt, p);
    p.res.emas = Math.round((p.res.emas + amt) * 10) / 10;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 2);
    this.msg(`Menarik tunjangan pribadi penguasa sebesar ${amt} emas dari Kas Negara (-2 opini rakyat).`);
  }

  public effectiveStat(c: Character, statKey: keyof Character['sk']): number {
    let val = c.sk[statKey] || 0;
    if (c.health?.illness && ILLNESS_DEFS[c.health.illness]) {
      val = Math.max(1, val - ILLNESS_DEFS[c.health.illness].statPenalty);
    }
    const hon = this.getCharacterHonorific(c.id);
    if (hon && statKey === 'perang' && hon.perangBonus) {
      val += hon.perangBonus;
    }
    if (c.id === this.G?.pid) {
      (this.G.luxuryGoods || []).forEach((gid) => {
        const lg = LUXURY_GOODS[gid];
        if (!lg) return;
        if (statKey === 'administrasi' && lg.admin) val += lg.admin;
        if (statKey === 'perang' && lg.perang) val += lg.perang;
        if (statKey === 'diplomasi' && gid === 'sutra_bizantium') val += 2;
      });
      if (statKey === 'administrasi' && this.held(c.id).length > 0) {
        const admLvl = this.G.courtBudget?.admin ?? 1;
        val += admLvl === 2 ? 3 : admLvl === 0 ? -2 : 0;
      }
    }
    return Math.max(1, Math.round(val));
  }

  public getVassalObligation(vassalTitleId: string): {
    tax: 'rendah' | 'normal' | 'tinggi';
    levy: 'rendah' | 'normal' | 'tinggi';
    lastDemandYear?: number;
  } {
    return (
      this.G?.vassalObligations?.[vassalTitleId] || {
        tax: 'normal',
        levy: 'normal',
      }
    );
  }

  public setVassalObligation(
    vassalTitleId: string,
    kind: 'tax' | 'levy',
    level: 'rendah' | 'normal' | 'tinggi'
  ): void {
    const p = this.me();
    const vt = this.T[vassalTitleId];
    if (!vt || !vt.atas || this.T[vt.atas]?.pem !== p.id) {
      return this.msg('Hanya vasal langsung yang dapat diatur kewajiban feodalnya.');
    }
    if (!this.G.vassalObligations) this.G.vassalObligations = {};
    const cur = this.getVassalObligation(vassalTitleId);
    this.G.vassalObligations[vassalTitleId] = { ...cur, [kind]: level };
    const vasalChar = vt.pem ? this.C[vt.pem] : null;
    if (vasalChar && level === 'tinggi') this.bump(vasalChar, -6);
    if (vasalChar && level === 'rendah') this.bump(vasalChar, 5);
    this.G.log.unshift(
      `Kontrak feodal ${vt.nama} diubah: ${kind === 'tax' ? 'Pajak' : 'Kontribusi Pasukan'} menjadi ${level.toUpperCase()}.`
    );
    this.save();
    this.notify();
  }

  public getVassalLevyShare(vassalTitleId: string): number {
    const vt = this.T[vassalTitleId];
    const vc = vt?.pem ? this.C[vt.pem] : null;
    if (!vt || !vc || !vc.hidup) return 0;
    const ob = this.getVassalObligation(vassalTitleId);
    const ratio = ob.levy === 'tinggi' ? 0.5 : ob.levy === 'rendah' ? 0.2 : 0.35;
    const totalTroops = sumObj(this.army(vc));
    return Math.max(15, Math.round(totalTroops * ratio));
  }

  public demandFeudalLevy(vassalTitleId: string): void {
    const p = this.me();
    const vt = this.T[vassalTitleId];
    const vc = vt?.pem ? this.C[vt.pem] : null;
    if (!vt || !vc || !vc.hidup || !vt.atas || this.T[vt.atas]?.pem !== p.id) {
      return this.msg('Target vasal tidak valid.');
    }
    const ob = this.getVassalObligation(vassalTitleId);
    if (ob.lastDemandYear && this.G.tahun - ob.lastDemandYear < 3) {
      return this.msg(`Kontribusi pasukan dari ${vt.nama} baru dapat dituntut kembali pada tahun ${ob.lastDemandYear + 3}.`);
    }
    if (this.opn(vc, p) < -35) {
      return this.msg(`${this.full(vc)} menolak tuntutan levy karena opini terlalu rendah (< -35).`);
    }
    const levy = this.getVassalLevyShare(vassalTitleId);
    const sw = Math.round(levy * 0.55);
    const ar = Math.round(levy * 0.3);
    const cv = Math.max(0, levy - sw - ar);
    this.G.tr.pedang = (this.G.tr.pedang || 0) + sw;
    this.G.tr.pemanah = (this.G.tr.pemanah || 0) + ar;
    this.G.tr.kavaleri = (this.G.tr.kavaleri || 0) + cv;
    if (!this.G.vassalObligations) this.G.vassalObligations = {};
    this.G.vassalObligations[vassalTitleId] = { ...ob, lastDemandYear: this.G.tahun };
    const opPenalty = ob.levy === 'tinggi' ? -15 : ob.levy === 'rendah' ? -5 : -9;
    this.bump(vc, opPenalty);
    this.msg(`${this.full(vc)} mengirimkan ${levy} pasukan feodal (Levy) dari ${vt.nama} (${opPenalty} Opini).`);
  }

  public setCourtBudget(cat: 'admin' | 'military' | 'court', level: 0 | 1 | 2): void {
    const p = this.me();
    if (!this.held(p.id).length) return this.msg('Anggaran istana hanya berlaku bagi penguasa wilayah.');
    if (!this.G.courtBudget) this.G.courtBudget = { admin: 1, military: 1, court: 1 };
    this.G.courtBudget[cat] = level;
    const names = { admin: 'Administrasi & Pajak', military: 'Pemeliharaan Militer', court: 'Kemegahan Istana' };
    const lvls = ['Hemat', 'Standar', 'Tinggi'];
    this.G.log.unshift(`Anggaran ${names[cat]} diatur ke tingkat ${lvls[level]}.`);
    this.save();
    this.notify();
  }

  public getCourtBudgetSummary(): {
    adminCost: number;
    militaryCost: number;
    courtCost: number;
    totalCost: number;
  } {
    const p = this.me();
    if (!p || !this.held(p.id).length) {
      return { adminCost: 0, militaryCost: 0, courtCost: 0, totalCost: 0 };
    }
    const cb = this.G.courtBudget || { admin: 1, military: 1, court: 1 };
    const tierScale = Math.max(1, this.tierOf(p) - 1);
    const table = [0, 3, 8];
    const adminCost = table[cb.admin] * tierScale * 0.6;
    const militaryCost = table[cb.military] * tierScale * 0.7;
    const courtCost = table[cb.court] * tierScale * 0.6;
    return {
      adminCost: Math.round(adminCost * 10) / 10,
      militaryCost: Math.round(militaryCost * 10) / 10,
      courtCost: Math.round(courtCost * 10) / 10,
      totalCost: Math.round((adminCost + militaryCost + courtCost) * 10) / 10,
    };
  }

  public getRoyalCouncilBonuses(): {
    roleId: string;
    roleName: string;
    officer: Character | null;
    efficiency: number;
    statLabel: string;
    statVal: number;
    bonusText: string;
  }[] {
    const roles: { id: string; name: string; stat: keyof Character['sk']; statLabel: string; calc: (v: number, eff: number) => string }[] = [
      {
        id: 'marsekal',
        name: 'Marsyal Kerajaan',
        stat: 'perang',
        statLabel: 'Perang',
        calc: (v, eff) => `+${((v * eff) / 2).toFixed(1)}% Kekuatan Tempur`,
      },
      {
        id: 'kanselir',
        name: 'Kanselir Agung',
        stat: 'diplomasi',
        statLabel: 'Diplomasi',
        calc: (v, eff) => `+${Math.round((v * eff) / 12)} Opini Vasal & +${((v * eff) / 5).toFixed(1)} Penerimaan Diplomatik`,
      },
      {
        id: 'bendahara',
        name: 'Bendahara Kerajaan',
        stat: 'administrasi',
        statLabel: 'Administrasi',
        calc: (v, eff) => `+${((v * eff) / 6).toFixed(1)}% Pendapatan Pajak Wilayah`,
      },
      {
        id: 'mata',
        name: 'Telik Sandi',
        stat: 'spionase',
        statLabel: 'Spionase',
        calc: (v, eff) => `+${((v * eff) * 0.5 / 1.4).toFixed(1)}% Keberhasilan Intelijen & Anti-Bocor Rahasia`,
      },
      {
        id: 'uskup',
        name: 'Kapelan / Penasihat Rohani',
        stat: 'pembelajaran',
        statLabel: 'Pembelajaran',
        calc: (v, eff) => `+${((v * eff) / 2.2).toFixed(1)}% Kecepatan Riset Skriptorium`,
      },
    ];
    return roles.map((r) => {
      const cid = this.G.pen?.[r.id];
      const officer = cid && this.C[cid]?.hidup ? this.C[cid] : null;
      const eff = officer ? this.officeEfficiency(r.id) : 0;
      const statVal = officer ? this.effectiveStat(officer, r.stat) : 0;
      return {
        roleId: r.id,
        roleName: r.name,
        officer,
        efficiency: eff,
        statLabel: r.statLabel,
        statVal,
        bonusText: officer ? r.calc(statVal, eff) : 'Jabatan kosong (tidak ada bonus)',
      };
    });
  }

  public incomeBreakdown(): {
    hasRealm: boolean;
    landTax: number;
    vassalTax: number;
    tradeIncome: number;
    worshipState: number;
    militaryUpkeep: number;
    advisorCost: number;
    loanInterest: number;
    stateNet: number;
    professionIncome: number;
    courtSalaryIncome: number;
    businessIncome: number;
    relRankIncome: number;
    residenceIncome: number;
    personalNet: number;
    total: number;
    courtBudgetCost: number;
    techEcoPct: number;
    luxuryBonus: number;
    feudalLawMult: number;
    prosperityMult: number;
  } {
    const p = this.me();
    if (!p) {
      return {
        hasRealm: false,
        landTax: 0,
        vassalTax: 0,
        tradeIncome: 0,
        worshipState: 0,
        militaryUpkeep: 0,
        advisorCost: 0,
        loanInterest: 0,
        stateNet: 0,
        professionIncome: 0,
        courtSalaryIncome: 0,
        businessIncome: 0,
        relRankIncome: 0,
        residenceIncome: 0,
        personalNet: 0,
        total: 0,
        courtBudgetCost: 0,
        techEcoPct: 0,
        luxuryBonus: 0,
        feudalLawMult: 1,
        prosperityMult: 1,
      };
    }
    const hasRealm = this.held(p.id).length > 0;
    const m = (this.PJK()[this.G.paj ?? 1] || this.PJK()[1] || { mult: 1 }).mult;
    const fTaxLaw = this.LAW('tarif_pajak_feodal') || 'seimbang';
    const feudalLawMult = fTaxLaw === 'ringan' ? 0.85 : fTaxLaw === 'eksploitatif' ? 1.25 : 1.0;
    const hakLaw = this.LAW('hak_bangsawan') || 'keseimbangan_feodal';
    const hakVassalMult = hakLaw === 'otonomi_luas' ? 0.8 : hakLaw === 'sentralisasi_mahkota' ? 1.2 : 1.0;

    let landTax = 0;
    let totalProvs = 0;
    let totalDev = 0;
    this.held(p.id).forEach((t) => {
      if (t.titular) return;
      if (t.tier <= 3) {
        this.provs(t).forEach((v) => {
          totalProvs++;
          totalDev += v.dev;
          const prosMult = 1 + Math.max(0, v.dev - 20) / 100;
          const unrestMult = Math.max(0.5, 1 - (v.unrest || 0) / 150);
          landTax += v.eko * this.RG().pendapatan_emas_per_provinsi_per_ekonomi * prosMult * unrestMult;
        });
      } else {
        const landedKids = t.kids.filter((k) => this.T[k] && !this.T[k].titular).length;
        landTax += landedKids * 1.8;
      }
    });
    const prosperityMult = totalProvs > 0 ? Math.round((1 + Math.max(0, totalDev / totalProvs - 20) / 100) * 100) / 100 : 1;

    const vassalTax =
      this.held(p.id).reduce(
        (s, t) =>
          s +
          t.kids
            .filter((k) => this.T[k] && !this.T[k].titular && this.T[k].pem && this.T[k].pem !== p.id && this.T[k].tier <= 3)
            .reduce((a, k) => {
              const ob = this.getVassalObligation(k);
              const obMult = ob.tax === 'tinggi' ? 1.4 : ob.tax === 'rendah' ? 0.7 : 1.0;
              return a + this.provs(this.T[k]).reduce((b, v) => b + v.eko * 0.5 * 0.2, 0) * obMult;
            }, 0),
        0
      ) *
      m *
      hakVassalMult;

    const eff = this.provEffects(p);
    landTax += eff.ekonomi * 0.5;
    const treas = this.G.pen.bendahara ? this.C[this.G.pen.bendahara] : null;
    const treasEff = treas ? this.officeEfficiency('bendahara') : 1;
    const techEcoPct = (this.G.tech?.economy || 0) * 6;
    const titleRightTax = hasRealm
      ? this.getTitleRights(this.tierOf(p), Boolean(this.primaryTitle(p)?.marquis)).taxBonusPct
      : 0;
    const adminBudgetPct =
      (this.G.courtBudget?.admin ?? 1) === 2 ? 10 : (this.G.courtBudget?.admin ?? 1) === 0 ? -5 : 0;
    const ecoMult =
      1 +
      ((this.AG(p.agama).efek.emas_persen || 0) +
        (treas ? (this.effectiveStat(treas, 'administrasi') / 6) * treasEff : 0) +
        techEcoPct +
        titleRightTax +
        adminBudgetPct) /
        100;
    const pop = this.G.rakyat?.bahagia ?? 50;
    const popMult = pop < 25 ? 0.6 : pop < 40 ? 0.8 : pop < 50 ? 0.95 : pop > 70 ? 1.05 : 1;
    const excomMult = this.G.church?.excom?.[p.id] ? 0.85 : 1;

    const worshipTotal = this.worshipGoldIncome(p);
    const worshipState = hasRealm ? worshipTotal : 0;
    const luxuryBonus = (this.G.luxuryGoods?.length || 0) * 2;
    const tradeIncome = this.G.trade.reduce((s, tr) => s + tr.income, 0) + (hasRealm ? luxuryBonus : 0);
    const fatwaBonus = p.agama === 'islam' && this.G.faithLeadership?.activeFatwa === 'qadi' ? 3 : 0;
    const factionGold =
      this.G.faction && this.G.factionRep
        ? this.factionRank((this.G.factionRep as AnyRule)[this.G.faction] || 0).efek.emas || 0
        : 0;

    let militaryUpkeep = 0;
    this.D.pasukan_jenis.forEach((k: AnyRule) => {
      militaryUpkeep += (this.G.tr[k.id] * k.tingkat[this.lv() - 1].biaya_tahunan) / 100;
    });
    let advisorCost = 0;
    this.D.jabatan.forEach((j: AnyRule) => {
      if (this.G.pen[j.id] && this.C[this.G.pen[j.id]!]) advisorCost += this.getOfficeSalary(j.id, p);
    });
    const loanInterest = this.G.loans.reduce((s, ln) => s + ln.int, 0);
    const courtBudgetCost = hasRealm ? this.getCourtBudgetSummary().totalCost : 0;

    const grossState = hasRealm
      ? (landTax + vassalTax) * feudalLawMult * ecoMult * popMult * excomMult +
        worshipState +
        tradeIncome +
        fatwaBonus +
        factionGold
      : 0;
    const stateNet = hasRealm
      ? grossState - militaryUpkeep - advisorCost - loanInterest - courtBudgetCost
      : 0;

    const pf = this.D.profesi.find((x: AnyRule) => x.id === p.profesi);
    const professionIncome = pf ? pf.pendapatan + this.rankInc(p) : 0;
    const jobEmployer = this.G.job?.r ? this.C[this.G.job.r] : null;
    const courtSalaryIncome =
      this.G.job && this.G.job.id === p.id && jobEmployer && jobEmployer.hidup
        ? this.getOfficeSalary(this.G.job.j, jobEmployer)
        : 0;
    const businessIncome = this.G.us.reduce((s, u) => s + u.p * 0.85, 0);
    const relRankIncome =
      this.relIncome(p) + (hasRealm ? 0 : worshipTotal + fatwaBonus + tradeIncome + luxuryBonus + factionGold);
    const resLevel = this.getEffectiveHomeLevel(p);
    const residenceIncome = resLevel === 4 ? 3 : resLevel >= 5 ? 1 : 0;
    const personalNet =
      professionIncome +
      courtSalaryIncome +
      businessIncome +
      relRankIncome +
      residenceIncome -
      (hasRealm ? 0 : loanInterest);

    return {
      hasRealm,
      landTax,
      vassalTax,
      tradeIncome,
      worshipState,
      militaryUpkeep,
      advisorCost,
      loanInterest,
      stateNet,
      professionIncome,
      courtSalaryIncome,
      businessIncome,
      relRankIncome,
      residenceIncome,
      personalNet,
      total: stateNet + personalNet,
      courtBudgetCost,
      techEcoPct,
      luxuryBonus,
      feudalLawMult,
      prosperityMult,
    };
  }

  public income(): number {
    return this.incomeBreakdown().total;
  }

  public army(c: Character): Record<string, number> {
    if (c.id === this.G.pid) return { ...this.G.tr };
    const t = this.tierOf(c);
    const n = t ? this.tn(t).pasukan_maks * (0.3 + this.hv(c.id) / 250) : 50;
    return { pedang: n * 0.55, pemanah: n * 0.3, kavaleri: n * 0.15 };
  }

  public mil(a: Record<string, number>, budaya?: string): number {
    const ch = budaya ? this.getCulturalHeritage(budaya).milBonus : null;
    return this.D.pasukan_jenis.reduce((s: number, k: AnyRule) => {
      const u = k.tingkat[this.lv() - 1];
      const cultMult = ch && (ch as AnyRule)[k.id] ? 1 + (ch as AnyRule)[k.id] : 1;
      return s + (a[k.id] || 0) * ((u.serang + u.bertahan) / 40) * cultMult;
    }, 0);
  }

  public pwr(c: Character): number {
    const isMe = c.id === this.G.pid;
    const mar = isMe && this.G.pen.marsekal ? this.C[this.G.pen.marsekal] : null;
    const marEff = mar ? this.officeEfficiency('marsekal') : 1;
    const ch = this.getCulturalHeritage(c.budaya);
    const cultMorale = (ch.milBonus.morale || 0) / 100;
    const moraleMult = (isMe ? 0.75 + (this.G.morale ?? 80) / 320 : 1) + cultMorale;
    const marquisBonus = this.held(c.id).some((t) => t.marquis || t.tier === 4) ? 1.12 : 1;
    const techMult = isMe ? 1 + (this.G.tech?.military || 0) * 0.08 : 1;
    const luxMult = isMe && (this.G.luxuryGoods || []).includes('baja_damaskus') ? 1.05 : 1;
    const budgetMilMult = isMe
      ? (this.G.courtBudget?.military ?? 1) === 2
        ? 1.12
        : (this.G.courtBudget?.military ?? 1) === 0
          ? 0.9
          : 1
      : 1;
    const illnessPenalty =
      c.health?.illness && ILLNESS_DEFS[c.health.illness]
        ? Math.max(0.75, 1 - ILLNESS_DEFS[c.health.illness].statPenalty * 0.015)
        : 1;
    return (
      this.mil(this.army(c), c.budaya) *
      (mar ? 1 + (this.effectiveStat(mar, 'perang') * marEff) / 200 : 1) *
      (1 + (this.AG(c.agama).efek.pasukan_persen || 0) / 100) *
      moraleMult *
      marquisBonus *
      techMult *
      luxMult *
      budgetMilMult *
      illnessPenalty
    );
  }

  public massa(t: Title): string {
    for (let x: Title | undefined = t; x; x = x.atas ? this.T[x.atas] : undefined) {
      for (const [m, l] of Object.entries((this.D.pulau || {}) as Record<string, string[]>)) {
        if (l.includes(x.id)) return m;
      }
    }
    return 'eu';
  }

  public isTitleCoastal(t: Title): boolean {
    if (!t || t.titular) return false;
    if (COASTAL_TITLE_IDS.has(t.id)) return true;
    if (t.tier <= 3) {
      return this.provs(t).some((v) => v.pes);
    }
    const visited = new Set<string>();
    const checkTree = (node: Title): boolean => {
      if (visited.has(node.id)) return false;
      visited.add(node.id);
      if (COASTAL_TITLE_IDS.has(node.id)) return true;
      if (!node.titular && node.tier <= 3 && this.provs(node).some((v) => v.pes)) return true;
      return node.kids.some((kid) => (this.T[kid] ? checkTree(this.T[kid]) : false));
    };
    return checkTree(t);
  }

  public getCoastalTitles(c: Character = this.me()): Title[] {
    if (!c) return [];
    const seen = new Set<string>();
    const res: Title[] = [];
    const visit = (t: Title) => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      if (!t.titular && (t.tier <= 3 || t.id === 'd_kent') && this.provs(t).some((v) => v.pes)) {
        res.push(t);
      }
      t.kids.forEach((kid) => {
        if (this.T[kid]) visit(this.T[kid]);
      });
    };
    this.held(c.id).forEach((t) => visit(t));
    return res;
  }

  public hasDirectCoastalDemesne(c: Character = this.me()): boolean {
    if (!c) return false;
    return this.held(c.id).some(
      (t) => !t.titular && (t.tier <= 3 || t.id === 'd_kent') && this.provs(t).some((v) => v.pes)
    );
  }

  public hasCoastalAccess(c: Character = this.me()): boolean {
    return this.getCoastalTitles(c).length > 0;
  }

  public yard(): boolean {
    const p = this.me();
    return this.held(p.id).some(
      (t) => !t.titular && (t.tier <= 3 || t.id === 'd_kent') && this.provs(t).some((v) => v.pes && v.b.includes('galangan_kapal'))
    );
  }

  public getNavyStatus(c: Character = this.me()) {
    const coastalTitles = this.getCoastalTitles(c);
    const hasWaterAccess = coastalTitles.length > 0;
    const directCoastal = this.hasDirectCoastalDemesne(c);
    const hasShipyard =
      c.id === this.G.pid
        ? this.yard()
        : coastalTitles.some((t) => this.provs(t).some((v) => v.pes && v.b.includes('galangan_kapal')));
    const canOperateNavy = hasWaterAccess && hasShipyard;
    return {
      hasWaterAccess,
      directCoastal,
      hasShipyard,
      canOperateNavy,
      coastalTitles,
      reason: !hasWaterAccess
        ? 'Wilayah pedalaman tidak memiliki akses perairan/laut sehingga tidak dapat memiliki angkatan laut.'
        : !directCoastal
          ? 'Kamu perlu memegang langsung minimal 1 provinsi pesisir untuk membangun Galangan Kapal.'
          : !hasShipyard
            ? 'Bangun Galangan Kapal di provinsi pesisir untuk mengoperasikan armada laut.'
            : 'Armada siap berlayar dari pelabuhan berdaulat.',
    };
  }

  public getNpcNavalPower(c: Character): number {
    if (!c || !c.hidup || !this.hasCoastalAccess(c)) return 0;
    const coastalCount = this.getCoastalTitles(c).length;
    const tier = this.tierOf(c);
    return coastalCount * 6 + tier * 5 + Math.round((c.sk.perang || 0) * 0.8);
  }

  public kap = (): number => {
    const p = this.me();
    if (!p || !this.hasCoastalAccess(p) || !this.yard()) return 0;
    return this.D.kapal.reduce((s: number, k: AnyRule) => s + (this.G.sh[k.id] || 0) * k.kapasitas, 0);
  };

  public navy = (): number => {
    const p = this.me();
    if (!p || !this.hasCoastalAccess(p) || !this.yard()) return 0;
    return this.D.kapal.reduce((s: number, k: AnyRule) => s + (this.G.sh[k.id] || 0) * k.serang, 0);
  };

  public getSubHoldingsUnder(regionId: string): Title[] {
    const root = this.T[regionId];
    if (!root) return [];
    const list: Title[] = [];
    const seen = new Set<string>();
    const walk = (t: Title) => {
      t.kids.forEach((kid) => {
        const kt = this.T[kid];
        if (!kt || seen.has(kt.id)) return;
        seen.add(kt.id);
        list.push(kt);
        walk(kt);
      });
    };
    walk(root);
    return list;
  }

  public getSovereignTitle(t: Title): Title {
    let cur = t;
    const seen = new Set<string>([cur.id]);
    while (cur.atas && this.T[cur.atas] && !seen.has(cur.atas)) {
      cur = this.T[cur.atas];
      seen.add(cur.id);
    }
    return cur;
  }

  public getTitleMapMarkers(regionId: string) {
    const t = this.T[regionId];
    if (!t) {
      return {
        isCapital: false,
        capitalKind: null as 'empire' | 'kingdom' | 'duchy' | null,
        isPlayerCapital: false,
        hasCoast: false,
        hasShipyard: false,
        hasFortress: false,
        hasScriptorium: false,
        hasMarket: false,
        hasWar: false,
        hasPlague: false,
      };
    }
    const sub = this.getSubHoldingsUnder(regionId);
    const allRelated = [t, ...sub];
    const p = this.me();
    const playerPrimary = p ? this.primaryTitle(p) : null;
    const isPlayerCapital = Boolean(
      playerPrimary && (playerPrimary.id === t.id || allRelated.some((x) => x.id === playerPrimary.id))
    );

    let capitalKind: 'empire' | 'kingdom' | 'duchy' | null = null;
    for (const x of allRelated) {
      const cap = CAPITAL_TITLE_IDS[x.id];
      if (cap) {
        if (cap.kind === 'empire') {
          capitalKind = 'empire';
          break;
        }
        if (cap.kind === 'kingdom') capitalKind = 'kingdom';
        if (cap.kind === 'duchy' && !capitalKind) capitalKind = 'duchy';
      }
    }
    if (!capitalKind && t.tier >= 6) capitalKind = t.tier >= 7 ? 'empire' : 'kingdom';

    const hasCoast = this.isTitleCoastal(t);
    let hasShipyard = false;
    let hasFortress = Boolean(t.marquis || t.tier === 4);
    let hasScriptorium = ['maghrebi', 'greek', 'italian', 'lombard'].includes(t.budaya);
    let hasMarket = ['d_venice', 'd_genoa', 'd_flanders', 'd_holland', 'd_thrace', 'd_andalus_taifa', 'd_papal', 'k_inggris', 'k_francia'].includes(t.id);

    allRelated.forEach((x) => {
      if (x.tier <= 3 && !x.titular) {
        this.provs(x).forEach((v) => {
          if (v.b.includes('galangan_kapal')) hasShipyard = true;
          if (v.b.includes('benteng') || v.b.includes('kastil')) hasFortress = true;
          if (v.b.includes('perpustakaan') || v.b.includes('skriptorium') || v.b.includes('universitas')) hasScriptorium = true;
          if (v.b.includes('pasar') || v.b.includes('gilda')) hasMarket = true;
        });
      }
    });

    const hasWar = Boolean(
      (this.G.war && allRelated.some((x) => x.id === this.G.war?.tid)) ||
      (this.G.warCampaign && allRelated.some((x) => x.id === this.G.warCampaign?.tid)) ||
      Object.keys(this.G.siegeDetail || {}).some((sid) => allRelated.some((x) => x.id === sid))
    );
    const hasPlague = Boolean(
      this.G.blackDeath?.active ||
      Object.keys(this.G.plague || {}).some((pid) => allRelated.some((x) => x.id === pid))
    );

    return {
      isCapital: Boolean(capitalKind) || isPlayerCapital,
      capitalKind: isPlayerCapital ? 'empire' : capitalKind,
      isPlayerCapital,
      hasCoast,
      hasShipyard,
      hasFortress,
      hasScriptorium,
      hasMarket,
      hasWar,
      hasPlague,
    };
  }

  private fight(A: Record<string, number>, B: Record<string, number>, ma: number, mb: number) {
    const a = { ...A };
    const b = { ...B };
    let w = 0;
    const l: string[] = [];
    const cf = (x: Record<string, number>, y: Record<string, number>) => {
      const sx = sumObj(x) || 1;
      const sy = sumObj(y) || 1;
      return this.D.pasukan_jenis.reduce(
        (s: number, k: AnyRule) =>
          s + (x[k.id] / sx) * (((y[this.TRI[k.id]] || 0) - (y[this.INV[k.id]] || 0)) / sy),
        0
      );
    };
    for (let i = 1; i <= 4 && sumObj(a) > 5 && sumObj(b) > 5; i++) {
      const fa = this.mil(a) * ma * (1 + 0.3 * cf(a, b));
      const fb = this.mil(b) * mb * (1 + 0.3 * cf(b, a));
      const win = fa / (fa + fb) + (Math.random() - 0.5) * 0.2 > 0.5;
      w += win ? 1 : -1;
      const la = win ? R(8, 15) : R(22, 35);
      const lb = win ? R(22, 35) : R(8, 15);
      for (const k in a) a[k] *= 1 - la / 100;
      for (const k in b) b[k] *= 1 - lb / 100;
      l.push(`Pertempuran ${i}: ${win ? 'menang' : 'kalah'} (${Math.round(sumObj(a))} vs ${Math.round(sumObj(b))})`);
      if (Math.abs(w) >= 2) break;
    }
    return { win: w > 0, a, b, l };
  }

  // ============ MISC ACTIONS & CHRONICLES ============
  private msg(s: string): void {
    this.G.log = [s];
    this.save();
    this.home();
  }

  public deed(id: string, k: string, a = 1): void {
    if (!this.G.deeds[id]) {
      this.G.deeds[id] = {
        wars_won: 0,
        wars_lost: 0,
        buildings: 0,
        prestige_gain: 0,
        charity: 0,
        kills: 0,
        titles: 0,
        plague_fought: 0,
      };
    }
    this.G.deeds[id][k] = (this.G.deeds[id][k] || 0) + a;
  }

  public dynLog(id: string | null | undefined, text: string): void {
    if (!id) return;
    if (!this.G.dynHist[id]) this.G.dynHist[id] = [];
    this.G.dynHist[id].push({ y: this.G.tahun, text });
    if (this.G.dynHist[id].length > 80) this.G.dynHist[id] = this.G.dynHist[id].slice(-80);
  }

  public computeEpithet(c: Character): string {
    const d = this.G.deeds[c.id] || {};
    const pts: [string, number][] = [
      ['yang Agung', (d.wars_won || 0) * 8 + (d.titles || 0) * 6 + (d.prestige_gain || 0) * 0.3],
      ['Sang Penakluk', (d.wars_won || 0) * 10 - (d.wars_lost || 0) * 3],
      ['yang Bijaksana', (c.sk.pembelajaran || 0) * 0.6 + (c.sk.administrasi || 0) * 0.4],
      ['yang Saleh', (c.res.kesalehan || 0) * 0.8 + (d.charity || 0) * 5],
      ['yang Kejam', (d.kills || 0) * 10 + (c.sifat.includes('kejam') ? 20 : 0)],
      ['Sang Pembangun', (d.buildings || 0) * 8],
      ['yang Malang', (d.wars_lost || 0) * 10],
      ['yang Adil', this.G.rakyat && this.G.rakyat.bahagia > 60 ? 15 : 0],
      ['Sang Penjaga', (d.plague_fought || 0) * 12],
      ['yang Tua', this.umur(c) > 60 ? 15 : 0],
      ['yang Muda', this.umur(c) < 25 ? 20 : 0],
      ['Sang Pemberani', c.sifat.includes('berani') ? 12 : 0],
      ['yang Licik', c.sifat.includes('licik') ? 12 : 0],
      ['yang Pendiam', 3],
    ];
    pts.sort((a, b) => b[1] - a[1]);
    return pts[0][1] > 5 ? pts[0][0] : '';
  }

  public ap(p: Character, k: string, v: AnyRule): void {
    if (k in p.res) (p.res as AnyRule)[k] += v;
    else if (k in p.sp) (p.sp as AnyRule)[k] = cl((p.sp as AnyRule)[k] + v);
    else if (k in p.sk) (p.sk as AnyRule)[k] = cl((p.sk as AnyRule)[k] + v);
    else if (k === 'ekonomi') {
      const t = this.held(p.id).find((x) => x.tier <= 3);
      if (t) this.provs(t)[0].eko += v;
    } else if (k === 'naik_tier' && !this.tierOf(p)) {
      const counties = Object.values(this.T).filter((t) => t.tier === 3);
      this.makeBaron(p, p.loc || (counties.length ? pick(counties).id : ''));
    } else if (k === 'item') {
      p.items = p.items || [];
      p.items.push(v);
    } else if (k === 'tamu') {
      const t = this.held(p.id).find((x) => x.tier <= 3);
      if (t) {
        const npc2 = this.mkC({
          lahir: this.G.tahun - R(20, 45),
          budaya: t.budaya,
          agama: t.agama,
          kelas: 'bangsawan',
        });
        npc2.op[p.id] = 30;
        p.op[npc2.id] = 20;
        this.G.log.push('Tamu bangsawan: ' + this.full(npc2));
      }
    }
  }

  public makeBaron(c: Character, loc: string, tier = 1): void {
    if (!loc || !this.T[loc]) return;
    const t: Title = {
      id: (tier === 2 ? 'v_' : 'b_') + c.id,
      nama: `${this.tn(tier).nama} ${this.T[loc].nama.replace(/^\S+\s/, '')}`,
      tier,
      pem: c.id,
      atas: loc,
      kids: [],
      budaya: this.T[loc].budaya,
      agama: this.T[loc].agama,
      prov: null,
      kas: this.initTitleKas(tier, false),
    };
    this.T[t.id] = t;
    this.T[loc].kids.push(t.id);
    c.kelas = 'bangsawan';
    const d = c.dinasti ? this.DY[c.dinasti] : undefined;
    if (d && d.status === 'rakyat_biasa') d.status = 'bangsawan_lokal';
    this.G.log.push(`Kamu kini ${this.tn(tier).nama} di ${this.T[loc].nama}!`);
  }

  private ensureRenaissanceBuildings(): void {
    if (!this.D.bangunan.find((b: AnyRule) => b.id === 'universitas')) {
      this.D.bangunan.push(
        { id: 'universitas', nama: 'Universitas', ikon: '🎓', biaya: 200, waktu_tahun: 5, efek: { pembelajaran: 5 } },
        { id: 'bank', nama: 'Bank', ikon: '🏦', biaya: 180, waktu_tahun: 4, efek: { ekonomi: 6 } },
        { id: 'percetakan', nama: 'Percetakan', ikon: '📰', biaya: 150, waktu_tahun: 3, efek: { pembelajaran: 3 } }
      );
    }
  }

  // ============ TICK (NEXT YEAR) ============
  public tick(): void {
    if (this.G.over) return;
    const p = this.me();
    const beforeBuilt = Object.values(this.P).reduce((s, a) => s + a.reduce((x, v) => x + v.b.length, 0), 0);

    this.G.log = [];
    this.G.tahun++;
    this.G.done = {};
    this.G.ev = null;

    if (this.G.tahun >= 1400) {
      this.ensureRenaissanceBuildings();
    }

    const bd = this.incomeBreakdown();
    p.res.emas = Math.max(0, Math.round((p.res.emas + bd.personalNet) * 10) / 10);
    if (bd.hasRealm) {
      if (bd.stateNet >= 0) {
        this.addStateFunds(bd.stateNet, p);
      } else {
        const deficit = Math.abs(bd.stateNet);
        if (!this.spendStateFunds(deficit, p)) {
          const pri = this.primaryTitle(p);
          if (pri) pri.kas = 0;
          p.res.emas = Math.max(0, Math.round((p.res.emas - deficit * 0.5) * 10) / 10);
        }
      }
      this.G.log.push(`Kas Negara ${bd.stateNet >= 0 ? '+' : ''}${bd.stateNet.toFixed(1)} · Uang Pribadi ${bd.personalNet >= 0 ? '+' : ''}${bd.personalNet.toFixed(1)} emas.`);
    } else {
      this.G.log.push(`Pendapatan pribadi: ${bd.personalNet.toFixed(1)} emas.`);
    }
    const resBonus = this.getResidence(p);
    let honorPrestige = 0;
    Object.entries(this.G.honorifics || {}).forEach(([hid, cid]) => {
      if (cid && this.C[cid]?.hidup) {
        const hDef = HONORIFICS.find((h) => h.id === hid);
        if (hDef) honorPrestige += hDef.rulerPrestige;
      }
    });
    let luxPrestige = 0;
    let luxHappy = 0;
    (this.G.luxuryGoods || []).forEach((gid) => {
      const lg = LUXURY_GOODS[gid];
      if (!lg) return;
      if (lg.prestigePerYear) luxPrestige += lg.prestigePerYear;
      if (lg.happiness) luxHappy += lg.happiness;
    });
    const courtLvl = this.held(p.id).length > 0 ? (this.G.courtBudget?.court ?? 1) : 1;
    const courtPrestige = courtLvl === 2 ? 4 : courtLvl === 0 ? -1 : 1;
    const courtLegit = courtLvl === 2 ? 2 : courtLvl === 0 ? -1 : 0;
    const lawTaxHappy =
      this.LAW('tarif_pajak_feodal') === 'ringan'
        ? 2
        : this.LAW('tarif_pajak_feodal') === 'eksploitatif'
          ? -2
          : 0;
    const lawCrimeHappy =
      this.LAW('hukuman_kriminal') === 'denda_ringan'
        ? 1
        : this.LAW('hukuman_kriminal') === 'tangan_besi'
          ? -1
          : 0;
    const lawCrimeLegit = this.LAW('hukuman_kriminal') === 'hukum_raja' ? 1 : 0;

    p.res.prestise += 1 + this.yr(p, 'prestise_per_tahun') + (resBonus.prestigePerYear || 0) + honorPrestige + luxPrestige + courtPrestige;
    if (resBonus.happinessPerYear) p.sp.kebahagiaan = cl(p.sp.kebahagiaan + resBonus.happinessPerYear);
    if (luxHappy || lawTaxHappy || lawCrimeHappy) {
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + Math.min(4, luxHappy) + lawTaxHappy + lawCrimeHappy);
    }
    this.G.legitimacy = Math.max(0, Math.min(100, (this.G.legitimacy ?? 85) + courtLegit + lawCrimeLegit));
    if (this.G.faction && this.G.factionRep) {
      const fr = this.factionRank((this.G.factionRep as AnyRule)[this.G.faction] || 0);
      if (fr.efek.prestise) p.res.prestise += fr.efek.prestise;
    }
    p.res.kesalehan += this.yr(p, 'kesalehan_per_tahun') + this.G.kpt;
    if (this.G.faction === 'gereja') p.res.kesalehan += 1;

    // Sieges
    Object.entries(this.G.sieges).forEach(([tid, s]) => {
      s.turns++;
      const t = this.T[tid];
      const def = t && t.pem ? this.C[t.pem] : null;
      const wall = def ? Math.floor(this.tierOf(def) * 8 + (this.provEffects(def).maks_pasukan || 0) / 20) : 0;
      const mine = (this.G.tr.meriam || 0) * 20 + Math.floor(this.effectiveStat(p, 'perang') / 4);
      if (s.turns >= 3 && mine > wall) {
        if (t) {
          t.pem = p.id;
          this.markConqueredProvinces(t, p);
          this.G.log.push(`Pengepungan ${t.nama} berhasil!`);
        }
        delete this.G.sieges[tid];
      } else if (s.turns >= 5 && mine <= wall) {
        delete this.G.sieges[tid];
        this.G.log.push(`Pengepungan ${t?.nama || tid} gagal, pasukan mundur.`);
      }
    });

    if (this.G.war) {
      this.G.war.turns++;
      if (this.G.war.turns >= 5) {
        const t = this.T[this.G.war.tid];
        if (t && t.pem !== p.id) this.G.log.push('Perang usai, tanpa hasil.');
        this.G.war = null;
      }
    }

    // Pregnancies due this year & deaths & births
    this.processPregnanciesTick();
    Object.values(this.C).forEach((c) => {
      if (!c.hidup) return;
      const a = this.umur(c);
      const pd =
        this.RG().peluang_meninggal_dasar_per_tahun +
        (a > 50 ? (a - 50) * this.RG().tambahan_peluang_meninggal_per_tahun_setelah_umur_50 : 0) +
        (c.sp.kesehatan < 25 ? 0.05 : 0);
      if (Math.random() < pd) this.die(c, a);
      else {
        this.birth(c);
        if (c.id !== this.G.pid && Math.random() < 0.03) {
          c.sp.kesehatan = cl(c.sp.kesehatan + R(-8, 5));
        }
      }
    });

    // Safety net for orphaned titles
    this.cleanupDeadTitleHolders();

    if (this.G.over) {
      this.save();
      this.notify();
      return;
    }

    // Betrothals
    this.G.tun = this.G.tun.filter((x) => {
      const a = this.C[x.a];
      const b = this.C[x.b];
      if (!a || !b || !a.hidup || !b.hidup) return false;
      const yrOn = this.G.tahun - x.y;
      if (yrOn > this.RP().masa_tunangan_maks_tahun) {
        if (a.res.prestise >= this.RP().batal_tunangan.denda_prestise) {
          a.res.prestise -= this.RP().batal_tunangan.denda_prestise;
          a.sn = b.sn = 'lajang';
          a.pasangan = b.pasangan = null;
          if (a.id === this.G.pid) this.G.log.push('Pertunangan dibatalkan (lewat waktu).');
        }
        return false;
      }
      if (yrOn >= 1 && this.umur(a) >= 16 && this.umur(b) >= 16) {
        a.sn = b.sn = 'menikah';
        a.marriageStartYear = this.G.tahun;
        b.marriageStartYear = this.G.tahun;
        a.marriageHistory = a.marriageHistory || [];
        b.marriageHistory = b.marriageHistory || [];
        a.marriageHistory.push({
          spouseId: b.id,
          spouseName: this.full(b),
          dynastyName: b.dinasti ? this.DY[b.dinasti]?.nama : undefined,
          year: this.G.tahun,
        });
        b.marriageHistory.push({
          spouseId: a.id,
          spouseName: this.full(a),
          dynastyName: a.dinasti ? this.DY[a.dinasti]?.nama : undefined,
          year: this.G.tahun,
        });
        this.adjustDynastyRelation(a.dinasti, b.dinasti, 15);
        if (a.id === this.G.pid || b.id === this.G.pid) this.G.log.push('Pernikahan dilangsungkan! (+15 Relasi Dinasti)');
        return false;
      }
      return true;
    });

    // Buildings
    this.G.q = this.G.q.filter((x) => {
      if (x.end > this.G.tahun) return true;
      const v = this.provs(this.T[x.tid])[x.i];
      const e = this.bi(x.b).efek || {};
      v.b.push(x.b);
      if (e.ekonomi) v.eko += e.ekonomi;
      if (e.perkembangan) v.dev += e.perkembangan;
      if (e.kesalehan_per_tahun) this.G.kpt += e.kesalehan_per_tahun;
      this.G.log.push(`${this.bi(x.b).nama} selesai di ${v.nama}.`);
      return false;
    });

    // Alliances
    this.G.al = this.G.al.filter(
      (a) => this.C[a.id] && this.C[a.id].hidup && (a.tp === 'pernikahan' || this.G.tahun < a.y + (a.dur || 99))
    );
    this.G.al.forEach((a) => {
      if (a.tp === 'ekonomi') p.res.emas += 4;
      if (a.tp === 'dagang') p.res.emas += 3;
    });

    // Sect penalty
    if (this.AG(p.agama).sekte) {
      p.res.prestise = Math.max(0, p.res.prestise - 1);
      p.sp.kebahagiaan = cl(p.sp.kebahagiaan - 1);
    }

    // Vasal tax loyalty
    const pp = this.PJK()[this.G.paj ?? 1] || { op: 0 };
    if (pp.op) {
      this.held(p.id).forEach((t) =>
        t.kids.forEach((i) => {
          const o = this.T[i]?.pem ? this.C[this.T[i].pem!] : null;
          if (o && o.id !== p.id) this.bump(o, pp.op);
        })
      );
    }

    // Court job check
    if (this.G.job) {
      const r = this.C[this.G.job.r];
      const j = this.D.jabatan.find((x: AnyRule) => x.id === this.G.job?.j);
      if (this.G.job.id !== this.G.pid || !r || !r.hidup || !j) {
        if (this.G.job.id === this.G.pid) this.G.log.push('Jabatan berakhir.');
        this.G.job = null;
      } else {
        const sal = this.getOfficeSalary(j.id, r);
        p.res.prestise += 2;
        this.bump(r, 2);
        if (Math.random() < 0.25) (p.sk as AnyRule)[j.stat] = cl((p.sk as AnyRule)[j.stat] + 1);
        this.G.log.push(`Gaji jabatan ${j.nama} di ${this.realmOf(r).nama}: +${sal} emas (ke Uang Pribadi).`);
      }
    }

    Object.keys(this.G.pen).forEach((j) => {
      const c = this.G.pen[j] ? this.C[this.G.pen[j]!] : null;
      if (!c || !c.hidup || this.G.jail[c.id]) this.G.pen[j] = null;
    });

    (this.D.modernisasi || []).forEach((m: AnyRule) => {
      if (this.G.tahun >= m.tahun && !this.G.modern.includes(m.id)) {
        this.G.modern.push(m.id);
        this.G.log.push(`Kemajuan: ${m.nama}!`);
      }
    });

    (this.D.dinasti || []).forEach((d: AnyRule) => {
      const dy = this.DY[d.id];
      if (!dy) return;
      const mem = Object.values(this.C).filter((x) => x.hidup && x.dinasti === d.id);
      mem.forEach((m) => {
        if (this.tierOf(m) >= 3) dy.prestise += 0.5;
      });
      const s = this.D.status_dinasti
        .slice()
        .reverse()
        .find((x: AnyRule) => dy.prestise >= (x.prestise_min || 0) && x.tingkat > 0);
      if (s && s.tingkat > (dy.status_tier || 0)) {
        dy.status = s.id;
        dy.status_tier = s.tingkat;
      }
    });

    const ev = (this.D.peristiwa || []).filter((e: AnyRule) => {
      const s = e.syarat || {};
      return (
        (!s.kelas || s.kelas === p.kelas) &&
        (!s.prestise_min || p.res.prestise >= s.prestise_min) &&
        Math.random() < e.peluang_per_tahun
      );
    })[0];
    if (!this.G.ev && ev) this.G.ev = ev;

    if (Math.random() < 0.5) this.pool(1);

    // v6: Season, class events, rumors, public opinion, vasal revolts
    const curPlayer = this.me();
    const seasIdx = (this.G.tahun - this.D.meta.tahun_mulai) % Math.max(1, this.SEAS.length);
    const s = this.SEAS[seasIdx];
    if (s) {
      for (const [k, v] of Object.entries(s.e || {})) this.ap(curPlayer, k, v);
      if (s.d) this.G.log.unshift(s.d);
    }
    this.G.log.unshift(...this.classTick(curPlayer));
    this.G.log.unshift(...this.rumorTick(curPlayer));
    this.popTick();
    const rb = this.rebelTick(curPlayer);
    if (rb.length) this.G.log.unshift('Pemberontakan! ' + rb.join(', ') + ' melepaskan diri.');

    // v7: Plagues, provincial events, chain events
    this.G.log.unshift(...this.plagueTick(curPlayer));
    this.G.log.unshift(...this.provEventTick(curPlayer));
    this.G.log.unshift(...this.chainTick());

    // v8: Built tracking
    const afterBuilt = Object.values(this.P).reduce((sum, a) => sum + a.reduce((x, v) => x + v.b.length, 0), 0);
    if (afterBuilt > beforeBuilt) {
      const diff = afterBuilt - beforeBuilt;
      this.deed(curPlayer.id, 'buildings', diff);
      if (diff >= 2) this.dynLog(curPlayer.dinasti, `${this.full(curPlayer)} menyelesaikan ${diff} pembangunan`);
    }

    // v9: Regency + Faction rep
    if (this.G.regency) {
      const h = this.C[this.G.regency.player];
      const regencyEnded =
        !h ||
        !h.hidup ||
        h.id !== this.G.pid ||
        this.umur(h) >= 16 ||
        (this.G.regency.until > 100
          ? this.G.tahun >= this.G.regency.until
          : this.umur(h) >= this.G.regency.until);
      if (regencyEnded) {
        this.G.regency = null;
        this.G.log.unshift(
          `${h ? this.full(h) : 'Ahli waris'} telah dewasa (usia ${h ? this.umur(h) : 16} tahun), masa perwalian berakhir.`
        );
      } else {
        curPlayer.res.emas = Math.max(0, curPlayer.res.emas - 3);
        curPlayer.res.prestise = Math.max(0, curPlayer.res.prestise - 1);
        this.G.log.unshift('Perwalian: -3 emas, -1 prestise.');
        if (this.G.regency.regent && this.C[this.G.regency.regent]?.hidup) {
          this.C[this.G.regency.regent].res.emas += 2;
        }
      }
    }
    if (this.G.faction && this.G.factionRep) {
      (this.G.factionRep as AnyRule)[this.G.faction] = ((this.G.factionRep as AnyRule)[this.G.faction] || 0) + 1;
    }

    // v10: Crusades & Reform
    this.crusadeTick();
    this.reformTick();

    // v11: Great wars, family events, renaissance
    this.greatWarTick();
    this.G.log.unshift(...this.familyTick());
    this.G.log.unshift(...this.renaissanceTick());

    // v12: Black Death, Peasant revolt, Reformation, 30 years war
    this.G.log.unshift(...this.blackDeathTick());
    this.G.log.unshift(...this.peasantRevoltTick());
    this.G.log.unshift(...this.protestantReformationTick());
    this.G.log.unshift(...this.thirtyYearsTick());

    // Historical Wars
    this.G.log.unshift(...this.warHistTick());

    // v14: Papal succession, NPC agency, crime, detailed siege, weather/disasters
    this.churchTick();
    this.worshipTick();
    this.npcAgencyTick();
    this.siegeDetailTick();
    this.G.log.unshift(...this.crimeAndWeatherTick());

    // v15: Historical scripted events, coups, dynamic religious events, achievements
    this.histEventTick();
    this.religiousEventTick();
    this.kudetaTick();

    // v16: Dynamic prices, knightly orders upkeep/bonus, troop morale, travel
    this.priceTick();
    this.ordersTick();
    this.moraleTick();
    this.travelTick();

    // v18: Office corruption, war logistics supply & campaign
    this.officeCorruptionTick();
    this.supplyTick();
    this.campaignTick();

    // v21: Health & seasonal illness, secret treaties, tech research, cultural assimilation, succession crisis
    this.G.log.unshift(...this.healthAndIllnessTick());
    this.secretTreatyTick();
    this.techResearchTick();
    this.G.log.unshift(...this.assimilationTick());
    this.checkPeriodicSuccessionCrisis();

    // Finalize achievements check after all ticks
    this.checkAchievements();

    sfx.playChime();
    this.save();
    this.notify();
  }

  private classTick(p: Character): string[] {
    const pool = this.CEV[p.kelas] || this.CEV.rakyat_jelata || [];
    const out: string[] = [];
    if (!pool.length) return out;
    const n = R(...(this.D.aturan_event?.jumlah_event_kelas || [2, 4]) as [number, number]);
    for (let i = 0; i < n; i++) {
      let ev;
      let tries = 0;
      do {
        ev = pick(pool);
        tries++;
      } while (ev.c && !ev.c(p) && tries < 10);
      if (ev.c && !ev.c(p)) continue;
      if (ev.e) {
        for (const [k, v0] of Object.entries(ev.e)) {
          const v = this.AT_num(v0);
          if (k === 'rakyat') this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + v);
          else this.ap(p, k, v);
        }
      }
      out.push(`${ev.t}: ${ev.d}`);
    }
    return out;
  }

  private rumorTick(p: Character): string[] {
    if (Math.random() > (this.D.aturan_event?.peluang_rumor ?? 0.4)) return [];
    const others = Object.values(this.C).filter((c) => c.hidup && c.id !== p.id && this.tierOf(c) >= 1);
    if (!others.length) return [];
    return [pick(this.RUM).replace('{n}', this.full(pick(others)))];
  }

  private rebelTick(p: Character): string[] {
    if (this.G.rakyat.bahagia > 25) return [];
    const out: string[] = [];
    this.held(p.id).forEach((t) => {
      if (t.tier >= 4) return;
      t.kids.forEach((k) => {
        const v = this.T[k];
        const vc = v && v.pem ? this.C[v.pem] : null;
        if (!vc || vc.id === p.id) return;
        if (this.opn(vc, p) > -40 || Math.random() > 0.08) return;
        v.atas = null;
        vc.res.prestise += 10;
        vc.op[p.id] = -80;
        p.op[vc.id] = -80;
        out.push(this.full(vc));
      });
    });
    return out;
  }

  public catholicDominanceCheck(): {
    isIslamic: boolean;
    isMedieval: boolean;
    catholicDominated: boolean;
    catholicProvRatio: number;
    catholicRulerRatio: number;
    penaltyPerYear: number;
    scopeLabel: string;
  } {
    const p = this.me();
    const isIslamic = p?.agama === 'islam';
    const isMedieval = (this.G?.tahun || 1066) < 1550;

    // 1. Check provinces owned by player (or realm provinces if unlanded/vassal)
    const heldCounties = p ? this.held(p.id).filter((t) => t.tier <= 3) : [];
    const collectProvs = (rootId: string): Province[] => {
      const out: Province[] = [];
      const seen = new Set<string>();
      const walk = (tid: string) => {
        if (seen.has(tid) || !this.T[tid]) return;
        seen.add(tid);
        const t = this.T[tid];
        if (t.tier <= 3) out.push(...this.provs(t));
        t.kids.forEach(walk);
      };
      walk(rootId);
      return out;
    };

    const ownProvs = heldCounties.flatMap((t) => this.provs(t));
    const realmId = p ? this.realmOf(p).id : '';
    const refProvs = ownProvs.length > 0 ? ownProvs : realmId && this.T[realmId] ? collectProvs(realmId) : [];
    const catholicProvCount = refProvs.filter((v) => v.agama === 'katolik').length;
    const catholicProvRatio = refProvs.length > 0 ? catholicProvCount / refProvs.length : 1;

    // 2. Check Catholic ruler dominance in Europe
    const rulers = Object.values(this.C).filter((c) => c.hidup && this.tierOf(c) >= 3);
    const catholicRulers = rulers.filter((c) => c.agama === 'katolik').length;
    const catholicRulerRatio = rulers.length > 0 ? catholicRulers / rulers.length : 1;

    if (!isIslamic || !isMedieval) {
      return {
        isIslamic,
        isMedieval,
        catholicDominated: false,
        catholicProvRatio,
        catholicRulerRatio,
        penaltyPerYear: 0,
        scopeLabel: '',
      };
    }

    let penaltyPerYear = 0;
    let scopeLabel = '';
    if (ownProvs.length > 0 && catholicProvRatio > 0.5) {
      penaltyPerYear = catholicProvRatio >= 0.8 ? -4 : -3;
      scopeLabel = `Mayoritas provinsi wilayahmu (${Math.round(catholicProvRatio * 100)}%) beragama Katolik`;
    } else if (ownProvs.length === 0 && (catholicProvRatio > 0.5 || catholicRulerRatio > 0.5)) {
      penaltyPerYear = -2;
      scopeLabel = `Wilayah tempat tinggalmu didominasi mayoritas Katolik`;
    } else if (catholicRulerRatio > 0.5) {
      penaltyPerYear = -1;
      scopeLabel = `Eropa di sekitarmu didominasi penguasa Katolik (${Math.round(catholicRulerRatio * 100)}%)`;
    }

    return {
      isIslamic,
      isMedieval,
      catholicDominated: penaltyPerYear < 0,
      catholicProvRatio,
      catholicRulerRatio,
      penaltyPerYear,
      scopeLabel,
    };
  }

  public getMinorityContext(): {
    isMinority: boolean;
    dominantFaith: string;
    dominantFaithName: string;
    hostileRuler: Character | null;
    pressureLevel: number;
  } {
    const p = this.me();
    const dom = this.catholicDominanceCheck();
    const liege = this.G.job?.r ? this.C[this.G.job.r] : null;
    const locTitle = p.loc ? this.T[p.loc] : null;
    const locLord = locTitle?.pem && locTitle.pem !== p.id ? this.C[locTitle.pem] : null;

    const surroundingMajority = Object.values(this.C)
      .filter((c) => c.hidup && c.id !== p.id && c.agama !== p.agama && this.tierOf(c) >= 4)
      .sort((a, b) => this.opn(a, p) - this.opn(b, p));

    const catholicCount = surroundingMajority.filter((c) => c.agama === 'katolik').length;
    const dominantFaith =
      liege && liege.agama !== p.agama
        ? liege.agama
        : locLord && locLord.agama !== p.agama
          ? locLord.agama
          : catholicCount >= Math.max(2, Math.floor(surroundingMajority.length * 0.45))
            ? 'katolik'
            : surroundingMajority[0]?.agama || 'katolik';

    const hostileRuler =
      (liege && liege.agama === dominantFaith ? liege : null) ||
      (locLord && locLord.agama === dominantFaith ? locLord : null) ||
      surroundingMajority.find((c) => c.agama === dominantFaith) ||
      null;

    // Player is a minority if: Muslim in Catholic-dominated region/realm, OR non-Catholic under Catholic liege/surrounded by hostile Catholic majority
    const realm = this.realmOf(p);
    const realmRuler = this.T[realm.id]?.pem ? this.C[this.T[realm.id].pem!] : null;
    const realmDiff = Boolean(realmRuler && realmRuler.id !== p.id && realmRuler.agama !== p.agama);
    const provDiff = this.held(p.id).some((t) => t.tier <= 3 && this.provs(t).some((v) => v.agama !== p.agama));
    const isMinority =
      dom.catholicDominated ||
      realmDiff ||
      (p.agama !== 'katolik' && (p.agama === 'islam' ? dom.catholicRulerRatio > 0.45 : provDiff || Boolean(liege && liege.agama === 'katolik')));

    const pressureLevel = (dom.catholicDominated ? 2 : 0) + (realmDiff ? 2 : 0) + (hostileRuler && this.opn(hostileRuler, p) < -20 ? 1 : 0);
    return {
      isMinority,
      dominantFaith,
      dominantFaithName: this.AG(dominantFaith).nama || dominantFaith,
      hostileRuler,
      pressureLevel,
    };
  }

  private religiousEventTick(): void {
    if (this.G.ev) return;
    const ctx = this.getMinorityContext();
    if (!ctx.isMinority) return;

    const p = this.me();
    const y = this.G.tahun;
    const chance = Math.min(0.45, 0.2 + ctx.pressureLevel * 0.05);
    if (Math.random() > chance) return;

    const ruler = ctx.hostileRuler;
    const rulerLabel = ruler ? `${this.full(ruler)} (${this.tTitle(ruler)})` : `Dewan Bangsawan ${ctx.dominantFaithName}`;
    const faithLabel = this.AG(p.agama).nama;
    const locId = this.held(p.id).find((t) => t.tier <= 3)?.id || p.loc || '';
    const worshipSite =
      Object.values(this.G.worship || {}).find((w) => w.tid === locId) ||
      Object.values(this.G.worship || {})[0];

    const pool: {
      id: string;
      cooldown: number;
      ok: () => boolean;
      build: () => ActiveEvent;
    }[] = [
      {
        id: 'rel_ev_konversi_paksa',
        cooldown: 8,
        ok: () => Boolean(ruler),
        build: () => {
          const tribute = Math.max(25, Math.min(60, 25 + this.tierOf(p) * 6));
          return {
            judul: `Ultimatum Konversi Paksa (${ctx.dominantFaithName})`,
            teks: `Utusan dari ${rulerLabel} datang membawa dekrit keras: kehadiran pemeluk ${faithLabel} di wilayah ini dianggap ancaman ketertiban. Mereka menuntutmu berpindah ke agama ${ctx.dominantFaithName} atau menanggung konsekuensinya.`,
            isChain: true,
            pilihan: [
              {
                teks: `Terima Konversi Paksa ke ${ctx.dominantFaithName} (-25 Kesalehan, -15 Kebahagiaan, +25 Opini)`,
                fn: () => {
                  p.agama = ctx.dominantFaith;
                  p.res.kesalehan = Math.max(0, p.res.kesalehan - 25);
                  p.sp.kebahagiaan = cl(p.sp.kebahagiaan - 15);
                  if (ruler) this.bump(ruler, 25);
                  return `Demi keselamatan takhta dan keluarga, engkau resmi memeluk ${ctx.dominantFaithName}.`;
                },
              },
              {
                teks: `Bayar Upeti Perlindungan / Pajak Toleransi (${tribute} Emas)`,
                fn: () => {
                  if (p.res.emas < tribute) {
                    p.res.prestise = Math.max(0, p.res.prestise - 10);
                    if (ruler) this.bump(ruler, -15);
                    return `Kasmu tidak cukup (${tribute} emas)! Utusan pulang dengan murka (-10 Prestise).`;
                  }
                  p.res.emas -= tribute;
                  p.res.prestise = Math.max(0, p.res.prestise - 4);
                  if (ruler) this.bump(ruler, 10);
                  return `Upeti ${tribute} emas dibayarkan; penguasa ${ctx.dominantFaithName} menunda tekanan konversi.`;
                },
              },
              {
                teks: 'Bela Keyakinan lewat Diplomasi & Debat Teologi (Uji Diplomasi/Pembelajaran)',
                fn: () => {
                  const score = p.sk.diplomasi + p.sk.pembelajaran + R(0, 30);
                  if (score >= 95) {
                    p.res.prestise += 15;
                    p.res.kesalehan += 12;
                    if (ruler) this.bump(ruler, 8);
                    return 'Hujahmu memukau para utusan; tuntutan konversi ditarik dengan hormat (+15 Prestise, +12 Kesalehan).';
                  }
                  if (ruler) this.bump(ruler, -20);
                  this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 8);
                  return 'Debat buntu! Utusan meninggalkan istana dengan permusuhan (-20 Opini Penguasa, -8 Opini Rakyat).';
                },
              },
              {
                teks: 'Tolak Tegas! Pertahankan Iman Tanpa Kompromi (+20 Kesalehan, -25 Opini)',
                fn: () => {
                  p.res.kesalehan += 20;
                  p.res.prestise += 5;
                  if (ruler) this.bump(ruler, -25);
                  if (worshipSite) worshipSite.congregationOpinion = cl(worshipSite.congregationOpinion + 10);
                  return `Engkau menolak tunduk pada tekanan agama mayoritas. Jemaatmu memuji keteguhanmu (+20 Kesalehan).`;
                },
              },
            ],
          };
        },
      },
      {
        id: 'rel_ev_diskriminasi_gilda',
        cooldown: 5,
        ok: () => true,
        build: () => ({
          judul: 'Dekrit Diskriminasi Gilda & Pasar Kota',
          teks: `Gilda saudagar ${ctx.dominantFaithName} memberlakukan tarif ganda dan melarang pengrajin maupun pedagang beragama ${faithLabel} membuka lapak di alun-alun utama.`,
          isChain: true,
          pilihan: [
            {
              teks: 'Bayar Uang Pelicin ke Kepala Gilda (20 Emas, +4 Opini Rakyat)',
              fn: () => {
                if (p.res.emas < 20) {
                  p.sp.kebahagiaan = cl(p.sp.kebahagiaan - 6);
                  return 'Emas tidak cukup; embargo pasar tetap berlaku (-6 Kebahagiaan).';
                }
                p.res.emas -= 20;
                this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 4);
                return 'Izin dagang kembali dibuka berkat lobi emas (+4 Opini Rakyat).';
              },
            },
            {
              teks: 'Bentuk Jaringan Niaga Komunitas Mandiri (Butuh Administrasi ≥ 35)',
              fn: () => {
                if (p.sk.administrasi >= 35 || p.profesi === 'pengusaha' || p.profesi === 'pedagang') {
                  p.res.emas += 14;
                  p.res.prestise += 8;
                  return 'Jalur niaga mandiri sukses menembus boikot gilda (+14 Emas, +8 Prestise)!';
                }
                p.res.emas = Math.max(0, p.res.emas - 10);
                return 'Tanpa keahlian niaga yang memadai, usaha mandiri merugi (-10 Emas).';
              },
            },
            {
              teks: 'Terima Pembatasan Sementara (-12 Emas, +10 Kesalehan)',
              fn: () => {
                p.res.emas = Math.max(0, p.res.emas - 12);
                p.res.kesalehan += 10;
                this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 4);
                return 'Engkau bersabar menghadapi pengucilan ekonomi (+10 Kesalehan, -4 Opini Rakyat).';
              },
            },
          ],
        }),
      },
      {
        id: 'rel_ev_intimidasi_ibadah',
        cooldown: 6,
        ok: () => true,
        build: () => {
          const siteName = worshipSite ? worshipSite.name : p.agama === 'islam' ? 'Masjid Komunitas' : 'Rumah Ibadah Minoritas';
          return {
            judul: `Ketegangan di Sekitar ${siteName}`,
            teks: `Sekelompok massa fanatik ${ctx.dominantFaithName} berkerumun di depan ${siteName}, menuntut tempat ibadah pemeluk ${faithLabel} disegel atau dibayar pajaknya berlipat ganda.`,
            isChain: true,
            pilihan: [
              {
                teks: 'Beri Santunan Sosial & Perkuat Penjagaan (22 Emas, +12 Opini Jemaat, +5 Opini Rakyat)',
                fn: () => {
                  if (p.res.emas < 22) {
                    if (worshipSite) worshipSite.congregationOpinion = cl(worshipSite.congregationOpinion - 6);
                    return 'Dana pengamanan tidak mencukupi; jemaat gelisah.';
                  }
                  p.res.emas -= 22;
                  this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 5);
                  p.res.kesalehan += 10;
                  if (worshipSite) worshipSite.congregationOpinion = cl(worshipSite.congregationOpinion + 12);
                  return 'Santunan meredam amarah warga sekitar dan menenangkan jemaat (+12 Opini Jemaat).';
                },
              },
              {
                teks: 'Galang Solidaritas Jemaat untuk Bertahan (+15 Kesalehan, -5 Opini Rakyat)',
                fn: () => {
                  p.res.kesalehan += 15;
                  this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 5);
                  if (worshipSite) worshipSite.congregationOpinion = cl(worshipSite.congregationOpinion + 8);
                  return 'Jemaat berkumpul menjaga rumah ibadah dengan damai (+15 Kesalehan).';
                },
              },
              {
                teks: 'Tutup Ibadah Publik Sementara Demi Keselamatan (-10 Kesalehan, -10 Opini Jemaat)',
                fn: () => {
                  p.res.kesalehan = Math.max(0, p.res.kesalehan - 10);
                  if (worshipSite) worshipSite.congregationOpinion = cl(worshipSite.congregationOpinion - 10);
                  return 'Ibadah dialihkan ke rumah-rumah secara diam-diam agar terhindar dari bentrokan.';
                },
              },
            ],
          };
        },
      },
      {
        id: 'rel_ev_fitnah_istana',
        cooldown: 6,
        ok: () => Boolean(ruler),
        build: () => ({
          judul: 'Fitnah & Pengucilan di Lingkaran Bangsawan',
          teks: `Para pejabat ${ctx.dominantFaithName} menyebarkan desas-desus bahwa pemeluk ${faithLabel} sepertimu bersekongkol dengan musuh luar negeri.`,
          isChain: true,
          pilihan: [
            {
              teks: 'Kirim Hadiah Pembuktian Kesetiaan (20 Emas, +15 Opini)',
              fn: () => {
                if (p.res.emas < 20) return 'Emas kurang untuk jamuan diplomatik.';
                p.res.emas -= 20;
                if (ruler) this.bump(ruler, 15);
                return 'Utusan diplomatik berhasil meredakan kecurigaan istana (+15 Opini).';
              },
            },
            {
              teks: 'Bongkar Sumber Fitnah lewat Jaringan Informasi (Uji Spionase)',
              fn: () => {
                if (p.sk.spionase + R(0, 30) >= 60) {
                  p.res.prestise += 14;
                  if (ruler) this.bump(ruler, 10);
                  return 'Pemfitnah berhasil dipermalukan di hadapan pengadilan (+14 Prestise).';
                }
                p.res.prestise = Math.max(0, p.res.prestise - 6);
                if (ruler) this.bump(ruler, -10);
                return 'Penyelidikan gagal meyakinkan dewan; desas-desus masih beredar (-10 Opini).';
              },
            },
            {
              teks: 'Biarkan Fitnah Berlalu (-8 Prestise, -12 Opini)',
              fn: () => {
                p.res.prestise = Math.max(0, p.res.prestise - 8);
                if (ruler) this.bump(ruler, -12);
                return 'Nama baikmu sedikit tercoreng di antara bangsawan Eropa.';
              },
            },
          ],
        }),
      },
      {
        id: 'rel_ev_piagam_toleransi',
        cooldown: 10,
        ok: () => Boolean(ruler) && (p.sk.diplomasi >= 40 || p.res.prestise >= 60),
        build: () => ({
          judul: 'Tawaran Piagam Perlindungan Minoritas',
          teks: `Melihat kontribusi pajak dan ketertibanmu, ${rulerLabel} bersedia meneken piagam perlindungan terbatas bagi komunitas ${faithLabel} selama 8 tahun ke depan.`,
          isChain: true,
          pilihan: [
            {
              teks: 'Teken Piagam Resmi (30 Emas, +18 Opini, +8 Opini Rakyat)',
              fn: () => {
                if (p.res.emas < 30) return 'Emas tidak cukup untuk bea meterai piagam (30 emas).';
                p.res.emas -= 30;
                if (ruler) this.bump(ruler, 18);
                this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 8);
                this.G.chainDone['rel_ev_konversi_paksa'] = y;
                return 'Piagam toleransi resmi disahkan! Tekanan konversi mereda sementara (+8 Opini Rakyat).';
              },
            },
            {
              teks: 'Negosiasikan Piagam Tanpa Upeti (Butuh Diplomasi ≥ 55)',
              fn: () => {
                if (p.sk.diplomasi >= 55) {
                  p.res.prestise += 15;
                  if (ruler) this.bump(ruler, 12);
                  this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 6);
                  return 'Keterampilan diplomasimu membuahkan piagam gratis (+15 Prestise)!';
                }
                return 'Negosiasi ditolak; kesempatan piagam berlalu tahun ini.';
              },
            },
          ],
        }),
      },
    ];

    const eligible = pool.filter(
      (ev) => ev.ok() && (!this.G.chainDone[ev.id] || y - this.G.chainDone[ev.id] >= ev.cooldown)
    );
    if (!eligible.length) return;
    const chosen = pick(eligible);
    const created = chosen.build();
    this.G.ev = created;
    this.G.chainDone[chosen.id] = y;
    this.notifyLog(`Pemicu Religi: ${created.judul}`, '⚖️');
  }

  private popTick(): void {
    const k = this.PJK()[this.G.paj ?? 1] || { bahagia: 0 };
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + (k.bahagia || 0) * 2);
    if (this.G.war) this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 2);
    if (this.G.rakyat.bahagia > 50 && Math.random() < 0.3) this.G.rakyat.bahagia--;
    if (this.G.rakyat.bahagia < 50 && Math.random() < 0.3) this.G.rakyat.bahagia++;

    const dom = this.catholicDominanceCheck();
    if (dom.catholicDominated && dom.penaltyPerYear < 0) {
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + dom.penaltyPerYear);
      this.G.log.push(
        `Sentimen agama (${dom.scopeLabel}): Opini Rakyat turun ${dom.penaltyPerYear} berkala.`
      );
    }
  }

  private chainTick(): string[] {
    if (this.G.ev) return [];
    const cands = this.CHAINS.filter(
      (c) => (!this.G.chainDone[c.id] || (c.ulang && this.G.tahun - this.G.chainDone[c.id] >= c.ulang)) && (!c.when || c.when())
    );
    if (!cands.length) return [];
    const ev0 = pick(cands);
    if (Math.random() < (ev0.peluang ?? this.D.aturan_event?.peluang_berantai ?? 0.18)) {
      this.G.ev = {
        judul: ev0.title,
        teks: ev0.teks,
        pilihan: ev0.pilihan.map((x) => ({ teks: x.teks, fn: x.fn })),
        isChain: true,
      };
      this.G.chainDone[ev0.id] = this.G.tahun;
      return ['Peristiwa: ' + ev0.title];
    }
    return [];
  }

  private familyTick(): string[] {
    if (this.G.ev) return [];
    const cands = this.FAM_EVENTS.filter(
      (e) => (!this.G.chainDone[e.id] || (e.ulang && this.G.tahun - this.G.chainDone[e.id] >= e.ulang)) && e.when()
    );
    if (!cands.length) return [];
    const ev0 = pick(cands);
    if (Math.random() < (ev0.peluang ?? this.D.aturan_event?.peluang_keluarga ?? 0.15)) {
      this.G.ev = {
        judul: ev0.title,
        teks: ev0.teks,
        pilihan: ev0.pilihan.map((x) => ({ teks: x.teks, fn: x.fn })),
        isChain: true,
      };
      this.G.chainDone[ev0.id] = this.G.tahun;
      return ['Peristiwa Keluarga: ' + ev0.title];
    }
    return [];
  }

  private plagueTick(p: Character): string[] {
    const out: string[] = [];
    Object.keys(this.G.plague).forEach((tid) => {
      const pl = this.G.plague[tid];
      pl.turns++;
      const t = this.T[tid];
      if (!t) {
        delete this.G.plague[tid];
        return;
      }
      if (t.tier <= 3) this.provs(t).forEach((v) => (v.dev = Math.max(5, v.dev - 1)));
      if (t.pem === p.id) {
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 1);
        p.sp.kesehatan = cl(p.sp.kesehatan - 3);
      }
      const gp = t.atas && this.T[t.atas] ? this.T[t.atas].atas : null;
      Object.values(this.T).forEach((t2) => {
        if (t2.id === tid || this.G.plague[t2.id] || t2.tier !== 3) return;
        const near = t2.atas === t.atas || (gp && t2.atas && this.T[t2.atas]?.atas === gp);
        if (near && Math.random() < 0.4) {
          this.G.plague[t2.id] = { turns: 1, sev: Math.max(10, pl.sev - 10) };
          out.push('Wabah menyebar ke ' + t2.nama);
        }
      });
      if (pl.turns >= 3 + Math.floor(pl.sev / 30)) {
        delete this.G.plague[tid];
        out.push('Wabah mereda di ' + t.nama);
      }
    });
    if (Math.random() < 0.05) {
      const cands = Object.values(this.T).filter((t) => t.tier === 3 && !this.G.plague[t.id]);
      if (cands.length) {
        const t = pick(cands);
        this.G.plague[t.id] = { turns: 1, sev: R(30, 70) };
        out.push('Wabah baru di ' + t.nama);
      }
    }
    return out;
  }

  private provEventTick(p: Character): string[] {
    const out: string[] = [];
    this.held(p.id).forEach((t) => {
      if (t.tier > 3 || Math.random() > 0.1) return;
      const pr = this.provs(t);
      if (!pr.length) return;
      const v = pick(pr);
      const roll = Math.random();
      if (roll < 0.2) {
        const d = R(1, 3);
        v.dev = Math.max(5, v.dev - d);
        out.push(`Kebakaran di ${v.nama} (dev -${d})`);
      } else if (roll < 0.35) {
        v.eko = Math.max(1, v.eko - R(1, 2));
        out.push(`Kelaparan di ${v.nama}`);
      } else if (roll < 0.55) {
        v.dev = Math.min(100, v.dev + R(1, 2));
        out.push(`Pembangunan di ${v.nama}`);
      } else if (roll < 0.7) {
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 3);
        out.push(`Festival di ${v.nama}`);
      } else if (roll < 0.8 && v.b.length) {
        const lost = v.b.pop()!;
        out.push(`${this.bi(lost)?.nama || lost} hancur di ${v.nama}`);
      } else if (roll < 0.9) {
        const g = R(3, 8);
        p.res.emas += g;
        out.push(`Pajak tambahan dari ${v.nama} (+${g})`);
      } else {
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 3);
        out.push(`Kerusuhan kecil di ${v.nama}`);
      }
    });
    return out;
  }

  private crusadeTick(): void {
    this.G.crusades = this.G.crusades.filter((c) => {
      c.turns++;
      if (c.turns >= 3) {
        const p = this.me();
        const mar = this.G.pen.marsekal ? this.C[this.G.pen.marsekal] : null;
        const myPower = sumObj(this.G.tr) * 2 + (mar ? mar.sk.perang * 3 : 0);
        const totalPower = myPower + c.allies.reduce((s, a) => s + a.power, 0);
        const enemy = (c.target.kekuatan * R(80, 120)) / 100;
        const win = totalPower > enemy;
        if (win) {
          this.G.log.unshift(`PERANG SALIB MENANG di ${c.target.nama}!`);
          p.res.emas += c.target.hadiah.emas;
          p.res.prestise += c.target.hadiah.prestise;
          p.res.kesalehan += c.target.hadiah.kesalehan;
          this.deed(p.id, 'wars_won', 2);
          this.dynLog(p.dinasti, `${this.full(p)} memenangkan Perang Salib ke ${c.target.nama}`);
          c.allies.forEach((a) => {
            if (this.C[a.id]) this.bump(this.C[a.id], 30);
          });
          this.G.crusadeHistory.push({ id: c.id, target: { id: c.target.id, nama: c.target.nama }, result: 'win', year: this.G.tahun });
        } else {
          this.G.log.unshift(`PERANG SALIB KALAH di ${c.target.nama}.`);
          p.res.prestise = Math.max(0, p.res.prestise - 30);
          p.res.kesalehan = Math.max(0, p.res.kesalehan - 20);
          this.deed(p.id, 'wars_lost', 1);
          this.dynLog(p.dinasti, `${this.full(p)} gagal dalam Perang Salib ke ${c.target.nama}`);
          c.allies.forEach((a) => {
            if (this.C[a.id]) this.bump(this.C[a.id], -15);
          });
          this.G.crusadeHistory.push({ id: c.id, target: { id: c.target.id, nama: c.target.nama }, result: 'lose', year: this.G.tahun });
        }
        return false;
      }
      this.G.log.unshift(`Perang Salib ke ${c.target.nama} berlangsung (tahun ${c.turns}/3)`);
      return true;
    });
  }

  private reformTick(): void {
    this.G.reformed.forEach((r) => {
      const rel = this.G.ag.find((x) => x.id === r.id);
      if (!rel) return;
      const believers = Object.values(this.C).filter((c) => c.hidup && c.agama === r.id).length;
      if (believers < 3 && Math.random() < 0.3) {
        const founder = this.C[r.founder];
        if (!founder || !founder.hidup) return;
        const cands = Object.values(this.C).filter(
          (c) => c.hidup && c.id !== r.founder && c.agama === rel.induk && Math.random() < 0.1
        );
        if (cands.length) {
          const c = pick(cands);
          c.agama = r.id;
          this.G.log.unshift(`${this.full(c)} memeluk ${rel.nama}`);
        }
      }
    });
  }

  private greatWarTick(): void {
    if (!this.G.greatWars.length) return;
    this.G.greatWars = this.G.greatWars.filter((w) => {
      w.turns++;
      const p = this.me();
      const o = this.C[w.enemy];
      if (!o || !o.hidup) {
        const tgtTitle = this.T[w.tid];
        const nextHolder = tgtTitle?.pem ? this.C[tgtTitle.pem] : null;
        if (nextHolder && nextHolder.hidup && nextHolder.id !== p.id) {
          w.enemy = nextHolder.id;
          this.G.log.unshift(
            `Penguasa lawan wafat di tengah Perang Besar; perlawanan kini dipimpin oleh ${this.full(nextHolder)}.`
          );
        } else {
          if (tgtTitle && (!nextHolder || !nextHolder.hidup)) {
            tgtTitle.pem = p.id;
            if (tgtTitle.tier > (this.held(p.id).sort((a, b) => b.tier - a.tier)[0]?.tier || 0)) {
              this.G.primary = tgtTitle.id;
            }
            p.res.prestise += 60;
          }
          this.G.log.unshift('Perang Besar berakhir karena penguasa lawan wafat tanpa penerus bertahan.');
          return false;
        }
      }
      const roll = Math.random() + ((w.myPower - w.theirPower) / Math.max(w.myPower + w.theirPower, 1)) * 0.5;
      if (roll > 0.5) {
        const gain = R(80, 250);
        w.myPower += gain;
        w.theirPower = Math.max(0, w.theirPower - R(50, 150));
        this.G.log.unshift(`Perang Besar thn ${w.turns}/5: menang (+${gain})`);
      } else {
        const loss = R(80, 250);
        w.myPower = Math.max(0, w.myPower - loss);
        w.theirPower += R(50, 150);
        this.G.log.unshift(`Perang Besar thn ${w.turns}/5: kalah (-${loss})`);
      }
      if (w.turns >= 5 || w.myPower <= 10 || w.theirPower <= 10) {
        if (w.myPower > w.theirPower) {
          this.G.log.unshift('PERANG BESAR MENANG!');
          const t = this.T[w.tid];
          if (t) t.pem = p.id;
          p.res.prestise += 100;
          p.res.emas += 150;
          w.myAllies.forEach((id) => {
            if (this.C[id]?.hidup) {
              this.bump(this.C[id], 30);
              this.C[id].res.prestise += 20;
            }
          });
          w.theirAllies.forEach((id) => {
            if (this.C[id]?.hidup) this.bump(this.C[id], -40);
          });
          this.deed(p.id, 'wars_won', 2);
          this.dynLog(p.dinasti, `${this.full(p)} menang Perang Besar melawan ${this.full(o)}`);
          this.G.greatWarHistory.push({ target: w.tid, result: 'win', year: this.G.tahun, enemy: w.enemy });
        } else {
          this.G.log.unshift('PERANG BESAR KALAH.');
          p.res.prestise = Math.max(0, p.res.prestise - 50);
          p.res.emas *= 0.7;
          this.deed(p.id, 'wars_lost', 1);
          this.dynLog(p.dinasti, `${this.full(p)} kalah Perang Besar melawan ${this.full(o)}`);
          this.G.greatWarHistory.push({ target: w.tid, result: 'lose', year: this.G.tahun, enemy: w.enemy });
        }
        return false;
      }
      return true;
    });
  }

  private renaissanceTick(): string[] {
    if (this.G.tahun < 1400) return [];
    const p = this.me();
    const out: string[] = [];
    if (!this.G.renaissance.unlocked) {
      this.G.renaissance.unlocked = true;
      out.push('Era Renaissance dimulai! Ilmu & seni berkembang.');
      this.dynLog(p.dinasti, 'Era Renaissance dimulai di Eropa');
    }
    this.G.renaissance.points = (this.G.renaissance.points || 0) + 1;
    if (this.G.renaissance.points % 5 === 0) {
      p.sk.pembelajaran = cl(p.sk.pembelajaran + 1);
      if (Math.random() < 0.3) out.push('Pembelajaran +1 (Renaissance)');
    }
    if (Math.random() < 0.1) {
      p.res.prestise += 2;
      out.push('Seniman lokal memuji kemurahanmu. +2 prestise.');
    }
    return out;
  }

  private blackDeathTick(): string[] {
    const out: string[] = [];
    if (this.G.tahun < this.SB('pes_hitam', 'tahun_mulai', 1347)) return out;
    if (!this.G.blackDeath) {
      if (Math.random() < this.SB('pes_hitam', 'peluang_tiba', 0.3)) {
        const dur = this.SB('pes_hitam', 'durasi', [3, 6]) as [number, number];
        this.G.blackDeath = { active: true, started: this.G.tahun, duration: R(dur[0], dur[1]) };
        out.push('WABAH PES HITAM tiba di Eropa!');
        this.dynLog(this.me().dinasti, 'Wabah Pes Hitam melanda Eropa');
      }
      return out;
    }
    if (!this.G.blackDeath.active) return out;
    const turns = this.G.tahun - this.G.blackDeath.started;
    if (turns > this.G.blackDeath.duration) {
      this.G.blackDeath.active = false;
      out.push(`Pes Hitam mereda setelah ${turns} tahun.`);
      return out;
    }
    let kills = 0;
    Object.values(this.C).forEach((c) => {
      if (!c.hidup || c.id === this.G.pid) return;
      if (Math.random() < this.SB('pes_hitam', 'peluang_mati_npc', 0.25)) {
        this.die(c, this.umur(c));
        kills++;
      }
    });
    this.held(this.me().id).forEach((t) => {
      if (t.tier <= 3 && !t.titular) {
        this.provs(t).forEach((v) => {
          const et = this.SB('pes_hitam', 'eko_turun', [1, 3]) as [number, number];
          const dt = this.SB('pes_hitam', 'dev_turun', [1, 4]) as [number, number];
          v.eko = Math.max(1, v.eko - R(et[0], et[1]));
          v.dev = Math.max(5, v.dev - R(dt[0], dt[1]));
        });
      }
    });
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - this.SB('pes_hitam', 'rakyat_turun', 5));
    const p = this.me();
    const st = this.SB('pes_hitam', 'sehat_turun', [2, 5]) as [number, number];
    p.sp.kesehatan = cl(p.sp.kesehatan - R(st[0], st[1]));
    out.push(`Pes Hitam tahun ${turns + 1}: ${kills} jiwa wafat`);
    return out;
  }

  private peasantRevoltTick(): string[] {
    const out: string[] = [];
    if (this.G.peasantRevolt?.active) {
      this.G.peasantRevolt.turns++;
      const maxD = this.SB('pemberontakan_petani', 'durasi_maks', 3);
      if (this.G.peasantRevolt.turns > maxD) {
        this.G.peasantRevolt.active = false;
        out.push(`Pemberontakan petani padam setelah ${maxD} tahun.`);
        return out;
      }
      out.push(`Pemberontakan petani masih berkecamuk (tahun ${this.G.peasantRevolt.turns}/${maxD})`);
      if (Math.random() < 0.4) {
        const lost = this.held(this.me().id).find((t) => t.tier <= 3);
        if (lost) {
          const v = this.provs(lost)[0];
          v.eko = Math.max(1, v.eko - 2);
        }
      }
      return out;
    }
    const badPop = this.G.rakyat.bahagia < this.SB('pemberontakan_petani', 'ambang_bahagia', 20);
    const hasPlague = this.G.blackDeath?.active;
    const highTax = (this.PJK()[this.G.paj ?? 1] || {}).mult >= 1.5;
    if (badPop && (hasPlague || highTax) && Math.random() < this.SB('pemberontakan_petani', 'peluang_muncul', 0.15)) {
      const sz = this.SB('pemberontakan_petani', 'ukuran', [200, 800]) as [number, number];
      this.G.peasantRevolt = { active: true, turns: 0, size: R(sz[0], sz[1]) };
      out.push(`PEMBERONTAKAN PETANI! ${this.G.peasantRevolt.size} petani mengangkat senjata.`);
      this.dynLog(this.me().dinasti, 'Pemberontakan petani meletus');
    }
    return out;
  }

  private protestantReformationTick(): string[] {
    if (this.G.tahun < this.SB('reformasi', 'tahun', 1517) || this.G.protestantStarted) return [];
    if (Math.random() < this.SB('reformasi', 'peluang', 0.3)) {
      this.G.protestantStarted = true;
      let convCount = 0;
      let provCount = 0;
      Object.values(this.C).forEach((c) => {
        if (!c.hidup || c.agama !== 'katolik') return;
        if (this.tierOf(c) >= 3 && Math.random() < this.SB('reformasi', 'peluang_bangsawan', 0.2)) {
          c.agama = 'protestan';
          convCount++;
        }
      });
      Object.values(this.P).forEach((arr) =>
        arr.forEach((v) => {
          if (v.agama === 'katolik' && Math.random() < this.SB('reformasi', 'peluang_provinsi', 0.25)) {
            v.agama = 'protestan';
            provCount++;
          }
        })
      );
      this.dynLog(this.me().dinasti, 'Reformasi Protestan dimulai di Eropa (1517)');
      return [`REFORMASI PROTESTAN dimulai! ${convCount} bangsawan dan ${provCount} provinsi memeluk Protestan.`];
    }
    return [];
  }

  private thirtyYearsTick(): string[] {
    if (!this.G.thirtyYearsWar) return [];
    const w = this.G.thirtyYearsWar;
    const out: string[] = [];
    w.turns++;
    const roll = Math.random() + ((w.power - w.enemy) / Math.max(w.power + w.enemy, 1)) * 0.5;
    if (roll > 0.5) {
      w.power += R(100, 300);
      w.enemy = Math.max(0, w.enemy - R(80, 200));
      out.push(`Perang 30 Tahun thn ${w.turns}/10: menang (${Math.round(w.power)} vs ${Math.round(w.enemy)})`);
    } else {
      w.power = Math.max(0, w.power - R(80, 250));
      w.enemy += R(80, 200);
      out.push(`Perang 30 Tahun thn ${w.turns}/10: kalah (${Math.round(w.power)} vs ${Math.round(w.enemy)})`);
    }
    if (w.turns >= 10 || w.power <= 10 || w.enemy <= 10) {
      const p = this.me();
      if (w.power > w.enemy) {
        out.push('PERANG 30 TAHUN MENANG! Protestan unggul di Eropa.');
        p.res.prestise += 200;
        p.res.emas += 400;
        p.res.kesalehan += 50;
        this.deed(p.id, 'wars_won', 3);
        this.dynLog(p.dinasti, 'Menang Perang 30 Tahun — Protestan menang di Eropa');
        this.G.reformed.push({ id: 'protestan', year: this.G.tahun, founder: p.id, parent: 'katolik' });
      } else {
        out.push('PERANG 30 TAHUN KALAH.');
        p.res.prestise = Math.max(0, p.res.prestise - 100);
        p.res.emas *= 0.5;
        this.deed(p.id, 'wars_lost', 2);
        this.dynLog(p.dinasti, 'Kalah Perang 30 Tahun');
      }
      this.G.thirtyYearsWar = null;
    }
    return out;
  }

  // ============ HISTORICAL WARS ============
  public hwKerajaan(c: Character): string | null {
    let t: Title | undefined = this.held(c.id).sort((a, b) => b.tier - a.tier)[0] || (c.loc ? this.T[c.loc] : undefined);
    let n = 0;
    while (t && t.tier < 6 && t.atas && n++ < 10) t = this.T[t.atas];
    return t && t.tier >= 6 ? t.id : null;
  }

  private hwPow = (c: Character, b = 0): number =>
    (c.sk.perang || 10) + 0.15 * c.res.prestise + 2 * this.held(c.id).length + b;

  private hwLead(df: AnyRule, w: AnyRule, s: string): Character | null {
    if (df.jenis !== 'perang_saudara') {
      const t = this.T[df.sisi[s].gelar];
      const c = t?.pem ? this.C[t.pem] : null;
      return c && c.hidup ? c : null;
    }
    const c = this.C[w.p[s]];
    if (c && c.hidup) return c;
    const n = c ? this.heir(c, false) : null;
    if (n && n.hidup) {
      w.p[s] = n.id;
      return n;
    }
    return null;
  }

  private hwLog(t: string): void {
    this.G.hwLog = this.G.hwLog || [];
    this.G.hwLog.unshift(t);
  }

  private hwStart(df: AnyRule, out: string[]): AnyRule | null {
    const ks = Object.keys(df.sisi);
    const w: AnyRule = { aktif: true, mulai: this.G.tahun, skor: { [ks[0]]: 0, [ks[1]]: 0 }, p: {} };
    let a: Character | null = null;
    let b: Character | null = null;
    if (df.jenis === 'perang_saudara') {
      const t = this.T[df.takhta];
      const k = t?.pem ? this.C[t.pem] : null;
      if (!k || !k.hidup) return null;
      const cands = t.kids
        .map((i) => this.T[i])
        .filter((x) => x && x.pem && this.C[x.pem]?.hidup && x.pem !== k.id)
        .map((x) => this.C[x.pem!])
        .sort((x, y) => y.res.prestise + y.sk.perang - (x.res.prestise + x.sk.perang));
      if (!cands.length) return null;
      a = k;
      b = cands[0];
      w.p[ks[0]] = a.id;
      w.p[ks[1]] = b.id;
    } else {
      a = this.hwLead(df, w, ks[0]);
      b = this.hwLead(df, w, ks[1]);
      if (!a || !b) return null;
    }
    a.op[b.id] = b.op[a.id] = -60;
    this.G.hw = this.G.hw || {};
    this.G.hw[df.id] = w;
    const txt = `${df.nama} pecah! ${df.pembukaan} (${df.sisi[ks[0]].nama}: ${this.full(a)} vs ${df.sisi[ks[1]].nama}: ${this.full(b)})`;
    out.push(txt);
    this.hwLog(`${this.G.tahun}: ${txt}`);
    if (this.me()) this.dynLog(this.me().dinasti, `${df.nama} pecah`);
    return w;
  }

  private hwEnd(df: AnyRule, w: AnyRule, out: string[]): void {
    const ks = Object.keys(df.sisi);
    const win =
      w.skor[ks[0]] > w.skor[ks[1]]
        ? ks[0]
        : w.skor[ks[0]] < w.skor[ks[1]]
          ? ks[1]
          : df.pemenang_sejarah;
    const los = ks.find((k) => k !== win)!;
    const lw = this.hwLead(df, w, win);
    const ll = this.hwLead(df, w, los);
    const hs = df.hasil || {};
    const p = this.me();
    const give = (c: Character | null, o: Record<string, number>) => {
      if (c && o) for (const [k, v] of Object.entries(o)) this.ap(c, k, v);
    };
    give(lw, hs.pemenang);
    give(ll, hs.kalah);
    if (df.jenis === 'perang_saudara' && lw) {
      const t = this.T[df.takhta];
      if (t) t.pem = lw.id;
      if (ll && ll.id !== this.G.pid && Math.random() < (df.peluang_kalah_tewas ?? 0.5)) {
        this.hwLog(`${this.G.tahun}: ${this.full(ll)} gugur setelah kekalahan.`);
        this.die(ll, this.umur(ll));
      }
    }
    if (p.tag && p.tag[df.id]) {
      const m = p.tag[df.id] === win ? 'menang' : 'kalah';
      give(p, hs.pendukung?.[m]);
      out.push(m === 'menang' ? 'Pihak yang kamu dukung menang. Kamu diganjar.' : 'Pihak yang kamu dukung kalah. Kamu dihukum.');
    }
    w.aktif = false;
    w.selesai = this.G.tahun;
    w.pemenang = win;
    const txt = (df.penutup && df.penutup[win]) || `${df.nama} berakhir.`;
    out.push(txt);
    this.hwLog(`${this.G.tahun}: ${txt}`);
    if (p) this.dynLog(p.dinasti, `${df.nama} berakhir (${df.sisi[win].nama} menang)`);
  }

  private warHistTick(): string[] {
    this.G.hw = this.G.hw || {};
    const out: string[] = [];
    (this.D.perang_sejarah || []).forEach((df: AnyRule) => {
      let w = this.G.hw![df.id];
      if (!w) {
        if (this.G.tahun < df.mulai || this.G.tahun > df.akhir) return;
        w = this.hwStart(df, out) as AnyRule;
        if (!w) return;
      }
      if (!w.aktif) return;
      const ks = Object.keys(df.sisi);
      (df.pertempuran || [])
        .filter((b: AnyRule) => b.tahun === this.G.tahun)
        .forEach((b: AnyRule) => {
          const hist = Math.random() < (df.ikut_sejarah ?? 0.7);
          const win = hist ? b.menang : ks.find((k) => k !== b.menang)!;
          w.skor[win] += b.bobot || 3;
          const t = `${b.nama}: ${hist ? b.cerita || `${df.sisi[win].nama} unggul.` : `Sejarah berbalik! ${df.sisi[win].nama} unggul.`}`;
          out.push(t);
          this.hwLog(`${this.G.tahun}: ${t}`);
          if (b.takhta && df.takhta) {
            const l = this.hwLead(df, w, win);
            const t2 = this.T[df.takhta];
            if (l && t2 && t2.pem !== l.id) {
              t2.pem = l.id;
              const m = `Takhta berpindah ke ${this.full(l)}.`;
              out.push(m);
              this.hwLog(`${this.G.tahun}: ${m}`);
            }
          }
        });
      if (Math.random() < (df.bentrok ?? 0.5)) {
        const a = this.hwLead(df, w, ks[0]);
        const b = this.hwLead(df, w, ks[1]);
        if (a && b) {
          const pa = this.hwPow(a, (df.bias || {})[ks[0]]);
          const pb = this.hwPow(b, (df.bias || {})[ks[1]]);
          const win = Math.random() < pa / (pa + pb) ? ks[0] : ks[1];
          w.skor[win] += R(1, 2);
          if (Math.random() < 0.3) {
            out.push(`Bentrokan di medan perang: ${df.sisi[win].nama} unggul.`);
          }
        }
      }
      const diff = Math.abs(w.skor[ks[0]] - w.skor[ks[1]]);
      if (this.G.tahun >= df.akhir || diff >= (df.selesai_jika_selisih || 999)) {
        this.hwEnd(df, w, out);
      }
    });
    return out;
  }

  // ============ DSL RULE ENGINE ============
  private AT_num = (n: number | [number, number]): number => (Array.isArray(n) ? R(n[0], n[1]) : n);
  private AT_sibs = (p: Character): Character[] =>
    Object.values(this.C).filter(
      (c) => c.hidup && c.id !== p.id && ((p.ibu && c.ibu === p.ibu) || (p.ayah && c.ayah === p.ayah))
    );

  public AT_get(p: Character, k: string): AnyRule {
    switch (k) {
      case 'rakyat': return this.G.rakyat.bahagia;
      case 'tier': return this.tierOf(p);
      case 'tahun': return this.G.tahun;
      case 'pasukan': return sumObj(this.G.tr);
      case 'jumlah_anak': return p.anak.length;
      case 'jumlah_saudara': return this.AT_sibs(p).length;
      case 'jumlah_saudara_bertitel': return this.AT_sibs(p).filter((c) => this.tierOf(c) >= 1).length;
      case 'jumlah_wilayah_kecil': return this.held(p.id).filter((t) => t.tier <= 3).length;
      case 'jumlah_penguasa_lain': return Object.values(this.C).filter((c) => c.hidup && this.tierOf(c) >= 3 && c.id !== p.id).length;
      case 'kerajaan_asal': return this.hwKerajaan(p);
      case 'faksi': return this.G.faction;
      case 'profesi': return p.profesi;
      case 'umur': return this.umur(p);
      case 'status_nikah': return p.sn;
      case 'pangkat_karier': {
        const J = this.jenjangOf(p);
        return J ? this.rankIdx(p, J) : 0;
      }
      case 'tahun_di_pangkat':
        return this.G.tahun - ((p[this.AT_KEY] as number | undefined) ?? p.lahir + 18);
      case 'hubungan_penguasa': {
        const t = p.loc ? this.T[p.loc] : null;
        const r = t?.pem ? this.C[t.pem] : null;
        return r ? this.opn(p, r) : 0;
      }
      case 'agama': return p.agama;
      case 'agama_keluarga': return this.AG(p.agama).keluarga;
      case 'kelas': return p.kelas;
      default:
        if (k in p.res) return (p.res as AnyRule)[k];
        if (k in p.sp) return (p.sp as AnyRule)[k];
        if (k in p.sk) return (p.sk as AnyRule)[k];
        return undefined;
    }
  }

  public AT_cek(c: AnyRule, p: Character, X: Record<string, Character | null> = {}): boolean {
    if (c == null) return true;
    if (Array.isArray(c)) return c.every((x) => this.AT_cek(x, p, X));
    if (c.atau) return c.atau.some((x: AnyRule) => this.AT_cek(x, p, X));
    if (c.tidak) return !this.AT_cek(c.tidak, p, X);
    if (c.perang) {
      const w = this.G.hw?.[c.perang];
      return Boolean(w && w.aktif);
    }
    if (c.kosong) {
      const holderId = (this.G as AnyRule)[c.kosong];
      return !(holderId && this.C[holderId]?.hidup);
    }
    if ('peluang' in c) return Math.random() < c.peluang;
    if (c.ada) return Boolean(X[c.ada]);
    const a = c.tanda ? (p.tag || {})[c.tanda] : this.AT_get(p, c.v);
    const b = c.n;
    switch (c.op || '==') {
      case '==': return a == b;
      case '!=': return a != b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '>=': return a >= b;
      case 'dalam': return b.includes(a);
      case 'tidak_dalam': return !b.includes(a);
      default: return false;
    }
  }

  private AT_pilih(type: string, p: Character): Character[] {
    switch (type) {
      case 'saudara': return this.AT_sibs(p);
      case 'musuh': return Object.values(this.C).filter((c) => c.hidup && c.id !== p.id && this.opn(p, c) < -30);
      case 'sekutu': return Object.values(this.C).filter((c) => c.hidup && this.tierOf(c) >= 3 && c.id !== p.id);
      case 'raja': {
        const k = this.hwKerajaan(p);
        const t = k ? this.T[k] : null;
        const c = t?.pem ? this.C[t.pem] : null;
        return c && c.hidup && c.id !== p.id ? [c] : [];
      }
      case 'uskup': return this.G.pen.uskup && this.C[this.G.pen.uskup] ? [this.C[this.G.pen.uskup]] : [];
      case 'marsekal': return this.G.pen.marsekal && this.C[this.G.pen.marsekal] ? [this.C[this.G.pen.marsekal]] : [];
      default: return [];
    }
  }

  private AT_run(list: AnyRule[], x: { p: Character; X: Record<string, Character | null>; msg: string; stop: boolean }): void {
    for (const a of list || []) {
      if (x.stop) break;
      this.AT_one(a, x);
    }
  }

  private AT_one(a: AnyRule, x: { p: Character; X: Record<string, Character | null>; msg: string; stop: boolean }): void {
    const p = x.p;
    if (a.wajib) {
      if (!this.AT_cek(a.wajib, p, x.X)) {
        x.msg = a.gagal || 'Syarat tidak terpenuhi.';
        x.stop = true;
      }
      return;
    }
    if (a.jika) {
      this.AT_run(this.AT_cek(a.jika, p, x.X) ? a.maka : a.lain, x);
      return;
    }
    if (a.pesan !== undefined) {
      x.msg = String(a.pesan).replace(/\{(\w+)\}/g, (m, k) => (x.X[k] ? this.full(x.X[k]!) : m));
      return;
    }
    if (a.ubah) {
      const v = this.AT_num(a.n);
      const t = a.pada ? x.X[a.pada] : p;
      if (!t) return;
      if (a.ubah === 'rakyat') this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + v);
      else if (a.ubah === 'pajak') this.G.paj = Math.max(0, (this.G.paj ?? 1) + v);
      else if (a.ubah in t.res) (t.res as AnyRule)[a.ubah] = Math.max(0, (t.res as AnyRule)[a.ubah] + v);
      else this.ap(t, a.ubah, v);
      return;
    }
    if (a.kurangi_pasukan) {
      const tot = sumObj(this.G.tr);
      const take = Math.min(this.AT_num(a.kurangi_pasukan), tot);
      if (!tot) return;
      for (const k of ['pedang', 'pemanah', 'kavaleri']) {
        this.G.tr[k] -= Math.min(this.G.tr[k], Math.ceil((take * this.G.tr[k]) / tot));
      }
      return;
    }
    if (a.pilih) {
      const r = this.AT_pilih(a.pilih, p).filter(Boolean);
      const t = a.urut === 'pertama' ? r[0] : r.length ? pick(r) : null;
      x.X[a.simpan || a.pilih] = t || null;
      if (!t && a.kosong) {
        x.msg = a.kosong;
        x.stop = true;
      }
      return;
    }
    if ('hubungan' in a) {
      const ts = a.pada === 'semua_saudara' ? this.AT_sibs(p) : [x.X[a.pada]].filter((y): y is Character => Boolean(y));
      ts.forEach((t) => this.bump(t, this.AT_num(a.hubungan)));
      return;
    }
    if (a.aliansi) {
      const t = x.X[a.pada];
      if (t) this.G.al.push({ id: t.id, tp: a.aliansi, y: this.G.tahun, dur: a.durasi || 10 });
      return;
    }
    if (a.beri_wilayah) {
      const s = x.X[a.beri_wilayah];
      const ts = this.held(p.id).filter((t) => t.tier <= 3);
      if (!s || !ts.length) return;
      ts[0].pem = s.id;
      this.bump(s, 40);
      x.msg = `${ts[0].nama} diberikan ke ${this.full(s)}.`;
      return;
    }
    if (a.dukung) {
      const df = (this.D.perang_sejarah || []).find((z: AnyRule) => z.id === a.dukung);
      const w = this.G.hw?.[a.dukung];
      if (!df || !w || !w.aktif) return;
      let s = a.sisi;
      if (s === 'asal') {
        const k = this.hwKerajaan(p);
        s = Object.keys(df.sisi).find((z) => df.sisi[z].gelar === k);
      } else if (s === 'tanda') {
        s = (p.tag || {})[a.dukung];
      }
      if (!s || !(s in w.skor)) return;
      w.skor[s] += this.AT_num(a.n || 1);
      p.tag = p.tag || {};
      p.tag[a.dukung] = s;
      return;
    }
    if (a.jabat) {
      (this.G as AnyRule)[a.jabat] = p.id;
      return;
    }
    if (a.mati) {
      const t = x.X[a.mati];
      if (t && t.hidup) {
        this.die(t, this.umur(t));
      }
    }
  }

  private AT_events(list: AnyRule[]) {
    return (list || []).map((e) => ({
      id: e.id,
      title: e.judul,
      teks: e.teks,
      ulang: e.ulang,
      peluang: e.peluang,
      when: () => this.AT_cek(e.syarat, this.me()),
      pilihan: (e.pilihan || []).map((o: AnyRule) => ({
        teks: o.teks,
        fn: () => {
          const x = { p: this.me(), X: {}, msg: '', stop: false };
          this.AT_run(o.aksi, x);
          return x.msg || 'Selesai.';
        },
      })),
    }));
  }

  private AT_cev(o: AnyRule) {
    const r: typeof this.CEV = {};
    for (const [k, l] of Object.entries(o || {})) {
      r[k] = (l as AnyRule[]).map((e) => ({
        t: e.judul,
        d: e.teks,
        e: e.efek,
        c: e.syarat ? (p: Character) => this.AT_cek(e.syarat, p) : null,
      }));
    }
    return r;
  }

  // ============ PLAYER INTERACTIONS ============
  public evc(i: number): void {
    if (!this.G.ev) return;
    const o = this.G.ev.pilihan[i];
    if (!o) return;
    if (this.G.ev.isChain && o.fn) {
      const res = o.fn();
      this.G.log.push(`${this.G.ev.judul}: ${res}`);
    } else if (o.efek) {
      const p = this.me();
      for (const [k, v] of Object.entries(o.efek)) this.ap(p, k, v);
      this.G.log.push(`${this.G.ev.judul}: ${o.teks}`);
    }
    this.G.ev = null;
    sfx.playClick();
    this.save();
    this.notify();
  }

  public bump(c: Character, v: number): void {
    const p = this.me();
    const n = Math.max(-100, Math.min(100, this.rawOpn(p, c) + v));
    c.op[p.id] = n;
    p.op[c.id] = n;
  }

  public checkMarriageEligibility(
    a: Character,
    b: Character,
    isCommonerRoute = false
  ): {
    ok: boolean;
    morganatic: boolean;
    sameReligion: boolean;
    sameFaithFamily: boolean;
    reason?: string;
    acceptMod: number;
    prestigeDelta: number;
    dynRelDelta: number;
    statusLabel: string;
  } {
    if (!a || !b || !a.hidup || !b.hidup || a.id === b.id) {
      return { ok: false, morganatic: false, sameReligion: false, sameFaithFamily: false, reason: 'Karakter tidak tersedia.', acceptMod: 0, prestigeDelta: 0, dynRelDelta: 0, statusLabel: '-' };
    }
    if (a.gender === b.gender) {
      return { ok: false, morganatic: false, sameReligion: false, sameFaithFamily: false, reason: 'Harus berlawanan jenis kelamin.', acceptMod: 0, prestigeDelta: 0, dynRelDelta: 0, statusLabel: '-' };
    }
    if (this.umur(a) < 16 || this.umur(b) < 16) {
      return { ok: false, morganatic: false, sameReligion: false, sameFaithFamily: false, reason: 'Usia minimal 16 tahun.', acceptMod: 0, prestigeDelta: 0, dynRelDelta: 0, statusLabel: '-' };
    }
    const pa = this.D.profesi.find((x: AnyRule) => x.id === a.profesi);
    const pb = this.D.profesi.find((x: AnyRule) => x.id === b.profesi);
    if ((pa && this.noMarry(pa, a)) || (pb && this.noMarry(pb, b))) {
      return { ok: false, morganatic: false, sameReligion: false, sameFaithFamily: false, reason: 'Salah satu pihak berprofesi selibat.', acceptMod: 0, prestigeDelta: 0, dynRelDelta: 0, statusLabel: '-' };
    }

    const ra = this.AG(a.agama);
    const rb = this.AG(b.agama);
    const sameReligion = a.agama === b.agama;
    const sameFaithFamily = ra.keluarga === rb.keluarga;
    let acceptMod = sameReligion ? 10 : sameFaithFamily ? -12 : -32;
    let dynRelDelta = sameReligion ? 18 : sameFaithFamily ? 10 : 5;

    if (!sameFaithFamily && !isCommonerRoute && this.effectiveStat(a, 'diplomasi') < 30) {
      return {
        ok: false,
        morganatic: false,
        sameReligion,
        sameFaithFamily,
        reason: `Syarat Agama: ${ra.nama} & ${rb.nama} berbeda keluarga iman (butuh Diplomasi ≥ 30 atau paksaan).`,
        acceptMod,
        prestigeDelta: -10,
        dynRelDelta: 0,
        statusLabel: 'Beda Keluarga Agama',
      };
    }

    const aNoble = this.tierOf(a) > 0 || ['bangsawan', 'penguasa', 'ksatria'].includes(a.kelas);
    const bNoble = this.tierOf(b) > 0 || ['bangsawan', 'penguasa', 'ksatria'].includes(b.kelas);
    let morganatic = false;
    let prestigeDelta = 0;
    let statusLabel = 'Pernikahan Setara';

    if (aNoble && !bNoble) {
      morganatic = true;
      prestigeDelta = -8;
      acceptMod -= 15;
      dynRelDelta = Math.max(4, dynRelDelta - 8);
      statusLabel = 'Pernikahan Morganatik (Bangsawan × Rakyat)';
      if (!isCommonerRoute && this.tierOf(a) >= 5) {
        return {
          ok: false,
          morganatic: true,
          sameReligion,
          sameFaithFamily,
          reason: 'Syarat Status Sosial: Raja/Kaisar hanya dapat bertunangan resmi dengan kalangan Bangsawan (gunakan jalur Pernikahan Rakyat untuk morganatik).',
          acceptMod,
          prestigeDelta,
          dynRelDelta,
          statusLabel,
        };
      }
    } else if (!aNoble && bNoble) {
      morganatic = true;
      prestigeDelta = 6;
      acceptMod -= 25;
      statusLabel = 'Pernikahan Lintas Kelas (Rakyat × Bangsawan)';
      if (!isCommonerRoute && this.tierOf(b) >= 5) {
        return {
          ok: false,
          morganatic: true,
          sameReligion,
          sameFaithFamily,
          reason: 'Syarat Status Sosial: Istana Raja/Kaisar menolak lamaran non-bangsawan.',
          acceptMod,
          prestigeDelta,
          dynRelDelta,
          statusLabel,
        };
      }
    } else if (aNoble && bNoble) {
      statusLabel = 'Aliansi Pernikahan Bangsawan';
      dynRelDelta += 6;
      prestigeDelta = 10;
    } else {
      statusLabel = 'Pernikahan Rakyat / Warga Kota';
    }

    return {
      ok: true,
      morganatic,
      sameReligion,
      sameFaithFamily,
      acceptMod,
      prestigeDelta,
      dynRelDelta,
      statusLabel,
    };
  }

  public acc(o: Character, k: string): { f: [string, number][]; t: number } {
    const p = this.me();
    const f: [string, number][] = [];
    const ad = (n: string, v: number) => f.push([n, v]);
    const ra = this.AG(p.agama);
    const rb = this.AG(o.agama);
    const cl2 = (v: number, m: number) => Math.max(-m, Math.min(m, v));

    ad('Dasar', 55);
    ad('Opini', this.opn(o, p) * 0.5);
    ad('Budaya', o.budaya === p.budaya ? 15 : -10);
    let relAcc = p.agama === o.agama ? 20 : ra.keluarga === rb.keluarga ? -10 - (ra.sekte ? 25 : 0) : -40;
    if (
      (p.agama === 'islam' && rb.keluarga === 'kristen') ||
      (o.agama === 'islam' && ra.keluarga === 'kristen')
    ) {
      relAcc = this.G.tahun < 1550 ? -55 : -40;
    } else if (
      (p.agama === 'katolik' && (o.agama === 'protestan' || o.agama === 'anglikan')) ||
      (o.agama === 'katolik' && (p.agama === 'protestan' || p.agama === 'anglikan'))
    ) {
      relAcc = -30;
    }
    ad('Agama', relAcc);
    const dRel = this.getDynastyRelation(p.dinasti, o.dinasti);
    if (dRel) ad('Relasi Dinasti', Math.round(dRel * 0.35));
    const rRel = this.getRulerRelation(o.id);
    if (rRel.trust > 0 || rRel.romance > 0) {
      ad('Kepercayaan & Asmara', Math.round(rRel.trust * 0.25 + rRel.romance * 0.3));
    }
    ad('Pengaruh', ra.efek.diplomasi || 0);
    ad('Ukuran', cl2((this.tierOf(p) - this.tierOf(o)) * 10, 30));
    ad('Tentara', cl2(((this.pwr(p) - this.pwr(o)) / (this.pwr(o) + 1)) * 15, 30));
    const kan = this.G.pen.kanselir ? this.C[this.G.pen.kanselir] : null;
    ad('Kanselir', kan ? Math.round((this.effectiveStat(kan, 'diplomasi') * this.officeEfficiency('kanselir')) / 5) : 0);
    if (k === 'nikah') {
      const elig = this.checkMarriageEligibility(p, o, true);
      if (elig.morganatic) ad('Status Sosial (Morganatik)', -15);
      ad('Suksesi', !this.tierOf(o) && [o.ibu, o.ayah].some((i) => i && this.C[i] && this.tierOf(this.C[i])) ? -30 : 10);
    } else {
      ad('Kepentingan', 10);
    }
    return { f, t: f.reduce((s, x) => s + x[1], 0) };
  }

  public closeModal(): void {
    this.G.md = null;
    this.notify();
  }

  public lamar(id: string, force = false): void {
    const p = this.me();
    const o = this.C[id];
    if (!o) return;
    if (p.sn === 'menikah' || o.sn === 'menikah') return this.msg('Sudah menikah.');
    if (this.LAW('poligami') === 'dilarang' && [p, o].some((x) => x.sn === 'menikah')) {
      return this.msg('Poligami dilarang.');
    }
    const elig = this.checkMarriageEligibility(p, o, force);
    if (!elig.ok && !force) return this.msg(elig.reason || 'Tidak memenuhi syarat pernikahan.');

    const mahar = this.RP().mahar_emas_default || 20;
    if (p.res.emas < mahar && !force) return this.msg(`Butuh mahar ${mahar} emas.`);
    const r = this.acc(o, 'nikah');
    if (r.t >= 100 || force) {
      if (force) {
        p.res.prestise -= 15;
        o.op[p.id] = (o.op[p.id] || 0) - 40;
      }
      p.res.emas -= mahar;
      p.res.prestise = Math.max(0, p.res.prestise + elig.prestigeDelta);
      p.sn = o.sn = 'bertunangan';
      p.pasangan = id;
      o.pasangan = p.id;
      this.G.tun.push({ a: p.id, b: id, y: this.G.tahun });
      this.G.al.push({ id, tp: 'pernikahan', y: this.G.tahun, dur: 99 });
      this.adjustDynastyRelation(p.dinasti, o.dinasti, Math.max(5, Math.round(elig.dynRelDelta / 2)));
      this.G.md = null;
      return this.msg(
        `Pertunangan (${elig.statusLabel}) dengan ${this.full(o)} diterima! (mahar ${mahar} emas, +${Math.max(5, Math.round(elig.dynRelDelta / 2))} Relasi Dinasti)`
      );
    }
    this.G.md = {
      kind: 'acc_reject',
      targetId: id,
      title: 'Pernikahan Ditolak',
      factors: r.f,
      total: r.t,
      canUltimatum: this.pwr(p) >= 1.5 * this.pwr(o),
      onForceAction: { type: 'lamar' },
    };
    this.notify();
  }

  public batalTun(id: string): void {
    const p = this.me();
    const o = this.C[id];
    if (!o || p.pasangan !== id) return;
    const d = this.RP().batal_tunangan || { denda_prestise: 15, hubungan_keluarga: -40 };
    p.res.prestise = Math.max(0, p.res.prestise - d.denda_prestise);
    p.sn = o.sn = 'lajang';
    p.pasangan = o.pasangan = null;
    this.G.tun = this.G.tun.filter((x) => x.a !== p.id && x.b !== p.id);
    [o.ibu, o.ayah].forEach((i) => {
      if (i && this.C[i]) this.C[i].op[p.id] = (this.C[i].op[p.id] || 0) - 40;
    });
    this.G.al = this.G.al.filter((a) => a.id !== id);
    this.adjustDynastyRelation(p.dinasti, o.dinasti, -25);
    this.msg(`Pertunangan dibatalkan. Prestise -${d.denda_prestise}, hubungan keluarga -40, Relasi Dinasti -25.`);
  }

  public cerai(): void {
    const p = this.me();
    const o = p.pasangan ? this.C[p.pasangan] : null;
    if (!o || p.sn !== 'menikah') return this.msg('Tidak ada pernikahan aktif.');
    const d = this.D.status_pernikahan.find((x: AnyRule) => x.id === 'bercerai');
    p.sn = o.sn = 'bercerai';
    p.pasangan = o.pasangan = null;
    p.marriageHistory = p.marriageHistory || [];
    o.marriageHistory = o.marriageHistory || [];
    const pRec = p.marriageHistory.find((m) => m.spouseId === o.id && !m.endedYear);
    if (pRec) {
      pRec.endedYear = this.G.tahun;
      pRec.reason = 'Bercerai';
    } else {
      p.marriageHistory.push({
        spouseId: o.id,
        spouseName: this.full(o),
        dynastyName: o.dinasti ? this.DY[o.dinasti]?.nama : undefined,
        year: p.marriageStartYear || Math.max(p.lahir + 16, this.G.tahun - 2),
        endedYear: this.G.tahun,
        reason: 'Bercerai',
      });
    }
    const oRec = o.marriageHistory.find((m) => m.spouseId === p.id && !m.endedYear);
    if (oRec) {
      oRec.endedYear = this.G.tahun;
      oRec.reason = 'Bercerai';
    } else {
      o.marriageHistory.push({
        spouseId: p.id,
        spouseName: this.full(p),
        dynastyName: p.dinasti ? this.DY[p.dinasti]?.nama : undefined,
        year: o.marriageStartYear || p.marriageStartYear || Math.max(o.lahir + 16, this.G.tahun - 2),
        endedYear: this.G.tahun,
        reason: 'Bercerai',
      });
    }
    p.res.prestise = Math.max(0, p.res.prestise - (d?.denda_prestise || 10));
    this.G.al = this.G.al.filter((a) => a.id !== o.id);
    this.adjustDynastyRelation(p.dinasti, o.dinasti, -20);
    this.msg(`Kamu bercerai. Prestise -${d?.denda_prestise || 10}, Relasi Dinasti -20.`);
  }

  public prop(id: string, tp: string, force = false): void {
    const p = this.me();
    if (!this.isNoble(p)) return this.msg('Perjanjian aliansi diplomatik hanya tersedia untuk Bangsawan atau penguasa.');
    const o = this.C[id];
    const x = this.D.perjanjian_aliansi.find((y: AnyRule) => y.id === tp);
    if (!o || !x) return;
    if (this.G.al.some((a) => a.id === id && a.tp === tp)) return this.msg('Perjanjian sudah ada.');
    const r = this.acc(o, tp);
    if (r.t < 100 && !force) {
      this.G.md = {
        kind: 'acc_reject',
        targetId: id,
        title: `${x.nama} Ditolak`,
        factors: r.f,
        total: r.t,
        canUltimatum: this.pwr(p) >= 1.5 * this.pwr(o),
        onForceAction: { type: 'prop', tp },
      };
      this.notify();
      return;
    }
    if (force) {
      p.res.prestise -= 15;
      o.op[p.id] = (o.op[p.id] || 0) - 40;
    } else {
      p.res.prestise -= x.biaya_prestise;
    }
    this.G.al.push({ id, tp, y: this.G.tahun, dur: x.durasi });
    if (tp === 'gereja') {
      const t = this.held(p.id).find((z) => z.tier <= 3);
      if (t) {
        const v = this.provs(t)[0];
        if (!v.b.includes('gereja')) v.b.push('gereja');
      }
      p.res.kesalehan += 10;
    }
    this.G.md = null;
    this.msg(`${x.nama} dengan ${this.full(o)} disepakati.`);
  }

  public breakAlliance(id: string, tp: string): void {
    this.G.al = this.G.al.filter((x) => !(x.id === id && x.tp === tp));
    this.me().res.prestise -= 15;
    this.msg('Perjanjian diputus.');
  }

  public executeModalUltimatum(): void {
    const md = this.G.md;
    if (!md) return;
    if (md.onForceAction.type === 'lamar') this.lamar(md.targetId, true);
    else this.prop(md.targetId, md.onForceAction.tp, true);
  }

  public markConqueredProvinces(t: Title, conqueror: Character): void {
    const walk = (tid: string) => {
      const node = this.T[tid];
      if (!node) return;
      if (node.tier <= 3) {
        this.provs(node).forEach((v) => {
          if (v.culture !== conqueror.budaya || v.agama !== conqueror.agama) {
            v.conqueredYear = this.G.tahun;
            v.unrest = Math.min(90, Math.max(v.unrest || 0, R(35, 50)));
            if (!v.assimilationPolicy) v.assimilationPolicy = null;
          }
        });
      }
      node.kids.forEach(walk);
    };
    walk(t.id);
  }

  public war(tid: string, cb: string, force = false): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) {
      return this.msg('Deklarasi perang hanya dimiliki oleh Bangsawan penguasa wilayah.');
    }
    const t = this.T[tid];
    const o = t?.pem ? this.C[t.pem] : null;
    const mt = this.held(p.id).sort((a, b) => b.tier - a.tier)[0];
    if (this.G.done.perang) return this.msg('Hanya satu perang/tahun.');
    if (!mt) return this.msg('Butuh gelar untuk berperang.');
    if (!o) return this.msg('Tidak ada lawan.');
    if (this.G.al.some((a) => a.id === o.id && ['perlindungan', 'pernikahan', 'militer'].includes(a.tp))) {
      return this.msg('Terikat perjanjian.');
    }
    const nap = (this.G.secretTreaties || []).find((st) => st.active && st.withId === o.id && st.type === 'non_aggression');
    if (nap) {
      if (!force) return this.msg(`Terikat Pakta Non-Agresi Rahasia dengan ${this.full(o)}. Putuskan dahulu di menu Spionase.`);
      nap.active = false;
      this.G.legitimacy = Math.max(0, (this.G.legitimacy ?? 80) - 25);
      p.res.prestise = Math.max(0, p.res.prestise - 30);
      this.adjustDynastyRelation(p.dinasti, o.dinasti, -30);
    }
    const tp = this.tierOf(p);
    const cap = tp ? this.getTitleRights(tp, Boolean(mt?.marquis)).maksProvinsi : 0;
    const cur = Object.values(this.T).filter((x) => x.tier === 3 && !x.titular && x.pem === p.id).length;
    if (t.tier <= 3 && !t.titular && cur >= cap) return this.msg(`Batas provinsi tercapai (${cur}/${cap}).`);

    if (cb === 'tak') {
      if (p.res.prestise < 20 && !force) return this.msg('Butuh 20 prestise.');
      p.res.prestise -= 20;
    }
    if (cb === 'klaim' && !(this.G.claims[p.id] || []).some((c) => c.id === tid)) return this.msg('Tidak ada klaim sah.');
    if (cb === 'suci') {
      if (this.AG(p.agama).keluarga === this.AG(o.agama).keluarga) return this.msg('Bukan beda agama.');
      p.res.kesalehan += 20;
    }
    if (cb === 'batal') {
      if (!this.G.tun.some((x) => x.a === o.id || x.b === o.id)) return this.msg('Tidak ada pertunangan yang dibatalkan.');
      p.res.prestise -= 10;
    }
    if (cb === 'pemberontakan' && !(t.atas && this.T[t.atas]?.pem === p.id)) return this.msg('Bukan vasalmu.');
    if (cb === 'pembebasan' && !Object.keys(this.G.jail).some((i) => this.C[i] && this.kin(this.C[i], p))) {
      return this.msg('Tidak ada kerabat ditahan.');
    }

    this.adjustDynastyRelation(p.dinasti, o.dinasti, -25);

    let ma = 1;
    this.G.al
      .filter((a) => a.tp === 'militer' && this.C[a.id]?.hidup && a.id !== o.id)
      .forEach((a) => {
        const ally = this.C[a.id];
        if (ally.res.prestise >= 0 && Math.random() < 0.7) {
          ma += (this.pwr(ally) / (this.mil(this.army(p), p.budaya) + 1)) * 0.25;
        } else {
          ally.res.prestise -= 25;
          this.bump(ally, -50);
          this.G.log.push(`Sekutu ${this.full(ally)} menolak panggilan (-25 prestise mereka).`);
        }
      });

    const L: string[] = [];
    const A = this.army(p);
    let r = 1;
    if (this.massa(t) !== this.massa(mt)) {
      const need = sumObj(A);
      if (this.kap() < need * 0.3) return this.msg('Butuh kapal angkut ≥30%.');
      r = Math.min(1, this.kap() / need);
      const fl = this.tierOf(o) * 12 * (0.5 + this.hv(o.id) / 100);
      if (Math.random() > this.navy() / (this.navy() + fl)) {
        const k = this.D.kapal.find((x: AnyRule) => this.G.sh[x.id]);
        if (k) this.G.sh[k.id]--;
        this.G.done.perang = 1;
        return this.msg('Armada kalah di laut.');
      }
      L.push('Armada menang.');
    }

    const A2: Record<string, number> = {};
    for (const k in A) A2[k] = A[k] * r;
    const sp = this.G.pen.mata && this.C[this.G.pen.mata] ? this.effectiveStat(this.C[this.G.pen.mata], 'spionase') / 300 : 0;
    const f = this.fight(A2, this.army(o), ma * (this.pwr(p) / (this.mil(this.army(p), p.budaya) || 1)), 1 - sp);
    const lost = 1 - sumObj(f.a) / (sumObj(A2) || 1);
    for (const k in this.G.tr) this.G.tr[k] = Math.round(this.G.tr[k] * (1 - lost));

    sfx.playDrum();
    if (f.win) {
      const prevDynId = o.dinasti;
      const prevDynName = prevDynId && this.DY[prevDynId] ? this.DY[prevDynId].nama : undefined;
      if (!this.G.rulers[t.id]) this.G.rulers[t.id] = [];
      this.G.rulers[t.id].push({
        id: o.id,
        nama: o.regnalNames?.[t.id] || o.nama,
        julukan: '',
        dari: Math.max(o.lahir + 16, this.G.tahun - 5),
        sampai: this.G.tahun,
        sebab: 'ditaklukkan',
        regnalNumber: this.getEffectiveRegnalNumber(o, t),
        dinasti: o.dinasti,
      });
      if (this.G.rulers[t.id].length > 120) this.G.rulers[t.id] = this.G.rulers[t.id].slice(-120);

      t.pem = p.id;
      this.markConqueredProvinces(t, p);
      const becamePrimary = t.tier > (mt?.tier || 0) || this.G.primary === tid;
      if (t.tier > (mt?.tier || 0)) this.G.primary = tid;
      else if (this.G.primary === tid) this.G.primary = tid;
      if (becamePrimary && t.tier >= 3) {
        this.G.pendingCoronation = {
          charId: p.id,
          titleId: t.id,
          prevDynastyId: prevDynId,
          prevDynastyName: prevDynName,
          birthName: p.nama,
          isDifferentDynasty: Boolean(prevDynId && p.dinasti && prevDynId !== p.dinasti),
          preferredMode: p.preferredRegnalMode,
        };
      }
      p.res.prestise += 20;
      const loot = Math.round(((t.kas || o.res.emas) * 0.25) * 10) / 10;
      if (t.kas) t.kas = Math.max(0, Math.round((t.kas - loot * 0.5) * 10) / 10);
      this.addStateFunds(Math.max(10, loot), p);
      o.res.emas = Math.max(0, o.res.emas * 0.7);
      o.op[p.id] = -50;
      this.G.al = this.G.al.filter((a) => a.id !== o.id);
      this.G.morale = Math.min(100, (this.G.morale ?? 80) + 10);
      L.push(`Kamu merebut ${t.nama}!`);
      this.notifyLog(`Menaklukkan ${t.nama} dalam perang`, '⚔️');
      // Battle fatality check for decisive conquests (e.g., Hastings 1066 William vs Harold II)
      const battleDeathChance = o.id === 'harold' && tid === 'k_inggris' ? 1.0 : t.tier >= 5 ? 0.38 : 0.15;
      if (o.hidup && o.id !== p.id && Math.random() < battleDeathChance) {
        const enemyName = this.full(o);
        this.die(o, this.umur(o));
        L.push(`${enemyName} gugur di medan tempur mempertahankan ${t.nama}!`);
        this.notifyLog(`${enemyName} gugur dalam pertempuran ${t.nama}`, '💀');
      }
      if (this.G.claims[p.id]) this.G.claims[p.id] = this.G.claims[p.id].filter((c) => c.id !== tid);
      if (p.dinasti && this.DY[p.dinasti]) this.DY[p.dinasti].prestise += 15;
      this.deed(p.id, 'wars_won', 1);
      this.deed(p.id, 'titles', 1);
      this.dynLog(p.dinasti, `${this.full(p)} menaklukkan ${t.nama} dalam perang`);
    } else {
      const lossGold = Math.round(this.stateTreasury(p) * 0.2);
      if (lossGold > 0) this.spendStateFunds(lossGold, p);
      p.res.prestise -= 20;
      this.G.morale = Math.max(20, (this.G.morale ?? 80) - 12);
      L.push('Kamu kalah.');
      this.deed(p.id, 'wars_lost', 1);
      this.dynLog(p.dinasti, `${this.full(p)} kalah dalam perang di ${t.nama}`);
    }

    this.G.war = { tid, turns: 0 };
    this.G.done.perang = 1;
    this.G.log = [...L, ...f.l];
    this.checkAchievements();
    this.save();
    this.home();
  }

  public siege(tid: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Pengepungan hanya untuk penguasa wilayah.');
    const t = this.T[tid];
    const o = t?.pem ? this.C[t.pem] : null;
    if (!o || o.id === p.id) return this.msg('Tidak ada target.');
    if (this.G.sieges[tid]) return this.msg('Sudah mengepung.');
    if (!(this.G.tr.meriam > 0) && this.lv() < 3) return this.msg('Butuh Meriam (era akhir).');
    const cost = sumObj(this.G.tr) * 0.3;
    if (p.res.emas < cost) return this.msg('Biaya logistik kurang.');
    p.res.emas -= cost;
    this.G.sieges[tid] = { turns: 0 };
    sfx.playDrum();
    this.msg(`Pengepungan ${t.nama} dimulai.`);
  }

  public greatWar(tid: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Perang Besar hanya dapat dideklarasikan penguasa wilayah.');
    const t = this.T[tid];
    const o = t?.pem ? this.C[t.pem] : null;
    if (!o) return this.msg('Target tidak valid.');
    if (this.G.done.greatWar) return this.msg('Perang Besar sudah tahun ini.');
    if (this.G.greatWars.length) return this.msg('Sudah ada Perang Besar aktif.');
    const myAllies = this.G.al
      .filter((a) => a.tp === 'militer' && this.C[a.id]?.hidup && a.id !== o.id)
      .map((a) => this.C[a.id]);
    if (myAllies.length < 2) return this.msg('Butuh minimal 2 sekutu militer.');
    if (p.res.prestise < 30) return this.msg('Butuh 30 prestise.');
    if (sumObj(this.G.tr) < 100) return this.msg('Butuh 100 pasukan.');
    p.res.prestise -= 30;
    const theirAllies = Object.values(this.C)
      .filter((c) => c.hidup && c.id !== o.id && c.id !== p.id && c.op[o.id] >= 40 && this.tierOf(c) >= 3)
      .slice(0, 5);
    const myPower = sumObj(this.G.tr) + myAllies.reduce((s, a) => s + this.pwr(a), 0);
    const theirPower = this.pwr(o) + theirAllies.reduce((s, a) => s + this.pwr(a), 0);
    this.G.greatWars.push({
      tid,
      target: t.nama,
      enemy: o.id,
      myAllies: myAllies.map((a) => a.id),
      theirAllies: theirAllies.map((a) => a.id),
      myPower,
      theirPower,
      turns: 0,
    });
    this.G.done.greatWar = 1;
    this.G.log = [`PERANG BESAR dimulai! ${myAllies.length} sekutu vs ${theirAllies.length} musuh.`];
    this.dynLog(p.dinasti, `${this.full(p)} memulai Perang Besar melawan ${this.full(o)}`);
    sfx.playDrum();
    this.save();
    this.home();
  }

  public callCrusade(tid: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Hanya Bangsawan penguasa wilayah yang dapat memanggil Perang Salib.');
    const target = this.CRUSADE_TARGETS.find((x) => x.id === tid);
    if (!target) return this.msg('Target tidak valid.');
    if (this.AG(p.agama).keluarga !== 'kristen' || p.agama !== 'katolik') {
      return this.msg('Hanya Kristen Katolik yang bisa memanggil perang salib.');
    }
    if (this.G.crusades.some((c) => c.id === tid)) return this.msg('Perang salib ke sana sudah berlangsung.');
    if (p.res.kesalehan < 50) return this.msg('Butuh 50 kesalehan.');
    if (p.res.prestise < 30) return this.msg('Butuh 30 prestise.');
    if (sumObj(this.G.tr) < 100) return this.msg('Butuh minimal 100 pasukan.');
    p.res.kesalehan -= 50;
    p.res.prestise -= 30;
    const allies: { id: string; nama: string; power: number }[] = [];
    Object.values(this.C).forEach((c) => {
      if (c.id === p.id || !c.hidup) return;
      if (this.AG(c.agama).keluarga !== 'kristen' || !this.tierOf(c) || this.pwr(c) < 100) return;
      if (Math.random() < 0.4) {
        allies.push({ id: c.id, nama: this.full(c), power: this.pwr(c) });
        c.op[p.id] = (c.op[p.id] || 0) + 10;
      }
    });
    const totalPower = sumObj(this.G.tr) + allies.reduce((s, a) => s + a.power, 0);
    this.G.crusades.push({ id: tid, target, turns: 0, allies, power: totalPower, lead: p.id });
    this.G.log = [`Perang Salib dipanggil! ${allies.length} sekutu bergabung.`];
    this.dynLog(p.dinasti, `${this.full(p)} memanggil Perang Salib ke ${target.nama}`);
    sfx.playDrum();
    this.save();
    this.home();
  }

  public contributeCrusade(tid: string): void {
    const p = this.me();
    const c = this.G.crusades.find((x) => x.id === tid);
    if (!c) return this.msg('Tidak ada perang salib.');
    if (!this.spendStateFunds(20, p)) return this.msg('Dana tidak cukup (butuh 20 emas).');
    c.power += R(30, 70);
    c.allies.push({ id: p.id, nama: this.full(p), power: 60, late: true });
    p.res.kesalehan += 5;
    p.res.prestise += 2;
    this.msg('Kamu mengirim bantuan. +5 kesalehan, +2 prestise.');
  }

  public quellRevolt(mode: 'force' | 'negi' | 'tax'): void {
    const p = this.me();
    const r = this.G.peasantRevolt;
    if (!r || !r.active) return this.msg('Tidak ada pemberontakan.');
    if (mode === 'force') {
      const tot = sumObj(this.G.tr);
      if (tot < r.size) return this.msg(`Pasukan tidak cukup (${tot} vs ${r.size}).`);
      const take = Math.ceil(r.size * 0.7);
      for (const k of ['pedang', 'pemanah', 'kavaleri']) {
        this.G.tr[k] -= Math.min(this.G.tr[k], Math.ceil((take * this.G.tr[k]) / tot));
      }
      r.active = false;
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 10);
      p.res.prestise += 5;
      this.dynLog(p.dinasti, 'Pemberontakan petani ditumpas dengan kekerasan');
      sfx.playDrum();
      this.msg('Pemberontakan ditumpas. -10 kebahagiaan, +5 prestise.');
    } else if (mode === 'negi') {
      if (!this.spendStateFunds(50, p)) return this.msg('Kas Negara tidak cukup (butuh 50 emas).');
      r.active = false;
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 15);
      this.dynLog(p.dinasti, 'Pemberontakan petani diselesaikan via negosiasi');
      this.msg('Negosiasi berhasil (dari Kas Negara). +15 kebahagiaan rakyat.');
    } else {
      this.G.paj = Math.max(0, (this.G.paj ?? 1) - 1);
      r.active = false;
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 10);
      this.msg('Pajak diturunkan. Pemberontakan reda.');
    }
  }

  public trigger30YearsWar(): void {
    const p = this.me();
    if (p.agama !== 'protestan') return this.msg('Hanya Protestan yang bisa memicu Perang 30 Tahun.');
    if (this.G.thirtyYearsWar) return this.msg('Perang 30 Tahun sudah berlangsung.');
    if (p.res.prestise < 50) return this.msg('Butuh 50 prestise.');
    if (sumObj(this.G.tr) < 100) return this.msg('Butuh 100 pasukan.');
    p.res.prestise -= 50;
    this.G.thirtyYearsWar = { turns: 0, power: sumObj(this.G.tr) * 2, enemy: 3000 };
    this.G.log = ['PERANG 30 TAHUN dimulai! Koalisi Katolik menyerang Protestan.'];
    this.dynLog(p.dinasti, 'Memimpin Perang 30 Tahun membela Protestan');
    sfx.playDrum();
    this.save();
    this.home();
  }

  public rec(k: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) {
      return this.msg('Rekrutmen pasukan negara hanya terbuka bagi Bangsawan penguasa wilayah.');
    }
    const u = this.D.pasukan_jenis.find((x: AnyRule) => x.id === k).tingkat[this.lv() - 1];
    const eff = this.provEffects(p);
    const cost = Math.round(u.biaya_rekrut * 2 * (1 - eff.biaya_rekrut_persen / 100));
    const t = this.tierOf(p);
    if (k === 'kavaleri') {
      const mRest = this.checkMilitaryRestriction('recruit_kavaleri', p);
      if (!mRest.ok) return this.msg(mRest.reason || 'Akses pasukan kavaleri dikunci.');
    }
    const cap = t ? this.tn(t).pasukan_maks + eff.maks_pasukan : 0;
    if (!t) return this.msg('Butuh gelar.');
    if (!this.spendStateFunds(cost, p)) {
      return this.msg(`Kas Negara/Wilayah tidak cukup (butuh ${cost} emas). Setorkan dana pribadi atau tunggu pajak.`);
    }
    if (sumObj(this.G.tr) + 50 > cap) {
      this.addStateFunds(cost, p);
      return this.msg(`Batas pasukan (${cap}).`);
    }
    if (this.G.faction === 'militer') {
      const refund = Math.floor(cost * 0.1);
      if (refund > 0) this.addStateFunds(refund, p);
    }
    this.G.tr[k] += 50;
    this.msg(`Merekrut 50 ${u.nama} (dibayar dari Kas Negara: ${cost} emas).`);
  }

  public bd(tid: string, i: number, b: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Pembangunan infrastruktur wilayah hanya untuk penguasa wilayah.');
    const v = this.provs(this.T[tid])[i];
    const x = this.bi(b);
    const q = this.G.q.filter((y) => y.tid === tid && y.i === i).length;
    if (v.b.length + q >= this.slotProv(v)) return this.msg('Slot bangunan penuh.');
    if (x.butuh_pesisir && v.pes === false) return this.msg('Butuh pesisir.');
    if (x.butuh_bangunan && !v.b.includes(x.butuh_bangunan)) {
      return this.msg(`Butuh ${this.bi(x.butuh_bangunan).nama} dulu.`);
    }
    if (!this.spendStateFunds(x.biaya, p)) {
      return this.msg(`Kas Negara tidak cukup (butuh ${x.biaya} emas).`);
    }
    this.G.q.push({ tid, i, b, end: this.G.tahun + x.waktu_tahun });
    this.msg(`Membangun ${x.nama} di ${v.nama} (dari Kas Negara: ${x.biaya} emas).`);
  }

  public buyShip(id: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Armada kapal perang hanya untuk penguasa wilayah pesisir.');
    const k = this.D.kapal.find((x: AnyRule) => x.id === id);
    if (!this.hasCoastalAccess(p)) {
      return this.msg('Wilayah pedalaman tidak memiliki perairan. Hanya wilayah dengan akses laut/pesisir yang dapat memiliki angkatan laut.');
    }
    if (!this.yard()) return this.msg('Butuh Galangan Kapal di provinsi pesisir milikmu terlebih dahulu.');
    if (!this.spendStateFunds(k.biaya, p)) {
      return this.msg(`Kas Negara tidak cukup (butuh ${k.biaya} emas).`);
    }
    this.G.sh[id] = (this.G.sh[id] || 0) + 1;
    this.msg(`Membeli ${k.nama} (dari Kas Negara).`);
  }

  public okB(g: AnyRule): boolean {
    const p = this.me();
    const s = g.syarat;
    return s.kuasai_wilayah.every((i: string) => this.T[i] && this.T[i].pem === p.id) && this.tierOf(p) >= (s.tier_min || 0);
  }

  public bentuk(id: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Pembentukan gelar baru hanya untuk penguasa wilayah.');
    const g = this.D.gelar_dapat_dibentuk.find((x: AnyRule) => x.id === id);
    if (!g || !this.okB(g)) return this.msg('Syarat belum terpenuhi.');
    this.T[id] = {
      id,
      nama: g.nama,
      tier: g.tier,
      pem: p.id,
      atas: null,
      budaya: g.budaya || p.budaya,
      agama: p.agama,
      prov: null,
      kids: [],
    };
    g.syarat.kuasai_wilayah.forEach((i: string) => {
      if (this.T[i]) {
        const o = this.T[i].atas ? this.T[this.T[i].atas!] : null;
        if (o) o.kids = o.kids.filter((k) => k !== i);
        this.T[i].atas = id;
        this.T[id].kids.push(i);
      }
    });
    p.res.prestise += 50;
    if (g.tier > this.tierOf(p) || !this.G.primary) {
      this.G.primary = id;
    }
    this.G.pendingCoronation = {
      charId: p.id,
      titleId: id,
      birthName: p.nama,
      isDifferentDynasty: false,
      preferredMode: p.preferredRegnalMode,
    };
    this.msg(`Membentuk ${g.nama}! Silakan tentukan nama & penomoran regnal takhtamu.`);
  }

  public toggleDoctrine(id: string): void {
    this.G.sel = this.G.sel.includes(id) ? this.G.sel.filter((x) => x !== id) : [...this.G.sel, id].slice(-2);
    this.notify();
  }

  public mkSekte(nm: string): void {
    const p = this.me();
    if (p.res.kesalehan < 100 || p.res.prestise < 50 || !this.G.sel.length) {
      return this.msg('Butuh kesalehan 100, prestise 50, dan 1-2 doktrin.');
    }
    const par = this.AG(p.agama);
    const ef: Record<string, number> = {};
    const id = 'sk' + ++this.G.n;
    this.G.sel.forEach((i) => {
      const dok = this.D.aturan_agama.doktrin.find((x: AnyRule) => x.id === i);
      if (dok) {
        for (const [k, v] of Object.entries(dok.efek as Record<string, number>)) {
          ef[k] = (ef[k] || 0) + v;
        }
      }
    });
    this.G.ag.push({
      id,
      nama: nm || `Sekte ${this.G.ag.length + 1}`,
      keluarga: par.keluarga,
      induk: par.id,
      sekte: true,
      efek: ef,
    });
    p.res.kesalehan -= 100;
    p.res.prestise -= 50;
    p.agama = id;
    this.G.sel = [];
    this.msg('Mendirikan sekte baru.');
  }

  public reformSect(): void {
    const p = this.me();
    const a = this.AG(p.agama);
    if (!a.sekte) return this.msg('Kamu bukan anggota sekte.');
    if (p.res.kesalehan < 300) return this.msg('Butuh 300 kesalehan untuk reformasi.');
    if (p.res.prestise < 100) return this.msg('Butuh 100 prestise.');
    if (this.tierOf(p) < 3) return this.msg('Butuh minimal gelar Count.');
    p.res.kesalehan -= 300;
    p.res.prestise -= 100;
    const newId = 'ref_' + a.id;
    let rel = this.G.ag.find((x) => x.id === newId);
    if (!rel) {
      rel = {
        id: newId,
        nama: a.nama.replace('Sekte', 'Reformasi'),
        keluarga: a.keluarga,
        induk: a.induk,
        reformed: true,
        efek: { ...a.efek },
      };
      this.G.ag.push(rel);
    }
    p.agama = newId;
    this.G.reformed.push({ id: newId, year: this.G.tahun, founder: p.id, parent: a.id });
    let converted = 0;
    Object.values(this.C).forEach((c) => {
      if (c.id === p.id || !c.hidup || c.agama !== a.id) return;
      if (Math.random() < 0.4) {
        c.agama = newId;
        converted++;
      }
    });
    this.held(p.id).forEach((t) => {
      if (t.tier <= 3 && !t.titular) {
        this.provs(t).forEach((v) => {
          if (Math.random() < 0.6) v.agama = newId;
        });
      }
    });
    this.dynLog(p.dinasti, `${this.full(p)} mereformasi sekte menjadi ${rel.nama}`);
    this.deed(p.id, 'charity', 5);
    this.msg(`Reformasi berhasil! ${rel.nama} lahir. ${converted} pengikut bergabung.`);
  }

  public conv(i: string): void {
    const p = this.me();
    const rel = this.AG(i);
    if (rel.reformed) {
      const isFounder = this.G.reformed.some((r) => r.id === i && r.founder === p.id);
      if (!isFounder && p.res.kesalehan < 100) return this.msg('Butuh 100 kesalehan untuk memeluk mazhab reformasi.');
      if (!isFounder) p.res.kesalehan -= 100;
    }
    if (p.res.prestise < 30) return this.msg('Butuh 30 prestise.');
    p.res.prestise -= 30;
    p.sp.kebahagiaan = cl(p.sp.kebahagiaan - 10);
    p.agama = i;
    if (i !== 'katolik') {
      if (this.G.church.pope === p.id) this.G.church.pope = null;
      this.G.church.cardinals = this.G.church.cardinals.filter((id) => id !== p.id);
      this.G.church.bishops = this.G.church.bishops.filter((id) => id !== p.id);
      if (this.G.church.archbishops) {
        Object.keys(this.G.church.archbishops).forEach((rid) => {
          if (this.G.church.archbishops![rid] === p.id) delete this.G.church.archbishops![rid];
        });
      }
      delete this.G.relRank[p.id];
    }
    this.seedFaithLeaders();
    if (this.G.worship?.['local']) {
      const lb = this.worshipLabels(i);
      this.G.worship['local'].name = `${lb.tiers[Math.max(0, Math.min(2, this.G.worship['local'].level - 1))]} Binaan`;
    }
    const extraNote = i === 'islam' && this.G.tahun < 1550
      ? ' Penguasa Katolik Eropa akan mengucilkanmu (-50 opini).'
      : '';
    this.msg(`Berpindah ke ${this.AG(i).nama}.${extraNote}`);
  }

  public alignFaksi(id: string): void {
    const p = this.me();
    if (this.G.faction === id) return this.msg('Sudah memihak faksi itu.');
    if (id === 'militer') {
      const rest = this.checkMilitaryRestriction('faction_militer', p);
      if (!rest.ok) return this.msg(rest.reason || 'Akses Faksi Militer dikunci.');
    }
    if (id === 'gereja' && this.AG(p.agama).keluarga !== 'kristen') {
      return this.msg('Faksi Gereja istana hanya terbuka bagi pemeluk Kristen.');
    }
    if (this.G.faction) p.res.prestise = Math.max(0, p.res.prestise - 5);
    this.G.faction = id;
    if (id === 'militer') p.sk.perang = cl(p.sk.perang + 2);
    else if (id === 'gereja') {
      p.res.kesalehan += 10;
      p.sk.diplomasi = cl(p.sk.diplomasi + 3);
    }
    this.msg(`Kamu memihak ${this.FAKSI[id]?.nama || id}.`);
  }

  public quarantine(tid: string): void {
    const p = this.me();
    if (!this.G.plague[tid]) return this.msg('Tidak ada wabah di sana.');
    if (p.res.emas < 20) return this.msg('Butuh 20 emas.');
    p.res.emas -= 20;
    delete this.G.plague[tid];
    p.res.prestise += 2;
    this.deed(p.id, 'plague_fought', 1);
    this.msg(`Wabah di ${this.T[tid] ? this.T[tid].nama : tid} dikarantina.`);
  }

  public dynFund(): void {
    const p = this.me();
    const d = p.dinasti ? this.DY[p.dinasti] : null;
    if (!d) return this.msg('Tidak ada dinasti.');
    const pct = this.RD().dana_dinasti?.iuran_persen_emas || 5;
    const amt = Math.round((p.res.emas * pct) / 100);
    if (amt <= 0) return this.msg('Emas tidak cukup.');
    p.res.emas -= amt;
    d.fund = (d.fund || 0) + amt;
    this.msg(`Iuran dinasti: ${amt} emas.`);
  }

  public dynCadet(childId?: string): void {
    const p = this.me();
    const d = p.dinasti ? this.DY[p.dinasti] : null;
    if (!d) return this.msg('Tidak ada dinasti.');
    const req = this.RD().cabang_dinasti?.syarat || { emas: 100, tier_min: 1 };
    if (this.tierOf(p) < req.tier_min) return this.msg(`Butuh tier ≥ ${req.tier_min}`);
    if (p.res.emas < req.emas) return this.msg(`Butuh ${req.emas} emas.`);
    if (!childId) {
      const cands = Object.values(this.C).filter(
        (c) => c.hidup && c.id !== p.id && c.dinasti === p.dinasti && this.umur(c) >= 16
      );
      if (!cands.length) return this.msg('Tidak ada anggota dewasa.');
      this.go('cadetPick');
      return;
    }
    const c = this.C[childId];
    if (!c || !c.hidup || c.dinasti !== p.dinasti) return this.msg('Tidak valid.');
    p.res.emas -= req.emas;
    const root = d.nama.replace(/^(von |van |de |di |da |z |ze |od |ot |of |af |iz |ap |ab |Al-|O')/i, '');
    const nm = `${root}-${pick(['Muda', 'Utara', 'Selatan', 'Timur', 'Barat', 'Tengah'])}`;
    const nid = 'c' + ++this.G.n;
    const newDyn: Dynasty = {
      id: nid,
      nama: this.formatDynastyName(c.budaya || d.budaya || 'german', nm),
      budaya: c.budaya || d.budaya,
      prestise: Math.floor((d.prestise || 0) * 0.3),
      status: d.status || 'bangsawan_lokal',
      moto: '',
      kepala: c.id,
      parent: d.id,
      warna: d.warna || '#888',
    };
    this.DY[nid] = newDyn;
    this.G.cadetBranches[d.id] = this.G.cadetBranches[d.id] || [];
    this.G.cadetBranches[d.id].push(nid);
    c.dinasti = nid;
    Object.values(this.C).forEach((x) => {
      if (x.dinasti === p.dinasti && (x.ayah === childId || x.ibu === childId)) x.dinasti = nid;
    });
    this.dynLog(d.id, `${this.full(c)} mendirikan cabang ${newDyn.nama}`);
    this.dynLog(nid, `Cabang ${newDyn.nama} didirikan oleh ${this.full(c)}`);
    this.msg(`Cabang dinasti ${newDyn.nama} didirikan.`);
  }

  public reunifyDynasty(parentId: string): void {
    const p = this.me();
    const d = this.DY[parentId];
    if (!d) return this.msg('Dinasti induk tidak ada.');
    if (p.dinasti === parentId) return this.msg('Kamu sudah di induk.');
    const oldDyn = p.dinasti ? this.DY[p.dinasti] : null;
    if (!oldDyn || oldDyn.parent !== parentId) return this.msg('Dinastimu bukan cabang dari ini.');
    if (p.res.prestise < 100) return this.msg('Butuh 100 prestise.');
    if (this.tierOf(p) < 3) return this.msg('Butuh minimal Count.');
    p.res.prestise -= 100;
    p.dinasti = parentId;
    Object.values(this.C).forEach((c) => {
      if (c.hidup && c.dinasti === oldDyn.id) c.dinasti = parentId;
    });
    this.dynLog(parentId, `Cabang ${oldDyn.nama} reunifikasi dengan ${d.nama}`);
    this.dynLog(oldDyn.id, 'Cabang reunifikasi dengan induk');
    this.msg(`Dinasti reunifikasi dengan ${d.nama}!`);
  }

  public gift(id: string): void {
    const p = this.me();
    if (p.res.emas < 20) return this.msg('Emas kurang.');
    p.res.emas -= 20;
    p.op[id] = (p.op[id] || 0) + 15;
    this.C[id].op[p.id] = p.op[id];
    this.msg('Hadiah diberikan.');
  }

  public usaha(j: string): void {
    const p = this.me();
    if (!this.canBusiness(p)) {
      return this.msg('Usaha niaga hanya terbuka bagi Warga Kota / Pengusaha atau Bangsawan. Naikkan status sosial di menu Karier.');
    }
    const x = this.D.usaha_pengusaha.jenis.find((y: AnyRule) => y.id === j);
    if (!x) return;
    if (this.G.us.length >= 4) return this.msg('Maks 4 usaha.');
    if (x.butuh_pesisir && !this.held(p.id).some((t) => t.tier <= 3 && !t.titular && this.provs(t).some((v) => v.pes))) {
      return this.msg('Butuh pesisir.');
    }
    if (x.butuh_kota && !this.held(p.id).some((t) => t.tier <= 3 && !t.titular && this.provs(t).some((v) => v.dev >= 30))) {
      return this.msg('Butuh kota (dev ≥ 30).');
    }
    if (p.res.emas < x.biaya) return this.msg('Emas kurang.');
    p.res.emas -= x.biaya;
    this.G.us.push({ j, p: x.pendapatan });
    this.msg(`Usaha dibuka: ${x.nama}`);
  }

  public turun(o: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa berwilayah yang dapat turun tahta.');
    const h = this.heir(p, true);
    const rule = this.RT().syarat || { umur_min: 35 };
    const exc = this.RT().pengecualian_sakit || { kesehatan_maks: 25 };
    if (!h || this.umur(h) < 16) return this.msg('Belum ada ahli waris dewasa.');
    if (this.umur(p) < rule.umur_min && p.sp.kesehatan > exc.kesehatan_maks) {
      return this.msg('Belum memenuhi syarat.');
    }
    if (this.G.war) return this.msg('Tidak bisa turun tahta saat perang.');
    const heldBefore = this.held(p.id).sort((a, b) => b.tier - a.tier);
    heldBefore.forEach((t) => {
      if (!this.G.rulers[t.id]) this.G.rulers[t.id] = [];
      this.G.rulers[t.id].push({
        id: p.id,
        nama: p.regnalNames?.[t.id] || p.nama,
        julukan: '',
        dari: Math.max(p.lahir + 16, this.G.tahun - 5),
        sampai: this.G.tahun,
        sebab: 'turun tahta',
        regnalNumber: this.getEffectiveRegnalNumber(p, t),
        dinasti: p.dinasti,
      });
      t.pem = h.id;
    });
    h.res.emas += p.res.emas * 0.5;
    p.res.emas *= 0.5;
    p.res.prestise *= 0.8;
    if (o === 'biarawan') {
      p.sn = 'selibat';
      p.res.kesalehan += 40;
    } else {
      p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 15);
    }
    this.G.log = [`Turun tahta. Kini bermain sebagai ${this.full(h)}.`];
    this.G.pid = h.id;
    const topH = this.primaryTitle(h) || heldBefore[0];
    if (topH) {
      this.G.pendingCoronation = {
        charId: h.id,
        titleId: topH.id,
        prevDynastyId: p.dinasti,
        prevDynastyName: p.dinasti && this.DY[p.dinasti] ? this.DY[p.dinasti].nama : undefined,
        birthName: h.nama,
        isDifferentDynasty: Boolean(p.dinasti && h.dinasti && p.dinasti !== h.dinasti),
        preferredMode: h.preferredRegnalMode,
      };
    }
    this.save();
    this.home();
  }

  public togglePaj(i: number): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Kebijakan pajak wilayah hanya untuk Bangsawan penguasa.');
    this.G.paj = i;
    this.msg(`Pajak: ${this.PJK()[i]?.nama || '?'}`);
  }

  public isCommoner(c: Character): boolean {
    return this.tierOf(c) === 0 && !['bangsawan', 'penguasa', 'ksatria'].includes(c.kelas);
  }

  public isNoble(c: Character = this.me()): boolean {
    return Boolean(c && (this.tierOf(c) >= 1 || ['bangsawan', 'penguasa', 'ksatria'].includes(c.kelas)));
  }

  public isRuler(c: Character = this.me()): boolean {
    return Boolean(c && this.held(c.id).length > 0);
  }

  public canBusiness(c: Character = this.me()): boolean {
    return Boolean(
      c &&
        (this.isNoble(c) ||
          c.kelas === 'warga_kota' ||
          c.profesi === 'pengusaha' ||
          c.profesi === 'pedagang')
    );
  }

  public isMuslimInCatholicArea(c: Character, locId?: string): boolean {
    if (c.agama !== 'islam') return false;
    const targetLoc = locId || this.held(c.id)[0]?.id || c.loc || '';
    const t = targetLoc ? this.T[targetLoc] : null;
    const realmId = t ? this.realmOf({ loc: targetLoc } as Character).id : this.realmOf(c).id;
    const realmAgama = realmId && this.T[realmId] ? this.T[realmId].agama : t?.agama;
    if (realmAgama === 'katolik' || (realmAgama && this.AG(realmAgama).keluarga === 'kristen')) {
      return true;
    }
    const dom = this.catholicDominanceCheck();
    return dom.catholicDominated;
  }

  public checkMilitaryRestriction(
    action: 'rank' | 'recruit_kavaleri' | 'faction_militer',
    c: Character,
    targetRankId?: string
  ): { ok: boolean; reason?: string } {
    const commoner = this.isCommoner(c);
    const muslimInCath = this.isMuslimInCatholicArea(c);

    if (action === 'rank') {
      if (targetRankId === 'p2' || targetRankId === 'p3') {
        const rankLabel = targetRankId === 'p2' ? 'Kapten' : 'Komandan';
        if (c.kelas === 'rakyat_jelata' && this.tierOf(c) === 0) {
          return {
            ok: false,
            reason: `Terkunci (Status Sosial): Pangkat perwira militer (${rankLabel}) tertutup bagi Rakyat Jelata. Naik status menjadi Warga Kota / Ksatria / Bangsawan terlebih dahulu.`,
          };
        }
        if (muslimInCath) {
          return {
            ok: false,
            reason: `Terkunci (Agama): Pangkat perwira komando (${rankLabel}) dikunci bagi Muslim di wilayah mayoritas Katolik.`,
          };
        }
      }
      return { ok: true };
    }

    if (action === 'recruit_kavaleri') {
      if (commoner) {
        return {
          ok: false,
          reason: 'Terkunci (Status Sosial): Pasukan Kavaleri Ksatria hanya dapat direkrut oleh penyandang status Ksatria/Bangsawan atau pemegang gelar wilayah.',
        };
      }
      if (muslimInCath && this.tierOf(c) < 5) {
        return {
          ok: false,
          reason: 'Terkunci (Agama): Bangsawan Muslim lokal di bawah kekuasaan Katolik dilarang mengerahkan pasukan Kavaleri berat.',
        };
      }
      return { ok: true };
    }

    if (action === 'faction_militer') {
      if (c.kelas === 'rakyat_jelata' && this.tierOf(c) === 0) {
        return {
          ok: false,
          reason: 'Terkunci (Status Sosial): Faksi Militer istana hanya menerima minimal Warga Kota, Ksatria, atau Bangsawan.',
        };
      }
      if (muslimInCath) {
        return {
          ok: false,
          reason: 'Terkunci (Agama): Akses ke Faksi Militer istana dikunci bagi Muslim di wilayah mayoritas Katolik.',
        };
      }
    }
    return { ok: true };
  }

  public checkProfessionRestriction(
    profId: string,
    c: Character,
    locId?: string
  ): { ok: boolean; reason?: string } {
    const commoner = this.isCommoner(c);
    if (profId === 'pengusaha' && commoner) {
      return {
        ok: false,
        reason: 'Terkunci (Status Sosial): Rakyat Jelata belum boleh menjadi Pengusaha penuh (pilih peran Pengusaha di awal atau naik kelas ke Warga Kota).',
      };
    }
    if (profId === 'pendeta') {
      const profRule = (this.D.profesi || []).find((x: AnyRule) => x.id === 'pendeta');
      const celibateRequired = c.agama === 'katolik' || Boolean(profRule && this.noMarry(profRule, c));
      const hasSpouseOrMarried = Boolean(c.pasangan) || ['menikah', 'bertunangan'].includes(c.sn || '');
      if (celibateRequired && hasSpouseOrMarried) {
        return {
          ok: false,
          reason:
            'Terkunci (Status Nikah): Jabatan orang gereja / rohaniwan Katolik wajib berstatus single/lajang (terkunci jika masih menikah atau bertunangan).',
        };
      }
    }
    if (c.agama === 'islam') {
      const targetLoc = locId || c.loc || '';
      const t = targetLoc ? this.T[targetLoc] : null;
      const realmId = t ? this.realmOf({ loc: targetLoc } as Character).id : '';
      const realmAgama = realmId && this.T[realmId] ? this.T[realmId].agama : t?.agama;
      const inChristianRealm = realmAgama ? this.AG(realmAgama).keluarga === 'kristen' : false;
      if (inChristianRealm && profId === 'pelayan_istana') {
        return {
          ok: false,
          reason: 'Terkunci (Agama): Istana penguasa Kristen/Katolik mengunci jabatan Juru Tulis / Pelayan Istana bagi pemeluk Islam.',
        };
      }
      if (inChristianRealm && profId === 'tentara') {
        return {
          ok: false,
          reason: 'Terkunci (Agama): Dinas militer reguler kerajaan Katolik/Kristen dikunci bagi Muslim (tersedia: Tentara Bayaran, Pedagang, Cendekia, atau Ulama).',
        };
      }
    }
    return { ok: true };
  }

  public getOfficeSalary(jid: string, employer?: Character): number {
    const emp = employer || this.me();
    if (!emp) return 6;
    const empTier = this.tierOf(emp) || 3;
    const baseByTier: Record<number, number> = {
      1: 6,
      2: 10,
      3: 16,
      4: 32,
      5: 34,
      6: 62,
      7: 100,
    };
    const base = baseByTier[empTier] ?? 15;
    const empTitles = this.held(emp.id).filter((t) => t.tier <= 3);
    const provList = empTitles.flatMap((t) => this.provs(t));
    const avgEko = provList.length
      ? provList.reduce((s, v) => s + v.eko + v.dev / 12, 0) / provList.length
      : 8;
    const ecoScale = Math.max(0.85, Math.min(1.5, 0.75 + avgEko / 22));
    const roleMult: Record<string, number> = {
      kanselir: 1.2,
      marsekal: 1.15,
      bendahara: 1.2,
      mata: 1.05,
      uskup: 1.0,
    };
    return Math.max(5, Math.round(base * ecoScale * (roleMult[jid] || 1)));
  }

  public getOfficeExperienceReq(
    jid: string,
    candidate: Character
  ): { ok: boolean; label: string; reason?: string } {
    const sk = candidate.sk || { diplomasi: 0, perang: 0, administrasi: 0, spionase: 0, pembelajaran: 0 };
    const isPlayer = candidate.id === this.G.pid;
    const bg = isPlayer ? this.G.background : '';
    const hasRank = Object.values(candidate.rank || {}).some((r) => r >= 1);
    const isTitled = this.held(candidate.id).length > 0;
    const isSeasoned = this.umur(candidate) >= 28;

    switch (jid) {
      case 'kanselir': {
        const hasExp =
          candidate.profesi === 'pelayan_istana' ||
          ['noble', 'scholar'].includes(bg) ||
          isTitled ||
          hasRank ||
          candidate.kelas === 'bangsawan' ||
          candidate.kelas === 'penguasa' ||
          sk.diplomasi >= 48 ||
          (isSeasoned && sk.diplomasi >= 38);
        if (sk.diplomasi < 32 || !hasExp) {
          return {
            ok: false,
            label: 'Diplomasi ≥ 32 + pengalaman Istana/Sarjana/Bangsawan',
            reason:
              'Terkunci (Pengalaman): Jabatan Kanselir mewajibkan Diplomasi ≥ 32 serta pengalaman relevan (Juru Tulis Istana, Sarjana/Bangsawan berpengalaman, atau Diplomasi ≥ 48).',
          };
        }
        return { ok: true, label: 'Diplomasi & Tata Negara Relevan' };
      }
      case 'marsekal': {
        const hasExp =
          ['tentara', 'tentara_bayaran', 'pelaut', 'awak_kapal'].includes(candidate.profesi || '') ||
          candidate.kelas === 'ksatria' ||
          bg === 'warrior' ||
          candidate.sp.duel >= 28 ||
          sk.perang >= 48 ||
          (isSeasoned && sk.perang >= 38);
        if (sk.perang < 32 || !hasExp) {
          return {
            ok: false,
            label: 'Perang ≥ 32 + pengalaman Militer/Ksatria/Duel ≥ 28',
            reason:
              'Terkunci (Pengalaman): Jabatan Marsekal mewajibkan Perang ≥ 32 serta pengalaman tempur relevan (Prajurit/Tentara Bayaran/Pelaut, Ksatria, Duel ≥ 28, atau Perang ≥ 48).',
          };
        }
        return { ok: true, label: 'Karier Militer / Ksatria Relevan' };
      }
      case 'bendahara': {
        const hasExp =
          ['pedagang', 'pengusaha', 'pengrajin', 'pelayan_istana'].includes(candidate.profesi || '') ||
          (isPlayer && (this.G.us.length > 0 || bg === 'merchant')) ||
          sk.administrasi >= 48 ||
          (isSeasoned && sk.administrasi >= 38);
        if (sk.administrasi < 32 || !hasExp) {
          return {
            ok: false,
            label: 'Administrasi ≥ 32 + pengalaman Dagang/Usaha/Istana',
            reason:
              'Terkunci (Pengalaman): Jabatan Bendahara mewajibkan Administrasi ≥ 32 serta pengalaman ekonomi relevan (Pedagang/Pengusaha/Pengrajin/Pelayan Istana, punya Usaha, atau Administrasi ≥ 48).',
          };
        }
        return { ok: true, label: 'Keahlian Ekonomi & Neraca Relevan' };
      }
      case 'mata': {
        const hasExp =
          ['penyelundup', 'pelayan_istana'].includes(candidate.profesi || '') ||
          candidate.sifat.some((s) => ['licik', 'ambisius', 'cerdas'].includes(s)) ||
          bg === 'schemer' ||
          candidate.sp.duel >= 25 ||
          sk.spionase >= 48;
        if (sk.spionase < 32 || !hasExp) {
          return {
            ok: false,
            label: 'Spionase ≥ 32 + rekam Intrik/Penyelundup/Licik',
            reason:
              'Terkunci (Pengalaman): Penguasa Mata-mata mewajibkan Spionase ≥ 32 serta pengalaman intrik relevan (Penyelundup/Pelayan Istana, sifat Licik/Ambisius, atau Spionase ≥ 48).',
          };
        }
        return { ok: true, label: 'Rekam Jejak Intelijen Relevan' };
      }
      case 'uskup': {
        const hasExp =
          candidate.profesi === 'pendeta' ||
          Boolean(this.relRankOf(candidate)) ||
          bg === 'scholar' ||
          candidate.res.kesalehan >= 110 ||
          sk.pembelajaran >= 50;
        if (sk.pembelajaran < 32 || !hasExp) {
          return {
            ok: false,
            label: 'Pembelajaran ≥ 32 + rekam Rohaniwan/Sarjana/Kesalehan ≥ 110',
            reason:
              'Terkunci (Pengalaman): Penasihat Keagamaan mewajibkan Pembelajaran ≥ 32 serta pengalaman rohani/ilmu relevan (Rohaniwan, Kesalehan ≥ 110, atau Pembelajaran ≥ 50).',
          };
        }
        return { ok: true, label: 'Keahlian Rohani & Ilmu Relevan' };
      }
      default:
        return { ok: true, label: 'Umum' };
    }
  }

  public checkOfficeRestriction(
    jid: string,
    candidate: Character,
    employer: Character
  ): { ok: boolean; reason?: string } {
    const empFam = this.AG(employer.agama).keluarga;
    const candIsCommoner = this.isCommoner(candidate);
    const highNobleOffices = ['kanselir', 'marsekal'];
    if (candIsCommoner && highNobleOffices.includes(jid)) {
      return {
        ok: false,
        reason: `Terkunci (Status Sosial): Posisi pemerintahan/militer tinggi ${jid === 'kanselir' ? 'Kanselir' : 'Marsekal'} khusus bagi Bangsawan/Ksatria (Rakyat Jelata dikunci).`,
      };
    }
    if (candIsCommoner && jid === 'uskup' && candidate.profesi !== 'pendeta') {
      return {
        ok: false,
        reason: 'Terkunci (Status Sosial): Rakyat non-bangsawan harus berprofesi Rohaniwan terlebih dahulu untuk posisi keagamaan.',
      };
    }
    if (empFam === 'kristen' && candidate.agama === 'islam') {
      if (jid === 'uskup') {
        return {
          ok: false,
          reason: 'Terkunci (Agama): Pemeluk Islam dikunci dari posisi Uskup Agung / Penasihat Gereja di pemerintahan Kristen.',
        };
      }
      if (highNobleOffices.includes(jid)) {
        return {
          ok: false,
          reason: `Terkunci (Agama): Pemerintahan ${this.AG(employer.agama).nama} mengunci posisi ${jid === 'kanselir' ? 'Kanselir' : 'Marsekal'} bagi pemeluk Islam.`,
        };
      }
      if (employer.agama === 'katolik' && this.opn(employer, candidate) < 35) {
        return {
          ok: false,
          reason: `Terkunci (Agama): Di wilayah Katolik, Muslim dibatasi di posisi ${jid} (butuh opini penguasa minimal +35).`,
        };
      }
    }
    if (jid === 'uskup' && candidate.agama !== employer.agama) {
      return {
        ok: false,
        reason: `Terkunci (Agama): Penasihat keagamaan (${this.AG(employer.agama).nama}) mensyaratkan agama yang sama dengan penguasa.`,
      };
    }
    const expCheck = this.getOfficeExperienceReq(jid, candidate);
    if (!expCheck.ok) {
      return { ok: false, reason: expCheck.reason };
    }
    return { ok: true };
  }

  public jobApply(rid: string, jid: string): void {
    const p = this.me();
    const r = this.C[rid];
    const j = this.D.jabatan.find((x: AnyRule) => x.id === jid);
    if (!r || !j) return;
    if (this.G.job) return this.msg('Sudah memegang jabatan.');
    if (this.tierOf(p) > 2) return this.msg('Gelarmu terlalu tinggi untuk jabatan pelayan.');
    const rest = this.checkOfficeRestriction(jid, p, r);
    if (!rest.ok) return this.msg(rest.reason || 'Tidak memenuhi syarat jabatan.');
    if (p.res.prestise < 5) return this.msg('Butuh prestise 5.');
    if (this.G.done['job' + rid]) return this.msg('Sudah melamar tahun ini.');
    this.G.done['job' + rid] = 1;
    if (Math.random() < Math.min(0.92, 0.35 + (p.sk as AnyRule)[j.stat] / 140 + this.opn(r, p) / 280)) {
      const sal = this.getOfficeSalary(jid, r);
      this.G.job = { id: p.id, j: jid, r: rid, y: this.G.tahun };
      this.bump(r, 5);
      this.msg(`Diangkat menjadi ${j.nama} (Gaji ${sal} emas/tahun masuk ke uang pribadi!).`);
    } else {
      p.res.prestise -= 2;
      this.msg('Ditolak. Prestise -2.');
    }
  }

  public quitJob(): void {
    this.G.job = null;
    this.msg('Mengundurkan diri.');
  }

  public surat(id: string, sid: string): void {
    const p = this.me();
    const c = this.C[id];
    const s = this.SRT().find((x: AnyRule) => x.id === sid);
    if (!c || !s) return;
    const b = s.biaya || {};
    if (!c.hidup || this.G.jail[id]) return this.msg('Tidak bisa dikirim.');
    if ((b.emas || 0) > p.res.emas) return this.msg('Emas kurang.');
    if (this.G.done['s' + sid + id]) return this.msg('Sudah dikirim tahun ini.');
    this.G.done['s' + sid + id] = 1;
    p.res.emas -= b.emas || 0;
    const o = this.opn(c, p);
    if (s.op_min != null && o < s.op_min) {
      this.bump(c, -2);
      return this.msg(`${this.full(c)} menolak: hubungan kurang dekat.`);
    }
    if (s.peluang >= 1 || Math.random() < Math.min(0.95, Math.max(0.05, s.peluang + o / 250))) {
      this.bump(c, s.op || 0);
      for (const [k, v] of Object.entries((s.efek || {}) as Record<string, number>)) {
        if (k in p.sk) (p.sk as AnyRule)[k] = cl((p.sk as AnyRule)[k] + v);
        else this.ap(p, k, v);
      }
      this.msg(`Surat dibalas baik: ${this.ef2(s.efek)}`);
    } else {
      this.bump(c, -3);
      this.msg(`${this.full(c)} tidak membalas.`);
    }
  }

  public jail(id: string): void {
    const p = this.me();
    const c = this.C[id];
    if (!c) return;
    if (this.G.jail[id]) {
      delete this.G.jail[id];
      this.bump(c, 10);
      return this.msg(`${this.full(c)} dibebaskan.`);
    }
    const vas = this.held(p.id).some((x) => x.kids.some((k) => this.T[k]?.pem === id));
    if (!(this.tierOf(p) > this.tierOf(c) || vas)) return this.msg('Tidak berwenang.');
    if (p.res.prestise < 5) return this.msg('Butuh 5 prestise.');
    p.res.prestise -= 5;
    this.G.jail[id] = this.G.tahun;
    this.bump(c, -50);
    c.anak.concat(c.pasangan ? [c.pasangan] : []).forEach((i) => {
      if (this.C[i]) this.C[i].op[p.id] = (this.C[i].op[p.id] || 0) - 15;
    });
    Object.keys(this.G.pen).forEach((j) => {
      if (this.G.pen[j] === id) this.G.pen[j] = null;
    });
    this.msg(`${this.full(c)} dipenjara.`);
  }

  public givep(tid: string, id: string): void {
    const p = this.me();
    const t = this.T[tid];
    const c = this.C[id];
    if (!t || !c || !this.ageOK(c)) return this.msg('Tidak memenuhi syarat.');
    if (this.held(p.id).length < 2) return this.msg('Harus tetap pegang 1 gelar.');
    t.pem = id;
    this.bump(c, 40);
    c.kelas = 'bangsawan';
    this.msg(`${t.nama} diberikan kepada ${this.full(c)}.`);
  }

  public appoint(jid: string, id: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa berwilayah yang berhak mengangkat pejabat istana.');
    const c = this.C[id];
    const j = this.D.jabatan.find((x: AnyRule) => x.id === jid);
    if (!c || !j || !this.ageOK(c)) return this.msg('Tidak bisa menjabat.');
    if (this.opn(c, p) < -30) return this.msg(`${this.full(c)} menolak.`);
    if (this.tierOf(c) >= 3) return this.msg('Penguasa tidak mau jadi pejabat bawahan.');
    const rest = this.checkOfficeRestriction(jid, c, p);
    if (!rest.ok) return this.msg(rest.reason || 'Kandidat dibatasi untuk jabatan ini.');
    Object.keys(this.G.pen).forEach((k) => {
      if (this.G.pen[k] === id) {
        this.G.pen[k] = null;
        delete this.G.office[k];
      }
    });
    this.G.pen[jid] = id;
    this.officeEnsure(jid);
    this.G.officerHistory.push({ id, j: jid, y: this.G.tahun, type: 'appointed' });
    this.bump(c, 10);
    this.msg(`${this.full(c)} menjabat ${j.nama}.`);
  }

  public dismissAdvisor(jid: string): void {
    if (!this.isRuler(this.me())) return this.msg('Hanya penguasa berwilayah yang berhak memberhentikan penasihat.');
    const oldId = this.G.pen[jid];
    if (oldId) this.G.officerHistory.push({ id: oldId, j: jid, y: this.G.tahun, type: 'dismissed' });
    this.G.pen[jid] = null;
    delete this.G.office[jid];
    this.notify();
  }

  public togFav(id: string): void {
    this.G.fav = this.G.fav.includes(id) ? this.G.fav.filter((x) => x !== id) : [...this.G.fav, id];
    this.notify();
  }

  public act(k: 'talk' | 'puji' | 'hina' | 'obat', id: string): void {
    const p = this.me();
    const c = this.C[id];
    if (!c) return;
    if (k === 'obat' && p.res.emas < 15) return this.msg('Emas kurang.');
    if (this.G.done['a' + k + id]) return this.msg('Sudah dilakukan tahun ini.');
    this.G.done['a' + k + id] = 1;
    if (k === 'talk') {
      const d = R(-2, 6) - (c.sifat.includes('pemalu') ? 2 : 0);
      this.bump(c, d);
      return this.msg(`Bicara selesai. Hubungan ${d >= 0 ? '+' : ''}${d}.`);
    }
    if (k === 'puji') {
      const d = R(5, 10) + (c.sifat.includes('sombong') ? 5 : 0);
      this.bump(c, d);
      return this.msg(`Pujian +${d}.`);
    }
    if (k === 'hina') {
      const d = R(15, 25);
      this.bump(c, -d);
      p.res.prestise -= 1;
      return this.msg(`Hinaan -${d}, prestise -1.`);
    }
    p.res.emas -= 15;
    c.sp.kesehatan = cl(c.sp.kesehatan + 15);
    this.bump(c, 5);
    return this.msg('Kesehatan +15.');
  }

  public makeFriend(id: string): void {
    const p = this.me();
    const c = this.C[id];
    if (!c || !c.hidup || c.id === p.id) return;
    if (!this.G.friends) this.G.friends = [];
    if (!this.G.rivals) this.G.rivals = [];
    if (this.G.friends.includes(id)) return this.msg(`${this.full(c)} sudah menjadi temanmu.`);
    this.G.rivals = this.G.rivals.filter((x) => x !== id);
    this.G.friends.push(id);
    this.bump(c, 18);
    this.ensureRulerRelation(id, 'sahabat', 15, 0, 'Menjalin ikatan sahabat karib');
    this.msg(`${this.full(c)} kini menjadi Sahabat/Teman akrabmu (+25 bonus opini & dukungan Konklaf).`);
  }

  public makeRival(id: string): void {
    const p = this.me();
    const c = this.C[id];
    if (!c || !c.hidup || c.id === p.id) return;
    if (!this.G.friends) this.G.friends = [];
    if (!this.G.rivals) this.G.rivals = [];
    if (this.G.rivals.includes(id)) return this.msg(`${this.full(c)} sudah menjadi musuhmu.`);
    this.G.friends = this.G.friends.filter((x) => x !== id);
    this.G.rivals.push(id);
    this.bump(c, -22);
    this.ensureRulerRelation(id, 'rival', -25, -10, 'Ditetapkan sebagai rival politik');
    this.msg(`${this.full(c)} kini ditetapkan sebagai Musuh/Rival (-35 opini & menentang kepentinganmu).`);
  }

  public neutralizeRelation(id: string): void {
    const c = this.C[id];
    this.G.friends = (this.G.friends || []).filter((x) => x !== id);
    this.G.rivals = (this.G.rivals || []).filter((x) => x !== id);
    if (this.G.rulerRelations?.[id]) {
      this.G.rulerRelations[id].status = 'netral';
      this.G.rulerRelations[id].history.unshift(`Thn ${this.G.tahun}: Hubungan dikembalikan netral`);
    }
    this.msg(`Hubungan khusus dengan ${c ? this.full(c) : id} dikembalikan netral.`);
  }

  public marryBetrothed(): void {
    const p = this.me();
    if (p.sn !== 'bertunangan' || !p.pasangan) return this.msg('Kamu tidak sedang bertunangan.');
    const o = this.C[p.pasangan];
    if (!o || !o.hidup) return this.msg('Tunanganmu tidak tersedia atau telah wafat.');
    if (this.umur(p) < 16 || this.umur(o) < 16) {
      return this.msg(`Pernikahan hanya dapat diresmikan setelah keduanya berusia minimal 16 tahun (${this.umur(p)} & ${this.umur(o)} th).`);
    }
    const pp = this.D.profesi.find((x: AnyRule) => x.id === p.profesi);
    if (pp && this.noMarry(pp, p)) return this.msg('Profesimu mensyaratkan hidup selibat dan dilarang menikah.');
    const elig = this.checkMarriageEligibility(p, o, true);
    p.sn = o.sn = 'menikah';
    p.marriageStartYear = this.G.tahun;
    o.marriageStartYear = this.G.tahun;
    p.marriageHistory = p.marriageHistory || [];
    o.marriageHistory = o.marriageHistory || [];
    p.marriageHistory.push({
      spouseId: o.id,
      spouseName: this.full(o),
      dynastyName: o.dinasti ? this.DY[o.dinasti]?.nama : undefined,
      year: this.G.tahun,
      morganatic: elig.morganatic,
    });
    o.marriageHistory.push({
      spouseId: p.id,
      spouseName: this.full(p),
      dynastyName: p.dinasti ? this.DY[p.dinasti]?.nama : undefined,
      year: this.G.tahun,
      morganatic: elig.morganatic,
    });
    this.G.tun = this.G.tun.filter((x) => x.a !== p.id && x.b !== p.id);
    this.bump(o, 15);
    this.adjustDynastyRelation(p.dinasti, o.dinasti, elig.dynRelDelta);
    p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 10);
    p.res.prestise = Math.max(0, p.res.prestise + 10 + (elig.prestigeDelta > 0 ? elig.prestigeDelta : 0));
    this.dynLog(p.dinasti, `${this.full(p)} resmi menikah dengan ${this.full(o)}`);
    sfx.playChime();
    this.msg(`Selamat! Pernikahanmu dengan ${this.full(o)} resmi dilangsungkan (+10 Prestise, +${elig.dynRelDelta} Relasi Dinasti).`);
  }

  public getEffectiveHomeLevel(c?: Character): number {
    const ch = c || this.me();
    if (!ch) return 0;
    const t = this.tierOf(ch);
    const base =
      t >= 7
        ? 8
        : t === 6
          ? 7
          : t >= 4
            ? 6
            : t === 3
              ? 5
              : t >= 1
                ? 4
                : ch.kelas === 'bangsawan'
                  ? 4
                  : ch.kelas === 'warga_kota'
                    ? 2
                    : 0;
    return ch.id === this.G?.pid ? Math.max(base, this.G.homeLevel || 0) : base;
  }

  public getResidence(c?: Character): {
    level: number;
    name: string;
    desc: string;
    bonusText: string;
    prestigePerYear: number;
    happinessPerYear: number;
    nextName: string | null;
    nextCost: number | null;
  } {
    const tiers = [
      { name: 'Gubuk Reyot', desc: 'Pondok jerami sempit di pinggiran desa.', bonusText: '-', prestigePerYear: 0, happinessPerYear: 0, cost: 0 },
      { name: 'Pondok Kayu', desc: 'Hunian kayu sederhana dengan perapian kecil.', bonusText: '+1 Kebahagiaan/th', prestigePerYear: 0, happinessPerYear: 1, cost: 20 },
      { name: 'Rumah Papan & Pekarangan', desc: 'Rumah layak bagi pengrajin & keluarga kecil.', bonusText: '+2 Kebahagiaan/th, +1 Prestise/th', prestigePerYear: 1, happinessPerYear: 2, cost: 45 },
      { name: 'Rumah Batu Kota', desc: 'Kediaman berdinding batu di dekat alun-alun kota.', bonusText: '+2 Prestise/th, +2 Kebahagiaan/th', prestigePerYear: 2, happinessPerYear: 2, cost: 90 },
      { name: 'Wisma Saudagar', desc: 'Kompleks hunian luas milik warga terhormat & bangsawan lokal.', bonusText: '+3 Emas Pribadi/th, +3 Prestise/th', prestigePerYear: 3, happinessPerYear: 2, cost: 160 },
      { name: 'Menara Bangsawan (Manor)', desc: 'Kediaman berbenteng pemimpin wilayah kabupaten.', bonusText: '+4 Prestise/th, +1 Emas Pribadi/th', prestigePerYear: 4, happinessPerYear: 2, cost: 260 },
      { name: 'Kastil Perbatasan', desc: 'Benteng batu megah milik Adipati & Marquis penjaga perbatasan.', bonusText: '+6 Prestise/th, +1 Emas Pribadi/th', prestigePerYear: 6, happinessPerYear: 2, cost: 450 },
      { name: 'Istana Kerajaan', desc: 'Istana berdaulat tempat raja bersidang.', bonusText: '+10 Prestise/th, +3 Kebahagiaan/th', prestigePerYear: 10, happinessPerYear: 3, cost: 800 },
      { name: 'Balairung Istana Agung', desc: 'Kompleks istana kekaisaran termegah di daratan Eropa.', bonusText: '+15 Prestise/th, +4 Kebahagiaan/th', prestigePerYear: 15, happinessPerYear: 4, cost: 1300 },
    ];
    const lvl = Math.min(tiers.length - 1, Math.max(0, this.getEffectiveHomeLevel(c)));
    const cur = tiers[lvl];
    const nxt = lvl < tiers.length - 1 ? tiers[lvl + 1] : null;
    return {
      level: lvl,
      name: cur.name,
      desc: cur.desc,
      bonusText: cur.bonusText,
      prestigePerYear: cur.prestigePerYear,
      happinessPerYear: cur.happinessPerYear,
      nextName: nxt ? nxt.name : null,
      nextCost: nxt ? nxt.cost : null,
    };
  }

  public upgradeResidence(): void {
    const p = this.me();
    const res = this.getResidence(p);
    if (!res.nextName || res.nextCost === null) {
      return this.msg('Tempat tinggalmu sudah mencapai tingkat termegah.');
    }
    if (p.res.emas < res.nextCost) {
      return this.msg(`Uang pribadi kurang (butuh ${res.nextCost} emas untuk pindah ke ${res.nextName}).`);
    }
    p.res.emas = Math.round((p.res.emas - res.nextCost) * 10) / 10;
    this.G.homeLevel = res.level + 1;
    p.res.prestise += 6;
    p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 8);
    this.msg(`Selamat! Kamu kini menempati ${res.nextName} (+6 Prestise, +8 Kebahagiaan).`);
  }

  public setProf(id: string): void {
    const p = this.me();
    const f = this.D.profesi.find((x: AnyRule) => x.id === id);
    if (!f) return;
    const rest = this.checkProfessionRestriction(id, p, this.held(p.id)[0]?.id || p.loc || '');
    if (!rest.ok) return this.msg(rest.reason || 'Profesi ini dibatasi.');
    if (p.res.emas < 10) return this.msg('Butuh 10 emas.');
    if (f.butuh_pesisir && p.loc && this.T[p.loc] && this.provs(this.T[p.loc])[0].pes === false) {
      return this.msg('Butuh pesisir.');
    }
    if (this.noMarry(f, p) && (['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan))) {
      return this.msg('Jabatan orang gereja terkunci karena masih menikah/bertunangan (wajib single).');
    }
    p.res.emas -= 10;
    p.profesi = id;
    if (this.noMarry(f, p) && !p.pasangan) {
      p.sn = 'selibat';
    }
    for (const k in f.bonus) {
      if (k in p.sk) (p.sk as AnyRule)[k] = cl((p.sk as AnyRule)[k] + f.bonus[k]);
      else if (k in p.sp) (p.sp as AnyRule)[k] = cl((p.sp as AnyRule)[k] + f.bonus[k]);
    }
    p.rank = {};
    p.rankY = this.G.tahun;
    this.msg(`Kini bekerja sebagai ${this.PN(f, p)}.`);
  }

  public dec(id: string): void {
    const d = this.D.keputusan.find((x: AnyRule) => x.id === id);
    if (!d) return;
    const p = this.me();
    const nobleOnlyDecs = new Set(['pilih_gelar_utama', 'pesta', 'perburuan', 'undang_bangsawan', 'turun_tahta', 'wasiat']);
    if (nobleOnlyDecs.has(id) && !this.isNoble(p)) {
      return this.msg('Keputusan istana ini hanya tersedia bagi kaum Bangsawan.');
    }
    if (['pilih_gelar_utama', 'turun_tahta'].includes(id) && !this.isRuler(p)) {
      return this.msg('Keputusan ini hanya untuk penguasa berwilayah.');
    }
    const b = d.biaya || {};
    if (this.G.done[id]) return this.msg('Sudah dijalankan tahun ini.');
    if ((b.emas || 0) > p.res.emas) return this.msg('Emas kurang.');
    const beforeP = p.res.kesalehan;
    p.res.emas -= b.emas || 0;
    this.G.done[id] = 1;
    if (id === 'pilih_gelar_utama') {
      this.go('gelar');
      return;
    }
    for (const [k, v] of Object.entries(d.efek || {})) this.ap(p, k, v);
    if (id === 'jadi_selibat' && !p.pasangan) p.sn = 'selibat';
    if (p.res.kesalehan > beforeP + 5) {
      this.deed(p.id, 'charity', Math.floor((p.res.kesalehan - beforeP) / 5));
    }
    this.G.log = [`${d.nama} dijalankan.`];
    this.save();
    this.home();
  }

  // ============ CAREER & STATUS LADDERS ============
  public ladderInfo(kind: 'rank' | 'kelas', p: Character): AnyRule | null {
    this.AT_KEY = kind === 'rank' ? 'rankY' : 'kelasY';
    let Jx: AnyRule;
    let idx: number;
    if (kind === 'rank') {
      Jx = this.jenjangOf(p);
      if (!Jx) return null;
      idx = this.rankIdx(p, Jx);
    } else {
      Jx = this.D.jenjang_status;
      if (!Jx || this.tierOf(p)) return null;
      idx = Jx.pangkat.findIndex((x: AnyRule) => x.id === p.kelas);
      if (idx < 0) return null;
    }
    return { J: Jx, idx, cur: Jx.pangkat[idx], next: Jx.pangkat[idx + 1] };
  }

  public jalurOk(j: AnyRule, p: Character): boolean {
    const b = (j.biaya && j.biaya.emas) || 0;
    return this.AT_cek(j.syarat, p, {}) && p.res.emas >= b;
  }

  public sTeks(c: AnyRule, p: Character): string {
    if (c.teks) return c.teks;
    if (c.kosong) return `Jabatan ${c.kosong} kosong`;
    if (c.atau) return c.atau.map((x: AnyRule) => this.sTeks(x, p)).join(' / ');
    if (c.tidak) return `Bukan: ${this.sTeks(c.tidak, p)}`;
    if ('peluang' in c) return 'Keberuntungan';
    const LBL: Record<string, string> = {
      prestise: 'Prestise',
      emas: 'Emas',
      kesalehan: 'Kesalehan',
      pembelajaran: 'Pembelajaran',
      umur: 'Usia',
      tahun_di_pangkat: 'Lama di pangkat (th)',
      pasukan: 'Pasukan',
      hubungan_penguasa: 'Hubungan dgn penguasa',
      perang: 'Perang',
      diplomasi: 'Diplomasi',
      administrasi: 'Administrasi',
      spionase: 'Spionase',
      pangkat_karier: 'Pangkat karier',
    };
    const k = this.AT_get(p, c.v);
    return `${LBL[c.v] || c.v} ${(c.op || '==').replace('==', '=')} ${Array.isArray(c.n) ? c.n.join('/') : c.n}${
      typeof k === 'number' ? ` (kini ${Math.round(k)})` : ''
    }`;
  }

  public naikJab(kind: 'rank' | 'kelas', i: number): void {
    const p = this.me();
    this.AT_KEY = kind === 'rank' ? 'rankY' : 'kelasY';
    const L = this.ladderInfo(kind, p);
    if (!L || !L.next) return;
    if (kind === 'rank' && L.J.id === 'gereja_katolik') {
      if (['menikah', 'bertunangan'].includes(p.sn) || p.pasangan) {
        return this.msg('Pejabat Gereja Katolik wajib hidup selibat dan berstatus single (tidak menikah/bertunangan).');
      }
      if (L.next.id === 'p5') {
        return this.msg('Paus tidak dapat diangkat langsung; Kardinal harus memenangkan Konklaf saat Takhta Suci kosong.');
      }
      if (L.next.id === 'p3') {
        const realm = this.realmOf(p);
        const curArch = this.archbishopOf(realm.id);
        if (curArch && curArch.id !== p.id) {
          return this.msg(`Jabatan Uskup Agung di ${realm.nama} sudah diisi oleh ${this.full(curArch)} (maksimal 1 per wilayah).`);
        }
      }
    }
    if (kind === 'rank' && L.J.id === 'tentara') {
      const mRest = this.checkMilitaryRestriction('rank', p, L.next.id);
      if (!mRest.ok) return this.msg(mRest.reason || 'Pangkat militer ini dikunci.');
    }
    const j = L.next.jalur[i];
    if (!j || !this.jalurOk(j, p)) return this.msg('Syarat belum terpenuhi.');
    const b = (j.biaya && j.biaya.emas) || 0;
    p.res.emas -= b;
    const x = { p, X: {}, msg: '', stop: false };
    this.AT_run(j.aksi, x);
    if (kind === 'rank') {
      p.rank = p.rank || {};
      p.rank[L.J.id] = L.idx + 1;
      p.rankY = this.G.tahun;
      if (L.J.id === 'gereja_katolik') {
        const mapRel: Record<string, string> = { p0: 'biarawan', p1: 'imam', p2: 'uskup', p3: 'uskup_agung', p4: 'kardinal' };
        const rk = mapRel[L.next.id];
        if (rk) {
          if (rk === 'uskup' && !this.G.church.bishops.includes(p.id)) this.G.church.bishops.push(p.id);
          if (rk === 'uskup_agung') {
            const realm = this.realmOf(p);
            if (!this.G.church.archbishops) this.G.church.archbishops = {};
            this.G.church.archbishops[realm.id] = p.id;
            this.G.church.bishops = this.G.church.bishops.filter((id) => id !== p.id);
          }
          if (rk === 'kardinal') {
            if (!this.G.church.cardinals.includes(p.id)) this.G.church.cardinals.push(p.id);
            if (this.G.church.archbishops) {
              Object.keys(this.G.church.archbishops).forEach((rid) => {
                if (this.G.church.archbishops![rid] === p.id) delete this.G.church.archbishops![rid];
              });
            }
          }
          this.G.relRank[p.id] = rk;
        }
      }
    } else if (L.next.id !== 'bangsawan') {
      p.kelas = L.next.id;
      p.kelasY = this.G.tahun;
    }
    this.msg(`Naik menjadi ${L.next.nama}!${x.msg ? ' ' + x.msg : ''}`);
  }

  public toggleTab(): void {
    if (!this.isRuler()) {
      this.G.tab = 0;
      this.notify();
      return;
    }
    this.G.tab = 1 - this.G.tab;
    this.notify();
  }

  public setPrimaryTitle(tid: string, nama: string): void {
    this.G.primary = tid;
    this.msg(`Gelar utama: ${nama}`);
  }

  private ensureNobleWidowCandidates(): void {
    const p = this.me();
    if (!p) return;
    const targetG: 'L' | 'P' = p.gender === 'L' ? 'P' : 'L';
    const existingWithKids = Object.values(this.C).filter(
      (x) =>
        x.hidup &&
        x.gender === targetG &&
        !x.pasangan &&
        (x.sn === 'janda' || x.sn === 'duda') &&
        x.anak.some((aid) => this.C[aid]?.hidup) &&
        !['rakyat_jelata', 'warga_kota'].includes(x.kelas) &&
        this.umur(x) >= 18 &&
        Math.abs(this.umur(x) - this.umur(p)) <= 20
    );
    if (existingWithKids.length >= 3) return;
    const counties = Object.values(this.T).filter((x) => x.tier === 3);
    const homeLoc = p.loc && this.T[p.loc] ? this.T[p.loc] : counties[0];
    const needed = 3 - existingWithKids.length;
    for (let i = 0; i < needed; i++) {
      const t = homeLoc || counties[i % Math.max(1, counties.length)];
      const cul = p.budaya || t?.budaya || 'german';
      const dyName = this.pickCultureDynastyName(cul);
      const dyId = 'yw' + ++this.G.n;
      this.DY[dyId] = {
        id: dyId,
        nama: dyName,
        budaya: cul,
        prestise: R(45, 140),
        status: 'bangsawan_lokal',
        kepala: null,
      };
      const twoTimes = i === 0;
      const age = twoTimes
        ? Math.max(28, Math.min(48, this.umur(p) + R(-2, 8)))
        : Math.max(20, Math.min(46, this.umur(p) + R(-6, 6)));
      const fa = this.mkC({
        gender: 'L',
        lahir: this.G.tahun - age - R(22, 30),
        budaya: cul,
        agama: p.agama,
        dinasti: dyId,
        kelas: 'bangsawan',
        hidup: false,
        wafat: this.G.tahun - R(2, 10),
      });
      const mo = this.mkC({
        gender: 'P',
        lahir: this.G.tahun - age - R(19, 27),
        budaya: cul,
        agama: p.agama,
        dinasti: dyId,
        kelas: 'bangsawan',
      });
      const w = this.mkC({
        gender: targetG,
        lahir: this.G.tahun - age,
        budaya: cul,
        agama: p.agama,
        dinasti: dyId,
        kelas: 'bangsawan',
        sn: targetG === 'P' ? 'janda' : 'duda',
        ayah: fa.id,
        ibu: mo.id,
        loc: t?.id,
        op: { [p.id]: 20 },
      });
      fa.anak.push(w.id);
      mo.anak.push(w.id);
      this.DY[dyId].kepala = w.id;
      this.seedPriorMarriagesAndKids(w, {
        count: twoTimes ? 2 : 1,
        withChildren: true,
        kelas: 'bangsawan',
        cul,
        agama: p.agama,
        dinasti: dyId,
        loc: t?.id,
        includeDivorceFirst: twoTimes,
      });
    }
  }

  public cand(mode: 'all' | 'widow' | 'widow_kids' = 'all'): Character[] {
    const p = this.me();
    if (mode === 'widow' || mode === 'widow_kids') {
      this.ensureNobleWidowCandidates();
    }
    return Object.values(this.C)
      .filter((x) => {
        if (
          !x.hidup ||
          x.gender === p.gender ||
          x.pasangan ||
          !['lajang', 'janda', 'duda', 'bercerai'].includes(x.sn) ||
          this.umur(x) < 16 ||
          Math.abs(this.umur(x) - this.umur(p)) > 20 ||
          this.kin(p, x)
        ) {
          return false;
        }
        const fp = x.profesi ? this.D.profesi.find((f: AnyRule) => f.id === x.profesi) : null;
        if (fp && this.noMarry(fp, x)) return false;
        if (mode === 'widow') {
          return x.sn === 'janda' || x.sn === 'duda';
        }
        if (mode === 'widow_kids') {
          return (x.sn === 'janda' || x.sn === 'duda') && x.anak.some((aid) => this.C[aid]?.hidup);
        }
        return true;
      })
      .sort((a, b) => {
        const ea = this.checkMarriageEligibility(p, a).ok ? 0 : 1;
        const eb = this.checkMarriageEligibility(p, b).ok ? 0 : 1;
        if (ea !== eb) return ea - eb;
        if (mode === 'widow_kids') {
          return b.anak.length - a.anak.length;
        }
        return Math.abs(this.tierOf(a) - this.tierOf(p)) - Math.abs(this.tierOf(b) - this.tierOf(p));
      })
      .slice(0, 24);
  }

  // =========================================================================
  // v14 FEATURES: Notifications, Catholic Church & Papacy, Spy, Trade, Loans,
  // Books, Expeditions, Heraldry, Disasters, Detailed Siege, Save Export/Import
  // =========================================================================
  public notifyLog(text: string, icon = '📜'): void {
    if (!this.G.notifs) this.G.notifs = [];
    if (!this.G.timeline) this.G.timeline = [];
    this.G.notifs.unshift({ y: this.G.tahun, text, icon, read: false });
    if (this.G.notifs.length > 50) this.G.notifs = this.G.notifs.slice(0, 50);
    this.G.timeline.unshift({ y: this.G.tahun, text, icon });
    if (this.G.timeline.length > 120) this.G.timeline = this.G.timeline.slice(0, 120);
  }

  public markNotifsRead(): void {
    this.G.notifs.forEach((n) => (n.read = true));
    this.notify();
  }

  public realmOf(c: Character): { id: string; nama: string } {
    let t: Title | undefined =
      this.held(c.id).sort((a, b) => b.tier - a.tier)[0] || (c.loc ? this.T[c.loc] : undefined);
    if (!t && c.id === this.G.pid && this.G.job?.r && this.C[this.G.job.r]) {
      const emp = this.C[this.G.job.r];
      t = this.held(emp.id).sort((a, b) => b.tier - a.tier)[0] || (emp.loc ? this.T[emp.loc] : undefined);
    }
    if (!t && c.pasangan && this.C[c.pasangan]) {
      const sp = this.C[c.pasangan];
      t = this.held(sp.id).sort((a, b) => b.tier - a.tier)[0] || (sp.loc ? this.T[sp.loc] : undefined);
    }
    let n = 0;
    let top: Title | undefined = t;
    while (top && top.atas && this.T[top.atas] && n++ < 10) {
      top = this.T[top.atas];
      if (top.tier >= 6) break;
    }
    if (top) return { id: top.id, nama: top.nama };
    const bLabel = (c.budaya || 'Eropa').replace(/^\w/, (x) => x.toUpperCase());
    return { id: c.budaya || 'umum', nama: `Wilayah ${bLabel}` };
  }

  public realmChoices(): {
    id: string;
    nama: string;
    tier: number;
    agama: string;
    budaya: string;
    statusNote: string;
    counties: Title[];
    duchies: Title[];
    marquises: Title[];
  }[] {
    const roots = Object.values(this.T)
      .filter((t) => !t.atas)
      .sort((a, b) => b.tier - a.tier || a.nama.localeCompare(b.nama));

    const collectSubtitles = (tid: string) => {
      const counties: Title[] = [];
      const duchies: Title[] = [];
      const marquises: Title[] = [];
      const seen = new Set<string>();
      const walk = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        const t = this.T[id];
        if (!t) return;
        if (t.tier === 3) counties.push(t);
        if (t.tier === 4 || (t.tier === 5 && t.marquis)) marquises.push(t);
        if (t.tier === 5 && !t.marquis) duchies.push(t);
        t.kids.forEach(walk);
      };
      walk(tid);
      return {
        counties: counties.sort((a, b) => a.nama.localeCompare(b.nama)),
        duchies: duchies.sort((a, b) => a.nama.localeCompare(b.nama)),
        marquises: marquises.sort((a, b) => a.nama.localeCompare(b.nama)),
      };
    };

    const statusNotes: Record<string, string> = {
      k_castile_leon: 'Spanyol 1066 terpecah (menuju penyatuan Spanyol ~1479); Portucale masih di bawah León (merdeka 1139)',
      k_aragon: 'Kerajaan Kristen Iberia Timur (1066 terpisah dari Castile & Al-Andalus)',
      d_andalus_taifa: 'Taifa-taifa Islam Al-Andalus & pesisir Lisbon/Algarve pada tahun 1066',
      k_maroko: 'Dinasti Almoravid menyatukan Maghreb sejak ~1062–1070',
      e_bizantium: 'Anatolia & Balkan Selatan (Tema Bulgaria/Macedonia) dikuasai Bizantium Ortodoks pada 1066',
      d_seljuk_timur: 'Gerbang timur Anatolia (pemicu Manzikert 1071 & Kesultanan Rum)',
      k_hungaria: 'Kerajaan Katolik Hungaria di bawah Dinasti Árpád menguasai Lembah Pannonia & Transilvania (1066)',
      k_kroasia: 'Kerajaan Kroasia & Dalmatia merdeka di pesisir Adriatik (sebelum persatuan dengan Hungaria ~1102)',
      k_duklja: 'Kerajaan Duklja / Zeta (pra-Serbia Raya) di Balkan Barat pada tahun 1066',
      d_pecheneg: 'Konfederasi suku nomaden Pecheneg (Pagan) di sepanjang Sungai Donau Hilir & Stepa Balkan Timur',
    };

    const groups: {
      id: string;
      nama: string;
      tier: number;
      agama: string;
      budaya: string;
      statusNote: string;
      counties: Title[];
      duchies: Title[];
      marquises: Title[];
    }[] = [];

    const indepSmallCounties: Title[] = [];
    const indepSmallDuchies: Title[] = [];
    const indepSmallMarquises: Title[] = [];
    roots.forEach((r) => {
      const sub = collectSubtitles(r.id);
      if (!sub.counties.length) return;
      if (r.tier >= 5 && sub.counties.length >= 2) {
        groups.push({
          id: r.id,
          nama: r.nama,
          tier: r.tier,
          agama: r.agama || 'katolik',
          budaya: r.budaya,
          statusNote: statusNotes[r.id] || '',
          counties: sub.counties,
          duchies: sub.duchies,
          marquises: sub.marquises,
        });
      } else {
        indepSmallCounties.push(...sub.counties);
        indepSmallDuchies.push(...sub.duchies);
        indepSmallMarquises.push(...sub.marquises);
      }
    });

    if (indepSmallCounties.length > 0) {
      groups.push({
        id: '_independen_kecil',
        nama: 'Kepangeranan & Wilayah Independen (Wales, Irlandia, dll.)',
        tier: 4,
        agama: 'katolik',
        budaya: 'irish',
        statusNote: 'Wilayah berdaulat kecil yang belum bersatu menjadi kerajaan (1066)',
        counties: indepSmallCounties.sort((a, b) => a.nama.localeCompare(b.nama)),
        duchies: indepSmallDuchies.sort((a, b) => a.nama.localeCompare(b.nama)),
        marquises: indepSmallMarquises.sort((a, b) => a.nama.localeCompare(b.nama)),
      });
    }
    return groups;
  }

  public archbishopOf(realmId: string): Character | null {
    const id = this.G.church?.archbishops?.[realmId];
    if (!id) return null;
    const ch = this.C[id];
    return ch && ch.hidup ? ch : null;
  }

  public relRankOf(c: Character): string {
    if (this.G.church.pope === c.id && c.hidup) return 'paus';
    if (this.G.church.cardinals.includes(c.id)) return 'kardinal';
    if (this.G.church.archbishops && Object.values(this.G.church.archbishops).includes(c.id)) return 'uskup_agung';
    if (this.G.relRank[c.id]) return this.G.relRank[c.id];
    if (this.G.church.bishops.includes(c.id)) return 'uskup';
    return c.profesi === 'pendeta' ? 'biarawan' : '';
  }

  public relRankDef(rankId: string) {
    return REL_RANKS.find((r) => r.id === rankId) || null;
  }

  public nextRelRank(c: Character) {
    const cur = this.relRankOf(c);
    if (!cur) return REL_RANKS[0];
    const idx = REL_RANKS.findIndex((r) => r.id === cur);
    return idx >= 0 && idx < REL_RANKS.length - 1 ? REL_RANKS[idx + 1] : null;
  }

  public canAdvanceRel(c: Character): boolean {
    if (c.agama !== 'katolik') return false;
    if (c.profesi !== 'pendeta' && !this.relRankOf(c)) return false;
    if (['menikah', 'bertunangan'].includes(c.sn) || c.pasangan) return false;
    const nxt = this.nextRelRank(c);
    if (!nxt || nxt.id === 'paus') return false;
    if (this.umur(c) < (nxt.minAge || 18)) return false;
    if (nxt.id === 'uskup_agung') {
      const existing = this.archbishopOf(this.realmOf(c).id);
      if (existing && existing.id !== c.id) return false;
    }
    return c.res.kesalehan >= nxt.minPiety;
  }

  public relIncome(c: Character): number {
    if (c.agama === 'katolik') {
      const r = this.relRankOf(c);
      if (!r) return 0;
      const def = this.relRankDef(r);
      return def?.bonus?.emas || 0;
    }
    const fl = this.G.faithLeadership;
    if (fl) {
      if (c.agama === 'ortodoks' && fl.patriarch === c.id) return 14;
      if (c.agama === 'islam' && fl.syekhulIslam === c.id) return 14;
      if (c.agama === 'protestan' && fl.synodModerator === c.id) return 12;
      if (c.agama === 'anglikan' && fl.anglicanPrimate === c.id) return 14;
    }
    return 0;
  }

  public advanceRel(): void {
    const p = this.me();
    if (p.agama !== 'katolik') return this.msg('Karier hierarki Gereja hanya terbuka untuk umat Katolik.');
    if (p.profesi !== 'pendeta' && !this.relRankOf(p)) {
      return this.msg('Kamu harus menempuh jalan Rohaniwan/Pendeta terlebih dahulu di menu Karier.');
    }
    if (['menikah', 'bertunangan'].includes(p.sn) || p.pasangan) {
      return this.msg('Pejabat Gereja Katolik wajib selibat dan berstatus single (terkunci selama masih menikah/bertunangan).');
    }
    const nxt = this.nextRelRank(p);
    if (!nxt) return this.msg('Kamu sudah mencapai puncak hierarki Gereja.');
    if (nxt.id === 'paus') {
      return this.msg('Paus tidak bisa naik pangkat langsung! Kardinal harus dipilih melalui Konklaf saat Takhta Suci kosong.');
    }
    const minAge = nxt.minAge || 18;
    if (this.umur(p) < minAge) {
      return this.msg(`Usia minimal untuk menjadi ${nxt.nama} adalah ${minAge} tahun (usiamu kini ${this.umur(p)} tahun).`);
    }
    if (p.res.kesalehan < nxt.minPiety) return this.msg(`Butuh ${nxt.minPiety} kesalehan untuk menjadi ${nxt.nama}.`);

    if (nxt.id === 'uskup_agung') {
      const realm = this.realmOf(p);
      const existing = this.archbishopOf(realm.id);
      if (existing && existing.id !== p.id) {
        return this.msg(
          `Wilayah ${realm.nama} sudah memiliki Uskup Agung (${this.full(existing)}). Hanya boleh ada 1 Uskup Agung per wilayah.`
        );
      }
      if (!this.G.church.archbishops) this.G.church.archbishops = {};
      this.G.church.archbishops[realm.id] = p.id;
      this.G.church.bishops = this.G.church.bishops.filter((id) => id !== p.id);
    } else if (nxt.id === 'uskup' && !this.G.church.bishops.includes(p.id)) {
      this.G.church.bishops.push(p.id);
    } else if (nxt.id === 'kardinal') {
      if (!this.G.church.cardinals.includes(p.id)) this.G.church.cardinals.push(p.id);
      // Release Archbishop seat when elevated to Cardinal
      if (this.G.church.archbishops) {
        Object.keys(this.G.church.archbishops).forEach((rid) => {
          if (this.G.church.archbishops![rid] === p.id) delete this.G.church.archbishops![rid];
        });
      }
    }

    this.G.relRank[p.id] = nxt.id;
    const rankMap: Record<string, number> = { biarawan: 0, diakon: 0, imam: 1, uskup: 2, uskup_agung: 3, kardinal: 4, paus: 5 };
    p.rank = p.rank || {};
    p.rank['gereja_katolik'] = rankMap[nxt.id] ?? p.rank['gereja_katolik'] ?? 0;
    p.rankY = this.G.tahun;
    p.res.prestise += 15;
    this.dynLog(p.dinasti, `${this.full(p)} ditahbiskan menjadi ${nxt.nama}`);
    this.checkAchievements();
    this.msg(`Selamat! Kamu resmi ditahbiskan menjadi ${nxt.nama}.`);
  }

  public advanceNPCBishop(cid: string): void {
    const p = this.me();
    const myRank = this.relRankOf(p);
    if (!['paus', 'kardinal', 'uskup_agung'].includes(myRank)) {
      return this.msg('Hanya Uskup Agung, Kardinal, atau Paus yang berwenang menahbiskan Uskup.');
    }
    const c = this.C[cid];
    if (!c || !c.hidup || c.agama !== 'katolik') return this.msg('Kandidat tidak valid.');
    if (c.sn === 'menikah' || c.pasangan) return this.msg('Kandidat harus hidup selibat untuk ditahbiskan.');
    if (myRank === 'uskup_agung' && this.realmOf(c).id !== this.realmOf(p).id) {
      return this.msg(`Sebagai Uskup Agung, kamu hanya dapat menahbiskan Uskup di wilayah ${this.realmOf(p).nama}.`);
    }
    if (p.res.emas < 30) return this.msg('Butuh 30 emas untuk biaya upacara pentahbisan.');
    p.res.emas -= 30;
    if (!this.G.church.bishops.includes(cid)) this.G.church.bishops.push(cid);
    this.G.relRank[cid] = 'uskup';
    this.bump(c, 25);
    p.res.kesalehan += 10;
    this.msg(`${this.full(c)} ditahbiskan sebagai Uskup atas usulanmu. (+10 kesalehan)`);
  }

  public conclaveCandidates(): Character[] {
    const cards = this.G.church.cardinals
      .map((id) => this.C[id])
      .filter((c): c is Character => Boolean(c && c.hidup && c.agama === 'katolik' && c.sn !== 'menikah' && !c.pasangan));
    return cards.sort((a, b) => {
      const sa = this.dynastyInfluence(a).total + this.diplomaticSupport(a).total;
      const sb = this.dynastyInfluence(b).total + this.diplomaticSupport(b).total;
      return sb - sa;
    });
  }

  public canJoinConclave(c: Character): boolean {
    return c.hidup && c.agama === 'katolik' && this.relRankOf(c) === 'kardinal' && c.sn !== 'menikah' && !c.pasangan;
  }

  public dynastyInfluence(c: Character): {
    total: number;
    dynPrestige: number;
    dynTier: number;
    rulerBonus: number;
    personalPrestige: number;
    dynName: string;
  } {
    const dy = c.dinasti ? this.DY[c.dinasti] : undefined;
    const dynPrestige = Math.round(Math.min(50, (dy?.prestise || 0) / 15));
    const dynTier = (dy?.status_tier || 1) * 5;
    const rulerCount = c.dinasti
      ? this.withHeldMemo(
          () => Object.values(this.C).filter((x) => x.hidup && x.dinasti === c.dinasti && this.tierOf(x) >= 3).length
        )
      : 0;
    const rulerBonus = Math.min(20, rulerCount * 5);
    const personalPrestige = Math.round(Math.min(20, (c.res.prestise || 0) / 10));
    return {
      total: dynPrestige + dynTier + rulerBonus + personalPrestige,
      dynPrestige,
      dynTier,
      rulerBonus,
      personalPrestige,
      dynName: dy?.nama || 'Tanpa Dinasti',
    };
  }

  public diplomaticSupport(
    c: Character,
    voter?: Character
  ): { total: number; cardOpinion: number; dynAlliance: number; skillBonus: number; culturalBond: number } {
    const skillBonus = Math.round((c.sk.diplomasi || 0) * 0.45);
    let dynAlliance = 0;
    if (c.id === this.G.pid || (c.dinasti && c.dinasti === this.me()?.dinasti)) {
      dynAlliance = Math.min(20, (this.G.al || []).length * 5);
    } else {
      const friendlyRulers = this.withHeldMemo(
        () =>
          Object.values(this.C).filter(
            (x) => x.hidup && x.id !== c.id && this.tierOf(x) >= 3 && (this.opn(x, c) >= 20 || (c.dinasti && x.dinasti === c.dinasti))
          ).length
      );
      dynAlliance = Math.min(18, friendlyRulers * 3);
    }

    if (voter) {
      const rawOp = voter.id === c.id ? 35 : this.opn(voter, c);
      const cardOpinion = Math.round(rawOp * 0.65);
      const sharedDyn = voter.dinasti && c.dinasti && voter.dinasti === c.dinasti ? 25 : 0;
      const culturalBond = voter.budaya === c.budaya ? 10 : 0;
      return {
        total: cardOpinion + sharedDyn + culturalBond + skillBonus + dynAlliance,
        cardOpinion: cardOpinion + sharedDyn,
        dynAlliance,
        skillBonus,
        culturalBond,
      };
    }

    const electors = this.G.church.cardinals
      .map((id) => this.C[id])
      .filter((x): x is Character => Boolean(x && x.hidup && x.id !== c.id));
    const avgOp = electors.length
      ? Math.round(
          electors.reduce(
            (s, e) => s + this.opn(e, c) * 0.65 + (e.dinasti && e.dinasti === c.dinasti ? 25 : 0),
            0
          ) / electors.length
        )
      : 0;
    return {
      total: avgOp + skillBonus + dynAlliance,
      cardOpinion: avgOp,
      dynAlliance,
      skillBonus,
      culturalBond: 0,
    };
  }

  public scoreConclaveBallot(
    voter: Character,
    cand: Character
  ): { total: number; dynasty: number; diplomacy: number; piety: number } {
    const dynasty = this.dynastyInfluence(cand).total;
    let diplomacy = this.diplomaticSupport(cand, voter).total;
    if (this.G?.pid) {
      if (voter.id === this.G.pid && this.isFriend(cand.id)) diplomacy += 25;
      else if (cand.id === this.G.pid && this.isFriend(voter.id)) diplomacy += 28;
      if (voter.id === this.G.pid && this.isRival(cand.id)) diplomacy -= 35;
      else if (cand.id === this.G.pid && this.isRival(voter.id)) diplomacy -= 38;
    }
    const piety =
      Math.round(Math.min(25, (cand.res.kesalehan || 0) / 25)) +
      Math.round((cand.sk.pembelajaran || 0) * 0.15) +
      (this.umur(cand) >= 40 ? 5 : 0);
    return {
      total: dynasty + diplomacy + piety,
      dynasty,
      diplomacy,
      piety,
    };
  }

  public simulateConclaveTally(playerVoteId?: string) {
    this.seedChurchHierarchy();
    // PERF: tally ini baca-saja, jadi satu indeks gelar dipakai untuk semua perhitungan suara.
    return this.withHeldMemo(() => this.simulateConclaveTallyCore(playerVoteId));
  }

  private simulateConclaveTallyCore(playerVoteId?: string) {
    const p = this.me();
    const candidates = this.conclaveCandidates();
    const tallyMap: Record<
      string,
      {
        id: string;
        nama: string;
        votes: number;
        dynastyScore: number;
        diplomacyScore: number;
        totalScore: number;
      }
    > = {};
    candidates.forEach((c) => {
      const dyn = this.dynastyInfluence(c).total;
      const dip = this.diplomaticSupport(c).total;
      tallyMap[c.id] = {
        id: c.id,
        nama: this.full(c),
        votes: 0,
        dynastyScore: dyn,
        diplomacyScore: dip,
        totalScore: dyn + dip + Math.round(Math.min(25, c.res.kesalehan / 25)),
      };
    });

    const ballots: {
      voterId: string;
      voterName: string;
      targetId: string;
      targetName: string;
      dynastyScore: number;
      diplomacyScore: number;
    }[] = [];

    candidates.forEach((voter) => {
      let chosen: Character | null = null;
      let chosenScore = { total: 0, dynasty: 0, diplomacy: 0 };

      if (voter.id === p.id && playerVoteId && tallyMap[playerVoteId]) {
        chosen = this.C[playerVoteId];
        const sc = this.scoreConclaveBallot(voter, chosen);
        chosenScore = { total: sc.total, dynasty: sc.dynasty, diplomacy: sc.diplomacy };
      } else {
        let bestScore = -9999;
        candidates.forEach((cand) => {
          const sc = this.scoreConclaveBallot(voter, cand);
          const selfPref = voter.id === cand.id ? (voter.sifat.includes('ambisius') ? 22 : -8) : 0;
          const net = sc.total + selfPref;
          if (net > bestScore) {
            bestScore = net;
            chosen = cand;
            chosenScore = { total: net, dynasty: sc.dynasty, diplomacy: sc.diplomacy };
          }
        });
      }

      if (chosen && tallyMap[chosen.id]) {
        tallyMap[chosen.id].votes += 1;
        ballots.push({
          voterId: voter.id,
          voterName: this.full(voter),
          targetId: chosen.id,
          targetName: this.full(chosen),
          dynastyScore: chosenScore.dynasty,
          diplomacyScore: chosenScore.diplomacy,
        });
      }
    });

    const standings = Object.values(tallyMap).sort(
      (a, b) => b.votes - a.votes || b.dynastyScore + b.diplomacyScore - (a.dynastyScore + a.diplomacyScore) || b.totalScore - a.totalScore
    );
    return { standings, ballots, totalVotes: ballots.length };
  }

  public lobbyConclave(voterId: string, candidateId: string): void {
    const p = this.me();
    if (!this.canJoinConclave(p)) {
      return this.msg('Akses ditolak: Hanya Kardinal yang dapat melobi Dewan Kardinal dalam Konklaf.');
    }
    const pope = this.G.church.pope ? this.C[this.G.church.pope] : null;
    if (pope && pope.hidup) return this.msg('Konklaf tidak aktif karena Takhta Suci belum kosong.');
    const voter = this.C[voterId];
    const cand = this.C[candidateId];
    if (!voter || !cand || !voter.hidup || !cand.hidup || voter.id === p.id) {
      return this.msg('Kardinal target lobi tidak valid.');
    }
    const used = this.G.done['conclave_lobby'] || 0;
    if (used >= 3) return this.msg('Kesempatan lobi diplomatik Konklaf tahun ini sudah maksimal (3/3).');
    if (p.res.emas < 25) return this.msg('Butuh 25 emas untuk mengutus diplomasi lobi Konklaf.');
    p.res.emas -= 25;
    this.G.done['conclave_lobby'] = used + 1;

    const myDyn = this.dynastyInfluence(p).total;
    const gain = Math.max(12, Math.round(10 + p.sk.diplomasi * 0.25 + myDyn * 0.18));
    voter.op[cand.id] = Math.max(-100, Math.min(100, (voter.op[cand.id] ?? 0) + gain));
    this.bump(voter, 8);
    this.msg(
      `Lobi diplomatik ke Kardinal ${this.full(voter)} berhasil! Dukungan terhadap ${this.full(cand)} meningkat (+${gain} opini).`
    );
  }

  public campaignConclaveDynasty(candidateId: string): void {
    const p = this.me();
    if (!this.canJoinConclave(p)) {
      return this.msg('Akses ditolak: Hanya Kardinal yang dapat menggalang pengaruh dinasti di Konklaf.');
    }
    const pope = this.G.church.pope ? this.C[this.G.church.pope] : null;
    if (pope && pope.hidup) return this.msg('Konklaf tidak aktif karena Takhta Suci belum kosong.');
    if (this.G.done['conclave_dyn']) return this.msg('Penggalangan pengaruh dinasti sudah dilakukan dalam Konklaf ini.');
    const cand = this.C[candidateId];
    if (!cand || !cand.hidup) return this.msg('Kandidat tidak valid.');
    if (p.res.prestise < 25 && p.res.emas < 35) return this.msg('Butuh 25 prestise atau 35 emas.');
    if (p.res.prestise >= 25) p.res.prestise -= 25;
    else p.res.emas -= 35;
    this.G.done['conclave_dyn'] = 1;

    const dynPower = this.dynastyInfluence(p).total;
    const boost = Math.max(10, Math.round(8 + dynPower * 0.2));
    this.conclaveCandidates().forEach((v) => {
      if (v.id !== p.id) {
        v.op[cand.id] = Math.max(-100, Math.min(100, (v.op[cand.id] ?? 0) + boost));
      }
    });
    this.msg(
      `Pengaruh dinasti ${this.dynastyInfluence(p).dynName} dikerahkan untuk ${this.full(cand)} (+${boost} opini seluruh Kardinal).`
    );
  }

  private resolveConclaveVotes(playerVoteId?: string): Character {
    const tally = this.simulateConclaveTally(playerVoteId);
    const winnerId = tally.standings[0]?.id;
    const winner =
      (winnerId && this.C[winnerId]) ||
      this.mkC({
        nama: 'Gregorius',
        gender: 'L',
        agama: 'katolik',
        budaya: 'italia',
        lahir: this.G.tahun - 52,
        profesi: 'pendeta',
        kelas: 'rohaniwan',
        sn: 'selibat',
      });

    this.G.church.pope = winner.id;
    this.G.church.cardinals = this.G.church.cardinals.filter((id) => id !== winner.id);
    this.G.church.bishops = this.G.church.bishops.filter((id) => id !== winner.id);
    if (this.G.church.archbishops) {
      Object.keys(this.G.church.archbishops).forEach((rid) => {
        if (this.G.church.archbishops![rid] === winner.id) delete this.G.church.archbishops![rid];
      });
    }
    this.G.relRank[winner.id] = 'paus';
    winner.rank = winner.rank || {};
    winner.rank['gereja_katolik'] = 5;
    this.G.popeHistory.push({ id: winner.id, y: this.G.tahun });
    this.G.church.lastConclave = {
      year: this.G.tahun,
      winnerId: winner.id,
      winnerName: this.full(winner),
      totalVotes: tally.totalVotes,
      standings: tally.standings,
      ballots: tally.ballots,
    };
    delete this.G.done['conclave_wait'];
    delete this.G.done['conclave_lobby'];
    delete this.G.done['conclave_dyn'];
    this.seedChurchHierarchy();
    return winner;
  }

  public openConclave(voteForId?: string): void {
    const p = this.me();
    const curPope = this.G.church.pope ? this.C[this.G.church.pope] : null;
    if (curPope && curPope.hidup) return this.msg('Takhta Suci belum kosong.');
    if (!this.canJoinConclave(p)) {
      return this.msg('Akses ditolak: Konklaf Pemilihan Paus hanya bisa diakses oleh Kardinal!');
    }

    const candidates = this.conclaveCandidates();
    if (!candidates.some((c) => c.id === p.id) && !this.G.church.cardinals.includes(p.id)) {
      this.G.church.cardinals.push(p.id);
    }

    const winner = this.resolveConclaveVotes(voteForId);
    const lc = this.G.church.lastConclave;
    const winVotes = lc?.standings[0]?.votes ?? 1;

    if (winner.id === p.id) {
      p.res.prestise += 60;
      this.dynLog(p.dinasti, `${this.full(p)} terpilih dalam Konklaf sebagai Paus Roma!`);
    }
    this.notifyLog(
      `Konklaf memilih ${this.full(winner)} sebagai Paus baru (${winVotes}/${lc?.totalVotes || 1} suara Kardinal)!`,
      '⛪'
    );
    this.checkAchievements();
    this.msg(`Habemus Papam! ${this.full(winner)} terpilih sebagai Paus dengan ${winVotes}/${lc?.totalVotes || 1} suara.`);
  }

  public canExcommunicateTarget(actor: Character, target: Character): { ok: boolean; reason?: string } {
    if (!target.hidup || target.agama !== 'katolik') return { ok: false, reason: 'Target bukan umat Katolik yang hidup.' };
    if (target.id === actor.id) return { ok: false, reason: 'Tidak bisa mengekskomunikasi diri sendiri.' };
    const rank = this.relRankOf(actor);
    if (rank === 'paus' || this.G.church.pope === actor.id) return { ok: true };
    if (rank === 'uskup_agung') {
      const myRealm = this.realmOf(actor);
      const tgtRealm = this.realmOf(target);
      if (myRealm.id !== tgtRealm.id) {
        return {
          ok: false,
          reason: `Uskup Agung hanya berwenang mengekskomunikasi tokoh di wilayahnya sendiri (${myRealm.nama}), bukan di ${tgtRealm.nama}.`,
        };
      }
      return { ok: true };
    }
    return { ok: false, reason: 'Wewenang ekskomunikasi hanya dimiliki Paus atau Uskup Agung wilayah setempat.' };
  }

  public excommunicate(cid: string): void {
    const p = this.me();
    const target = this.C[cid];
    if (!target || !target.hidup) return;
    const perm = this.canExcommunicateTarget(p, target);
    if (!perm.ok) return this.msg(perm.reason || 'Tidak memiliki wewenang ekskomunikasi.');
    this.G.church.excom[cid] = { by: p.id, y: this.G.tahun };
    this.bump(target, -60);
    target.res.prestise = Math.max(0, target.res.prestise - 30);
    const scope = this.relRankOf(p) === 'paus' ? 'oleh Takhta Suci' : `oleh Uskup Agung ${this.realmOf(p).nama}`;
    this.notifyLog(`${this.full(target)} diekskomunikasi ${scope}!`, '🔥');
    this.msg(`${this.full(target)} resmi diekskomunikasi.`);
  }

  public liftExcom(cid: string): void {
    if (!this.G.church.excom[cid]) return;
    const p = this.me();
    const target = this.C[cid];
    const myRank = this.relRankOf(p);
    const isPope = this.G.church.pope === p.id || myRank === 'paus';
    const isLocalArch = myRank === 'uskup_agung' && target && this.realmOf(target).id === this.realmOf(p).id;
    if (!isPope && !isLocalArch && cid !== p.id) {
      return this.msg('Hanya Paus atau Uskup Agung wilayah setempat yang dapat mencabut ekskomunikasi.');
    }
    if (cid === p.id && !isPope) {
      if (p.res.emas < 60 && p.res.kesalehan < 80) return this.msg('Butuh 60 emas atau 80 kesalehan untuk tebusan dosa.');
      if (p.res.emas >= 60) p.res.emas -= 60;
      else p.res.kesalehan -= 80;
    }
    delete this.G.church.excom[cid];
    this.msg(`Ekskomunikasi atas ${target ? this.full(target) : cid} dicabut.`);
  }

  public interdictKingdom(tid: string): void {
    const p = this.me();
    const t = this.T[tid];
    if (!t) return;
    if (this.G.church.pope !== p.id) {
      return this.msg('Hanya Paus Roma yang berwenang menjatuhkan Interdik kerajaan.');
    }
    this.G.church.interdict[tid] = { by: p.id, y: this.G.tahun };
    if (t.pem && this.C[t.pem]) this.bump(this.C[t.pem], -50);
    this.notifyLog(`Interdik gerejawi dijatuhkan atas ${t.nama}.`, '⛔');
    this.msg(`Interdik dijatuhkan atas ${t.nama}.`);
  }

  public setChurchDoctrine(doc: string): void {
    const p = this.me();
    const r = this.relRankOf(p);
    if (this.G.church.pope !== p.id && r !== 'kardinal' && !this.G.church.cardinals.includes(p.id)) {
      return this.msg('Hanya Paus atau Kardinal yang bisa menetapkan doktrin Konsili.');
    }
    this.G.church.doctrine = doc;
    p.res.prestise += 15;
    this.msg(`Konsili Gereja menetapkan doktrin: ${doc}.`);
  }

  private churchTick(): void {
    this.seedChurchHierarchy();
    this.seedFaithLeaders();
    const pope = this.G.church.pope ? this.C[this.G.church.pope] : null;
    if (!pope || !pope.hidup) {
      this.G.church.pope = null;
      const p = this.me();
      // Give Catholic Cardinal player one turn window to enter Conclave before AI settles it
      if (this.canJoinConclave(p) && !this.G.done['conclave_wait']) {
        this.G.done['conclave_wait'] = 1;
        this.G.log.unshift('Takhta Suci kosong! Sebagai Kardinal, kamu dapat memasuki Konklaf di menu Gereja.');
        return;
      }
      const winner = this.resolveConclaveVotes();
      const lc = this.G.church.lastConclave;
      const winVotes = lc?.standings[0]?.votes ?? 1;
      this.G.log.unshift(
        `Konklaf Kardinal memilih Paus baru: ${this.full(winner)} (${winVotes}/${lc?.totalVotes || 1} suara).`
      );
    }
  }

  // ============ MULTI-FAITH INSTITUTIONS (ISLAM, ORTODOKS, PROTESTAN, ANGLIKAN) ============
  public faithLeadershipEnsure(): FaithLeadership {
    if (!this.G.faithLeadership) {
      this.G.faithLeadership = {
        patriarch: null,
        syekhulIslam: null,
        synodModerator: null,
        anglicanPrimate: null,
        activeFatwa: null,
        orthodoxCanon: 'Kanon Konsili Ekumenis',
        protestantConfession: 'Pengakuan Iman Augsburg',
        anglicanAct: Boolean(this.G.anglican),
      };
    }
    return this.G.faithLeadership;
  }

  public faithLeaderTitle(c: Character): string {
    const fl = this.G?.faithLeadership;
    if (!fl || !c.hidup) return '';
    if (c.agama === 'ortodoks' && fl.patriarch === c.id) return 'Patriark Ekumenis';
    if (c.agama === 'islam' && fl.syekhulIslam === c.id) return 'Syekhul Islam';
    if (c.agama === 'protestan' && fl.synodModerator === c.id) return 'Moderator Sinode';
    if (c.agama === 'anglikan' && fl.anglicanPrimate === c.id) return 'Uskup Agung Anglikan';
    return '';
  }

  public faithLadderId(agama: string): string | null {
    const map: Record<string, string> = {
      katolik: 'gereja_katolik',
      ortodoks: 'gereja_ortodoks',
      anglikan: 'gereja_anglikan',
      protestan: 'gereja_protestan',
      islam: 'ulama_islam',
    };
    return map[agama] || null;
  }

  public seedFaithLeaders(): void {
    const fl = this.faithLeadershipEnsure();
    const allLiving = Object.values(this.C).filter((c) => c.hidup);
    const playerAgama = this.G.pid && this.C[this.G.pid]?.hidup ? this.C[this.G.pid].agama : '';

    // 1. Orthodox Patriarch
    if (!fl.patriarch || !this.C[fl.patriarch]?.hidup || this.C[fl.patriarch].agama !== 'ortodoks') {
      let pat = allLiving
        .filter((c) => c.agama === 'ortodoks' && (c.profesi === 'pendeta' || c.res.kesalehan >= 120))
        .sort((a, b) => b.res.kesalehan + b.sk.pembelajaran - (a.res.kesalehan + a.sk.pembelajaran))[0];
      if (!pat) {
        pat = this.mkC({
          nama: pick(['Ioannes Xiphilinos', 'Nikolaus Grammatikos', 'Michael Keroularios II', 'Gregorios'],),
          gender: 'L',
          agama: 'ortodoks',
          budaya: 'italia',
          lahir: this.G.tahun - R(45, 58),
          profesi: 'pendeta',
          kelas: 'rohaniwan',
          sn: 'selibat',
          res: { prestise: R(80, 140), emas: R(40, 80), kesalehan: R(320, 440) },
          sk: { diplomasi: R(55, 80), spionase: R(25, 45), perang: R(15, 30), administrasi: R(55, 80), pembelajaran: R(70, 92) },
        });
      }
      fl.patriarch = pat.id;
      pat.rank = pat.rank || {};
      pat.rank['gereja_ortodoks'] = 4;
    }

    // 2. Islam Syekhul Islam (active if Islam NPCs exist or player is Islam)
    const hasIslam = playerAgama === 'islam' || allLiving.some((c) => c.agama === 'islam');
    if (hasIslam && (!fl.syekhulIslam || !this.C[fl.syekhulIslam]?.hidup || this.C[fl.syekhulIslam].agama !== 'islam')) {
      let syekh = allLiving
        .filter((c) => c.agama === 'islam' && (c.profesi === 'pendeta' || c.sk.pembelajaran >= 45 || c.res.kesalehan >= 80))
        .sort((a, b) => b.res.kesalehan + b.sk.pembelajaran - (a.res.kesalehan + a.sk.pembelajaran))[0];
      if (!syekh) {
        syekh = this.mkC({
          nama: pick(['Al-Qadi al-Fadil', 'Ibn Hamdis', 'Imam al-Siqilli', 'Syeikh Yusuf al-Palermi']),
          gender: 'L',
          agama: 'islam',
          budaya: 'arab',
          lahir: this.G.tahun - R(42, 56),
          profesi: 'pendeta',
          kelas: 'rohaniwan',
          sn: 'lajang',
          res: { prestise: R(60, 120), emas: R(35, 75), kesalehan: R(300, 420) },
          sk: { diplomasi: R(50, 78), spionase: R(20, 45), perang: R(20, 40), administrasi: R(60, 85), pembelajaran: R(75, 95) },
        });
      }
      fl.syekhulIslam = syekh.id;
      syekh.rank = syekh.rank || {};
      syekh.rank['ulama_islam'] = 4;
    }

    // 3. Protestant Synod Moderator (when Protestant exists / started / 1517+)
    const hasProt = this.G.protestantStarted || this.G.tahun >= 1517 || playerAgama === 'protestan' || allLiving.some((c) => c.agama === 'protestan');
    if (hasProt && (!fl.synodModerator || !this.C[fl.synodModerator]?.hidup || this.C[fl.synodModerator].agama !== 'protestan')) {
      let mod = allLiving
        .filter((c) => c.agama === 'protestan' && (c.profesi === 'pendeta' || c.res.kesalehan >= 80))
        .sort((a, b) => b.res.kesalehan + b.sk.pembelajaran - (a.res.kesalehan + a.sk.pembelajaran))[0];
      if (!mod) {
        mod = this.mkC({
          nama: pick(['Philipp Melanchthon', 'Johannes Bugenhagen', 'Heinrich Bullinger', 'Martin Bucer']),
          gender: 'L',
          agama: 'protestan',
          budaya: 'german',
          lahir: this.G.tahun - R(38, 52),
          profesi: 'pendeta',
          kelas: 'rohaniwan',
          sn: 'lajang',
          res: { prestise: R(55, 110), emas: R(30, 65), kesalehan: R(260, 380) },
          sk: { diplomasi: R(55, 80), spionase: R(20, 40), perang: R(15, 30), administrasi: R(55, 80), pembelajaran: R(75, 95) },
        });
      }
      fl.synodModerator = mod.id;
      mod.rank = mod.rank || {};
      mod.rank['gereja_protestan'] = 4;
    }

    // 4. Anglican Primate (Archbishop of Canterbury) when Anglican exists
    const hasAng = this.G.anglican || playerAgama === 'anglikan' || allLiving.some((c) => c.agama === 'anglikan');
    if (hasAng && (!fl.anglicanPrimate || !this.C[fl.anglicanPrimate]?.hidup || this.C[fl.anglicanPrimate].agama !== 'anglikan')) {
      let pri = allLiving
        .filter((c) => c.agama === 'anglikan' && (c.profesi === 'pendeta' || c.res.kesalehan >= 80))
        .sort((a, b) => b.res.kesalehan + b.sk.pembelajaran - (a.res.kesalehan + a.sk.pembelajaran))[0];
      if (!pri) {
        pri = this.mkC({
          nama: pick(['Thomas Cranmer', 'Matthew Parker', 'Edmund Grindal', 'John Whitgift']),
          gender: 'L',
          agama: 'anglikan',
          budaya: 'inggris',
          lahir: this.G.tahun - R(40, 54),
          profesi: 'pendeta',
          kelas: 'rohaniwan',
          sn: 'lajang',
          res: { prestise: R(65, 115), emas: R(40, 80), kesalehan: R(260, 380) },
          sk: { diplomasi: R(58, 82), spionase: R(20, 45), perang: R(15, 30), administrasi: R(60, 84), pembelajaran: R(72, 92) },
        });
      }
      fl.anglicanPrimate = pri.id;
      pri.rank = pri.rank || {};
      pri.rank['gereja_anglikan'] = 3;
    }
  }

  public faithRankInfo(c: Character) {
    const lid = this.faithLadderId(c.agama);
    if (!lid || c.agama === 'katolik') return null;
    const J = this.D.jenjang_karier?.[lid];
    if (!J || !Array.isArray(J.pangkat) || J.pangkat.length === 0) return null;
    const curIdx = Math.min(J.pangkat.length - 1, Math.max(0, c.rank?.[lid] ?? 0));
    const cur = J.pangkat[curIdx];
    const nextIdx = curIdx < J.pangkat.length - 1 ? curIdx + 1 : null;
    const next = nextIdx !== null ? J.pangkat[nextIdx] : null;
    const pietyTable = [0, 40, 100, 180, 280];
    const ageTable = [18, 22, 26, 30, 35];
    const goldTable = [0, 15, 30, 50, 75];
    return {
      ladderId: lid,
      curIdx,
      curName: cur.nama as string,
      nextIdx,
      nextName: next ? (next.nama as string) : null,
      minPiety: nextIdx !== null ? pietyTable[nextIdx] ?? 100 : 0,
      minAge: nextIdx !== null ? ageTable[nextIdx] ?? 22 : 18,
      goldCost: nextIdx !== null ? goldTable[nextIdx] ?? 25 : 0,
    };
  }

  public advanceFaithCareer(): void {
    const p = this.me();
    if (p.agama === 'katolik') {
      this.advanceRel();
      return;
    }
    const info = this.faithRankInfo(p);
    if (!info) return this.msg('Agamamu belum memiliki tangga jenjang rohani resmi.');
    if (p.profesi !== 'pendeta' && (p.rank?.[info.ladderId] ?? 0) === 0 && !this.faithLeaderTitle(p)) {
      return this.msg('Masuki jalur Rohaniwan/Ulama/Pendeta terlebih dahulu di menu Karier, atau kelola Tempat Ibadah.');
    }
    if (info.nextIdx === null || !info.nextName) {
      return this.msg('Kamu sudah berada pada puncak hierarki agamamu.');
    }
    if (this.umur(p) < info.minAge) {
      return this.msg(`Usia minimal untuk ${info.nextName} adalah ${info.minAge} tahun.`);
    }
    if (p.res.kesalehan < info.minPiety) {
      return this.msg(`Butuh ${info.minPiety} kesalehan untuk diangkat menjadi ${info.nextName}.`);
    }
    if (p.res.emas < info.goldCost) {
      return this.msg(`Butuh ${info.goldCost} emas untuk pengukuhan majelis.`);
    }

    const fl = this.faithLeadershipEnsure();
    if (p.agama === 'ortodoks' && info.nextIdx === 4 && fl.patriarch && this.C[fl.patriarch]?.hidup && fl.patriarch !== p.id) {
      return this.msg(`Takhta Patriark sedang dijabat oleh ${this.full(this.C[fl.patriarch])}. Ajukan pemilihan Sinode saat kursi kosong.`);
    }

    p.res.emas -= info.goldCost;
    p.rank = p.rank || {};
    p.rank[info.ladderId] = info.nextIdx;
    p.rankY = this.G.tahun;
    p.res.prestise += 15;

    if (p.agama === 'islam' && info.nextIdx === 4) fl.syekhulIslam = p.id;
    if (p.agama === 'ortodoks' && info.nextIdx === 4) fl.patriarch = p.id;
    if (p.agama === 'protestan' && info.nextIdx === 4) fl.synodModerator = p.id;
    if (p.agama === 'anglikan' && info.nextIdx === 3) fl.anglicanPrimate = p.id;

    this.dynLog(p.dinasti, `${this.full(p)} diangkat menjadi ${info.nextName}`);
    this.msg(`Selamat! Kamu resmi dikukuhkan menjadi ${info.nextName}.`);
  }

  public electSyekhulIslam(): void {
    const p = this.me();
    if (p.agama !== 'islam') return this.msg('Hanya untuk umat Islam.');
    const fl = this.faithLeadershipEnsure();
    if (this.G.done['majelis_syura']) return this.msg('Majelis Syura Ulama sudah bersidang tahun ini.');
    const cur = fl.syekhulIslam ? this.C[fl.syekhulIslam] : null;
    if (cur && cur.hidup && cur.id === p.id) return this.msg('Kamu sudah menjabat sebagai Syekhul Islam.');
    if (p.res.kesalehan < 150 && this.tierOf(p) < 3) {
      return this.msg('Butuh 150 kesalehan atau gelar penguasa untuk mengikuti Sidang Majelis Ulama.');
    }
    this.G.done['majelis_syura'] = 1;

    const myScore = p.res.kesalehan * 0.5 + p.sk.pembelajaran * 1.4 + p.sk.diplomasi + this.dynastyInfluence(p).total;
    const curScore = cur && cur.hidup
      ? cur.res.kesalehan * 0.5 + cur.sk.pembelajaran * 1.4 + cur.sk.diplomasi + 40
      : 0;
    if (myScore >= curScore || !cur || !cur.hidup) {
      fl.syekhulIslam = p.id;
      p.rank = p.rank || {};
      p.rank['ulama_islam'] = 4;
      p.res.prestise += 35;
      this.notifyLog(`${this.full(p)} dipilih Majelis Ulama sebagai Syekhul Islam!`, '☪️');
      this.msg(`Majelis Ulama mengukuhkanmu sebagai Syekhul Islam!`);
    } else {
      p.res.kesalehan += 10;
      this.msg(`Majelis Ulama mempertahankan ${this.full(cur)} (skor pengaruhmu ${Math.round(myScore)} vs ${Math.round(curScore)}). (+10 kesalehan)`);
    }
  }

  public issueFatwa(fatwaId: 'qadi' | 'ummah' | 'ijtihad' | 'jihad'): void {
    const p = this.me();
    if (p.agama !== 'islam') return this.msg('Hanya berlaku untuk umat Islam.');
    const fl = this.faithLeadershipEnsure();
    const myRank = p.rank?.['ulama_islam'] ?? 0;
    const isUlama = fl.syekhulIslam === p.id || myRank >= 2 || this.tierOf(p) >= 3;
    if (!isUlama) return this.msg('Hanya Qadi, Mufti, Syekhul Islam, atau penguasa berdaulat yang dapat mengeluarkan Fatwa.');
    if (p.res.kesalehan < 25) return this.msg('Butuh 25 kesalehan untuk mengeluarkan Fatwa.');
    p.res.kesalehan -= 25;
    fl.activeFatwa = fatwaId;
    const names: Record<string, string> = {
      qadi: 'Fatwa Keadilan Qadi (+2 Admin, +3 Emas/th)',
      ummah: 'Fatwa Solidaritas Ummah (+6 Bahagia Rakyat, +12 Opini Muslim)',
      ijtihad: 'Fatwa Ijtihad Ilmu (+3 Pembelajaran, +15 Prestise)',
      jihad: 'Fatwa Bela Negeri (+5 Perang, +10% Moral Pasukan)',
    };
    if (fatwaId === 'qadi') p.sk.administrasi = cl(p.sk.administrasi + 2);
    if (fatwaId === 'ummah') {
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 6);
      Object.values(this.C).forEach((c) => {
        if (c.hidup && c.id !== p.id && c.agama === 'islam') this.bump(c, 12);
      });
    }
    if (fatwaId === 'ijtihad') {
      p.sk.pembelajaran = cl(p.sk.pembelajaran + 3);
      p.res.prestise += 15;
    }
    if (fatwaId === 'jihad') {
      p.sk.perang = cl(p.sk.perang + 3);
      this.G.morale = cl((this.G.morale ?? 80) + 10);
    }
    this.notifyLog(`${this.full(p)} mengeluarkan ${names[fatwaId]}.`, '📜');
    this.msg(`Fatwa dikeluarkan: ${names[fatwaId]}.`);
  }

  public collectZakatSocial(): void {
    const p = this.me();
    if (p.agama !== 'islam') return this.msg('Hanya untuk umat Islam.');
    if (this.G.done['zakat_yr']) return this.msg('Program Zakat & Wakaf tahun ini sudah dijalankan.');
    if (p.res.emas < 15) return this.msg('Butuh 15 emas untuk menyalurkan Zakat & Wakaf.');
    this.G.done['zakat_yr'] = 1;
    p.res.emas -= 15;
    p.res.kesalehan += 18;
    p.res.prestise += 10;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 6);
    this.deed(p.id, 'charity', 2);
    this.msg('Zakat & Wakaf Sosial disalurkan (+18 kesalehan, +10 prestise, +6 kebahagiaan rakyat).');
  }

  public electOrthodoxPatriarch(): void {
    const p = this.me();
    if (p.agama !== 'ortodoks') return this.msg('Hanya untuk umat Kristen Ortodoks.');
    const fl = this.faithLeadershipEnsure();
    const cur = fl.patriarch ? this.C[fl.patriarch] : null;
    if (cur && cur.hidup && cur.agama === 'ortodoks') {
      return this.msg(`Kursi Patriark masih dijabat ${this.full(cur)}. Sinode pemilihan baru dibuka bila kursi kosong.`);
    }
    const cands = Object.values(this.C)
      .filter((c) => c.hidup && c.agama === 'ortodoks' && (c.profesi === 'pendeta' || c.res.kesalehan >= 90))
      .sort((a, b) => {
        const sa = a.res.kesalehan * 0.5 + a.sk.pembelajaran + this.dynastyInfluence(a).total + this.diplomaticSupport(a).skillBonus;
        const sb = b.res.kesalehan * 0.5 + b.sk.pembelajaran + this.dynastyInfluence(b).total + this.diplomaticSupport(b).skillBonus;
        return sb - sa;
      });
    const winner = cands[0] || p;
    fl.patriarch = winner.id;
    winner.rank = winner.rank || {};
    winner.rank['gereja_ortodoks'] = 4;
    if (winner.id === p.id) p.res.prestise += 40;
    this.notifyLog(`Sinode Suci Ortodoks memilih ${this.full(winner)} sebagai Patriark Ekumenis.`, '☦️');
    this.msg(`Sinode Suci mengukuhkan ${this.full(winner)} sebagai Patriark Ekumenis!`);
  }

  public setOrthodoxCanon(canon: string): void {
    const p = this.me();
    if (p.agama !== 'ortodoks') return this.msg('Hanya untuk umat Ortodoks.');
    const fl = this.faithLeadershipEnsure();
    const myRank = p.rank?.['gereja_ortodoks'] ?? 0;
    if (fl.patriarch !== p.id && myRank < 3 && this.tierOf(p) < 4) {
      return this.msg('Hanya Patriark, Metropolit, atau penguasa Ortodoks tinggi yang berhak menetapkan Kanon Sinode.');
    }
    fl.orthodoxCanon = canon;
    p.res.kesalehan += 10;
    p.res.prestise += 12;
    this.msg(`Sinode Suci menetapkan kanon: ${canon}.`);
  }

  public orthodoxAnathematize(cid: string): void {
    const p = this.me();
    const fl = this.faithLeadershipEnsure();
    if (p.agama !== 'ortodoks' || fl.patriarch !== p.id) {
      return this.msg('Hanya Patriark Ekumenis yang dapat menjatuhkan Anatema.');
    }
    const target = this.C[cid];
    if (!target || !target.hidup || target.agama !== 'ortodoks' || target.id === p.id) {
      return this.msg('Target Anatema tidak valid.');
    }
    this.G.church.excom[cid] = { by: p.id, y: this.G.tahun };
    this.bump(target, -55);
    target.res.prestise = Math.max(0, target.res.prestise - 25);
    this.notifyLog(`Patriark ${this.full(p)} menjatuhkan Anatema kepada ${this.full(target)}.`, '☦️');
    this.msg(`Anatema dijatuhkan kepada ${this.full(target)}.`);
  }

  public electSynodModerator(): void {
    const p = this.me();
    if (p.agama !== 'protestan') return this.msg('Hanya untuk umat Protestan.');
    if (this.G.done['synod_prot']) return this.msg('Sidang Sinode Jemaat sudah dilakukan tahun ini.');
    const fl = this.faithLeadershipEnsure();
    if (fl.synodModerator === p.id) return this.msg('Kamu sudah menjabat sebagai Moderator Sinode.');
    if (p.res.kesalehan < 100 && p.sk.pembelajaran < 45) {
      return this.msg('Butuh 100 kesalehan atau 45 pembelajaran untuk mencalonkan diri di Sinode.');
    }
    this.G.done['synod_prot'] = 1;
    const cur = fl.synodModerator ? this.C[fl.synodModerator] : null;
    const myScore = p.sk.pembelajaran * 1.6 + p.res.kesalehan * 0.4 + p.sk.diplomasi + this.dynastyInfluence(p).total * 0.6;
    const curScore = cur && cur.hidup ? cur.sk.pembelajaran * 1.6 + cur.res.kesalehan * 0.4 + cur.sk.diplomasi + 30 : 0;
    if (myScore >= curScore || !cur || !cur.hidup) {
      fl.synodModerator = p.id;
      p.rank = p.rank || {};
      p.rank['gereja_protestan'] = 4;
      p.res.prestise += 25;
      this.notifyLog(`Sinode Jemaat memilih ${this.full(p)} sebagai Moderator Sinode.`, '📖');
      this.msg('Sinode Jemaat memilihmu sebagai Moderator Sinode Protestan!');
    } else {
      p.res.kesalehan += 8;
      this.msg(`Sinode tetap mempercayai ${this.full(cur)} (${Math.round(myScore)} vs ${Math.round(curScore)}). (+8 kesalehan)`);
    }
  }

  public protestantBibleReform(confession?: string): void {
    const p = this.me();
    if (p.agama !== 'protestan') return this.msg('Hanya untuk umat Protestan.');
    if (this.G.done['prot_bible']) return this.msg('Sudah mencetak Alkitab & Sekolah Jemaat tahun ini.');
    if (p.res.emas < 30) return this.msg('Butuh 30 emas untuk percetakan Alkitab vernakular & sekolah jemaat.');
    this.G.done['prot_bible'] = 1;
    p.res.emas -= 30;
    p.sk.pembelajaran = cl(p.sk.pembelajaran + 2);
    p.res.kesalehan += 15;
    p.res.prestise += 12;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 5);
    const fl = this.faithLeadershipEnsure();
    if (confession) fl.protestantConfession = confession;
    this.msg(`Percetakan Alkitab & Sekolah Jemaat (${fl.protestantConfession}) berhasil! (+2 Pembelajaran, +15 Kesalehan, +5 Bahagia Rakyat)`);
  }

  public anglicanAppointPrimate(cid: string): void {
    const p = this.me();
    if (p.agama !== 'anglikan') return this.msg('Hanya untuk umat Anglikan.');
    if (this.tierOf(p) < 3) return this.msg('Hanya Penguasa Anglikan (Supreme Governor, min. Count) yang dapat menunjuk Uskup Agung.');
    const target = this.C[cid];
    if (!target || !target.hidup || target.agama !== 'anglikan') return this.msg('Kandidat harus beragama Anglikan.');
    const fl = this.faithLeadershipEnsure();
    fl.anglicanPrimate = cid;
    target.rank = target.rank || {};
    target.rank['gereja_anglikan'] = 3;
    p.res.kesalehan += 15;
    this.bump(target, 25);
    this.notifyLog(`${this.full(p)} (Supreme Governor) menunjuk ${this.full(target)} sebagai Uskup Agung Anglikan.`, '👑');
    this.msg(`${this.full(target)} resmi ditunjuk sebagai Uskup Agung Gereja Anglikan.`);
  }

  public anglicanConfirmAct(): void {
    const p = this.me();
    if (p.agama !== 'anglikan') return this.msg('Hanya untuk umat Anglikan.');
    if (this.tierOf(p) < 3) return this.msg('Butuh gelar Penguasa untuk mengesahkan Akta Gereja Kerajaan.');
    const fl = this.faithLeadershipEnsure();
    if (fl.anglicanAct) return this.msg('Book of Common Prayer & Akta Supremasi sudah disahkan.');
    if (p.res.emas < 35) return this.msg('Butuh 35 emas.');
    p.res.emas -= 35;
    fl.anglicanAct = true;
    p.res.prestise += 25;
    p.res.kesalehan += 12;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 5);
    this.notifyLog(`${this.full(p)} mengesahkan Book of Common Prayer & Akta Supremasi Gereja Kerajaan.`, '📖');
    this.msg('Book of Common Prayer resmi disahkan! (+25 Prestise, +12 Kesalehan)');
  }

  public anglicanDissolveMonastery(): void {
    const p = this.me();
    if (p.agama !== 'anglikan') return this.msg('Hanya untuk penguasa Anglikan.');
    if (this.tierOf(p) < 3) return this.msg('Butuh minimal gelar Count.');
    if (this.G.done['ang_monastery']) return this.msg('Sekularisasi biara sudah dijalankan tahun ini.');
    this.G.done['ang_monastery'] = 1;
    this.addStateFunds(45, p);
    p.res.kesalehan = Math.max(0, p.res.kesalehan - 10);
    Object.values(this.C).forEach((c) => {
      if (c.hidup && c.agama === 'katolik') this.bump(c, -10);
    });
    this.msg('Sekularisasi biara berhasil! Kas Negara menerima +45 emas (-10 kesalehan, opini Katolik menurun).');
  }

  // ============ PLACE OF WORSHIP MANAGEMENT (TEMPAT IBADAH) ============
  public worshipLabels(agama: string): {
    singular: string;
    tiers: [string, string, string];
    official: string;
    actionName: string;
  } {
    switch (agama) {
      case 'islam':
        return {
          singular: 'Masjid & Madrasah',
          tiers: ['Surau / Mushalla', 'Masjid Jami', 'Masjid Agung & Madrasah'],
          official: 'Imam / Qadi',
          actionName: 'Pengajian & Santunan Jumat',
        };
      case 'ortodoks':
        return {
          singular: 'Gereja Ortodoks',
          tiers: ['Kapel Ortodoks', 'Biara Ikon', 'Katedral Patriarkat'],
          official: 'Imam Ortodoks',
          actionName: 'Liturgi Suci & Pemberkatan',
        };
      case 'protestan':
        return {
          singular: 'Gereja Jemaat',
          tiers: ['Kapel Jemaat', 'Sekolah Alkitab', 'Gereja Reformasi'],
          official: 'Pendeta Jemaat',
          actionName: 'Kebaktian & Khotbah Jemaat',
        };
      case 'anglikan':
        return {
          singular: 'Gereja Anglikan',
          tiers: ['Paroki Kerajaan', 'Kapel Kerajaan', 'Katedral Agung'],
          official: 'Vikaris / Rektor',
          actionName: 'Doa Bersama Kerajaan',
        };
      case 'pagan':
        return {
          singular: 'Kuil Leluhur & Altar Suci',
          tiers: ['Altar Hutan / Batu Suci', 'Kuil Adat Suku', 'Kuil Agung Para Leluhur'],
          official: 'Dukun / Pendeta Adat',
          actionName: 'Ritual Leluhur & Persembahan Suci',
        };
      default:
        return {
          singular: 'Gereja',
          tiers: ['Gereja Paroki', 'Biara Keuskupan', 'Katedral Agung'],
          official: 'Pastor Paroki',
          actionName: 'Misa Agung & Ziarah',
        };
    }
  }

  private ensureSiteFields(site: WorshipSite): WorshipSite {
    const capByLevel = [250, 600, 1200][Math.max(0, Math.min(2, (site.level || 1) - 1))];
    if (site.congregationCapacity === undefined) site.congregationCapacity = capByLevel;
    if (site.congregation === undefined) site.congregation = Math.min(capByLevel, 120 * (site.level || 1));
    if (site.congregationOpinion === undefined) site.congregationOpinion = 55;
    if (!site.sermonTheme) site.sermonTheme = 'harmoni';
    return site;
  }

  public worshipSites(): WorshipSite[] {
    const p = this.me();
    if (!this.G.worship) this.G.worship = {};
    const lb = this.worshipLabels(p.agama);
    const counties = this.held(p.id).filter((t) => t.tier <= 3 && !t.titular);
    const activeKeys: string[] = [];

    counties.forEach((t) => {
      this.provs(t).forEach((v, idx) => {
        if (v.b.includes('gereja') || v.b.includes('kuil')) {
          const key = `${t.id}::${idx}`;
          activeKeys.push(key);
          if (!this.G.worship![key]) {
            this.G.worship![key] = {
              key,
              tid: t.id,
              provIdx: idx,
              name: `${lb.tiers[0]} ${v.nama}`,
              level: 1,
              focus: 'pajak',
              keeperId: null,
              congregation: 140,
              congregationCapacity: 250,
              congregationOpinion: v.agama === p.agama ? 60 : 35,
              sermonTheme: 'harmoni',
            };
          } else {
            this.ensureSiteFields(this.G.worship![key]);
            if (this.G.worship![key].keeperId && !this.C[this.G.worship![key].keeperId!]?.hidup) {
              this.G.worship![key].keeperId = null;
            }
          }
        }
      });
    });

    // Ensure landless players or clerics (pendeta) always have a local community worship site to manage
    if (activeKeys.length === 0 || p.profesi === 'pendeta') {
      const localKey = 'local';
      activeKeys.push(localKey);
      const locTitle = p.loc && this.T[p.loc] ? this.T[p.loc].nama.replace(/^Wilayah\s+/, '') : 'Komunitas Setempat';
      if (!this.G.worship[localKey]) {
        this.G.worship[localKey] = {
          key: localKey,
          tid: p.loc || 'local',
          provIdx: -1,
          name: `${lb.tiers[0]} ${locTitle}`,
          level: 1,
          focus: p.profesi === 'pendeta' ? 'santunan' : 'pajak',
          keeperId: p.profesi === 'pendeta' ? p.id : null,
          congregation: 110,
          congregationCapacity: 250,
          congregationOpinion: 55,
          sermonTheme: 'harmoni',
        };
      } else {
        this.ensureSiteFields(this.G.worship[localKey]);
        if (this.G.worship[localKey].keeperId && !this.C[this.G.worship[localKey].keeperId!]?.hidup) {
          this.G.worship[localKey].keeperId = null;
        }
      }
    }

    return activeKeys.map((k) => this.ensureSiteFields(this.G.worship![k]));
  }

  public worshipGoldIncome(p: Character): number {
    if (p.id !== this.G.pid) return 0;
    const sites = this.worshipSites();
    return sites.reduce((sum, s) => {
      const keeper = s.keeperId ? this.C[s.keeperId] : null;
      const keeperBonus = keeper && keeper.hidup ? Math.max(1, Math.floor(keeper.sk.administrasi / 25)) : 0;
      const opMult = s.congregationOpinion >= 60 ? 1.35 : s.congregationOpinion >= 20 ? 1 : 0.45;
      const jemaatContrib = (s.congregation / 120) * opMult * (s.sermonTheme === 'disiplin' ? 1.25 : 1);
      if (s.focus === 'pajak') return sum + Math.round(s.level * 4 + keeperBonus + jemaatContrib);
      return sum + (s.level >= 2 ? s.level : 0) + Math.floor(jemaatContrib * 0.5);
    }, 0);
  }

  public upgradeWorshipSite(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return this.msg('Tempat ibadah tidak ditemukan.');
    if (s.level >= 3) return this.msg('Tempat ibadah sudah mencapai tingkat maksimal (Tingkat 3).');
    const cost = s.level === 1 ? 60 : 120;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas untuk memperluas ${s.name}.`);
    p.res.emas -= cost;
    s.level += 1;
    const capTable = [250, 600, 1200];
    s.congregationCapacity = capTable[s.level - 1] || 1200;
    const newMembers = s.level === 2 ? 45 : 90;
    s.congregation = Math.min(s.congregationCapacity, s.congregation + newMembers);
    s.congregationOpinion = Math.min(100, s.congregationOpinion + 12);
    const lb = this.worshipLabels(p.agama);
    const provName = s.provIdx >= 0 && this.T[s.tid] ? this.provs(this.T[s.tid])[s.provIdx]?.nama : (this.T[s.tid]?.nama.replace(/^Wilayah\s+/, '') || 'Setempat');
    s.name = `${lb.tiers[s.level - 1]} ${provName}`;
    p.res.kesalehan += s.level === 2 ? 12 : 25;
    p.res.prestise += s.level === 2 ? 10 : 20;
    this.msg(`${s.name} ditingkatkan ke Tingkat ${s.level}! Kapasitas jemaat naik menjadi ${s.congregationCapacity}, +${newMembers} jemaat baru, & hubungan jemaat +12.`);
  }

  public setWorshipFocus(key: string, focus: WorshipFocus): void {
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    s.focus = focus;
    const labels: Record<WorshipFocus, string> = {
      pajak: 'Persepuluhan / Wakaf Kas (+Emas/th)',
      santunan: 'Santunan & Kesejahteraan (+Bahagia Rakyat & Hubungan Jemaat)',
      ilmu: 'Skriptorium / Madrasah (+Pembelajaran & Kesalehan)',
      dakwah: 'Misi & Dakwah Lokal (+Jemaat & Konversi Provinsi)',
    };
    this.msg(`Fokus pengelolaan ${s.name} diubah menjadi ${labels[focus]}.`);
  }

  public setWorshipSermon(key: string, theme: SermonTheme): void {
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    s.sermonTheme = theme;
    const names: Record<SermonTheme, string> = {
      harmoni: 'Kerukunan & Silaturahmi (+Hubungan Jemaat & Opini Rakyat)',
      amal: 'Kas Sosial Jemaat (+2 Opini Rakyat & +2 Hubungan Jemaat/th)',
      ajaran: 'Pendalaman Kitab (+3 Kesalehan & Peluang Ilmu)',
      disiplin: 'Iuran & Ketertiban (+25% Iuran Kas Jemaat)',
    };
    this.msg(`Program pembinaan jemaat di ${s.name} diubah ke ${names[theme]}.`);
  }

  public assignWorshipKeeper(key: string, cid: string | null): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (!cid) {
      s.keeperId = null;
      return this.msg(`Pengurus ${s.name} dikosongkan.`);
    }
    const c = this.C[cid];
    if (!c || !c.hidup) return this.msg('Tokoh tidak valid.');
    if (c.agama !== p.agama) return this.msg(`Pengurus tempat ibadah harus memeluk ${this.AG(p.agama).nama}.`);
    s.keeperId = cid;
    if (cid !== p.id) this.bump(c, 15);
    s.congregationOpinion = Math.min(100, s.congregationOpinion + 5);
    this.msg(`${this.full(c)} ditugaskan mengurus ${s.name} (+5 Hubungan Jemaat).`);
  }

  public holdWorshipService(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (this.G.done['worship_' + key]) return this.msg(`Upacara di ${s.name} sudah diadakan tahun ini.`);
    const cost = p.profesi === 'pendeta' ? 0 : 10;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas untuk perjamuan & persembahan ibadah.`);
    this.G.done['worship_' + key] = 1;
    p.res.emas -= cost;
    const gainPiety = 10 + s.level * 4;
    p.res.kesalehan += gainPiety;
    p.res.prestise += 5 + s.level * 2;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 3 + s.level);
    s.congregationOpinion = Math.min(100, s.congregationOpinion + 8);
    s.congregation = Math.min(s.congregationCapacity, s.congregation + 10 * s.level);
    const lb = this.worshipLabels(p.agama);
    this.msg(`${lb.actionName} di ${s.name} berjalan khidmat! (+${gainPiety} kesalehan, +8 hubungan jemaat, +${3 + s.level} opini rakyat)`);
  }

  public recruitCongregation(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (this.G.done['w_rec_' + key]) return this.msg(`Pembinaan & penggalangan jemaat di ${s.name} sudah dilakukan tahun ini.`);
    if (s.congregation >= s.congregationCapacity) {
      return this.msg(`Kapasitas jemaat ${s.name} penuh (${s.congregation}/${s.congregationCapacity}). Tingkatkan bangunan dulu!`);
    }
    const cost = p.profesi === 'pendeta' ? 0 : 12;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas untuk jamuan pembinaan jemaat baru.`);
    this.G.done['w_rec_' + key] = 1;
    p.res.emas -= cost;
    const gain = Math.min(s.congregationCapacity - s.congregation, R(30, 55) + s.level * 15);
    s.congregation += gain;
    s.congregationOpinion = Math.min(100, s.congregationOpinion + 4);
    p.res.kesalehan += 6;
    this.msg(`Jemaat ${s.name} bertambah +${gain} jiwa (total ${s.congregation}/${s.congregationCapacity}). (+6 kesalehan, +4 hubungan jemaat)`);
  }

  public greetCongregation(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (this.G.done['w_greet_' + key]) return this.msg(`Sudah menyapa & bermusyawarah dengan jemaat ${s.name} tahun ini.`);
    this.G.done['w_greet_' + key] = 1;
    const dipGain = 8 + Math.round(p.sk.diplomasi / 15);
    s.congregationOpinion = Math.min(100, s.congregationOpinion + dipGain);
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 2);
    p.res.kesalehan += 4;
    this.msg(`Musyawarah bersama jemaat ${s.name} disambut hangat! (+${dipGain} hubungan jemaat, +2 opini rakyat)`);
  }

  public aidCongregation(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (this.G.done['w_aid_' + key]) return this.msg(`Sudah menyalurkan santunan ke jemaat ${s.name} tahun ini.`);
    if (p.res.emas < 15) return this.msg('Butuh 15 emas untuk dana santunan jemaat.');
    this.G.done['w_aid_' + key] = 1;
    p.res.emas -= 15;
    s.congregationOpinion = Math.min(100, s.congregationOpinion + 18);
    s.congregation = Math.min(s.congregationCapacity, s.congregation + 15);
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 4);
    p.res.kesalehan += 8;
    p.res.prestise += 5;
    this.deed(p.id, 'charity', 1);
    this.msg(`Santunan untuk jemaat ${s.name} tersalurkan! (+18 hubungan jemaat, +4 opini rakyat, +8 kesalehan)`);
  }

  public collectCongregationOffering(key: string): void {
    const p = this.me();
    const sites = this.worshipSites();
    const s = sites.find((x) => x.key === key);
    if (!s) return;
    if (this.G.done['w_tax_' + key]) return this.msg(`Sumbangan khusus jemaat ${s.name} sudah ditarik tahun ini.`);
    if (s.congregationOpinion < 15) {
      return this.msg(`Hubungan dengan jemaat ${s.name} terlalu buruk (${s.congregationOpinion}); jemaat menolak iuran khusus.`);
    }
    this.G.done['w_tax_' + key] = 1;
    const goldGain = Math.max(10, Math.round(s.congregation / 14));
    p.res.emas += goldGain;
    s.congregationOpinion = Math.max(-100, s.congregationOpinion - 14);
    this.msg(`Menarik sumbangan khusus dari jemaat ${s.name}: +${goldGain} emas, -14 hubungan jemaat.`);
  }

  private worshipTick(): void {
    const p = this.me();
    const sites = this.worshipSites();
    sites.forEach((s) => {
      const hasKeeper = Boolean(s.keeperId && this.C[s.keeperId]?.hidup);
      // Natural congregation growth/shrinkage based on relation
      if (s.congregationOpinion >= 50) {
        s.congregation = Math.min(s.congregationCapacity, s.congregation + R(5, 14) * s.level);
      } else if (s.congregationOpinion < 0) {
        s.congregation = Math.max(20, s.congregation - R(8, 20));
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 1);
        this.G.log.push(`Ketegangan dengan jemaat ${s.name} (hubungan ${s.congregationOpinion}) menurunkan Opini Rakyat -1.`);
      }

      // Sermon theme annual effects
      if (s.sermonTheme === 'harmoni') {
        s.congregationOpinion = Math.min(100, s.congregationOpinion + 3);
        if (s.congregationOpinion >= 65 && s.congregation >= 160) {
          this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 1);
        }
      } else if (s.sermonTheme === 'amal') {
        s.congregationOpinion = Math.min(100, s.congregationOpinion + 2);
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 2);
      } else if (s.sermonTheme === 'ajaran') {
        p.res.kesalehan += 3;
      } else if (s.sermonTheme === 'disiplin') {
        if (s.congregationOpinion < 40) s.congregationOpinion = Math.max(-100, s.congregationOpinion - 2);
      }

      if (s.focus === 'pajak') {
        p.res.kesalehan += 1;
      } else if (s.focus === 'santunan') {
        p.res.kesalehan += 1.5 * s.level;
        s.congregationOpinion = Math.min(100, s.congregationOpinion + 2);
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + s.level + (hasKeeper ? 1 : 0));
      } else if (s.focus === 'ilmu') {
        p.res.kesalehan += 2;
        if (Math.random() < 0.25 * s.level + (hasKeeper ? 0.15 : 0)) {
          p.sk.pembelajaran = cl(p.sk.pembelajaran + 1);
          this.G.log.push(`Skriptorium/Madrasah di ${s.name} meningkatkan Pembelajaran +1.`);
        }
      } else if (s.focus === 'dakwah') {
        p.res.kesalehan += 2.5;
        s.congregation = Math.min(s.congregationCapacity, s.congregation + 12 * s.level);
        if (s.provIdx >= 0 && this.T[s.tid]) {
          const v = this.provs(this.T[s.tid])[s.provIdx];
          if (v && v.agama !== p.agama && Math.random() < 0.2 * s.level + (hasKeeper ? 0.15 : 0) + (s.congregation >= 200 ? 0.1 : 0)) {
            v.agama = p.agama;
            s.congregationOpinion = Math.min(100, s.congregationOpinion + 10);
            this.G.log.push(`Misi/dakwah jemaat ${s.name} berhasil mengonversi ${v.nama} ke ${this.AG(p.agama).nama}!`);
          }
        }
      }
    });

    if (p.agama === 'islam' && this.G.faithLeadership?.activeFatwa === 'ijtihad') {
      p.res.kesalehan += 2;
    }
  }

  public spyAction(
    type: 'intip' | 'sabotase' | 'fitnah' | 'bunuh' | 'sabotase_eko' | 'curi_tekno' | 'hasut_berontak',
    targetId: string
  ): void {
    const p = this.me();
    if (!this.isNoble(p)) return this.msg('Spionase istana & intrik politik hanya terbuka untuk kaum Bangsawan.');
    const o = this.C[targetId];
    if (!o || !o.hidup || o.id === p.id) return this.msg('Target tidak valid.');
    if (this.G.done['spy_' + targetId]) return this.msg('Operasi intelijen ke target ini sudah berjalan tahun ini.');
    const costs: Record<string, number> = {
      intip: 10,
      sabotase: 25,
      fitnah: 20,
      bunuh: 60,
      sabotase_eko: 30,
      curi_tekno: 35,
      hasut_berontak: 45,
    };
    const cost = costs[type] || 15;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas.`);
    p.res.emas -= cost;
    this.G.done['spy_' + targetId] = 1;

    const spy = this.G.pen.mata ? this.C[this.G.pen.mata] : null;
    const mySkill =
      this.effectiveStat(p, 'spionase') +
      (spy && spy.hidup ? this.effectiveStat(spy, 'spionase') * 0.55 * this.officeEfficiency('mata') : 0);
    const chance = Math.min(0.92, Math.max(0.15, 0.38 + (mySkill - this.effectiveStat(o, 'spionase')) / 135));
    const ok = Math.random() < chance;

    if (!ok) {
      this.bump(o, -35);
      this.adjustDynastyRelation(p.dinasti, o.dinasti, -15);
      p.res.prestise = Math.max(0, p.res.prestise - 10);
      return this.msg(`Operasi rahasia terhadap ${this.full(o)} terbongkar! Hubungan & relasi dinasti memburuk.`);
    }

    if (type === 'intip') {
      const a = this.army(o);
      return this.msg(`Laporan Intel: ${this.full(o)} punya ${Math.round(o.res.emas)} emas & ${Math.round(sumObj(a))} pasukan.`);
    }
    if (type === 'sabotase') {
      o.res.emas = Math.max(0, o.res.emas * 0.75);
      return this.msg(`Sabotase berhasil! Gudang logistik ${this.full(o)} terbakar.`);
    }
    if (type === 'sabotase_eko') {
      const lost = Math.round(o.res.emas * 0.35);
      o.res.emas = Math.max(0, o.res.emas - lost);
      this.held(o.id)
        .filter((t) => t.tier <= 3)
        .forEach((t) => {
          if (t.kas) t.kas = Math.max(0, Math.round(t.kas * 0.8));
          this.provs(t).forEach((v) => {
            v.eko = Math.max(2, v.eko - 1);
          });
        });
      this.notifyLog(`Agen membakar lumbung & pos cukai milik ${this.full(o)} (-${lost} emas lawan).`, '🔥');
      return this.msg(`Sabotase Ekonomi sukses! Kas ${this.full(o)} terpangkas ${lost} emas & ekonomi provinsinya melemah.`);
    }
    if (type === 'curi_tekno') {
      if (!this.G.tech) this.G.tech = { military: 0, economy: 0, activeProject: null };
      if (this.G.tech.activeProject && this.G.tech.activeProject.branch === 'military') {
        this.G.tech.activeProject.progress = Math.min(100, this.G.tech.activeProject.progress + 35);
        return this.msg(`Cetak biru pengepungan & metalurgi dicuri dari ${this.full(o)}! (+35% progres riset militer).`);
      }
      this.G.tech.military = Math.min(10, (this.G.tech.military || 0) + 1);
      p.sk.perang = cl(p.sk.perang + 2);
      this.notifyLog(`Berhasil mencuri rahasia teknologi militer dari istana ${this.full(o)}.`, '📐');
      return this.msg(`Rahasia teknologi militer ${this.full(o)} berhasil dicuri! (+1 Tingkat Teknologi Militer, +2 Perang).`);
    }
    if (type === 'hasut_berontak') {
      const enemyTitles = this.held(o.id);
      let hitCount = 0;
      enemyTitles.forEach((t) => {
        t.kids.forEach((kid) => {
          const vt = this.T[kid];
          const vc = vt?.pem ? this.C[vt.pem] : null;
          if (vc && vc.hidup && vc.id !== o.id) {
            vc.op[o.id] = Math.max(-100, (vc.op[o.id] || 0) - 30);
            hitCount++;
          }
        });
        if (t.tier <= 3) {
          this.provs(t).forEach((v) => {
            v.unrest = Math.min(95, (v.unrest || 0) + 25);
          });
        }
      });
      o.res.prestise = Math.max(0, o.res.prestise - 15);
      this.notifyLog(`Agen menghasut pemberontakan di wilayah kekuasaan ${this.full(o)}.`, '🚩');
      return this.msg(
        `Hasutan berhasil! ${hitCount} vasal ${this.full(o)} terguncang kesetiaannya & keresahan provinsinya melonjak.`
      );
    }
    if (type === 'fitnah') {
      o.res.prestise = Math.max(0, o.res.prestise - 25);
      return this.msg(`Skandal disebarkan. Prestise ${this.full(o)} turun 25.`);
    }

    // Assassination success: transfer claimed titles directly if victim leaves no living direct children
    const myClaimIds = new Set((this.G.claims[p.id] || []).map((c) => c.id));
    const hasLivingChild = o.anak.some((kidId) => this.C[kidId]?.hidup);
    const targetClaimedTitles = !hasLivingChild
      ? this.held(o.id).filter((t) => myClaimIds.has(t.id))
      : [];
    const targetName = this.full(o);
    const ageAtDeath = this.umur(o);

    this.deed(p.id, 'kills', 1);
    this.die(o, ageAtDeath);

    if (targetClaimedTitles.length > 0) {
      targetClaimedTitles.forEach((t) => {
        t.pem = p.id;
        this.markConqueredProvinces(t, p);
        if (t.tier > (this.held(p.id).sort((a, b) => b.tier - a.tier)[0]?.tier || 0) || !this.G.primary) {
          this.G.primary = t.id;
        }
        this.G.claims[p.id] = (this.G.claims[p.id] || []).filter((c) => c.id !== t.id);
      });
      const gainedNames = targetClaimedTitles.map((t) => t.nama).join(', ');
      this.notifyLog(`Dengan gugurnya ${targetName} tanpa ahli waris langsung, ${this.full(p)} menuntut & naik takhta atas ${gainedNames}!`, '👑');
      return this.msg(`${targetName} wafat tanpa ahli waris langsung! Berbekal hak klaimmu, kamu resmi mewarisi ${gainedNames}.`);
    }

    this.notifyLog(`${targetName} wafat secara misterius.`, '🗡️');
    this.msg(`Target ${targetName} berhasil dilenyapkan tanpa jejak.`);
  }

  public proposeSecretTreaty(targetId: string, type: 'non_aggression' | 'secret_claim'): void {
    const p = this.me();
    const o = this.C[targetId];
    if (!o || !o.hidup || o.id === p.id) return this.msg('Target perjanjian rahasia tidak valid.');
    if (!this.G.secretTreaties) this.G.secretTreaties = [];
    if (this.G.secretTreaties.some((st) => st.active && st.withId === targetId && st.type === type)) {
      return this.msg('Perjanjian rahasia jenis ini dengan tokoh tersebut sudah aktif.');
    }
    const cost = type === 'secret_claim' ? 40 : 25;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas untuk dana agen & utusan rahasia.`);
    p.res.emas -= cost;

    const spy = this.G.pen.mata ? this.C[this.G.pen.mata] : null;
    const spyPower = this.effectiveStat(p, 'spionase') + (spy && spy.hidup ? this.effectiveStat(spy, 'spionase') * 0.5 : 0);
    const acceptChance = Math.min(0.92, Math.max(0.2, 0.42 + (this.opn(o, p) + spyPower * 0.5) / 140));
    if (Math.random() > acceptChance) {
      this.bump(o, -12);
      return this.msg(`${this.full(o)} menolak perjanjian rahasia (-12 Opini).`);
    }
    const leakRisk = Math.max(6, Math.round(28 - spyPower * 0.18));
    this.G.secretTreaties.push({
      id: `st_${this.G.tahun}_${targetId}_${type}`,
      withId: targetId,
      type,
      since: this.G.tahun,
      leakRisk,
      active: true,
    });
    const label = type === 'non_aggression' ? 'Pakta Non-Agresi Rahasia' : 'Dukungan Klaim Suksesi Rahasia';
    this.notifyLog(`${label} disepakati diam-diam dengan ${this.full(o)}.`, '🕵️');
    this.msg(`${label} dengan ${this.full(o)} aktif! (Risiko bocor ${leakRisk}%/tahun).`);
  }

  public breakSecretTreaty(treatyId: string): void {
    const p = this.me();
    const st = (this.G.secretTreaties || []).find((x) => x.id === treatyId && x.active);
    if (!st) return;
    st.active = false;
    const o = this.C[st.withId];
    p.res.prestise = Math.max(0, p.res.prestise - 10);
    if (o) {
      this.bump(o, -20);
      this.adjustDynastyRelation(p.dinasti, o.dinasti, -15);
    }
    this.msg('Perjanjian rahasia dibatalkan (-10 Prestise).');
  }

  private secretTreatyTick(): void {
    const p = this.me();
    if (!this.G.secretTreaties?.length) return;
    const spy = this.G.pen.mata ? this.C[this.G.pen.mata] : null;
    const shield = spy && spy.hidup ? Math.round(this.effectiveStat(spy, 'spionase') * 0.1) : 0;
    this.G.secretTreaties.forEach((st) => {
      if (!st.active) return;
      const o = this.C[st.withId];
      if (!o || !o.hidup) {
        if (st.type === 'non_aggression') st.active = false;
        return;
      }
      const effRisk = Math.max(3, st.leakRisk - shield);
      if (Math.random() * 100 < effRisk) {
        st.active = false;
        this.G.legitimacy = Math.max(10, (this.G.legitimacy ?? 80) - 12);
        p.res.prestise = Math.max(0, p.res.prestise - 15);
        this.bump(o, -30);
        this.adjustDynastyRelation(p.dinasti, o.dinasti, -25);
        this.notifyLog(`SKANDAL! Perjanjian rahasia dengan ${this.full(o)} bocor ke publik!`, '📜');
        this.G.log.unshift(`SKANDAL DIPLOMASI: Perjanjian rahasia dengan ${this.full(o)} bocor (-12 Legitimasi, -15 Prestise)!`);
      }
    });
  }

  public establishTrade(partnerId: string): void {
    const p = this.me();
    const o = this.C[partnerId];
    if (!o || !o.hidup || o.id === p.id) return this.msg('Rekan dagang tidak valid.');
    if (this.G.trade.some((x) => x.with === partnerId)) return this.msg('Rute dagang sudah aktif.');
    if (this.G.trade.length >= 5) return this.msg('Maksimal 5 rute dagang aktif.');
    if (p.res.emas < 30) return this.msg('Butuh 30 emas modal kafilah dagang.');
    p.res.emas -= 30;

    const myTitleId = this.held(p.id)[0]?.id || p.loc;
    const partnerTitleId = this.held(o.id)[0]?.id || o.loc || '';
    const dist = partnerTitleId ? this.titleDistance(myTitleId, partnerTitleId) : 2;
    const neighbor = dist <= 2;
    const tariffCut = neighbor ? 35 : 20;
    const baseInc = 3 + (this.effectiveStat(p, 'administrasi') + this.effectiveStat(o, 'administrasi')) / 32 + this.tierOf(o) * 0.9;
    const inc = Math.max(4, Math.round(baseInc * (neighbor ? 1.35 : 1.1)));

    let luxuryGood: string | undefined;
    if (o.budaya === 'greek') luxuryGood = 'sutra_bizantium';
    else if (o.budaya === 'maghrebi' || o.budaya === 'sicilian_arab') luxuryGood = 'permadani_andalusia';
    else if (o.budaya === 'turkish') luxuryGood = 'baja_damaskus';
    else if (['frankish', 'occitan', 'castilian'].includes(o.budaya)) luxuryGood = 'anggur_bordeaux';
    else if (['norse', 'polish', 'rus', 'danish', 'swedish'].includes(o.budaya)) luxuryGood = 'ambar_baltik';
    else luxuryGood = 'rempah_timur';

    if (!this.G.luxuryGoods) this.G.luxuryGoods = [];
    let luxMsg = '';
    if (luxuryGood && !this.G.luxuryGoods.includes(luxuryGood)) {
      this.G.luxuryGoods.push(luxuryGood);
      luxMsg = ` + Akses barang mewah: ${LUXURY_GOODS[luxuryGood]?.nama || luxuryGood}!`;
    }

    this.G.trade.push({ with: partnerId, income: inc, start: this.G.tahun, neighbor, tariffCut, luxuryGood });
    this.bump(o, 12);
    this.adjustDynastyRelation(p.dinasti, o.dinasti, 10);
    this.msg(
      `Perjanjian Dagang dengan ${this.full(o)} disepakati! Bea masuk -${tariffCut}%, +${inc} emas/th.${luxMsg}`
    );
  }

  public cancelTrade(partnerId: string): void {
    this.G.trade = this.G.trade.filter((x) => x.with !== partnerId);
    const activeLux = new Set(this.G.trade.map((x) => x.luxuryGood).filter(Boolean));
    this.G.luxuryGoods = (this.G.luxuryGoods || []).filter((g) => activeLux.has(g));
    this.msg('Perjanjian dagang ditutup.');
  }

  public takeLoan(amt: number): void {
    const p = this.me();
    if (this.G.loans.length >= 3) return this.msg('Maksimal 3 pinjaman aktif.');
    const interest = Math.max(2, Math.round(amt * 0.12));
    this.addStateFunds(amt, p);
    this.G.loans.push({ amt, int: interest, y: this.G.tahun });
    const dest = this.held(p.id).length > 0 ? 'Kas Negara' : 'dompet pribadi';
    this.msg(`Pinjaman ${amt} emas diterima ke ${dest} (bunga ${interest} emas/tahun).`);
  }

  public repayLoan(idx: number): void {
    const p = this.me();
    const ln = this.G.loans[idx];
    if (!ln) return;
    if (!this.spendStateFunds(ln.amt, p)) return this.msg(`Dana tidak cukup (butuh ${ln.amt} emas untuk melunasi).`);
    this.G.loans.splice(idx, 1);
    this.msg(`Pinjaman ${ln.amt} emas lunas.`);
  }

  public convertProvince(tid: string, provIdx: number): void {
    const p = this.me();
    const t = this.T[tid];
    if (!t || t.pem !== p.id) return this.msg('Bukan wilayahmu.');
    const prov = this.provs(t)[provIdx];
    if (!prov) return;
    if (prov.agama === p.agama) return this.msg('Provinsi sudah memeluk agamamu.');
    if (p.res.kesalehan < 20 || p.res.emas < 15) return this.msg('Butuh 20 kesalehan & 15 emas untuk misionaris.');
    p.res.kesalehan -= 20;
    p.res.emas -= 15;
    prov.agama = p.agama;
    this.msg(`${prov.nama} kini menganut ${this.AG(p.agama).nama}.`);
  }

  public setHerald(heraldId: string): void {
    const p = this.me();
    const d = p.dinasti ? this.DY[p.dinasti] : null;
    if (!d) return this.msg('Tidak memiliki dinasti.');
    if (p.res.emas < 10) return this.msg('Butuh 10 emas untuk melukis lambang perisai.');
    p.res.emas -= 10;
    d.herald = heraldId;
    const h = HERALDS.find((x) => x.id === heraldId);
    this.msg(`Lambang dinasti ${d.nama} diubah menjadi ${h?.simbol || ''} ${h?.nama || heraldId}.`);
  }

  public writeBook(customTitle?: string): void {
    const p = this.me();
    if (this.G.done.book) return this.msg('Sudah menulis naskah tahun ini.');
    if (p.sk.pembelajaran < 15) return this.msg('Butuh stat Pembelajaran ≥ 15.');
    if (p.res.emas < 20) return this.msg('Butuh 20 emas untuk perkamen & tinta.');
    p.res.emas -= 20;
    this.G.done.book = 1;
    const topics = ['Tawarikh Kerajaan', 'Risalah Hukum & Takhta', 'Seni Perang Abad Pertengahan', 'Renungan Iman & Filsafat', 'Catatan Ekonomi Wilayah'];
    const title = (customTitle || '').trim() || `${pick(topics)} oleh ${p.nama}`;
    this.G.books.unshift({ title, author: this.full(p), y: this.G.tahun });
    p.res.prestise += 15;
    p.sk.pembelajaran = cl(p.sk.pembelajaran + 2);
    if (this.G.tahun >= 1400) this.G.renaissance.points += 3;
    this.notifyLog(`Kitab "${title}" rampung ditulis.`, '📖');
    this.msg(`Naskah "${title}" selesai! +15 prestise, +2 Pembelajaran.`);
  }

  public holdCourt(): void {
    const p = this.me();
    if (this.G.done.court) return this.msg('Sidang istana sudah digelar tahun ini.');
    if (p.res.emas < 15) return this.msg('Butuh 15 emas untuk jamuan & sidang.');
    p.res.emas -= 15;
    this.G.done.court = 1;
    const roll = Math.random();
    if (roll < 0.35) {
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 6);
      p.res.prestise += 5;
      this.msg('Sidang istana mengabulkan petisi rakyat. +6 kebahagiaan rakyat, +5 prestise.');
    } else if (roll < 0.7) {
      p.res.emas += 25;
      this.msg('Sengketa pajak bangsawan diselesaikan: kas menerima denda +25 emas.');
    } else {
      p.res.kesalehan += 10;
      p.res.prestise += 4;
      this.msg('Utusan gereja memuji keadilanmu dalam sidang (+10 kesalehan, +4 prestise).');
    }
  }

  public patronArt(): void {
    const p = this.me();
    if (this.G.done.art) return this.msg('Sudah membiayai seniman tahun ini.');
    if (p.res.emas < 40) return this.msg('Butuh 40 emas.');
    p.res.emas -= 40;
    this.G.done.art = 1;
    p.res.prestise += 20;
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 4);
    if (this.G.tahun >= 1400) this.G.renaissance.points += 5;
    this.dynLog(p.dinasti, `${this.full(p)} mensponsori karya seni & arsitektur istana`);
    this.msg('Karya seni agung diresmikan! +20 prestise, +4 kebahagiaan rakyat.');
  }

  public launchExpedition(): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Ekspedisi samudra kerajaan hanya untuk penguasa wilayah pesisir.');
    if (this.G.tahun < 1400) return this.msg('Ekspedisi samudra baru terbuka mulai tahun 1400.');
    if (this.G.done.exp) return this.msg('Sudah mengirim ekspedisi tahun ini.');
    if (!this.hasCoastalAccess(p)) {
      return this.msg('Wilayahmu tidak memiliki akses perairan/pesisir untuk meluncurkan armada laut.');
    }
    if (!this.yard() || Object.values(this.G.sh).reduce((a, b) => a + b, 0) < 1) {
      return this.msg('Butuh Galangan Kapal di provinsi pesisir serta minimal 1 kapal.');
    }
    if (p.res.emas < 60) return this.msg('Butuh 60 emas untuk bekal armada.');
    p.res.emas -= 60;
    this.G.done.exp = 1;
    const ok = Math.random() < 0.62 + p.sk.pembelajaran / 250;
    if (ok) {
      const gold = R(90, 220);
      p.res.emas += gold;
      p.res.prestise += 25;
      this.G.expeditions.unshift({ y: this.G.tahun, result: 'success', gold });
      this.notifyLog(`Ekspedisi pulang membawa rempah & emas (+${gold} emas)!`, '🧭');
      this.checkAchievements();
      this.msg(`Ekspedisi sukses! Membawa pulang ${gold} emas & +25 prestise.`);
    } else {
      this.G.expeditions.unshift({ y: this.G.tahun, result: 'fail' });
      this.msg('Ekspedisi tertimpa badai di lautan lepas dan pulang dengan tangan hampa.');
    }
  }

  public startDetailedSiege(tid: string): void {
    const p = this.me();
    if (!this.isNoble(p) || !this.isRuler(p)) return this.msg('Pengepungan hanya terbuka untuk penguasa wilayah.');
    const t = this.T[tid];
    if (!t || t.pem === p.id) return this.msg('Target tidak valid.');
    if (this.G.siegeDetail[tid]) return this.msg('Pengepungan terperinci ke wilayah ini sudah berlangsung.');
    if (!this.spendStateFunds(30, p)) return this.msg('Kas Negara tidak cukup (butuh 30 emas untuk kamp pengepungan).');
    this.G.siegeDetail[tid] = {
      by: p.id,
      turns: 0,
      food: 100,
      walls: 100,
      siegeWeapons: (this.G.tr.meriam || 0) + 1,
    };
    sfx.playDrum();
    this.msg(`Kamp pengepungan terperinci didirikan di depan benteng ${t.nama} (Kas Negara -30 emas).`);
  }

  private siegeDetailTick(): void {
    const p = this.me();
    Object.keys(this.G.siegeDetail).forEach((tid) => {
      const sd = this.G.siegeDetail[tid];
      const t = this.T[tid];
      if (!t || t.pem === p.id) {
        delete this.G.siegeDetail[tid];
        return;
      }
      sd.turns++;
      sd.food = Math.max(0, sd.food - R(18, 32));
      sd.walls = Math.max(0, sd.walls - (10 + sd.siegeWeapons * 8));
      if (sd.food <= 0 || sd.walls <= 0) {
        t.pem = p.id;
        this.markConqueredProvinces(t, p);
        p.res.prestise += 20;
        this.deed(p.id, 'wars_won', 1);
        this.G.log.unshift(`Benteng ${t.nama} jatuh akibat pengepungan! Wilayah direbut.`);
        this.notifyLog(`Benteng ${t.nama} menyerah!`, '🏰');
        delete this.G.siegeDetail[tid];
      }
    });
  }

  private assignNpcAmbition(c: Character): string {
    if (c.ambisi) return c.ambisi;
    const traits = c.sifat || [];
    if (traits.some((s) => ['ambisius', 'berani', 'kejam', 'panglima'].includes(s)) || c.sk.perang >= 15) {
      c.ambisi = 'kuasa';
    } else if (traits.some((s) => ['serakah', 'hemat'].includes(s)) || ['pedagang', 'pengusaha'].includes(c.profesi || '') || c.sk.administrasi >= 15) {
      c.ambisi = 'kekayaan';
    } else if (traits.some((s) => ['saleh', 'jujur'].includes(s)) || c.profesi === 'pendeta') {
      c.ambisi = 'kesalehan';
    } else if (traits.some((s) => ['jenius', 'cerdik'].includes(s)) || c.sk.pembelajaran >= 15) {
      c.ambisi = 'ilmu';
    } else {
      c.ambisi = pick(['keluarga', 'kekayaan', 'kuasa', 'kesalehan']);
    }
    return c.ambisi;
  }

  private npcAgencyTick(): void {
    const p = this.me();
    const alive = Object.values(this.C).filter((c) => c.hidup && c.id !== p.id);

    // 1. Every adult NPC evaluates personal economy, health, skills & trait-based ambition
    alive.forEach((c) => {
      const age = this.umur(c);
      if (age < 16) return;
      const amb = this.assignNpcAmbition(c);
      const held = this.held(c.id);
      const isRuler = held.length > 0;

      // Logical self-treatment when ill and able to afford a physician
      if (c.health?.illness && c.res.emas >= 20 && Math.random() < 0.65) {
        c.res.emas -= 20;
        const healChance = 0.55 + c.sk.pembelajaran * 0.01;
        if (Math.random() < healChance) {
          c.health.illness = null;
          c.health.severity = 0;
          c.sp.kesehatan = cl(c.sp.kesehatan + 12);
          c.aiSummary = 'Berobat ke tabib & pulih';
        }
      }

      if (isRuler) {
        const counties = held.filter((t) => t.tier <= 3 && !t.titular);
        const provEcon = counties.reduce(
          (sum, ct) => sum + this.provs(ct).reduce((s, pv) => s + 2 + pv.eko * 0.5 + pv.b.length * 1.1, 0),
          0
        );
        const netGold = Math.max(1, Math.round(provEcon * 0.35 + c.sk.administrasi * 0.25));
        c.res.emas += netGold;
        const pri = this.primaryTitle(c);
        if (pri) pri.kas = (pri.kas || 0) + Math.round(netGold * 0.5);
      } else if (c.profesi) {
        c.res.emas += 2 + Math.floor(c.sk.administrasi / 10);
      }

      // Skill growth & goal pursuit matching NPC ambition
      if (Math.random() < 0.22) {
        if (amb === 'kekayaan') {
          c.res.emas += 5 + Math.floor(c.sk.administrasi / 4);
          if (Math.random() < 0.35) c.sk.administrasi = cl(c.sk.administrasi + 1);
          c.aiSummary = 'Fokus memperdagangkan & mengelola kas';
        } else if (amb === 'kesalehan') {
          c.res.kesalehan += 5;
          if (Math.random() < 0.35) c.sk.pembelajaran = cl(c.sk.pembelajaran + 1);
          c.aiSummary = 'Beribadah & memperdalam kesalehan';
        } else if (amb === 'ilmu') {
          if (Math.random() < 0.45) c.sk.pembelajaran = cl(c.sk.pembelajaran + 1);
          c.res.prestise += 2;
          c.aiSummary = 'Menelaah naskah & ilmu pemerintahan';
        } else if (amb === 'kuasa') {
          if (Math.random() < 0.35) c.sk.perang = cl(c.sk.perang + 1);
          c.res.prestise += 2;
          c.aiSummary = 'Melatih pasukan & memperluas pengaruh';
        } else {
          c.sp.kebahagiaan = cl(c.sp.kebahagiaan + 2);
          if (Math.random() < 0.35) c.sk.diplomasi = cl(c.sk.diplomasi + 1);
          c.aiSummary = 'Membina keutuhan keluarga & wangsa';
        }
      }

      // Logical succession reform for smart NPC rulers stuck on Gavelkind
      if (isRuler && this.getEffectiveSuccessionLaw(c) === 'terbagi' && held.filter((t) => t.tier <= 3).length >= 2) {
        if (c.sk.administrasi >= 12 && c.res.prestise >= 90 && Math.random() < 0.18) {
          const pt = this.primaryTitle(c);
          if (pt) {
            pt.successionLaw = 'primogenitur';
            c.res.prestise -= 20;
            c.aiSummary = `Mereformasi pewarisan ${pt.nama} ke Primogenitur`;
            if (pt.tier >= 4) {
              this.G.log.unshift(`Kebijakan Dunia: ${this.full(c)} mereformasi hukum waris ${pt.nama} menjadi Primogenitur.`);
            }
          }
        }
      }

      // Disloyal ambitious subjects scheme against disliked player
      if (amb === 'kuasa' && this.opn(c, p) < -50 && Math.random() < 0.08) {
        this.G.log.unshift(`Kabar istana: ${this.full(c)} diam-diam menggalang dukungan lawan politikmu.`);
      }
      c.lastAiYear = this.G.tahun;
    });

    // 2. Autonomous Logical Marriage (prioritize rulers lacking heirs, then eligible nobles)
    const marrySeekers = alive
      .filter((c) => {
        const a = this.umur(c);
        if (a < 18 || a > 46 || c.pasangan) return false;
        if (!['lajang', 'janda', 'duda'].includes(c.sn)) return false;
        const pf = c.profesi ? this.D.profesi.find((x: AnyRule) => x.id === c.profesi) : null;
        if (pf && this.noMarry(pf, c)) return false;
        if (c.sn === 'selibat' || (c.profesi === 'pendeta' && c.agama === 'katolik')) return false;
        const isRuler = this.tierOf(c) >= 3;
        const needsHeir = isRuler && !this.heir(c, false);
        return needsHeir || c.ambisi === 'keluarga' || Math.random() < 0.14;
      })
      .sort((a, b) => this.tierOf(b) - this.tierOf(a))
      .slice(0, 6);

    marrySeekers.forEach((a) => {
      if (a.pasangan) return;
      const aFam = this.AG(a.agama).keluarga;
      const aTier = this.tierOf(a);
      const partner = alive
        .filter((b) => {
          if (b.id === a.id || b.gender === a.gender || b.pasangan) return false;
          if (!['lajang', 'janda', 'duda'].includes(b.sn)) return false;
          const ba = this.umur(b);
          if (ba < 17 || ba > 42 || Math.abs(this.umur(a) - ba) > 18) return false;
          const pf = b.profesi ? this.D.profesi.find((x: AnyRule) => x.id === b.profesi) : null;
          if (pf && this.noMarry(pf, b)) return false;
          if (this.AG(b.agama).keluarga !== aFam) return false;
          if (this.dist(a, b) <= 3) return false;
          if (aTier >= 3 && this.isCommoner(b) && Math.random() < 0.75) return false;
          return true;
        })
        .sort((x, y) => this.tierOf(y) - this.tierOf(x) || y.res.prestise - x.res.prestise)[0];

      if (partner) {
        a.sn = partner.sn = 'menikah';
        a.pasangan = partner.id;
        partner.pasangan = a.id;
        a.marriageStartYear = this.G.tahun;
        partner.marriageStartYear = this.G.tahun;
        a.marriageHistory = a.marriageHistory || [];
        partner.marriageHistory = partner.marriageHistory || [];
        a.marriageHistory.push({
          spouseId: partner.id,
          spouseName: this.full(partner),
          dynastyName: partner.dinasti ? this.DY[partner.dinasti]?.nama : undefined,
          year: this.G.tahun,
        });
        partner.marriageHistory.push({
          spouseId: a.id,
          spouseName: this.full(a),
          dynastyName: a.dinasti ? this.DY[a.dinasti]?.nama : undefined,
          year: this.G.tahun,
        });
        this.adjustDynastyRelation(a.dinasti, partner.dinasti, 12);
        a.aiSummary = `Menikah secara strategis dengan ${this.full(partner)}`;
        if (this.tierOf(a) >= 4 || this.tierOf(partner) >= 4) {
          this.G.log.unshift(`Kronik Pernikahan Dunia: ${this.full(a)} menikah dengan ${this.full(partner)}.`);
        }
      }
    });

    // 3. Autonomous Logical Province Development (landed NPCs invest surplus gold)
    const builders = alive
      .filter((c) => this.held(c.id).some((t) => t.tier <= 3 && !t.titular) && c.res.emas >= 42)
      .sort((a, b) => b.res.emas - a.res.emas)
      .slice(0, 5);

    builders.forEach((c) => {
      const county = this.held(c.id).find((t) => t.tier <= 3 && !t.titular && this.provs(t).some((pv) => pv.b.length < 4));
      if (!county) return;
      const pv = this.provs(county).find((x) => x.b.length < 4);
      if (!pv) return;
      const prefOrder =
        c.ambisi === 'kuasa'
          ? ['barak', 'benteng', 'pasar', 'ladang']
          : c.ambisi === 'kesalehan'
            ? ['biara', 'gereja', 'pasar', 'ladang']
            : c.ambisi === 'ilmu'
              ? ['perpustakaan', 'sekolah', 'pasar', 'ladang']
              : ['pasar', 'ladang', 'tambang', 'barak'];
      const avail = (this.D.bangunan || []).filter((b: AnyRule) => !pv.b.includes(b.id) && (b.biaya || 30) <= c.res.emas);
      if (!avail.length) return;
      const chosen = prefOrder.map((id) => avail.find((b: AnyRule) => b.id === id)).find(Boolean) || avail[0];
      if (!chosen) return;
      c.res.emas = Math.max(0, c.res.emas - (chosen.biaya || 30));
      pv.b.push(chosen.id);
      if (chosen.efek?.ekonomi) pv.eko += chosen.efek.ekonomi;
      if (chosen.efek?.perkembangan) pv.dev += chosen.efek.perkembangan;
      c.aiSummary = `Membangun ${chosen.nama} di ${pv.nama}`;
    });

    // 4. Autonomous Logical Diplomacy & Power-Checked Wars (max 2 wars/year across world)
    const landedRulers = alive.filter(
      (c) => this.umur(c) >= 18 && this.held(c.id).some((t) => t.tier <= 3 && !t.titular) && !this.G.jail[c.id]
    );
    // Diplomatic goodwill among peaceful/same-faith neighbors
    landedRulers
      .filter((c) => c.ambisi === 'keluarga' || c.ambisi === 'ilmu' || (c.sifat || []).includes('ramah'))
      .slice(0, 4)
      .forEach((r1) => {
        const peer = landedRulers.find(
          (r2) => r2.id !== r1.id && this.AG(r1.agama).keluarga === this.AG(r2.agama).keluarga && (r1.op[r2.id] || 0) < 45
        );
        if (peer) {
          r1.op[peer.id] = Math.min(100, (r1.op[peer.id] || 0) + 8);
          peer.op[r1.id] = Math.min(100, (peer.op[r1.id] || 0) + 8);
          this.adjustDynastyRelation(r1.dinasti, peer.dinasti, 5);
          r1.aiSummary = `Mempererat diplomasi dengan ${this.full(peer)}`;
        }
      });

    let warsDone = 0;
    const warmongers = landedRulers
      .filter((c) => (c.ambisi === 'kuasa' || (c.sifat || []).some((s) => ['ambisius', 'berani', 'kejam'].includes(s))) && c.res.emas >= 30)
      .sort((a, b) => this.pwr(b) - this.pwr(a));

    for (const att of warmongers) {
      if (warsDone >= 2) break;
      if (Math.random() > 0.35) continue;
      const attPwr = this.pwr(att);
      if (attPwr < 40) continue;

      const attRealmId = this.realmOf(att).id;
      const targets = Object.values(this.T).filter((t) => {
        if (t.tier !== 3 || t.titular || !t.pem || t.pem === att.id || t.pem === p.id) return false;
        const def = this.C[t.pem];
        if (!def || !def.hidup || this.G.jail[def.id]) return false;
        if (att.pasangan === def.id || this.blood(att, def)) return false;
        const relOp = att.op[def.id] ?? 0;
        const diffFaith = this.AG(att.agama).keluarga !== this.AG(def.agama).keluarga;
        const diffRealm = this.realmOf(def).id !== attRealmId;
        if (!diffFaith && relOp > -10 && !diffRealm) return false;
        const defPwr = this.pwr(def);
        // Logical war check: attacker must clearly outweigh defender (>= 1.25x power)
        return attPwr >= defPwr * 1.25;
      });

      if (!targets.length) continue;
      const targetTitle = targets.sort((a, b) => {
        const da = this.C[a.pem!];
        const db = this.C[b.pem!];
        return this.pwr(da) - this.pwr(db);
      })[0];
      const def = this.C[targetTitle.pem!];
      if (!def) continue;

      warsDone++;
      att.res.emas = Math.max(0, att.res.emas - 20);
      const winProb = Math.min(0.85, Math.max(0.45, attPwr / (attPwr + this.pwr(def) + 1) + (att.sk.perang - def.sk.perang) * 0.01));
      if (Math.random() < winProb) {
        if (!this.G.rulers[targetTitle.id]) this.G.rulers[targetTitle.id] = [];
        this.G.rulers[targetTitle.id].push({
          id: def.id,
          nama: def.regnalNames?.[targetTitle.id] || def.nama,
          julukan: '',
          dari: Math.max(def.lahir + 16, this.G.tahun - 5),
          sampai: this.G.tahun,
          sebab: 'ditaklukkan',
          regnalNumber: this.getEffectiveRegnalNumber(def, targetTitle),
          dinasti: def.dinasti,
        });
        targetTitle.pem = att.id;
        att.res.prestise += 15;
        att.op[def.id] = -50;
        def.op[att.id] = -60;
        this.adjustDynastyRelation(att.dinasti, def.dinasti, -20);
        att.aiSummary = `Menaklukkan ${targetTitle.nama} dari ${this.full(def)}`;
        this.dynLog(att.dinasti, `${this.full(att)} menaklukkan ${targetTitle.nama}`);
        this.G.log.unshift(`Kronik Dunia: ${this.full(att)} melancarkan kampanye & merebut ${targetTitle.nama} dari ${this.full(def)}!`);
      } else {
        att.res.prestise = Math.max(0, att.res.prestise - 10);
        def.res.prestise += 12;
        att.op[def.id] = -40;
        def.op[att.id] = -40;
        att.aiSummary = `Kampanye terhadap ${targetTitle.nama} dipukul mundur oleh ${this.full(def)}`;
        this.G.log.unshift(`Kronik Dunia: Serangan ${this.full(att)} atas ${targetTitle.nama} berhasil dipatahkan oleh ${this.full(def)}.`);
      }
    }
  }

  private crimeAndWeatherTick(): string[] {
    const out: string[] = [];
    const p = this.me();
    const law = this.LAW('hukuman_kriminal') || 'hukum_raja';
    const baseChance = law === 'tangan_besi' ? 0.04 : law === 'denda_ringan' ? 0.12 : 0.08;
    if (Math.random() < baseChance) {
      const r = Math.random();
      if (r < (law === 'tangan_besi' ? 0.25 : 0.45)) {
        this.G.crimes.bandit = (this.G.crimes.bandit || 0) + 1;
        p.res.emas = Math.max(0, p.res.emas - 8);
        out.push('Gerombolan bandit mencegat kereta pajak (-8 emas).');
      } else if (r < 0.72) {
        this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 2);
        out.push('Musim dingin ekstrem merusak panen sebagian petani (-2 kebahagiaan).');
      } else {
        p.res.emas += 12;
        out.push('Panen gandum melimpah di lumbung istana (+12 emas).');
      }
    }
    return out;
  }

  public exportSave(): string {
    return JSON.stringify({ T: this.T, C: this.C, DY: this.DY, P: this.P, G: this.G });
  }

  public downloadSaveFile(): boolean {
    const payload = this.exportSave();
    const ruler = this.G?.pid && this.C[this.G.pid] ? slug(this.C[this.G.pid].nama || 'penguasa') : 'kerajaan';
    const filename = `kerajaan-1066-th${this.G?.tahun || 1066}-${ruler}.json`;
    const ok = downloadJsonFile(filename, payload);
    if (ok) {
      this.showToast(`File ${filename} disimpan.`);
    } else {
      this.showToast('Gagal mengunduh file .json.');
    }
    return ok;
  }

  public async saveToLocalSlot(customLabel?: string): Promise<LocalSaveSlot | null> {
    if (!this.G?.pid || !this.C[this.G.pid]) return null;
    const ruler = this.full(this.C[this.G.pid]);
    const payload = this.exportSave();
    const id = `slot_${Date.now()}`;
    const slot: LocalSaveSlot = {
      id,
      label: customLabel?.trim() || `${ruler} (Th ${this.G.tahun})`,
      year: this.G.tahun,
      ruler,
      savedAt: Date.now(),
      payload,
    };
    await putLocalSaveSlot(slot);
    this.save();
    this.showToast(`Tersimpan ke database lokal: ${slot.label}`);
    return slot;
  }

  public async listLocalSaves(): Promise<LocalSaveSlot[]> {
    return listLocalSaveSlots();
  }

  public async loadLocalSlot(id: string): Promise<boolean> {
    const slot = await getLocalSaveSlot(id);
    if (!slot?.payload) {
      this.showToast('Slot save tidak ditemukan.');
      return false;
    }
    return this.importSaveText(slot.payload);
  }

  public async deleteLocalSlot(id: string): Promise<void> {
    await deleteLocalSaveSlot(id);
    this.showToast('Slot save dihapus.');
  }

  public async importSaveFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      return this.importSaveText(text);
    } catch {
      this.showToast('Gagal membaca file save .json.');
      return false;
    }
  }

  public importSaveText(raw: string): boolean {
    try {
      const s = JSON.parse(raw);
      if (!s || !s.T || !s.C || !s.G) {
        this.showToast('Format JSON save tidak valid.');
        return false;
      }
      this.T = s.T;
      this.C = s.C;
      this.DY = s.DY || {};
      this.P = s.P || {};
      this.G = s.G;
      this.migrateState();
      this.save();
      this.stack = [{ view: 'main' }];
      this.notify();
      this.showToast('Save berhasil dimuat.');
      return true;
    } catch {
      this.showToast('Gagal membaca data save.');
      return false;
    }
  }

  // =========================================================================
  // v15 FEATURES: Historical Events, Noble Council, Coups, Achievements, BG
  // =========================================================================
  public applyBackground(bgId: string): void {
    const bg = BACKGROUNDS[bgId];
    if (!bg) return;
    this.G.background = bgId;
    const p = this.me();
    if (bg.emas) p.res.emas += bg.emas;
    if (bg.prestise) p.res.prestise += bg.prestise;
    if (bg.kesalehan) p.res.kesalehan += bg.kesalehan;
    if (bg.sk) {
      for (const [k, v] of Object.entries(bg.sk)) {
        (p.sk as AnyRule)[k] = cl((p.sk as AnyRule)[k] + v);
      }
    }
    if (bg.sp) {
      for (const [k, v] of Object.entries(bg.sp)) {
        (p.sp as AnyRule)[k] = cl((p.sp as AnyRule)[k] + v);
      }
    }
  }

  private histEventTick(): void {
    if (this.G.ev) return;
    const y = this.G.tahun;
    const p = this.me();

    // 1. Hastings 1067 aftermath
    if (y === 1067 && !this.G.histDone.hastings_1067) {
      this.G.histDone.hastings_1067 = true;
      const eng = this.T['k_inggris'];
      if (eng) {
        this.G.ev = {
          judul: 'Dampak Pertempuran Hastings (1067)',
          teks: 'Penaklukan Norman atas Inggris mengguncang keseimbangan Eropa. Bagaimana sikap istanamu?',
          isChain: true,
          pilihan: [
            {
              teks: 'Akui kekuasaan Norman atas Inggris (+10 Hubungan dengan Raja Inggris, +5 Prestise)',
              fn: () => {
                p.res.prestise += 5;
                if (eng.pem && this.C[eng.pem]) this.bump(this.C[eng.pem], 10);
                return 'Istana mengirim ucapan selamat ke London.';
              },
            },
            {
              teks: 'Kirim sukarelawan ke perlawanan Anglo-Saxon (+10 Emas imbalan, +5 Perang)',
              fn: () => {
                p.res.emas += 10;
                p.sk.perang = cl(p.sk.perang + 3);
                return 'Para pejuang kembali dengan pengalaman tempur.';
              },
            },
          ],
        };
        return;
      }
    }

    // 1b. Manzikert 1071 -> Seljuk Rum
    if (y >= 1071 && !this.G.histDone.manzikert_1071) {
      this.G.histDone.manzikert_1071 = true;
      const suleiman = this.mkC({
        id: 'suleiman_rum',
        nama: 'Suleiman ibn Qutalmish',
        gender: 'L',
        lahir: 1045,
        budaya: 'turkish',
        agama: 'islam',
        dinasti: 'seljuk',
        kelas: 'penguasa',
      });
      this.T['k_seljuk_rum'] = {
        id: 'k_seljuk_rum',
        nama: 'Kesultanan Seljuk Rum',
        tier: 6,
        pem: suleiman.id,
        atas: null,
        budaya: 'turkish',
        agama: 'islam',
        prov: null,
        kids: [],
      };
      ['c_konya', 'c_ankara', 'c_kayseri'].forEach((cid) => {
        const ct = this.T[cid];
        if (ct) {
          if (ct.atas && this.T[ct.atas]) {
            this.T[ct.atas].kids = this.T[ct.atas].kids.filter((k) => k !== cid);
          }
          ct.atas = 'k_seljuk_rum';
          ct.agama = 'islam';
          ct.budaya = 'turkish';
          if (ct.pem && ct.pem !== this.G.pid) ct.pem = suleiman.id;
          this.T['k_seljuk_rum'].kids.push(cid);
        }
      });
      this.notifyLog(
        'Pertempuran Manzikert (1071): Sultan Alp Arslan & Suleiman ibn Qutalmish membuka Anatolia bagi Kesultanan Seljuk Rum!',
        '⚔️'
      );
    }

    // 1c. Portugal Independence 1139 -> Afonso Henriques
    if (y >= 1139 && !this.G.histDone.portugal_1139) {
      this.G.histDone.portugal_1139 = true;
      const afonso = this.mkC({
        id: 'afonso_henriques',
        nama: 'Afonso Henriques (Afonso I)',
        gender: 'L',
        lahir: 1109,
        budaya: 'portuguese',
        agama: 'katolik',
        kelas: 'penguasa',
      });
      if (!this.T['k_portugal']) {
        this.T['k_portugal'] = {
          id: 'k_portugal',
          nama: 'Kerajaan Portugal',
          tier: 6,
          pem: afonso.id,
          atas: null,
          budaya: 'portuguese',
          agama: 'katolik',
          prov: null,
          kids: [],
        };
        const dp = this.T['d_portucale'];
        if (dp) {
          if (dp.atas && this.T[dp.atas]) {
            this.T[dp.atas].kids = this.T[dp.atas].kids.filter((k) => k !== 'd_portucale');
          }
          dp.atas = 'k_portugal';
          if (dp.pem !== this.G.pid) dp.pem = afonso.id;
          this.T['k_portugal'].kids.push('d_portucale');
        }
      }
      this.notifyLog(
        'Tahun 1139: Afonso Henriques memproklamasikan Kerajaan Portugal yang merdeka dari León!',
        '👑'
      );
    }

    // 1d. Muwahhidun (Almohad) Rise in Morocco 1147
    if (y >= 1147 && !this.G.histDone.almohad_1147) {
      this.G.histDone.almohad_1147 = true;
      const abdal = this.mkC({
        id: 'abd_almumin',
        nama: "Abd al-Mu'min (Muwahhidun)",
        gender: 'L',
        lahir: 1094,
        budaya: 'maghrebi',
        agama: 'islam',
        kelas: 'penguasa',
      });
      const mar = this.T['k_maroko'];
      if (mar && mar.pem !== this.G.pid) {
        mar.pem = abdal.id;
        mar.nama = 'Kekhalifahan Muwahhidun (Maroko)';
      }
      this.notifyLog(
        "Tahun 1147: Abd al-Mu'min menyatukan Maroko & Al-Andalus di bawah Dinasti Muwahhidun.",
        '🌙'
      );
    }

    // 1e. Ottoman Rise 1299 -> Osman I
    if (y >= 1299 && !this.G.histDone.ottoman_1299) {
      this.G.histDone.ottoman_1299 = true;
      const osman = this.mkC({
        id: 'osman_1',
        nama: 'Osman I (Utsmaniyah)',
        gender: 'L',
        lahir: 1258,
        budaya: 'turkish',
        agama: 'islam',
        kelas: 'penguasa',
      });
      if (!this.T['k_turki']) {
        this.T['k_turki'] = {
          id: 'k_turki',
          nama: 'Kesultanan Utsmaniyah (Turki)',
          tier: 6,
          pem: osman.id,
          atas: null,
          budaya: 'turkish',
          agama: 'islam',
          prov: null,
          kids: [],
        };
        ['c_bursa', 'c_nicaea'].forEach((cid) => {
          const ct = this.T[cid];
          if (ct && ct.pem !== this.G.pid) {
            if (ct.atas && this.T[ct.atas]) {
              this.T[ct.atas].kids = this.T[ct.atas].kids.filter((k) => k !== cid);
            }
            ct.atas = 'k_turki';
            ct.agama = 'islam';
            ct.budaya = 'turkish';
            ct.pem = osman.id;
            this.T['k_turki'].kids.push(cid);
          }
        });
      }
      this.notifyLog(
        'Tahun 1299: Osman I mendirikan Dinasti Utsmaniyah (Turki) di Anatolia Barat!',
        '🌙'
      );
    }

    // 1f. Mehmed II Conquest of Constantinople 1453
    if (y >= 1453 && !this.G.histDone.constantinople_1453) {
      this.G.histDone.constantinople_1453 = true;
      const mehmed = this.mkC({
        id: 'mehmed_2',
        nama: 'Sultan Mehmed II Al-Fatih',
        gender: 'L',
        lahir: 1432,
        budaya: 'turkish',
        agama: 'islam',
        kelas: 'penguasa',
      });
      if (this.T['k_turki'] && this.T['k_turki'].pem !== this.G.pid) {
        this.T['k_turki'].pem = mehmed.id;
      }
      const constTitle = this.T['c_constantinople'];
      if (constTitle && constTitle.pem !== this.G.pid && this.T['k_turki']) {
        constTitle.agama = 'islam';
        constTitle.budaya = 'turkish';
        constTitle.pem = mehmed.id;
      }
      this.notifyLog(
        'Tahun 1453: Sultan Mehmed II Al-Fatih menaklukkan Konstantinopel, mengukuhkan Kesultanan Utsmaniyah!',
        '🏰'
      );
    }

    // 1g. Unification of Spain 1479 -> Isabella I & Ferdinand II
    if (y >= 1479 && !this.G.histDone.spain_1479) {
      this.G.histDone.spain_1479 = true;
      const isabella = this.mkC({
        id: 'isabella_castile',
        nama: 'Isabella I dari Castile',
        gender: 'P',
        lahir: 1451,
        budaya: 'castilian',
        agama: 'katolik',
        kelas: 'penguasa',
      });
      const ferdinand = this.mkC({
        id: 'ferdinand_aragon',
        nama: 'Ferdinand II dari Aragon',
        gender: 'L',
        lahir: 1452,
        budaya: 'castilian',
        agama: 'katolik',
        kelas: 'penguasa',
        pasangan: isabella.id,
        sn: 'menikah',
      });
      isabella.pasangan = ferdinand.id;
      isabella.sn = 'menikah';
      if (!this.T['k_spanyol']) {
        this.T['k_spanyol'] = {
          id: 'k_spanyol',
          nama: 'Kerajaan Spanyol',
          tier: 6,
          pem: isabella.id,
          atas: null,
          budaya: 'castilian',
          agama: 'katolik',
          prov: null,
          kids: [],
        };
      }
      this.notifyLog(
        'Tahun 1479: Pernikahan Isabella I dari Castile & Ferdinand II dari Aragon menyatukan Kerajaan Spanyol!',
        '👑'
      );
    }

    // 1g-b. Balkan History: Bulgarian Empire II (1185) & Kingdom of Serbia (1217)
    if (y >= 1185 && !this.G.histDone.bulgaria_1185) {
      this.G.histDone.bulgaria_1185 = true;
      const peter = this.mkC({
        id: 'ivan_asen_1',
        nama: 'Tsar Ivan Asen I',
        gender: 'L',
        lahir: 1150,
        budaya: 'bulgarian',
        agama: 'ortodoks',
        kelas: 'penguasa',
      });
      if (!this.T['k_bulgaria']) {
        this.T['k_bulgaria'] = {
          id: 'k_bulgaria',
          nama: 'Kekaisaran Bulgaria Kedua',
          tier: 6,
          pem: peter.id,
          atas: null,
          budaya: 'bulgarian',
          agama: 'ortodoks',
          prov: null,
          kids: [],
          kas: 500,
        };
        const db = this.T['d_bulgaria'];
        if (db && db.pem !== this.G.pid) {
          if (db.atas && this.T[db.atas]) {
            this.T[db.atas].kids = this.T[db.atas].kids.filter((k) => k !== 'd_bulgaria');
          }
          db.atas = 'k_bulgaria';
          db.pem = peter.id;
          this.T['k_bulgaria'].kids.push('d_bulgaria');
        }
      }
      this.notifyLog('Tahun 1185: Pemberontakan Asen & Peter memerdekakan Kekaisaran Bulgaria Kedua dari Bizantium!', '👑');
    }

    if (y >= 1217 && !this.G.histDone.serbia_1217) {
      this.G.histDone.serbia_1217 = true;
      const stefan = this.mkC({
        id: 'stefan_nemanjic',
        nama: 'Stefan Nemanjić (Yang Pertama Dimahkotai)',
        gender: 'L',
        lahir: 1165,
        budaya: 'serbian',
        agama: 'ortodoks',
        kelas: 'penguasa',
      });
      if (!this.T['k_serbia']) {
        this.T['k_serbia'] = {
          id: 'k_serbia',
          nama: 'Kerajaan Serbia Raya',
          tier: 6,
          pem: stefan.id,
          atas: null,
          budaya: 'serbian',
          agama: 'ortodoks',
          prov: null,
          kids: [],
          kas: 520,
        };
        ['c_raska', 'c_nis'].forEach((cid) => {
          const ct = this.T[cid];
          if (ct && ct.pem !== this.G.pid) {
            if (ct.atas && this.T[ct.atas]) {
              this.T[ct.atas].kids = this.T[ct.atas].kids.filter((k) => k !== cid);
            }
            ct.atas = 'k_serbia';
            ct.pem = stefan.id;
            this.T['k_serbia'].kids.push(cid);
          }
        });
      }
      this.notifyLog('Tahun 1217: Stefan Nemanjić dimahkotai sebagai Raja Serbia Raya!', '👑');
    }

    // 2. Henry VIII 1509
    if (y >= 1509 && !this.G.tudorSpawned) {
      this.G.tudorSpawned = true;
      const h8 = this.mkC({
        id: 'henry8',
        nama: 'Henry VIII Tudor',
        gender: 'L',
        lahir: 1491,
        budaya: 'inggris',
        agama: 'katolik',
        kelas: 'penguasa',
      });
      if (this.T['k_inggris']) this.T['k_inggris'].pem = h8.id;
      this.notifyLog('Henry VIII naik takhta Kerajaan Inggris.', '👑');
    }

    // 3. Martin Luther 1517
    if (y >= 1517 && !this.G.lutherSpawned) {
      this.G.lutherSpawned = true;
      this.mkC({
        id: 'luther',
        nama: 'Martin Luther',
        gender: 'L',
        lahir: 1483,
        budaya: 'german',
        agama: 'protestan',
        kelas: 'rohaniwan',
        profesi: 'pendeta',
      });
      this.G.ev = {
        judul: '95 Dalil Martin Luther (1517)',
        teks: 'Di Wittenberg, biarawan Martin Luther memaku 95 Dalil menentang penjualan surat pengampunan dosa Gereja.',
        isChain: true,
        pilihan: [
          {
            teks: 'Lindungi kaum Reformis Protestan (Peluk Protestan / +15 Pembelajaran)',
            fn: () => {
              p.sk.pembelajaran = cl(p.sk.pembelajaran + 15);
              if (p.agama === 'katolik') p.agama = 'protestan';
              this.checkAchievements();
              return 'Semangat pembaruan menyebar cepat di wilayahmu.';
            },
          },
          {
            teks: 'Setia pada Roma & kecam ajaran baru (+25 Kesalehan, +10 Hubungan Paus)',
            fn: () => {
              p.res.kesalehan += 25;
              if (this.G.church.pope && this.C[this.G.church.pope]) this.bump(this.C[this.G.church.pope], 15);
              return 'Paus memuji kesetiaan istanamu.';
            },
          },
        ],
      };
      return;
    }

    // 4. Anne Boleyn & Anglican 1533
    if (y >= 1533 && !this.G.anglican && !this.G.histDone.anglican_1533) {
      this.G.histDone.anglican_1533 = true;
      this.doAnglicanReform();
    }
  }

  public doAnglicanReform(): void {
    this.G.anglican = true;
    if (!this.AG('anglikan').keluarga || this.AG('anglikan').keluarga === 'x') {
      this.G.ag.push({
        id: 'anglikan',
        nama: 'Gereja Anglikan',
        keluarga: 'kristen',
        induk: 'katolik',
        reformed: true,
        efek: { administrasi: 2, kesalehan_per_tahun: 1 },
      });
    }
    const h8 = this.C['henry8'];
    if (h8 && h8.hidup) h8.agama = 'anglikan';
    this.notifyLog('Inggris memisahkan diri dari Roma dan mendirikan Gereja Anglikan.', '⛪');
  }

  public buildCouncil(): Character[] {
    const p = this.me();
    const vasals = this.held(p.id)
      .flatMap((t) => t.kids.map((k) => this.T[k]?.pem))
      .filter((id): id is string => Boolean(id && id !== p.id && this.C[id]?.hidup))
      .map((id) => this.C[id]);
    const advisors = Object.values(this.G.pen)
      .filter((id): id is string => Boolean(id && this.C[id]?.hidup))
      .map((id) => this.C[id]);
    const uniq = Array.from(new Map([...vasals, ...advisors].map((c) => [c.id, c])).values()).slice(0, 7);
    this.G.council = uniq.map((c) => c.id);
    return uniq;
  }

  public councilPropose(type: 'pajak' | 'perang' | 'reformasi'): void {
    const p = this.me();
    if (!this.isRuler(p)) {
      return this.msg('Hanya penguasa wilayah (kaum Bangsawan) yang dapat mengajukan rancangan di Dewan Bangsawan.');
    }
    const members = this.buildCouncil();
    if (!members.length) {
      this.G.councilVote = {
        type,
        passed: true,
        details: ['Tidak ada anggota dewan — usulan disahkan langsung oleh mahkota.'],
        y: this.G.tahun,
      };
      this.msg('Usulan disetujui (belum ada anggota Dewan Bangsawan).');
      return;
    }
    let yesWeight = 0;
    let totalWeight = 0;
    const details: string[] = [];
    members.forEach((m) => {
      const mTitle = this.held(m.id)[0];
      const w = Math.max(1, this.getTitleRights(this.tierOf(m), Boolean(mTitle?.marquis)).bobotSuara);
      totalWeight += w;
      const score = this.opn(m, p) + this.effectiveStat(p, 'diplomasi') * 0.4 + (m.sifat.includes('setia') ? 20 : 0);
      const v = score >= 12;
      if (v) yesWeight += w;
      details.push(`${this.full(m)} (Bobot ${w}): ${v ? 'Setuju' : 'Menolak'}`);
    });
    const passed = yesWeight >= Math.ceil(totalWeight / 2);
    this.G.councilVote = { type, passed, details, y: this.G.tahun };
    if (passed) {
      p.res.prestise += 8;
      if (type === 'pajak') this.addStateFunds(30, p);
      if (type === 'perang') this.G.morale = Math.min(100, (this.G.morale ?? 80) + 8);
      if (type === 'reformasi') this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia + 6);
    } else {
      p.res.prestise = Math.max(0, p.res.prestise - 5);
    }
    this.msg(`Pemungutan suara Dewan (${type}): ${passed ? 'LOLOS' : 'DITOLAK'} (${yesWeight}/${totalWeight} bobot suara).`);
  }

  private kudetaTick(): void {
    const p = this.me();
    if (this.tierOf(p) < 3 || this.G.coups.length > 0) return;
    const angryVasal = this.held(p.id)
      .flatMap((t) => t.kids.map((k) => this.T[k]?.pem))
      .map((id) => (id ? this.C[id] : null))
      .find((c): c is Character => Boolean(c && c.hidup && c.id !== p.id && this.opn(c, p) <= -65));
    if (angryVasal && Math.random() < 0.12) {
      this.G.coups.push({ rebelId: angryVasal.id, y: this.G.tahun });
      this.notifyLog(`WASPADA KUDETA! ${this.full(angryVasal)} menghimpun pasukan pemberontak!`, '🚨');
    }
  }

  public resolveKudeta(mode: 'perang' | 'damai'): void {
    const p = this.me();
    const coup = this.G.coups[0];
    if (!coup) return;
    const rebel = this.C[coup.rebelId];
    this.G.coups.shift();
    if (mode === 'damai') {
      if (p.res.emas < 50) return this.msg('Butuh 50 emas untuk menyuap & meredam konspirasi.');
      p.res.emas -= 50;
      if (rebel) this.bump(rebel, 40);
      return this.msg('Konspirasi kudeta berhasil diredam lewat konsesi emas.');
    }
    const win = !rebel || this.pwr(p) >= this.pwr(rebel) * 0.9;
    sfx.playDrum();
    if (win) {
      if (rebel) {
        this.G.jail[rebel.id] = this.G.tahun;
        rebel.op[p.id] = -90;
      }
      p.res.prestise += 20;
      this.msg(`Kudeta gagal! Pemimpin pemberontak ditangkap.`);
    } else {
      p.res.prestise = Math.max(0, p.res.prestise - 30);
      p.res.emas *= 0.6;
      this.msg('Pasukan pemberontak mendesak istana! Kas & prestise terpangkas.');
    }
  }

  public checkAchievements(): void {
    const p = this.me();
    const unlock = (id: string) => {
      if (!this.G.achievements.includes(id)) {
        this.G.achievements.push(id);
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        if (def) this.notifyLog(`Pencapaian Terbuka: ${def.icon} ${def.nama}`, '🏆');
      }
    };
    const d = this.G.deeds[p.id] || {};
    if ((d.wars_won || 0) >= 1) unlock('first_win');
    if (p.res.emas >= 500) unlock('rich_500');
    const dy = p.dinasti ? this.DY[p.dinasti] : null;
    if (dy && dy.prestise >= 500) unlock('great_dynasty');
    if (this.tierOf(p) >= 6) unlock('tier_king');
    if (this.tierOf(p) >= 7) unlock('tier_emperor');
    if (this.G.crusadeHistory.some((c) => c.result === 'win')) unlock('crusader');
    if (this.umur(p) >= 70) unlock('long_reign');
    if (p.anak.length >= 5) unlock('marry_5');
    if (this.G.church.pope === p.id) unlock('pope');
    if (p.agama === 'protestan' || p.agama === 'anglikan' || this.G.reformed.length > 0) unlock('protestant');
    if (this.G.expeditions.some((e) => e.result === 'success')) unlock('expedition_win');
    if (this.G.blackDeath && !this.G.blackDeath.active) unlock('survive_plague');
  }

  public computeScore(): number {
    const p = this.me();
    const dy = p.dinasti ? this.DY[p.dinasti] : null;
    const years = Math.max(1, this.G.tahun - (this.G.startYear || this.D.meta.tahun_mulai));
    const titles = this.held(p.id).length * 40;
    const ach = this.G.achievements.length * 50;
    return Math.round(
      years * 5 + p.res.prestise + p.res.kesalehan * 0.5 + (dy?.prestise || 0) * 0.5 + titles + ach
    );
  }

  // =========================================================================
  // v16 FEATURES: Commoner Marriage, Rejection Boost, Tutors, Orders, Market,
  // Morale & Travel
  // =========================================================================
  public boostRej(mode: 'gift' | 'prestige' | 'army'): void {
    const md = this.G.md;
    if (!md) return;
    const p = this.me();
    const o = this.C[md.targetId];
    if (!o) return;
    if (mode === 'gift') {
      if (p.res.emas < 50) return this.showToast('Butuh 50 emas untuk hadiah lamaran.');
      p.res.emas -= 50;
      this.bump(o, 25);
    } else if (mode === 'prestige') {
      if (p.res.prestise < 20) return this.showToast('Butuh 20 prestise.');
      p.res.prestise -= 20;
      this.bump(o, 20);
    } else if (mode === 'army') {
      p.res.emas = Math.max(0, p.res.emas - 20);
      this.bump(o, 15);
    }
    const r = this.acc(o, md.onForceAction.type === 'lamar' ? 'nikah' : md.onForceAction.tp);
    if (r.t >= 100) {
      if (md.onForceAction.type === 'lamar') this.lamar(o.id, false);
      else this.prop(o.id, md.onForceAction.tp, false);
    } else {
      this.G.md = {
        ...md,
        factors: r.f,
        total: r.t,
      };
      this.notify();
    }
  }

  public makeCommoner(
    locId?: string,
    opts?: { widow?: boolean; withChildren?: boolean; priorMarriages?: number; includeDivorce?: boolean }
  ): Character {
    const p = this.me();
    const g: 'L' | 'P' = p.gender === 'L' ? 'P' : 'L';
    const loc = locId || p.loc || this.held(p.id)[0]?.id;
    const t = loc ? this.T[loc] : null;
    const cul = t?.budaya || p.budaya;
    const isWidow = Boolean(opts?.widow || opts?.withChildren);
    const priorCount = opts?.priorMarriages || 1;
    const age = isWidow ? (priorCount >= 2 ? R(29, 44) : R(22, 40)) : R(18, 28);
    const fa = this.mkC({
      gender: 'L',
      lahir: this.G.tahun - age - R(20, 30),
      budaya: cul,
      agama: p.agama,
      kelas: 'rakyat_jelata',
      hidup: false,
      wafat: this.G.tahun - R(1, 10),
    });
    const mo = this.mkC({
      gender: 'P',
      lahir: this.G.tahun - age - R(18, 26),
      budaya: cul,
      agama: p.agama,
      kelas: 'rakyat_jelata',
    });
    const c = this.mkC({
      gender: g,
      lahir: this.G.tahun - age,
      budaya: cul,
      agama: p.agama,
      kelas: 'rakyat_jelata',
      sn: isWidow ? (g === 'P' ? 'janda' : 'duda') : 'lajang',
      ayah: fa.id,
      ibu: mo.id,
      loc,
      op: { [p.id]: 35 },
    });
    fa.anak.push(c.id);
    mo.anak.push(c.id);
    if (isWidow) {
      this.seedPriorMarriagesAndKids(c, {
        count: priorCount,
        withChildren: Boolean(opts?.withChildren),
        kelas: 'rakyat_jelata',
        cul,
        agama: p.agama,
        dinasti: null,
        loc,
        includeDivorceFirst: Boolean(opts?.includeDivorce),
      });
    }
    return c;
  }

  public makeCommonerBatch(mode: 'mixed' | 'widow' | 'widow_kids' = 'mixed'): Character[] {
    if (mode === 'widow_kids') {
      return [
        this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 2, includeDivorce: true }),
        this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 2, includeDivorce: false }),
        this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 1 }),
      ];
    }
    if (mode === 'widow') {
      return [
        this.makeCommoner(undefined, { widow: true, withChildren: false, priorMarriages: 1 }),
        this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 2, includeDivorce: true }),
        this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 1 }),
      ];
    }
    return [
      this.makeCommoner(undefined, { widow: false, withChildren: false }),
      this.makeCommoner(undefined, { widow: true, withChildren: false, priorMarriages: 1 }),
      this.makeCommoner(undefined, { widow: true, withChildren: true, priorMarriages: 2, includeDivorce: true }),
    ];
  }

  public marryCommoner(id: string): void {
    const p = this.me();
    const o = this.C[id];
    if (!o || !o.hidup) return;
    const pp = this.D.profesi.find((x: AnyRule) => x.id === p.profesi);
    if (pp && this.noMarry(pp, p)) return this.msg('Profesimu tidak boleh menikah.');
    if (p.sn === 'menikah') return this.msg('Sudah menikah.');
    const elig = this.checkMarriageEligibility(p, o, true);
    if (!elig.ok) return this.msg(elig.reason || 'Tidak dapat menikah.');
    const wasWidow = o.sn === 'janda' || o.sn === 'duda';
    const stepKids = o.anak.filter((aid) => this.C[aid]?.hidup).length;
    p.sn = o.sn = 'menikah';
    p.pasangan = o.id;
    o.pasangan = p.id;
    o.dinasti = p.dinasti;
    p.marriageStartYear = this.G.tahun;
    o.marriageStartYear = this.G.tahun;
    p.marriageHistory = p.marriageHistory || [];
    o.marriageHistory = o.marriageHistory || [];
    p.marriageHistory.push({
      spouseId: o.id,
      spouseName: this.full(o),
      dynastyName: o.dinasti ? this.DY[o.dinasti]?.nama : undefined,
      year: this.G.tahun,
      morganatic: !this.isCommoner(p),
    });
    o.marriageHistory.push({
      spouseId: p.id,
      spouseName: this.full(p),
      dynastyName: p.dinasti ? this.DY[p.dinasti]?.nama : undefined,
      year: this.G.tahun,
      morganatic: !this.isCommoner(p),
    });
    if (!this.isCommoner(p)) p.res.prestise = Math.max(0, p.res.prestise - 5);
    p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 15);
    const stepNote = stepKids > 0 ? ` & menerima ${stepKids} anak tiri dalam keluarga` : '';
    const statusWord = wasWidow ? 'janda/duda rakyat jelata' : 'rakyat jelata';
    this.msg(
      this.isCommoner(p)
        ? `Menikah dengan ${this.full(o)} (${statusWord})${stepNote}! (+15 Kebahagiaan)`
        : `Menikah morganatik dengan ${this.full(o)} (${statusWord})${stepNote}! (+15 Kebahagiaan, -5 Prestise)`
    );
  }

  public educateChild(childId: string, tutorId: string): void {
    const p = this.me();
    const child = this.C[childId];
    const tutor = TUTORS[tutorId];
    if (!child || !tutor) return;
    if (this.umur(child) >= 16) return this.msg('Anak sudah dewasa (≥ 16 tahun).');
    if (this.G.done['edu_' + childId]) return this.msg('Anak sudah dilatih tahun ini.');
    if (p.res.emas < tutor.biaya) return this.msg(`Butuh ${tutor.biaya} emas.`);
    p.res.emas -= tutor.biaya;
    this.G.done['edu_' + childId] = 1;
    (child.sk as AnyRule)[tutor.stat] = cl((child.sk as AnyRule)[tutor.stat] + tutor.gain);
    this.G.childTutor[childId] = (this.G.childTutor[childId] || 0) + 1;
    this.msg(`${child.nama} belajar bersama ${tutor.nama}: ${tutor.stat} +${tutor.gain}.`);
  }

  public joinOrder(orderId: string): void {
    const p = this.me();
    const ord = ORDERS[orderId];
    if (!ord) return;
    if (this.AG(p.agama).keluarga !== 'kristen') {
      return this.msg(`Pembatasan Agama: ${ord.nama} hanya menerima ksatria beragama Kristen.`);
    }
    if (this.G.orders[orderId]) return this.msg('Kamu sudah tergabung di ordo ini.');
    if (p.res.emas < ord.biaya) return this.msg(`Butuh ${ord.biaya} emas untuk iuran masuk.`);
    if (p.res.prestise < ord.prestiseMin) return this.msg(`Butuh ${ord.prestiseMin} prestise.`);
    p.res.emas -= ord.biaya;
    this.G.orders[orderId] = this.G.tahun;
    if (orderId === 'templar') p.sp.duel = cl(p.sp.duel + 5);
    if (orderId === 'hospitaller') p.sp.kesehatan = cl(p.sp.kesehatan + 5);
    if (orderId === 'teutonik') p.sk.perang = cl(p.sk.perang + 2);
    if (orderId === 'st_george') {
      this.G.morale = Math.min(100, (this.G.morale ?? 80) + 5);
      p.sp.duel = cl(p.sp.duel + 3);
    }
    this.notifyLog(`Bergabung dengan ${ord.nama}.`, '🛡️');
    this.msg(`Kamu resmi dilantik ke dalam ${ord.nama}!`);
  }

  private ordersTick(): void {
    const p = this.me();
    if (this.G.orders.templar) p.res.prestise += 2;
    if (this.G.orders.hospitaller) p.res.kesalehan += 2;
    if (this.G.orders.teutonik) p.res.prestise += 1;
  }

  private priceTick(): void {
    const base: Record<keyof GameState['prices'], number> = { grain: 2, iron: 5, cloth: 4, spice: 10 };
    (Object.keys(base) as (keyof GameState['prices'])[]).forEach((k) => {
      let val = this.G.prices[k] * (1 + (Math.random() - 0.5) * 0.25);
      if (k === 'iron' && (this.G.war || this.G.greatWars.length > 0)) val *= 1.1;
      if (k === 'grain' && this.G.blackDeath?.active) val *= 1.15;
      const minP = base[k] * 0.5;
      const maxP = base[k] * 2;
      this.G.prices[k] = Math.round(Math.max(minP, Math.min(maxP, val)) * 10) / 10;
    });
  }

  public sellGrain(units = 10): void {
    const p = this.me();
    if (this.G.done.sellGrain) return this.msg('Sudah berdagang gandum di pasar tahun ini.');
    const count = this.held(p.id).filter((t) => t.tier <= 3 && !t.titular).length;
    if (count < 1) return this.msg('Butuh minimal 1 wilayah penghasil hasil bumi.');
    this.G.done.sellGrain = 1;
    const rev = Math.round(units * this.G.prices.grain * count);
    p.res.emas += rev;
    this.msg(`Menjual hasil bumi di pasar seharga ${rev} emas (kurs ${this.G.prices.grain}/karung).`);
  }

  private moraleTick(): void {
    if (this.G.morale === undefined) this.G.morale = 80;
    if (!this.G.war && this.G.morale < 80) this.G.morale = Math.min(80, this.G.morale + 3);
    if (this.G.rakyat.bahagia < 30) this.G.morale = Math.max(20, this.G.morale - 3);
  }

  public titleDistance(fromId: string | undefined, toId: string): number {
    if (!fromId || fromId === toId) return 1;
    const a = this.T[fromId];
    const b = this.T[toId];
    if (!a || !b) return 2;
    if (a.atas && a.atas === b.atas) return 1;
    const ga = a.atas && this.T[a.atas] ? this.T[a.atas].atas : null;
    const gb = b.atas && this.T[b.atas] ? this.T[b.atas].atas : null;
    if (ga && ga === gb) return 2;
    return 3;
  }

  public travelTo(tid: string): void {
    const p = this.me();
    const t = this.T[tid];
    if (!t) return this.msg('Tujuan tidak valid.');
    if (this.G.travel) return this.msg('Kamu masih berada di tengah perjalanan.');
    if (p.res.emas < 15) return this.msg('Butuh 15 emas untuk bekal perjalanan.');
    p.res.emas -= 15;
    const fromId = this.held(p.id)[0]?.id || p.loc;
    const dist = this.titleDistance(fromId, tid);
    this.G.travel = { to: tid, years: dist, risk: dist * 10, start: this.G.tahun };
    this.msg(`Rombongan berangkat menuju ${t.nama} (perkiraan ${dist} tahun).`);
  }

  private travelTick(): void {
    const tr = this.G.travel;
    if (!tr) return;
    tr.years--;
    const p = this.me();
    const dest = this.T[tr.to];
    if (Math.random() < 0.25) {
      const r = Math.random();
      if (r < 0.45) {
        p.res.emas = Math.max(0, p.res.emas - 10);
        this.G.log.unshift('Di perjalanan: bandit menghadang kafilah (-10 emas).');
      } else {
        p.sk.diplomasi = cl(p.sk.diplomasi + 2);
        this.G.log.unshift('Di perjalanan: bertemu sarjana pengelana (+2 Diplomasi).');
      }
    }
    if (tr.years <= 0) {
      p.loc = tr.to;
      p.res.prestise += 10;
      if (dest?.pem && this.C[dest.pem]) this.bump(this.C[dest.pem], 15);
      this.G.travel = null;
      this.notifyLog(`Tiba di ${dest?.nama || tr.to}!`, '🐎');
      this.G.log.unshift(`Tiba selamat di ${dest?.nama || tr.to}! (+10 Prestise)`);
    }
  }

  // =========================================================================
  // v18 PART 1 & 3: Detailed Bureaucracy, War Logistics Campaigns, Family SVG
  // =========================================================================
  public officeEnsure(jid: string) {
    if (!this.G.office[jid]) {
      this.G.office[jid] = {
        quality: R(35, 85),
        loyalty: R(45, 90),
        corruption: R(0, 35),
        trait: pick([...OFFICE_TRAITS]),
        since: this.G.tahun,
      };
    }
    return this.G.office[jid];
  }

  public officeQualityName(q: number): string {
    if (q >= 85) return 'Brilian';
    if (q >= 65) return 'Kompeten';
    if (q >= 45) return 'Cukup';
    return 'Lemah';
  }

  public officeLoyaltyName(l: number): string {
    if (l >= 80) return 'Sangat Setia';
    if (l >= 55) return 'Setia';
    if (l >= 35) return 'Ragu';
    return 'Membangkang';
  }

  public officeEfficiency(jid: string): number {
    const od = this.G.office[jid];
    if (!od) return 1;
    let m = 0.65 + od.quality / 140;
    if (od.trait === 'jenius') m += 0.25;
    if (od.trait === 'malas') m -= 0.2;
    if (od.trait === 'korup') m -= 0.1;
    return Math.max(0.4, Math.min(1.5, m));
  }

  private officeCorruptionTick(): void {
    const p = this.me();
    Object.keys(this.G.pen).forEach((jid) => {
      const cid = this.G.pen[jid];
      if (!cid || !this.C[cid]?.hidup) return;
      const od = this.officeEnsure(jid);
      const stealChance = (od.corruption + (od.trait === 'korup' ? 20 : 0) - (od.trait === 'jujur' ? 25 : 0)) / 200;
      if (Math.random() < stealChance) {
        const stolen = R(3, 12);
        p.res.emas = Math.max(0, p.res.emas - stolen);
        this.G.officerHistory.push({ id: cid, j: jid, y: this.G.tahun, type: 'corruption', stolen });
        this.G.log.unshift(`Audit kas: ditemukan kebocoran anggaran ${stolen} emas di pos ${jid}.`);
      }
    });
  }

  public officePromote(jid: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa wilayah yang memiliki pejabat istana.');
    const cid = this.G.pen[jid];
    if (!cid) return this.msg('Pos ini kosong.');
    if (!this.spendStateFunds(50, p)) return this.msg('Kas Negara tidak cukup (butuh 50 emas untuk penghargaan pejabat).');
    const od = this.officeEnsure(jid);
    od.quality = Math.min(100, od.quality + 12);
    od.loyalty = Math.min(100, od.loyalty + 15);
    this.bump(this.C[cid], 15);
    this.msg(`Pejabat dipromosikan dari Kas Negara! Kualitas & loyalitas meningkat.`);
  }

  public officeInvestigate(jid: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa wilayah yang dapat mengaudit pejabat istana.');
    const cid = this.G.pen[jid];
    if (!cid) return this.msg('Pos ini kosong.');
    if (!this.spendStateFunds(30, p)) return this.msg('Kas Negara tidak cukup (butuh 30 emas biaya penyelidikan).');
    const od = this.officeEnsure(jid);
    if (od.corruption >= 25 || od.trait === 'korup') {
      const recovered = Math.round(od.corruption * 0.8);
      this.addStateFunds(recovered, p);
      od.corruption = Math.max(0, od.corruption - 20);
      this.bump(this.C[cid], -20);
      this.msg(`Penyelidikan menemukan penyelewengan! Disita kembali ${recovered} emas ke Kas Negara.`);
    } else {
      od.loyalty = Math.max(0, od.loyalty - 5);
      this.msg('Tidak ditemukan bukti korupsi yang berarti.');
    }
  }

  public supplyTick(): void {
    const p = this.me();
    const troops = sumObj(this.G.tr);
    if (!this.G.logistics) this.G.logistics = { supply: 100, morale: 85, forage: 0 };
    if (troops <= 0) {
      this.G.logistics.supply = 100;
      return;
    }
    if (this.G.warCampaign) {
      const drain = Math.max(5, Math.round(troops / 45));
      this.G.logistics.supply = Math.max(0, this.G.logistics.supply - drain);
      if (this.G.logistics.supply < 20) {
        const lossPct = 0.08;
        for (const k of Object.keys(this.G.tr)) {
          this.G.tr[k] = Math.max(0, Math.round(this.G.tr[k] * (1 - lossPct)));
        }
        this.G.morale = Math.max(20, (this.G.morale ?? 80) - 8);
        this.G.log.unshift(`Logistik menipis (${this.G.logistics.supply}%)! Pasukan mengalami desersi.`);
      }
    } else {
      this.G.logistics.supply = Math.min(100, this.G.logistics.supply + 15);
    }
    void p;
  }

  public forageAction(): void {
    if (!this.isRuler(this.me())) return this.msg('Hanya penguasa berpasukan yang dapat mengarahkan logistik.');
    if (this.G.done.forage) return this.msg('Sudah menjarah suplai tahun ini.');
    this.G.done.forage = 1;
    const gain = R(15, 30);
    this.G.logistics.supply = Math.min(100, this.G.logistics.supply + gain);
    this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 4);
    this.msg(`Pasukan mengumpulkan bahan pangan (+${gain}% suplai, -4 kebahagiaan rakyat).`);
  }

  public supplyAction(): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa berwilayah yang dapat mengirim konvoi pasukan.');
    if (!this.spendStateFunds(25, p)) return this.msg('Kas Negara tidak cukup (butuh 25 emas untuk kereta perbekalan).');
    this.G.logistics.supply = Math.min(100, this.G.logistics.supply + 35);
    this.msg('Konvoi perbekalan tiba (+35% suplai pasukan, dibayar dari Kas Negara).');
  }

  public campaignStart(tid: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa berwilayah yang dapat memimpin kampanye militer.');
    const t = this.T[tid];
    const o = t?.pem ? this.C[t.pem] : null;
    if (!t || !o || o.id === p.id) return this.msg('Target kampanye tidak valid.');
    if (this.G.warCampaign) return this.msg('Kampanye militer masih berjalan.');
    if (sumObj(this.G.tr) < 50) return this.msg('Butuh minimal 50 pasukan untuk memulai kampanye.');
    const fromId = this.held(p.id)[0]?.id || p.loc;
    const dist = this.titleDistance(fromId, tid);
    this.G.warCampaign = { tid, distance: dist, turns: 0, start: this.G.tahun, enemy: o.id };
    sfx.playDrum();
    this.notifyLog(`Kampanye militer menuju ${t.nama} diberangkatkan.`, '⚔️');
    this.msg(`Ekspedisi militer menuju ${t.nama} dimulai (jarak ${dist} tahun).`);
  }

  private campaignTick(): void {
    const wc = this.G.warCampaign;
    if (!wc) return;
    wc.turns++;
    if (wc.turns >= wc.distance) {
      const tid = wc.tid;
      this.G.warCampaign = null;
      this.G.done.perang = 0;
      this.war(tid, 'tak', true);
    } else {
      this.G.log.unshift(`Kampanye militer menuju ${this.T[wc.tid]?.nama || wc.tid}: perjalanan tahun ${wc.turns}/${wc.distance}.`);
    }
  }

  public buildFamilyTree(focusId?: string, depth = 3, selectedId?: string | null, expandedIds?: string[]) {
    type EdgeKind = 'blood' | 'spouse_active' | 'ex_divorce' | 'ex_widow' | 'step_child' | 'step_sibling';
    const rootId = focusId || this.G.familyFocus || this.G.pid;
    const focus = this.C[rootId] || this.me();
    if (!focus) return { nodes: [], edges: [] as { from: string; to: string; kind: EdgeKind; label?: string }[] };

    const showSpouses = this.G.familyView?.showSpouses ?? true;
    const showDead = this.G.familyView?.showDead ?? false;
    const expandSet = new Set<string>([
      focus.id,
      ...(expandedIds || []),
      ...(selectedId && this.C[selectedId] ? [selectedId] : []),
    ]);

    // Ensure legacy late_* marriage records are materialized into real Character entries
    expandSet.forEach((eid) => {
      if (this.C[eid]) this.materializeMarriageHistoryFor(this.C[eid]);
    });
    if (focus.pasangan && this.C[focus.pasangan]) this.materializeMarriageHistoryFor(this.C[focus.pasangan]);

    const nodesMap = new Map<string, { id: string; char: Character; gen: number; role: string }>();
    const edges: { from: string; to: string; kind: EdgeKind; label?: string }[] = [];
    const seenEdges = new Set<string>();

    const addEdge = (from: string, to: string, kind: EdgeKind, label?: string) => {
      if (!from || !to || from === to) return;
      if (!nodesMap.has(from) || !nodesMap.has(to)) return;
      const symmetric = kind !== 'blood' && kind !== 'step_child';
      const key = symmetric ? `${[from, to].sort().join('|')}|${kind}` : `${from}|${to}|${kind}`;
      if (seenEdges.has(key)) return;
      seenEdges.add(key);
      edges.push({ from, to, kind, label });
    };

    const addNode = (c: Character | undefined, gen: number, role: string, forceInclude = false) => {
      if (!c) return;
      if (!forceInclude && !showDead && !c.hidup && !expandSet.has(c.id)) return;
      if (!nodesMap.has(c.id)) nodesMap.set(c.id, { id: c.id, char: c, gen, role });
    };

    const getExEdgeKind = (rec: MarriageRecord, exChar?: Character | null): 'ex_divorce' | 'ex_widow' => {
      const r = (rec.reason || '').toLowerCase();
      if (r.includes('cerai') && !r.includes('wafat') && !r.includes('mati')) return 'ex_divorce';
      if (r.includes('wafat') || r.includes('mati') || r.includes('meninggal')) return 'ex_widow';
      if (exChar) return exChar.hidup ? 'ex_divorce' : 'ex_widow';
      return 'ex_widow';
    };

    addNode(focus, 0, 'Fokus', true);

    // 1. Walk ancestors up to depth (bloodlines)
    let frontier: { c: Character; gen: number }[] = [{ c: focus, gen: 0 }];
    for (let d = 1; d <= Math.min(2, depth); d++) {
      const next: { c: Character; gen: number }[] = [];
      frontier.forEach(({ c, gen }) => {
        if (c.ayah && this.C[c.ayah]) {
          addNode(this.C[c.ayah], gen - 1, 'Ayah/Leluhur');
          if (nodesMap.has(c.ayah)) {
            addEdge(c.ayah, c.id, 'blood');
            next.push({ c: this.C[c.ayah], gen: gen - 1 });
          }
        }
        if (c.ibu && this.C[c.ibu]) {
          addNode(this.C[c.ibu], gen - 1, 'Ibu/Leluhur');
          if (nodesMap.has(c.ibu)) {
            addEdge(c.ibu, c.id, 'blood');
            next.push({ c: this.C[c.ibu], gen: gen - 1 });
          }
        }
      });
      frontier = next;
    }

    // 2. Siblings of focus (including half-siblings if showDead/living match)
    const allSibs = Object.values(this.C).filter(
      (c) =>
        c.id !== focus.id &&
        (c.hidup || showDead) &&
        ((focus.ibu && c.ibu === focus.ibu) || (focus.ayah && c.ayah === focus.ayah))
    );
    allSibs.forEach((s) => {
      const sameFa = Boolean(focus.ayah && s.ayah && focus.ayah === s.ayah);
      const sameMo = Boolean(focus.ibu && s.ibu && focus.ibu === s.ibu);
      const isHalf = sameFa !== sameMo;
      addNode(s, 0, isHalf ? 'Saudara Tiri' : 'Saudara');
      if (nodesMap.has(s.id)) {
        if (s.ayah && nodesMap.has(s.ayah)) addEdge(s.ayah, s.id, 'blood');
        if (s.ibu && nodesMap.has(s.ibu)) addEdge(s.ibu, s.id, 'blood');
        if (isHalf) {
          addEdge(focus.id, s.id, 'step_sibling', 'Saudara Tiri');
        } else if ((!s.ayah || !nodesMap.has(s.ayah)) && (!s.ibu || !nodesMap.has(s.ibu))) {
          addEdge(focus.id, s.id, 'blood', 'Saudara Kandung');
        }
      }
    });

    // 3. Descendants up to depth
    let downFrontier: { c: Character; gen: number }[] = [{ c: focus, gen: 0 }];
    for (let d = 1; d <= depth; d++) {
      const next: { c: Character; gen: number }[] = [];
      downFrontier.forEach(({ c, gen }) => {
        c.anak.forEach((kidId) => {
          const kid = this.C[kidId];
          if (!kid) return;
          addNode(kid, gen + 1, gen === 0 ? 'Anak Kandung' : 'Cucu/Keturunan');
          if (nodesMap.has(kid.id)) {
            addEdge(c.id, kid.id, 'blood');
            next.push({ c: kid, gen: gen + 1 });
          }
        });
      });
      downFrontier = next;
    }

    // 4. Spouses (active + former marriages), plus stepchildren & clicked-spouse previous husbands
    if (showSpouses) {
      const baseNodes = Array.from(nodesMap.values());
      baseNodes.forEach((n) => {
        const spId = n.char.pasangan;
        if (spId && this.C[spId]) {
          const spChar = this.C[spId];
          this.materializeMarriageHistoryFor(spChar);
          const forceSpouse = expandSet.has(n.id);
          addNode(spChar, n.gen, n.char.sn === 'bertunangan' ? 'Tunangan' : 'Pasangan', forceSpouse);
          if (nodesMap.has(spId)) {
            addEdge(n.id, spId, 'spouse_active', n.char.sn === 'bertunangan' ? 'Tunangan' : 'Pasangan');
          }
        }
      });

      // Expand former marriages for focus, expanded/clicked nodes (e.g. clicked widow spouse!), or showDead/living exes
      const currentNodes = Array.from(nodesMap.values());
      currentNodes.forEach((n) => {
        const isExpanded = expandSet.has(n.id);
        const recs = (n.char.marriageHistory || []).filter(
          (rec) => rec.spouseId && rec.spouseId !== n.char.pasangan && (rec.endedYear || rec.spouseId !== n.char.pasangan)
        );
        recs.forEach((rec, idx) => {
          const ex = this.C[rec.spouseId];
          if (!ex) return;
          const exKind = getExEdgeKind(rec, ex);
          const canShowEx = isExpanded || showDead || ex.hidup;
          if (!canShowEx) return;
          const nthLabel = `Mantan ke-${idx + 1} (${exKind === 'ex_divorce' ? 'Cerai Hidup' : 'Cerai Mati'})`;
          addNode(ex, n.gen, nthLabel, isExpanded);
          if (nodesMap.has(ex.id)) {
            addEdge(n.id, ex.id, exKind, exKind === 'ex_divorce' ? 'Cerai Hidup' : 'Cerai Mati');
          }
        });
      });
    }

    // 5. Reveal Stepchildren (Anak Tiri) of focus (from active spouse or widowed spouse) and connect blood + step lines
    const focusSpouse = focus.pasangan ? this.C[focus.pasangan] : null;
    const spouseSources: Character[] = [];
    if (focusSpouse && nodesMap.has(focusSpouse.id)) spouseSources.push(focusSpouse);
    (focus.marriageHistory || []).forEach((m) => {
      if (m.endedYear && !(m.reason || '').toLowerCase().includes('cerai') && this.C[m.spouseId] && nodesMap.has(m.spouseId)) {
        spouseSources.push(this.C[m.spouseId]);
      }
    });

    spouseSources.forEach((sp) => {
      const spKids = Object.values(this.C).filter(
        (kid) => sp.anak.includes(kid.id) || kid.ibu === sp.id || kid.ayah === sp.id
      );
      spKids.forEach((kid) => {
        if (this.blood(focus, kid)) return;
        const shouldShowStep = showDead || kid.hidup || expandSet.has(sp.id);
        addNode(kid, 1, 'Anak Tiri', shouldShowStep);
        if (nodesMap.has(kid.id)) {
          addEdge(focus.id, kid.id, 'step_child', 'Anak Tiri');
          addEdge(sp.id, kid.id, 'blood');
        }
      });
    });

    // Also reveal all children of any clicked/expanded node (e.g. clicking an ex-husband or widow)
    Array.from(nodesMap.values()).forEach((en) => {
      if (!expandSet.has(en.id) || en.id === focus.id) return;
      en.char.anak.forEach((kidId) => {
        const kid = this.C[kidId];
        if (!kid) return;
        const isFocusBlood = this.blood(focus, kid);
        const role =
          en.gen === 0
            ? isFocusBlood
              ? 'Anak Kandung'
              : this.isStep(focus, kid)
                ? 'Anak Tiri'
                : 'Anak Pasangan'
            : 'Keturunan';
        addNode(kid, en.gen + 1, role, true);
      });
    });

    // 6. Complete all bloodlines & step-child links between all visible nodes
    const allNodes = Array.from(nodesMap.values());
    allNodes.forEach((childNode) => {
      const ch = childNode.char;
      if (ch.ayah && nodesMap.has(ch.ayah)) {
        addEdge(ch.ayah, ch.id, 'blood');
      }
      if (ch.ibu && nodesMap.has(ch.ibu)) {
        addEdge(ch.ibu, ch.id, 'blood');
      }
      // Step-parent links on row gen - 1 -> child on row gen
      if (childNode.gen === 1 && focus.id !== ch.id && this.isStep(focus, ch)) {
        addEdge(focus.id, ch.id, 'step_child', 'Anak Tiri');
      }
      if (childNode.gen === 1 && focusSpouse && nodesMap.has(focusSpouse.id) && !this.blood(focusSpouse, ch) && this.blood(focus, ch)) {
        addEdge(focusSpouse.id, ch.id, 'step_child', 'Anak Tiri');
      }
    });

    // 7. Connect biological children with their step/half-siblings (Saudara Tiri -> BIRU)
    const gen1Nodes = allNodes.filter((n) => n.gen === 1);
    for (let i = 0; i < gen1Nodes.length; i++) {
      for (let j = i + 1; j < gen1Nodes.length; j++) {
        const a = gen1Nodes[i].char;
        const b = gen1Nodes[j].char;
        const sameFa = Boolean(a.ayah && b.ayah && a.ayah === b.ayah);
        const sameMo = Boolean(a.ibu && b.ibu && a.ibu === b.ibu);
        if (sameFa && sameMo) continue; // full biological siblings -> bloodlines only (Gold)
        const isHalfSibling = (sameFa && !sameMo) || (!sameFa && sameMo);
        const aIsFocusBio = this.blood(focus, a);
        const bIsFocusBio = this.blood(focus, b);
        const aIsStep = this.isStep(focus, a);
        const bIsStep = this.isStep(focus, b);
        const isPureStepPair = (aIsFocusBio && bIsStep) || (bIsFocusBio && aIsStep) || (aIsStep && bIsStep);
        if (isHalfSibling || isPureStepPair) {
          addEdge(a.id, b.id, 'step_sibling', 'Saudara Tiri');
        }
      }
    }

    return { nodes: allNodes, edges };
  }

  // =========================================================================
  // v21 FEATURES: Scriptorium Research, Cultural Assimilation, Health & Illness,
  // Honorifics, Periodic Succession Crisis Check
  // =========================================================================
  public getResearchSpeed(c?: Character): {
    totalPerYear: number;
    cultureBonus: number;
    buildingBonus: number;
    scholarCenters: string[];
  } {
    const p = c || this.me();
    if (!p) return { totalPerYear: 10, cultureBonus: 0, buildingBonus: 0, scholarCenters: [] };
    const ch = this.getCulturalHeritage(p.budaya);
    const kapelan = this.G.pen?.uskup && this.C[this.G.pen.uskup]?.hidup ? this.C[this.G.pen.uskup] : null;
    const kapelanBoost = kapelan ? Math.round((this.effectiveStat(kapelan, 'pembelajaran') * this.officeEfficiency('uskup')) / 2.2) : 0;

    let buildingBonus = 0;
    const scholarCenters: string[] = [];
    this.held(p.id)
      .filter((t) => t.tier <= 3 && !t.titular)
      .forEach((t) => {
        this.provs(t).forEach((v) => {
          if (['maghrebi', 'greek', 'italian', 'irish'].includes(v.culture)) {
            scholarCenters.push(`${v.nama} (${v.culture})`);
          }
          if (v.b.includes('universitas')) buildingBonus += 12;
          if (v.b.includes('percetakan')) buildingBonus += 8;
          if (v.b.includes('gereja')) buildingBonus += 4;
        });
      });
    const centerBonus = Math.min(24, scholarCenters.length * 8);
    const cultureBonus = Math.round((ch.researchBoost || 0) * 20) + centerBonus;
    const bookBonus = Math.min(15, (this.G.books?.length || 0) * 3);
    const base = 12 + Math.round(this.effectiveStat(p, 'pembelajaran') * 0.4) + kapelanBoost + bookBonus;
    return {
      totalPerYear: Math.max(10, base + cultureBonus + buildingBonus),
      cultureBonus,
      buildingBonus,
      scholarCenters,
    };
  }

  public startTechResearch(branch: 'military' | 'economy'): void {
    const p = this.me();
    if (!this.G.tech) this.G.tech = { military: 0, economy: 0, activeProject: null };
    if (this.G.tech.activeProject) {
      return this.msg(`Sedang meneliti "${this.G.tech.activeProject.name}". Tunggu hingga rampung.`);
    }
    const curLevel = this.G.tech[branch] || 0;
    if (curLevel >= 10) return this.msg('Tingkat riset cabang ini sudah mencapai puncak (Lv.10).');
    const cost = 35 + curLevel * 18;
    if (!this.spendStateFunds(cost, p)) {
      return this.msg(`Dana tidak cukup (butuh ${cost} emas untuk naskah & sarjana Skriptorium).`);
    }
    const milNames = [
      'Risalah Formasi Tombak & Perisai',
      'Teknik Metalurgi Baja Tempa',
      'Kajian Mesin Pengepungan & Manjanik',
      'Doktrin Logistik Kavaleri Berat',
      'Kompendium Taktik Benteng Eropa',
    ];
    const ecoNames = [
      'Kitab Pembukuan & Perpajakan Wilayah',
      'Teknik Irigasi & Rotasi Lahan Tiga Musim',
      'Piagam Gilda Saudagar & Wesel Dagang',
      'Risalah Astronomi & Navigasi Pelabuhan',
      'Arsitektur Pasar & Lumbung Negara',
    ];
    const name = `${(branch === 'military' ? milNames : ecoNames)[curLevel % 5]} (Lv.${curLevel + 1})`;
    this.G.tech.activeProject = { branch, name, progress: 0, cost };
    this.msg(`Riset Perpustakaan & Skriptorium dimulai: "${name}" (-${cost} emas).`);
  }

  private techResearchTick(): void {
    const p = this.me();
    if (!this.G.tech?.activeProject) return;
    const proj = this.G.tech.activeProject;
    const spd = this.getResearchSpeed(p);
    proj.progress = Math.min(100, proj.progress + spd.totalPerYear);
    if (proj.progress >= 100) {
      this.G.tech[proj.branch] = Math.min(10, (this.G.tech[proj.branch] || 0) + 1);
      p.res.prestise += 12;
      p.sk.pembelajaran = cl(p.sk.pembelajaran + 1);
      const branchText = proj.branch === 'military' ? 'Teknologi Militer (+8% Kekuatan Tempur)' : 'Teknologi Ekonomi (+6% Efisiensi Pajak)';
      this.notifyLog(`Riset Skriptorium selesai: ${proj.name} — ${branchText}!`, '📚');
      this.G.log.unshift(`Riset Skriptorium tuntas: ${proj.name}! ${branchText}.`);
      this.G.tech.activeProject = null;
    }
  }

  public setProvinceAssimilation(tid: string, provIdx: number, mode: 'integrasi' | 'tekan'): void {
    const p = this.me();
    const t = this.T[tid];
    if (!t || t.pem !== p.id) return this.msg('Bukan wilayah kekuasaanmu.');
    const v = this.provs(t)[provIdx];
    if (!v) return;
    if (v.culture === p.budaya) return this.msg(`${v.nama} sudah memiliki budaya yang sama dengan penguasa.`);
    v.assimilationPolicy = mode;
    if (mode === 'tekan') {
      v.unrest = Math.min(95, (v.unrest || 15) + 10);
      this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 2);
    } else {
      v.unrest = Math.max(0, (v.unrest || 15) - 6);
    }
    this.msg(
      `Kebijakan di ${v.nama} ditetapkan: ${
        mode === 'integrasi'
          ? 'Integrasi Budaya & Otonomi Lokal (-Keresahan, asimilasi damai)'
          : 'Penindasan Budaya Lokal (Asimilasi cepat, risiko pemberontakan naik)'
      }.`
    );
  }

  private assimilationTick(): string[] {
    const out: string[] = [];
    const p = this.me();
    this.held(p.id)
      .filter((t) => t.tier <= 3 && !t.titular)
      .forEach((t) => {
        this.provs(t).forEach((v) => {
          if (v.culture === p.budaya) {
            if (v.unrest && v.unrest > 0) v.unrest = Math.max(0, v.unrest - 8);
            v.assimilationPolicy = null;
            return;
          }
          if (v.assimilationPolicy === 'integrasi') {
            v.unrest = Math.max(0, (v.unrest || 0) - R(6, 12));
            const convChance = 0.1 + this.effectiveStat(p, 'diplomasi') / 350;
            if ((v.unrest || 0) <= 15 && Math.random() < convChance) {
              v.culture = p.budaya;
              v.assimilationPolicy = null;
              v.unrest = 0;
              out.push(`Asimilasi Damai: Penduduk ${v.nama} kini terintegrasi ke budaya ${p.budaya}!`);
            }
          } else if (v.assimilationPolicy === 'tekan') {
            v.unrest = Math.min(100, (v.unrest || 0) + R(4, 10));
            const convChance = 0.22 + this.effectiveStat(p, 'perang') / 260;
            if (Math.random() < convChance) {
              v.culture = p.budaya;
              v.assimilationPolicy = null;
              v.unrest = Math.max(10, (v.unrest || 20) - 25);
              out.push(`Penindasan berhasil: Bangsawan lokal ${v.nama} tunduk pada budaya ${p.budaya}.`);
            } else if ((v.unrest || 0) >= 75 && Math.random() < 0.35) {
              v.unrest = 45;
              this.G.rakyat.bahagia = cl(this.G.rakyat.bahagia - 6);
              for (const k of Object.keys(this.G.tr)) {
                this.G.tr[k] = Math.max(0, Math.round(this.G.tr[k] * 0.94));
              }
              out.push(`PEMBERONTAKAN BUDAYA di ${v.nama}! Pasukan kerajaan menderita korban meredam kerusuhan.`);
              this.notifyLog(`Pemberontakan pasca-penaklukan meletus di ${v.nama}!`, '🔥');
            }
          } else if ((v.unrest || 0) > 0) {
            if ((this.G.rakyat?.bahagia ?? 50) >= 55) v.unrest = Math.max(0, v.unrest! - 2);
            else v.unrest = Math.min(85, v.unrest! + 2);
          }
        });
      });
    return out;
  }

  private healthAndIllnessTick(): string[] {
    const out: string[] = [];
    const p = this.me();
    const isPlague = Boolean(this.G.blackDeath?.active) || Object.keys(this.G.plague || {}).length > 0;
    const isCampaign = Boolean(this.G.warCampaign || this.G.war);

    Object.values(this.C).forEach((c) => {
      if (!c.hidup) return;
      const isKeyChar =
        c.id === p.id ||
        this.kin(p, c) ||
        c.id === p.pasangan ||
        Object.values(this.G.pen || {}).includes(c.id) ||
        this.tierOf(c) >= 4;
      if (!isKeyChar && Math.random() > 0.2) return;

      if (c.health?.illness && ILLNESS_DEFS[c.health.illness]) {
        const def = ILLNESS_DEFS[c.health.illness];
        c.sp.kesehatan = cl(c.sp.kesehatan - def.healthDrain);
        const recChance = 0.28 + c.sp.kesehatan / 250 + (c.id === p.id && this.G.orders?.hospitaller ? 0.1 : 0);
        if (Math.random() < recChance) {
          if (c.id === p.id) out.push(`Kesehatan pulih! Kamu sembuh dari ${def.nama}.`);
          c.health = { illness: null, severity: 0, since: 0 };
        } else if (Math.random() < def.mortalityRisk + (this.umur(c) > 55 ? 0.04 : 0)) {
          const age = this.umur(c);
          if (c.id === p.id) out.push(`Penyakit ${def.nama} merenggut nyawa ${this.full(c)}.`);
          this.die(c, age);
        }
      } else {
        const age = this.umur(c);
        let risk = 0.025 + (age > 45 ? (age - 45) * 0.002 : 0) + (c.sp.kesehatan < 40 ? 0.04 : 0);
        if (isPlague) risk += 0.05;
        if (isCampaign && c.id === p.id) risk += 0.03;
        if (Math.random() < risk) {
          const pool = isPlague
            ? ['wabah_pes', 'demam_musiman', 'radang_paru']
            : isCampaign
              ? ['disentri', 'demam_musiman', 'radang_paru']
              : ['demam_musiman', 'radang_paru', 'asam_urat'];
          const illId = pick(pool);
          const def = ILLNESS_DEFS[illId];
          c.health = { illness: illId, severity: R(1, 3), since: this.G.tahun };
          c.sp.kesehatan = cl(c.sp.kesehatan - def.healthDrain);
          if (c.id === p.id) {
            out.push(`KESEHATAN: Kamu terserang ${def.nama} (${def.desc})`);
            this.notifyLog(`Penguasa terserang ${def.nama}! Segera panggil tabib istana.`, '🩺');
          }
        } else if (c.sp.kesehatan < 75 && Math.random() < 0.25) {
          c.sp.kesehatan = cl(c.sp.kesehatan + 2);
        }
      }
    });
    return out;
  }

  public treatIllness(cid: string): void {
    const p = this.me();
    const c = this.C[cid];
    if (!c || !c.hidup) return this.msg('Tokoh tidak ditemukan.');
    if (this.G.done['heal_' + cid]) return this.msg('Perawatan tabib sudah diberikan tahun ini.');
    const cost = 20;
    if (p.res.emas < cost) return this.msg(`Butuh ${cost} emas untuk memanggil tabib istana.`);
    p.res.emas -= cost;
    this.G.done['heal_' + cid] = 1;
    const healChance = 0.62 + this.effectiveStat(p, 'pembelajaran') / 220;
    if (c.health?.illness && Math.random() < healChance) {
      const illName = ILLNESS_DEFS[c.health.illness]?.nama || c.health.illness;
      c.health = { illness: null, severity: 0, since: 0 };
      c.sp.kesehatan = cl(c.sp.kesehatan + 14);
      return this.msg(`Tabib istana berhasil menyembuhkan ${this.full(c)} dari ${illName}! (+14 Kesehatan).`);
    }
    c.sp.kesehatan = cl(c.sp.kesehatan + 8);
    this.msg(`Tabib memberikan ramuan penguat kepada ${this.full(c)} (+8 Kesehatan).`);
  }

  public grantHonorific(hid: string, cid: string): void {
    const p = this.me();
    if (!this.isRuler(p)) return this.msg('Hanya penguasa berwilayah yang berwenang menganugerahkan Gelar Kehormatan.');
    const hDef = HONORIFICS.find((h) => h.id === hid);
    const target = this.C[cid];
    if (!hDef || !target || !target.hidup || target.id === p.id) {
      return this.msg('Penerima atau gelar kehormatan tidak valid.');
    }
    if (!this.G.honorifics) this.G.honorifics = {};
    if (!this.spendStateFunds(hDef.cost, p)) {
      if (p.res.emas < hDef.cost) {
        return this.msg(`Dana tidak cukup (butuh ${hDef.cost} emas untuk upacara penobatan kehormatan).`);
      }
      p.res.emas = Math.round((p.res.emas - hDef.cost) * 10) / 10;
    }
    Object.keys(this.G.honorifics).forEach((k) => {
      if (this.G.honorifics[k] === cid) delete this.G.honorifics[k];
    });
    const prevId = this.G.honorifics[hid];
    if (prevId && this.C[prevId]?.hidup && prevId !== cid) {
      this.C[prevId].honorific = null;
      this.bump(this.C[prevId], -10);
    }
    this.G.honorifics[hid] = cid;
    target.honorific = hid;
    this.bump(target, 10);
    p.res.prestise += 8;
    this.notifyLog(`Gelar kehormatan "${hDef.nama}" dianugerahkan kepada ${this.full(target)}.`, '🎖️');
    this.msg(`${this.full(target)} dianugerahi gelar ${hDef.nama}! (+${hDef.opBonus} Opini permanen, +${hDef.rulerPrestige} Prestise/th).`);
  }

  public revokeHonorific(hid: string): void {
    if (!this.isRuler(this.me())) return this.msg('Hanya penguasa berwilayah yang berwenang mencabut Gelar Kehormatan.');
    if (!this.G.honorifics?.[hid]) return;
    const cid = this.G.honorifics[hid];
    delete this.G.honorifics[hid];
    const c = this.C[cid];
    if (c) {
      c.honorific = null;
      this.bump(c, -15);
    }
    this.msg('Gelar kehormatan dicabut (-15 Opini).');
  }

  private checkPeriodicSuccessionCrisis(): void {
    const p = this.me();
    if (!p || !p.hidup || this.held(p.id).length === 0 || this.G.successionCrisis || this.G.ev) return;
    if ((this.G.legitimacy ?? 85) < 35 && Math.random() < 0.3) {
      this.triggerSuccessionCrisis(p, 'Legitimasi takhta merosot tajam dan mengundang faksi penuntut takhta');
    }
  }

  // ============ INTIMACY, CHILD NAMING & RULER RELATIONSHIPS (v22) ============
  private ensureRulerRelation(
    cid: string,
    overrideStatus?: RulerRelationStatus,
    trustDelta = 0,
    romanceDelta = 0,
    logNote?: string
  ): RulerRelation {
    if (!this.G.rulerRelations) this.G.rulerRelations = {};
    if (!this.G.rulerRelations[cid]) {
      this.G.rulerRelations[cid] = {
        score: 0,
        status: 'netral',
        romance: 0,
        trust: 0,
        history: [],
      };
    }
    const r = this.G.rulerRelations[cid];
    r.trust = Math.max(-100, Math.min(100, r.trust + trustDelta));
    r.romance = Math.max(0, Math.min(100, r.romance + romanceDelta));
    if (overrideStatus) r.status = overrideStatus;
    else if (r.status !== 'kekasih') {
      const p = this.me();
      const target = this.C[cid];
      const op = target && p ? this.opn(target, p) : 0;
      const isAlly = this.G.al.some((a) => a.id === cid);
      if (this.isRival(cid) && op <= -55) r.status = 'musuh_bebuyutan';
      else if (this.isRival(cid) || op <= -30) r.status = 'rival';
      else if (op < -10 || r.trust < -15) r.status = 'tegang';
      else if (r.romance >= 45) r.status = 'kekasih';
      else if (isAlly && (r.trust >= 35 || op >= 45)) r.status = 'sekutu_akrab';
      else if (this.isFriend(cid) || r.trust >= 30 || op >= 40) r.status = 'sahabat';
      else if (op >= 15 || r.trust >= 12) r.status = 'ramah';
      else r.status = 'netral';
    }
    const p = this.me();
    const target = this.C[cid];
    const opVal = target && p ? this.opn(target, p) : 0;
    r.score = Math.round(opVal * 0.55 + r.trust * 0.35 + r.romance * 0.25);
    if (logNote) {
      r.lastInteractionYear = this.G.tahun;
      r.history.unshift(`Thn ${this.G.tahun}: ${logNote}`);
      if (r.history.length > 10) r.history = r.history.slice(0, 10);
    }
    return r;
  }

  public getRulerRelation(cid: string): {
    score: number;
    status: RulerRelationStatus;
    label: string;
    color: string;
    desc: string;
    romance: number;
    trust: number;
    opinion: number;
    dynRel: number;
    hasAlliance: boolean;
    history: string[];
  } {
    const p = this.me();
    const c = this.C[cid];
    const base = this.ensureRulerRelation(cid);
    const meta = RULER_REL_LABELS[base.status] || RULER_REL_LABELS.netral;
    const opinion = c && p ? Math.round(this.opn(c, p)) : 0;
    const dynRel = p && c ? this.getDynastyRelation(p.dinasti, c.dinasti) : 0;
    const hasAlliance = this.G.al.some((a) => a.id === cid);
    return {
      score: base.score,
      status: base.status,
      label: meta.label,
      color: meta.color,
      desc: meta.desc,
      romance: base.romance,
      trust: base.trust,
      opinion,
      dynRel,
      hasAlliance,
      history: base.history || [],
    };
  }

  public interactRulerRelation(
    cid: string,
    action: 'jamuan' | 'tukar_hadiah' | 'kunjungan' | 'puji_terbuka' | 'romansa' | 'peringatan'
  ): void {
    const p = this.me();
    if (!this.isNoble(p)) return this.msg('Interaksi diplomasi antar-penguasa hanya tersedia bagi kaum Bangsawan.');
    const c = this.C[cid];
    if (!c || !c.hidup || c.id === p.id) return this.msg('Tokoh tidak ditemukan.');
    const cdKey = `rrel_${action}_${cid}`;
    if (this.G.done[cdKey]) return this.msg('Interaksi hubungan ini sudah dilakukan tahun ini.');

    if (action === 'jamuan') {
      if (p.res.emas < 25) return this.msg('Butuh 25 emas untuk menggelar jamuan kehormatan.');
      p.res.emas -= 25;
      this.G.done[cdKey] = 1;
      this.bump(c, 12);
      this.adjustDynastyRelation(p.dinasti, c.dinasti, 10);
      this.ensureRulerRelation(cid, undefined, 15, 0, 'Menggelar jamuan kehormatan bersama');
      return this.msg(`Jamuan kehormatan bersama ${this.full(c)} berjalan hangat! (+12 Opini, +15 Trust, +10 Relasi Dinasti)`);
    }

    if (action === 'tukar_hadiah') {
      if (p.res.emas < 35) return this.msg('Butuh 35 emas untuk mengirim cinderamata bangsawan.');
      p.res.emas -= 35;
      this.G.done[cdKey] = 1;
      this.bump(c, 18);
      this.adjustDynastyRelation(p.dinasti, c.dinasti, 8);
      this.ensureRulerRelation(cid, undefined, 12, 5, 'Mengirim cinderamata diplomatik mewah');
      return this.msg(`Cinderamata bangsawan diterima baik oleh ${this.full(c)} (+18 Opini, +12 Trust, +8 Relasi Dinasti).`);
    }

    if (action === 'kunjungan') {
      if (p.res.emas < 15) return this.msg('Butuh 15 emas untuk bekal kunjungan berburu bersama.');
      p.res.emas -= 15;
      this.G.done[cdKey] = 1;
      this.bump(c, 10);
      p.res.prestise += 5;
      this.ensureRulerRelation(cid, undefined, 12, 0, 'Berburu & audiensi pribadi');
      return this.msg(`Perburuan & audiensi bersama ${this.full(c)} mempererat hubungan (+10 Opini, +12 Trust, +5 Prestise).`);
    }

    if (action === 'puji_terbuka') {
      this.G.done[cdKey] = 1;
      this.bump(c, 8);
      const r = this.ensureRulerRelation(cid, undefined, 8, 0, 'Pernyataan persahabatan terbuka');
      if (r.trust >= 30 && !this.isFriend(cid)) {
        if (!this.G.friends) this.G.friends = [];
        this.G.friends.push(cid);
      }
      return this.msg(`Pernyataan persahabatan terbuka untuk ${this.full(c)} (+8 Opini, +8 Trust).`);
    }

    if (action === 'romansa') {
      if (p.gender === c.gender) return this.msg('Interaksi asmara hanya tersedia untuk lawan jenis.');
      if (this.umur(p) < 16 || this.umur(c) < 16) return this.msg('Kedua tokoh harus berusia minimal 16 tahun.');
      this.G.done[cdKey] = 1;
      const charm = (p.sp.penampilan + this.effectiveStat(p, 'diplomasi')) / 2;
      const gain = charm >= 55 ? R(22, 34) : R(12, 22);
      this.bump(c, 10);
      const r = this.ensureRulerRelation(cid, undefined, 5, gain, 'Pertemuan romantis pribadi');
      if (r.romance >= 45) {
        r.status = 'kekasih';
        return this.msg(`Asmara membara! ${this.full(c)} kini menjadi Kekasihmu (Asmara ${r.romance}/100). Kalian dapat menjalin malam mesra.`);
      }
      return this.msg(`Rayuan & perhatianmu memikat ${this.full(c)} (+${gain} Asmara, kini ${r.romance}/100 · butuh 45 untuk status Kekasih).`);
    }

    // peringatan
    this.G.done[cdKey] = 1;
    this.bump(c, -20);
    p.res.prestise += 6;
    this.adjustDynastyRelation(p.dinasti, c.dinasti, -12);
    this.ensureRulerRelation(cid, undefined, -18, -20, 'Mengirim kecaman diplomatik keras');
    return this.msg(`Kecaman keras dikirim ke ${this.full(c)} (-20 Opini, -18 Trust, +6 Prestise).`);
  }

  public canBeIntimate(cid: string): { ok: boolean; reason?: string; isSpouse: boolean; isLover: boolean } {
    const p = this.me();
    const c = this.C[cid];
    if (!p || !c || !c.hidup || c.id === p.id) {
      return { ok: false, reason: 'Pasangan tidak ditemukan.', isSpouse: false, isLover: false };
    }
    if (p.gender === c.gender) {
      return { ok: false, reason: 'Harus berlawanan jenis kelamin untuk memiliki keturunan.', isSpouse: false, isLover: false };
    }
    if (this.umur(p) < 16 || this.umur(c) < 16) {
      return { ok: false, reason: 'Minimal usia 16 tahun.', isSpouse: false, isLover: false };
    }
    const isSpouse = p.pasangan === cid && p.sn === 'menikah';
    const rel = this.G.rulerRelations?.[cid];
    const isLover = Boolean(rel && (rel.status === 'kekasih' || rel.romance >= 45));
    if (!isSpouse && !isLover) {
      return {
        ok: false,
        reason: 'Harus berstatus menikah atau memiliki hubungan Kekasih (Asmara ≥ 45).',
        isSpouse: false,
        isLover: false,
      };
    }
    const mother = p.gender === 'P' ? p : c;
    if (this.umur(mother) > 45) {
      return { ok: false, reason: `Usia ${this.full(mother)} (${this.umur(mother)} th) sudah melewati batas kesuburan.`, isSpouse, isLover };
    }
    if ((this.G.pregnancies || []).some((pr) => pr.motherId === mother.id)) {
      return { ok: false, reason: `${this.full(mother)} sedang mengandung dan akan melahirkan tahun depan.`, isSpouse, isLover };
    }
    if (this.G.intimacyCooldown?.[cid] === this.G.tahun) {
      return { ok: false, reason: 'Sudah bermesraan tahun ini. Lanjutkan ke Tahun Depan untuk mencoba lagi.', isSpouse, isLover };
    }
    return { ok: true, isSpouse, isLover };
  }

  public getConceptionChance(cid: string): number {
    const p = this.me();
    const c = this.C[cid];
    if (!p || !c || p.gender === c.gender) return 0;
    const mother = p.gender === 'P' ? p : c;
    const father = p.gender === 'L' ? p : c;
    const mAge = this.umur(mother);
    if (mAge < 16 || mAge > 45) return 0;
    const ageFactor = mAge <= 28 ? 1.15 : mAge <= 36 ? 1.0 : 0.72;
    const fert = ((mother.sp.kesuburan + father.sp.kesuburan) / 2) / 60;
    const relBonus = p.pasangan === cid ? 0.1 : 0.05;
    return Math.round(Math.max(15, Math.min(88, (42 * fert * ageFactor + relBonus * 100))));
  }

  public beIntimate(cid: string): void {
    const check = this.canBeIntimate(cid);
    if (!check.ok) return this.msg(check.reason || 'Tidak dapat melakukan interaksi ini.');
    const p = this.me();
    const c = this.C[cid];
    if (!this.G.intimacyCooldown) this.G.intimacyCooldown = {};
    if (!this.G.pregnancies) this.G.pregnancies = [];
    this.G.intimacyCooldown[cid] = this.G.tahun;

    p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 8);
    c.sp.kebahagiaan = cl(c.sp.kebahagiaan + 6);
    this.bump(c, 8);
    this.ensureRulerRelation(cid, undefined, 5, 10, 'Malam mesra bersama');

    const mother = p.gender === 'P' ? p : c;
    const father = p.gender === 'L' ? p : c;
    const chance = this.getConceptionChance(cid);
    if (Math.random() * 100 < chance) {
      const dueYear = this.G.tahun + 1;
      this.G.pregnancies.push({
        motherId: mother.id,
        fatherId: father.id,
        dueYear,
        conceivedYear: this.G.tahun,
        legitimate: check.isSpouse,
      });
      this.G.log.unshift(
        `Kabar gembira! ${this.full(mother)} mengandung anak dari ${this.full(father)} (diperkirakan lahir tahun ${dueYear}).`
      );
      this.notifyLog(`${this.full(mother)} mengandung! Bayi akan lahir tahun ${dueYear}.`, '🤰');
      if (!check.isSpouse) {
        p.res.kesalehan = Math.max(0, p.res.kesalehan - 5);
      }
      if (!this.G.ev) {
        this.triggerPregnancyEvent(mother, father, check.isSpouse, dueYear);
        this.save();
        this.notify();
      } else {
        this.msg(
          `Malam mesra bersama ${this.full(c)} membuahkan kehamilan! (Peluang ${chance}%) — Anak akan lahir pada tahun ${dueYear} dan kamu bisa langsung memberinya nama.`
        );
      }
    } else {
      this.msg(
        `Malam mesra bersama ${this.full(c)} mempererat kasih sayang (+8 Kebahagiaan, +8 Opini), namun belum membuahkan kehamilan tahun ini (peluang ${chance}%).`
      );
    }
  }

  public getNameSuggestions(childId: string, count = 4): string[] {
    const c = this.C[childId];
    if (!c) return ['Alaric', 'Arthur', 'Eleanor', 'Matilda'];
    const out: string[] = [];
    for (let i = 0; i < count * 3 && out.length < count; i++) {
      const nm = this.pickCultureName(c.gender, c.budaya);
      if (!out.includes(nm)) out.push(nm);
    }
    return out;
  }

  public getAncestorNameSuggestions(childId: string): { nama: string; relation: string }[] {
    const c = this.C[childId];
    if (!c) return [];
    const res: { nama: string; relation: string }[] = [];
    const seen = new Set<string>();
    const addCandidate = (ch: Character | null | undefined, relation: string) => {
      if (!ch || ch.gender !== c.gender) return;
      const clean = ch.nama.trim();
      if (!clean || seen.has(clean.toLowerCase())) return;
      seen.add(clean.toLowerCase());
      res.push({ nama: clean, relation });
    };
    const father = c.ayah ? this.C[c.ayah] : null;
    const mother = c.ibu ? this.C[c.ibu] : null;
    addCandidate(father, 'Ayah');
    addCandidate(mother, 'Ibu');
    if (father) {
      addCandidate(father.ayah ? this.C[father.ayah] : null, 'Kakek (Ayah)');
      addCandidate(father.ibu ? this.C[father.ibu] : null, 'Nenek (Ayah)');
    }
    if (mother) {
      addCandidate(mother.ayah ? this.C[mother.ayah] : null, 'Kakek (Ibu)');
      addCandidate(mother.ibu ? this.C[mother.ibu] : null, 'Nenek (Ibu)');
    }
    if (c.dinasti) {
      Object.values(this.C)
        .filter((x) => x.dinasti === c.dinasti && x.id !== c.id && x.gender === c.gender && (this.tierOf(x) >= 3 || !x.hidup))
        .slice(0, 6)
        .forEach((x) => addCandidate(x, 'Leluhur Wangsa'));
    }
    return res.slice(0, 4);
  }

  public getChildRegnalPreview(childId: string, candidateName: string): {
    realmName: string;
    continueLabel: string;
    newNumberLabel: string;
    continueNumber: number;
    hasLineageMatch: boolean;
    lineageReason: string;
  } | null {
    const c = this.C[childId];
    const p = this.me();
    if (!c || !p) return null;
    const pt = this.primaryTitle(p);
    if (!pt) return null;
    const clean = candidateName.trim() || c.nama;
    const stats = this.getRegnalStatsForTitle(pt.id, clean, c.dinasti, c.id);
    const maxPrev = Math.max(stats.maxNumAll, stats.maxNumLineage);
    const continueNumber = maxPrev > 0 ? maxPrev + 1 : 1;
    const hasLineageMatch = maxPrev > 0;
    const lineageReason =
      stats.maxNumAll > 0
        ? `${stats.sameNameAllCount} penguasa sebelumnya di ${pt.nama} bernama ${clean}`
        : stats.maxNumLineage > 0
          ? `Melanjutkan nama leluhur wangsa (${stats.lineageAncestorName || clean})`
          : `Belum ada penguasa bernama ${clean} di ${pt.nama}`;
    return {
      realmName: pt.nama,
      continueLabel: `${clean} ${this.toRoman(continueNumber)}`,
      newNumberLabel: `${clean} I`,
      continueNumber,
      hasLineageMatch,
      lineageReason,
    };
  }

  public nameChild(
    childId: string,
    newName: string,
    ceremony: 'jamuan' | 'berkat' | 'sederhana' = 'sederhana',
    preferredRegnalMode?: 'continue' | 'new_dynasty'
  ): void {
    const c = this.C[childId];
    const p = this.me();
    if (!c) return;
    const clean = newName.trim().slice(0, 40);
    if (!clean) return this.msg('Nama anak tidak boleh kosong.');
    const oldName = c.nama;
    c.nama = clean;
    if (preferredRegnalMode) {
      c.preferredRegnalMode = preferredRegnalMode;
    }

    let ceremonyMsg = '';
    if (this.G.pendingBirthInfo?.[childId]) {
      if (ceremony === 'jamuan') {
        if (p.res.emas >= 15 || this.stateTreasury(p) >= 15) {
          if (!this.spendStateFunds(15, p)) p.res.emas = Math.max(0, p.res.emas - 15);
          p.res.prestise += 12;
          this.G.legitimacy = Math.min(100, (this.G.legitimacy ?? 80) + 5);
          if (p.pasangan && this.C[p.pasangan]?.hidup) this.bump(this.C[p.pasangan], 8);
          ceremonyMsg = ' · Jamuan syukur istana (+12 Prestise, +5 Legitimasi)';
        } else {
          p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 5);
          ceremonyMsg = ' · Syukuran keluarga (+5 Kebahagiaan)';
        }
      } else if (ceremony === 'berkat') {
        if (p.res.emas >= 5) p.res.emas -= 5;
        p.res.kesalehan += 15;
        c.sp.kesehatan = cl(c.sp.kesehatan + 6);
        ceremonyMsg = ' · Diberkati doa rohaniwan (+15 Kesalehan, +6 Kesehatan bayi)';
      } else {
        p.sp.kebahagiaan = cl(p.sp.kebahagiaan + 5);
        ceremonyMsg = ' · Perayaan keluarga (+5 Kebahagiaan)';
      }
      delete this.G.pendingBirthInfo[childId];
    }

    this.G.pendingNaming = (this.G.pendingNaming || []).filter((id) => id !== childId);
    this.G.log.unshift(
      `Anak ${oldName !== clean ? `${oldName} resmi diberi nama` : 'diberi nama'}: ${this.full(c)}${ceremonyMsg}.`
    );
    if (c.dinasti && this.DY[c.dinasti]) {
      this.dynLog(c.dinasti, `Kelahiran & penamaan anak wangsa: ${this.full(c)}`);
    }
    this.msg(`Nama anak resmi ditetapkan sebagai ${this.full(c)}!${ceremonyMsg}`);
  }

  public skipNamingChild(childId: string): void {
    const c = this.C[childId];
    this.G.pendingNaming = (this.G.pendingNaming || []).filter((id) => id !== childId);
    if (this.G.pendingBirthInfo?.[childId]) delete this.G.pendingBirthInfo[childId];
    if (c) this.msg(`Menggunakan nama bawaan: ${this.full(c)}.`);
    else this.notify();
  }

  public openCoronationDialog(titleId?: string): void {
    const p = this.me();
    if (!p) return;
    const t = titleId ? this.T[titleId] : this.primaryTitle(p);
    if (!t || t.pem !== p.id) return this.msg('Kamu belum memegang gelar wilayah untuk diatur nomor regnalnya.');
    const hist = this.G.rulers?.[t.id] || [];
    const last = hist[hist.length - 1];
    this.G.pendingCoronation = {
      charId: p.id,
      titleId: t.id,
      prevDynastyId: last?.dinasti ?? null,
      prevDynastyName: last?.dinasti && this.DY[last.dinasti] ? this.DY[last.dinasti].nama : undefined,
      birthName: p.regnalNames?.[t.id] || p.nama,
      isDifferentDynasty: Boolean(last?.dinasti && p.dinasti && last.dinasti !== p.dinasti),
      preferredMode: p.preferredRegnalMode,
    };
    this.notify();
  }

  public getCoronationPreview(regnalName: string): {
    titleName: string;
    ordinal: number;
    sameNameAllCount: number;
    maxNumLineage: number;
    lineageAncestorName: string | null;
    continueNumber: number;
    newDynastyNumber: number;
    freshOneNumber: number;
    continueLabel: string;
    newDynastyLabel: string;
    freshOneLabel: string;
    isDifferentDynasty: boolean;
    prevDynastyName: string;
  } | null {
    const cor = this.G.pendingCoronation;
    if (!cor) return null;
    const c = this.C[cor.charId];
    const t = this.T[cor.titleId];
    if (!c || !t) return null;
    const cleanName = regnalName.trim() || cor.birthName;
    const stats = this.getRegnalStatsForTitle(t.id, cleanName, c.dinasti, c.id);
    const maxLineage = Math.max(stats.maxNumAll, stats.maxNumLineage);
    const continueNumber = maxLineage > 0 ? maxLineage + 1 : 1;
    const newDynastyNumber = stats.maxNumDyn > 0 ? stats.maxNumDyn + 1 : 1;
    return {
      titleName: t.nama,
      ordinal: stats.ordinalIfCurrent,
      sameNameAllCount: stats.sameNameAllCount,
      maxNumLineage: stats.maxNumLineage,
      lineageAncestorName: stats.lineageAncestorName,
      continueNumber,
      newDynastyNumber,
      freshOneNumber: 1,
      continueLabel: `${cleanName} ${this.toRoman(continueNumber)}`,
      newDynastyLabel: `${cleanName} ${this.toRoman(newDynastyNumber)}`,
      freshOneLabel: `${cleanName} I`,
      isDifferentDynasty: cor.isDifferentDynasty || Boolean(stats.lastDynastyId && c.dinasti && stats.lastDynastyId !== c.dinasti),
      prevDynastyName: cor.prevDynastyName || stats.lastDynastyName,
    };
  }

  public confirmCoronation(regnalName: string, mode: 'continue' | 'new_dynasty' | 'fresh_one'): void {
    const cor = this.G.pendingCoronation;
    if (!cor) return;
    const c = this.C[cor.charId];
    const t = this.T[cor.titleId];
    if (!c || !t) {
      this.G.pendingCoronation = null;
      return this.notify();
    }
    const cleanName = regnalName.trim().slice(0, 40) || cor.birthName;
    const stats = this.getRegnalStatsForTitle(t.id, cleanName, c.dinasti, c.id);
    const maxLineage = Math.max(stats.maxNumAll, stats.maxNumLineage);
    const chosenNum =
      mode === 'fresh_one'
        ? 1
        : mode === 'new_dynasty'
          ? stats.maxNumDyn > 0 ? stats.maxNumDyn + 1 : 1
          : maxLineage > 0 ? maxLineage + 1 : 1;

    c.regnalNames = c.regnalNames || {};
    c.regnalNumbers = c.regnalNumbers || {};
    c.regnalForced = c.regnalForced || {};
    this.held(c.id).forEach((ht) => {
      c.regnalNames![ht.id] = cleanName;
      c.regnalNumbers![ht.id] = chosenNum;
      c.regnalForced![ht.id] = chosenNum > 1 || mode === 'new_dynasty' || mode === 'fresh_one' || stats.sameNameAllCount > 0;
    });
    this.G.pendingCoronation = null;
    const info = this.getTitleOrdinalInfo(c, t);
    const modeDesc =
      mode === 'fresh_one'
        ? 'memulai nomor regnal baru (I)'
        : mode === 'new_dynasty'
          ? 'memulai/mengikuti urutan dinasti saat ini'
          : 'melanjutkan urutan silsilah sebelumnya';
    this.G.log.unshift(
      `Penobatan! ${this.full(c)} resmi bertahta sebagai ${info?.label || t.nama} (${modeDesc}).`
    );
    this.notifyLog(`Penobatan: ${this.full(c)} (${info?.label || t.nama})`, '👑');
    this.msg(`Selamat bertahta, ${this.full(c)} (${info?.label || t.nama})!`);
  }

  public skipCoronation(): void {
    const cor = this.G.pendingCoronation;
    if (cor) {
      this.confirmCoronation(cor.birthName, cor.preferredMode || 'continue');
    } else {
      this.G.pendingCoronation = null;
      this.notify();
    }
  }

  // ============ CREATE & GRANT NOBLE TITLES (LANDED OR TITULAR) ============
  public getCreatableTitleRanks(ruler?: Character): {
    id: string;
    tier: number;
    marquis: boolean;
    nama: string;
    prefix: string;
    gold: number;
    prestigeReward: number;
    minCreatorTier: number;
  }[] {
    const r = ruler || this.me();
    const myTier = this.tierOf(r);
    const all = [
      { id: 'king', tier: 6, marquis: false, nama: 'Raja / Ratu (King)', prefix: 'Kerajaan', gold: 250, prestigeReward: 40, minCreatorTier: 7 },
      { id: 'duke', tier: 5, marquis: false, nama: 'Adipati / Duke', prefix: 'Kadipaten', gold: 150, prestigeReward: 25, minCreatorTier: 6 },
      { id: 'marquis', tier: 4, marquis: true, nama: 'Marquis (Perbatasan)', prefix: 'Mark', gold: 120, prestigeReward: 20, minCreatorTier: 5 },
      { id: 'count', tier: 3, marquis: false, nama: 'Count / Earl', prefix: 'Wilayah', gold: 80, prestigeReward: 15, minCreatorTier: 4 },
      { id: 'viscount', tier: 2, marquis: false, nama: 'Viscount', prefix: 'Viscount', gold: 50, prestigeReward: 10, minCreatorTier: 3 },
      { id: 'baron', tier: 1, marquis: false, nama: 'Baron', prefix: 'Baron', gold: 30, prestigeReward: 6, minCreatorTier: 2 },
      { id: 'knight', tier: 0, marquis: false, nama: 'Ksatria (Knight · Sir / Dame)', prefix: 'Ksatria', gold: 15, prestigeReward: 4, minCreatorTier: 1 },
    ];
    return all.filter((x) => myTier >= x.minCreatorTier);
  }

  private candCache: Character[] | null = null;

  public getTitleCreationCandidates(): Character[] {
    // PERF: hasil di-cache sampai ada perubahan state (notify). Mengetik nama gelar tidak memanggil notify.
    if (this.candCache) return this.candCache;
    const result = this.withHeldMemo(() => {
      const p = this.me();
      const myRealm = this.realmOf(p).id;
      const scored: { c: Character; score: number }[] = [];
      for (const id in this.C) {
        const c = this.C[id];
        if (!c.hidup || c.id === p.id || c.id === 'paus') continue;
        const score =
          (p.anak.includes(c.id) ? 40 : 0) +
          (p.pasangan === c.id ? 35 : 0) +
          (c.dinasti === p.dinasti ? 25 : 0) +
          (this.realmOf(c).id === myRealm ? 15 : 0) +
          this.tierOf(c) * 3;
        scored.push({ c, score });
      }
      scored.sort((a, b) => b.score - a.score || b.c.res.prestise - a.c.res.prestise);
      return scored.slice(0, 60).map((x) => x.c);
    });
    this.candCache = result;
    return result;
  }

  public createAndGrantTitle(opts: {
    rankId: string;
    titleName: string;
    recipientId: string;
    attachLandId?: string | null;
  }): void {
    const p = this.me();
    const myTier = this.tierOf(p);
    const ranks = this.getCreatableTitleRanks(p);
    const rank = ranks.find((r) => r.id === opts.rankId);
    if (!rank || myTier < rank.minCreatorTier) {
      return this.msg('Pangkatmu belum cukup tinggi untuk menciptakan gelar tingkatan ini.');
    }

    const recipient = this.C[opts.recipientId];
    if (!recipient || !recipient.hidup) {
      return this.msg('Penerima gelar tidak ditemukan atau sudah wafat.');
    }

    const totalAvailGold = this.stateTreasury(p) + p.res.emas;
    if (totalAvailGold < rank.gold) {
      return this.msg(`Dana tidak cukup (butuh ${rank.gold} emas dari Kas Wilayah/Pribadi).`);
    }

    const cleanBase = opts.titleName.trim().slice(0, 48);
    if (!cleanBase) {
      return this.msg('Masukkan nama gelar baru terlebih dahulu.');
    }

    // Deduct cost from state treasury first, then personal gold if needed
    const stateAvail = this.stateTreasury(p);
    if (stateAvail >= rank.gold) {
      this.spendStateFunds(rank.gold, p);
    } else {
      if (stateAvail > 0) this.spendStateFunds(stateAvail, p);
      p.res.emas = Math.max(0, p.res.emas - (rank.gold - stateAvail));
    }

    const myPrimary = this.primaryTitle(p);
    const attachId = opts.attachLandId ? opts.attachLandId.trim() : '';
    const attachTitle = attachId ? this.T[attachId] : null;
    const myCounties = this.held(p.id).filter((t) => !t.titular && t.tier <= 3);

    const formattedName =
      cleanBase.toLowerCase().startsWith(rank.prefix.toLowerCase()) ||
      /^(kerajaan|kadipaten|mark|wilayah|county|baron|viscount|ksatria|sir|dame)/i.test(cleanBase)
        ? cleanBase
        : `${rank.prefix} ${cleanBase}`;

    const isLanded = Boolean(attachTitle && rank.id !== 'knight');
    let createdTitleId = '';

    if (rank.id === 'knight') {
      if (!['penguasa', 'bangsawan'].includes(recipient.kelas) || this.tierOf(recipient) === 0) {
        recipient.kelas = 'ksatria';
      }
      if (!recipient.gp) {
        recipient.gp = recipient.gender === 'P' ? 'Dame' : 'Sir';
      }
      const tid = 'kt_' + ++this.G.n;
      this.T[tid] = {
        id: tid,
        nama: formattedName,
        tier: 0,
        pem: recipient.id,
        atas: attachTitle ? attachTitle.id : myPrimary?.id || null,
        budaya: p.budaya,
        agama: p.agama,
        prov: null,
        kids: [],
        titular: true,
        kas: 0,
      };
      if (attachTitle) attachTitle.kids.push(tid);
      else if (myPrimary) myPrimary.kids.push(tid);
      recipient.sp.duel = cl(recipient.sp.duel + 6);
      recipient.res.prestise += 20;
      this.bump(recipient, 35);
      createdTitleId = tid;
    } else if (!isLanded) {
      // Pure Titular Title (tanpa wilayah)
      const tid = 'ct_' + ++this.G.n;
      this.T[tid] = {
        id: tid,
        nama: formattedName,
        tier: rank.tier,
        marquis: rank.marquis,
        pem: recipient.id,
        atas: myPrimary?.id || null,
        budaya: p.budaya,
        agama: p.agama,
        prov: null,
        kids: [],
        titular: true,
        kas: 0,
      };
      if (myPrimary) myPrimary.kids.push(tid);
      createdTitleId = tid;
    } else if (attachTitle) {
      if (rank.tier <= 2) {
        // Baron or Viscount under a held County
        const tid = (rank.tier === 2 ? 'vt_' : 'bt_') + ++this.G.n;
        this.T[tid] = {
          id: tid,
          nama: formattedName,
          tier: rank.tier,
          pem: recipient.id,
          atas: attachTitle.id,
          budaya: attachTitle.budaya,
          agama: attachTitle.agama,
          prov: null,
          kids: [],
          kas: this.initTitleKas(rank.tier, false),
        };
        attachTitle.kids.push(tid);
        createdTitleId = tid;
      } else if (rank.tier === 3) {
        // Grant a held County (only if player keeps at least 1 landed title or holds a higher seat)
        if (attachTitle.pem === p.id && this.held(p.id).filter((t) => !t.titular).length <= 1) {
          p.res.emas += rank.gold;
          return this.msg('Kamu harus tetap memegang minimal 1 gelar berwilayah untuk dirimu sendiri.');
        }
        attachTitle.pem = recipient.id;
        attachTitle.nama = formattedName;
        if (myPrimary && attachTitle.atas !== myPrimary.id) {
          const prevParent = attachTitle.atas ? this.T[attachTitle.atas] : null;
          if (prevParent) prevParent.kids = prevParent.kids.filter((k) => k !== attachTitle.id);
          attachTitle.atas = myPrimary.id;
          if (!myPrimary.kids.includes(attachTitle.id)) myPrimary.kids.push(attachTitle.id);
        }
        createdTitleId = attachTitle.id;
      } else {
        // Create Duke / Marquis / King over an attached lower title
        const canDetach = !(attachTitle.pem === p.id && myCounties.length <= 1 && this.held(p.id).filter((t) => !t.titular).length <= 1);
        const tid = 'ct_' + ++this.G.n;
        const oldParent = attachTitle.atas ? this.T[attachTitle.atas] : null;
        if (oldParent) oldParent.kids = oldParent.kids.filter((k) => k !== attachTitle.id);
        this.T[tid] = {
          id: tid,
          nama: formattedName,
          tier: rank.tier,
          marquis: rank.marquis,
          pem: recipient.id,
          atas: myPrimary?.id || null,
          budaya: attachTitle.budaya || p.budaya,
          agama: attachTitle.agama || p.agama,
          prov: null,
          kids: [attachTitle.id],
          kas: this.initTitleKas(rank.tier, rank.marquis),
        };
        if (myPrimary) myPrimary.kids.push(tid);
        attachTitle.atas = tid;
        if (attachTitle.pem === p.id && canDetach && myCounties.length > 1) {
          attachTitle.pem = recipient.id;
        }
        createdTitleId = tid;
      }
    }

    if (rank.tier >= 1) {
      recipient.kelas = rank.tier >= 4 ? 'penguasa' : 'bangsawan';
      if (recipient.dinasti && this.DY[recipient.dinasti]) {
        const dy = this.DY[recipient.dinasti];
        dy.prestise += rank.tier * 8;
        if (dy.status === 'rakyat_biasa') dy.status = 'bangsawan_lokal';
        if (rank.tier >= 4 && dy.status === 'bangsawan_lokal') dy.status = 'bangsawan_tinggi';
        if (rank.tier >= 6) dy.status = 'dinasti_kerajaan';
      }
      recipient.res.prestise += rank.tier * 15;
      this.bump(recipient, 35 + rank.tier * 8);
    }

    p.res.prestise += rank.prestigeReward;
    this.G.legitimacy = Math.min(100, (this.G.legitimacy ?? 85) + 2);
    const kindDesc = rank.id === 'knight'
      ? 'gelar Ksatria'
      : isLanded
        ? `gelar berwilayah (${attachTitle?.nama})`
        : 'gelar tituler (tanpa wilayah)';
    this.G.log.unshift(`${this.full(p)} menganugerahkan ${kindDesc} "${this.T[createdTitleId]?.nama || formattedName}" kepada ${this.full(recipient)}.`);
    this.notifyLog(`Menganugerahkan ${formattedName} kepada ${this.full(recipient)}`, '🎖️');
    this.dynLog(p.dinasti, `${this.full(p)} menciptakan gelar ${formattedName} untuk ${this.full(recipient)}`);
    this.msg(`Gelar "${this.T[createdTitleId]?.nama || formattedName}" resmi dianugerahkan kepada ${this.full(recipient)}!`);
  }
}

export const engine = new GameEngine();
