import React, { useEffect, useState } from 'react';
import { Crown, Globe, Shield, Swords, Users, X } from 'lucide-react';
import { MainDashboard } from './components/MainDashboard';
import { Modals } from './components/Modals';
import { OfflineIndicator } from './components/PWAInstallButton';
import { RulerSidebar } from './components/RulerSidebar';
import { StartScreen } from './components/StartScreen';
import { TopBar } from './components/TopBar';
import { CourtDiplomacyChurchView } from './components/Views/CourtDiplomacyChurchView';
import { FamilyAndTreeView } from './components/Views/FamilyAndTreeView';
import { MilitaryAndWarView } from './components/Views/MilitaryAndWarView';
import { PlayerProgressAndWorldView } from './components/Views/PlayerProgressAndWorldView';
import { RealmAndEconomyView } from './components/Views/RealmAndEconomyView';
import { engine } from './engine/gameEngine';
import { sfx } from './utils/audio';

const FAMILY_VIEWS = new Set([
  'hub', 'cari', 'cariUmum', 'fam', 'dyn', 'dd', 'dl', 'cadetPick',
  'kronik', 'herald', 'silsilah', 'pohon', 'tree', 'statKeluarga', 'anggotaK',
]);

const MILITARY_VIEWS = new Set([
  'pas', 'perang', 'wc', 'siege', 'kapal', 'salib', 'great', 'logistik', 'hw', 'tani',
]);

const REALM_VIEWS = new Set([
  'vasal', 'gt', 'peta', 'prov', 'pv', 'bentuk', 'paj', 'usaha', 'pasar', 'trade', 'pinjaman', 'ekspedisi', 'riset', 'ciptagelar',
]);

const COURT_VIEWS = new Set([
  'dip', 'dc', 'sr', 'pen', 'pejabat', 'offView', 'pj', 'dewan', 'job', 'ja',
  'spy', 'gereja', 'relView', 'konklaf', 'excom', 'interdict', 'appointB', 'council', 'agama', 'sekte', 'reform', 'faksi', 'prot',
  'ibadah', 'ibadah_keeper', 'ortodoks_anatema', 'anglikan_primate',
]);

export function App() {
  const [, setTick] = useState(0);
  const [muted, setMuted] = useState(() => sfx.isMuted());

  useEffect(() => {
    return engine.subscribe(() => setTick((n) => n + 1));
  }, []);

  const route = engine.currentRoute();
  const isPlaying = route.view !== 'start' && Boolean(engine.G.pid);

  const handleToggleMute = () => {
    const next = sfx.toggleMute();
    setMuted(next);
  };

  const renderActiveView = () => {
    if (route.view === 'main') return <MainDashboard />;
    if (FAMILY_VIEWS.has(route.view)) return <FamilyAndTreeView view={route.view} arg={route.arg} />;
    if (MILITARY_VIEWS.has(route.view)) return <MilitaryAndWarView view={route.view} arg={route.arg} />;
    if (REALM_VIEWS.has(route.view)) return <RealmAndEconomyView view={route.view} arg={route.arg} />;
    if (COURT_VIEWS.has(route.view)) return <CourtDiplomacyChurchView view={route.view} arg={route.arg} />;
    return <PlayerProgressAndWorldView view={route.view} arg={route.arg} />;
  };

  return (
    <div className="min-h-screen bg-[#F6F4EC] text-[#1C1917] flex flex-col">
      <TopBar
        isPlaying={isPlaying}
        currentView={route.view}
        muted={muted}
        onToggleMute={handleToggleMute}
      />

      {engine.toastMessage && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 bg-[#FAF3E0] border border-[#E6D9B5] rounded-md flex items-center justify-between gap-3 text-xs sm:text-sm text-[#78350F]">
            <span>{engine.toastMessage}</span>
            <button
              type="button"
              onClick={() => engine.clearToast()}
              aria-label="Tutup pemberitahuan"
              className="p-1 hover:bg-[#EFE2C0] rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-20 md:pb-10">
        {!isPlaying ? (
          route.view === 'tutorial' ? (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
              <PlayerProgressAndWorldView view="tutorial" />
            </div>
          ) : (
            <StartScreen />
          )
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 xl:col-span-3">
              <RulerSidebar />
            </div>
            <div className="lg:col-span-8 xl:col-span-9 min-w-0">
              {renderActiveView()}
            </div>
          </div>
        )}
      </main>

      {isPlaying && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-[#FAF8F2]/95 backdrop-blur-xs border-t border-[#DDD6C3] grid grid-cols-5 h-14">
          {(engine.isNoble()
            ? [
                { label: 'Istana', view: 'main', Icon: Crown },
                { label: 'Peta', view: 'peta', Icon: Globe },
                { label: 'Keluarga', view: 'hub', Icon: Users },
                { label: 'Militer', view: 'pas', Icon: Swords },
                { label: 'Menu', view: 'lain', Icon: Shield },
              ]
            : [
                { label: 'Beranda', view: 'main', Icon: Crown },
                { label: 'Peta', view: 'peta', Icon: Globe },
                { label: 'Keluarga', view: 'hub', Icon: Users },
                { label: 'Karier', view: 'jab', Icon: Swords },
                { label: 'Menu', view: 'lain', Icon: Shield },
              ]
          ).map(({ label, view, Icon }) => {
            const active = route.view === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => (view === 'main' ? engine.home() : engine.go(view))}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
                  active ? 'text-[#9A6614] font-semibold' : 'text-[#57534E]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <OfflineIndicator />
      <Modals />
    </div>
  );
}

export default App;
