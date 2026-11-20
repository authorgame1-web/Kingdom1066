import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { engine } from '../engine/gameEngine';
import { sfx } from '../utils/audio';

interface TopBarProps {
  isPlaying: boolean;
  currentView: string;
  muted: boolean;
  onToggleMute: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isPlaying,
  currentView,
  muted,
  onToggleMute,
}) => {
  const p = isPlaying ? engine.me() : null;
  const isNoble = p ? engine.isNoble(p) : true;
  const navItems = isNoble
    ? [
        { label: 'Istana', view: 'main' },
        { label: 'Peta 1066', view: 'peta' },
        { label: 'Keluarga', view: 'hub' },
        { label: 'Militer', view: 'pas' },
        { label: 'Wilayah', view: 'prov' },
      ]
    : [
        { label: 'Beranda', view: 'main' },
        { label: 'Peta 1066', view: 'peta' },
        { label: 'Keluarga', view: 'hub' },
        { label: 'Karier', view: 'jab' },
        { label: 'Ekonomi', view: 'prov' },
      ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F2]/95 backdrop-blur-xs border-b border-[#DDD6C3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => (isPlaying ? engine.home() : engine.toStart())}
          className="font-display text-lg font-bold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#9A6614] rounded"
        >
          Kerajaan 1066
        </button>

        {/* Zone 2: Nav Links */}
        {isPlaying ? (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]">
            {navItems.map((item) => {
              const active =
                currentView === item.view ||
                (item.view === 'peta' && ['vasal', 'gt'].includes(currentView)) ||
                (item.view === 'hub' && ['cari', 'dyn', 'dd', 'silsilah', 'pohon', 'tree', 'fam'].includes(currentView)) ||
                (item.view === 'pas' && ['perang', 'wc', 'siege', 'kapal', 'salib', 'great'].includes(currentView)) ||
                (item.view === 'prov' && ['pv', 'bentuk', 'paj', 'riset', 'trade', 'pasar'].includes(currentView));
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => (item.view === 'main' ? engine.home() : engine.go(item.view))}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                    active
                      ? 'text-[#1C1917] border-[#9A6614] font-semibold'
                      : 'border-transparent hover:text-[#1C1917] hover:border-[#D6CFC0]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]">
            <span className="whitespace-nowrap shrink-0">Eropa Abad Pertengahan</span>
            <span className="whitespace-nowrap shrink-0">Dinasti &amp; Suksesi</span>
            <span className="whitespace-nowrap shrink-0">Diplomasi &amp; Perang</span>
            <span className="whitespace-nowrap shrink-0">Kronik 1066–1600</span>
          </nav>
        )}

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
            title={muted ? 'Nyalakan suara' : 'Bisukan suara'}
            className="p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFEBE0] rounded-md transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {isPlaying ? (
            <button
              type="button"
              onClick={() => engine.tick()}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              Tahun Depan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sfx.playClick();
                if (engine.hasSave()) engine.loadSave();
                else engine.startRandomWorld();
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#9A6614] hover:bg-[#7E520E] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              {engine.hasSave() ? 'Lanjutkan Save' : 'Mulai Acak'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
