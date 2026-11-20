import React, { useMemo, useState } from 'react';
import { getBannerForRoute } from '../../assets/media';
import { engine, HERALDS, ILLNESS_DEFS } from '../../engine/gameEngine';
import { Character } from '../../engine/types';
import { ListRow, SectionHeader, ViewShell } from '../GameImage';

interface Props {
  view: string;
  arg?: string;
}

export const FamilyAndTreeView: React.FC<Props> = ({ view, arg }) => {
  const p = engine.me();
  const [commoners, setCommoners] = useState<Character[]>([]);
  const [commonerMode, setCommonerMode] = useState<'mixed' | 'widow' | 'widow_kids'>('mixed');
  const [candFilter, setCandFilter] = useState<'all' | 'widow' | 'widow_kids'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [expandedTreeIds, setExpandedTreeIds] = useState<string[]>([]);
  const [treeFocusSnapshot, setTreeFocusSnapshot] = useState<string>('');
  const [treeZoom, setTreeZoom] = useState<'fit' | 1 | 1.25>('fit');
  const [memberFilter, setMemberFilter] = useState<'all' | 'alive' | 'dead'>('all');
  const [dynFilter, setDynFilter] = useState<'all' | 'active' | 'extinct'>('all');
  const [showAllDyns, setShowAllDyns] = useState(false);
  const [renamingChildId, setRenamingChildId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const activeFocusId = arg || engine.G.familyFocus || p.id;
  if ((view === 'silsilah' || view === 'pohon' || view === 'tree') && treeFocusSnapshot !== activeFocusId) {
    setTreeFocusSnapshot(activeFocusId);
    setSelectedTreeId(null);
    setExpandedTreeIds([]);
  }

  const openTreeFor = (charId: string, includeDead = true) => {
    engine.G.familyFocus = charId;
    if (includeDead) engine.G.familyView.showDead = true;
    engine.G.familyView.showSpouses = true;
    setSelectedTreeId(null);
    setExpandedTreeIds([]);
    engine.go('silsilah', charId);
  };

  const treeData = useMemo(() => {
    const focus = arg || engine.G.familyFocus || p.id;
    const depth = engine.G.familyView?.depth || 3;
    return engine.buildFamilyTree(focus, depth, selectedTreeId, expandedTreeIds);
  }, [
    arg,
    p.id,
    engine.G.familyFocus,
    engine.G.familyView?.depth,
    engine.G.familyView?.showSpouses,
    engine.G.familyView?.showDead,
    engine.G.tahun,
    selectedTreeId,
    expandedTreeIds,
  ]);

  if (view === 'hub') {
    const sp = p.pasangan ? engine.C[p.pasangan] : null;
    const dy = p.dinasti ? engine.DY[p.dinasti] : null;
    const herald = dy?.herald ? HERALDS.find((h) => h.id === dy.herald) : null;
    return (
      <ViewShell
        title="Keluarga, Hubungan & Dinasti"
        onBack={() => engine.back()}
        onHome={() => engine.home()}
        bannerUrl={getBannerForRoute('hub').url}
        bannerCaption="Silaturahmi Wangsa"
      >
        <SectionHeader title="Ikatan Keluarga & Pernikahan" />
        {sp ? (
          <ListRow
            icon={sp.gender === 'P' ? '👸' : '🤴'}
            title={`${engine.full(sp)} (${p.sn === 'bertunangan' ? 'Tunangan' : 'Pasangan'})`}
            subtitle={`${engine.tTitle(sp)} · Kelas ${sp.kelas.replace(/_/g, ' ')} · Opini ${Math.round(engine.opn(sp, p))}`}
            onClick={() => engine.go('ch', sp.id)}
          />
        ) : (
          <ListRow
            icon="💍"
            title="Cari Pasangan Bangsawan"
            subtitle="Kandidat lajang maupun janda/duda bangsawan (termasuk yang punya anak)"
            onClick={() => {
              setCandFilter('all');
              engine.go('cari');
            }}
          />
        )}
        {!sp && (
          <>
            <ListRow
              icon="🕯️"
              title="Nikahi Janda / Duda Bangsawan (Memiliki Anak)"
              subtitle="Temukan janda/duda bangsawan berketurunan untuk dinikahi"
              onClick={() => {
                setCandFilter('widow_kids');
                engine.go('cari');
              }}
            />
            <ListRow
              icon="🌾"
              title="Nikahi Rakyat Jelata"
              subtitle={
                engine.isCommoner(p)
                  ? 'Temukan pasangan lajang atau janda/duda dari masyarakat lokal (+15 Kebahagiaan)'
                  : 'Nikah morganatik dengan lajang atau janda/duda rakyat jelata (-5 Prestise, +15 Kebahagiaan)'
              }
              onClick={() => {
                setCommonerMode('mixed');
                setCommoners(engine.makeCommonerBatch('mixed'));
                engine.go('cariUmum');
              }}
            />
            <ListRow
              icon="👩‍👧"
              title="Nikahi Janda / Duda Rakyat Jelata (Memiliki Anak)"
              subtitle="Kandidat janda/duda rakyat lokal yang telah memiliki anak bawaan"
              onClick={() => {
                setCommonerMode('widow_kids');
                setCommoners(engine.makeCommonerBatch('widow_kids'));
                engine.go('cariUmum');
              }}
            />
          </>
        )}
        {p.sn === 'bertunangan' && p.pasangan && (
          <>
            <ListRow
              icon="💒"
              title="Resmikan Pernikahan Sekarang"
              subtitle="Menikah langsung dengan tunanganmu (minimal usia 16 th · bukan selibat)"
              onClick={() => engine.marryBetrothed()}
            />
            <ListRow
              icon="✖"
              title="Batalkan Pertunangan"
              subtitle="Denda prestise & opini keluarga memburuk"
              onClick={() => engine.batalTun(p.pasangan!)}
            />
          </>
        )}
        {p.sn === 'menikah' && sp && (
          <>
            {(() => {
              const check = engine.canBeIntimate(sp.id);
              const chance = engine.getConceptionChance(sp.id);
              const isPreg = (engine.G.pregnancies || []).find(
                (pr) => pr.motherId === p.id || pr.motherId === sp.id
              );
              return (
                <div className="p-3.5 bg-[#FDF2F8] border-b border-[#FBCFE8] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-[#9D174D]">
                      Malam Mesra &amp; Program Keturunan bersama {engine.full(sp)}
                    </div>
                    <div className="text-[#831843]">
                      {isPreg
                        ? `Sedang mengandung — bayi lahir pada tahun ${isPreg.dueYear}`
                        : check.ok
                          ? `Peluang kehamilan: ${chance}% · +8 Kebahagiaan & +8 Opini`
                          : check.reason}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!check.ok}
                    onClick={() => engine.beIntimate(sp.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#9D174D] hover:bg-[#831843] disabled:opacity-45 text-white rounded cursor-pointer whitespace-nowrap"
                  >
                    Bercinta ({chance}%)
                  </button>
                </div>
              );
            })()}
            <ListRow
              icon="⚖"
              title="Cerai"
              subtitle="Akhiri pernikahan aktif"
              onClick={() => engine.cerai()}
            />
          </>
        )}
        {Object.entries(engine.G.rulerRelations || {})
          .filter(([cid, rel]) => cid !== sp?.id && rel.status === 'kekasih' && engine.C[cid]?.hidup)
          .map(([cid]) => {
            const lover = engine.C[cid];
            if (!lover) return null;
            const check = engine.canBeIntimate(cid);
            const chance = engine.getConceptionChance(cid);
            return (
              <div key={cid} className="p-3.5 bg-[#FDF2F8] border-b border-[#FBCFE8] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-[#9D174D]">
                    Hubungan Asmara Rahasia · {engine.full(lover)} (Kekasih)
                  </div>
                  <div className="text-[#831843]">
                    {check.ok ? `Peluang kehamilan: ${chance}% · Anak di luar nikah` : check.reason}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!check.ok}
                  onClick={() => engine.beIntimate(cid)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#9D174D] hover:bg-[#831843] disabled:opacity-45 text-white rounded cursor-pointer whitespace-nowrap"
                >
                  Bercinta ({chance}%)
                </button>
              </div>
            );
          })}
        <ListRow
          icon="👨‍👩‍👧‍👦"
          title="Keluarga & Orang Dekat"
          subtitle={`${p.anak.length} anak · Orang tua, saudara, & favorit`}
          onClick={() => engine.go('fam')}
        />
        <ListRow
          icon="🌳"
          title="Pohon Silsilah Interaktif"
          subtitle="Diagram visual leluhur, keturunan, & pasangan lintas generasi"
          onClick={() => engine.go('silsilah', p.id)}
        />
        <ListRow
          icon="📊"
          title="Statistik Keluarga & Anggota"
          subtitle="Ringkasan demografi wangsa & jumlah anggota hidup"
          onClick={() => engine.go('statKeluarga')}
        />

        <SectionHeader title="Dinasti & Warisan" />
        <ListRow
          icon={herald?.simbol || '🛡️'}
          title={dy ? `Dinasti ${dy.nama}` : 'Info Dinasti'}
          subtitle={dy ? `Prestise ${Math.round(dy.prestise)} · Status ${dy.status.replace(/_/g, ' ')}` : 'Belum punya dinasti'}
          onClick={() => engine.go('dyn')}
        />
        <ListRow
          icon="🎨"
          title="Lambang Perisai (Heraldik)"
          subtitle={herald ? `Lambang aktif: ${herald.nama}` : 'Pilih lambang kehormatan dinasti'}
          onClick={() => engine.go('herald')}
        />
        <ListRow
          icon="📜"
          title="Kronik Dinasti"
          subtitle="Rekam jejak sejarah wangsa dari generasi ke generasi"
          onClick={() => engine.go('kronik')}
        />
        <ListRow
          icon="🔍"
          title="Direktori Semua Dinasti"
          subtitle="Telusuri daftar wangsa di seluruh Eropa"
          onClick={() => engine.go('dl')}
        />
      </ViewShell>
    );
  }

  if (view === 'cari') {
    const list = engine.cand(candFilter);
    return (
      <ViewShell title="Kandidat Pasangan Bangsawan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Kandidat Tersedia (Syarat Sosial & Agama)" right={`${list.length} orang`} />
        <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Semua Bangsawan' },
            { id: 'widow', label: 'Janda / Duda Bangsawan' },
            { id: 'widow_kids', label: 'Janda / Duda Punya Anak' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCandFilter(tab.id as typeof candFilter)}
              className={`px-2.5 py-1 rounded border cursor-pointer ${
                candFilter === tab.id
                  ? 'bg-[#9A6614] text-white border-[#9A6614]'
                  : 'bg-white text-[#44403C] border-[#D6CFC0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada kandidat bangsawan yang cocok untuk kategori ini saat ini.</div>
        ) : (
          list.map((c) => {
            const acc = engine.acc(c, 'nikah');
            const elig = engine.checkMarriageEligibility(p, c);
            const dynRel = engine.getDynastyRelation(p.dinasti, c.dinasti);
            const dy = c.dinasti ? engine.DY[c.dinasti] : null;
            const fa = c.ayah ? engine.C[c.ayah] : null;
            const mo = c.ibu ? engine.C[c.ibu] : null;
            const kidsCount = c.anak.filter((aid) => engine.C[aid]?.hidup).length;
            const parentText = [fa ? `Ayah: ${engine.full(fa)}` : '', mo ? `Ibu: ${engine.full(mo)}` : '']
              .filter(Boolean)
              .join(' · ');
            return (
              <div key={c.id} className="px-4 py-3 border-b border-[#E6E1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
                <div className="min-w-0 space-y-0.5 text-xs">
                  <div className="font-semibold text-[#1C1917] flex flex-wrap items-center gap-1.5">
                    <span>{c.gender === 'P' ? '👩' : '👨'} {engine.full(c)}</span>
                    <span className="text-[11px] font-normal px-1.5 py-0.5 bg-[#FAF8F2] border border-[#E6E1D3] rounded">
                      {c.gender === 'P' ? 'Perempuan' : 'Laki-laki'} · {c.sn.replace(/_/g, ' ')}
                      {kidsCount > 0 ? ` (${kidsCount} anak)` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {engine.tTitle(c)} · Usia {engine.umur(c)} · {engine.AG(c.agama).nama}
                    {dy ? ` · Dinasti ${dy.nama}` : ''}
                    {parentText ? ` · ${parentText}` : ''}
                  </div>
                  <div className="text-[11px] text-[#78350F]">
                    {elig.ok
                      ? `${elig.statusLabel} · Relasi Dinasti ${dynRel >= 0 ? '+' : ''}${dynRel} · Peluang ${Math.round(acc.t)}/100`
                      : elig.reason || 'Tidak memenuhi syarat'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => engine.go('ch', c.id)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#EFEBE0] text-[#1C1917] rounded cursor-pointer"
                  >
                    Profil
                  </button>
                  <button
                    type="button"
                    disabled={!elig.ok}
                    onClick={() => engine.lamar(c.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] disabled:opacity-45 text-white rounded cursor-pointer"
                  >
                    {elig.ok ? 'Lamar' : 'Terkunci'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </ViewShell>
    );
  }

  if (view === 'cariUmum') {
    const list = commoners.length ? commoners : engine.makeCommonerBatch(commonerMode);
    return (
      <ViewShell title="Nikahi Rakyat Jelata & Janda/Duda Lokal" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader
          title="Kandidat Rakyat Lokal"
          right={
            <button
              type="button"
              onClick={() => setCommoners(engine.makeCommonerBatch(commonerMode))}
              className="text-xs font-semibold text-[#9A6614] hover:underline cursor-pointer"
            >
              Cari Lagi
            </button>
          }
        />
        <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'mixed', label: 'Campuran (Lajang & Janda/Duda)' },
            { id: 'widow', label: 'Janda / Duda Rakyat' },
            { id: 'widow_kids', label: 'Janda / Duda Punya Anak' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const m = tab.id as typeof commonerMode;
                setCommonerMode(m);
                setCommoners(engine.makeCommonerBatch(m));
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer ${
                commonerMode === tab.id
                  ? 'bg-[#9A6614] text-white border-[#9A6614]'
                  : 'bg-white text-[#44403C] border-[#D6CFC0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {list.map((c) => {
          const fa = c.ayah ? engine.C[c.ayah] : null;
          const mo = c.ibu ? engine.C[c.ibu] : null;
          const kidsCount = c.anak.filter((aid) => engine.C[aid]?.hidup).length;
          const parentText = [fa ? `Ayah: ${fa.nama}` : '', mo ? `Ibu: ${mo.nama}` : '']
            .filter(Boolean)
            .join(' · ');
          return (
            <div key={c.id} className="px-4 py-3 border-b border-[#E6E1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white">
              <div className="min-w-0 space-y-0.5 text-xs">
                <div className="font-semibold text-[#1C1917] flex flex-wrap items-center gap-1.5">
                  <span>{c.gender === 'P' ? '👩' : '👨'} {engine.full(c)}</span>
                  <span className="text-[11px] font-normal px-1.5 py-0.5 bg-[#FAF8F2] border border-[#E6E1D3] rounded">
                    {c.gender === 'P' ? 'Perempuan' : 'Laki-laki'} · {c.sn.replace(/_/g, ' ')}
                    {kidsCount > 0 ? ` · ${kidsCount} anak` : ''}
                  </span>
                </div>
                <div className="text-[11px] text-[#57534E]">
                  Rakyat Jelata · Usia {engine.umur(c)} · {c.budaya}
                  {parentText ? ` · ${parentText}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => engine.go('ch', c.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#EFEBE0] text-[#1C1917] rounded cursor-pointer"
                >
                  Profil
                </button>
                <button
                  type="button"
                  onClick={() => engine.marryCommoner(c.id)}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                >
                  Nikahi
                </button>
              </div>
            </div>
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'fam') {
    const parents = [p.ayah ? engine.C[p.ayah] : null, p.ibu ? engine.C[p.ibu] : null].filter(
      (x): x is Character => Boolean(x)
    );
    const kids = p.anak.map((id) => engine.C[id]).filter((x): x is Character => Boolean(x));
    const sibs = Object.values(engine.C).filter(
      (c) => c.id !== p.id && ((p.ibu && c.ibu === p.ibu) || (p.ayah && c.ayah === p.ayah))
    );
    const sp = p.pasangan ? engine.C[p.pasangan] : null;
    return (
      <ViewShell title="Keluarga & Kerabat" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Pasangan" />
        {sp ? (
          <>
            <ListRow
              icon="💍"
              title={engine.full(sp)}
              subtitle={`${engine.lifeText(sp)} · ${engine.tTitle(sp)}`}
              onClick={() => engine.go('ch', sp.id)}
            />
            {p.sn === 'menikah' && (() => {
              const check = engine.canBeIntimate(sp.id);
              const chance = engine.getConceptionChance(sp.id);
              return (
                <div className="px-4 py-2.5 bg-[#FDF2F8] border-b border-[#FBCFE8] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#9D174D]">
                    {check.ok ? `Peluang kehamilan: ${chance}%` : check.reason}
                  </span>
                  <button
                    type="button"
                    disabled={!check.ok}
                    onClick={() => engine.beIntimate(sp.id)}
                    className="px-3 py-1 text-xs font-semibold bg-[#9D174D] text-white disabled:opacity-45 rounded cursor-pointer"
                  >
                    Bercinta ({chance}%)
                  </button>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="p-4 text-xs text-[#57534E]">Belum menikah.</div>
        )}
        <SectionHeader title="Orang Tua" />
        {parents.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak tercatat.</div>
        ) : (
          parents.map((x) => (
            <ListRow key={x.id} title={engine.full(x)} subtitle={engine.lifeText(x)} onClick={() => engine.go('ch', x.id)} />
          ))
        )}
        <SectionHeader title="Saudara Kandung" />
        {sibs.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada saudara tercatat.</div>
        ) : (
          sibs.map((x) => (
            <ListRow key={x.id} title={engine.full(x)} subtitle={`${engine.lifeText(x)} · ${engine.tTitle(x)}`} onClick={() => engine.go('ch', x.id)} />
          ))
        )}
        <SectionHeader title="Anak-Anak" right={`${kids.length} orang`} />
        {kids.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum memiliki anak.</div>
        ) : (
          kids.map((x) => (
            <div key={x.id} className="border-b border-[#E6E1D3]">
              <ListRow
                title={engine.full(x)}
                subtitle={`${engine.lifeText(x)} · ${engine.tTitle(x)}`}
                rightLabel={engine.umur(x) < 16 ? 'Didik' : undefined}
                onClick={() => engine.go(engine.umur(x) < 16 ? 'edu' : 'ch', x.id)}
              />
              {x.hidup && (
                <div className="px-4 py-2 bg-[#FAF8F2] flex flex-wrap items-center gap-2 text-xs">
                  {renamingChildId === x.id ? (
                    <>
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        placeholder="Nama baru anak..."
                        className="px-2.5 py-1 text-xs bg-white border border-[#D6CFC0] rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setRenameInput(engine.pickCultureName(x.gender, x.budaya))}
                        className="px-2 py-1 text-[11px] bg-white border border-[#D6CFC0] rounded cursor-pointer"
                      >
                        Acak
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          engine.nameChild(x.id, renameInput);
                          setRenamingChildId(null);
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
                      >
                        Simpan Nama
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingChildId(null)}
                        className="px-2 py-1 text-[11px] text-[#57534E] cursor-pointer"
                      >
                        Batal
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingChildId(x.id);
                        setRenameInput(x.nama);
                      }}
                      className="text-[11px] font-semibold text-[#9A6614] hover:underline cursor-pointer"
                    >
                      Beri / Ubah Nama Anak
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'silsilah' || view === 'pohon' || view === 'tree') {
    const focus = engine.C[arg || engine.G.familyFocus || p.id] || p;
    const focusSpouse = focus.pasangan ? engine.C[focus.pasangan] : null;
    const focusExIds = new Set(
      (focus.marriageHistory || []).filter((m) => m.spouseId !== focus.pasangan).map((m) => m.spouseId)
    );
    const spExOrder = new Map<string, number>();
    if (focusSpouse) {
      (focusSpouse.marriageHistory || [])
        .filter((m) => m.spouseId !== focusSpouse.pasangan)
        .forEach((m, idx) => spExOrder.set(m.spouseId, idx));
    }

    const gens = Array.from(new Set(treeData.nodes.map((n) => n.gen))).sort((a, b) => a - b);
    const colW = 166;
    const rowH = 118;
    const cardW = 148;
    const cardH = 56;
    const topPad = 42;
    const positioned = new Map<string, { x: number; y: number; char: Character; role: string }>();

    const sortRowNodes = (g: number, rowNodes: typeof treeData.nodes) => {
      if (g === 0) {
        const rankOf = (n: (typeof rowNodes)[number]) => {
          if (focusExIds.has(n.id)) return 0;
          if (n.id === focus.id) return 1;
          if (focusSpouse && n.id === focusSpouse.id) return 2;
          if (spExOrder.has(n.id)) return 3 + (spExOrder.get(n.id) || 0) * 0.01;
          return 10;
        };
        return [...rowNodes].sort((a, b) => rankOf(a) - rankOf(b));
      }
      if (g === 1) {
        const rankChild = (n: (typeof rowNodes)[number]) => {
          const ch = n.char;
          const bioFocus = engine.blood(focus, ch);
          const bioSp = focusSpouse ? engine.blood(focusSpouse, ch) : false;
          if (bioFocus && !bioSp) return 0;
          if (bioFocus && bioSp) return 1;
          if (!bioFocus && bioSp) {
            const otherParentId = ch.ayah === focusSpouse?.id ? ch.ibu : ch.ayah;
            const exIdx = otherParentId && spExOrder.has(otherParentId) ? spExOrder.get(otherParentId)! : 99;
            return 2 + exIdx * 0.01;
          }
          return 5;
        };
        return [...rowNodes].sort((a, b) => rankChild(a) - rankChild(b) || a.char.lahir - b.char.lahir);
      }
      return [...rowNodes].sort((a, b) => a.char.lahir - b.char.lahir);
    };

    gens.forEach((g, gi) => {
      const rowNodes = sortRowNodes(g, treeData.nodes.filter((n) => n.gen === g));
      rowNodes.forEach((n, ni) => {
        positioned.set(n.id, {
          x: 20 + ni * colW,
          y: topPad + gi * rowH,
          char: n.char,
          role: n.role,
        });
      });
    });

    const maxCols = Math.max(1, ...gens.map((g) => treeData.nodes.filter((n) => n.gen === g).length));
    const svgW = Math.max(460, maxCols * colW + 32);
    const svgH = Math.max(260, topPad + gens.length * rowH + 34);

    const allDynasties = Object.values(engine.DY)
      .filter((d) => d.kepala && engine.C[d.kepala])
      .sort((a, b) => b.prestise - a.prestise)
      .slice(0, 80);

    const hasExpandableSpouse = Boolean(
      (focusSpouse && (focusSpouse.marriageHistory || []).some((m) => m.spouseId !== focusSpouse.pasangan)) ||
      (focus.marriageHistory || []).some((m) => m.spouseId !== focus.pasangan)
    );

    const EDGE_STYLE: Record<string, { color: string; label: string; width: number }> = {
      blood: { color: '#D97706', label: 'Hubungan Darah', width: 2.5 },
      spouse_active: { color: '#94A3B8', label: 'Pasangan Aktif', width: 2.5 },
      ex_divorce: { color: '#DC2626', label: 'Cerai Hidup', width: 2.5 },
      ex_widow: { color: '#16A34A', label: 'Cerai Mati (Wafat)', width: 2.5 },
      step_child: { color: '#1C1917', label: 'Anak Tiri ke Kita', width: 2.5 },
      step_sibling: { color: '#2563EB', label: 'Anak ↔ Saudara Tiri', width: 2.5 },
    };

    return (
      <ViewShell title={`Pohon Silsilah · ${engine.full(focus)}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-3 bg-[#FAF8F2] border-b border-[#DDD6C3] space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span>Kedalaman:</span>
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    engine.G.familyView.depth = d;
                    engine.notify();
                  }}
                  className={`px-2 py-1 rounded border cursor-pointer font-num ${
                    (engine.G.familyView?.depth || 3) === d
                      ? 'bg-[#9A6614] text-white border-[#9A6614]'
                      : 'bg-white text-[#44403C] border-[#D6CFC0]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1">
                <span>Tampilan:</span>
                {[
                  { id: 'fit', label: 'Muat Layar' },
                  { id: 1, label: '100%' },
                  { id: 1.25, label: '125%' },
                ].map((z) => (
                  <button
                    key={String(z.id)}
                    type="button"
                    onClick={() => setTreeZoom(z.id as typeof treeZoom)}
                    className={`px-2 py-0.5 text-[11px] rounded border cursor-pointer ${
                      treeZoom === z.id
                        ? 'bg-[#9A6614] text-white border-[#9A6614]'
                        : 'bg-white text-[#44403C] border-[#D6CFC0]'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engine.G.familyView?.showSpouses ?? true}
                  onChange={(e) => {
                    engine.G.familyView.showSpouses = e.target.checked;
                    engine.notify();
                  }}
                />
                <span>Pasangan</span>
              </label>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engine.G.familyView?.showDead ?? false}
                  onChange={(e) => {
                    engine.G.familyView.showDead = e.target.checked;
                    engine.notify();
                  }}
                />
                <span>Tokoh Wafat</span>
              </label>
              {expandedTreeIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedTreeIds([]);
                    setSelectedTreeId(focus.id);
                  }}
                  className="px-2 py-0.5 text-[11px] bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
                >
                  Tutup Eks
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E6E1D3]">
            <span className="font-semibold text-[#57534E]">Dinasti Lain:</span>
            <select
              value={focus.dinasti || ''}
              onChange={(e) => {
                const dyn = engine.DY[e.target.value];
                if (dyn?.kepala && engine.C[dyn.kepala]) {
                  openTreeFor(dyn.kepala, true);
                }
              }}
              className="flex-1 min-w-[170px] px-2 py-1 text-xs bg-white border border-[#D6CFC0] rounded"
            >
              <option value="">-- Pilih Dinasti untuk Dilihat --</option>
              {allDynasties.map((d) => {
                const head = d.kepala ? engine.C[d.kepala] : null;
                return (
                  <option key={d.id} value={d.id}>
                    {d.nama} ({head ? engine.full(head) : 'Tanpa Kepala'})
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => engine.go('dl')}
              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
            >
              Direktori Semua Dinasti
            </button>
            {focus.id !== p.id && (
              <button
                type="button"
                onClick={() => openTreeFor(p.id, false)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
              >
                Kembali ke Pohon Saya
              </button>
            )}
          </div>
        </div>

        {/* 6-Color Legend Bar — uniform solid lines */}
        <div className="px-3 py-2 bg-white border-b border-[#E6E1D3] flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#44403C]">
          {[
            { color: '#D97706', label: 'Darah (Anak/Ortu Kandung)' },
            { color: '#94A3B8', label: 'Pasangan Aktif (Perak)' },
            { color: '#DC2626', label: 'Cerai Hidup' },
            { color: '#16A34A', label: 'Cerai Mati (Wafat)' },
            { color: '#1C1917', label: 'Anak Tiri ke Kita' },
            { color: '#2563EB', label: 'Anak ↔ Saudara Tiri' },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-5 h-0 border-t-[3px] rounded-full"
                style={{ borderColor: item.color, borderStyle: 'solid' }}
              />
              <span>{item.label}</span>
            </span>
          ))}
        </div>

        {hasExpandableSpouse && (
          <div className="px-3 py-1.5 bg-[#FFFBEB] border-b border-[#FDE68A] text-[11px] text-[#78350F]">
            Ketuk kartu <strong>Pasangan</strong> di bagan untuk memunculkan garis ke suami/istri terdahulunya (Merah = Cerai Hidup, Hijau = Cerai Mati).
          </div>
        )}

        <div className="overflow-x-auto bg-[#FBF9F4] p-2 sm:p-3">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={treeZoom === 'fit' ? '100%' : Math.round(svgW * treeZoom)}
            height={treeZoom === 'fit' ? undefined : Math.round(svgH * treeZoom)}
            className="block mx-auto"
          >
            {treeData.edges.map((ed, idx) => {
              const a = positioned.get(ed.from);
              const b = positioned.get(ed.to);
              if (!a || !b) return null;
              const style = EDGE_STYLE[ed.kind] || EDGE_STYLE.blood;
              const sameRow = Math.abs(a.y - b.y) < 5;

              if (sameRow) {
                const left = a.x <= b.x ? a : b;
                const right = a.x <= b.x ? b : a;
                const distCols = Math.max(1, Math.round(Math.abs(right.x - left.x) / colW));

                if (ed.kind === 'step_sibling') {
                  // Clean uniform bracket below child cards
                  const x1 = left.x + cardW / 2;
                  const x2 = right.x + cardW / 2;
                  const yBase = left.y + cardH;
                  const drop = 16 + Math.min(28, (distCols - 1) * 10);
                  const d = `M ${x1} ${yBase} V ${yBase + drop} H ${x2} V ${yBase}`;
                  return (
                    <path
                      key={idx}
                      d={d}
                      fill="none"
                      stroke={style.color}
                      strokeWidth={style.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }

                // Adjacent horizontal connector (Active spouse Perak, or adjacent Cerai Hidup Merah / Cerai Mati Hijau)
                if (distCols === 1) {
                  const x1 = left.x + cardW;
                  const x2 = right.x;
                  const yMid = left.y + cardH / 2;
                  return (
                    <g key={idx}>
                      <line
                        x1={x1}
                        y1={yMid}
                        x2={x2}
                        y2={yMid}
                        stroke={style.color}
                        strokeWidth={style.width}
                        strokeLinecap="round"
                      />
                      {ed.kind === 'spouse_active' && (
                        <circle cx={(x1 + x2) / 2} cy={yMid} r={3.5} fill="#FFFFFF" stroke={style.color} strokeWidth={2} />
                      )}
                      {(ed.kind === 'ex_divorce' || ed.kind === 'ex_widow') && (
                        <g>
                          <rect
                            x={(x1 + x2) / 2 - 22}
                            y={yMid - 15}
                            width={44}
                            height={11}
                            rx={3}
                            fill="#FFFFFF"
                            stroke={style.color}
                            strokeWidth={0.9}
                          />
                          <text
                            x={(x1 + x2) / 2}
                            y={yMid - 7}
                            textAnchor="middle"
                            fontSize={7.5}
                            fontWeight={700}
                            fill={style.color}
                          >
                            {ed.kind === 'ex_divorce' ? 'Cerai' : 'Wafat'}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // Non-adjacent same-row orthogonal bracket above cards (uniform solid line)
                const x1 = left.x + cardW / 2;
                const x2 = right.x + cardW / 2;
                const yTop = left.y;
                const lift = 14 + Math.min(26, (distCols - 1) * 9);
                const d = `M ${x1} ${yTop} V ${yTop - lift} H ${x2} V ${yTop}`;
                const apexX = (x1 + x2) / 2;
                const apexY = yTop - lift;
                return (
                  <g key={idx}>
                    <path
                      d={d}
                      fill="none"
                      stroke={style.color}
                      strokeWidth={style.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {(ed.kind === 'ex_divorce' || ed.kind === 'ex_widow') && (
                      <g>
                        <rect
                          x={apexX - 27}
                          y={apexY - 7}
                          width={54}
                          height={13}
                          rx={3}
                          fill="#FFFFFF"
                          stroke={style.color}
                          strokeWidth={1}
                        />
                        <text
                          x={apexX}
                          y={apexY + 2.5}
                          textAnchor="middle"
                          fontSize={8}
                          fontWeight={700}
                          fill={style.color}
                        >
                          {ed.kind === 'ex_divorce' ? 'Cerai Hidup' : 'Cerai Mati'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              }

              // Vertical parent -> child / step-parent -> stepchild: clean uniform orthogonal elbow
              const upper = a.y < b.y ? a : b;
              const lower = a.y < b.y ? b : a;
              const xOffset = ed.kind === 'step_child' ? 12 : 0;
              const x1 = upper.x + cardW / 2 + xOffset;
              const y1 = upper.y + cardH;
              const x2 = lower.x + cardW / 2 + xOffset;
              const y2 = lower.y;
              const laneRatio = ed.kind === 'step_child' ? 0.62 : 0.42;
              const midY = y1 + (y2 - y1) * laneRatio;
              const d = Math.abs(x1 - x2) < 2 ? `M ${x1} ${y1} V ${y2}` : `M ${x1} ${y1} V ${midY} H ${x2} V ${y2}`;
              return (
                <path
                  key={idx}
                  d={d}
                  fill="none"
                  stroke={style.color}
                  strokeWidth={style.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {Array.from(positioned.entries()).map(([id, pos]) => {
              const isFocus = id === focus.id;
              const isSelected = id === (selectedTreeId || focus.id);
              const dead = !pos.char.hidup;
              const isEx = pos.role.startsWith('Mantan');
              const endedMarriages = (pos.char.marriageHistory || []).filter(
                (m) => m.spouseId !== pos.char.pasangan && (m.endedYear || m.spouseId !== pos.char.pasangan)
              ).length;
              return (
                <g
                  key={id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onClick={() => {
                    setSelectedTreeId(id);
                    setExpandedTreeIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                  }}
                  onDoubleClick={() => engine.go('ch', id)}
                  className="cursor-pointer"
                >
                  <rect
                    width={cardW}
                    height={cardH}
                    rx={6}
                    fill={isSelected ? '#FAF3E0' : isFocus ? '#F6EED9' : dead ? '#EFECE3' : '#FFFFFF'}
                    stroke={isSelected ? '#9A6614' : isFocus ? '#B45309' : dead ? '#A8A29E' : '#D6CFC0'}
                    strokeWidth={isSelected ? 2.5 : isFocus ? 1.75 : 1}
                  />
                  <text x={8} y={18} fontSize={11} fontWeight={700} fill="#1C1917">
                    {pos.char.nama.slice(0, isSelected || isEx ? 14 : 18)}
                  </text>
                  {(isSelected || isEx) && (
                    <g
                      transform={`translate(${cardW - 38}, 5)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        engine.go('ch', id);
                      }}
                    >
                      <rect width={33} height={14} rx={3} fill="#9A6614" />
                      <text x={16.5} y={10} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="#FFFFFF">
                        Profil ↗
                      </text>
                    </g>
                  )}
                  <text x={8} y={33} fontSize={9} fill="#57534E">
                    {pos.role.slice(0, 19)} · {engine.lifeSpan(pos.char)}
                  </text>
                  <text x={8} y={47} fontSize={8.5} fill={dead ? '#78716C' : '#57534E'}>
                    {pos.char.hidup ? `Hidup · ${engine.umur(pos.char)} th` : `Wafat ${pos.char.wafat || '?'}`}
                  </text>
                  {endedMarriages > 0 && (
                    <g transform={`translate(${cardW - 36}, 39)`}>
                      <rect width={30} height={13} rx={3} fill="#FEF3C7" stroke="#D97706" strokeWidth={0.8} />
                      <text x={15} y={9.5} textAnchor="middle" fontSize={8} fontWeight={700} fill="#92400E">
                        Eks×{endedMarriages}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {(() => {
          const selChar = engine.C[selectedTreeId || focus.id] || focus;
          const claims = engine.G.claims?.[selChar.id] || [];
          const marriages = selChar.marriageHistory || [];
          const ill = selChar.health?.illness ? ILLNESS_DEFS[selChar.health.illness] : null;
          const heritage = engine.getCulturalHeritage(selChar.budaya);
          const selDyn = selChar.dinasti ? engine.DY[selChar.dinasti] : null;
          const selFather = selChar.ayah ? engine.C[selChar.ayah] : null;
          const selMother = selChar.ibu ? engine.C[selChar.ibu] : null;
          return (
            <div className="p-4 bg-[#FAF8F2] border-y border-[#DDD6C3] space-y-2.5 text-xs text-[#44403C]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#1C1917]">
                    {engine.full(selChar)} · <span className="font-normal text-[#57534E]">{engine.tTitle(selChar)}</span>
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {selChar.gender === 'P' ? 'Perempuan' : 'Laki-laki'} · {engine.lifeText(selChar)} · {heritage.nama}
                    {selDyn && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          onClick={() => engine.go('dd', selDyn.id)}
                          className="font-semibold text-[#9A6614] hover:underline cursor-pointer"
                        >
                          Dinasti {selDyn.nama}
                        </button>
                      </>
                    )}
                    {ill && <span className="text-[#991B1B] font-semibold"> · Sakit: {ill.nama}</span>}
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    <strong>Orang Tua:</strong>{' '}
                    Ayah: {selFather ? (
                      <button type="button" onClick={() => engine.go('ch', selFather.id)} className="text-[#9A6614] hover:underline cursor-pointer">
                        {engine.full(selFather)}
                      </button>
                    ) : 'Tidak tercatat'}
                    {' · '}
                    Ibu: {selMother ? (
                      <button type="button" onClick={() => engine.go('ch', selMother.id)} className="text-[#9A6614] hover:underline cursor-pointer">
                        {engine.full(selMother)}
                      </button>
                    ) : 'Tidak tercatat'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => openTreeFor(selChar.id, true)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
                  >
                    Fokus Pohon
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.go('ch', selChar.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                  >
                    Buka Profil Lengkap
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className="font-semibold text-[#1C1917]">Sifat:</span>
                {selChar.sifat.length === 0 ? (
                  <span className="text-[#78716C]">Tidak tercatat</span>
                ) : (
                  selChar.sifat.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-white border border-[#DDD6C3] rounded text-[11px]">
                      {s}
                    </span>
                  ))
                )}
              </div>

              <div>
                <span className="font-semibold text-[#1C1917]">Klaim Gelar ({claims.length}): </span>
                {claims.length === 0 ? (
                  <span className="text-[#78716C]">Tidak memiliki klaim tahta</span>
                ) : (
                  claims.map((clm) => `${clm.nama} (${clm.kendali}%)`).join(', ')
                )}
              </div>

              <div>
                <span className="font-semibold text-[#1C1917]">Riwayat Pernikahan ({marriages.length}): </span>
                {marriages.length === 0 ? (
                  <span className="text-[#78716C]">Belum ada catatan pernikahan</span>
                ) : (
                  <ul className="mt-1 space-y-0.5 pl-3 list-disc">
                    {marriages.map((m, idx) => {
                      const exChar = engine.C[m.spouseId];
                      const isActive = m.spouseId === selChar.pasangan && !m.endedYear;
                      const isDiv = (m.reason || '').toLowerCase().includes('cerai');
                      const badgeColor = isActive
                        ? 'text-[#475569]'
                        : isDiv
                          ? 'text-[#DC2626]'
                          : 'text-[#16A34A]';
                      return (
                        <li key={idx}>
                          {exChar ? (
                            <button
                              type="button"
                              onClick={() => engine.go('ch', exChar.id)}
                              className="font-semibold text-[#9A6614] hover:underline cursor-pointer"
                            >
                              {m.spouseName}
                            </button>
                          ) : (
                            <span className="font-medium text-[#1C1917]">{m.spouseName}</span>
                          )}
                          {m.dynastyName ? ` (${m.dynastyName})` : ''} · Thn {m.year}–{m.endedYear || 'Aktif'}{' '}
                          <span className={`font-semibold ${badgeColor}`}>
                            [{isActive ? 'Pasangan Aktif' : isDiv ? 'Cerai Hidup' : m.reason || 'Cerai Mati'}]
                          </span>
                          {m.morganatic ? ' · Morganatik' : ''}
                          {exChar && (
                            <>
                              <button
                                type="button"
                                onClick={() => engine.go('ch', exChar.id)}
                                className="ml-2 text-[11px] font-semibold text-[#9A6614] hover:underline cursor-pointer"
                              >
                                [Profil]
                              </button>
                              <button
                                type="button"
                                onClick={() => openTreeFor(exChar.id, true)}
                                className="ml-1.5 text-[11px] font-medium text-[#57534E] hover:underline cursor-pointer"
                              >
                                [Pohon]
                              </button>
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}

        <SectionHeader title="Anggota dalam Bagan" right={`${treeData.nodes.length} tokoh`} />
        {treeData.nodes.map((n) => (
          <div key={n.id} className="px-4 py-2.5 border-b border-[#E6E1D3] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-[#1C1917]">{engine.full(n.char)} ({n.role})</div>
              <div className="text-[11px] text-[#57534E]">{engine.tTitle(n.char)} · {engine.lifeText(n.char)}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedTreeId(n.id);
                  setExpandedTreeIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]));
                }}
                className="px-2 py-1 text-[11px] font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
              >
                Inspeksi
              </button>
              <button
                type="button"
                onClick={() => engine.go('ch', n.id)}
                className="px-2 py-1 text-[11px] font-semibold bg-[#9A6614] text-white hover:bg-[#7E520E] rounded cursor-pointer"
              >
                Profil
              </button>
            </div>
          </div>
        ))}
      </ViewShell>
    );
  }

  if (view === 'statKeluarga' || view === 'anggotaK') {
    const dy = p.dinasti ? engine.DY[p.dinasti] : null;
    const members = Object.values(engine.C)
      .filter((c) => c.dinasti === p.dinasti)
      .sort((a, b) => Number(b.hidup) - Number(a.hidup) || b.lahir - a.lahir);
    const living = members.filter((c) => c.hidup);
    const dead = members.filter((c) => !c.hidup);
    const shown = memberFilter === 'alive' ? living : memberFilter === 'dead' ? dead : members;
    return (
      <ViewShell title="Statistik & Anggota Keluarga" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="grid grid-cols-4 border-b border-[#E6E1D3] bg-[#FAF8F2] text-center">
          <div className="p-3 border-r border-[#E6E1D3]">
            <div className="text-[11px] text-[#57534E]">Hidup</div>
            <div className="font-num text-base font-bold text-[#1C1917]">{living.length}</div>
          </div>
          <div className="p-3 border-r border-[#E6E1D3]">
            <div className="text-[11px] text-[#57534E]">Wafat</div>
            <div className="font-num text-base font-bold text-[#78716C]">{dead.length}</div>
          </div>
          <div className="p-3 border-r border-[#E6E1D3]">
            <div className="text-[11px] text-[#57534E]">Total</div>
            <div className="font-num text-base font-bold text-[#1C1917]">{members.length}</div>
          </div>
          <div className="p-3">
            <div className="text-[11px] text-[#57534E]">Prestise</div>
            <div className="font-num text-base font-bold text-[#1C1917]">{Math.round(dy?.prestise || 0)}</div>
          </div>
        </div>
        <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: `Semua (${members.length})` },
              { id: 'alive', label: `Hidup (${living.length})` },
              { id: 'dead', label: `Sudah Wafat (${dead.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMemberFilter(tab.id as typeof memberFilter)}
                className={`px-2.5 py-1 rounded border cursor-pointer ${
                  memberFilter === tab.id
                    ? 'bg-[#9A6614] text-white border-[#9A6614]'
                    : 'bg-white text-[#44403C] border-[#D6CFC0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openTreeFor(p.id, true)}
            className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
          >
            🌳 Pohon Silsilah (Termasuk Wafat)
          </button>
        </div>
        <SectionHeader title={`Anggota Wangsa ${dy?.nama || ''}`} right={`${shown.length} tokoh`} />
        {shown.map((m) => (
          <div key={m.id} className="px-4 py-2.5 border-b border-[#E6E1D3] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-semibold text-[#1C1917]">
                {engine.full(m)}{' '}
                <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded border ${m.hidup ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' : 'bg-[#F5F5F4] text-[#57534E] border-[#D6D3D1]'}`}>
                  {m.hidup ? `Hidup · ${engine.umur(m)} th` : `Wafat ${m.wafat || '?'}`}
                </span>
              </div>
              <div className="text-[11px] text-[#57534E]">
                {engine.tTitle(m)} · {engine.lifeSpan(m)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openTreeFor(m.id, true)}
                className="px-2 py-1 text-[11px] font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] rounded cursor-pointer"
              >
                🌳 Pohon
              </button>
              <button
                type="button"
                onClick={() => engine.go('ch', m.id)}
                className="px-2 py-1 text-[11px] font-medium bg-[#FAF8F2] border border-[#D6CFC0] rounded cursor-pointer"
              >
                Profil
              </button>
            </div>
          </div>
        ))}
      </ViewShell>
    );
  }

  if (view === 'herald') {
    const dy = p.dinasti ? engine.DY[p.dinasti] : null;
    return (
      <ViewShell title="Lambang Perisai Dinasti" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title={`Pilih Lambang (${dy?.nama || 'Dinasti'}) · 10 Emas`} />
        {HERALDS.map((h) => (
          <ListRow
            key={h.id}
            icon={h.simbol}
            title={h.nama}
            subtitle={h.makna}
            rightLabel={dy?.herald === h.id ? 'Aktif' : 'Pilih'}
            onClick={() => engine.setHerald(h.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'dyn' || view === 'dd') {
    const did = arg || p.dinasti;
    const d = did ? engine.DY[did] : null;
    if (!d) {
      return (
        <ViewShell title="Dinasti" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#57534E]">Dinasti tidak ditemukan.</div>
        </ViewShell>
      );
    }
    const head = d.kepala ? engine.C[d.kepala] : null;
    const allMems = Object.values(engine.C)
      .filter((c) => c.dinasti === d.id)
      .sort((a, b) => Number(b.hidup) - Number(a.hidup) || engine.tierOf(b) - engine.tierOf(a) || b.lahir - a.lahir);
    const livingMems = allMems.filter((c) => c.hidup);
    const deadMems = allMems.filter((c) => !c.hidup);
    const shownMems = memberFilter === 'alive' ? livingMems : memberFilter === 'dead' ? deadMems : allMems;
    const herald = d.herald ? HERALDS.find((h) => h.id === d.herald) : null;
    const treeTarget = head || livingMems[0] || allMems[0];

    return (
      <ViewShell title={`Dinasti ${d.nama}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-2 text-xs text-[#44403C]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-[#1C1917]">
                {herald ? `${herald.simbol} ` : ''}
                {d.nama}
              </div>
              <div>
                Prestise: <span className="font-num font-semibold">{Math.round(d.prestise)}</span> · Kas Dinasti:{' '}
                <span className="font-num font-semibold">{Math.round(d.fund || 0)}</span> · Hidup:{' '}
                <span className="font-num font-semibold">{livingMems.length}</span> · Wafat:{' '}
                <span className="font-num font-semibold">{deadMems.length}</span>
                {did !== p.dinasti && p.dinasti && (
                  <>
                    {' · '}Relasi Dinasti:{' '}
                    <span className="font-num font-semibold">
                      {engine.getDynastyRelation(p.dinasti, d.id) >= 0 ? '+' : ''}
                      {engine.getDynastyRelation(p.dinasti, d.id)}
                    </span>
                  </>
                )}
              </div>
              {head && (
                <div>
                  Kepala Dinasti:{' '}
                  <button
                    type="button"
                    onClick={() => engine.go('ch', head.id)}
                    className="font-semibold text-[#9A6614] hover:underline cursor-pointer"
                  >
                    {engine.full(head)}
                  </button>
                  {!head.hidup ? ` (Wafat ${head.wafat || '?'})` : ''}
                </div>
              )}
            </div>
            {treeTarget && (
              <button
                type="button"
                onClick={() => openTreeFor(treeTarget.id, true)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
              >
                🌳 Buka Pohon Silsilah Visual
              </button>
            )}
          </div>
        </div>
        {did === p.dinasti && (
          <>
            <SectionHeader title="Aksi Dinasti" />
            <ListRow title="Iuran Dana Dinasti" subtitle="Setor 5% emasmu ke kas wangsa" onClick={() => engine.dynFund()} />
            <ListRow title="Dirikan Cabang Dinasti" subtitle="Beri cabang wangsa baru untuk anggota dewasa" onClick={() => engine.dynCadet()} />
            {d.parent && (
              <ListRow
                title="Reunifikasi dengan Dinasti Induk"
                subtitle="Butuh 100 prestise & minimal Count"
                onClick={() => engine.reunifyDynasty(d.parent!)}
              />
            )}
            {Object.keys(engine.G.dynRel || {}).length > 0 && (
              <>
                <SectionHeader title="Relasi Antar Dinasti" />
                {Object.entries(engine.G.dynRel || {})
                  .filter(([k]) => p.dinasti && k.includes(p.dinasti))
                  .slice(0, 12)
                  .map(([k, val]) => {
                    const otherDynId = k.split('__').find((x) => x !== p.dinasti);
                    const otherDyn = otherDynId ? engine.DY[otherDynId] : null;
                    if (!otherDyn) return null;
                    return (
                      <ListRow
                        key={k}
                        title={otherDyn.nama}
                        subtitle={`Skor Relasi Dinasti: ${val >= 0 ? '+' : ''}${val}`}
                        onClick={() => engine.go('dd', otherDyn.id)}
                      />
                    );
                  })}
              </>
            )}
          </>
        )}
        <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: `Semua (${allMems.length})` },
            { id: 'alive', label: `Hidup (${livingMems.length})` },
            { id: 'dead', label: `Tokoh Wafat (${deadMems.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMemberFilter(tab.id as typeof memberFilter)}
              className={`px-2.5 py-1 rounded border cursor-pointer ${
                memberFilter === tab.id
                  ? 'bg-[#9A6614] text-white border-[#9A6614]'
                  : 'bg-white text-[#44403C] border-[#D6CFC0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <SectionHeader title="Anggota Dinasti (Hidup & Wafat)" right={`${shownMems.length} orang`} />
        {shownMems.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada anggota tercatat di kategori ini.</div>
        ) : (
          shownMems.map((m) => {
            const sp = m.pasangan ? engine.C[m.pasangan] : null;
            return (
              <div key={m.id} className="px-4 py-2.5 border-b border-[#E6E1D3] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-[#1C1917] flex flex-wrap items-center gap-1.5">
                    <span>{engine.full(m)}</span>
                    <span
                      className={`text-[10px] font-normal px-1.5 py-0.5 rounded border ${
                        m.hidup
                          ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                          : 'bg-[#F5F5F4] text-[#57534E] border-[#D6D3D1]'
                      }`}
                    >
                      {m.hidup ? `Hidup · ${engine.umur(m)} th` : `Wafat ${m.wafat || '?'}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {engine.tTitle(m)} · {engine.lifeSpan(m)}
                    {sp ? ` · Pasangan: ${engine.full(sp)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openTreeFor(m.id, true)}
                    className="px-2 py-1 text-[11px] font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:bg-[#EFE2C0] rounded cursor-pointer"
                  >
                    🌳 Pohon
                  </button>
                  <button
                    type="button"
                    onClick={() => engine.go('ch', m.id)}
                    className="px-2 py-1 text-[11px] font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
                  >
                    Profil
                  </button>
                </div>
              </div>
            );
          })
        )}
      </ViewShell>
    );
  }

  if (view === 'cadetPick') {
    const cands = Object.values(engine.C).filter(
      (c) => c.hidup && c.id !== p.id && c.dinasti === p.dinasti && engine.umur(c) >= 16
    );
    return (
      <ViewShell title="Pilih Pendiri Cabang Dinasti" onBack={() => engine.back()} onHome={() => engine.home()}>
        {cands.map((c) => (
          <ListRow
            key={c.id}
            title={engine.full(c)}
            subtitle={`Usia ${engine.umur(c)} · ${engine.tTitle(c)}`}
            onClick={() => engine.dynCadet(c.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'kronik') {
    const did = arg || p.dinasti;
    const logs = (did ? engine.G.dynHist[did] : []) || [];
    return (
      <ViewShell title="Kronik Dinasti" onBack={() => engine.back()} onHome={() => engine.home()}>
        {logs.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada catatan sejarah dinasti.</div>
        ) : (
          <ul className="divide-y divide-[#E6E1D3]">
            {logs.slice().reverse().map((l, idx) => (
              <li key={idx} className="px-4 py-2.5 text-xs text-[#292524]">
                <span className="font-num font-bold text-[#9A6614] mr-2">Thn {l.y}</span>
                {l.text}
              </li>
            ))}
          </ul>
        )}
      </ViewShell>
    );
  }

  if (view === 'dl') {
    const countsByDyn = new Map<string, { alive: number; dead: number; fallbackChar?: Character }>();
    Object.values(engine.C).forEach((c) => {
      if (!c.dinasti) return;
      const cur = countsByDyn.get(c.dinasti) || { alive: 0, dead: 0 };
      if (c.hidup) cur.alive += 1;
      else cur.dead += 1;
      if (!cur.fallbackChar) cur.fallbackChar = c;
      countsByDyn.set(c.dinasti, cur);
    });

    const list = Object.values(engine.DY)
      .filter((d) => {
        if (searchTerm.trim() && !d.nama.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        const cnt = countsByDyn.get(d.id) || { alive: 0, dead: 0 };
        if (dynFilter === 'active') return cnt.alive > 0;
        if (dynFilter === 'extinct') return cnt.alive === 0;
        return true;
      })
      .sort((a, b) => b.prestise - a.prestise);
    const visibleList = showAllDyns ? list : list.slice(0, 100);

    return (
      <ViewShell title="Direktori Semua Dinasti" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-3 bg-[#FAF8F2] border-b border-[#DDD6C3] space-y-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama dinasti (mis. Capet, Normandy, Salier)..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-[#D6CFC0] rounded"
          />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Semua Dinasti' },
              { id: 'active', label: 'Masih Hidup' },
              { id: 'extinct', label: 'Punah / Historis' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDynFilter(tab.id as typeof dynFilter)}
                className={`px-2.5 py-1 rounded border cursor-pointer ${
                  dynFilter === tab.id
                    ? 'bg-[#9A6614] text-white border-[#9A6614]'
                    : 'bg-white text-[#44403C] border-[#D6CFC0]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <SectionHeader title="Daftar Wangsa" right={`${list.length} dinasti`} />
        {visibleList.map((d) => {
          const cnt = countsByDyn.get(d.id) || { alive: 0, dead: 0 };
          const head = (d.kepala && engine.C[d.kepala]) || cnt.fallbackChar;
          return (
            <div key={d.id} className="px-4 py-2.5 border-b border-[#E6E1D3] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-semibold text-[#1C1917]">{d.nama}</div>
                <div className="text-[11px] text-[#57534E]">
                  Prestise {Math.round(d.prestise)} · {cnt.alive} hidup · {cnt.dead} wafat · {d.status.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {head && (
                  <button
                    type="button"
                    onClick={() => openTreeFor(head.id, true)}
                    className="px-2 py-1 text-[11px] font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:bg-[#EFE2C0] rounded cursor-pointer"
                  >
                    🌳 Pohon
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => engine.go('dd', d.id)}
                  className="px-2 py-1 text-[11px] font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
                >
                  Anggota
                </button>
              </div>
            </div>
          );
        })}
        {list.length > 100 && !showAllDyns && (
          <div className="p-3 text-center bg-[#FAF8F2]">
            <button
              type="button"
              onClick={() => setShowAllDyns(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#D6CFC0] rounded cursor-pointer"
            >
              Tampilkan Semua ({list.length}) Dinasti
            </button>
          </div>
        )}
      </ViewShell>
    );
  }

  return null;
};
