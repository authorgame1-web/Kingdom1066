import React, { useEffect, useRef, useState } from 'react';
import { getPortraitUrl } from '../../assets/media';
import {
  ACHIEVEMENTS,
  engine,
  FEUDAL_LAW_LABELS,
  HONORIFICS,
  ILLNESS_DEFS,
  ORDERS,
  TUTORS,
} from '../../engine/gameEngine';
import { Character } from '../../engine/types';
import { LocalSaveSlot } from '../../utils/localSaveDb';
import { GameImage, ListRow, SectionHeader, StatBar, ViewShell } from '../GameImage';

interface Props {
  view: string;
  arg?: string;
}

export const PlayerProgressAndWorldView: React.FC<Props> = ({ view, arg }) => {
  const p = engine.me();
  const [bookTitle, setBookTitle] = useState('');
  const [localSlots, setLocalSlots] = useState<LocalSaveSlot[]>([]);
  const [selectedHonorificId, setSelectedHonorificId] = useState(HONORIFICS[0]?.id || 'panglima_agung');
  const [renamingCh, setRenamingCh] = useState(false);
  const [renameChVal, setRenameChVal] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'lain') {
      void engine.listLocalSaves().then(setLocalSlots);
    }
  }, [view]);

  const nobleOnlyProgressViews = new Set(['ordo', 'pengadilan', 'seni']);
  const rulerOnlyProgressViews = new Set(['was', 'wasT', 'wasW', 'turun', 'hukum', 'gelar']);
  if (
    (nobleOnlyProgressViews.has(view) && !engine.isNoble(p)) ||
    (rulerOnlyProgressViews.has(view) && (!engine.isNoble(p) || !engine.isRuler(p)))
  ) {
    return (
      <ViewShell title="Akses Bangsawan Terkunci" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] space-y-3 text-xs text-[#44403C]">
          <div className="text-sm font-bold text-[#991B1B]">
            Khusus Kaum Bangsawan &amp; Penguasa Wilayah
          </div>
          <p className="leading-relaxed">
            Menu Ordo Ksatria, Sidang Pengadilan Istana, Hukum Feodal Kerajaan, Penunjukan Wasiat Takhta, dan Gelar Utama hanya terbuka untuk Bangsawan atau penguasa berwilayah.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => engine.go('jab')}
              className="px-3 py-1.5 font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
            >
              Naikkan Status di Karier
            </button>
            <button
              type="button"
              onClick={() => engine.home()}
              className="px-3 py-1.5 font-medium bg-white border border-[#D6CFC0] text-[#1C1917] rounded cursor-pointer"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </ViewShell>
    );
  }

  if (view === 'ch' && arg) {
    const c = engine.C[arg];
    if (!c) return null;
    const isMe = c.id === p.id;
    const titles = engine.held(c.id);
    const identity = engine.describeCharacterIdentity(c);
    const heritage = engine.getCulturalHeritage(c.budaya);
    const ill = c.health?.illness ? ILLNESS_DEFS[c.health.illness] : null;
    const hon = engine.getCharacterHonorific(c.id);
    const claims = engine.G.claims?.[c.id] || [];
    const marriages = c.marriageHistory || [];
    const rulerRel = !isMe && c.hidup ? engine.getRulerRelation(c.id) : null;
    const isMyChild = p.anak.includes(c.id);
    const dy = c.dinasti ? engine.DY[c.dinasti] : null;
    const father = c.ayah ? engine.C[c.ayah] : null;
    const mother = c.ibu ? engine.C[c.ibu] : null;
    const spouse = c.pasangan ? engine.C[c.pasangan] : null;
    const livingKids = c.anak.map((id) => engine.C[id]).filter((k): k is Character => Boolean(k));
    return (
      <ViewShell title={engine.full(c)} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] flex items-start gap-4">
          <div className="w-16 h-16 rounded-md overflow-hidden border border-[#DDD6C3] shrink-0">
            <GameImage
              src={getPortraitUrl(c.gender)}
              alt={engine.full(c)}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="text-xs text-[#44403C] space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#1C1917]">{identity.primaryRole}</span>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#D6CFC0] rounded">
                {c.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
              </span>
              {rulerRel && (
                <span className={`px-2 py-0.5 text-[11px] font-semibold rounded border ${rulerRel.color}`}>
                  {rulerRel.label}
                </span>
              )}
            </div>
            <div className="font-medium text-[#78350F]">{identity.ordinalLabel}</div>
            <div>{engine.lifeText(c)}</div>
            <div>
              Agama: <strong>{engine.AG(c.agama).nama}</strong> · Budaya: <strong>{c.budaya}</strong> ({heritage.nama})
              {!isMe && ` · Opini ${Math.round(engine.opn(c, p))}`}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Dinasti:{' '}
                {dy ? (
                  <button
                    type="button"
                    onClick={() => engine.go('dd', dy.id)}
                    className="font-semibold text-[#9A6614] hover:underline cursor-pointer"
                  >
                    {dy.nama} ({dy.status.replace(/_/g, ' ')})
                  </button>
                ) : (
                  <span className="text-[#78716C]">Tidak berdinasti</span>
                )}
              </span>
              <span>· Status: <strong>{c.sn.replace(/_/g, ' ')}</strong></span>
            </div>
            <div>
              Sifat: {c.sifat.length ? c.sifat.join(', ') : 'Tidak ada'}
              {hon && <span className="text-[#9A6614] font-semibold"> · Gelar Kehormatan: {hon.nama}</span>}
            </div>
            {!isMe && (c.ambisi || c.aiSummary) && (
              <div className="text-[11px] text-[#78350F]">
                <strong>Kehendak &amp; Ambisi Mandiri:</strong>{' '}
                {c.ambisi ? c.ambisi.toUpperCase() : 'Dinamis'}
                {c.aiSummary ? ` · ${c.aiSummary}` : ''}
              </div>
            )}
            {ill ? (
              <div className="flex flex-wrap items-center gap-2 text-[#991B1B] font-semibold">
                <span>Sakit: {ill.nama} ({ill.desc})</span>
                {c.hidup && (
                  <button
                    type="button"
                    onClick={() => engine.treatIllness(c.id)}
                    className="px-2 py-0.5 text-[11px] bg-[#991B1B] text-white rounded cursor-pointer"
                  >
                    Panggil Tabib (20g)
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[#166534]">Kesehatan: Bugar (Tidak ada penyakit aktif)</div>
            )}
            <div className="pt-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  engine.G.familyFocus = c.id;
                  engine.G.familyView.showDead = true;
                  engine.G.familyView.showSpouses = true;
                  engine.go('silsilah', c.id);
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:bg-[#EFE2C0] rounded cursor-pointer"
              >
                🌳 Pohon Silsilah Visual Tokoh Ini
              </button>
              {dy && (
                <button
                  type="button"
                  onClick={() => engine.go('dd', dy.id)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] rounded cursor-pointer"
                >
                  Anggota Dinasti {dy.nama}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-white border-b border-[#E6E1D3] text-xs text-[#44403C] space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <strong className="text-[#1C1917]">Ayah:</strong>{' '}
              {father ? (
                <button
                  type="button"
                  onClick={() => engine.go('ch', father.id)}
                  className="text-[#9A6614] font-semibold hover:underline cursor-pointer"
                >
                  {engine.full(father)} ({engine.tTitle(father)} · {father.hidup ? `Usia ${engine.umur(father)} th` : `Wafat ${father.wafat || '?'}`})
                </button>
              ) : (
                <span className="text-[#78716C]">Tidak tercatat</span>
              )}
            </div>
            <div>
              <strong className="text-[#1C1917]">Ibu:</strong>{' '}
              {mother ? (
                <button
                  type="button"
                  onClick={() => engine.go('ch', mother.id)}
                  className="text-[#9A6614] font-semibold hover:underline cursor-pointer"
                >
                  {engine.full(mother)} ({engine.tTitle(mother)} · {mother.hidup ? `Usia ${engine.umur(mother)} th` : `Wafat ${mother.wafat || '?'}`})
                </button>
              ) : (
                <span className="text-[#78716C]">Tidak tercatat</span>
              )}
            </div>
          </div>
          {(spouse || livingKids.length > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
              {spouse && (
                <span>
                  <strong>Pasangan:</strong>{' '}
                  <button
                    type="button"
                    onClick={() => engine.go('ch', spouse.id)}
                    className="text-[#9A6614] font-semibold hover:underline cursor-pointer"
                  >
                    {engine.full(spouse)}
                  </button>
                </span>
              )}
              {livingKids.length > 0 && (
                <span>
                  <strong>Anak ({livingKids.length}):</strong>{' '}
                  {livingKids.slice(0, 6).map((k, idx) => (
                    <React.Fragment key={k.id}>
                      {idx > 0 && ', '}
                      <button
                        type="button"
                        onClick={() => engine.go('ch', k.id)}
                        className="text-[#9A6614] hover:underline cursor-pointer"
                      >
                        {k.nama} ({k.gender === 'P' ? 'P' : 'L'}, {engine.umur(k)}th)
                      </button>
                    </React.Fragment>
                  ))}
                </span>
              )}
            </div>
          )}
          <div className="text-[11px] text-[#57534E]">
            <strong>Warisan Budaya ({heritage.nama}):</strong> {heritage.desc}
          </div>
          {identity.allTitleOrdinals.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#57534E]">
              <span>
                <strong>Urutan Penguasa Wilayah:</strong>{' '}
                {identity.allTitleOrdinals.map((it) => `${it.label} di ${it.domain}`).join(' · ')}
              </span>
              {isMe && c.hidup && (
                <button
                  type="button"
                  onClick={() => engine.openCoronationDialog()}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:bg-[#EFE2C0] rounded cursor-pointer whitespace-nowrap"
                >
                  Atur Nama &amp; Nomor Regnal
                </button>
              )}
            </div>
          )}
        </div>

        {isMyChild && c.hidup && (
          <div className="px-4 py-2.5 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap items-center gap-2 text-xs">
            {renamingCh ? (
              <>
                <input
                  type="text"
                  value={renameChVal}
                  onChange={(e) => setRenameChVal(e.target.value)}
                  placeholder="Nama baru anak..."
                  className="px-2.5 py-1 text-xs bg-white border border-[#D6CFC0] rounded"
                />
                <button
                  type="button"
                  onClick={() => setRenameChVal(engine.pickCultureName(c.gender, c.budaya))}
                  className="px-2 py-1 text-[11px] bg-white border border-[#D6CFC0] rounded cursor-pointer"
                >
                  Acak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    engine.nameChild(c.id, renameChVal);
                    setRenamingCh(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
                >
                  Simpan Nama
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingCh(false)}
                  className="px-2 py-1 text-[11px] text-[#57534E] cursor-pointer"
                >
                  Batal
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenamingCh(true);
                  setRenameChVal(c.nama);
                }}
                className="text-xs font-semibold text-[#9A6614] hover:underline cursor-pointer"
              >
                Beri / Ubah Nama Anak
              </button>
            )}
          </div>
        )}

        <SectionHeader title="Statistik Efektif Karakter" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.keys(c.sk) as Array<keyof typeof c.sk>).map((k) => (
            <StatBar key={k} label={k} value={engine.effectiveStat(c, k)} />
          ))}
        </div>

        {!isMe && c.hidup && (
          <>
            <SectionHeader title="Interaksi & Gelar Kehormatan" />
            <div className="p-3 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => engine.makeFriend(c.id)}
                disabled={engine.isFriend(c.id)}
                className="px-2.5 py-1 text-xs font-semibold bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] disabled:opacity-50 rounded cursor-pointer"
              >
                {engine.isFriend(c.id) ? 'Sudah Berteman (+25)' : 'Jadikan Teman'}
              </button>
              <button
                type="button"
                onClick={() => engine.makeRival(c.id)}
                disabled={engine.isRival(c.id)}
                className="px-2.5 py-1 text-xs font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] disabled:opacity-50 rounded cursor-pointer"
              >
                {engine.isRival(c.id) ? 'Sudah Bermusuhan (-35)' : 'Jadikan Musuh'}
              </button>
              {(engine.isFriend(c.id) || engine.isRival(c.id)) && (
                <button
                  type="button"
                  onClick={() => engine.neutralizeRelation(c.id)}
                  className="px-2.5 py-1 text-xs font-medium bg-white border border-[#D6CFC0] text-[#44403C] rounded cursor-pointer"
                >
                  Netralkan Hubungan
                </button>
              )}
              {engine.canBeIntimate(c.id).ok && (
                <button
                  type="button"
                  onClick={() => engine.beIntimate(c.id)}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#9D174D] text-white rounded cursor-pointer"
                >
                  Bercinta ({engine.getConceptionChance(c.id)}%)
                </button>
              )}
            </div>
            <div className="p-3 bg-white border-b border-[#E6E1D3] flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedHonorificId}
                onChange={(e) => setSelectedHonorificId(e.target.value)}
                className="px-2.5 py-1 bg-[#FAF8F2] border border-[#D6CFC0] rounded text-xs"
              >
                {HONORIFICS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nama} ({h.cost}g · +{h.opBonus} Opini)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => engine.grantHonorific(selectedHonorificId, c.id)}
                className="px-2.5 py-1 font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
              >
                Anugerahkan Gelar
              </button>
            </div>
            <ListRow title="Ajak Bicara" onClick={() => engine.act('talk', c.id)} />
            <ListRow title="Puji" onClick={() => engine.act('puji', c.id)} />
            <ListRow title="Hina" onClick={() => engine.act('hina', c.id)} />
            <ListRow title="Beri Hadiah (20 Emas)" onClick={() => engine.gift(c.id)} />
            <ListRow title="Obati Tabib Istana (20 Emas)" onClick={() => engine.treatIllness(c.id)} />
            <ListRow
              title={engine.G.jail[c.id] ? 'Bebaskan dari Penjara' : 'Penjarakan'}
              onClick={() => engine.jail(c.id)}
            />
            <ListRow
              title={engine.G.fav.includes(c.id) ? 'Hapus dari Favorit' : 'Tandai Favorit'}
              onClick={() => engine.togFav(c.id)}
            />
            {engine.single(c) && (
              <ListRow title="Lamar Menikah" onClick={() => engine.lamar(c.id)} />
            )}
            <ListRow title="Diplomasi & Relationship Penguasa" onClick={() => engine.go('dc', c.id)} />
            {engine.held(p.id).length > 1 && engine.ageOK(c) && (
              <ListRow title="Hibahkan Wilayah ke Tokoh Ini" onClick={() => engine.go('bp', c.id)} />
            )}
          </>
        )}

        {(claims.length > 0 || marriages.length > 0) && (
          <>
            <SectionHeader title="Klaim & Riwayat Pernikahan" />
            {claims.length > 0 && (
              <div className="px-4 py-2 text-xs text-[#44403C] border-b border-[#E6E1D3]">
                <strong>Klaim Gelar:</strong> {claims.map((clm) => `${clm.nama} (${clm.kendali}%)`).join(', ')}
              </div>
            )}
            {marriages.map((m, i) => {
              const targetSp = m.spouseId ? engine.C[m.spouseId] : null;
              const isActive = m.spouseId === c.pasangan && !m.endedYear;
              const isDiv = (m.reason || '').toLowerCase().includes('cerai');
              const statusTag = isActive ? 'Pasangan Aktif' : isDiv ? 'Cerai Hidup' : m.reason || 'Cerai Mati';
              return (
                <ListRow
                  key={i}
                  title={`${m.spouseName}${m.dynastyName ? ` (${m.dynastyName})` : ''}`}
                  subtitle={`Thn ${m.year}–${m.endedYear || 'Aktif'} · ${statusTag}${m.morganatic ? ' · Morganatik' : ''}`}
                  rightLabel={targetSp ? 'Profil' : undefined}
                  onClick={targetSp ? () => engine.go('ch', targetSp.id) : undefined}
                />
              );
            })}
          </>
        )}

        {titles.length > 0 && (
          <>
            <SectionHeader title="Gelar Dimiliki & Silsilah Takhta" />
            {titles.map((t) => {
              const ord = engine.getTitleOrdinalInfo(c, t);
              const succ = engine.getTitleSuccessionHistory(t.id);
              const prevs = succ.entries.filter((e) => !e.isCurrent);
              return (
                <div key={t.id} className="border-b border-[#E6E1D3]">
                  <ListRow
                    title={t.nama}
                    subtitle={`${ord?.label || `Tier ${t.tier}`} · Tier ${t.tier}`}
                  />
                  {(prevs.length > 0 || succ.priorNote) && (
                    <div className="px-4 pb-3 pt-1 bg-[#FAF8F2] text-[11px] text-[#57534E] space-y-1">
                      {succ.priorNote && <div className="text-[10px] italic text-[#78716C]">{succ.priorNote}</div>}
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 leading-relaxed">
                        <span className="font-semibold text-[#44403C]">Urutan Penguasa:</span>
                        {prevs.slice(-6).map((ent) => (
                          <span key={`${ent.order}-${ent.displayName}`}>
                            <span className="font-num font-semibold">#{ent.order}</span> {ent.displayName} ({ent.dari}–{ent.sampai}) →
                          </span>
                        ))}
                        <span className="font-semibold text-[#78350F]">
                          #{succ.currentOrdinal} {engine.full(c)} (Kini)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'bp' && arg) {
    return (
      <ViewShell title="Pilih Gelar untuk Dihibahkan" onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.held(p.id).map((t) => (
          <ListRow key={t.id} title={t.nama} onClick={() => engine.givep(t.id, arg)} />
        ))}
      </ViewShell>
    );
  }

  if (view === 'kep') {
    const isNoble = engine.isNoble(p);
    const hasRealm = engine.isRuler(p);
    const nobleOnlyDecIds = new Set(['pilih_gelar_utama', 'pesta', 'perburuan', 'undang_bangsawan', 'turun_tahta', 'wasiat']);
    const list = (engine.D.keputusan || []).filter((d: { id: string }) => isNoble || !nobleOnlyDecIds.has(d.id));
    return (
      <ViewShell
        title={isNoble ? 'Keputusan Istana & Pengelolaan Diri' : 'Kehidupan Pribadi & Pengelolaan Diri'}
        onBack={() => engine.back()}
        onHome={() => engine.home()}
      >
        <SectionHeader title="Pengembangan & Organisasi" />
        <ListRow icon="🎓" title="Pendidikan Anak & Ahli Waris" subtitle="Sewa guru untuk anak di bawah 16 tahun" onClick={() => engine.go('pendidikan')} />
        {isNoble && (
          <ListRow icon="🛡️" title="Ordo Ksatria Abad Pertengahan" subtitle={`${Object.keys(engine.G.orders || {}).length} keanggotaan aktif`} onClick={() => engine.go('ordo')} />
        )}
        <ListRow icon="🐎" title="Perjalanan & Ziarah" subtitle={engine.G.travel ? 'Sedang dalam perjalanan' : 'Kunjungi wilayah lain di Eropa'} onClick={() => engine.go('perjalanan')} />
        <ListRow icon="📖" title="Tulis Kitab & Risalah" subtitle={`${engine.G.books.length} naskah ditulis`} onClick={() => engine.go('buku')} />
        {isNoble && (
          <ListRow icon="⚖️" title="Gelar Sidang Pengadilan & Karya Seni" subtitle="Pimpin sidang istana atau biayai seniman" onClick={() => engine.go('pengadilan')} />
        )}
        <ListRow icon="📈" title="Karier Profesi & Status Sosial" subtitle="Naik pangkat karier atau status bangsawan" onClick={() => engine.go('jab')} />
        {hasRealm && isNoble && (
          <>
            <ListRow icon="📜" title="Wasiat, Suksesi & Pembagian Tanah" subtitle="Tetapkan pewaris, aturan suksesi, & pembagian wilayah" onClick={() => engine.go('was')} />
            <ListRow icon="⚖️" title="Hukum Feodal Kerajaan" subtitle="Atur pajak feodal, kebijakan hukuman, & hak istimewa bangsawan" onClick={() => engine.go('hukum')} />
          </>
        )}

        <SectionHeader title="Keputusan Tahunan" />
        {list.map((d: { id: string; nama: string; biaya?: { emas?: number }; efek?: Record<string, number> }) => (
          <ListRow
            key={d.id}
            title={d.nama}
            subtitle={`Biaya ${d.biaya?.emas || 0} emas · ${engine.ef2(d.efek)}`}
            rightLabel={engine.G.done[d.id] ? 'Selesai' : 'Jalankan'}
            disabled={Boolean(engine.G.done[d.id])}
            onClick={() => engine.dec(d.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'pendidikan' || view === 'edu') {
    const kids = p.anak
      .map((id) => engine.C[id])
      .filter((c): c is Character => Boolean(c && c.hidup && engine.umur(c) < 16));
    const selChild = arg && engine.C[arg] ? engine.C[arg] : kids[0];
    return (
      <ViewShell title="Pendidikan Anak & Ahli Waris" onBack={() => engine.back()} onHome={() => engine.home()}>
        {kids.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada anak di bawah 16 tahun untuk dididik.</div>
        ) : (
          <>
            <SectionHeader title="Pilih Anak" />
            {kids.map((k) => (
              <ListRow
                key={k.id}
                title={k.nama}
                subtitle={`Usia ${engine.umur(k)} · Perang ${k.sk.perang} · Diplomasi ${k.sk.diplomasi} · Pembelajaran ${k.sk.pembelajaran}`}
                rightLabel={selChild?.id === k.id ? 'Dipilih' : 'Pilih'}
                onClick={() => engine.go('edu', k.id)}
              />
            ))}
            {selChild && (
              <>
                <SectionHeader title={`Tugaskan Guru untuk ${selChild.nama}`} />
                {Object.entries(TUTORS).map(([tid, t]) => (
                  <ListRow
                    key={tid}
                    title={`${t.nama} (${t.biaya} Emas)`}
                    subtitle={t.desc}
                    onClick={() => engine.educateChild(selChild.id, tid)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'ordo') {
    const isChristian = engine.AG(p.agama).keluarga === 'kristen';
    return (
      <ViewShell title="Ordo Ksatria" onBack={() => engine.back()} onHome={() => engine.home()}>
        {!isChristian && (
          <div className="p-4 bg-[#FAF3E0] border-b border-[#E6E1D3] text-xs text-[#991B1B]">
            Pembatasan Agama: Ordo Ksatria Salib Eropa hanya menerima ksatria beragama Kristen.
          </div>
        )}
        {Object.entries(ORDERS).map(([id, o]) => {
          const joined = Boolean(engine.G.orders?.[id]);
          return (
            <ListRow
              key={id}
              icon="🛡️"
              title={o.nama}
              subtitle={`${o.bonus} · Biaya ${o.biaya} emas · Syarat ${o.prestiseMin} prestise`}
              rightLabel={joined ? 'Anggota' : !isChristian ? 'Terbatas' : 'Gabung'}
              disabled={joined || !isChristian}
              onClick={() => engine.joinOrder(id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'perjalanan') {
    const dests = Object.values(engine.T)
      .filter((t) => t.tier >= 3 && t.tier <= 6)
      .slice(0, 30);
    return (
      <ViewShell title="Perjalanan & Kunjungan Kerajaan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          {engine.G.travel
            ? `Sedang dalam perjalanan ke ${engine.T[engine.G.travel.to]?.nama} (sisa ${engine.G.travel.years} tahun).`
            : 'Pilih wilayah tujuan perjalanan (15 emas bekal · +10 prestise & +15 opini tuan rumah).'}
        </div>
        {dests.map((t) => (
          <ListRow
            key={t.id}
            icon="🐎"
            title={t.nama}
            subtitle={`Perkiraan ${engine.titleDistance(engine.held(p.id)[0]?.id || p.loc, t.id)} tahun perjalanan`}
            onClick={() => engine.travelTo(t.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'buku') {
    return (
      <ViewShell title="Perpustakaan & Penulisan Kitab" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-2">
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="Judul naskah (opsional)..."
            className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC0] rounded"
          />
          <button
            type="button"
            onClick={() => engine.writeBook(bookTitle)}
            className="w-full py-2 text-xs font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded cursor-pointer"
          >
            Tulis Naskah Baru (20 Emas · Butuh Pembelajaran ≥ 15)
          </button>
        </div>
        <SectionHeader title="Koleksi Naskah Kerajaan" right={`${engine.G.books.length} kitab`} />
        {engine.G.books.map((b, idx) => (
          <ListRow key={idx} icon="📖" title={b.title} subtitle={`Penulis: ${b.author} · Tahun ${b.y}`} />
        ))}
      </ViewShell>
    );
  }

  if (view === 'pengadilan' || view === 'seni') {
    return (
      <ViewShell title="Sidang Istana & Patronase Seni" onBack={() => engine.back()} onHome={() => engine.home()}>
        <ListRow
          icon="⚖️"
          title="Gelar Sidang Pengadilan Kerajaan (15 Emas)"
          subtitle="Selesaikan sengketa bangsawan & petisi rakyat"
          onClick={() => engine.holdCourt()}
        />
        <ListRow
          icon="🎨"
          title="Biayai Seniman & Arsitek Istana (40 Emas)"
          subtitle="+20 Prestise, +4 Kebahagiaan Rakyat, dorong kemajuan Renaisans"
          onClick={() => engine.patronArt()}
        />
      </ViewShell>
    );
  }

  if (view === 'jab' || view === 'kelas' || view === 'gp') {
    const rankInfo = engine.ladderInfo('rank', p);
    const kelasInfo = engine.ladderInfo('kelas', p);
    const commoner = engine.isCommoner(p);
    const muslimCath = engine.isMuslimInCatholicArea(p);
    const clergyLocked = p.agama === 'katolik' && (['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan));
    const milRankRest =
      rankInfo?.next && rankInfo.J.id === 'tentara'
        ? engine.checkMilitaryRestriction('rank', p, rankInfo.next.id)
        : { ok: true };
    return (
      <ViewShell title="Karier Profesi & Status Sosial" onBack={() => engine.back()} onHome={() => engine.home()}>
        {(commoner || muslimCath || clergyLocked) && (
          <div className="p-4 bg-[#FAF3E0] border-b border-[#E6D9B5] text-xs text-[#78350F] space-y-1">
            <div className="font-semibold text-[#1C1917]">Pembatasan Status Sosial, Nikah &amp; Agama</div>
            {clergyLocked && (
              <div>
                Status Nikah ({p.sn}): Jalur Rohaniwan / Orang Gereja Katolik terkunci selama masih menikah atau bertunangan (harus berstatus single/lajang).
              </div>
            )}
            {commoner && (
              <div>
                Status Sosial ({p.kelas.replace(/_/g, ' ')}): Profesi Pengusaha, pangkat Perwira Militer (Kapten/Komandan), dan jabatan Kanselir/Marsekal dikunci hingga naik status.
              </div>
            )}
            {muslimCath && (
              <div>
                Agama (Islam di wilayah mayoritas Katolik): Dinas Prajurit reguler, Juru Tulis Istana Kristen, serta pangkat perwira komando dikunci.
              </div>
            )}
          </div>
        )}
        <SectionHeader title="Pilih / Ganti Profesi (10 Emas)" />
        {(engine.D.profesi || []).map((f: { id: string; nama: string; pendapatan: number }) => {
          const locId = engine.held(p.id)[0]?.id || p.loc || '';
          const rest = engine.checkProfessionRestriction(f.id, p, locId);
          return (
            <ListRow
              key={f.id}
              title={engine.PN(f, p)}
              subtitle={
                rest.ok
                  ? `Pendapatan ${f.pendapatan} emas/th`
                  : rest.reason || `Terkunci (${f.pendapatan} emas/th)`
              }
              rightLabel={p.profesi === f.id ? 'Aktif' : rest.ok ? 'Pilih' : 'Terkunci'}
              disabled={!rest.ok}
              onClick={() => engine.setProf(f.id)}
            />
          );
        })}
        {rankInfo?.next && (
          <>
            <SectionHeader title={`Naik Pangkat: ${rankInfo.next.nama}`} />
            {rankInfo.J.id === 'gereja_katolik' && rankInfo.next.id === 'p5' ? (
              <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#57534E]">
                Paus tidak bisa dipilih langsung lewat karier. Seorang Kardinal harus menang melalui <strong>Konklaf</strong> di menu Gereja saat Takhta Suci kosong.
              </div>
            ) : !milRankRest.ok ? (
              <div className="p-4 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B]">
                {milRankRest.reason}
              </div>
            ) : (
              (rankInfo.next.jalur || []).map((j: { biaya?: { emas?: number }; syarat?: unknown }, idx: number) => (
                <ListRow
                  key={idx}
                  title={`Jalur ${idx + 1} (${j.biaya?.emas || 0} Emas)`}
                  subtitle={
                    (j.syarat ? engine.sTeks(j.syarat, p) : 'Langsung memenuhi syarat') +
                    (rankInfo.J.id === 'gereja_katolik' && rankInfo.next.id === 'p3'
                      ? ` · Maks 1 Uskup Agung di ${engine.realmOf(p).nama}`
                      : '')
                  }
                  onClick={() => engine.naikJab('rank', idx)}
                />
              ))
            )}
          </>
        )}
        {kelasInfo?.next && (
          <>
            <SectionHeader title={`Naik Status: ${kelasInfo.next.nama}`} />
            {(kelasInfo.next.jalur || []).map((j: { biaya?: { emas?: number }; syarat?: unknown }, idx: number) => (
              <ListRow
                key={idx}
                title={`Jalur ${idx + 1} (${j.biaya?.emas || 0} Emas)`}
                subtitle={j.syarat ? engine.sTeks(j.syarat, p) : 'Langsung memenuhi syarat'}
                onClick={() => engine.naikJab('kelas', idx)}
              />
            ))}
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'gelar') {
    return (
      <ViewShell title="Pilih Gelar Utama" onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.held(p.id).map((t) => (
          <ListRow
            key={t.id}
            title={t.nama}
            subtitle={`Tier ${t.tier}`}
            rightLabel={engine.G.primary === t.id ? 'Utama' : 'Pilih'}
            onClick={() => engine.setPrimaryTitle(t.id, t.nama)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'was' || view === 'wasT' || view === 'wasW' || view === 'turun') {
    const curLawId = engine.getEffectiveSuccessionLaw(p);
    const curGenId = engine.LAW('suksesi_gender') || 'agnatik_kognatik';
    const curEmpId = engine.LAW('suksesi_kekaisaran') || 'turun_temurun';
    const curLawInfo = engine.successionLawLabel(curLawId);
    const curGenInfo = engine.successionLawLabel(curGenId);
    const order = engine.getSuccessionOrder(p, 4);
    const primaryHeir = order[0] || null;
    const heldTitles = engine.held(p.id).sort((a, b) => b.tier - a.tier);
    const countyTitles = heldTitles.filter((t) => t.tier <= 3);
    const kidsAlive = p.anak.map((id) => engine.C[id]).filter((c): c is Character => Boolean(c && c.hidup));
    const candidatePool = Array.from(
      new Map<string, Character>(
        [...kidsAlive, ...engine.getSuccessionOrder(p, 8)].map((c) => [c.id, c])
      ).values()
    );
    const realmLaws = ['primogenitur', 'ultimogenitur', 'terbagi', 'tanistri', 'senioritas', 'pemilihan', 'tunjukan'];
    const genderLaws = ['agnatik', 'agnatik_kognatik', 'kesetaraan'];
    const leg = engine.G.legitimacy ?? 85;
    const standings = curLawId === 'pemilihan' ? engine.getElectiveStandings(p) : [];

    return (
      <ViewShell title="Sistem Pewarisan, Wasiat & Turun Tahta" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-1.5 text-xs text-[#44403C]">
          <div>
            Hukum Suksesi Aktif: <strong>{curLawInfo.nama}</strong> · Legitimasi Dinasti:{' '}
            <strong className={`font-num ${leg < 45 ? 'text-[#991B1B]' : 'text-[#166534]'}`}>{leg}/100</strong>
          </div>
          <div className="text-[11px] text-[#57534E]">{curLawInfo.desc}</div>
          {engine.G.successionCrisis && (
            <div className="p-2 bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded">
              <strong>Krisis Suksesi Aktif:</strong> {engine.G.successionCrisis.reason}
            </div>
          )}
          <div>
            Aturan Gender: <strong>{curGenInfo.nama}</strong> — <span className="text-[11px] text-[#57534E]">{curGenInfo.desc}</span>
          </div>
          <div>
            Pewaris Utama:{' '}
            {primaryHeir ? (
              <strong className="text-[#1C1917]">
                {engine.full(primaryHeir)} ({primaryHeir.gender === 'L' ? 'Putra/Pria' : 'Putri/Wanita'}, usia {engine.umur(primaryHeir)} th)
                {engine.umur(primaryHeir) < 16 ? ' · Perwalian (Regency) saat naik tahta' : ''}
              </strong>
            ) : (
              <strong className="text-[#991B1B]">Belum ada ahli waris! Risiko dinasti berakhir (Game Over)</strong>
            )}
          </div>
        </div>

        {curLawId === 'pemilihan' && standings.length > 0 && (
          <>
            <SectionHeader title="Klasemen Pemilihan Bangsawan (Elektif)" right={`${standings.length} kandidat`} />
            {standings.slice(0, 6).map((st, idx) => (
              <ListRow
                key={st.char.id}
                title={`#${idx + 1} ${engine.full(st.char)}`}
                subtitle={`${st.votes} suara dewan/vasal · Skor Dukungan ${Math.round(st.score)}`}
                onClick={() => engine.go('ch', st.char.id)}
              />
            ))}
          </>
        )}

        <SectionHeader title="Garis Pewarisan Tahta" right={`${order.length} urutan`} />
        {order.length === 0 ? (
          <div className="p-4 text-xs text-[#991B1B]">
            Tidak ada anak maupun kerabat dekat yang memenuhi syarat hukum suksesi saat ini.
          </div>
        ) : (
          order.map((c, idx) => {
            const relLabel = p.anak.includes(c.id)
              ? c.gender === 'L' ? 'Putra' : 'Putri'
              : engine.isStep(p, c)
                ? 'Anak Tiri'
                : 'Kerabat Sedarah';
            return (
              <ListRow
                key={c.id}
                title={`#${idx + 1} ${engine.full(c)}`}
                subtitle={`${relLabel} · Usia ${engine.umur(c)} th${idx === 0 ? ' · Pewaris Utama (80% emas & gelar tertinggi)' : ''}`}
                onClick={() => engine.go('ch', c.id)}
              />
            );
          })
        )}

        {heldTitles.length > 0 && (
          <>
            <SectionHeader title="Manajemen Pembagian Tanah (Per-Wilayah)" right={`${heldTitles.length} gelar`} />
            {heldTitles.map((t) => {
              const assignedId = engine.G.was.perWilayah?.[t.id] || '';
              return (
                <div key={t.id} className="px-4 py-2.5 border-b border-[#E6E1D3] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-semibold text-[#1C1917]">{t.nama}</div>
                    <div className="text-[11px] text-[#57534E]">
                      Tier {t.tier} · {assignedId && engine.C[assignedId] ? `Ditetapkan ke ${engine.full(engine.C[assignedId])}` : `Otomatis (${primaryHeir ? engine.full(primaryHeir) : 'Pewaris Hukum'})`}
                    </div>
                  </div>
                  <select
                    value={assignedId}
                    onChange={(e) => engine.assignLandHeir(t.id, e.target.value || null)}
                    className="px-2 py-1 text-xs bg-white border border-[#D6CFC0] rounded"
                  >
                    <option value="">Otomatis (Hukum)</option>
                    {candidatePool.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {engine.full(cand)} ({engine.umur(cand)} th)
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </>
        )}

        <SectionHeader title="Ubah Hukum Suksesi Kerajaan" />
        {realmLaws.map((id) => {
          const info = engine.successionLawLabel(id);
          return (
            <ListRow
              key={id}
              title={info.nama}
              subtitle={info.desc}
              rightLabel={curLawId === id ? 'Aktif' : 'Terapkan'}
              onClick={() => engine.setLaw('suksesi_kerajaan', id)}
            />
          );
        })}

        <SectionHeader title="Ubah Hukum Suksesi Gender" />
        {genderLaws.map((id) => {
          const info = engine.successionLawLabel(id);
          return (
            <ListRow
              key={id}
              title={info.nama}
              subtitle={info.desc}
              rightLabel={curGenId === id ? 'Aktif' : 'Terapkan'}
              onClick={() => engine.setLaw('suksesi_gender', id)}
            />
          );
        })}

        <SectionHeader title="Aturan Suksesi Kekaisaran (Tier 7)" />
        {(['turun_temurun', 'pemilihan_elektor'] as const).map((id) => {
          const info = engine.successionLawLabel(id);
          return (
            <ListRow
              key={id}
              title={info.nama}
              subtitle={info.desc}
              rightLabel={curEmpId === id ? 'Aktif' : 'Terapkan'}
              onClick={() => engine.setLaw('suksesi_kekaisaran', id)}
            />
          );
        })}

        <SectionHeader title="Pengaturan Wasiat" />
        <ListRow
          title={`Wakaf Gereja Saat Wafat (${engine.G.was.gereja ? 'Aktif' : 'Nonaktif'})`}
          subtitle="Serahkan 20% emas ke gereja untuk +25 kesalehan ahli waris"
          onClick={() => {
            engine.G.was.gereja = !engine.G.was.gereja;
            engine.save();
            engine.notify();
          }}
        />
        <ListRow
          title={`Izinkan Anak Tiri Mewarisi (${engine.G.was.allowTiri ? 'Ya' : 'Tidak'})`}
          onClick={() => {
            engine.G.was.allowTiri = !engine.G.was.allowTiri;
            engine.save();
            engine.notify();
          }}
        />
        <SectionHeader title="Tunjuk Pewaris Utama (Wasiat)" />
        {engine.G.was.heir && (
          <ListRow
            title="Batalkan Penunjukan Wasiat (Gunakan Hukum Otomatis)"
            onClick={() => {
              engine.G.was.heir = null;
              engine.save();
              engine.notify();
            }}
          />
        )}
        {candidatePool.map((c) => (
          <ListRow
            key={c.id}
            title={engine.full(c)}
            subtitle={`Usia ${engine.umur(c)} th · ${p.anak.includes(c.id) ? 'Anak Kandung' : engine.isStep(p, c) ? 'Anak Tiri' : 'Kerabat'}`}
            rightLabel={engine.G.was.heir === c.id ? 'Dipilih' : 'Pilih'}
            onClick={() => {
              engine.G.was.heir = c.id;
              engine.save();
              engine.notify();
            }}
          />
        ))}
        <SectionHeader title="Turun Tahta" />
        <ListRow title="Turun Tahta sebagai Biarawan (+40 Kesalehan)" onClick={() => engine.turun('biarawan')} />
        <ListRow title="Turun Tahta & Pensiun (+15 Kebahagiaan)" onClick={() => engine.turun('pensiun')} />
      </ViewShell>
    );
  }

  if (view === 'notif') {
    return (
      <ViewShell title="Notifikasi & Garis Waktu" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader
          title="Notifikasi Istana"
          right={
            <button
              type="button"
              onClick={() => engine.markNotifsRead()}
              className="text-xs font-semibold text-[#9A6614] hover:underline cursor-pointer"
            >
              Tandai Semua Dibaca
            </button>
          }
        />
        {(engine.G.notifs || []).length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada notifikasi.</div>
        ) : (
          engine.G.notifs.map((n, i) => (
            <ListRow
              key={i}
              icon={n.icon}
              title={n.text}
              subtitle={`Tahun ${n.y} · ${n.read ? 'Sudah dibaca' : 'Baru'}`}
            />
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'endgame') {
    const score = engine.computeScore();
    return (
      <ViewShell title="Skor Kerajaan & Pencapaian" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] border-b border-[#E6E1D3] text-center space-y-1">
          <div className="text-xs uppercase tracking-wider text-[#57534E]">Total Skor Kronik</div>
          <div className="font-num text-3xl font-bold text-[#9A6614]">{score}</div>
          <div className="text-xs text-[#44403C]">
            {engine.G.achievements.length}/{ACHIEVEMENTS.length} pencapaian terbuka
          </div>
        </div>
        <SectionHeader title="Daftar Pencapaian" />
        {ACHIEVEMENTS.map((a) => {
          const ok = engine.G.achievements.includes(a.id);
          return (
            <ListRow
              key={a.id}
              icon={ok ? a.icon : '🔒'}
              title={a.nama}
              subtitle={a.desc}
              rightLabel={ok ? 'Terbuka' : 'Terkunci'}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'bigEv' || view === 'renaisans') {
    return (
      <ViewShell title="Era Besar & Bencana Eropa" onBack={() => engine.back()} onHome={() => engine.home()}>
        <ListRow
          icon="🎨"
          title="Era Renaisans"
          subtitle={engine.G.renaissance.unlocked ? `Aktif · Poin Ilmu & Seni: ${engine.G.renaissance.points}` : 'Mulai berkembang tahun 1400'}
        />
        <ListRow
          icon="☠️"
          title="Wabah Pes Hitam (1347+)"
          subtitle={engine.G.blackDeath?.active ? `Berlangsung sejak ${engine.G.blackDeath.started}` : engine.G.blackDeath ? 'Telah berlalu' : 'Belum melanda'}
        />
        <ListRow
          icon="🔥"
          title="Pemberontakan Petani"
          subtitle={engine.G.peasantRevolt?.active ? `Aktif (${engine.G.peasantRevolt.size} petani)` : 'Aman'}
          onClick={() => engine.go('tani')}
        />
      </ViewShell>
    );
  }

  if (view === 'tutorial') {
    return (
      <ViewShell title="Panduan Pemula Kerajaan 1066" onBack={() => engine.back()} onHome={() => (engine.G.pid ? engine.home() : engine.toStart())}>
        <div className="p-5 space-y-3 text-xs sm:text-sm text-[#292524] leading-relaxed">
          <p><strong>1. Dinasti & Suksesi:</strong> Pastikan kamu memiliki ahli waris sebelum penguasa wafat. Atur wasiat di menu Keputusan &rarr; Wasiat.</p>
          <p><strong>2. Ekonomi Wilayah:</strong> Bangun pasar, ladang, atau galangan kapal di provinsi milikmu agar pendapatan emas tahunan terus naik.</p>
          <p><strong>3. Penasihat & Dewan:</strong> Tunjuk Kanselir, Marsekal, Bendahara, dan Telik Sandi dengan kualitas tinggi dan awasi tingkat korupsinya.</p>
          <p><strong>4. Diplomasi & Perang:</strong> Jalin aliansi atau ekspedisi militer terencana, dan pastikan logistik suplai tidak habis di jalan.</p>
          <p><strong>5. Gereja & Sejarah:</strong> Peristiwa historis seperti Hastings, Martin Luther (1517), Pes Hitam (1347), hingga Renaisans (1400) akan membentuk alur duniamu.</p>
        </div>
      </ViewShell>
    );
  }

  if (view === 'lain') {
    return (
      <ViewShell title="Semua Menu, Pencapaian & Ekspor Save" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Arsip & Sistem" />
        <ListRow icon="🏆" title="Skor & Pencapaian Kerajaan" subtitle={`Skor ${engine.computeScore()} · ${engine.G.achievements.length}/${ACHIEVEMENTS.length} terbuka`} onClick={() => engine.go('endgame')} />
        <ListRow icon="🔔" title="Notifikasi & Garis Waktu" onClick={() => engine.go('notif')} />
        <ListRow icon="🎨" title="Era Renaisans & Wabah Besar" onClick={() => engine.go('bigEv')} />
        <ListRow icon="📖" title="Panduan Pemula" onClick={() => engine.go('tutorial')} />
        {engine.isNoble(p) && engine.isRuler(p) && (
          <>
            <ListRow icon="⚖️" title="Hukum Feodal Kerajaan" onClick={() => engine.go('hukum')} />
            <ListRow icon="🏛️" title="Pilih Gelar Utama" onClick={() => engine.go('gelar')} />
          </>
        )}
        <ListRow
          icon="💾"
          title="Simpan Otomatis Sekarang"
          subtitle="Simpan ke memori perangkat (autosave)"
          onClick={() => {
            engine.saveNow();
            engine.showToast('Permainan tersimpan ke database lokal.');
            void engine.listLocalSaves().then(setLocalSlots);
          }}
        />
        <ListRow
          icon="🗂️"
          title="Simpan ke Slot Database Lokal Baru"
          subtitle="Buat cadangan terpisah di database lokal"
          onClick={async () => {
            await engine.saveToLocalSlot();
            setLocalSlots(await engine.listLocalSaves());
          }}
        />
        <ListRow
          icon="📥"
          title="Unduh File Save (.json)"
          subtitle="Langsung unduh cadangan dalam bentuk file .json"
          onClick={() => {
            engine.downloadSaveFile();
          }}
        />
        <input
          ref={importFileRef}
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await engine.importSaveFile(file);
              e.target.value = '';
            }
          }}
          className="hidden"
        />
        <ListRow
          icon="📂"
          title="Muat File Save (.json)"
          subtitle="Pilih file .json dari penyimpanan HP"
          onClick={() => importFileRef.current?.click()}
        />
        {localSlots.length > 0 && (
          <div className="p-4 bg-[#FAF8F2] border-t border-[#E6E1D3] space-y-2">
            <p className="text-xs font-semibold text-[#44403C]">
              Slot Database Lokal ({localSlots.length})
            </p>
            <div className="space-y-1.5">
              {localSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-white border border-[#DDD6C3] rounded-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-[#1C1917] truncate">
                      {slot.label}
                    </div>
                    <div className="text-[11px] text-[#78716C] truncate">
                      {slot.ruler} · Tahun {slot.year} ·{' '}
                      {new Date(slot.savedAt).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => void engine.loadLocalSlot(slot.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded cursor-pointer"
                    >
                      Muat
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await engine.deleteLocalSlot(slot.id);
                        setLocalSlots(await engine.listLocalSaves());
                      }}
                      className="px-2 py-1 text-xs font-medium text-[#991B1B] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] rounded cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <ListRow
          icon="🚪"
          title="Kembali ke Menu Utama"
          subtitle="Mulai permainan baru atau muat skenario lain"
          onClick={() => engine.toStart()}
        />
      </ViewShell>
    );
  }

  if (view === 'hukum') {
    const categories = Object.entries(FEUDAL_LAW_LABELS);
    return (
      <ViewShell title="Hukum Feodal Kerajaan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          Tetapkan peraturan dasar kerajaan mengenai besaran pajak feodal, penegakan hukuman kriminal, dan hak-hak istimewa bangsawan.
        </div>
        {categories.map(([catId, cat]) => {
          const activeOpt = engine.LAW(catId);
          return (
            <div key={catId} className="border-b border-[#DDD6C3]">
              <SectionHeader title={cat.category} />
              <div className="px-4 pt-2 pb-1 text-[11px] text-[#78716C]">{cat.desc}</div>
              {Object.entries(cat.options).map(([optId, opt]) => (
                <ListRow
                  key={optId}
                  title={opt.nama}
                  subtitle={opt.efek}
                  rightLabel={activeOpt === optId ? 'Aktif' : 'Terapkan'}
                  onClick={() => engine.setLaw(catId, optId)}
                />
              ))}
            </div>
          );
        })}
        <SectionHeader title="Hukum Pewarisan Takhta & Gender" />
        <div className="px-4 py-2 text-[11px] text-[#57534E] bg-[#FAF8F2] border-b border-[#E6E1D3]">
          Pilih langsung sistem pewarisan kerajaanmu tanpa terkunci pada aturan elektif atau gavelkind Jerman:
        </div>
        {['primogenitur', 'ultimogenitur', 'terbagi', 'tanistri', 'senioritas', 'pemilihan', 'tunjukan'].map((id) => {
          const info = engine.successionLawLabel(id);
          const curLaw = engine.getEffectiveSuccessionLaw(p);
          return (
            <ListRow
              key={id}
              title={info.nama}
              subtitle={info.desc}
              rightLabel={curLaw === id ? 'Aktif' : 'Terapkan'}
              onClick={() => engine.setLaw('suksesi_kerajaan', id)}
            />
          );
        })}
        <ListRow
          icon="📜"
          title="Buka Pengaturan Wasiat, Gender & Pembagian Tanah"
          subtitle="Tetapkan ahli waris pribadi, aturan gender, dan pembagian per-wilayah"
          onClick={() => engine.go('was')}
        />
      </ViewShell>
    );
  }

  return null;
};
