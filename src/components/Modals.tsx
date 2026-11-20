import React, { useEffect, useState } from 'react';
import { MEDIA } from '../assets/media';
import { engine } from '../engine/gameEngine';
import { GameImage, StatBar } from './GameImage';

export const Modals: React.FC = () => {
  const ev = engine.G?.ev;
  const md = engine.G?.md;
  const over = engine.G?.over;
  const pendingChildId = engine.G?.pendingNaming?.[0];
  const pendingChild = pendingChildId ? engine.C[pendingChildId] : null;
  const pendingCoronation = engine.G?.pendingCoronation;
  const [childNameInput, setChildNameInput] = useState('');
  const [birthCeremony, setBirthCeremony] = useState<'jamuan' | 'berkat' | 'sederhana'>('jamuan');
  const [childRegnalPref, setChildRegnalPref] = useState<'continue' | 'new_dynasty'>('continue');
  const [regnalNameInput, setRegnalNameInput] = useState('');
  const [regnalMode, setRegnalMode] = useState<'continue' | 'new_dynasty' | 'fresh_one'>('continue');

  useEffect(() => {
    if (pendingChild) {
      setChildNameInput(pendingChild.nama || '');
      setBirthCeremony('jamuan');
      setChildRegnalPref(pendingChild.preferredRegnalMode || 'continue');
    }
  }, [pendingChild?.id]);

  useEffect(() => {
    if (pendingCoronation) {
      setRegnalNameInput(pendingCoronation.birthName || '');
      setRegnalMode(
        pendingCoronation.preferredMode ||
          (pendingCoronation.isDifferentDynasty ? 'fresh_one' : 'continue')
      );
    }
  }, [pendingCoronation?.charId, pendingCoronation?.titleId]);

  if (over) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full overflow-hidden shadow-xl">
          <div className="h-40 relative bg-[#1C1917]">
            <GameImage
              src={MEDIA.heroCastle}
              alt="Akhir Dinasti"
              fallbackTitle="Garis Keturunan Berakhir"
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
            <div className="absolute bottom-4 left-5 right-5">
              <h2 className="font-display text-xl font-bold text-white">
                Garis Keturunan Berakhir
              </h2>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-[#44403C] leading-relaxed">
              Tidak ada lagi pewaris sah yang tersisa untuk melanjutkan takhta dan nama dinastimu pada tahun{' '}
              <span className="font-num font-semibold">{engine.G.tahun}</span>.
            </p>
            <button
              type="button"
              onClick={() => engine.toStart()}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
            >
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingChild) {
    const suggestions = engine.getNameSuggestions(pendingChild.id, 4);
    const ancestorNames = engine.getAncestorNameSuggestions(pendingChild.id);
    const mother = pendingChild.ibu ? engine.C[pendingChild.ibu] : null;
    const father = pendingChild.ayah ? engine.C[pendingChild.ayah] : null;
    const birthInfo = engine.G.pendingBirthInfo?.[pendingChild.id];
    const regnalPreview = engine.getChildRegnalPreview(
      pendingChild.id,
      childNameInput || pendingChild.nama
    );
    return (
      <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
        <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full overflow-hidden shadow-xl max-h-[92vh] flex flex-col">
          <div className="px-5 py-3.5 bg-[#ECE7D8] border-b border-[#DDD6C3]">
            <h3 className="font-display text-base font-bold text-[#1C1917]">
              Event Kelahiran: {pendingChild.gender === 'L' ? 'Putra' : 'Putri'} Baru!
            </h3>
            <p className="text-xs text-[#57534E] mt-0.5">
              Tahun <span className="font-num">{engine.G.tahun}</span> · Budaya {pendingChild.budaya} ·{' '}
              {pendingChild.dinasti ? `Dinasti ${engine.DY[pendingChild.dinasti]?.nama || ''}` : 'Tanpa Dinasti'}
            </p>
          </div>
          <div className="p-5 overflow-y-auto space-y-4">
            <div className="text-xs sm:text-sm text-[#292524] leading-relaxed space-y-1.5">
              <p>
                {birthInfo?.isTwin
                  ? 'Kabar sukacita berlipat! Bayi kembar baru lahir dengan selamat dari '
                  : `Seorang ${pendingChild.gender === 'L' ? 'bayi laki-laki' : 'bayi perempuan'} yang sehat telah lahir dari `}
                <strong>{mother ? engine.full(mother) : 'Ibu'}</strong> dan{' '}
                <strong>{father ? engine.full(father) : 'Ayah'}</strong>.
              </p>
              {birthInfo?.careLabel && (
                <div className="inline-block px-2 py-0.5 text-[11px] font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded">
                  Perawatan Kehamilan: {birthInfo.careLabel}
                </div>
              )}
            </div>

            {birthInfo && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#44403C]">
                  Upacara Penyambutan Kelahiran
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {(
                    [
                      {
                        id: 'jamuan',
                        label: 'Jamuan Syukur Istana (-15 Emas)',
                        sub: '+12 Prestise, +5 Legitimasi, +8 Opini Pasangan',
                      },
                      {
                        id: 'berkat',
                        label: 'Doa Syukur & Berkat Rohaniwan (-5 Emas)',
                        sub: '+15 Kesalehan, +6 Kesehatan Bayi',
                      },
                      {
                        id: 'sederhana',
                        label: 'Syukuran Keluarga Sederhana (Gratis)',
                        sub: '+5 Kebahagiaan Keluarga',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setBirthCeremony(opt.id)}
                      className={`text-left px-3 py-2 rounded border cursor-pointer transition-colors ${
                        birthCeremony === opt.id
                          ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                          : 'bg-white border-[#E6E1D3] text-[#44403C]'
                      }`}
                    >
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[11px] text-[#57534E]">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#44403C]">Beri Nama Anak</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={childNameInput}
                  onChange={(e) => setChildNameInput(e.target.value)}
                  placeholder="Masukkan nama..."
                  className="flex-1 px-3 py-2 text-sm bg-white border border-[#D6CFC0] rounded focus:outline-none focus:border-[#9A6614]"
                />
                <button
                  type="button"
                  onClick={() => setChildNameInput(engine.pickCultureName(pendingChild.gender, pendingChild.budaya))}
                  className="px-3 py-2 text-xs font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:bg-[#EFE2C0] rounded cursor-pointer whitespace-nowrap"
                >
                  Acak Nama
                </button>
              </div>
            </div>

            {ancestorNames.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#57534E]">
                  Teruskan Nama Leluhur Silsilah:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ancestorNames.map((an) => (
                    <button
                      key={an.nama}
                      type="button"
                      onClick={() => setChildNameInput(an.nama)}
                      className="px-2.5 py-1 text-xs font-medium bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] hover:border-[#9A6614] rounded cursor-pointer"
                    >
                      {an.nama} <span className="opacity-75">({an.relation})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[11px] text-[#57534E]">Saran Nama Budaya ({pendingChild.budaya}):</div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((nm) => (
                  <button
                    key={nm}
                    type="button"
                    onClick={() => setChildNameInput(nm)}
                    className="px-2.5 py-1 text-xs font-medium bg-white border border-[#D6CFC0] hover:border-[#9A6614] rounded cursor-pointer"
                  >
                    {nm}
                  </button>
                ))}
              </div>
            </div>

            {regnalPreview && (
              <div className="p-3 bg-white border border-[#DDD6C3] rounded space-y-2 text-xs">
                <div className="font-semibold text-[#1C1917]">
                  Proyeksi Penomoran Regnal ({regnalPreview.realmName})
                </div>
                <div className="text-[11px] text-[#57534E]">{regnalPreview.lineageReason}.</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChildRegnalPref('continue')}
                    className={`text-left p-2 rounded border cursor-pointer ${
                      childRegnalPref === 'continue'
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                    }`}
                  >
                    <div className="font-semibold text-[#9A6614]">{regnalPreview.continueLabel}</div>
                    <div className="text-[10px] text-[#57534E]">Lanjutkan silsilah</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChildRegnalPref('new_dynasty')}
                    className={`text-left p-2 rounded border cursor-pointer ${
                      childRegnalPref === 'new_dynasty'
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                    }`}
                  >
                    <div className="font-semibold text-[#9A6614]">{regnalPreview.newNumberLabel}</div>
                    <div className="text-[10px] text-[#57534E]">Mulai nomor baru</div>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  engine.nameChild(
                    pendingChild.id,
                    childNameInput || pendingChild.nama,
                    birthCeremony,
                    childRegnalPref
                  )
                }
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
              >
                Tetapkan Nama &amp; Rayakan
              </button>
              <button
                type="button"
                onClick={() => engine.skipNamingChild(pendingChild.id)}
                className="px-3 py-2.5 text-xs font-medium text-[#57534E] bg-white border border-[#D6CFC0] hover:bg-[#FAF8F2] rounded-md cursor-pointer"
              >
                Bawaan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingCoronation) {
    const corChar = engine.C[pendingCoronation.charId];
    const preview = engine.getCoronationPreview(regnalNameInput || pendingCoronation.birthName);
    if (corChar && preview) {
      const selectedPreviewLabel =
        regnalMode === 'fresh_one'
          ? preview.freshOneLabel
          : regnalMode === 'new_dynasty'
            ? preview.newDynastyLabel
            : preview.continueLabel;
      const showSeparateDynOption =
        preview.newDynastyNumber !== 1 && preview.newDynastyNumber !== preview.continueNumber;
      return (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-3.5 bg-[#ECE7D8] border-b border-[#DDD6C3]">
              <h3 className="font-display text-base font-bold text-[#1C1917]">
                Penobatan &amp; Penentuan Nomor Regnal
              </h3>
              <p className="text-xs text-[#57534E] mt-0.5">
                {preview.titleName} · Penguasa ke-<span className="font-num font-semibold">{preview.ordinal}</span>
              </p>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#292524]">
              <p className="leading-relaxed">
                <strong>{corChar.nama}</strong> naik takhta memimpin <strong>{preview.titleName}</strong> sebagai penguasa ke-
                <span className="font-num font-bold">{preview.ordinal}</span>. Pilih nama takhta (regnal) serta penomorannya:
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#44403C]">Nama Takhta (Regnal Name)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={regnalNameInput}
                    onChange={(e) => setRegnalNameInput(e.target.value)}
                    placeholder={pendingCoronation.birthName}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#D6CFC0] rounded focus:outline-none focus:border-[#9A6614]"
                  />
                  <button
                    type="button"
                    onClick={() => setRegnalNameInput(engine.pickCultureName(corChar.gender, corChar.budaya))}
                    className="px-3 py-2 text-xs font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] rounded cursor-pointer whitespace-nowrap"
                  >
                    Acak
                  </button>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#DDD6C3] rounded space-y-2 text-xs">
                <div className="font-semibold text-[#1C1917]">
                  {preview.sameNameAllCount > 0
                    ? `Nama "${regnalNameInput || pendingCoronation.birthName}" sudah pernah dipakai ${preview.sameNameAllCount} kali sebelumnya di ${preview.titleName}.`
                    : preview.maxNumLineage > 0
                      ? `Nama "${regnalNameInput || pendingCoronation.birthName}" melanjutkan garis leluhur wangsa (${preview.lineageAncestorName || regnalNameInput}).`
                      : `Nama "${regnalNameInput || pendingCoronation.birthName}" belum pernah dipakai di ${preview.titleName}.`}
                </div>
                {preview.isDifferentDynasty && (
                  <div className="text-[11px] text-[#9A6614] font-medium">
                    Pergantian Dinasti terdeteksi ({preview.prevDynastyName} → {corChar.dinasti ? engine.DY[corChar.dinasti]?.nama : 'Dinasti Baru'}): kamu dapat melanjutkan urutan regnal lama atau memulai nomor baru (I).
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setRegnalMode('continue')}
                    className={`w-full text-left p-2.5 rounded border cursor-pointer ${
                      regnalMode === 'continue'
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                    }`}
                  >
                    <div className="font-semibold">
                      Lanjutkan Silsilah Sebelumnya: <span className="text-[#9A6614]">{preview.continueLabel}</span>
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      Melanjutkan hitungan historis takhta &amp; leluhur silsilah di {preview.titleName}.
                    </div>
                  </button>
                  {showSeparateDynOption && (
                    <button
                      type="button"
                      onClick={() => setRegnalMode('new_dynasty')}
                      className={`w-full text-left p-2.5 rounded border cursor-pointer ${
                        regnalMode === 'new_dynasty'
                          ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                          : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                      }`}
                    >
                      <div className="font-semibold">
                        Ikuti Urutan Khusus Dinasti Ini: <span className="text-[#9A6614]">{preview.newDynastyLabel}</span>
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        Menghitung khusus penguasa bernama sama dari dinasti saat ini di {preview.titleName}.
                      </div>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRegnalMode('fresh_one')}
                    className={`w-full text-left p-2.5 rounded border cursor-pointer ${
                      regnalMode === 'fresh_one'
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                    }`}
                  >
                    <div className="font-semibold">
                      Mulai Nomor Regnal Baru (I): <span className="text-[#9A6614]">{preview.freshOneLabel}</span>
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      Memulai penomoran dari I sebagai penguasa awal dinasti atau era baru.
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => engine.confirmCoronation(regnalNameInput || pendingCoronation.birthName, regnalMode)}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
                >
                  Nobatkan: {selectedPreviewLabel}
                </button>
                <button
                  type="button"
                  onClick={() => engine.skipCoronation()}
                  className="px-3 py-2.5 text-xs font-medium text-[#57534E] bg-white border border-[#D6CFC0] hover:bg-[#FAF8F2] rounded-md cursor-pointer"
                >
                  Bawaan
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (ev) {
    return (
      <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
        <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full overflow-hidden shadow-xl max-h-[88vh] flex flex-col">
          <div className="h-32 relative bg-[#1C1917] shrink-0">
            <GameImage
              src={MEDIA.sceneCourt}
              alt={ev.judul}
              fallbackTitle={ev.judul}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <h3 className="font-display text-lg font-bold text-white absolute bottom-3 left-4 right-4">
              {ev.judul}
            </h3>
          </div>
          <div className="p-5 overflow-y-auto space-y-4">
            <p className="text-sm text-[#292524] leading-relaxed">{ev.teks}</p>
            <div className="space-y-2">
              {ev.pilihan.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => engine.evc(idx)}
                  className="w-full text-left py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
                >
                  {opt.teks}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (md && md.kind === 'acc_reject') {
    const target = engine.C[md.targetId];
    return (
      <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
        <div className="bg-[#FAF8F2] border border-[#DDD6C3] rounded-lg max-w-md w-full overflow-hidden shadow-xl max-h-[88vh] flex flex-col">
          <div className="px-5 py-3.5 bg-[#ECE7D8] border-b border-[#DDD6C3]">
            <h3 className="font-display text-base font-bold text-[#1C1917]">{md.title}</h3>
            {target && (
              <p className="text-xs text-[#57534E] mt-0.5">{engine.full(target)}</p>
            )}
          </div>
          <div className="p-5 overflow-y-auto space-y-3">
            <div className="space-y-2">
              {md.factors.map(([name, val]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs text-[#44403C] mb-0.5">
                    <span>{name}</span>
                    <span className="font-num font-semibold">
                      {val > 0 ? '+' : ''}
                      {Math.round(val)}
                    </span>
                  </div>
                  <StatBar value={(val + 40) * 1.25} />
                </div>
              ))}
            </div>
            <p className="text-xs text-[#44403C] pt-2 border-t border-[#E6E1D3]">
              Diterima jika total ≥ 100. Total saat ini:{' '}
              <span className="font-num font-bold text-[#1C1917]">{Math.round(md.total)}</span>
            </p>
            <div className="space-y-2 pt-1">
              {md.onForceAction.type === 'lamar' && (
                <div className="p-2.5 bg-[#F2EDE0] border border-[#DDD6C3] rounded-md space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#57534E]">
                    Naikkan Peluang Lamaran
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      type="button"
                      onClick={() => engine.boostRej('gift')}
                      className="w-full text-left py-1.5 px-3 text-xs font-medium text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded transition-colors cursor-pointer"
                    >
                      Kirim Hadiah Mewah (+25 opini · 50 Emas)
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.boostRej('prestige')}
                      className="w-full text-left py-1.5 px-3 text-xs font-medium text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded transition-colors cursor-pointer"
                    >
                      Pamerkan Martabat Wangsa (+20 opini · 20 Prestise)
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.boostRej('army')}
                      className="w-full text-left py-1.5 px-3 text-xs font-medium text-[#1C1917] bg-[#FAF8F2] hover:bg-[#ECE7D8] border border-[#DDD6C3] rounded transition-colors cursor-pointer"
                    >
                      Unjuk Parade Pasukan (+15 opini · 20 Emas)
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => engine.closeModal()}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors cursor-pointer"
              >
                Oke
              </button>
              {md.canUltimatum && (
                <button
                  type="button"
                  onClick={() => engine.executeModalUltimatum()}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#78350F] hover:bg-[#5C280B] rounded-md transition-colors cursor-pointer"
                >
                  Kirim Ultimatum (15 Prestise)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
