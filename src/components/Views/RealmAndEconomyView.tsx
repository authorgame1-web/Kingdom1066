import React, { useState } from 'react';
import { getBannerForRoute } from '../../assets/media';
import { engine, LUXURY_GOODS } from '../../engine/gameEngine';
import { ListRow, SectionHeader, ViewShell } from '../GameImage';
import { WorldMapView } from '../WorldMapView';

interface Props {
  view: string;
  arg?: string;
}

export const RealmAndEconomyView: React.FC<Props> = ({ view, arg }) => {
  const p = engine.me();
  const heldTitles = engine.held(p.id);
  const creatableRanks = engine.getCreatableTitleRanks(p);
  const [newRankId, setNewRankId] = useState(creatableRanks[0]?.id || 'knight');
  const [newTitleName, setNewTitleName] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [attachLandId, setAttachLandId] = useState('');

  const rulerOnlyRealmViews = new Set(['vasal', 'ciptagelar', 'bentuk', 'paj', 'riset', 'ekspedisi', 'pv']);
  if (rulerOnlyRealmViews.has(view) && (!engine.isNoble(p) || !engine.isRuler(p))) {
    return (
      <ViewShell title="Akses Wilayah Terkunci" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] space-y-3 text-xs text-[#44403C]">
          <div className="text-sm font-bold text-[#991B1B]">
            Khusus Bangsawan &amp; Penguasa Wilayah
          </div>
          <p className="leading-relaxed">
            Pengelolaan vasal, pajak negara, penciptaan gelar bangsawan, pembentukan kerajaan, dan skriptorium kerajaan hanya tersedia bagi Bangsawan yang memegang wilayah feodal.
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

  if ((view === 'usaha' || view === 'trade') && !engine.canBusiness(p)) {
    return (
      <ViewShell title="Akses Niaga Terkunci" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] space-y-3 text-xs text-[#44403C]">
          <div className="text-sm font-bold text-[#991B1B]">
            Khusus Warga Kota / Pengusaha atau Bangsawan
          </div>
          <p className="leading-relaxed">
            Membuka usaha niaga gilda dan rute kafilah dagang mensyaratkan status <strong>Warga Kota / Pengusaha</strong>, profesi pedagang/pengusaha, atau gelar <strong>Bangsawan</strong>. Rakyat jelata perlu naik status terlebih dahulu di menu Karier.
          </p>
          <button
            type="button"
            onClick={() => engine.go('jab')}
            className="px-3 py-1.5 font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
          >
            Buka Karier &amp; Tangga Status
          </button>
        </div>
      </ViewShell>
    );
  }

  if (view === 'prov') {
    const counties = heldTitles.filter((t) => t.tier <= 3 && !t.titular);
    const titulars = heldTitles.filter((t) => t.titular);
    const bd = engine.incomeBreakdown();
    const stateKas = engine.stateTreasury(p);
    const residence = engine.getResidence(p);
    return (
      <ViewShell
        title="Wilayah, Kas Negara & Ekonomi"
        onBack={() => engine.back()}
        onHome={() => engine.home()}
        bannerUrl={getBannerForRoute('prov').url}
        bannerCaption="Tata Ekonomi & Provinsi"
      >
        <div className="p-4 bg-[#FAF8F2] border-b border-[#DDD6C3] space-y-3 text-xs text-[#44403C]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-[#E6E1D3] rounded">
              <div className="text-[11px] uppercase tracking-wider text-[#78716C] font-semibold">
                Uang Pribadi (Dompet Tokoh)
              </div>
              <div className="font-num text-lg font-bold text-[#1C1917] mt-0.5">
                {Math.round(p.res.emas)} Emas{' '}
                <span className="text-xs font-normal text-[#57534E]">
                  ({bd.personalNet >= 0 ? '+' : ''}
                  {bd.personalNet.toFixed(1)}/th)
                </span>
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                Sumber: Profesi +{bd.professionIncome} · Gaji Istana +{bd.courtSalaryIncome} · Usaha +{bd.businessIncome} · Iman +{bd.relRankIncome} · Hunian {bd.residenceIncome >= 0 ? '+' : ''}{bd.residenceIncome}
              </div>
            </div>

            <div className="p-3 bg-white border border-[#E6E1D3] rounded">
              <div className="text-[11px] uppercase tracking-wider text-[#9A6614] font-semibold">
                Kas Negara &amp; Wilayah
              </div>
              {bd.hasRealm ? (
                <>
                  <div className="font-num text-lg font-bold text-[#9A6614] mt-0.5">
                    {Math.round(stateKas)} Emas{' '}
                    <span className="text-xs font-normal text-[#57534E]">
                      ({bd.stateNet >= 0 ? '+' : ''}
                      {bd.stateNet.toFixed(1)}/th)
                    </span>
                  </div>
                  <div className="text-[11px] text-[#57534E] mt-1 space-y-0.5">
                    <div>
                      Pajak Wilayah +{bd.landTax} · Vasal +{bd.vassalTax} · Dagang +{bd.tradeIncome} · Barang Mewah +{bd.luxuryBonus}g
                    </div>
                    <div>
                      Kemakmuran x{bd.prosperityMult} · Hukum Feodal x{bd.feudalLawMult} · Tekno Eko +{bd.techEcoPct}% · Pasukan -{bd.militaryUpkeep} · Pejabat -{bd.advisorCost} · Anggaran Istana -{bd.courtBudgetCost}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => engine.depositToStateKas(25)}
                      className="px-2 py-1 text-[11px] font-semibold bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] text-[#1C1917] rounded cursor-pointer"
                    >
                      Setor Pribadi→Kas (25g)
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.depositToStateKas(100)}
                      className="px-2 py-1 text-[11px] font-semibold bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] text-[#1C1917] rounded cursor-pointer"
                    >
                      Setor 100g
                    </button>
                    <button
                      type="button"
                      onClick={() => engine.drawStateStipend(25)}
                      className="px-2 py-1 text-[11px] font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                    >
                      Tarik Tunjangan (25g)
                    </button>
                  </div>
                  {(() => {
                    const cb = engine.G.courtBudget || { admin: 1, military: 1, court: 1 };
                    const cbs = engine.getCourtBudgetSummary();
                    const labels = ['Hemat', 'Standar', 'Tinggi'];
                    const cats: { key: 'admin' | 'military' | 'court'; name: string; cost: number }[] = [
                      { key: 'admin', name: 'Administrasi', cost: cbs.adminCost },
                      { key: 'military', name: 'Militer', cost: cbs.militaryCost },
                      { key: 'court', name: 'Istana & Diplomasi', cost: cbs.courtCost },
                    ];
                    return (
                      <div className="mt-3 pt-2.5 border-t border-[#E6E1D3] space-y-1.5">
                        <div className="text-[11px] font-semibold text-[#1C1917]">
                          Penganggaran Istana (Total {cbs.totalCost}g/th)
                        </div>
                        {cats.map((cat) => (
                          <div key={cat.key} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[#44403C]">
                              {cat.name} ({cat.cost}g)
                            </span>
                            <div className="flex gap-1">
                              {[0, 1, 2].map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => engine.setCourtBudget(cat.key, lvl as 0 | 1 | 2)}
                                  className={`px-2 py-0.5 rounded border cursor-pointer ${
                                    cb[cat.key] === lvl
                                      ? 'bg-[#9A6614] text-white border-[#9A6614]'
                                      : 'bg-[#FAF8F2] text-[#44403C] border-[#D6CFC0]'
                                  }`}
                                >
                                  {labels[lvl]}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-[11px] text-[#57534E] mt-1">
                  Belum menguasai gelar wilayah/negara. Bangunan, rekrutmen pasukan, &amp; gaji pejabat kelak dibiayai dari Kas Wilayah terpisah dari uang pribadimu.
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-white border border-[#E6E1D3] rounded flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-[#1C1917]">
                Tempat Tinggal: {residence.name} (Tingkat {residence.level})
              </div>
              <div className="text-[11px] text-[#57534E]">{residence.desc}</div>
            </div>
            {residence.nextName && residence.nextCost !== null && (
              <button
                type="button"
                onClick={() => engine.upgradeResidence()}
                className="px-3 py-1.5 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer whitespace-nowrap"
              >
                Pindah ke {residence.nextName} ({residence.nextCost}g Pribadi)
              </button>
            )}
          </div>
        </div>

        <SectionHeader title="Perekonomian & Perdagangan" />
        <ListRow
          icon="⚖️"
          title="Pasar Harga Dinamis"
          subtitle={`Gandum ${engine.G.prices?.grain ?? 2}g · Besi ${engine.G.prices?.iron ?? 5}g · Kain ${engine.G.prices?.cloth ?? 4}g · Rempah ${engine.G.prices?.spice ?? 10}g`}
          onClick={() => engine.go('pasar')}
        />
        {engine.canBusiness(p) && (
          <ListRow
            icon="🐪"
            title="Rute Perdagangan"
            subtitle={`${engine.G.trade.length}/5 kafilah aktif`}
            onClick={() => engine.go('trade')}
          />
        )}
        <ListRow
          icon="🏦"
          title="Pinjaman Bank & Gilda"
          subtitle={`${engine.G.loans.length} pinjaman aktif`}
          onClick={() => engine.go('pinjaman')}
        />
        {engine.canBusiness(p) && (
          <ListRow
            icon="🏪"
            title="Usaha Pengusaha"
            subtitle={`${engine.G.us.length}/4 usaha aktif`}
            onClick={() => engine.go('usaha')}
          />
        )}
        {bd.hasRealm && engine.isNoble(p) && (
          <ListRow
            icon="💰"
            title="Kebijakan Pajak"
            subtitle={`Tarif saat ini: ${engine.PJK()[engine.G.paj ?? 1]?.nama || 'Normal'}`}
            onClick={() => engine.go('paj')}
          />
        )}
        {bd.hasRealm && engine.isNoble(p) && (
          <ListRow
            icon="🧭"
            title="Ekspedisi Samudra (1400+)"
            subtitle={engine.G.tahun >= 1400 ? `${engine.G.expeditions.length} pelayaran tercatat` : 'Terbuka mulai tahun 1400'}
            onClick={() => engine.go('ekspedisi')}
          />
        )}
        <ListRow
          icon="🏛️"
          title={`Kelola ${engine.worshipLabels(p.agama).singular}`}
          subtitle={`${engine.worshipSites().length} tempat ibadah dikelola · +${engine.worshipGoldIncome(p)} emas/th`}
          onClick={() => engine.go('ibadah')}
        />
        {bd.hasRealm && engine.isNoble(p) && (
          <ListRow
            icon="📚"
            title="Perpustakaan & Skriptorium (Riset)"
            subtitle={`Militer Lv.${engine.G.tech?.military || 0} · Ekonomi Lv.${engine.G.tech?.economy || 0}`}
            onClick={() => engine.go('riset')}
          />
        )}
        {bd.hasRealm && engine.isNoble(p) && (
          <ListRow
            icon="⚖️"
            title="Hukum Feodal Wilayah"
            subtitle="Tetapkan pajak feodal, kebijakan hukuman, & hak bangsawan"
            onClick={() => engine.go('hukum')}
          />
        )}

        {bd.hasRealm && (
          <>
            <SectionHeader title="Provinsi Milikmu" right={`${counties.length} wilayah`} />
        {counties.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Kamu belum memiliki wilayah provinsi secara langsung.</div>
        ) : (
          counties.map((t) => {
            const pr = engine.provs(t);
            return (
              <ListRow
                key={t.id}
                icon="🏘️"
                title={t.nama}
                subtitle={`${pr.length} provinsi · Total Ekonomi ${pr.reduce((s, v) => s + v.eko, 0)} · Kas ${Math.round(t.kas || 0)}g`}
                onClick={() => engine.go('pv', t.id)}
              />
            );
          })
        )}
          </>
        )}
        {titulars.length > 0 && (
          <>
            <SectionHeader title="Gelar Tituler (Tanpa Wilayah)" right={`${titulars.length} gelar`} />
            {titulars.map((t) => (
              <ListRow
                key={t.id}
                icon="🎖️"
                title={t.nama}
                subtitle={`Gelar Kehormatan / Tituler (Tier ${t.tier}) tanpa ikatan tanah`}
              />
            ))}
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'pv' && arg) {
    const t = engine.T[arg];
    if (!t) return null;
    const provs = engine.provs(t);
    const buildings = engine.D.bangunan || [];
    return (
      <ViewShell title={`Provinsi di ${t.nama}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        {provs.map((v, idx) => {
          const slots = engine.slotProv(v);
          const qCount = engine.G.q.filter((y) => y.tid === t.id && y.i === idx).length;
          return (
            <div key={idx} className="border-b border-[#DDD6C3]">
              <SectionHeader
                title={v.nama}
                right={`Eko ${v.eko} · Dev ${v.dev} · Slot ${v.b.length + qCount}/${slots}`}
              />
              <div className="px-4 py-2 bg-[#FAF8F2] text-xs text-[#57534E] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Agama: <strong>{engine.AG(v.agama).nama}</strong> · Budaya: <strong>{v.culture}</strong> ·{' '}
                    <strong className={v.pes ? 'text-[#0369A1]' : 'text-[#57534E]'}>
                      {v.pes ? 'Pesisir (Memiliki Perairan & Akses Angkatan Laut)' : 'Pedalaman (Tanpa Akses Laut)'}
                    </strong>
                    {v.unrest !== undefined && v.unrest > 0 ? ` · Keresahan: ${Math.round(v.unrest)}%` : ''}
                    {v.conqueredYear ? ` · Ditelaklukkan Thn ${v.conqueredYear}` : ''}
                  </span>
                  {v.agama !== p.agama && (
                    <button
                      type="button"
                      onClick={() => engine.convertProvince(t.id, idx)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
                    >
                      Kirim Misionaris (20 Kesalehan, 15 Emas)
                    </button>
                  )}
                </div>
                {v.culture !== p.budaya && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#E6E1D3]">
                    <span className="text-[11px] text-[#78350F] font-medium">
                      Asimilasi Budaya ({v.culture} → {p.budaya}):
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => engine.setProvinceAssimilation(t.id, idx, 'integrasi')}
                        className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                          v.assimilationPolicy === 'integrasi'
                            ? 'bg-[#166534] text-white border-[#166534]'
                            : 'bg-white text-[#166534] border-[#BBF7D0]'
                        }`}
                      >
                        Integrasi Budaya (Damai)
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.setProvinceAssimilation(t.id, idx, 'tekan')}
                        className={`px-2 py-1 text-[11px] font-semibold rounded border cursor-pointer ${
                          v.assimilationPolicy === 'tekan'
                            ? 'bg-[#991B1B] text-white border-[#991B1B]'
                            : 'bg-white text-[#991B1B] border-[#FECACA]'
                        }`}
                      >
                        Penindasan Budaya (Cepat)
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {v.b.length > 0 && (
                <div className="px-4 py-2 text-xs text-[#292524]">
                  Terbangun: {v.b.map((bid) => engine.bi(bid)?.nama || bid).join(', ')}
                </div>
              )}
              {buildings.map((b: { id: string; nama: string; biaya: number; waktu_tahun: number; butuh_pesisir?: boolean; efek?: Record<string, number> }) => {
                const blockedCoast = Boolean(b.butuh_pesisir && !v.pes);
                return (
                  <ListRow
                    key={b.id}
                    title={`Bangun ${b.nama}`}
                    subtitle={
                      blockedCoast
                        ? 'Tidak tersedia di provinsi pedalaman (membutuhkan akses perairan/pesisir)'
                        : `Biaya ${b.biaya} emas (Kas Negara) · ${b.waktu_tahun} tahun · ${engine.ef2(b.efek)}`
                    }
                    rightLabel={blockedCoast ? 'Butuh Pesisir' : `${b.biaya}g`}
                    disabled={blockedCoast}
                    onClick={() => engine.bd(t.id, idx, b.id)}
                  />
                );
              })}
            </div>
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'pasar') {
    const pr = engine.G.prices || { grain: 2, iron: 5, cloth: 4, spice: 10 };
    return (
      <ViewShell title="Pasar Komoditas Eropa" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title={`Kurs Harga Tahun ${engine.G.tahun}`} />
        <ListRow title="Gandum" subtitle="Mempengaruhi pasokan pangan saat wabah" rightLabel={`${pr.grain} Emas`} />
        <ListRow title="Besi Tempa" subtitle="Naik tajam saat perang berkecamuk" rightLabel={`${pr.iron} Emas`} />
        <ListRow title="Kain Wol & Sutra" subtitle="Komoditas dagang kota" rightLabel={`${pr.cloth} Emas`} />
        <ListRow title="Rempah Timur" subtitle="Komoditas mewah para bangsawan" rightLabel={`${pr.spice} Emas`} />
        <SectionHeader title="Transaksi Hasil Bumi" />
        <ListRow
          icon="🌾"
          title="Jual 10 Karung Gandum per Wilayah"
          subtitle={`Harga berlaku: ${pr.grain} emas/karung`}
          onClick={() => engine.sellGrain(10)}
        />
      </ViewShell>
    );
  }

  if (view === 'trade') {
    const rulers = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.tierOf(c) >= 3)
      .slice(0, 20);
    const ownedLux = engine.G.luxuryGoods || [];
    return (
      <ViewShell title="Perjanjian & Rute Perdagangan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Akses Barang Mewah Langka" right={`${ownedLux.length} komoditas`} />
        {ownedLux.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">
            Belum ada akses barang mewah langka. Bentuk Perjanjian Dagang lintas wilayah untuk membuka akses sutra, rempah, atau baja Damaskus.
          </div>
        ) : (
          ownedLux.map((gid) => {
            const gDef = LUXURY_GOODS[gid];
            return (
              <ListRow
                key={gid}
                icon="💎"
                title={gDef?.nama || gid}
                subtitle={gDef?.bonusText || 'Komoditas mewah perdagangan jarak jauh'}
                rightLabel="Aktif"
              />
            );
          })
        )}

        <SectionHeader title="Perjanjian Dagang Aktif" right={`${engine.G.trade.length}/5`} />
        {engine.G.trade.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada perjanjian dagang aktif.</div>
        ) : (
          engine.G.trade.map((tr) => {
            const partner = engine.C[tr.with];
            const lux = tr.luxuryGood ? LUXURY_GOODS[tr.luxuryGood] : null;
            return (
              <ListRow
                key={tr.with}
                title={partner ? engine.full(partner) : tr.with}
                subtitle={`+${tr.income} emas/th · Tarif bea masuk -${tr.tariffCut ?? 15}%${
                  tr.neighbor ? ' · Perdagangan Tetangga Lintas Batas' : ''
                }${lux ? ` · Barang Mewah: ${lux.nama}` : ''} (sejak ${tr.start})`}
                rightLabel="Tutup"
                onClick={() => engine.cancelTrade(tr.with)}
              />
            );
          })
        )}
        <SectionHeader title="Bentuk Perjanjian Dagang Baru (Modal 30 Emas)" />
        {rulers.map((r) => (
          <ListRow
            key={r.id}
            title={engine.full(r)}
            subtitle={`${engine.tTitle(r)} · Administrasi ${r.sk.administrasi} · Relasi Dinasti ${engine.getDynastyRelation(p.dinasti, r.dinasti)}`}
            rightLabel="Jalin"
            onClick={() => engine.establishTrade(r.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'pinjaman') {
    return (
      <ViewShell title="Pinjaman Bank & Pemodal" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Pinjaman Aktif" right={`${engine.G.loans.length}/3`} />
        {engine.G.loans.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Kas kerajaan bebas dari utang.</div>
        ) : (
          engine.G.loans.map((ln, idx) => (
            <ListRow
              key={idx}
              title={`Pokok ${ln.amt} Emas`}
              subtitle={`Bunga ${ln.int} emas/tahun (sejak thn ${ln.y})`}
              rightLabel="Lunasi"
              onClick={() => engine.repayLoan(idx)}
            />
          ))
        )}
        <SectionHeader title="Ajukan Pinjaman Baru (Bunga 12%/th)" />
        {[50, 100, 200].map((amt) => (
          <ListRow
            key={amt}
            title={`Pinjam ${amt} Emas`}
            subtitle={`Bunga tahunan ~${Math.max(2, Math.round(amt * 0.12))} emas`}
            onClick={() => engine.takeLoan(amt)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'usaha') {
    const jenis = engine.D.usaha_pengusaha?.jenis || [];
    return (
      <ViewShell title="Usaha Niaga" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Usaha Dimiliki" right={`${engine.G.us.length}/4`} />
        {engine.G.us.map((u, idx) => (
          <ListRow key={idx} title={u.j} subtitle={`Pendapatan ${u.p} emas/th`} />
        ))}
        <SectionHeader title="Buka Usaha Baru" />
        {jenis.map((x: { id: string; nama: string; biaya: number; pendapatan: number }) => (
          <ListRow
            key={x.id}
            title={x.nama}
            subtitle={`Modal ${x.biaya} emas · Pendapatan +${x.pendapatan}/th`}
            onClick={() => engine.usaha(x.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'paj') {
    return (
      <ViewShell title="Kebijakan Pajak" onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.PJK().map((pk: { nama: string; mult: number; bahagia?: number; op?: number }, i: number) => (
          <ListRow
            key={i}
            title={pk.nama}
            subtitle={`Pengali pajak x${pk.mult} · Efek kebahagiaan ${pk.bahagia || 0} · Opini vasal ${pk.op || 0}`}
            rightLabel={engine.G.paj === i ? 'Aktif' : 'Pilih'}
            onClick={() => engine.togglePaj(i)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'ekspedisi') {
    return (
      <ViewShell title="Ekspedisi Samudra" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          Mulai tahun 1400, kapal layar dapat menembus samudra untuk mencari jalur rempah.
        </div>
        <ListRow
          icon="🧭"
          title="Kirim Ekspedisi Pelayaran (60 Emas)"
          subtitle="Butuh Galangan Kapal atau minimal 1 kapal"
          onClick={() => engine.launchExpedition()}
        />
        <SectionHeader title="Riwayat Pelayaran" />
        {engine.G.expeditions.map((ex, i) => (
          <ListRow
            key={i}
            title={`Tahun ${ex.y} · ${ex.result === 'success' ? 'Sukses' : 'Gagal'}`}
            subtitle={ex.result === 'success' ? `Membawa pulang ${ex.gold} emas` : 'Terhadang badai'}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'vasal') {
    const vasals = heldTitles.flatMap((t) =>
      t.kids
        .map((kid) => engine.T[kid])
        .filter((kt) => kt && kt.pem && kt.pem !== p.id)
    );
    return (
      <ViewShell title="Vasal & Peta Kekuasaan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Navigasi Teritorial" />
        <ListRow icon="🗺️" title="Peta Visual & Budaya 1066 (Zoom & Penanda)" subtitle="Peta interaktif Eropa, Afrika Utara, Anatolia & Rus dengan warna gelar, budaya, ibukota, & pelabuhan" onClick={() => engine.go('peta')} />
        <ListRow icon="🏛️" title="Hierarki Gelar Wilayah" subtitle="Telusuri struktur kekaisaran, kerajaan, & county" onClick={() => engine.go('gt')} />
        <ListRow icon="👑" title="Bentuk Kerajaan / Gelar Baru" subtitle="Satukan wilayah menjadi takhta berdaulat" onClick={() => engine.go('bentuk')} />
        <ListRow
          icon="🎖️"
          title="Ciptakan & Anugerahkan Gelar Bangsawan Baru"
          subtitle="Buat gelar bawahan (Raja, Duke, Marquis, Count, Viscount, Baron, Ksatria) dengan atau tanpa wilayah"
          onClick={() => engine.go('ciptagelar')}
        />
        <SectionHeader title="Vasal Bawahan & Kewajiban Feodal" right={`${vasals.length} wilayah`} />
        {vasals.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum memiliki vasal bawahan langsung.</div>
        ) : (
          vasals.map((vt) => {
            const owner = vt.pem && engine.C[vt.pem]?.hidup ? engine.C[vt.pem] : null;
            const ob = engine.getVassalObligation(vt.id);
            const levyShare = engine.getVassalLevyShare(vt.id);
            return (
              <div key={vt.id} className="border-b border-[#E6E1D3]">
                <ListRow
                  title={vt.nama}
                  subtitle={
                    owner
                      ? `${engine.full(owner)} (${engine.getTitleOrdinalInfo(owner, vt)?.label || vt.nama}) · Opini ${Math.round(engine.opn(owner, p))}`
                      : 'Kursi kosong / wali'
                  }
                  onClick={() => owner && engine.go('ch', owner.id)}
                />
                {owner && (
                  <div className="px-4 py-2.5 bg-[#FAF8F2] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[#57534E]">Pajak:</span>
                        {(['rendah', 'normal', 'tinggi'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => engine.setVassalObligation(vt.id, 'tax', lvl)}
                            className={`px-1.5 py-0.5 rounded border capitalize cursor-pointer ${
                              ob.tax === lvl
                                ? 'bg-[#9A6614] text-white border-[#9A6614]'
                                : 'bg-white text-[#44403C] border-[#D6CFC0]'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[#57534E]">Levy:</span>
                        {(['rendah', 'normal', 'tinggi'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => engine.setVassalObligation(vt.id, 'levy', lvl)}
                            className={`px-1.5 py-0.5 rounded border capitalize cursor-pointer ${
                              ob.levy === lvl
                                ? 'bg-[#78350F] text-white border-[#78350F]'
                                : 'bg-white text-[#44403C] border-[#D6CFC0]'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => engine.demandFeudalLevy(vt.id)}
                      className="px-2.5 py-1 font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                    >
                      Tuntut Levy (+{levyShare} Pasukan)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </ViewShell>
    );
  }

  if (view === 'peta') {
    const tops = Object.values(engine.T)
      .filter((t) => t.tier >= 5)
      .sort((a, b) => b.tier - a.tier);
    return (
      <ViewShell title="Peta Visual Kekuasaan & Budaya 1066" onBack={() => engine.back()} onHome={() => engine.home()}>
        <WorldMapView />
        <SectionHeader title="Daftar Kerajaan, Kadipaten & Kekaisaran Utama" />
        {tops.map((t) => {
          const owner = t.pem && engine.C[t.pem]?.hidup ? engine.C[t.pem] : null;
          return (
            <ListRow
              key={t.id}
              icon="👑"
              title={`${t.nama}${t.marquis ? ' (Perbatasan/Marquis)' : ''}`}
              subtitle={`${
                owner ? `${engine.full(owner)} (${engine.getTitleOrdinalInfo(owner, t)?.label || t.nama})` : 'Kosong'
              } · ${t.kids.length} bawahan · Agama ${engine.AG(t.agama).nama}`}
              onClick={() => engine.go('gt', t.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'gt') {
    const roots = arg
      ? [engine.T[arg]].filter(Boolean)
      : Object.values(engine.T).filter((t) => !t.atas && t.tier >= 4);
    const tierDefs = [1, 2, 3, 4, 5, 6, 7].map((tier) =>
      engine.getTitleRights(tier === 4 ? 5 : tier, tier === 4)
    );
    return (
      <ViewShell title="Hierarki Gelar Bangsawan" onBack={() => engine.back()} onHome={() => engine.home()}>
        {!arg && (
          <>
            <SectionHeader title="Tingkatan Gelar & Hak Feodal (Baron → Kaisar)" />
            <div className="p-3 bg-[#FAF8F2] border-b border-[#DDD6C3] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {tierDefs.map((td, idx) => (
                <div key={idx} className="p-2.5 bg-white border border-[#E6E1D3] rounded space-y-0.5">
                  <div className="font-bold text-[#1C1917]">{td.nama}</div>
                  <div className="text-[11px] text-[#57534E]">
                    Maks Demesne: <strong className="font-num">{td.maksProvinsi}</strong> · Maks Vasal:{' '}
                    <strong className="font-num">{td.maksVasal}</strong> · Suara Dewan:{' '}
                    <strong className="font-num">{td.bobotSuara}</strong> · Bonus Pajak:{' '}
                    <strong className="font-num">+{td.taxBonusPct}%</strong>
                  </div>
                  {td.ket && <div className="text-[11px] text-[#78716C]">{td.ket}</div>}
                </div>
              ))}
            </div>
          </>
        )}
        {roots.map((rt) => (
          <div key={rt.id} className="border-b border-[#DDD6C3]">
            <SectionHeader
              title={rt.nama}
              right={
                rt.pem && engine.C[rt.pem]?.hidup
                  ? `${engine.full(engine.C[rt.pem])} (${engine.getTitleOrdinalInfo(engine.C[rt.pem], rt)?.label || ''})`
                  : '—'
              }
            />
            {rt.kids.map((kid) => {
              const kt = engine.T[kid];
              if (!kt) return null;
              const owner = kt.pem && engine.C[kt.pem]?.hidup ? engine.C[kt.pem] : null;
              return (
                <ListRow
                  key={kt.id}
                  title={kt.nama}
                  subtitle={`${
                    owner ? `${engine.full(owner)} (${engine.getTitleOrdinalInfo(owner, kt)?.label || kt.nama})` : '—'
                  } · ${kt.kids.length} sub-wilayah`}
                  onClick={() => (kt.kids.length ? engine.go('gt', kt.id) : owner && engine.go('ch', owner.id))}
                />
              );
            })}
          </div>
        ))}
      </ViewShell>
    );
  }

  if (view === 'bentuk') {
    const list = engine.D.gelar_dapat_dibentuk || [];
    return (
      <ViewShell title="Bentuk Gelar Berdaulat" onBack={() => engine.back()} onHome={() => engine.home()}>
        {list.map((g: { id: string; nama: string; tier: number; syarat: { kuasai_wilayah: string[] } }) => {
          const already = Boolean(engine.T[g.id]);
          const ok = !already && engine.okB(g);
          return (
            <ListRow
              key={g.id}
              title={g.nama}
              subtitle={`Tier ${g.tier} · Syarat kuasai: ${g.syarat.kuasai_wilayah.join(', ')}`}
              rightLabel={already ? 'Sudah Ada' : ok ? 'Bentuk' : 'Belum'}
              onClick={() => !already && engine.bentuk(g.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'riset') {
    const tech = engine.G.tech || { military: 0, economy: 0, activeProject: null };
    const spd = engine.getResearchSpeed(p);
    const proj = tech.activeProject;
    const pct = proj ? Math.min(100, Math.round((proj.progress / Math.max(1, proj.cost)) * 100)) : 0;
    return (
      <ViewShell title="Perpustakaan & Skriptorium Kerajaan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#DDD6C3] space-y-2 text-xs text-[#44403C]">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-[#E6E1D3] rounded">
              <div className="text-[11px] text-[#78716C] uppercase font-semibold">Teknologi Militer</div>
              <div className="font-num text-xl font-bold text-[#991B1B] mt-0.5">Lv.{tech.military} / 10</div>
              <div className="text-[11px] text-[#57534E]">+5% Kekuatan pasukan per level</div>
            </div>
            <div className="p-3 bg-white border border-[#E6E1D3] rounded">
              <div className="text-[11px] text-[#78716C] uppercase font-semibold">Teknologi Ekonomi</div>
              <div className="font-num text-xl font-bold text-[#9A6614] mt-0.5">Lv.{tech.economy} / 10</div>
              <div className="text-[11px] text-[#57534E]">+6% Pajak &amp; perdagangan per level</div>
            </div>
          </div>
          <div className="p-3 bg-white border border-[#E6E1D3] rounded space-y-1">
            <div className="font-semibold text-[#1C1917]">
              Kecepatan Riset: <span className="font-num text-[#9A6614]">+{spd.totalPerYear} poin/tahun</span>
            </div>
            <div className="text-[11px] text-[#57534E]">
              Pusat Ilmu Budaya (Andalusia/Bizantium/Italia): +{spd.cultureBonus} · Perpustakaan &amp; Skriptorium: +{spd.buildingBonus} · Sentra Cendekia: {spd.scholarCenters} provinsi
            </div>
          </div>
          {proj && (
            <div className="p-3 bg-[#FAF3E0] border border-[#E6D9B5] rounded space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-[#78350F]">
                <span>Proyek Aktif: {proj.name}</span>
                <span className="font-num">{proj.progress}/{proj.cost} ({pct}%)</span>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E6D9B5]">
                <div className="h-full bg-[#9A6614]" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <SectionHeader title="Mulai Riset Baru (Modal 35 Emas)" />
        <ListRow
          icon="⚔️"
          title="Riset Taktik & Metalurgi Militer"
          subtitle={`Naikkan Teknologi Militer ke Lv.${tech.military + 1} (+5% kekuatan tempur)`}
          rightLabel={proj ? 'Aktif' : 'Riset (35g)'}
          disabled={Boolean(proj) || tech.military >= 10}
          onClick={() => engine.startTechResearch('military')}
        />
        <ListRow
          icon="📜"
          title="Riset Agronomi, Pembukuan & Niaga"
          subtitle={`Naikkan Teknologi Ekonomi ke Lv.${tech.economy + 1} (+6% pendapatan negara)`}
          rightLabel={proj ? 'Aktif' : 'Riset (35g)'}
          disabled={Boolean(proj) || tech.economy >= 10}
          onClick={() => engine.startTechResearch('economy')}
        />
      </ViewShell>
    );
  }

  if (view === 'ciptagelar') {
    const ranks = engine.getCreatableTitleRanks(p);
    const activeRank = ranks.find((r) => r.id === newRankId) || ranks[0];
    const candidates = engine.getTitleCreationCandidates();
    const activeRecipient =
      candidates.find((c) => c.id === recipientId) || candidates[0];
    const landChoices =
      activeRank && activeRank.tier <= 2
        ? heldTitles.filter((t) => !t.titular && t.tier === 3)
        : heldTitles.filter((t) => !t.titular && t.tier >= 3 && activeRank && t.tier < activeRank.tier);

    return (
      <ViewShell
        title="Ciptakan & Anugerahkan Gelar Baru"
        onBack={() => engine.back()}
        onHome={() => engine.home()}
      >
        <div className="p-4 bg-[#FAF8F2] border-b border-[#DDD6C3] text-xs text-[#44403C] space-y-1">
          <div className="font-bold text-[#1C1917] text-sm">
            Wewenang Takhta: {engine.tTitle(p)} (Tier {engine.tierOf(p)})
          </div>
          <div>
            Kaisar berwenang menciptakan gelar Raja, Duke, Marquis, Count, Viscount, Baron, hingga Ksatria. Raja berwenang menciptakan gelar di bawahnya, dan seterusnya — baik <strong>dengan wilayah</strong> maupun <strong>gelar tituler tanpa wilayah</strong>.
          </div>
        </div>

        {ranks.length === 0 ? (
          <div className="p-4 text-xs text-[#991B1B]">
            Kamu harus memegang minimal gelar Baron (Tier 1) untuk menciptakan gelar Ksatria atau gelar bangsawan bawahan.
          </div>
        ) : (
          <div className="p-4 space-y-4 text-xs bg-white">
            <div>
              <label className="block font-semibold text-[#1C1917] mb-1.5">
                1. Pilih Pangkat Gelar yang Diciptakan ({ranks.length} tersedia di bawah posisimu)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ranks.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setNewRankId(r.id);
                      setAttachLandId('');
                    }}
                    className={`text-left p-2.5 rounded border cursor-pointer ${
                      activeRank?.id === r.id
                        ? 'bg-[#FAF3E0] border-[#9A6614] text-[#1C1917]'
                        : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C]'
                    }`}
                  >
                    <div className="font-bold">{r.nama}</div>
                    <div className="text-[11px] text-[#57534E]">
                      Biaya {r.gold} Emas · +{r.prestigeReward} Prestise Penguasa
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#1C1917]">2. Nama Gelar Baru</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewTitleName(
                        `${activeRank?.prefix || 'Gelar'} ${engine.pickCultureDynastyName(p.budaya).replace(/^(von|van|de|di|da)\s+/i, '')}`
                      )
                    }
                    className="text-[11px] font-semibold text-[#9A6614] hover:underline cursor-pointer"
                  >
                    Saran Nama
                  </button>
                </div>
                <input
                  type="text"
                  value={newTitleName}
                  onChange={(e) => setNewTitleName(e.target.value)}
                  placeholder={`Contoh: ${activeRank?.prefix || 'Gelar'} Mahkota / Elang Emas`}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F2] border border-[#D6CFC0] rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1C1917] mb-1">
                  3. Wilayah Terkait (Opsional)
                </label>
                <select
                  value={attachLandId}
                  onChange={(e) => setAttachLandId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F2] border border-[#D6CFC0] rounded"
                >
                  <option value="">Tanpa Wilayah (Gelar Tituler / Kehormatan Murni)</option>
                  {landChoices.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      Sertakan {lt.nama} (Tier {lt.tier})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1C1917] mb-1">
                4. Pilih Tokoh Penerima Gelar
              </label>
              <select
                value={activeRecipient?.id || ''}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F2] border border-[#D6CFC0] rounded"
              >
                {candidates.map((c) => {
                  const dy = c.dinasti ? engine.DY[c.dinasti] : null;
                  return (
                    <option key={c.id} value={c.id}>
                      {engine.full(c)} ({c.gender === 'P' ? 'P' : 'L'}, {engine.umur(c)}th) · {engine.tTitle(c)}
                      {dy ? ` · Dinasti ${dy.nama}` : ''}
                    </option>
                  );
                })}
              </select>
              {activeRecipient && (
                <div className="mt-1.5 text-[11px] text-[#57534E]">
                  Penerima: <strong>{engine.full(activeRecipient)}</strong> ·{' '}
                  {activeRecipient.gender === 'P' ? 'Perempuan' : 'Laki-laki'} ·{' '}
                  Dinasti: <strong>{activeRecipient.dinasti ? engine.DY[activeRecipient.dinasti]?.nama : 'Tanpa Dinasti'}</strong> ·{' '}
                  <button
                    type="button"
                    onClick={() => engine.go('ch', activeRecipient.id)}
                    className="text-[#9A6614] hover:underline cursor-pointer"
                  >
                    Lihat Orang Tua &amp; Profil
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!activeRank || !activeRecipient}
              onClick={() => {
                if (!activeRank || !activeRecipient) return;
                const fallbackName =
                  newTitleName.trim() ||
                  `${activeRank.prefix} ${activeRecipient.nama}`;
                engine.createAndGrantTitle({
                  rankId: activeRank.id,
                  titleName: fallbackName,
                  recipientId: activeRecipient.id,
                  attachLandId: attachLandId || null,
                });
                setNewTitleName('');
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] disabled:opacity-45 text-white rounded cursor-pointer"
            >
              Ciptakan &amp; Anugerahkan {activeRank?.nama} ({activeRank?.gold || 0} Emas)
            </button>
          </div>
        )}
      </ViewShell>
    );
  }

  return null;
};
