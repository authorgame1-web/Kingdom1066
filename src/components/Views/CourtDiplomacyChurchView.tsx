import React, { useState } from 'react';
import { getBannerForRoute } from '../../assets/media';
import { engine, HONORIFICS, REL_RANKS, RULER_REL_LABELS } from '../../engine/gameEngine';
import { SermonTheme, WorshipFocus } from '../../engine/types';
import { ListRow, SectionHeader, StatBar, ViewShell } from '../GameImage';

interface Props {
  view: string;
  arg?: string;
}

export const CourtDiplomacyChurchView: React.FC<Props> = ({ view, arg }) => {
  const p = engine.me();
  const [sectName, setSectName] = useState('');
  const [supportedCand, setSupportedCand] = useState('');
  const [relFilter, setRelFilter] = useState<'all' | 'friends' | 'lovers' | 'rivals'>('all');
  const [honorTargetId, setHonorTargetId] = useState('');

  const nobleCourtViews = new Set(['dip', 'dc', 'spy', 'faksi']);
  const rulerCouncilViews = new Set(['pen', 'pejabat', 'offView', 'pj', 'dewan']);
  if (
    (nobleCourtViews.has(view) && !engine.isNoble(p)) ||
    (rulerCouncilViews.has(view) && (!engine.isNoble(p) || !engine.isRuler(p)))
  ) {
    return (
      <ViewShell title="Akses Istana Terkunci" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-5 bg-[#FAF8F2] space-y-3 text-xs text-[#44403C]">
          <div className="text-sm font-bold text-[#991B1B]">
            Khusus Bangsawan &amp; Penguasa Wilayah
          </div>
          <p className="leading-relaxed">
            Balairung diplomasi antar-penguasa, pengangkatan penasihat istana, Dewan Bangsawan, dan intrik politik hanya terbuka untuk kaum <strong>Bangsawan</strong> atau penguasa berwilayah (saat ini: <strong>{p.kelas.replace(/_/g, ' ')}</strong>).
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

  if (view === 'dip') {
    const allRulers = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.tierOf(c) >= 3)
      .sort((a, b) => engine.tierOf(b) - engine.tierOf(a));
    const rulers = allRulers
      .filter((r) => {
        if (relFilter === 'all') return true;
        const rel = engine.getRulerRelation(r.id);
        if (relFilter === 'lovers') return rel.status === 'kekasih' || rel.romance > 0;
        if (relFilter === 'friends') return ['sekutu_akrab', 'sahabat', 'ramah'].includes(rel.status);
        return ['tegang', 'rival', 'musuh_bebuyutan'].includes(rel.status);
      })
      .slice(0, 35);
    return (
      <ViewShell
        title="Diplomasi, Relationship & Spionase"
        onBack={() => engine.back()}
        onHome={() => engine.home()}
        bannerUrl={getBannerForRoute('dip').url}
        bannerCaption="Balairung Diplomatik"
      >
        <SectionHeader title="Institusi Istana" />
        <ListRow
          icon="👔"
          title="Penasihat & Dewan Kerajaan"
          subtitle="Marsyal, Kanselir, Bendahara & bonus stat manajemen wilayah"
          onClick={() => engine.go('pen')}
        />
        <ListRow
          icon="🏛️"
          title="Dewan Bangsawan & Gelar Kehormatan"
          subtitle="Ajukan rancangan dengan bobot suara serta anugerahkan Honorifics"
          onClick={() => engine.go('dewan')}
        />
        <ListRow
          icon="🕵️"
          title="Spionase Lanjutan & Perjanjian Rahasia"
          subtitle="Sabotase ekonomi, curi teknologi, hasut pemberontakan & pakta rahasia"
          onClick={() => engine.go('spy')}
        />
        <ListRow
          icon="⚔️"
          title="Faksi Istana"
          subtitle={engine.G.faction ? `Memihak: ${engine.FAKSI[engine.G.faction]?.nama || engine.G.faction}` : 'Netral'}
          onClick={() => engine.go('faksi')}
        />
        <ListRow
          icon="💼"
          title="Lamar Jabatan Istana Atasan"
          subtitle={engine.G.job ? 'Sedang menjabat di istana atasan' : 'Cari pos pelayan istana (khusus tier ≤ 2)'}
          onClick={() => engine.go('job')}
        />

        <SectionHeader title="Aliansi Aktif" right={`${engine.G.al.length} perjanjian`} />
        {engine.G.al.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada perjanjian aliansi aktif.</div>
        ) : (
          engine.G.al.map((a, idx) => {
            const o = engine.C[a.id];
            return (
              <ListRow
                key={idx}
                title={o ? engine.full(o) : a.id}
                subtitle={`Jenis: ${a.tp} (sejak ${a.y})`}
                rightLabel="Putus"
                onClick={() => engine.breakAlliance(a.id, a.tp)}
              />
            );
          })
        )}

        <SectionHeader title="Penguasa Eropa & Relationship" right={`${rulers.length} tokoh`} />
        <div className="px-4 py-2 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'friends', label: 'Sahabat & Sekutu' },
            { id: 'lovers', label: 'Asmara / Kekasih' },
            { id: 'rivals', label: 'Tegang & Rival' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRelFilter(tab.id as typeof relFilter)}
              className={`px-2.5 py-1 rounded border cursor-pointer ${
                relFilter === tab.id
                  ? 'bg-[#9A6614] text-white border-[#9A6614]'
                  : 'bg-white text-[#44403C] border-[#D6CFC0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {rulers.map((r) => {
          const rel = engine.getRulerRelation(r.id);
          const ord = engine.getTitleOrdinalInfo(r);
          return (
            <ListRow
              key={r.id}
              title={`${engine.full(r)} · [${rel.label}]`}
              subtitle={`${ord?.label || engine.tTitle(r)} · Opini ${rel.opinion} · Trust ${rel.trust}${
                rel.romance > 0 ? ` · Asmara ${rel.romance}` : ''
              } · Dinasti ${rel.dynRel >= 0 ? '+' : ''}${rel.dynRel}`}
              onClick={() => engine.go('dc', r.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'dc' && arg) {
    const o = engine.C[arg];
    if (!o) return null;
    const deals = engine.D.perjanjian_aliansi || [];
    const rel = engine.getRulerRelation(o.id);
    const ord = engine.getTitleOrdinalInfo(o);
    const intimateCheck = engine.canBeIntimate(o.id);
    const oDyn = o.dinasti ? engine.DY[o.dinasti] : null;
    const oFather = o.ayah ? engine.C[o.ayah] : null;
    const oMother = o.ibu ? engine.C[o.ibu] : null;
    return (
      <ViewShell title={`Relationship & Diplomasi · ${engine.full(o)}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-2.5 text-xs text-[#44403C]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-[#1C1917]">
                {ord?.label || engine.tTitle(o)} ·{' '}
                <span className="text-xs font-normal text-[#57534E]">
                  {o.gender === 'P' ? 'Perempuan' : 'Laki-laki'}
                </span>
              </div>
              <div className="text-[11px] text-[#57534E]">
                Opini: <span className="font-num font-bold">{rel.opinion}</span> · Relasi Dinasti:{' '}
                <span className="font-num font-bold">{rel.dynRel >= 0 ? '+' : ''}{rel.dynRel}</span> · Kekuatan:{' '}
                <span className="font-num font-bold">{Math.round(engine.pwr(o))}</span>
                {oDyn && (
                  <>
                    {' · Dinasti: '}
                    <button
                      type="button"
                      onClick={() => engine.go('dd', oDyn.id)}
                      className="font-semibold text-[#9A6614] hover:underline cursor-pointer"
                    >
                      {oDyn.nama}
                    </button>
                  </>
                )}
              </div>
              <div className="text-[11px] text-[#57534E]">
                <strong>Orang Tua:</strong>{' '}
                Ayah: {oFather ? (
                  <button type="button" onClick={() => engine.go('ch', oFather.id)} className="text-[#9A6614] hover:underline cursor-pointer">
                    {engine.full(oFather)}
                  </button>
                ) : 'Tidak tercatat'}
                {' · '}
                Ibu: {oMother ? (
                  <button type="button" onClick={() => engine.go('ch', oMother.id)} className="text-[#9A6614] hover:underline cursor-pointer">
                    {engine.full(oMother)}
                  </button>
                ) : 'Tidak tercatat'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => engine.go('ch', o.id)}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] text-[#1C1917] rounded cursor-pointer"
              >
                Profil Lengkap
              </button>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${rel.color}`}>
                {rel.label}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[#57534E]">{rel.desc}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <StatBar value={Math.max(0, (rel.trust + 100) / 2)} label={`Kepercayaan (Trust ${rel.trust})`} />
            <StatBar value={rel.romance} label={`Asmara (${rel.romance}/100)`} />
          </div>
        </div>

        <SectionHeader title="Interaksi Relationship Penguasa" />
        <div className="p-3 bg-white border-b border-[#E6E1D3] flex flex-wrap gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => engine.interactRulerRelation(o.id, 'jamuan')}
            className="px-2.5 py-1.5 font-semibold bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] rounded cursor-pointer"
          >
            Jamuan Kehormatan (25g)
          </button>
          <button
            type="button"
            onClick={() => engine.interactRulerRelation(o.id, 'tukar_hadiah')}
            className="px-2.5 py-1.5 font-semibold bg-[#FAF8F2] border border-[#D6CFC0] text-[#1C1917] rounded cursor-pointer"
          >
            Cinderamata Bangsawan (35g)
          </button>
          <button
            type="button"
            onClick={() => engine.interactRulerRelation(o.id, 'kunjungan')}
            className="px-2.5 py-1.5 font-semibold bg-[#FAF8F2] border border-[#D6CFC0] text-[#1C1917] rounded cursor-pointer"
          >
            Berburu Bersama (15g)
          </button>
          <button
            type="button"
            onClick={() => engine.interactRulerRelation(o.id, 'puji_terbuka')}
            className="px-2.5 py-1.5 font-semibold bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded cursor-pointer"
          >
            Pernyataan Persahabatan
          </button>
          {p.gender !== o.gender && (
            <button
              type="button"
              onClick={() => engine.interactRulerRelation(o.id, 'romansa')}
              className="px-2.5 py-1.5 font-semibold bg-[#FDF2F8] border border-[#FBCFE8] text-[#9D174D] rounded cursor-pointer"
            >
              Rayu / Jalin Asmara
            </button>
          )}
          {intimateCheck.ok && (
            <button
              type="button"
              onClick={() => engine.beIntimate(o.id)}
              className="px-2.5 py-1.5 font-semibold bg-[#9D174D] text-white rounded cursor-pointer"
            >
              Bercinta ({engine.getConceptionChance(o.id)}%)
            </button>
          )}
          <button
            type="button"
            onClick={() => engine.makeFriend(o.id)}
            className="px-2.5 py-1.5 font-semibold bg-white border border-[#BBF7D0] text-[#166534] rounded cursor-pointer"
          >
            Jadikan Sahabat
          </button>
          <button
            type="button"
            onClick={() => engine.makeRival(o.id)}
            className="px-2.5 py-1.5 font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded cursor-pointer"
          >
            Tetapkan Rival
          </button>
          <button
            type="button"
            onClick={() => engine.interactRulerRelation(o.id, 'peringatan')}
            className="px-2.5 py-1.5 font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded cursor-pointer"
          >
            Kecam Keras
          </button>
        </div>

        <SectionHeader title="Tawarkan Perjanjian Resmi" />
        {deals.map((d: { id: string; nama: string; biaya_prestise: number; durasi: number }) => (
          <ListRow
            key={d.id}
            title={d.nama}
            subtitle={`Biaya ${d.biaya_prestise} prestise · Durasi ${d.durasi} tahun`}
            onClick={() => engine.prop(o.id, d.id)}
          />
        ))}
        <SectionHeader title="Perjanjian Rahasia (Agen Spionase)" />
        <ListRow
          icon="🤫"
          title="Pakta Non-Agresi Rahasia (25 Emas)"
          subtitle="Mengikat janji rahasia agar tidak saling menyerang (berisiko bocor)"
          onClick={() => engine.proposeSecretTreaty(o.id, 'non_aggression')}
        />
        <ListRow
          icon="🗡️"
          title="Dukungan Klaim Suksesi Rahasia (40 Emas)"
          subtitle="Mengamankan klaim atas gelar utama target saat suksesi berikutnya"
          onClick={() => engine.proposeSecretTreaty(o.id, 'secret_claim')}
        />
        {rel.history.length > 0 && (
          <>
            <SectionHeader title="Riwayat Relationship" />
            <ul className="divide-y divide-[#E6E1D3]">
              {rel.history.map((h, i) => (
                <li key={i} className="px-4 py-2 text-xs text-[#44403C]">
                  {h}
                </li>
              ))}
            </ul>
          </>
        )}
        <SectionHeader title="Aksi Lainnya" />
        <ListRow icon="✉️" title="Kirim Surat Diplomatik" onClick={() => engine.go('sr', o.id)} />
        <ListRow icon="👤" title="Lihat Profil Lengkap" onClick={() => engine.go('ch', o.id)} />
      </ViewShell>
    );
  }

  if (view === 'sr' && arg) {
    const o = engine.C[arg];
    if (!o) return null;
    return (
      <ViewShell title={`Kirim Surat ke ${engine.full(o)}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        {engine.SRT().map((s: { id: string; nama: string; biaya?: { emas?: number }; op?: number }) => (
          <ListRow
            key={s.id}
            icon="✉️"
            title={s.nama}
            subtitle={`Biaya ${s.biaya?.emas || 0} emas · Opini +${s.op || 0}`}
            onClick={() => engine.surat(o.id, s.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'pen' || view === 'pejabat' || view === 'offView') {
    const jobs = engine.D.jabatan || [];
    const councilBonuses = engine.getRoyalCouncilBonuses();
    return (
      <ViewShell title="Dewan Kerajaan & Birokrasi Istana" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-3 bg-[#FAF8F2] border-b border-[#E6E1D3] text-[11px] text-[#57534E]">
          Gaji penasihat disesuaikan skala tingkat wilayah &amp; ekonomi negara serta dibayarkan dari <strong>Kas Negara</strong>. Tokoh Dewan Kerajaan memberikan bonus stat langsung ke manajemen kerajaan.
        </div>
        <SectionHeader title="Bonus Dewan Kerajaan Aktif" />
        <div className="p-3 bg-white border-b border-[#DDD6C3] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {councilBonuses.map((cb) => (
            <div key={cb.roleId} className="p-2.5 bg-[#FAF8F2] border border-[#E6E1D3] rounded space-y-0.5">
              <div className="font-bold text-[#1C1917] flex items-center justify-between">
                <span>{cb.roleName}</span>
                <span className="font-num text-[11px] text-[#9A6614]">Efisiensi {Math.round(cb.efficiency * 100)}%</span>
              </div>
              <div className="text-[11px] text-[#44403C]">
                {cb.officer ? `${engine.full(cb.officer)} (${cb.statLabel} ${cb.statVal})` : 'Kursi Kosong'}
              </div>
              <div className="text-[11px] text-[#166534] font-medium">{cb.bonusText}</div>
            </div>
          ))}
        </div>
        {jobs.map((j: { id: string; nama: string; stat: string; gaji: number }) => {
          const cid = engine.G.pen[j.id];
          const holder = cid && engine.C[cid]?.hidup ? engine.C[cid] : null;
          const od = holder ? engine.officeEnsure(j.id) : null;
          const dynSalary = engine.getOfficeSalary(j.id, p);
          return (
            <div key={j.id} className="border-b border-[#DDD6C3]">
              <SectionHeader
                title={j.nama}
                right={`Stat: ${j.stat} · Gaji ${dynSalary} emas/th`}
              />
              {holder && od ? (
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#1C1917]">{engine.full(holder)}</div>
                      <div className="text-xs text-[#57534E]">
                        Sifat Jabatan: <span className="capitalize font-medium">{od.trait}</span> · Efisiensi{' '}
                        <span className="font-num font-semibold">{Math.round(engine.officeEfficiency(j.id) * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => engine.officePromote(j.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
                      >
                        Promosi (50g)
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.officeInvestigate(j.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#FAF8F2] border border-[#D6CFC0] text-[#1C1917] rounded cursor-pointer"
                      >
                        Audit (30g)
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.go('pj', j.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#FAF8F2] border border-[#D6CFC0] text-[#1C1917] rounded cursor-pointer"
                      >
                        Ganti
                      </button>
                      <button
                        type="button"
                        onClick={() => engine.dismissAdvisor(j.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded cursor-pointer"
                      >
                        Pecat
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatBar value={od.quality} label={`Kualitas (${engine.officeQualityName(od.quality)})`} />
                    <StatBar value={od.loyalty} label={`Loyalitas (${engine.officeLoyaltyName(od.loyalty)})`} />
                    <StatBar value={100 - od.corruption} label={`Integritas (Risiko Korupsi ${od.corruption}%)`} />
                  </div>
                </div>
              ) : (
                <ListRow
                  title="Jabatan Masih Kosong"
                  subtitle={`Tunjuk pejabat berpengalaman untuk memimpin pos ${j.nama} (${dynSalary}g/th)`}
                  rightLabel="Tunjuk"
                  onClick={() => engine.go('pj', j.id)}
                />
              )}
            </div>
          );
        })}
        {engine.G.officerHistory?.length > 0 && (
          <>
            <SectionHeader title="Catatan Birokrasi Terbaru" />
            <ul className="divide-y divide-[#E6E1D3]">
              {engine.G.officerHistory.slice(-10).reverse().map((h, i) => (
                <li key={i} className="px-4 py-2 text-xs text-[#44403C]">
                  <span className="font-num font-bold mr-2">Thn {h.y}</span>
                  {engine.C[h.id]?.nama || h.id} · {h.j} · {h.type}
                  {h.stolen ? ` (-${h.stolen} emas)` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'pj' && arg) {
    const j = (engine.D.jabatan || []).find((x: { id: string; stat?: string }) => x.id === arg);
    const statKey = (j?.stat || 'administrasi') as keyof typeof p.sk;
    const dynSalary = engine.getOfficeSalary(arg, p);
    const cands = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.ageOK(c) && engine.tierOf(c) < 3)
      .sort((a, b) => (b.sk[statKey] || 0) - (a.sk[statKey] || 0))
      .slice(0, 24);
    return (
      <ViewShell title={`Pilih ${j?.nama || arg}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-3 bg-[#FAF8F2] border-b border-[#E6E1D3] text-[11px] text-[#57534E]">
          Gaji jabatan di wilayahmu: <strong className="font-num">{dynSalary} emas/th</strong>. Kandidat wajib memenuhi pengalaman relevan &amp; aturan sosial/agama.
        </div>
        {cands.map((c) => {
          const rest = engine.checkOfficeRestriction(arg, c, p);
          const exp = engine.getOfficeExperienceReq(arg, c);
          return (
            <ListRow
              key={c.id}
              title={engine.full(c)}
              subtitle={
                rest.ok
                  ? `${j?.stat || 'Stat'}: ${c.sk[statKey] || 0} · ${exp.label} · Opini ${Math.round(engine.opn(c, p))}`
                  : rest.reason || 'Terbatasi aturan sosial/agama/pengalaman'
              }
              rightLabel={rest.ok ? 'Angkat' : 'Terkunci'}
              disabled={!rest.ok}
              onClick={() => engine.appoint(arg, c.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'dewan') {
    const members = engine.buildCouncil();
    const vote = engine.G.councilVote;
    const councilBonuses = engine.getRoyalCouncilBonuses();
    const eligibleTargets = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.ageOK(c))
      .slice(0, 25);
    const chosenCid = honorTargetId || eligibleTargets[0]?.id || '';
    return (
      <ViewShell title="Dewan Bangsawan & Gelar Kehormatan" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Ajukan Rancangan ke Dewan" />
        <ListRow title="Rancangan Pajak Darurat (+30 Emas)" subtitle="Suara ditimbang berdasarkan hierarki gelar bangsawan" onClick={() => engine.councilPropose('pajak')} />
        <ListRow title="Mobilisasi Dukungan Perang (+8% Moral)" subtitle="Tingkatkan kesiapan tempur" onClick={() => engine.councilPropose('perang')} />
        <ListRow title="Piagam Reformasi Rakyat (+6 Kebahagiaan)" subtitle="Memperbaiki citra istana" onClick={() => engine.councilPropose('reformasi')} />

        {vote && (
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs space-y-1">
            <div className="font-bold text-[#1C1917]">
              Hasil Sidang Tahun {vote.y} ({vote.type}): {vote.passed ? 'DISETUJUI' : 'DITOLAK'}
            </div>
            {vote.details.map((d, i) => (
              <div key={i} className="text-[#57534E]">{d}</div>
            ))}
          </div>
        )}

        <SectionHeader title="Penganugerahan Gelar Kehormatan (Honorifics)" />
        {eligibleTargets.length > 0 && (
          <div className="p-3 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-[#44403C]">Penerima:</span>
            <select
              value={chosenCid}
              onChange={(e) => setHonorTargetId(e.target.value)}
              className="px-2.5 py-1 bg-white border border-[#D6CFC0] rounded text-xs"
            >
              {eligibleTargets.map((c) => (
                <option key={c.id} value={c.id}>
                  {engine.full(c)} ({engine.tTitle(c)})
                </option>
              ))}
            </select>
          </div>
        )}
        {HONORIFICS.map((h) => {
          const holderId = engine.G.honorifics?.[h.id];
          const holder = holderId && engine.C[holderId]?.hidup ? engine.C[holderId] : null;
          return (
            <div key={h.id} className="px-4 py-2.5 border-b border-[#E6E1D3] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-semibold text-[#1C1917]">
                  🎖️ {h.nama} · <span className="text-[#9A6614]">Biaya {h.cost}g</span>
                </div>
                <div className="text-[11px] text-[#57534E]">
                  +{h.opBonus} Opini permanen · +{h.rulerPrestige} Prestise/th · Pemegang:{' '}
                  <strong>{holder ? engine.full(holder) : 'Kosong'}</strong>
                </div>
              </div>
              <div className="flex gap-1.5">
                {holder && (
                  <button
                    type="button"
                    onClick={() => engine.revokeHonorific(h.id)}
                    className="px-2.5 py-1 font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded cursor-pointer"
                  >
                    Cabut
                  </button>
                )}
                {chosenCid && (
                  <button
                    type="button"
                    onClick={() => engine.grantHonorific(h.id, chosenCid)}
                    className="px-2.5 py-1 font-semibold bg-[#9A6614] text-white rounded cursor-pointer"
                  >
                    Anugerahkan
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <SectionHeader title="Bonus Dewan Kerajaan" />
        <div className="p-3 bg-white border-b border-[#E6E1D3] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {councilBonuses.map((cb) => (
            <div key={cb.roleId} className="p-2 bg-[#FAF8F2] border border-[#E6E1D3] rounded">
              <div className="font-semibold text-[#1C1917]">{cb.roleName}: {cb.officer ? engine.full(cb.officer) : 'Kosong'}</div>
              <div className="text-[11px] text-[#166534]">{cb.bonusText}</div>
            </div>
          ))}
        </div>

        <SectionHeader title="Anggota Dewan Bangsawan" right={`${members.length} tokoh`} />
        {members.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada vasal atau penasihat yang duduk di dewan.</div>
        ) : (
          members.map((m) => {
            const mt = engine.primaryTitle(m);
            const w = Math.max(1, engine.getTitleRights(engine.tierOf(m), Boolean(mt?.marquis)).bobotSuara);
            return (
              <ListRow
                key={m.id}
                title={engine.full(m)}
                subtitle={`${engine.tTitle(m)} · Bobot Suara ${w} · Opini ${Math.round(engine.opn(m, p))}`}
                onClick={() => engine.go('ch', m.id)}
              />
            );
          })
        )}
      </ViewShell>
    );
  }

  if (view === 'spy') {
    const targets = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.tierOf(c) >= 2)
      .slice(0, 20);
    const activeTreaties = (engine.G.secretTreaties || []).filter((st) => st.active);
    return (
      <ViewShell title="Jaringan Spionase & Perjanjian Rahasia" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          Skill Spionase Efektif: <span className="font-num font-bold">{engine.effectiveStat(p, 'spionase')}</span>
          {engine.G.pen.mata && engine.C[engine.G.pen.mata]
            ? ` · Kepala Telik Sandi: ${engine.full(engine.C[engine.G.pen.mata])}`
            : ' · Kepala Telik Sandi belum ditunjuk'}
        </div>

        <SectionHeader title="Perjanjian Rahasia Aktif" right={`${activeTreaties.length} pakta`} />
        {activeTreaties.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada pakta rahasia yang berjalan.</div>
        ) : (
          activeTreaties.map((st) => {
            const partner = engine.C[st.withId];
            return (
              <ListRow
                key={st.id}
                icon="🤫"
                title={`${st.type === 'non_aggression' ? 'Pakta Non-Agresi Rahasia' : 'Klaim Suksesi Rahasia'} · ${partner ? engine.full(partner) : st.withId}`}
                subtitle={`Sejak Tahun ${st.since} · Risiko Bocor ${st.leakRisk}%`}
                rightLabel="Batalkan"
                onClick={() => engine.breakSecretTreaty(st.id)}
              />
            );
          })
        )}

        <SectionHeader title="Operasi Agen Spionase Lanjutan" />
        {targets.map((c) => (
          <div key={c.id} className="p-3.5 border-b border-[#E6E1D3] space-y-2">
            <div>
              <div className="text-sm font-semibold text-[#1C1917]">{engine.full(c)}</div>
              <div className="text-xs text-[#57534E]">
                {engine.tTitle(c)} · Intrigue {c.sk.spionase}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => engine.spyAction('intip', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] rounded cursor-pointer"
              >
                Intip (10g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('fitnah', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] rounded cursor-pointer"
              >
                Fitnah (20g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('sabotase', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] rounded cursor-pointer"
              >
                Sabotase (25g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('sabotase_eko', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FAF3E0] border border-[#E6D9B5] text-[#78350F] rounded cursor-pointer"
              >
                Sabotase Eko (30g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('curi_tekno', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded cursor-pointer"
              >
                Curi Tekno (35g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('hasut_berontak', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FFF7ED] border border-[#FED7AA] text-[#9A3412] rounded cursor-pointer"
              >
                Hasut Pemberontakan (45g)
              </button>
              <button
                type="button"
                onClick={() => engine.proposeSecretTreaty(c.id, 'non_aggression')}
                className="px-2 py-1 text-xs font-medium bg-white border border-[#D6CFC0] rounded cursor-pointer"
              >
                Pakta Non-Agresi (25g)
              </button>
              <button
                type="button"
                onClick={() => engine.proposeSecretTreaty(c.id, 'secret_claim')}
                className="px-2 py-1 text-xs font-medium bg-white border border-[#D6CFC0] rounded cursor-pointer"
              >
                Klaim Rahasia (40g)
              </button>
              <button
                type="button"
                onClick={() => engine.spyAction('bunuh', c.id)}
                className="px-2 py-1 text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded cursor-pointer"
              >
                Asasinasi (60g)
              </button>
            </div>
          </div>
        ))}
      </ViewShell>
    );
  }

  if (view === 'gereja' || view === 'relView') {
    const sites = engine.worshipSites();
    const wLabel = engine.worshipLabels(p.agama);
    const fl = engine.faithLeadershipEnsure();
    const rankInfo = engine.faithRankInfo(p);

    if (p.agama === 'katolik') {
      const pope = engine.G.church.pope ? engine.C[engine.G.church.pope] : null;
      const myRankId = engine.relRankOf(p);
      const myRank = REL_RANKS.find((r) => r.id === myRankId);
      const nextRank = engine.nextRelRank(p);
      const isExcom = Boolean(engine.G.church.excom[p.id]);
      const realm = engine.realmOf(p);
      const realmArch = engine.archbishopOf(realm.id);
      const isPope = myRankId === 'paus' || engine.G.church.pope === p.id;
      const isCardinal = engine.canJoinConclave(p);
      const isArchbishop = myRankId === 'uskup_agung' || realmArch?.id === p.id;
      const popeVacant = !pope || !pope.hidup;
      const lastConclave = engine.G.church.lastConclave;

      return (
        <ViewShell
          title="Gereja Katolik, Takhta Suci & Agama"
          onBack={() => engine.back()}
          onHome={() => engine.home()}
          bannerUrl={getBannerForRoute('agama').url}
          bannerCaption="Katedral & Takhta Suci"
        >
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-1 text-xs text-[#44403C]">
            <div>
              Agamamu: <strong>{engine.AG(p.agama).nama}</strong> · Doktrin Konsili: <strong>{engine.G.church.doctrine}</strong>
            </div>
            <div>
              Wilayah Gerejamu: <strong>{realm.nama}</strong> · Uskup Agung Wilayah:{' '}
              <strong>{realmArch ? engine.full(realmArch) : 'Kosong'}</strong>
            </div>
            <div>
              Paus Saat Ini: <strong>{!popeVacant && pope ? engine.full(pope) : 'Kosong (Konklaf Dewan Kardinal)'}</strong>
            </div>
            {myRank && (
              <div>
                Jabatan Rohanimu: <strong>{myRank.nama}</strong>
              </div>
            )}
            {lastConclave && (
              <div className="text-[11px] text-[#57534E]">
                Konklaf Terakhir (Thn {lastConclave.year}):{' '}
                <strong>{lastConclave.winnerName}</strong> terpilih ({lastConclave.standings[0]?.votes || 1}/{lastConclave.totalVotes} suara Kardinal)
              </div>
            )}
            {isExcom && (
              <div className="text-[#991B1B] font-semibold">
                Kamu sedang diekskomunikasi (-15% pendapatan emas)!
              </div>
            )}
          </div>

          <SectionHeader title="Hierarki Gereja & Konklaf" />
          {(['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan)) && (
            <div className="p-3 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B]">
              <strong>Terkunci (Status Nikah):</strong> Kamu berstatus <strong>{p.sn}</strong>. Menjadi rohaniwan maupun naik jabatan di Gereja Katolik mensyaratkan status single/selibat.
            </div>
          )}
          {nextRank && nextRank.id !== 'paus' && (
            <ListRow
              icon="⛪"
              title={`Naik Pangkat Rohani: ${nextRank.nama}`}
              subtitle={
                ['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan)
                  ? 'Terkunci: Pejabat Gereja Katolik harus berstatus single/selibat'
                  : `Syarat ${nextRank.minPiety} kesalehan (kini ${Math.round(p.res.kesalehan)}) · Min usia ${nextRank.minAge || 18} th${
                      nextRank.id === 'uskup_agung' ? ` · 1 Uskup Agung di ${realm.nama}` : ''
                    }`
              }
              rightLabel={['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan) ? 'Terkunci' : 'Ajukan'}
              disabled={['menikah', 'bertunangan'].includes(p.sn) || Boolean(p.pasangan)}
              onClick={() => engine.advanceRel()}
            />
          )}
          {isCardinal && (
            <ListRow
              icon="🗳️"
              title="Ruang Konklaf Pemilihan Paus (Khusus Kardinal)"
              subtitle={
                popeVacant
                  ? 'Takhta Suci kosong — masuk ke Konklaf untuk melobi & memberi suara'
                  : 'Takhta Suci terisi — tinjau kekuatan dinasti, diplomasi & hasil Konklaf'
              }
              onClick={() => engine.go('konklaf')}
            />
          )}
          {!isCardinal && popeVacant && (
            <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#57534E] leading-relaxed">
              <strong>Takhta Suci sedang kosong.</strong> Ruang Konklaf Pemilihan Paus tertutup rapat dan <strong>hanya bisa diakses oleh Kardinal</strong>; Paus baru akan dipilih oleh Dewan Kardinal pada pergantian tahun.
            </div>
          )}
          {isExcom && (
            <ListRow icon="🙏" title="Mohon Pencabutan Ekskomunikasi" subtitle="60 Emas atau 80 Kesalehan" onClick={() => engine.liftExcom(p.id)} />
          )}

          <SectionHeader title="Wewenang Pejabat Gereja" />
          {(isPope || isArchbishop) && (
            <ListRow
              icon="🔥"
              title="Ekskomunikasi Tokoh"
              subtitle={
                isPope
                  ? 'Wewenang Paus: seluruh umat Katolik'
                  : `Wewenang Uskup Agung: khusus wilayah ${realm.nama}`
              }
              onClick={() => engine.go('excom')}
            />
          )}
          {isPope && (
            <ListRow
              icon="⛔"
              title="Jatuhkan Interdik Kerajaan"
              subtitle="Wewenang khusus Paus Roma"
              onClick={() => engine.go('interdict')}
            />
          )}
          {(isPope || isCardinal) && (
            <ListRow
              icon="📜"
              title="Tetapkan Doktrin Konsili"
              subtitle="Wewenang Kardinal / Paus"
              onClick={() => engine.go('council')}
            />
          )}
          {(isPope || isCardinal || isArchbishop) && (
            <ListRow
              icon="✝️"
              title="Nominasikan Uskup Baru"
              subtitle={`30 Emas · +10 Kesalehan${isArchbishop && !isPope && !isCardinal ? ` · Wilayah ${realm.nama}` : ''}`}
              onClick={() => engine.go('appointB')}
            />
          )}
          {!isPope && !isCardinal && !isArchbishop && (
            <div className="p-4 bg-white border-b border-[#E6E1D3] text-xs text-[#57534E] leading-relaxed">
              Wewenang gereja tinggi terkunci sesuai pangkat: <strong>Uskup Agung</strong> (1 per wilayah) berhak menahbiskan uskup &amp; mengekskomunikasi tokoh di wilayahnya; <strong>Kardinal</strong> berhak mengakses Konklaf Pemilihan Paus &amp; menetapkan doktrin Konsili; hanya <strong>Paus</strong> yang berhak menjatuhkan Interdik serta ekskomunikasi lintas kerajaan.
            </div>
          )}

          <SectionHeader title={`Pengelolaan ${wLabel.singular}`} />
          <ListRow
            icon="🏛️"
            title={`Kelola ${wLabel.singular}`}
            subtitle={`${sites.length} tempat ibadah dikelola · Atur persepuluhan, santunan, skriptorium, & tingkat bangunan`}
            onClick={() => engine.go('ibadah')}
          />

          <SectionHeader title="Agama, Sekte & Reformasi" />
          <ListRow icon="🕯️" title="Pindah Agama / Mazhab" subtitle="Peluk agama lain yang tersedia" onClick={() => engine.go('agama')} />
          <ListRow icon="📖" title="Dirikan Sekte Baru" subtitle="Pilih 1–2 doktrin khusus" onClick={() => engine.go('sekte')} />
          <ListRow icon="⚡" title="Reformasi Sekte" subtitle="Jadikan sektemu mazhab resmi berdaulat" onClick={() => engine.go('reform')} />
          <ListRow icon="🛡️" title="Reformasi Protestan & Perang 30 Tahun" subtitle="Status pergolakan iman abad ke-16" onClick={() => engine.go('prot')} />
        </ViewShell>
      );
    }

    const headerTitleMap: Record<string, string> = {
      islam: 'Dewan Ulama, Syariah & Masjid',
      ortodoks: 'Patriarkat & Sinode Suci Ortodoks',
      protestan: 'Sinode Jemaat & Konsistori Protestan',
      anglikan: 'Gereja Kerajaan Anglikan',
      pagan: 'Kepercayaan Leluhur & Altar Suci',
    };
    const syekh = fl.syekhulIslam ? engine.C[fl.syekhulIslam] : null;
    const pat = fl.patriarch ? engine.C[fl.patriarch] : null;
    const mod = fl.synodModerator ? engine.C[fl.synodModerator] : null;
    const pri = fl.anglicanPrimate ? engine.C[fl.anglicanPrimate] : null;
    const fatwaNames: Record<string, string> = {
      qadi: 'Fatwa Keadilan Qadi (+2 Admin, +3 Emas/th)',
      ummah: 'Fatwa Solidaritas Ummah (+Opini Muslim & Rakyat)',
      ijtihad: 'Fatwa Ijtihad Ilmu (+Pembelajaran & Kesalehan)',
      jihad: 'Fatwa Bela Negeri (+Perang & Moral Pasukan)',
    };

    return (
      <ViewShell
        title={headerTitleMap[p.agama] || 'Institusi Iman & Tempat Ibadah'}
        onBack={() => engine.back()}
        onHome={() => engine.home()}
        bannerUrl={getBannerForRoute('agama').url}
        bannerCaption={engine.AG(p.agama).nama}
      >
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-1.5 text-xs text-[#44403C]">
          <div>
            Agamamu: <strong>{engine.AG(p.agama).nama}</strong>
            {rankInfo && (
              <>
                {' '}· Pangkat: <strong>{rankInfo.curName}</strong>
              </>
            )}
          </div>
          {p.agama === 'islam' && (() => {
            const dom = engine.catholicDominanceCheck();
            return (
              <>
                <div>
                  Syekhul Islam: <strong>{syekh && syekh.hidup ? engine.full(syekh) : 'Kosong'}</strong> · Fatwa Aktif:{' '}
                  <strong>{fl.activeFatwa ? fatwaNames[fl.activeFatwa] : 'Belum ada fatwa'}</strong>
                </div>
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-[#991B1B] leading-relaxed space-y-1">
                  <div>
                    <strong>Dominasi Katolik Eropa ({engine.G.tahun}):</strong> Penguasa Katolik Eropa mengucilkan tokoh Muslim ({engine.G.tahun < 1550 ? '-50' : '-35'} opini &amp; penolakan aliansi/lamaran lintas iman).
                  </div>
                  {dom.catholicDominated && (
                    <div>
                      <strong>Tekanan Opini Publik:</strong> {dom.scopeLabel} →{' '}
                      <span className="font-num font-bold">{dom.penaltyPerYear} Opini Rakyat/tahun</span>. Kelola jemaat masjid &amp; dakwah provinsi untuk meredam tekanan ini.
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          {p.agama === 'ortodoks' && (
            <>
              <div>
                Patriark Ekumenis: <strong>{pat && pat.hidup ? engine.full(pat) : 'Kursi Kosong (Sinode Siap)'}</strong> · Kanon: <strong>{fl.orthodoxCanon}</strong>
              </div>
              <div className="text-[11px] text-[#57534E]">
                Dominasi Katolik Eropa Barat membuat penguasa Katolik bersikap dingin (-15 opini akibat Skisma Timur–Barat 1054).
              </div>
            </>
          )}
          {p.agama === 'protestan' && (
            <>
              <div>
                Moderator Sinode: <strong>{mod && mod.hidup ? engine.full(mod) : 'Kosong'}</strong> · Konfesi: <strong>{fl.protestantConfession}</strong>
              </div>
              <div className="text-[11px] text-[#57534E]">
                Negara-negara Katolik memusuhi ajaran Reformasi (-30 opini &amp; ketegangan menuju Perang 30 Tahun).
              </div>
            </>
          )}
          {p.agama === 'anglikan' && (
            <>
              <div>
                Uskup Agung Anglikan: <strong>{pri && pri.hidup ? engine.full(pri) : 'Belum Ditunjuk'}</strong> · Book of Common Prayer:{' '}
                <strong>{fl.anglicanAct ? 'Disahkan' : 'Belum Disahkan'}</strong>
              </div>
              <div className="text-[11px] text-[#57534E]">
                Penguasa Anglikan berperan sebagai <em>Supreme Governor</em> gereja kerajaan (-30 opini dari takhta Katolik pro-Roma).
              </div>
            </>
          )}
          {p.agama === 'pagan' && (
            <div className="text-[11px] text-[#57534E]">
              Tradisi Kepercayaan Leluhur &amp; Adat Suku ({engine.G.tahun}): Kelola Altar Suci / Kuil Leluhur, bina jemaat adat, dan pertahankan tradisi dari desakan kerajaan Katolik maupun Ortodoks di Eropa.
            </div>
          )}
        </div>

        {rankInfo && rankInfo.nextName && (
          <>
            <SectionHeader title="Jenjang Karier & Majelis Iman" />
            <ListRow
              icon="🕌"
              title={`Naik Pangkat: ${rankInfo.nextName}`}
              subtitle={`Syarat ${rankInfo.minPiety} kesalehan (kini ${Math.round(p.res.kesalehan)}) · Min usia ${rankInfo.minAge} th · Biaya ${rankInfo.goldCost} emas`}
              onClick={() => engine.advanceFaithCareer()}
            />
          </>
        )}

        {p.agama === 'islam' && (
          <>
            <SectionHeader title="Majelis Ulama & Syariah" />
            <ListRow
              icon="☪️"
              title="Sidang Majelis Syura (Pemilihan Syekhul Islam)"
              subtitle="Bersaing menjadi pemimpin tertinggi ulama dengan kesalehan, ilmu & pengaruh dinasti"
              onClick={() => engine.electSyekhulIslam()}
            />
            <ListRow
              icon="🤲"
              title="Salurkan Zakat & Wakaf Sosial (15 Emas)"
              subtitle="+18 Kesalehan, +10 Prestise, +6 Kebahagiaan Rakyat"
              onClick={() => engine.collectZakatSocial()}
            />
            <SectionHeader title="Keluarkan Fatwa (25 Kesalehan)" />
            <ListRow title="Fatwa Keadilan Qadi" subtitle="+2 Administrasi & +3 Emas/tahun" rightLabel={fl.activeFatwa === 'qadi' ? 'Aktif' : 'Terbitkan'} onClick={() => engine.issueFatwa('qadi')} />
            <ListRow title="Fatwa Solidaritas Ummah" subtitle="+6 Kebahagiaan Rakyat & +12 Opini tokoh Muslim" rightLabel={fl.activeFatwa === 'ummah' ? 'Aktif' : 'Terbitkan'} onClick={() => engine.issueFatwa('ummah')} />
            <ListRow title="Fatwa Ijtihad Ilmu" subtitle="+3 Pembelajaran, +15 Prestise & +2 Kesalehan/th" rightLabel={fl.activeFatwa === 'ijtihad' ? 'Aktif' : 'Terbitkan'} onClick={() => engine.issueFatwa('ijtihad')} />
            <ListRow title="Fatwa Bela Negeri" subtitle="+3 Perang & +10% Moral Pasukan" rightLabel={fl.activeFatwa === 'jihad' ? 'Aktif' : 'Terbitkan'} onClick={() => engine.issueFatwa('jihad')} />
          </>
        )}

        {p.agama === 'ortodoks' && (
          <>
            <SectionHeader title="Sinode Suci & Otoritas Patriarkat" />
            <ListRow
              icon="☦️"
              title="Panggil Sinode Pemilihan Patriark"
              subtitle={pat && pat.hidup ? `Saat ini dijabat ${engine.full(pat)}` : 'Kursi kosong — pilih Patriark baru'}
              onClick={() => engine.electOrthodoxPatriarch()}
            />
            <ListRow
              icon="📜"
              title="Tetapkan Kanon Liturgi Bizantium"
              subtitle="+10 Kesalehan & +12 Prestise (Patriark / Metropolit / Penguasa)"
              onClick={() => engine.setOrthodoxCanon('Kanon Liturgi Krisostomus & Konsili Ekumenis')}
            />
            {fl.patriarch === p.id && (
              <ListRow
                icon="🔥"
                title="Jatuhkan Anatema Ortodoks"
                subtitle="Wewenang Patriark terhadap umat Ortodoks"
                onClick={() => engine.go('ortodoks_anatema')}
              />
            )}
          </>
        )}

        {p.agama === 'protestan' && (
          <>
            <SectionHeader title="Sinode Jemaat & Konsistori" />
            <ListRow
              icon="🗳️"
              title="Sidang Sinode Pemilihan Moderator"
              subtitle="Calonkan diri berdasarkan pembelajaran, kesalehan, & diplomasi"
              onClick={() => engine.electSynodModerator()}
            />
            <ListRow
              icon="📖"
              title="Cetak Alkitab Vernakular & Sekolah Jemaat (30 Emas)"
              subtitle="+2 Pembelajaran, +15 Kesalehan, +5 Bahagia Rakyat"
              onClick={() => engine.protestantBibleReform('Konfesi Reformasi Vernakular')}
            />
          </>
        )}

        {p.agama === 'anglikan' && (
          <>
            <SectionHeader title="Gereja Kerajaan & Akta Supremasi" />
            <ListRow
              icon="📖"
              title="Sahkan Book of Common Prayer (35 Emas)"
              subtitle="+25 Prestise, +12 Kesalehan, +5 Bahagia Rakyat"
              rightLabel={fl.anglicanAct ? 'Disahkan' : 'Sahkan'}
              onClick={() => engine.anglicanConfirmAct()}
            />
            <ListRow
              icon="⛪"
              title="Tunjuk Uskup Agung Anglikan"
              subtitle="Khusus Penguasa Anglikan (min. Count)"
              onClick={() => engine.go('anglikan_primate')}
            />
            <ListRow
              icon="💰"
              title="Sekularisasi Biara Kerajaan"
              subtitle="+45 Emas, -10 Kesalehan & menurunkan opini penguasa Katolik"
              onClick={() => engine.anglicanDissolveMonastery()}
            />
          </>
        )}

        <SectionHeader title={`Pengelolaan ${wLabel.singular}`} />
        <ListRow
          icon="🏛️"
          title={`Kelola ${wLabel.singular}`}
          subtitle={`${sites.length} tempat ibadah dikelola · Atur persepuluhan/wakaf, santunan, pendidikan, & dakwah`}
          onClick={() => engine.go('ibadah')}
        />

        <SectionHeader title="Agama, Sekte & Reformasi" />
        <ListRow icon="🕯️" title="Pindah Agama / Mazhab" subtitle="Peluk agama lain yang tersedia" onClick={() => engine.go('agama')} />
        <ListRow icon="📖" title="Dirikan Sekte Baru" subtitle="Pilih 1–2 doktrin khusus" onClick={() => engine.go('sekte')} />
        <ListRow icon="⚡" title="Reformasi Sekte" subtitle="Jadikan sektemu mazhab resmi berdaulat" onClick={() => engine.go('reform')} />
        <ListRow icon="🛡️" title="Reformasi Protestan & Perang 30 Tahun" subtitle="Status pergolakan iman abad ke-16" onClick={() => engine.go('prot')} />
      </ViewShell>
    );
  }

  if (view === 'ibadah') {
    const sites = engine.worshipSites();
    const wLabel = engine.worshipLabels(p.agama);
    const heldCounties = engine.held(p.id).filter((t) => t.tier <= 3);
    const buildCandidates: { tid: string; tName: string; idx: number; pName: string; hasSlot: boolean }[] = [];
    heldCounties.forEach((t) => {
      engine.provs(t).forEach((v, idx) => {
        if (!v.b.includes('gereja') && !v.b.includes('kuil')) {
          const queued = engine.G.q.some((y) => y.tid === t.id && y.i === idx && (y.b === 'gereja' || y.b === 'kuil'));
          if (!queued) {
            const qLen = engine.G.q.filter((y) => y.tid === t.id && y.i === idx).length;
            buildCandidates.push({
              tid: t.id,
              tName: t.nama,
              idx,
              pName: v.nama,
              hasSlot: v.b.length + qLen < engine.slotProv(v),
            });
          }
        }
      });
    });

    const focusOptions: { id: WorshipFocus; label: string; desc: string }[] = [
      { id: 'pajak', label: p.agama === 'islam' ? 'Wakaf & Baitul Mal' : 'Persepuluhan Kas', desc: '+Emas/th' },
      { id: 'santunan', label: 'Santunan Umat', desc: '+Bahagia Rakyat' },
      { id: 'ilmu', label: p.agama === 'islam' ? 'Madrasah' : 'Skriptorium', desc: '+Pembelajaran' },
      { id: 'dakwah', label: p.agama === 'islam' ? 'Dakwah' : 'Misi Iman', desc: '+Konversi Provinsi' },
    ];

    const sermonOptions: { id: SermonTheme; label: string; desc: string }[] = [
      { id: 'harmoni', label: 'Kerukunan Jemaat', desc: '+3 Hubungan & Opini Rakyat' },
      { id: 'amal', label: 'Kas Sosial Jemaat', desc: '+2 Opini Rakyat & +2 Hub/th' },
      { id: 'ajaran', label: 'Pendalaman Kitab', desc: '+3 Kesalehan/th' },
      { id: 'disiplin', label: 'Iuran & Ketertiban', desc: '+25% Iuran Kas Emas' },
    ];

    const relationLabel = (op: number) =>
      op >= 75 ? 'Sangat Erat' : op >= 40 ? 'Harmonis' : op >= 10 ? 'Netral' : op >= -20 ? 'Renggang' : 'Bermusuhan';

    return (
      <ViewShell title={`Pengelolaan ${wLabel.singular} & Jemaat`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C] space-y-1">
          <div>
            Agama: <strong>{engine.AG(p.agama).nama}</strong> · Pemasukan Tempat Ibadah:{' '}
            <strong className="font-num">+{engine.worshipGoldIncome(p)} emas/th</strong>
          </div>
          <div className="text-[11px] text-[#57534E]">
            Tingkatkan bangunan (Lv 1→3) untuk memperbesar kapasitas jemaat, bina jemaat baru, dan jaga hubungan dengan jemaat.
          </div>
        </div>

        <SectionHeader title={`${wLabel.singular} & Jemaat Dikelola`} right={`${sites.length} lokasi`} />
        {sites.map((s) => {
          const keeper = s.keeperId && engine.C[s.keeperId]?.hidup ? engine.C[s.keeperId] : null;
          const upgCost = s.level === 1 ? 60 : 120;
          const doneService = Boolean(engine.G.done['worship_' + s.key]);
          const doneRecruit = Boolean(engine.G.done['w_rec_' + s.key]);
          const doneGreet = Boolean(engine.G.done['w_greet_' + s.key]);
          const doneAid = Boolean(engine.G.done['w_aid_' + s.key]);
          const doneTax = Boolean(engine.G.done['w_tax_' + s.key]);
          const jemaatPct = Math.round((s.congregation / Math.max(1, s.congregationCapacity)) * 100);
          const opNormalized = Math.max(0, Math.min(100, Math.round((s.congregationOpinion + 100) / 2)));

          return (
            <div key={s.key} className="p-4 bg-white border-b border-[#E6E1D3] space-y-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-[#1C1917]">
                    {s.name} · Tingkat {s.level}/3
                  </div>
                  <div className="text-xs text-[#57534E] mt-0.5">
                    {wLabel.official}: <strong>{keeper ? engine.full(keeper) : 'Belum ditunjuk'}</strong>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {s.level < 3 && (
                    <button
                      type="button"
                      onClick={() => engine.upgradeWorshipSite(s.key)}
                      className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                    >
                      Upgrade Lv {s.level + 1} ({upgCost}g)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => engine.go('ibadah_keeper', s.key)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] text-[#1C1917] rounded cursor-pointer"
                  >
                    Tugaskan {wLabel.official}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded">
                <StatBar
                  value={jemaatPct}
                  label={`Jemaat: ${s.congregation}/${s.congregationCapacity} jiwa`}
                />
                <StatBar
                  value={opNormalized}
                  label={`Hubungan Jemaat: ${s.congregationOpinion > 0 ? '+' : ''}${s.congregationOpinion} (${relationLabel(s.congregationOpinion)})`}
                />
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#57534E] mb-1.5">
                  Kelola Jemaat &amp; Hubungan dengan Jemaat
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={doneService}
                    onClick={() => engine.holdWorshipService(s.key)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] disabled:opacity-50 text-white rounded cursor-pointer"
                  >
                    {doneService ? 'Ibadah Selesai Thn Ini' : wLabel.actionName}
                  </button>
                  <button
                    type="button"
                    disabled={doneRecruit || s.congregation >= s.congregationCapacity}
                    onClick={() => engine.recruitCongregation(s.key)}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] disabled:opacity-50 text-[#1C1917] rounded cursor-pointer"
                  >
                    {doneRecruit ? 'Sudah Bina Jemaat' : `Bina Jemaat (${p.profesi === 'pendeta' ? 'Gratis' : '12g'})`}
                  </button>
                  <button
                    type="button"
                    disabled={doneGreet}
                    onClick={() => engine.greetCongregation(s.key)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] disabled:opacity-50 text-[#1C1917] rounded cursor-pointer"
                  >
                    {doneGreet ? 'Sudah Musyawarah' : 'Sapa & Musyawarah'}
                  </button>
                  <button
                    type="button"
                    disabled={doneAid}
                    onClick={() => engine.aidCongregation(s.key)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] disabled:opacity-50 text-[#1C1917] rounded cursor-pointer"
                  >
                    {doneAid ? 'Santunan Tersalur' : 'Santunan Jemaat (15g)'}
                  </button>
                  <button
                    type="button"
                    disabled={doneTax || s.congregationOpinion < 15}
                    onClick={() => engine.collectCongregationOffering(s.key)}
                    className="px-2.5 py-1 text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] disabled:opacity-50 text-[#991B1B] rounded cursor-pointer"
                  >
                    {doneTax ? 'Iuran Sudah Ditarik' : 'Tarik Sumbangan (+Emas, -Hub)'}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#57534E] mb-1.5">Fokus Pengelolaan Tempat Ibadah</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {focusOptions.map((fo) => {
                    const active = s.focus === fo.id;
                    return (
                      <button
                        key={fo.id}
                        type="button"
                        onClick={() => engine.setWorshipFocus(s.key, fo.id)}
                        className={`px-2 py-1.5 text-left rounded border text-[11px] cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#FAF3E0] border-[#9A6614] text-[#78350F] font-semibold'
                            : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C] hover:bg-[#F1EDE0]'
                        }`}
                      >
                        <div>{fo.label}</div>
                        <div className="text-[10px] opacity-80">{fo.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#57534E] mb-1.5">Program Pembinaan Jemaat</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {sermonOptions.map((so) => {
                    const active = (s.sermonTheme || 'harmoni') === so.id;
                    return (
                      <button
                        key={so.id}
                        type="button"
                        onClick={() => engine.setWorshipSermon(s.key, so.id)}
                        className={`px-2 py-1.5 text-left rounded border text-[11px] cursor-pointer transition-colors ${
                          active
                            ? 'bg-[#F0FDF4] border-[#3F6212] text-[#365314] font-semibold'
                            : 'bg-[#FAF8F2] border-[#E6E1D3] text-[#44403C] hover:bg-[#F1EDE0]'
                        }`}
                      >
                        <div>{so.label}</div>
                        <div className="text-[10px] opacity-80">{so.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {buildCandidates.length > 0 && (
          <>
            <SectionHeader title={`Bangun ${wLabel.singular} di Wilayahmu`} />
            {buildCandidates.map((b) => {
              const bid = p.agama === 'islam' ? 'kuil' : 'gereja';
              const bDef = engine.bi(bid);
              return (
                <ListRow
                  key={`${b.tid}-${b.idx}`}
                  icon={p.agama === 'islam' ? '🕌' : '⛪'}
                  title={`Dirikan ${wLabel.tiers[0]} di ${b.pName}`}
                  subtitle={`${b.tName} · Biaya ${bDef?.biaya || 60} emas · ${bDef?.waktu_tahun || 2} tahun${b.hasSlot ? '' : ' · Slot penuh'}`}
                  rightLabel="Bangun"
                  disabled={!b.hasSlot}
                  onClick={() => engine.bd(b.tid, b.idx, bid)}
                />
              );
            })}
          </>
        )}
      </ViewShell>
    );
  }

  if (view === 'ibadah_keeper' && arg) {
    const wLabel = engine.worshipLabels(p.agama);
    const cands = Object.values(engine.C)
      .filter((c) => c.hidup && c.agama === p.agama && engine.umur(c) >= 16)
      .sort((a, b) => (b.id === p.id ? 1 : 0) - (a.id === p.id ? 1 : 0) || b.sk.pembelajaran + b.res.kesalehan - (a.sk.pembelajaran + a.res.kesalehan))
      .slice(0, 20);
    return (
      <ViewShell title={`Pilih ${wLabel.official}`} onBack={() => engine.back()} onHome={() => engine.home()}>
        <ListRow
          title="Kosongkan Jabatan Pengurus"
          subtitle="Kelola secara umum tanpa petugas khusus"
          rightLabel="Kosongkan"
          onClick={() => engine.assignWorshipKeeper(arg, null)}
        />
        {cands.map((c) => (
          <ListRow
            key={c.id}
            title={`${engine.full(c)}${c.id === p.id ? ' (Kamu)' : ''}`}
            subtitle={`Pembelajaran ${c.sk.pembelajaran} · Administrasi ${c.sk.administrasi} · Kesalehan ${Math.round(c.res.kesalehan)}`}
            rightLabel="Tugaskan"
            onClick={() => engine.assignWorshipKeeper(arg, c.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'ortodoks_anatema') {
    const cands = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && c.agama === 'ortodoks' && (engine.tierOf(c) >= 1 || c.profesi === 'pendeta'))
      .slice(0, 25);
    return (
      <ViewShell title="Anatema Patriark Ortodoks" onBack={() => engine.back()} onHome={() => engine.home()}>
        {cands.map((c) => (
          <ListRow
            key={c.id}
            title={engine.full(c)}
            subtitle={`${engine.tTitle(c)} · Opini ${Math.round(engine.opn(c, p))}`}
            rightLabel="Anatema"
            onClick={() => engine.orthodoxAnathematize(c.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'anglikan_primate') {
    const cands = Object.values(engine.C)
      .filter((c) => c.hidup && c.agama === 'anglikan' && engine.umur(c) >= 20)
      .sort((a, b) => b.sk.pembelajaran + b.res.kesalehan - (a.sk.pembelajaran + a.res.kesalehan))
      .slice(0, 20);
    return (
      <ViewShell title="Tunjuk Uskup Agung Anglikan" onBack={() => engine.back()} onHome={() => engine.home()}>
        {cands.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Belum ada tokoh Anglikan dewasa di istana.</div>
        ) : (
          cands.map((c) => (
            <ListRow
              key={c.id}
              title={engine.full(c)}
              subtitle={`Pembelajaran ${c.sk.pembelajaran} · Kesalehan ${Math.round(c.res.kesalehan)}`}
              rightLabel="Tunjuk"
              onClick={() => engine.anglicanAppointPrimate(c.id)}
            />
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'konklaf') {
    const lastConclave = engine.G.church.lastConclave;
    const justElectedPope = Boolean(lastConclave && lastConclave.winnerId === p.id && lastConclave.year === engine.G.tahun);
    if (!engine.canJoinConclave(p) && !justElectedPope) {
      return (
        <ViewShell title="Konklaf Pemilihan Paus" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 bg-[#FEF2F2] border-b border-[#FECACA] text-xs text-[#991B1B] leading-relaxed">
            <strong>Akses Ditolak:</strong> Ruang Konklaf Pemilihan Paus hanya boleh diakses oleh tokoh berpangkat <strong>Kardinal</strong> (Katolik &amp; selibat).
          </div>
        </ViewShell>
      );
    }

    const pope = engine.G.church.pope ? engine.C[engine.G.church.pope] : null;
    const popeVacant = !pope || !pope.hidup;
    const cands = engine.conclaveCandidates();
    const activeTargetId =
      supportedCand && cands.some((c) => c.id === supportedCand)
        ? supportedCand
        : cands.some((c) => c.id === p.id)
          ? p.id
          : cands[0]?.id || p.id;
    const activeTarget = engine.C[activeTargetId] || p;
    const tally = engine.simulateConclaveTally(activeTargetId);
    const myDyn = engine.dynastyInfluence(p);
    const myDip = engine.diplomaticSupport(p);
    const lobbyUsed = engine.G.done['conclave_lobby'] || 0;
    const dynUsed = Boolean(engine.G.done['conclave_dyn']);

    return (
      <ViewShell title="Konklaf Dewan Kardinal" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-1.5 text-xs text-[#44403C]">
          <div>
            Status Takhta Suci:{' '}
            <strong>{!popeVacant && pope ? `Terisi (${engine.full(pope)})` : 'Kosong — Pemungutan Suara Kardinal Aktif'}</strong>
          </div>
          <div>
            Pengaruh Dinastimu (<strong>{myDyn.dynName}</strong>):{' '}
            <strong className="font-num">{myDyn.total}</strong>{' '}
            <span className="text-[11px] text-[#57534E]">
              (Prestise Dinasti +{myDyn.dynPrestige}, Status +{myDyn.dynTier}, Kerabat Penguasa +{myDyn.rulerBonus}, Pribadi +{myDyn.personalPrestige})
            </span>
          </div>
          <div>
            Dukungan Diplomatikmu:{' '}
            <strong className="font-num">{myDip.total}</strong>{' '}
            <span className="text-[11px] text-[#57534E]">
              (Opini Kardinal {myDip.cardOpinion >= 0 ? '+' : ''}{myDip.cardOpinion}, Aliansi +{myDip.dynAlliance}, Diplomasi +{myDip.skillBonus})
            </span>
          </div>
          <div className="text-[11px] text-[#57534E]">
            Dewan Kardinal beranggotakan <strong>{cands.length} Kardinal</strong>. Setiap Kardinal memberi 1 suara berdasarkan bobot <strong>Pengaruh Dinasti</strong> + <strong>Hubungan Diplomatik</strong> (termasuk status Teman +28 / Musuh -38) + kesalehan kandidat.
          </div>
        </div>

        {popeVacant ? (
          <>
            <SectionHeader title="Kandidat & Proyeksi Suara" right={`${tally.totalVotes} Kardinal`} />
            {tally.standings.map((st, idx) => {
              const cand = engine.C[st.id];
              if (!cand) return null;
              const dyn = engine.dynastyInfluence(cand);
              const isTarget = cand.id === activeTargetId;
              return (
                <div
                  key={cand.id}
                  className="p-3.5 bg-white border-b border-[#E6E1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1C1917]">
                      #{idx + 1} {engine.full(cand)}
                      {cand.id === p.id ? ' (Kamu)' : ''}
                      {isTarget ? ' · Target Dukungan' : ''}
                      {cand.id !== p.id && engine.isFriend(cand.id) ? ' · Teman' : ''}
                      {cand.id !== p.id && engine.isRival(cand.id) ? ' · Musuh' : ''}
                    </div>
                    <div className="text-[11px] text-[#57534E] mt-0.5">
                      Proyeksi Suara: <strong className="text-[#9A6614] font-num">{st.votes}/{tally.totalVotes}</strong> · Dinasti ({dyn.dynName}):{' '}
                      <strong className="font-num">{st.dynastyScore}</strong> · Diplomasi:{' '}
                      <strong className="font-num">{st.diplomacyScore}</strong> · Kesalehan{' '}
                      <strong className="font-num">{Math.round(cand.res.kesalehan)}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {!isTarget && (
                      <button
                        type="button"
                        onClick={() => setSupportedCand(cand.id)}
                        className="px-2.5 py-1.5 text-[11px] font-medium bg-[#FAF8F2] border border-[#D6CFC0] text-[#44403C] hover:bg-[#F1EDE0] rounded cursor-pointer"
                      >
                        Fokus Lobi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        engine.openConclave(cand.id);
                      }}
                      className="px-3 py-1.5 text-[11px] font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                    >
                      Beri Suara &amp; Pilih Paus
                    </button>
                  </div>
                </div>
              );
            })}

            <SectionHeader
              title={`Dewan ${cands.length} Kardinal — Lobi, Teman & Musuh (${engine.full(activeTarget)})`}
              right={`Lobi ${lobbyUsed}/3`}
            />
            <div className="p-3.5 bg-[#FAF8F2] border-b border-[#E6E1D3]">
              <button
                type="button"
                disabled={dynUsed}
                onClick={() => engine.campaignConclaveDynasty(activeTarget.id)}
                className="w-full py-2 text-xs font-semibold text-white bg-[#78350F] hover:bg-[#5C280B] disabled:opacity-50 rounded cursor-pointer"
              >
                {dynUsed
                  ? 'Pengaruh Dinasti Sudah Dikerahkan di Konklaf Ini'
                  : `Kerahkan Pengaruh Dinasti ${myDyn.dynName} (25 Prestise / 35 Emas)`}
              </button>
            </div>
            {cands
              .filter((v) => v.id !== p.id)
              .map((voter) => {
                const voterBallot = tally.ballots.find((b) => b.voterId === voter.id);
                const voterDyn = engine.dynastyInfluence(voter);
                const opToTarget = engine.opn(voter, activeTarget);
                const friend = engine.isFriend(voter.id);
                const rival = engine.isRival(voter.id);
                return (
                  <div
                    key={voter.id}
                    className="p-3.5 bg-white border-b border-[#E6E1D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1C1917]">
                        Kardinal {engine.full(voter)}
                        {friend ? ' · Teman' : rival ? ' · Musuh' : ''}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        Dinasti {voterDyn.dynName} · Opini ke {activeTarget.nama}:{' '}
                        <strong className="font-num">{Math.round(opToTarget)}</strong> · Cenderung memilih:{' '}
                        <strong>{voterBallot?.targetName || '—'}</strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={friend}
                        onClick={() => engine.makeFriend(voter.id)}
                        className="px-2 py-1 text-[11px] font-medium bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] disabled:opacity-50 rounded cursor-pointer"
                      >
                        Teman
                      </button>
                      <button
                        type="button"
                        disabled={rival}
                        onClick={() => engine.makeRival(voter.id)}
                        className="px-2 py-1 text-[11px] font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] disabled:opacity-50 rounded cursor-pointer"
                      >
                        Musuh
                      </button>
                      {(friend || rival) && (
                        <button
                          type="button"
                          onClick={() => engine.neutralizeRelation(voter.id)}
                          className="px-2 py-1 text-[11px] font-medium bg-white border border-[#D6CFC0] text-[#44403C] rounded cursor-pointer"
                        >
                          Netral
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={lobbyUsed >= 3}
                        onClick={() => engine.lobbyConclave(voter.id, activeTarget.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF8F2] border border-[#D6CFC0] hover:bg-[#F1EDE0] disabled:opacity-50 text-[#1C1917] rounded cursor-pointer"
                      >
                        Lobi (25g)
                      </button>
                    </div>
                  </div>
                );
              })}
          </>
        ) : (
          lastConclave && (
            <>
              <SectionHeader
                title={`Hasil Konklaf Terakhir (Thn ${lastConclave.year})`}
                right={`${lastConclave.totalVotes} suara`}
              />
              {lastConclave.standings.map((st, idx) => (
                <ListRow
                  key={st.id}
                  title={`#${idx + 1} ${st.nama}`}
                  subtitle={`Suara: ${st.votes}/${lastConclave.totalVotes} · Dinasti ${st.dynastyScore} · Diplomasi ${st.diplomacyScore}`}
                  rightLabel={st.id === lastConclave.winnerId ? 'Terpilih' : undefined}
                />
              ))}
              <SectionHeader title="Rincian Suara Dewan Kardinal" />
              {lastConclave.ballots.map((b) => (
                <ListRow
                  key={b.voterId}
                  title={`Kardinal ${b.voterName}`}
                  subtitle={`Memilih ${b.targetName} (Dinasti ${b.dynastyScore}, Diplomasi ${b.diplomacyScore})`}
                />
              ))}
            </>
          )
        )}
      </ViewShell>
    );
  }

  if (view === 'excom') {
    const myRank = engine.relRankOf(p);
    const isPope = myRank === 'paus' || engine.G.church.pope === p.id;
    const isArchbishop = myRank === 'uskup_agung';
    const realm = engine.realmOf(p);
    if (!isPope && !isArchbishop) {
      return (
        <ViewShell title="Ekskomunikasi Tokoh" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#991B1B]">
            Wewenang ekskomunikasi hanya dimiliki Paus atau Uskup Agung terhadap tokoh di wilayahnya sendiri.
          </div>
        </ViewShell>
      );
    }
    const cands = Object.values(engine.C)
      .filter((c) => {
        if (!c.hidup || c.id === p.id || c.agama !== 'katolik') return false;
        if (engine.tierOf(c) < 1 && !engine.relRankOf(c)) return false;
        if (!isPope && engine.realmOf(c).id !== realm.id) return false;
        return true;
      })
      .slice(0, 30);
    return (
      <ViewShell title="Ekskomunikasi Penguasa & Tokoh" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
          {isPope
            ? 'Sebagai Paus, kamu berwenang mengekskomunikasi umat Katolik di seluruh dunia.'
            : `Sebagai Uskup Agung, ekskomunikasi dibatasi hanya untuk wilayah ${realm.nama}.`}
        </div>
        {cands.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada target Katolik yang memenuhi syarat di wilayah ini.</div>
        ) : (
          cands.map((c) => {
            const ex = Boolean(engine.G.church.excom[c.id]);
            return (
              <ListRow
                key={c.id}
                title={engine.full(c)}
                subtitle={`${engine.tTitle(c)} · ${engine.realmOf(c).nama} · ${ex ? 'Sudah Diekskomunikasi' : 'Katolik Aktif'}`}
                rightLabel={ex ? 'Cabut' : 'Ekskomunikasi'}
                onClick={() => (ex ? engine.liftExcom(c.id) : engine.excommunicate(c.id))}
              />
            );
          })
        )}
      </ViewShell>
    );
  }

  if (view === 'interdict') {
    if (engine.G.church.pope !== p.id) {
      return (
        <ViewShell title="Interdik Wilayah" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#991B1B]">Hanya Paus Roma yang berwenang menjatuhkan Interdik Kerajaan.</div>
        </ViewShell>
      );
    }
    const kingdoms = Object.values(engine.T).filter((t) => t.tier >= 5 && t.pem && engine.C[t.pem]?.hidup && t.pem !== p.id);
    return (
      <ViewShell title="Interdik Wilayah" onBack={() => engine.back()} onHome={() => engine.home()}>
        {kingdoms.map((t) => (
          <ListRow
            key={t.id}
            title={t.nama}
            subtitle={t.pem && engine.C[t.pem]?.hidup ? `Penguasa: ${engine.full(engine.C[t.pem])}` : '—'}
            rightLabel={engine.G.church.interdict[t.id] ? 'Terkena Interdik' : 'Jatuhkan'}
            onClick={() => engine.interdictKingdom(t.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'appointB') {
    const myRank = engine.relRankOf(p);
    const realm = engine.realmOf(p);
    if (!['paus', 'kardinal', 'uskup_agung'].includes(myRank)) {
      return (
        <ViewShell title="Tahbiskan Uskup Baru" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#991B1B]">
            Hanya Uskup Agung, Kardinal, atau Paus yang berwenang menahbiskan Uskup baru.
          </div>
        </ViewShell>
      );
    }
    const cands = Object.values(engine.C)
      .filter(
        (c) =>
          c.hidup &&
          c.agama === 'katolik' &&
          c.sn !== 'menikah' &&
          !c.pasangan &&
          !engine.G.church.bishops.includes(c.id) &&
          engine.umur(c) >= 20 &&
          (myRank !== 'uskup_agung' || engine.realmOf(c).id === realm.id)
      )
      .slice(0, 20);
    return (
      <ViewShell title="Tahbiskan Uskup Baru (30 Emas)" onBack={() => engine.back()} onHome={() => engine.home()}>
        {cands.length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada rohaniwan/tokoh selibat yang tersedia untuk ditahbiskan.</div>
        ) : (
          cands.map((c) => (
            <ListRow
              key={c.id}
              title={engine.full(c)}
              subtitle={`${engine.realmOf(c).nama} · Kesalehan ${Math.round(c.res.kesalehan)} · Pembelajaran ${c.sk.pembelajaran}`}
              rightLabel="Tahbiskan"
              onClick={() => engine.advanceNPCBishop(c.id)}
            />
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'council') {
    const r = engine.relRankOf(p);
    if (engine.G.church.pope !== p.id && r !== 'kardinal' && !engine.G.church.cardinals.includes(p.id)) {
      return (
        <ViewShell title="Konsili Gereja" onBack={() => engine.back()} onHome={() => engine.home()}>
          <div className="p-4 text-xs text-[#991B1B]">Hanya Paus atau Kardinal yang bisa menetapkan doktrin Konsili.</div>
        </ViewShell>
      );
    }
    const docs = ['Ortodoks Tradisional', 'Supremasi Takhta Suci', 'Reformasi Moral Biara', 'Toleransi Akademik'];
    return (
      <ViewShell title="Konsili Gereja" onBack={() => engine.back()} onHome={() => engine.home()}>
        {docs.map((doc) => (
          <ListRow
            key={doc}
            title={doc}
            rightLabel={engine.G.church.doctrine === doc ? 'Aktif' : 'Tetapkan'}
            onClick={() => engine.setChurchDoctrine(doc)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'agama') {
    const list = (engine.D.agama || []).concat(engine.G.ag || []);
    return (
      <ViewShell title="Pindah Agama / Mazhab" onBack={() => engine.back()} onHome={() => engine.home()}>
        {list.map((a: { id: string; nama: string; tersedia_dari?: number; efek?: Record<string, number> }) => {
          const locked = Boolean(a.tersedia_dari && engine.G.tahun < a.tersedia_dari);
          return (
            <ListRow
              key={a.id}
              title={a.nama}
              subtitle={locked ? `Tersedia mulai tahun ${a.tersedia_dari}` : engine.ef2(a.efek)}
              rightLabel={p.agama === a.id ? 'Aktif' : 'Peluk'}
              disabled={locked || p.agama === a.id}
              onClick={() => engine.conv(a.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  if (view === 'sekte') {
    const doktrin = engine.D.aturan_agama?.doktrin || [];
    return (
      <ViewShell title="Dirikan Sekte Baru" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] space-y-2">
          <input
            type="text"
            value={sectName}
            onChange={(e) => setSectName(e.target.value)}
            placeholder="Nama sekte barumu..."
            className="w-full px-3 py-2 text-xs bg-white border border-[#D6CFC0] rounded"
          />
          <button
            type="button"
            onClick={() => engine.mkSekte(sectName)}
            className="w-full py-2 text-xs font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded cursor-pointer"
          >
            Dirikan Sekte (100 Kesalehan, 50 Prestise, pilih 1–2 doktrin)
          </button>
        </div>
        <SectionHeader title="Pilih 1–2 Doktrin" right={`${engine.G.sel.length}/2 dipilih`} />
        {doktrin.map((d: { id: string; nama: string; efek?: Record<string, number> }) => (
          <ListRow
            key={d.id}
            title={d.nama}
            subtitle={engine.ef2(d.efek)}
            rightLabel={engine.G.sel.includes(d.id) ? 'Dipilih' : 'Pilih'}
            onClick={() => engine.toggleDoctrine(d.id)}
          />
        ))}
      </ViewShell>
    );
  }

  if (view === 'reform') {
    const cur = engine.AG(p.agama);
    return (
      <ViewShell title="Reformasi Sekte" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 text-xs text-[#44403C] space-y-2">
          <div>Agama saat ini: <strong>{cur.nama}</strong></div>
          <p>Syarat reformasi: Sekte aktif, 300 kesalehan, 100 prestise, dan minimal gelar Count.</p>
          <button
            type="button"
            onClick={() => engine.reformSect()}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#9A6614] rounded cursor-pointer"
          >
            Lakukan Reformasi Iman
          </button>
        </div>
      </ViewShell>
    );
  }

  if (view === 'prot') {
    const tyw = engine.G.thirtyYearsWar;
    return (
      <ViewShell title="Reformasi Protestan & Perang 30 Tahun" onBack={() => engine.back()} onHome={() => engine.home()}>
        <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C] space-y-1">
          <div>Status Reformasi Protestan: <strong>{engine.G.protestantStarted ? 'Sudah Dimulai' : 'Belum Dimulai'}</strong></div>
          <div>Gereja Anglikan: <strong>{engine.G.anglican ? 'Berdiri' : 'Belum Berdiri'}</strong></div>
          {tyw && (
            <div className="text-[#991B1B] font-semibold">
              Perang 30 Tahun berlangsung (Tahun {tyw.turns}/10 · {Math.round(tyw.power)} vs {Math.round(tyw.enemy)})
            </div>
          )}
        </div>
        <ListRow
          title="Picu Perang 30 Tahun"
          subtitle="Khusus penguasa Protestan (50 prestise, ≥100 pasukan)"
          onClick={() => engine.trigger30YearsWar()}
        />
      </ViewShell>
    );
  }

  if (view === 'faksi') {
    return (
      <ViewShell title="Faksi Istana & Karantina Wabah" onBack={() => engine.back()} onHome={() => engine.home()}>
        <SectionHeader title="Pilih Faksi Istana" />
        {Object.entries(engine.FAKSI).map(([id, f]) => {
          const rep = (engine.G.factionRep as Record<string, number>)[id] || 0;
          const milRest = id === 'militer' ? engine.checkMilitaryRestriction('faction_militer', p) : { ok: true };
          const churchLocked = id === 'gereja' && engine.AG(p.agama).keluarga !== 'kristen';
          const lockedReason = !milRest.ok
            ? milRest.reason
            : churchLocked
              ? 'Terkunci (Agama): Faksi Gereja istana hanya terbuka bagi pemeluk Kristen.'
              : '';
          const isLocked = Boolean(lockedReason);
          return (
            <ListRow
              key={id}
              icon={f.icon}
              title={f.nama}
              subtitle={isLocked ? lockedReason : `${f.efek} · Reputasi ${rep}`}
              rightLabel={engine.G.faction === id ? 'Aktif' : isLocked ? 'Terkunci' : 'Gabung'}
              disabled={isLocked}
              onClick={() => engine.alignFaksi(id)}
            />
          );
        })}
        <SectionHeader title="Wabah Lokal Aktif" />
        {Object.keys(engine.G.plague).length === 0 ? (
          <div className="p-4 text-xs text-[#57534E]">Tidak ada wabah aktif.</div>
        ) : (
          Object.entries(engine.G.plague).map(([tid, pl]) => (
            <ListRow
              key={tid}
              title={engine.T[tid]?.nama || tid}
              subtitle={`Keparahan ${pl.sev}% · Tahun ke-${pl.turns}`}
              rightLabel="Karantina (20g)"
              onClick={() => engine.quarantine(tid)}
            />
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'job') {
    const rulers = Object.values(engine.C)
      .filter((c) => c.hidup && c.id !== p.id && engine.tierOf(c) >= 3)
      .slice(0, 18);
    const commoner = engine.isCommoner(p);
    const muslimCath = engine.isMuslimInCatholicArea(p);
    return (
      <ViewShell title="Jabatan Istana" onBack={() => engine.back()} onHome={() => engine.home()}>
        {(commoner || muslimCath) && (
          <div className="p-4 bg-[#FAF3E0] border-b border-[#E6D9B5] text-xs text-[#78350F] space-y-1">
            <div className="font-semibold text-[#1C1917]">Pembatasan Akses Pemerintahan &amp; Militer Aktif</div>
            {commoner && (
              <div>
                Status Sosial ({p.kelas.replace(/_/g, ' ')}): Posisi tinggi <strong>Kanselir</strong> &amp;{' '}
                <strong>Marsekal</strong> dikunci bagi non-bangsawan.
              </div>
            )}
            {muslimCath && (
              <div>
                Agama (Islam di wilayah mayoritas Katolik): Posisi tinggi pemerintahan Kristen &amp;{' '}
                <strong>Uskup Agung</strong> dikunci; jabatan lain di istana Katolik dibatasi opini.
              </div>
            )}
          </div>
        )}
        {engine.G.job ? (
          <ListRow
            title="Mengundurkan Diri dari Jabatan Saat Ini"
            subtitle={`Mengabdi pada ${engine.C[engine.G.job.r]?.nama || engine.G.job.r}`}
            onClick={() => engine.quitJob()}
          />
        ) : (
          rulers.map((r) => (
            <ListRow
              key={r.id}
              title={engine.full(r)}
              subtitle={`${engine.tTitle(r)} · ${engine.AG(r.agama).nama} · Opini ${Math.round(engine.opn(r, p))}`}
              onClick={() => engine.go('ja', r.id)}
            />
          ))
        )}
      </ViewShell>
    );
  }

  if (view === 'ja' && arg) {
    const emp = engine.C[arg];
    return (
      <ViewShell title="Pilih Posisi Jabatan" onBack={() => engine.back()} onHome={() => engine.home()}>
        {emp && (
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] text-xs text-[#44403C]">
            Melamar ke istana <strong>{engine.full(emp)}</strong> ({engine.AG(emp.agama).nama} ·{' '}
            {engine.tTitle(emp)}) — gaji dibayarkan sesuai tingkat &amp; ekonomi negara.
          </div>
        )}
        {(engine.D.jabatan || []).map((j: { id: string; nama: string; stat: string }) => {
          const rest = emp ? engine.checkOfficeRestriction(j.id, p, emp) : { ok: true };
          const sal = emp ? engine.getOfficeSalary(j.id, emp) : 10;
          const exp = engine.getOfficeExperienceReq(j.id, p);
          return (
            <ListRow
              key={j.id}
              title={`${j.nama} (Gaji ${sal}g/th)`}
              subtitle={rest.ok ? `Stat utama: ${j.stat} · ${exp.label}` : rest.reason || 'Terkunci'}
              rightLabel={rest.ok ? 'Lamar' : 'Terkunci'}
              disabled={!rest.ok}
              onClick={() => engine.jobApply(arg, j.id)}
            />
          );
        })}
      </ViewShell>
    );
  }

  return null;
};
