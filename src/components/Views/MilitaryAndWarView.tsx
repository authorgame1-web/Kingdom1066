import React from 'react';
import { getBannerForRoute } from '../../assets/media';
import { engine } from '../../engine/gameEngine';
import { ListRow, SectionHeader, StatBar, ViewShell } from '../GameImage';

interface Props {
  view: string;
  arg?: string;
}

export const MilitaryAndWarView: React.FC<Props> = ({ view, arg }) => {
  const p = engine.me();
  const tier = engine.tierOf(p);
  const eff = engine.provEffects(p);
  const cap = tier ? engine.tn(tier).pasukan_maks + eff.maks_pasukan : 0;
  const totalTroops = Object.values(engine.G.tr).reduce((a, b) => a + b, 0);

  const rulerOnlyMilitaryViews = new Set([
    'pas',
    'perang',
    'wc',
    'siege',
    'kapal',
    'salib',
    'great',
    'logistik',
    'tani',
  ]);
  if (rulerOnlyMilitaryViews.has(view) && (!engine.isNoble(p) || !engine.isRuler(p))) {
    return (
      <ViewShell title="Akses Militer Terkunci" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] space-y-3 text-xs text-[#44403C]">
          <div className="text-sm font-bold text-[#991B1B]">
            Khusus Bangsawan &amp; Penguasa Wilayah
          </div>
          <p className="leading-relaxed">
            Statusmu saat ini (<strong>{p.kelas.replace(/_/g, ' ')}</strong>) belum memegang gelar bangsawan atau wilayah feodal. Rakyat jelata dan pengusaha tidak berwenang membentuk pasukan negara, menyusun logistik militer, maupun menyatakan perang.
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

  if (view === 'pas') {
    return (
      <ViewShell
        title="Militer, Logistik & Ekspedisi Perang"
        onBack={() => engine.back()}
        onHome={() => engine.home()}
        bannerUrl={getBannerForRoute('pas').url}
        bannerCaption="Markas Panglima"
      >
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[#57534E]">Total Pasukan &amp; Kapasitas</div>
            <div className="font-num text-base font-bold text-[#1C1917] mt-0.5">
              {totalTroops} / {cap} prajurit · Kekuatan Tempur {Math.round(engine.pwr(p))}
            </div>
          </div>
          <StatBar value={engine.G.morale ?? 80} label="Moral Pasukan" showText />
        </div>

        <SectionHeader title="Rekrut Pasukan" right={`Era ${engine.lv()}`} />
        {(engine.D.pasukan_jenis || []).map((k: { id: string; tingkat: { nama: string; biaya_rekrut: number; serang: number; bertahan: number }[] }) => {
          const u = k.tingkat[engine.lv() - 1];
          const cost = Math.round(u.biaya_rekrut * 2 * (1 - eff.biaya_rekrut_persen / 100));
          const cavRest = k.id === 'kavaleri' ? engine.checkMilitaryRestriction('recruit_kavaleri', p) : { ok: true };
          return (
            <ListRow
              key={k.id}
              icon="⚔️"
              title={`${u.nama} (${engine.G.tr[k.id] || 0})`}
              subtitle={
                cavRest.ok
                  ? `Serang ${u.serang} · Bertahan ${u.bertahan} · Rekrut +50 seharga ${cost} emas`
                  : cavRest.reason || 'Akses unit militer dikunci'
              }
              rightLabel={cavRest.ok ? `+${cost}g` : 'Terkunci'}
              disabled={!cavRest.ok}
              onClick={() => engine.rec(k.id)}
            />
          );
        })}

        <SectionHeader title="Kampanye & Operasi Militer" />
        <ListRow
          icon="🚩"
          title="Deklarasikan Perang"
          subtitle="Serang wilayah penguasa lain dengan Casus Belli sah"
          onClick={() => engine.go('perang')}
        />
        <ListRow
          icon="🎒"
          title="Logistik & Kampanye Jarak Jauh"
          subtitle={`Suplai ${engine.G.logistics?.supply ?? 100}% · Pengiriman konvoi & penjarahan pangan`}
          onClick={() => engine.go('logistik')}
        />
        <ListRow
          icon="🏰"
          title="Pengepungan Benteng (Reguler & Detail)"
          subtitle="Kepung benteng musuh hingga stok pangan & tembok runtuh"
          onClick={() => engine.go('siege')}
        />
        <ListRow
          icon="⛵"
          title="Armada Laut & Kapal Angkut"
          subtitle={
            engine.hasCoastalAccess(p)
              ? `Kapasitas angkut ${engine.kap()} · Kekuatan laut ${engine.navy()} (${engine.getCoastalTitles(p).length} wilayah pesisir)`
              : 'Terkunci — Wilayah pedalaman tanpa perairan tidak dapat memiliki angkatan laut'
          }
          onClick={() => engine.go('kapal')}
        />
        <ListRow
          icon="✠"
          title="Perang Salib"
          subtitle={`${engine.G.crusades.length} ekspedisi aktif`}
          onClick={() => engine.go('salib')}
        />
        <ListRow
          icon="🔥"
          title="Perang Besar & Koalisi"
          subtitle={`${engine.G.greatWars.length} konflik besar berlangsung`}
          onClick={() => engine.go('great')}
        />
        <ListRow
          icon="📜"
          title="Perang Sejarah Eropa"
          subtitle="Pantau dan dukung faksi dalam konflik historis"
          onClick={() => engine.go('hw')}
        />
      </ViewShell>
    );
  }

  if (view === 'perang') {
    const myClaimIds = new Set((engine.G.claims[p.id] || []).map((clm) => clm.id));
    const targets = Object.values(engine.T)
      .filter((t) => t.pem && engine.C[t.pem]?.hidup && t.pem !== p.id && (t.tier <= 5 || myClaimIds.has(t.id)))
      .sort((a, b) => (myClaimIds.has(b.id) ? 1 : 0) - (myClaimIds.has(a.id) ? 1 : 0) || b.tier - a.tier)
      .slice(0, 40);
    return (
      <ViewShell title="Pilih Target Perang" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Wilayah Tetangga & Target Klaim" />
        {targets.map((t) => {
          const owner = t.pem && engine.C[t.pem]?.hidup ? engine.C[t.pem] : null;
          const hasClaim = myClaimIds.has(t.id);
          return (
            <ListRow
              key={t.id}
              icon="⚔️"
              title={`${t.nama}${hasClaim ? ' · Hak Klaim' : ''}`}
              subtitle={
                owner
                  ? `Penguasa: ${engine.full(owner)} · Kekuatan ${Math.round(engine.pwr(owner))}`
                  : 'Tanpa penguasa'
              }
              onClick={() => engine.go('wc', t.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'wc' && arg) {
    const t = engine.T[arg];
    const o = t?.pem ? engine.C[t.pem] : null;
    if (!t || !o) {
      return (
        <ViewShell title="Deklarasi Perang" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#57534E]">Target tidak valid.</div>
        </ViewShell>
      );
    }
    const cbs = [
      { id: 'tak', nama: 'Penaklukan Teritorial', ket: 'Biaya 20 prestise · Langsung gempur' },
      { id: 'klaim', nama: 'Tuntut Klaim Gelar', ket: 'Membutuhkan klaim wilayah atas target' },
      { id: 'suci', nama: 'Perang Suci', ket: 'Khusus penguasa beda kelompok agama (+20 kesalehan)' },
      { id: 'batal', nama: 'Balas Pembatalan Tunangan', ket: 'Khusus bila terkait ikatan pertunangan' },
      { id: 'pemberontakan', nama: 'Penumpasan Vasal Pembangkang', ket: 'Jika target adalah vasalmu' },
      { id: 'pembebasan', nama: 'Pembebasan Kerabat', ket: 'Jika ada kerabat yang ditahan' },
    ];
    return (
      <ViewShell title={`Perang atas ${t.nama}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          Lawan: <strong>{engine.full(o)}</strong> · Kekuatanmu{' '}
          <span className="font-num font-bold">{Math.round(engine.pwr(p))}</span> vs Lawan{' '}
          <span className="font-num font-bold">{Math.round(engine.pwr(o))}</span>
        </div>
        <SectionHeader title="Pilih Alasan Perang (Casus Belli)" />
        {cbs.map((cb) => (
          <ListRow key={cb.id} title={cb.nama} subtitle={cb.ket} onClick={() => engine.war(t.id, cb.id)} />
        ))}
        <SectionHeader title="Kampanye Logistik Bertahap" />
        <ListRow
          icon="🚩"
          title="Berangkatkan Kampanye Militer"
          subtitle={`Butuh perjalanan ${engine.titleDistance(engine.held(p.id)[0]?.id || p.loc, t.id)} tahun menuju benteng musuh`}
          onClick={() => engine.campaignStart(t.id)}
        />
      </ViewShell>
    );
  }

  if (view === 'logistik') {
    const sup = engine.G.logistics?.supply ?? 100;
    const wc = engine.G.warCampaign;
    return (
      <ViewShell title="Logistik & Kampanye Militer" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-3">
          <StatBar value={sup} label="Persediaan Suplai Pasukan" showText />
          {wc ? (
            <div className="text-xs text-[#78350F] font-medium">
              Kampanye aktif menuju {engine.T[wc.tid]?.nama || wc.tid}: tahun {wc.turns}/{wc.distance}
            </div>
          ) : (
            <div className="text-xs text-[#57534E]">Tidak ada kampanye jarak jauh aktif.</div>
          )}
        </div>
        <SectionHeader title="Tindakan Suplai" />
        <ListRow
          icon="🍞"
          title="Kirim Konvoi Perbekalan (+35% Suplai)"
          subtitle="Biaya 25 emas untuk memastikan logistik pasukan terjaga"
          onClick={() => engine.supplyAction()}
        />
        <ListRow
          icon="🌾"
          title="Kumpulkan Pangan Lapangan (+15–30% Suplai)"
          subtitle="Gratis emas, tetapi menurunkan kebahagiaan rakyat sebesar 4"
          onClick={() => engine.forageAction()}
        />
      </ViewShell>
    );
  }

  if (view === 'siege') {
    const targets = Object.values(engine.T)
      .filter((t) => t.pem && engine.C[t.pem]?.hidup && t.pem !== p.id && t.tier <= 3)
      .slice(0, 25);
    const activeDetail = Object.entries(engine.G.siegeDetail || {});
    return (
      <ViewShell title="Pengepungan Benteng" onBack={() => engine.back()} onHome={() => engine.home()}>
        {activeDetail.length > 0 && (
          <>
            <SectionHeader title="Pengepungan Terperinci Aktif" />
            {activeDetail.map(([tid, sd]) => (
              <div key={tid} className="p-4 border-b border-[#E6E1D3] space-y-2">
                <div className="text-xs font-bold text-[#1C1917]">
                  {engine.T[tid]?.nama || tid} (Tahun {sd.turns})
                </div>
                <StatBar value={sd.walls} label="Ketahanan Tembok Benteng" />
                <StatBar value={sd.food} label="Cadangan Pangan Bertahan" />
              </div>
            ))}
          </>
        )}
        <SectionHeader title="Mulai Pengepungan Baru" />
        {targets.map((t) => (
          <ListRow
            key={t.id}
            icon="🏰"
            title={t.nama}
            subtitle={`Penguasa: ${t.pem && engine.C[t.pem]?.hidup ? engine.full(engine.C[t.pem]) : '—'}`}
            rightLabel="Kepung (30g)"
            onClick={() => engine.startDetailedSiege(t.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'kapal') {
    const navyStatus = engine.getNavyStatus(p);
    return (
      <ViewShell title="Armada Laut & Galangan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-2 text-xs text-[#44403C]">
          <div>
            Akses Perairan / Pesisir:{' '}
            <strong className={navyStatus.hasWaterAccess ? 'text-[#15803D]' : 'text-[#991B1B]'}>
              {navyStatus.hasWaterAccess
                ? `Ya (${navyStatus.coastalTitles.slice(0, 4).map((t) => t.nama).join(', ')}${navyStatus.coastalTitles.length > 4 ? ` +${navyStatus.coastalTitles.length - 4}` : ''})`
                : 'Tidak Ada (Wilayah Pedalaman)'}
            </strong>
          </div>
          <div>
            Status Galangan Kapal:{' '}
            <strong>{navyStatus.hasShipyard ? 'Tersedia di Pesisir' : 'Belum Dibangun (bangun di provinsi pesisir)'}</strong> ·
            Kapasitas Angkut: <span className="font-num font-bold">{engine.kap()}</span> · Kekuatan Tempur Laut:{' '}
            <span className="font-num font-bold">{engine.navy()}</span>
          </div>
          {!navyStatus.canOperateNavy && (
            <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-[#991B1B]">
              <strong>Aturan Angkatan Laut:</strong> {navyStatus.reason}
            </div>
          )}
        </div>
        <SectionHeader title="Beli Kapal" />
        {(engine.D.kapal || []).map((k: { id: string; nama: string; biaya: number; kapasitas: number; serang: number }) => (
          <ListRow
            key={k.id}
            icon="⛵"
            title={`${k.nama} (Dimiliki: ${engine.G.sh[k.id] || 0})`}
            subtitle={`Kapasitas ${k.kapasitas} · Serang ${k.serang} · Harga ${k.biaya} emas`}
            rightLabel={navyStatus.canOperateNavy ? `${k.biaya}g` : 'Butuh Pesisir & Galangan'}
            disabled={!navyStatus.canOperateNavy}
            onClick={() => engine.buyShip(k.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'salib') {
    return (
      <ViewShell title="Perang Salib" onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.G.crusades.length > 0 && (
          <>
            <SectionHeader title="Perang Salib Aktif" />
            {engine.G.crusades.map((c) => (
              <ListRow
                key={c.id}
                icon="✠"
                title={`Ekspedisi ke ${c.target.nama} (Tahun ${c.turns}/3)`}
                subtitle={`Kekuatan total ${Math.round(c.power)} vs musuh ~${c.target.kekuatan} · ${c.allies.length} sekutu`}
                rightLabel="Bantu (20g)"
                onClick={() => engine.contributeCrusade(c.id)}
              />
            ))}
          </>
        )}
        <SectionHeader title="Serukan Perang Salib Baru" />
        {engine.CRUSADE_TARGETS.map((t) => (
          <ListRow
            key={t.id}
            icon="⚔️"
            title={t.nama}
            subtitle={`Musuh ${t.kekuatan} · Hadiah ${t.hadiah.emas} emas, +${t.hadiah.prestise} prestise, +${t.hadiah.kesalehan} kesalehan`}
            onClick={() => engine.callCrusade(t.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'great') {
    const targets = Object.values(engine.T).filter((t) => t.tier >= 5 && t.pem && engine.C[t.pem]?.hidup && t.pem !== p.id);
    return (
      <ViewShell title="Perang Besar & Koalisi" onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.G.greatWars.map((w) => (
          <div key={w.tid} className="p-4 bg-[#FAF3E0] border-b border-[#E6D9B5] text-xs text-[#78350F]">
            <strong>Aktif ke {w.target}</strong> (Tahun {w.turns}/5) · Kekuatanmu {Math.round(w.myPower)} vs Lawan{' '}
            {Math.round(w.theirPower)}
          </div>
        ))}
        <SectionHeader title="Deklarasikan Perang Besar (Butuh ≥2 Sekutu Militer)" />
        {targets.map((t) => (
          <ListRow
            key={t.id}
            title={t.nama}
            subtitle={`Pemegang: ${t.pem && engine.C[t.pem]?.hidup ? engine.full(engine.C[t.pem]) : '—'}`}
            onClick={() => engine.greatWar(t.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'hw') {
    const wars = engine.D.perang_sejarah || [];
    const logs = engine.G.hwLog || [];
    return (
      <ViewShell title="Perang Sejarah Eropa" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Daftar Konflik Sejarah" />
        {wars.map((w: { id: string; nama: string; mulai: number; akhir: number }) => {
          const st = engine.G.hw?.[w.id];
          return (
            <ListRow
              key={w.id}
              title={w.nama}
              subtitle={`Era ${w.mulai}–${w.akhir} · Status: ${
                st?.aktif ? 'Berlangsung' : st?.selesai ? `Selesai (${st.pemenang})` : 'Belum pecah'
              }`}
            />
          );
        })}
        <SectionHeader title="Catatan Medan Perang Sejarah" />
        {logs.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada catatan perang sejarah.</div>
        ) : (
          <ul className="divide-y divide-[#E6E1D3]">
            {logs.slice(0, 20).map((l, i) => (
              <li key={i} className="px-4 py-2 text-xs text-[#292524]">
                {l}
              </li>
            ))}
          </ul>
        )}
      </ViewShell>
    );
  }

  if (view === 'tani') {
    const r = engine.G.peasantRevolt;
    return (
      <ViewShell title="Pemberontakan Petani" onBack={() => engine.back()} onHome={() => engine.home()}>
        {!r || !r.active ? (
          <div className="p-4 text-xs text-[#57534E]">Saat ini wilayahmu aman dari pemberontakan petani.</div>
        ) : (
          <>
            <div className="p-4 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B]">
              Pasukan pemberontak berjumlah <strong>{r.size}</strong> petani bersenjata (tahun ke-{r.turns}).
            </div>
            <ListRow title="Tumpas dengan Pasukan" subtitle="Gunakan kekuatan militer" onClick={() => engine.quellRevolt('force')} />
            <ListRow title="Negosiasi & Konsesi (50 Emas)" subtitle="+15 Kebahagiaan rakyat" onClick={() => engine.quellRevolt('negi')} />
            <ListRow title="Turunkan Pajak" subtitle="Redakan kemarahan petani" onClick={() => engine.quellRevolt('tax')} />
          </>
        )}
      </ViewShell>
    );
  }

  return null;
};
