import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Shuffle, Play, RotateCcw, BookOpen, FolderOpen, Trash2 } from 'lucide-react';
import { MEDIA } from '../assets/media';
import { BACKGROUNDS, engine } from '../engine/gameEngine';
import { LocalSaveSlot } from '../utils/localSaveDb';
import { GameImage } from './GameImage';

export const StartScreen: React.FC = () => {
  const pm = engine.D.pengaturan_mulai || {};
  const peranAwal = pm.peran_awal || [];
  const karakterList = engine.D.karakter || [];
  const sifatList = engine.D.sifat || [];
  const budayaList = engine.D.budaya || [];
  const agamaList = (engine.D.agama || []).filter((a: { id: string }) => !a.id.includes('sekte'));
  const profesiList = engine.D.profesi || [];
  const realmGroups = useMemo(() => engine.realmChoices(), []);
  const counties = useMemo(
    () =>
      Object.values(engine.T)
        .filter((t) => t.tier === 3)
        .sort((a, b) => a.nama.localeCompare(b.nama)),
    []
  );

  const [pr, setPr] = useState<string>(peranAwal[0]?.id || 'king');
  const [tk, setTk] = useState<string>('henry4');
  const [tokohFilter, setTokohFilter] = useState<'semua' | 'baron_viscount' | 'janda' | 'fiksi' | 'penguasa'>('semua');
  const [nm, setNm] = useState<string>('Konrad');
  const [dn, setDn] = useState<string>('Hohenstein');
  const [gn, setGn] = useState<'L' | 'P'>('L');
  const [bd, setBd] = useState<string>(budayaList[0]?.id || 'german');
  const [ag, setAg] = useState<string>(agamaList[0]?.id || 'katolik');
  const [bg, setBg] = useState<string>('noble');
  const [lawSuccession, setLawSuccession] = useState<string>('primogenitur');
  const [lawGender, setLawGender] = useState<string>('agnatik_kognatik');
  const [s1, setS1] = useState<string>(sifatList[0]?.id || '');
  const [s2, setS2] = useState<string>(sifatList[1]?.id || '');
  const [pf, setPf] = useState<string>(profesiList[0]?.id || 'petani');
  const [realmId, setRealmId] = useState<string>(realmGroups[0]?.id || '');
  const [lc, setLc] = useState<string>(realmGroups[0]?.counties[0]?.id || counties[0]?.id || '');
  const [dataStatus, setDataStatus] = useState<string | null>(null);
  const [localSlots, setLocalSlots] = useState<LocalSaveSlot[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void engine.listLocalSaves().then(setLocalSlots);
  }, []);

  const allTokoh = useMemo(() => engine.prepareTokohChoices(), []);

  const selectedRealm = useMemo(
    () => realmGroups.find((g) => g.id === realmId) || realmGroups[0],
    [realmGroups, realmId]
  );
  const realmCounties = selectedRealm?.counties || counties;

  const subRegionOptions = useMemo(() => {
    if (!selectedRealm) {
      return counties.map((t) => ({ id: t.id, label: `${t.nama} (${t.budaya})` }));
    }
    if (pr === 'duke') {
      if (selectedRealm.duchies.length > 0) {
        return selectedRealm.duchies.map((t) => ({
          id: t.id,
          label: `${t.nama} (${t.kids.length} county · ${t.agama || selectedRealm.agama} · ${t.budaya})`,
        }));
      }
      return realmCounties.map((t) => ({
        id: `__new_duke__${t.id}`,
        label: `Kadipaten ${t.nama.replace(/^Wilayah\s+/, '')} (Kadipaten Baru di ${selectedRealm.nama})`,
      }));
    }
    if (pr === 'marquis') {
      if (selectedRealm.marquises.length > 0) {
        return selectedRealm.marquises.map((t) => ({
          id: t.id,
          label: `${t.nama} (${t.tier === 4 ? 'Mark Tier 4' : 'Marquis Perbatasan'} · ${t.kids.length} county · ${t.budaya})`,
        }));
      }
      return realmCounties.map((t) => ({
        id: `__new_marquis__${t.id}`,
        label: `Mark ${t.nama.replace(/^Wilayah\s+/, '')} (Wilayah Marquis Baru di ${selectedRealm.nama})`,
      }));
    }
    if (pr === 'baron' || pr === 'viscount') {
      const rankLabel = pr === 'baron' ? 'Baron' : 'Viscount';
      return realmCounties.map((t) => {
        const parent = t.atas ? engine.T[t.atas] : null;
        return {
          id: t.id,
          label: `${rankLabel} di bawah ${t.nama}${parent ? ` (${parent.nama})` : ''}`,
        };
      });
    }
    return realmCounties.map((t) => {
      const parent = t.atas ? engine.T[t.atas] : null;
      return {
        id: t.id,
        label: `${t.nama}${pr === 'count' && parent ? ` · di bawah ${parent.nama}` : ''} (${t.agama || selectedRealm.agama} · ${t.budaya})`,
      };
    });
  }, [selectedRealm, realmCounties, counties, pr]);

  useEffect(() => {
    if (subRegionOptions.length > 0 && !subRegionOptions.some((o) => o.id === lc)) {
      setLc(subRegionOptions[0].id);
    }
  }, [subRegionOptions, lc]);

  const isMonarch = pr === 'king' || pr === 'emperor' || pr === 'tokoh';
  const kingOptions = useMemo(() => {
    if (pr === 'tokoh') {
      return allTokoh.filter((c) => {
        const tier = engine.tierOf(c);
        if (tokohFilter === 'baron_viscount') return tier === 1 || tier === 2;
        if (tokohFilter === 'janda') return c.sn === 'janda' || c.sn === 'duda';
        if (tokohFilter === 'fiksi') return !karakterList.some((k: { id: string }) => k.id === c.id);
        if (tokohFilter === 'penguasa') return tier >= 3;
        return true;
      });
    }
    return karakterList.filter((k: { id: string; kelas?: string; asal_sejarah?: string }) => {
      if (k.id === 'paus') return false;
      const cObj = engine.C[k.id];
      if (cObj && !cObj.hidup) return false;
      const topTier = cObj ? engine.tierOf(cObj) : 0;
      if (pr === 'emperor') {
        return topTier >= 7 || k.id === 'henry4' || k.id === 'constantine_x';
      }
      return k.asal_sejarah === 'sejarah' && (topTier >= 5 || k.kelas === 'penguasa' || k.id === 'el_cid');
    });
  }, [karakterList, allTokoh, pr, tokohFilter]);

  useEffect(() => {
    if (isMonarch && kingOptions.length > 0 && !kingOptions.some((k: { id: string }) => k.id === tk)) {
      setTk(kingOptions[0].id);
    }
  }, [isMonarch, kingOptions, tk]);

  const selectedKing = useMemo(() => {
    const raw = kingOptions.find((k: { id: string }) => k.id === tk) || kingOptions[0];
    if (!raw) return null;
    if (pr === 'tokoh') {
      const cObj = raw as ReturnType<typeof engine.me>;
      return {
        id: cObj.id,
        nama: engine.full(cObj),
        budaya: cObj.budaya,
        agama: cObj.agama,
        asal_sejarah: karakterList.some((k: { id: string }) => k.id === cObj.id) ? 'sejarah' : 'fiksi',
        catatan_sejarah: `${engine.tTitle(cObj)} · Usia ${engine.umur(cObj)} th · Status: ${cObj.sn.replace(/_/g, ' ')} · Kelas: ${cObj.kelas.replace(/_/g, ' ')}${
          engine.held(cObj.id)[0] ? ` · Wilayah: ${engine.held(cObj.id)[0].nama}` : ''
        }`,
      };
    }
    return raw;
  }, [kingOptions, tk, pr, karakterList]);

  const handleRealmChange = (newRealmId: string) => {
    setRealmId(newRealmId);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    engine.startNewGame({
      pr: pr === 'custom' ? 'bangsawan' : pr,
      nm: nm.trim() || 'Konrad',
      dn: dn.trim() || 'Hohenstein',
      gn,
      bd,
      ag,
      s1,
      s2,
      pf,
      lc,
      tk,
      bg,
      lawSuccession,
      lawGender,
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const msg = await engine.loadCustomJsonFiles(e.target.files);
    setDataStatus(msg);
  };

  const handleImportSaveFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await engine.importSaveFile(file);
    if (!ok) {
      setDataStatus('File save .json tidak valid.');
    }
    e.target.value = '';
  };

  const hasCustom = (() => {
    try {
      return Boolean(localStorage.getItem('k1066custom'));
    } catch {
      return false;
    }
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-lg overflow-hidden border border-[#DDD6C3] bg-[#1C1917] shadow-sm">
        <div className="h-52 sm:h-64 w-full">
          <GameImage
            src={MEDIA.heroCastle}
            alt="Benteng Kerajaan Abad Pertengahan Eropa"
            fallbackTitle="Kerajaan 1066"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-medium tracking-wider text-[#E8C57B] uppercase mb-1">
              Kronik Eropa · Tahun {engine.D.meta.tahun_mulai}–1600
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
              Kerajaan 1066
            </h1>
            <p className="text-xs sm:text-sm text-[#E7E5E4] mt-1.5 leading-relaxed">
              Bangun dinasti, kelola wilayah feodal, pimpin ekspedisi militer, dan arahkan takdir
              politik Eropa dari abad ke-11 hingga era Reformasi dan Renaisans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {engine.hasSave() && (
              <button
                type="button"
                onClick={() => engine.loadSave()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1C1917] bg-[#F6F4EC] hover:bg-white rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                Lanjutkan Save
              </button>
            )}
            <button
              type="button"
              onClick={() => engine.startRandomWorld()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4" />
              Dunia Acak
            </button>
          </div>
        </div>
      </div>

      {/* Main Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleStart}
          className="lg:col-span-2 bg-white border border-[#DDD6C3] rounded-lg overflow-hidden shadow-xs"
        >
          <div className="px-5 py-3.5 bg-[#ECE7D8] border-b border-[#DDD6C3] flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#1C1917]">
              Mulai Kronik Baru
            </h2>
            <span className="text-xs font-num text-[#57534E]">
              Mulai Thn {engine.D.meta.tahun_mulai}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                Peran Awal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {peranAwal.map((role: { id: string; nama: string; ket?: string }) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setPr(role.id)}
                    className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                      pr === role.id
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C] hover:bg-[#F2EDE0]'
                    }`}
                  >
                    <div className="text-xs font-bold">{role.nama}</div>
                    {role.ket && (
                      <div className="text-[11px] text-[#57534E] mt-0.5 line-clamp-2">{role.ket}</div>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPr('tokoh')}
                  className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                    pr === 'tokoh'
                      ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                      : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C] hover:bg-[#F2EDE0]'
                  }`}
                >
                  <div className="text-xs font-bold">Pilih Semua Tokoh (Fiksi, Janda, Baron, Viscount)</div>
                  <div className="text-[11px] text-[#57534E] mt-0.5">
                    Mainkan tokoh fiksi maupun sejarah dari segala usia, status janda/lajang, Baron hingga Viscount
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPr('custom')}
                  className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                    pr === 'custom'
                      ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                      : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C] hover:bg-[#F2EDE0]'
                  }`}
                >
                  <div className="text-xs font-bold">Penguasa Kustom</div>
                  <div className="text-[11px] text-[#57534E] mt-0.5">
                    Ciptakan tokoh &amp; wangsa baru di wilayah pilihanmu
                  </div>
                </button>
              </div>
            </div>

            {isMonarch ? (
              <div className="space-y-3">
                {pr === 'tokoh' && (
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['semua', `Semua (${allTokoh.length})`],
                        ['baron_viscount', 'Baron & Viscount'],
                        ['janda', 'Janda / Duda'],
                        ['fiksi', 'Tokoh Fiksi & Rakyat'],
                        ['penguasa', 'Raja, Duke & Count'],
                      ] as const
                    ).map(([fid, label]) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => setTokohFilter(fid)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                          tokohFilter === fid
                            ? 'bg-[#9A6614] text-white border-[#9A6614]'
                            : 'bg-[#FAF8F2] text-[#44403C] border-[#D6CFC0] hover:bg-[#F2EDE0]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      {pr === 'tokoh'
                        ? `Pilih Tokoh (${kingOptions.length} tersedia)`
                        : `Pilih Tokoh Sejarah (${pr === 'emperor' ? 'Kaisar' : 'Raja & Penguasa 1066'})`}
                    </label>
                    <select
                      value={tk}
                      onChange={(e) => setTk(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {kingOptions.map((item: { id: string; nama: string; budaya: string; agama: string }) => {
                        const cObj = engine.C[item.id];
                        const held = cObj ? engine.held(cObj.id).sort((a, b) => b.tier - a.tier)[0]?.nama : '';
                        const extra =
                          pr === 'tokoh' && cObj
                            ? ` · ${engine.tTitle(cObj)} · ${engine.umur(cObj)}th · ${cObj.sn}`
                            : held
                              ? ` — ${held}`
                              : '';
                        return (
                          <option key={item.id} value={item.id}>
                            {cObj ? engine.full(cObj) : item.nama}
                            {extra} ({item.agama})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Latar Belakang Tokoh
                    </label>
                    <select
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {Object.entries(BACKGROUNDS).map(([id, b]) => (
                        <option key={id} value={id}>
                          {b.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedKing && (() => {
                  const selObj = engine.C[selectedKing.id];
                  const selIdInfo = selObj ? engine.describeCharacterIdentity(selObj) : null;
                  const selPrimary = selObj ? engine.primaryTitle(selObj) : null;
                  const selHist = selPrimary ? engine.getTitleSuccessionHistory(selPrimary.id) : null;
                  const recentPrev = selHist ? selHist.entries.filter((e) => !e.isCurrent).slice(-3) : [];
                  return (
                    <div className="p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded-md text-xs text-[#44403C] space-y-1">
                      <div>
                        <span className="font-semibold text-[#1C1917]">
                          {selectedKing.asal_sejarah === 'sejarah' ? 'Tokoh Sejarah Asli (1066)' : 'Tokoh Dunia / Fiksi'}:
                        </span>{' '}
                        {selectedKing.catatan_sejarah || `${selectedKing.nama} (${selectedKing.budaya} · ${selectedKing.agama}).`}
                      </div>
                      {selIdInfo && (
                        <div className="text-[11px] font-medium text-[#78350F]">
                          Kedudukan 1066: {selIdInfo.ordinalLabel}
                        </div>
                      )}
                      {recentPrev.length > 0 && (
                        <div className="text-[11px] text-[#57534E]">
                          Pendahulu langsung:{' '}
                          {recentPrev.map((e) => `${e.order}. ${e.displayName} (${e.dari}–${e.sampai})`).join(' → ')}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#44403C]">
                        Nama Depan
                      </label>
                      <button
                        type="button"
                        onClick={() => setNm(engine.pickCultureName(gn, bd))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A6614] hover:underline cursor-pointer"
                        title="Acak nama depan sesuai budaya & gender"
                      >
                        <Shuffle className="w-3 h-3" />
                        Acak
                      </button>
                    </div>
                    <input
                      type="text"
                      value={nm}
                      onChange={(e) => setNm(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#44403C]">
                        Nama Dinasti
                      </label>
                      <button
                        type="button"
                        onClick={() => setDn(engine.pickCultureDynastyName(bd))}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#9A6614] hover:underline cursor-pointer"
                        title="Acak nama dinasti sesuai budaya"
                      >
                        <Shuffle className="w-3 h-3" />
                        Acak
                      </button>
                    </div>
                    <input
                      type="text"
                      value={dn}
                      onChange={(e) => setDn(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Gender
                    </label>
                    <select
                      value={gn}
                      onChange={(e) => setGn(e.target.value as 'L' | 'P')}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Budaya
                    </label>
                    <select
                      value={bd}
                      onChange={(e) => setBd(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {budayaList.map((b: { id: string; nama: string }) => (
                        <option key={b.id} value={b.id}>
                          {b.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Agama
                    </label>
                    <select
                      value={ag}
                      onChange={(e) => setAg(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {agamaList.map((a: { id: string; nama: string }) => (
                        <option key={a.id} value={a.id}>
                          {a.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Two-step Kingdom -> Sub-region Picker */}
                <div className="p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded-md space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#44403C] mb-1">
                        Pilih Kerajaan / Negara Tersedia
                      </label>
                      <select
                        value={selectedRealm?.id || ''}
                        onChange={(e) => handleRealmChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6CFC0] rounded-md text-[#1C1917]"
                      >
                        {realmGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.nama} ({g.agama} · {g.duchies.length} kadipaten · {g.marquises.length} mark · {g.counties.length} county)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#44403C] mb-1">
                        {pr === 'duke'
                          ? 'Pilih Kadipaten / Wilayah Duke'
                          : pr === 'marquis'
                            ? 'Pilih Mark / Wilayah Marquis'
                            : pr === 'baron' || pr === 'viscount'
                              ? `Pilih Wilayah Count Induk (Di Bawah Gelar Count)`
                              : pr === 'count'
                                ? 'Pilih Wilayah Count (County)'
                                : 'Pilih Sub-Wilayah di Kerajaan Tersebut'}
                      </label>
                      <select
                        value={lc}
                        onChange={(e) => setLc(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#D6CFC0] rounded-md text-[#1C1917]"
                      >
                        {subRegionOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {(pr === 'baron' || pr === 'viscount') && (
                    <div className="text-[11px] text-[#78350F]">
                      Gelar {pr === 'baron' ? 'Baron (Tier 1)' : 'Viscount (Tier 2)'} diwakili melalui wilayah Count dan berkedudukan sebagai bawahan langsung di bawah gelar Count wilayah tersebut.
                    </div>
                  )}
                  {(pr === 'duke' || pr === 'marquis') && (
                    <div className="text-[11px] text-[#78350F]">
                      {pr === 'duke'
                        ? 'Memilih Duke memberimu gelar Kadipaten penuh beserta wilayah Count di bawahnya.'
                        : 'Memilih Marquis memberimu gelar Mark Perbatasan beserta penguasaan wilayah perbatasan terkait.'}
                    </div>
                  )}
                  {selectedRealm?.statusNote && (
                    <div className="text-[11px] text-[#57534E]">
                      Catatan Sejarah 1066: {selectedRealm.statusNote}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Sifat Pertama
                    </label>
                    <select
                      value={s1}
                      onChange={(e) => setS1(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {sifatList.map((s: { id: string; nama: string }) => (
                        <option key={s.id} value={s.id}>
                          {s.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Sifat Kedua
                    </label>
                    <select
                      value={s2}
                      onChange={(e) => setS2(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {sifatList.map((s: { id: string; nama: string }) => (
                        <option key={s.id} value={s.id}>
                          {s.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Latar Belakang
                    </label>
                    <select
                      value={bg}
                      onChange={(e) => setBg(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {Object.entries(BACKGROUNDS).map(([id, b]) => (
                        <option key={id} value={id}>
                          {b.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {pr === 'rakyat_jelata' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#44403C] mb-1">
                      Profesi Awal (Rakyat Non-Bangsawan)
                    </label>
                    <select
                      value={pf}
                      onChange={(e) => setPf(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F2] border border-[#D6CFC0] rounded-md text-[#1C1917]"
                    >
                      {profesiList.map((f: { id: string; nama: string }) => {
                        const rest = engine.checkProfessionRestriction(
                          f.id,
                          { kelas: 'rakyat_jelata', agama: ag, loc: lc } as never,
                          lc
                        );
                        return (
                          <option key={f.id} value={f.id} disabled={!rest.ok}>
                            {f.nama}
                            {!rest.ok ? ' [Dibatasi]' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-[#57534E]">
                      Rakyat jelata memulai permainan di gubuk sederhana bersama keluarga/pasangan dari kalangan rakyat jelata pula; profesi Pengusaha penuh &amp; jabatan tinggi istana dikunci hingga naik status, sementara pemeluk Islam di wilayah Kristen dibatasi dari prajurit reguler &amp; juru tulis istana Kristen.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded-md space-y-2">
              <div className="text-xs font-semibold text-[#1C1917]">
                Sistem Pewarisan &amp; Hukum Suksesi Awal
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#44403C] mb-1">
                    Hukum Suksesi Wilayah
                  </label>
                  <select
                    value={lawSuccession}
                    onChange={(e) => setLawSuccession(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC0] rounded-md text-[#1C1917]"
                  >
                    {[
                      'primogenitur',
                      'ultimogenitur',
                      'terbagi',
                      'tanistri',
                      'senioritas',
                      'pemilihan',
                      'tunjukan',
                    ].map((id) => (
                      <option key={id} value={id}>
                        {engine.successionLawLabel(id).nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#44403C] mb-1">
                    Aturan Gender Pewaris
                  </label>
                  <select
                    value={lawGender}
                    onChange={(e) => setLawGender(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC0] rounded-md text-[#1C1917]"
                  >
                    {['agnatik_kognatik', 'agnatik', 'kesetaraan'].map((id) => (
                      <option key={id} value={id}>
                        {engine.successionLawLabel(id).nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-[#57534E]">
                {engine.successionLawLabel(lawSuccession).desc}
              </p>
            </div>

            {BACKGROUNDS[bg] && (
              <div className="p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded-md text-xs text-[#57534E]">
                <span className="font-semibold text-[#1C1917]">{BACKGROUNDS[bg].nama}:</span>{' '}
                {BACKGROUNDS[bg].desc}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
            >
              Mulai Bermain
            </button>
          </div>
        </form>

        {/* Right Side: Quick Guides, Import/Export, Custom JSON */}
        <div className="space-y-4">
          <div className="bg-white border border-[#DDD6C3] rounded-lg overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-[#ECE7D8] border-b border-[#DDD6C3]">
              <h3 className="font-display text-sm font-bold text-[#1C1917]">
                Panduan &amp; Data
              </h3>
            </div>
            <div className="p-4 space-y-3 text-xs text-[#44403C]">
              <p className="leading-relaxed">
                Setiap giliran mewakili satu tahun. Kelola wilayah, tunjuk penasihat, atur
                wasiat pewaris agar garis keturunan tidak terputus, dan hadapi peristiwa sejarah
                Eropa.
              </p>
              <button
                type="button"
                onClick={() => engine.go('tutorial')}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 font-semibold text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded-md transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Buka Panduan Pemula
              </button>
              <input
                ref={saveFileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportSaveFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => saveFileRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 font-semibold text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded-md transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Impor File Save (.json)
              </button>

              {localSlots.length > 0 && (
                <div className="pt-2 border-t border-[#E6E1D3] space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#78716C]">
                    Database Lokal ({localSlots.length} Save)
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {localSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between gap-2 p-2 bg-[#FAF8F2] border border-[#DDD6C3] rounded"
                      >
                        <button
                          type="button"
                          onClick={() => void engine.loadLocalSlot(slot.id)}
                          className="min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <div className="text-xs font-semibold text-[#1C1917] truncate">
                            {slot.label}
                          </div>
                          <div className="text-[10px] text-[#78716C] truncate">
                            {slot.ruler} · Tahun {slot.year}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label="Hapus slot save"
                          onClick={async () => {
                            await engine.deleteLocalSlot(slot.id);
                            setLocalSlots(await engine.listLocalSaves());
                          }}
                          className="p-1 text-[#78716C] hover:text-[#991B1B] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[#E6E1D3] space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".json"
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 font-medium text-[#44403C] bg-white hover:bg-[#FAF8F2] border border-[#D6CFC0] rounded-md transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Muat Skenario JSON Kustom
                </button>
                {hasCustom && (
                  <button
                    type="button"
                    onClick={() => {
                      engine.resetCustomData();
                      setDataStatus('Data standar dipulihkan.');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 font-medium text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded-md transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Kembalikan Data Bawaan
                  </button>
                )}
                {dataStatus && <p className="text-[11px] text-[#9A6614]">{dataStatus}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
