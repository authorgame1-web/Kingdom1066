import React, { useMemo, useRef, useState } from 'react';
import {
  Anchor,
  BookOpen,
  Compass,
  Crown,
  Crosshair,
  Globe,
  Maximize2,
  Search,
  Shield,
  Sparkles,
  Swords,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CONTEXT_1066_REALMS,
  COUNTY_OVERRIDES_LONLAT,
  HISTORICAL_1066_LANDMARKS,
  MAP_HEIGHT,
  MAP_REGIONS,
  MAP_WIDTH,
  MapRegionDef,
  centroidFromLonLat,
  lonLatToXY,
  polygonFromLonLat,
} from '../data/worldMapData';
import {
  CULTURE_MAP_COLORS,
  TIER_MAP_COLORS,
  engine,
  getTierColorKey,
} from '../engine/gameEngine';
import { Title } from '../engine/types';

type MapMode = 'direct' | 'sovereign' | 'culture' | 'navy' | 'atlas1066';

interface LayerState {
  capitals: boolean;
  ports: boolean;
  forts: boolean;
  scholars: boolean;
  subHoldings: boolean;
  labels: boolean;
}

export const WorldMapView: React.FC = () => {
  const p = engine.me();
  const [mode, setMode] = useState<MapMode>('direct');
  const [zoom, setZoom] = useState<number>(1.05);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string>(() => {
    const primary = p ? engine.primaryTitle(p) : null;
    if (primary && MAP_REGIONS.some((r) => r.id === primary.id)) return primary.id;
    const heldMatch = p
      ? engine.held(p.id).find((t) => MAP_REGIONS.some((r) => r.id === t.id))
      : null;
    if (heldMatch) return heldMatch.id;
    const parentMatch = p
      ? engine.held(p.id).find((t) => t.atas && MAP_REGIONS.some((r) => r.id === t.atas))
      : null;
    return parentMatch?.atas || 'd_bavaria';
  });
  const [search, setSearch] = useState('');
  const [filterCulture, setFilterCulture] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerState>({
    capitals: true,
    ports: true,
    forts: true,
    scholars: true,
    subHoldings: true,
    labels: true,
  });

  const dragRef = useRef<{ active: boolean; sx: number; sy: number; px: number; py: number; moved: boolean }>({
    active: false,
    sx: 0,
    sy: 0,
    px: 0,
    py: 0,
    moved: false,
  });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const regionSnapshots = useMemo(() => {
    return MAP_REGIONS.map((reg) => {
      const title = engine.T[reg.id] || null;
      const directOwner = title?.pem && engine.C[title.pem]?.hidup ? engine.C[title.pem] : null;
      const sovTitle = title ? engine.getSovereignTitle(title) : null;
      const sovOwner = sovTitle?.pem && engine.C[sovTitle.pem]?.hidup ? engine.C[sovTitle.pem] : null;
      const subs = title ? engine.getSubHoldingsUnder(title.id) : [];

      // Direct holder tier: uses the title itself (and if vacant/lower, checks direct owner's tier over this region)
      let directColorKey: keyof typeof TIER_MAP_COLORS = 'vacant';
      if (title) {
        if (directOwner) {
          // If the direct owner's highest title is higher (e.g. Emperor Henry holds a Duchy directly, or King Harold holds k_inggris),
          // wait: show the tier of the title held OR the ruler's held rank on this land!
          // Specifically: Baron/Viscount/Count/Marquis/Duke/King/Emperor held directly on this title:
          const directHeldSubs = subs.filter((s) => s.tier <= 2 && s.pem && engine.C[s.pem]?.hidup);
          const ownerPrimaryTier = engine.tierOf(directOwner);
          if (title.tier === 6 && ownerPrimaryTier >= 7) {
            directColorKey = getTierColorKey(7, false);
          } else if (title.tier <= 3) {
            directColorKey = getTierColorKey(title.tier, title.marquis);
          } else if (ownerPrimaryTier > title.tier && title.pem === sovTitle?.pem) {
            // Held directly in demesne by Emperor or King
            directColorKey = getTierColorKey(ownerPrimaryTier, title.marquis);
          } else {
            directColorKey = getTierColorKey(title.tier, title.marquis);
          }
          // Keep sub-holding visibility noted
          void directHeldSubs;
        } else {
          directColorKey = getTierColorKey(title.tier, title.marquis);
        }
      }

      const sovColorKey: keyof typeof TIER_MAP_COLORS = sovTitle
        ? getTierColorKey(sovTitle.tier, sovTitle.marquis)
        : 'vacant';

      const cultureId = title?.budaya || 'german';
      const cultureInfo = CULTURE_MAP_COLORS[cultureId] || {
        nama: cultureId,
        fill: '#9CA3AF',
        text: '#1F2937',
      };

      const markers = engine.getTitleMapMarkers(reg.id);
      const [cx, cy] = centroidFromLonLat(reg.coords);
      const isPlayerOwned = Boolean(
        p &&
          (directOwner?.id === p.id ||
            sovOwner?.id === p.id ||
            subs.some((s) => s.pem === p.id))
      );

      // Compute deterministic visual positions for sub-holdings (Count / Viscount / Baron) inside this region
      const subNodes = subs
        .filter((s) => s.tier <= 4)
        .slice(0, 12)
        .map((s, idx, arr) => {
          const override = COUNTY_OVERRIDES_LONLAT[s.id];
          let sx = cx;
          let sy = cy;
          if (override) {
            [sx, sy] = lonLatToXY(override[0], override[1]);
          } else {
            const angle = (idx / Math.max(1, arr.length)) * Math.PI * 2;
            const rad = arr.length > 5 ? 11 : 7.5;
            sx = cx + Math.cos(angle) * rad;
            sy = cy + Math.sin(angle) * rad;
          }
          const subColorKey = getTierColorKey(s.tier, s.marquis);
          const subOwner = s.pem && engine.C[s.pem]?.hidup ? engine.C[s.pem] : null;
          return {
            title: s,
            x: sx,
            y: sy,
            colorKey: subColorKey,
            owner: subOwner,
            coastal: engine.isTitleCoastal(s),
          };
        });

      return {
        reg,
        title,
        directOwner,
        sovTitle,
        sovOwner,
        subs,
        subNodes,
        directColorKey,
        sovColorKey,
        cultureId,
        cultureInfo,
        markers,
        cx,
        cy,
        isPlayerOwned,
      };
    });
  }, [p, engine.G.tahun, engine.G.n, engine.G.war, engine.G.blackDeath]);

  const selectedSnapshot = useMemo(
    () => regionSnapshots.find((s) => s.reg.id === selectedId) || regionSnapshots[0],
    [regionSnapshots, selectedId]
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const matches: { regionId: string; title: string; subtitle: string }[] = [];
    regionSnapshots.forEach((snap) => {
      const regName = `${snap.reg.label} ${snap.title?.nama || ''}`.toLowerCase();
      const ownerName = snap.directOwner ? engine.full(snap.directOwner).toLowerCase() : '';
      const sovName = snap.sovOwner ? engine.full(snap.sovOwner).toLowerCase() : '';
      const cultName = snap.cultureInfo.nama.toLowerCase();
      if (regName.includes(q) || ownerName.includes(q) || sovName.includes(q) || cultName.includes(q)) {
        matches.push({
          regionId: snap.reg.id,
          title: snap.title?.nama || snap.reg.label,
          subtitle: `${snap.directOwner ? engine.full(snap.directOwner) : 'Kosong'} · ${snap.cultureInfo.nama}`,
        });
      } else {
        const subMatch = snap.subs.find((s) => s.nama.toLowerCase().includes(q));
        if (subMatch) {
          matches.push({
            regionId: snap.reg.id,
            title: `${subMatch.nama} (${snap.reg.label})`,
            subtitle: subMatch.pem && engine.C[subMatch.pem] ? engine.full(engine.C[subMatch.pem]) : 'Kosong',
          });
        }
      }
    });
    return matches.slice(0, 8);
  }, [search, regionSnapshots]);

  const clampZoom = (z: number) => Math.max(0.85, Math.min(5, Math.round(z * 100) / 100));

  const focusPoint = (x: number, y: number, targetZoom: number) => {
    const z = clampZoom(targetZoom);
    const rect = svgContainerRef.current?.getBoundingClientRect();
    const w = rect?.width || 800;
    const h = rect?.height || 540;
    // Center (x, y) in SVG space
    const scaleX = w / MAP_WIDTH;
    const scaleY = h / MAP_HEIGHT;
    const baseScale = Math.min(scaleX, scaleY);
    const dx = (MAP_WIDTH / 2 - x) * baseScale * z;
    const dy = (MAP_HEIGHT / 2 - y) * baseScale * z;
    setZoom(z);
    setPan({ x: dx, y: dy });
  };

  const focusRegion = (reg: MapRegionDef, targetZoom = 2.15) => {
    const [cx, cy] = centroidFromLonLat(reg.coords);
    setSelectedId(reg.id);
    focusPoint(cx, cy, targetZoom);
  };

  const handlePreset = (preset: 'all' | 'me' | 'britain' | 'west' | 'hre' | 'east') => {
    if (preset === 'all') {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }
    if (preset === 'me') {
      const mine = regionSnapshots.find((s) => s.isPlayerOwned);
      if (mine) focusRegion(mine.reg, 2.4);
      return;
    }
    if (preset === 'britain') focusPoint(245, 225, 2.3);
    if (preset === 'west') focusPoint(250, 460, 1.9);
    if (preset === 'hre') focusPoint(515, 385, 2.0);
    if (preset === 'east') focusPoint(890, 480, 1.95);
  };

  const handleAtlasPreset = (region: 'world' | 'europe' | 'africa' | 'middle_east' | 'rus' | 'south_asia') => {
    const rect = svgContainerRef.current?.getBoundingClientRect();
    const w = rect?.width || 800;
    const h = rect?.height || 520;
    const imgAspect = 2200 / 2428;
    const drawH = h;
    const drawW = drawH * imgAspect;
    const focusRatio = (nx: number, ny: number, targetZoom: number) => {
      const z = clampZoom(targetZoom);
      setZoom(z);
      setPan({
        x: (0.5 - nx) * drawW * z,
        y: (0.5 - ny) * drawH * z,
      });
    };

    if (region === 'world') {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
    } else if (region === 'europe') {
      focusRatio(0.28, 0.24, 2.6);
    } else if (region === 'africa') {
      focusRatio(0.32, 0.56, 2.15);
    } else if (region === 'middle_east') {
      focusRatio(0.62, 0.36, 2.55);
    } else if (region === 'rus') {
      focusRatio(0.51, 0.19, 2.5);
    } else if (region === 'south_asia') {
      focusRatio(0.84, 0.45, 2.65);
    }
    void w;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) return;
    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      px: pan.x,
      py: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragRef.current.moved = true;
    }
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.22 : -0.22;
    setZoom((z) => clampZoom(z + delta));
  };

  const culturesPresent = useMemo(() => {
    const ids = Array.from(new Set(regionSnapshots.map((s) => s.cultureId)));
    return ids
      .map((id) => ({ id, ...(CULTURE_MAP_COLORS[id] || { nama: id, fill: '#9CA3AF', text: '#1F2937' }) }))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [regionSnapshots]);

  const getFillAndStroke = (snap: (typeof regionSnapshots)[number]) => {
    if (mode === 'culture') {
      const dimmed = filterCulture && filterCulture !== snap.cultureId;
      return {
        fill: snap.cultureInfo.fill,
        stroke: '#292524',
        opacity: dimmed ? 0.25 : 0.9,
      };
    }
    if (mode === 'navy') {
      return snap.markers.hasCoast
        ? {
            fill: snap.markers.hasShipyard ? '#0284C7' : '#38BDF8',
            stroke: '#0C4A6E',
            opacity: 0.92,
          }
        : {
            fill: '#D6CFC0',
            stroke: '#78716C',
            opacity: 0.72,
          };
    }
    const key = mode === 'sovereign' ? snap.sovColorKey : snap.directColorKey;
    const style = TIER_MAP_COLORS[key];
    return {
      fill: style.fill,
      stroke: style.stroke,
      opacity: 0.88,
    };
  };

  const getTierBadge = (t: Title) => {
    const key = getTierColorKey(t.tier, t.marquis);
    return TIER_MAP_COLORS[key];
  };

  const selMarkers = selectedSnapshot.markers;
  const selTitle = selectedSnapshot.title;
  const selOwner = selectedSnapshot.directOwner;
  const selSov = selectedSnapshot.sovOwner;
  const selIsEnemy = Boolean(p && selOwner && selOwner.id !== p.id);

  return (
    <div className="space-y-4">
      {/* Map Mode & Search Toolbar */}
      <div className="p-3 sm:p-4 bg-[#FAF8F2] border-b border-[#DDD6C3] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'direct', label: 'Wilayah Dipegang (Gelar)' },
                { id: 'sovereign', label: 'Kekuasaan Berdaulat' },
                { id: 'culture', label: 'Peta Budaya' },
                { id: 'navy', label: 'Perairan & Angkatan Laut' },
                { id: 'atlas1066', label: 'Atlas Dunia 1066 M' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  if (m.id !== 'culture') setFilterCulture(null);
                  if (m.id === 'atlas1066') {
                    setZoom(1.0);
                    setPan({ x: 0, y: 0 });
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  mode === m.id
                    ? 'bg-[#9A6614] text-white border-[#9A6614]'
                    : 'bg-white text-[#44403C] border-[#D6CFC0] hover:bg-[#EFEBE0]'
                }`}
              >
                {m.id === 'atlas1066' && <Globe className="w-3.5 h-3.5" />}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Search box */}
          {mode !== 'atlas1066' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#78716C] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari wilayah, penguasa, budaya..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#D6CFC0] rounded-md text-[#1C1917] focus:outline-none focus:border-[#9A6614]"
              />
              {searchResults.length > 0 && (
                <div className="absolute right-0 left-0 top-full mt-1 z-30 bg-white border border-[#DDD6C3] rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-[#E6E1D3]">
                  {searchResults.map((res) => (
                    <button
                      key={res.regionId + res.title}
                      type="button"
                      onClick={() => {
                        const found = MAP_REGIONS.find((r) => r.id === res.regionId);
                        if (found) focusRegion(found, 2.35);
                        setSearch('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#FAF8F2] cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#1C1917]">{res.title}</div>
                      <div className="text-[11px] text-[#57534E]">{res.subtitle}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Focus & Layer Toggles */}
        {mode === 'atlas1066' ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[#57534E] font-medium mr-1">Fokus Atlas 1066 M:</span>
              {[
                { id: 'world', label: 'Semua Dunia 1066' },
                { id: 'europe', label: 'Eropa & Britania' },
                { id: 'africa', label: 'Afrika' },
                { id: 'middle_east', label: 'Timur Tengah & Seljuk' },
                { id: 'rus', label: 'Rus Kiev & Stepa' },
                { id: 'south_asia', label: 'Asia Selatan' },
              ].map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() =>
                    handleAtlasPreset(pr.id as 'world' | 'europe' | 'africa' | 'middle_east' | 'rus' | 'south_asia')
                  }
                  className="px-2 py-1 bg-white hover:bg-[#EFEBE0] border border-[#D6CFC0] rounded text-[#292524] cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>
            <span className="text-[#57534E]">
              Peta geopolitik dunia tahun 1066 M (Eropa, Afrika, Timur Tengah, Rusia &amp; Asia Selatan)
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[#57534E] font-medium mr-1">Fokus:</span>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'me', label: 'Wilayahku' },
                { id: 'britain', label: 'Britania' },
                { id: 'west', label: 'Prancis & Iberia' },
                { id: 'hre', label: 'HRE & Italia' },
                { id: 'east', label: 'Bizantium & Timur' },
              ].map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() => handlePreset(pr.id as 'all' | 'me' | 'britain' | 'west' | 'hre' | 'east')}
                  className="px-2 py-1 bg-white hover:bg-[#EFEBE0] border border-[#D6CFC0] rounded text-[#292524] cursor-pointer"
                >
                  {pr.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { key: 'capitals', label: '★ Ibukota' },
                  { key: 'ports', label: '⚓ Pelabuhan' },
                  { key: 'forts', label: '🏰 Benteng' },
                  { key: 'scholars', label: '📜 Skriptorium/Pasar' },
                  { key: 'subHoldings', label: '● Sub-Gelar (C/V/B)' },
                  { key: 'labels', label: 'Label Wilayah' },
                ] as const
              ).map((ly) => (
                <label key={ly.key} className="inline-flex items-center gap-1 text-[#44403C] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={layers[ly.key]}
                    onChange={() => setLayers((prev) => ({ ...prev, [ly.key]: !prev[ly.key] }))}
                    className="accent-[#9A6614]"
                  />
                  <span>{ly.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Pan/Zoom SVG Map Viewport */}
      <div className="px-3 sm:px-4">
        <div
          ref={svgContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          className="relative w-full h-[420px] sm:h-[520px] bg-[#CBE3ED] border-2 border-[#C7BDA6] rounded-lg overflow-hidden select-none touch-none shadow-inner cursor-grab active:cursor-grabbing"
        >
          {/* Floating Zoom Controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-[#FAF8F2]/95 border border-[#D6CFC0] rounded-md p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z + 0.35))}
              title="Perbesar Peta"
              className="p-1.5 hover:bg-[#EFEBE0] rounded text-[#1C1917] cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => clampZoom(z - 0.35))}
              title="Perkecil Peta"
              className="p-1.5 hover:bg-[#EFEBE0] rounded text-[#1C1917] cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => (mode === 'atlas1066' ? handleAtlasPreset('world') : handlePreset('all'))}
              title="Reset Posisi Peta"
              className="p-1.5 hover:bg-[#EFEBE0] rounded text-[#1C1917] cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {mode !== 'atlas1066' && (
              <button
                type="button"
                onClick={() => handlePreset('me')}
                title="Fokus ke Wilayahku"
                className="p-1.5 hover:bg-[#FAF3E0] rounded text-[#9A6614] cursor-pointer"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            )}
            <div className="text-[10px] font-num font-bold text-center text-[#57534E] pt-0.5 border-t border-[#E6E1D3]">
              {Math.round(zoom * 100)}%
            </div>
          </div>

          {/* Floating Compass Rose & Year Badge */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none bg-[#FAF8F2]/90 border border-[#D6CFC0] rounded-md px-2.5 py-1.5 shadow-xs flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#9A6614]" />
            <div>
              <div className="font-display text-xs font-bold text-[#1C1917]">
                {mode === 'atlas1066' ? 'Atlas Politik Dunia 1066 M' : `Peta Kronik ${engine.G.tahun} M`}
              </div>
              <div className="text-[10px] text-[#57534E]">
                Seret untuk menggeser · Scroll/Tombol untuk zoom
              </div>
            </div>
          </div>

          {/* Transformable Map Canvas (Atlas 1066 Image OR Interactive SVG Map) */}
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragRef.current.active ? 'none' : 'transform 140ms ease-out',
            }}
          >
            {mode === 'atlas1066' ? (
              <img
                src="/assets/aistudio/peta_wilayah_1066_3c98484c.png"
                alt="Peta Wilayah Politik Sekitar Tahun 1066 M"
                draggable={false}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain select-none pointer-events-none"
              />
            ) : (
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="w-full h-full"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            >
              <defs>
                <radialGradient id="oceanGrad" cx="48%" cy="46%" r="65%">
                  <stop offset="0%" stopColor="#D7ECF4" />
                  <stop offset="100%" stopColor="#B8D8E6" />
                </radialGradient>
                <pattern id="parchmentHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#78716C" strokeWidth="0.6" strokeOpacity="0.22" />
                </pattern>
              </defs>

              {/* Ocean Background */}
              <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#oceanGrad)" />

              {/* Cartographic Graticule Grid (inspired by reference maps) */}
              {[30, 35, 40, 45, 50, 55, 60].map((lat) => {
                const [, y] = lonLatToXY(0, lat);
                return (
                  <line
                    key={`lat_${lat}`}
                    x1="0"
                    y1={y}
                    x2={MAP_WIDTH}
                    y2={y}
                    stroke="#7DA8BA"
                    strokeWidth="0.6"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                );
              })}
              {[-10, 0, 10, 20, 30, 40].map((lon) => {
                const [x] = lonLatToXY(lon, 45);
                return (
                  <line
                    key={`lon_${lon}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2={MAP_HEIGHT}
                    stroke="#7DA8BA"
                    strokeWidth="0.6"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                );
              })}

              {/* Sea & Ocean Labels */}
              <g className="pointer-events-none select-none" fill="#3B6E84" fontStyle="italic" fontFamily="serif">
                <text x="110" y="235" fontSize="13" opacity="0.8">Samudra Atlantik</text>
                <text x="340" y="175" fontSize="11" opacity="0.8">Laut Utara</text>
                <text x="560" y="135" fontSize="11" opacity="0.8">Laut Baltik</text>
                <text x="415" y="605" fontSize="12" opacity="0.85">Laut Tengah (Mediterania)</text>
                <text x="580" y="458" fontSize="9" opacity="0.8">Laut Adriatik</text>
                <text x="865" y="425" fontSize="11" opacity="0.85">Laut Hitam</text>
              </g>

              {/* Contextual 1066 Neighboring Realms (Scandinavia, Poland, Kievan Rus, Africa, Middle East) */}
              {CONTEXT_1066_REALMS.map((ctx) => {
                const pts = polygonFromLonLat(ctx.coords);
                const [cx, cy] = centroidFromLonLat(ctx.coords);
                const cult = CULTURE_MAP_COLORS[ctx.culture];
                const fill =
                  mode === 'culture'
                    ? cult?.fill || '#DFD6C3'
                    : mode === 'navy'
                      ? '#DCE3E8'
                      : '#E5DEC9';
                const opacity = mode === 'culture' && filterCulture && filterCulture !== ctx.culture ? 0.25 : 0.85;
                return (
                  <g key={ctx.id}>
                    <polygon
                      points={pts}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke="#9C927D"
                      strokeWidth="1"
                    />
                    <polygon points={pts} fill="url(#parchmentHatch)" className="pointer-events-none" />
                    {layers.labels && (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="600"
                        fill={mode === 'culture' ? cult?.text || '#44403C' : '#57534E'}
                        opacity="0.85"
                        className="pointer-events-none"
                      >
                        {ctx.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Playable 1066 Historical Region Polygons */}
              {regionSnapshots.map((snap) => {
                const pts = polygonFromLonLat(snap.reg.coords);
                const { fill, stroke, opacity } = getFillAndStroke(snap);
                const isSelected = snap.reg.id === selectedId;
                return (
                  <g
                    key={snap.reg.id}
                    onClick={() => {
                      if (dragRef.current.moved) return;
                      setSelectedId(snap.reg.id);
                    }}
                    className="cursor-pointer"
                  >
                    <polygon
                      points={pts}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={isSelected ? '#FFFFFF' : snap.isPlayerOwned ? '#FDE047' : stroke}
                      strokeWidth={isSelected ? 2.6 : snap.isPlayerOwned ? 2.1 : 1.1}
                    />
                    {isSelected && (
                      <polygon
                        points={pts}
                        fill="none"
                        stroke="#1C1917"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                      />
                    )}
                  </g>
                );
              })}

              {/* Sub-Holding Tier Markers (Count=Merah, Viscount=Hijau, Baron=Hitam, Marquis=Biru) */}
              {layers.subHoldings &&
                regionSnapshots.map((snap) =>
                  snap.subNodes.map((sn) => {
                    // Always show Baron/Viscount/Marquis or show all Counties when zoomed >= 1.55 or selected
                    const isLowerCustom = sn.colorKey === 'baron' || sn.colorKey === 'viscount' || sn.colorKey === 'marquis';
                    if (!isLowerCustom && zoom < 1.45 && snap.reg.id !== selectedId) return null;
                    const cStyle =
                      mode === 'culture'
                        ? { fill: (CULTURE_MAP_COLORS[sn.title.budaya]?.fill || '#9CA3AF'), stroke: '#1C1917' }
                        : mode === 'navy'
                          ? { fill: sn.coastal ? '#0284C7' : '#A8A29E', stroke: '#0F172A' }
                          : TIER_MAP_COLORS[sn.colorKey];
                    const r = isLowerCustom ? 4.2 : 2.8;
                    return (
                      <circle
                        key={sn.title.id}
                        cx={sn.x}
                        cy={sn.y}
                        r={r / Math.min(2.2, Math.max(1, zoom * 0.75))}
                        fill={cStyle.fill}
                        stroke={cStyle.stroke}
                        strokeWidth={0.9 / Math.min(2, Math.max(1, zoom * 0.7))}
                        className="pointer-events-none"
                      >
                        <title>{`${sn.title.nama} (${TIER_MAP_COLORS[sn.colorKey].label})`}</title>
                      </circle>
                    );
                  })
                )}

              {/* Map Landmarks & Icons (Capitals, Ports, Forts, Scriptoriums, War/Plague) */}
              {regionSnapshots.map((snap) => {
                const { markers, reg, cx, cy } = snap;
                const scaleInv = 1 / Math.min(2.4, Math.max(1, zoom * 0.65));
                const [capX, capY] = reg.capitalLonLat ? lonLatToXY(reg.capitalLonLat[0], reg.capitalLonLat[1]) : [cx, cy];
                const [portX, portY] = reg.portLonLat ? lonLatToXY(reg.portLonLat[0], reg.portLonLat[1]) : [cx + 8, cy + 7];

                return (
                  <g key={`mk_${reg.id}`} className="pointer-events-none">
                    {/* Capital Star / Crown */}
                    {layers.capitals && markers.isCapital && (
                      <g transform={`translate(${capX}, ${capY}) scale(${scaleInv})`}>
                        {markers.isPlayerCapital && (
                          <circle r="8.5" fill="none" stroke="#FACC15" strokeWidth="2" />
                        )}
                        <circle
                          r={markers.capitalKind === 'empire' ? 5.2 : markers.capitalKind === 'kingdom' ? 4.2 : 3.2}
                          fill={markers.isPlayerCapital ? '#9A6614' : markers.capitalKind === 'empire' ? '#FACC15' : '#FFFFFF'}
                          stroke="#1C1917"
                          strokeWidth="1.1"
                        />
                        <text
                          y="2.5"
                          textAnchor="middle"
                          fontSize={markers.capitalKind === 'empire' ? '7.5' : '6'}
                          fill={markers.isPlayerCapital ? '#FFFFFF' : '#1C1917'}
                          fontWeight="bold"
                        >
                          ★
                        </text>
                      </g>
                    )}

                    {/* Coastal Port / Shipyard Anchor */}
                    {layers.ports && markers.hasCoast && reg.portLonLat && (
                      <g transform={`translate(${portX}, ${portY}) scale(${scaleInv})`}>
                        <circle
                          r="4.5"
                          fill={markers.hasShipyard ? '#0284C7' : '#E0F2FE'}
                          stroke="#0C4A6E"
                          strokeWidth="1"
                        />
                        <text
                          y="2.2"
                          textAnchor="middle"
                          fontSize="6.2"
                          fill={markers.hasShipyard ? '#FFFFFF' : '#0369A1'}
                        >
                          ⚓
                        </text>
                      </g>
                    )}

                    {/* Marquis / Fortress Marker */}
                    {layers.forts && markers.hasFortress && (
                      <g transform={`translate(${cx - 9 * scaleInv}, ${cy - 6 * scaleInv}) scale(${scaleInv})`}>
                        <rect x="-4" y="-4" width="8" height="8" rx="1.5" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="0.8" />
                        <text y="2.2" textAnchor="middle" fontSize="5.5" fill="#FFFFFF">🏰</text>
                      </g>
                    )}

                    {/* Scriptorium / Trade Market */}
                    {layers.scholars && (markers.hasScriptorium || markers.hasMarket) && zoom >= 1.35 && (
                      <g transform={`translate(${cx + 10 * scaleInv}, ${cy - 6 * scaleInv}) scale(${scaleInv})`}>
                        <circle r="4.2" fill="#FEF3C7" stroke="#9A6614" strokeWidth="0.8" />
                        <text y="2" textAnchor="middle" fontSize="5.5">
                          {markers.hasScriptorium ? '📜' : '⚖'}
                        </text>
                      </g>
                    )}

                    {/* Live War / Plague Indicator */}
                    {(markers.hasWar || markers.hasPlague) && (
                      <g transform={`translate(${cx}, ${cy - 11 * scaleInv}) scale(${scaleInv})`}>
                        <circle r="5" fill={markers.hasWar ? '#991B1B' : '#292524'} stroke="#FFFFFF" strokeWidth="0.9" />
                        <text y="2.3" textAnchor="middle" fontSize="6" fill="#FFFFFF">
                          {markers.hasWar ? '⚔' : '☠'}
                        </text>
                      </g>
                    )}

                    {/* Region Name Label */}
                    {layers.labels && (
                      <text
                        x={cx}
                        y={cy + 9 * scaleInv}
                        textAnchor="middle"
                        fontSize={Math.max(4.6, 8.2 / Math.min(2.2, Math.max(1, zoom * 0.72)))}
                        fontWeight="700"
                        fill="#FFFFFF"
                        stroke="#1C1917"
                        strokeWidth={2.2 / Math.min(2.2, Math.max(1, zoom * 0.72))}
                        paintOrder="stroke"
                      >
                        {reg.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Historical 1066 Battles & Great Cities from 1066 Atlas */}
              {HISTORICAL_1066_LANDMARKS.map((lm) => {
                const [lx, ly] = lonLatToXY(lm.lonLat[0], lm.lonLat[1]);
                const scaleInv = 1 / Math.min(2.4, Math.max(1, zoom * 0.65));
                if (lm.kind === 'city' && zoom < 1.15 && !layers.labels) return null;
                return (
                  <g key={lm.id} transform={`translate(${lx}, ${ly}) scale(${scaleInv})`} className="pointer-events-none">
                    {lm.kind === 'battle' ? (
                      <>
                        <circle r="4.6" fill="#FACC15" stroke="#991B1B" strokeWidth="1.2" />
                        <text y="2.2" textAnchor="middle" fontSize="6" fill="#991B1B" fontWeight="bold">⚔</text>
                        {zoom >= 1.35 && (
                          <text
                            y="-7"
                            textAnchor="middle"
                            fontSize="5.8"
                            fontWeight="700"
                            fill="#FEF08A"
                            stroke="#450A0A"
                            strokeWidth="2"
                            paintOrder="stroke"
                          >
                            {lm.label}
                          </text>
                        )}
                      </>
                    ) : (
                      <>
                        <circle r="2.6" fill="#1C1917" stroke="#FAF8F2" strokeWidth="0.9" />
                        {layers.labels && (
                          <text
                            x="5"
                            y="2"
                            textAnchor="start"
                            fontSize="6"
                            fontWeight="700"
                            fill="#292524"
                            stroke="#FAF8F2"
                            strokeWidth="1.8"
                            paintOrder="stroke"
                          >
                            {lm.label}
                          </text>
                        )}
                      </>
                    )}
                    <title>{`${lm.label} — ${lm.sublabel}`}</title>
                  </g>
                );
              })}
            </svg>
            )}
          </div>
        </div>
      </div>

      {/* Map Legends */}
      <div className="px-3 sm:px-4">
        {mode === 'atlas1066' ? (
          <div className="p-3 bg-[#FAF8F2] border border-[#DDD6C3] rounded-md space-y-1.5 text-xs text-[#44403C]">
            <div className="font-semibold text-[#1C1917]">
              Atlas Geopolitik Dunia Sekitar Tahun 1066 M (Peta Referensi Lengkap)
            </div>
            <p className="text-[11px] leading-relaxed text-[#57534E]">
              Menampilkan gabungan proyeksi Eropa, Afrika (Murabithun, Fatimiyah, Ghana, Kanem, Nubia, Etiopia), Timur Tengah (Seljuk Agung, Ghaznawi, Qarakhaniyah), Rusia (Rus Kiev, Bulgaria Volga, Kipchak-Kuman), dan Asia Selatan (Chola, Chalukya Barat, Pala-Sena). Gunakan tombol fokus atau gulir untuk memperbesar hingga detail legenda dan lokasi pertempuran tahun 1066 M.
            </p>
          </div>
        ) : mode === 'culture' ? (
          <div className="p-3 bg-[#FAF8F2] border border-[#DDD6C3] rounded-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1C1917]">
                Legenda Peta Budaya (Klik budaya untuk menyorot wilayah)
              </span>
              {filterCulture && (
                <button
                  type="button"
                  onClick={() => setFilterCulture(null)}
                  className="text-[11px] font-semibold text-[#9A6614] hover:underline cursor-pointer"
                >
                  Tampilkan Semua Budaya
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {culturesPresent.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilterCulture((prev) => (prev === c.id ? null : c.id))}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] border cursor-pointer ${
                    filterCulture === c.id
                      ? 'border-[#1C1917] ring-1 ring-[#1C1917] font-bold bg-white'
                      : 'border-[#D6CFC0] bg-white hover:bg-[#EFEBE0]'
                  }`}
                >
                  <span className="w-3 h-3 rounded-xs shrink-0 border border-black/20" style={{ backgroundColor: c.fill }} />
                  <span>{c.nama}</span>
                </button>
              ))}
            </div>
          </div>
        ) : mode === 'navy' ? (
          <div className="p-3 bg-[#FAF8F2] border border-[#DDD6C3] rounded-md flex flex-wrap items-center gap-4 text-xs text-[#44403C]">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#0284C7] border border-[#0C4A6E]" />
              <span>Memiliki Perairan + Galangan Kapal (Armada Aktif)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#38BDF8] border border-[#0C4A6E]" />
              <span>Wilayah Pesisir / Perairan (Bisa Bangun Angkatan Laut)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-[#D6CFC0] border border-[#78716C]" />
              <span>Wilayah Pedalaman (Tidak Bisa Memiliki Angkatan Laut)</span>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-[#FAF8F2] border border-[#DDD6C3] rounded-md space-y-2">
            <div className="text-xs font-semibold text-[#1C1917]">
              Legenda Warna Tingkatan Wilayah yang Dipegang &amp; Penanda Peta
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {(['emperor', 'king', 'marquis', 'duke', 'count', 'viscount', 'baron'] as const).map((k) => {
                const st = TIER_MAP_COLORS[k];
                return (
                  <div
                    key={k}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[#D6CFC0] rounded"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-xs border border-black/30 shrink-0"
                      style={{ backgroundColor: st.fill }}
                    />
                    <span className="font-medium text-[#1C1917]">{st.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-[#57534E] pt-1 border-t border-[#E6E1D3]">
              <span>★ Ibukota Wilayah / Negara</span>
              <span>⚓ Pelabuhan &amp; Akses Perairan</span>
              <span>🏰 Benteng / Perbatasan Marquis</span>
              <span>📜 Pusat Ilmu / Skriptorium</span>
              <span>⚖ Pusat Perdagangan</span>
              <span>⚔ Perang / ☠ Wabah</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Territory Inspector Panel */}
      <div className="px-3 sm:px-4 pb-4">
        <div className="bg-white border border-[#DDD6C3] rounded-lg overflow-hidden shadow-xs">
          <div className="p-4 bg-[#FAF8F2] border-b border-[#E6E1D3] flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {selTitle && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-bold rounded"
                    style={{
                      backgroundColor: getTierBadge(selTitle).badgeBg,
                      color: getTierBadge(selTitle).badgeText,
                    }}
                  >
                    {getTierBadge(selTitle).label}
                  </span>
                )}
                <h3 className="font-display text-base sm:text-lg font-bold text-[#1C1917]">
                  {selTitle?.nama || selectedSnapshot.reg.label}
                </h3>
              </div>
              <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>
                  Budaya: <strong className="text-[#1C1917]">{selectedSnapshot.cultureInfo.nama}</strong>
                </span>
                <span>·</span>
                <span>
                  Agama: <strong className="text-[#1C1917]">{selTitle ? engine.AG(selTitle.agama).nama : '—'}</strong>
                </span>
                <span>·</span>
                <span className={selMarkers.hasCoast ? 'text-[#0369A1] font-semibold' : 'text-[#57534E]'}>
                  {selMarkers.hasCoast
                    ? 'Memiliki Perairan / Pesisir (Akses Angkatan Laut)'
                    : 'Pedalaman / Daratan (Tanpa Angkatan Laut)'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedSnapshot.isPlayerOwned && selTitle && (
                <button
                  type="button"
                  onClick={() => engine.go(selTitle.tier <= 3 ? 'pv' : 'prov', selTitle.tier <= 3 ? selTitle.id : undefined)}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#9A6614] hover:bg-[#7E520E] text-white rounded cursor-pointer"
                >
                  Kelola Wilayah
                </button>
              )}
              {selTitle && (
                <button
                  type="button"
                  onClick={() => engine.go('gt', selTitle.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] text-[#1C1917] rounded cursor-pointer"
                >
                  Hierarki Gelar
                </button>
              )}
              {selIsEnemy && selTitle && selOwner && (
                <>
                  {p && engine.isRuler(p) && (
                    <button
                      type="button"
                      onClick={() => engine.go('wc', selTitle.id)}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#991B1B] hover:bg-[#7F1D1D] text-white rounded cursor-pointer inline-flex items-center gap-1"
                    >
                      <Swords className="w-3.5 h-3.5" /> Perang
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => engine.go('ch', selOwner.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#D6CFC0] hover:bg-[#EFEBE0] text-[#1C1917] rounded cursor-pointer"
                  >
                    Profil Penguasa
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Holders & Hierarchy */}
            <div className="space-y-2">
              <div className="font-semibold text-[#44403C] uppercase tracking-wider text-[11px]">
                Struktur Penguasa &amp; Kedaulatan
              </div>
              <div className="p-2.5 bg-[#FAF8F2] border border-[#E6E1D3] rounded space-y-1.5">
                <div>
                  <span className="text-[#57534E]">Pemegang Langsung: </span>
                  {selOwner ? (
                    <button
                      type="button"
                      onClick={() => engine.go('ch', selOwner.id)}
                      className="font-semibold text-[#9A6614] hover:underline cursor-pointer text-left"
                    >
                      {engine.full(selOwner)} ({engine.getTitleOrdinalInfo(selOwner, selTitle!)?.label || engine.tTitle(selOwner)})
                    </button>
                  ) : (
                    <span className="text-[#78716C]">Kursi Kosong</span>
                  )}
                </div>
                {selOwner && (
                  <div className="text-[11px] text-[#57534E] space-y-0.5">
                    <div>{engine.describeCharacterIdentity(selOwner).ordinalLabel}</div>
                    <div>
                      Ayah: {selOwner.ayah && engine.C[selOwner.ayah] ? engine.full(engine.C[selOwner.ayah]) : '—'} · Ibu:{' '}
                      {selOwner.ibu && engine.C[selOwner.ibu] ? engine.full(engine.C[selOwner.ibu]) : '—'}
                    </div>
                  </div>
                )}
                {selectedSnapshot.sovTitle && selectedSnapshot.sovTitle.id !== selTitle?.id && (
                  <div className="pt-1 border-t border-[#E6E1D3]">
                    <span className="text-[#57534E]">Penguasa Berdaulat Atas: </span>
                    <span
                      className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded mr-1"
                      style={{
                        backgroundColor: getTierBadge(selectedSnapshot.sovTitle).badgeBg,
                        color: getTierBadge(selectedSnapshot.sovTitle).badgeText,
                      }}
                    >
                      {selectedSnapshot.sovTitle.nama}
                    </span>
                    {selSov && (
                      <button
                        type="button"
                        onClick={() => engine.go('ch', selSov.id)}
                        className="font-semibold text-[#1C1917] hover:underline cursor-pointer"
                      >
                        {engine.full(selSov)}
                      </button>
                    )}
                  </div>
                )}
                <div className="pt-1 border-t border-[#E6E1D3] flex flex-wrap gap-3 text-[11px]">
                  <span>
                    Pasukan Penguasa: <strong className="font-num">{selOwner ? Math.round(engine.pwr(selOwner)) : 0}</strong>
                  </span>
                  <span>
                    Angkatan Laut:{' '}
                    <strong className="font-num">
                      {selOwner && selMarkers.hasCoast
                        ? `${selOwner.id === p?.id ? engine.navy() : engine.getNpcNavalPower(selOwner)} (Pesisir)`
                        : '0 (Tanpa Akses Laut)'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Infrastructure & Landmarks */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selMarkers.isCapital && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF3C7] text-[#78350F] border border-[#FDE68A] rounded text-[11px] font-medium">
                    <Crown className="w-3 h-3" /> Ibukota Wilayah
                  </span>
                )}
                {selMarkers.hasCoast && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] rounded text-[11px] font-medium">
                    <Anchor className="w-3 h-3" /> {selMarkers.hasShipyard ? 'Pelabuhan & Galangan Kapal' : 'Pesisir (Bisa Bangun Pelabuhan)'}
                  </span>
                )}
                {selMarkers.hasFortress && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#EFF6FF] text-[#1E3A8A] border border-[#BFDBFE] rounded text-[11px] font-medium">
                    <Shield className="w-3 h-3" /> Benteng / Wilayah Perbatasan
                  </span>
                )}
                {selMarkers.hasScriptorium && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#F5F3FF] text-[#5B21B6] border border-[#DDD6FE] rounded text-[11px] font-medium">
                    <BookOpen className="w-3 h-3" /> Skriptorium &amp; Pusat Ilmu
                  </span>
                )}
                {selMarkers.hasMarket && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] rounded text-[11px] font-medium">
                    <Sparkles className="w-3 h-3" /> Pusat Niaga
                  </span>
                )}
              </div>
            </div>

            {/* Sub-holdings list (Count, Viscount, Baron) */}
            <div className="space-y-2">
              <div className="font-semibold text-[#44403C] uppercase tracking-wider text-[11px]">
                Daftar Wilayah &amp; Gelar Bawahan ({selectedSnapshot.subs.length})
              </div>
              {selectedSnapshot.subs.length === 0 ? (
                <div className="p-3 bg-[#FAF8F2] border border-[#E6E1D3] rounded text-[11px] text-[#57534E]">
                  Wilayah ini merupakan kesatuan langsung tanpa sub-county bawahan.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-[#E6E1D3] rounded divide-y divide-[#E6E1D3]">
                  {selectedSnapshot.subs.map((st) => {
                    const stOwner = st.pem && engine.C[st.pem]?.hidup ? engine.C[st.pem] : null;
                    const badge = getTierBadge(st);
                    const coastal = engine.isTitleCoastal(st);
                    return (
                      <div
                        key={st.id}
                        className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-[#FAF8F2]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-xs shrink-0"
                              style={{ backgroundColor: badge.fill }}
                            />
                            <span className="font-semibold text-[#1C1917] truncate">{st.nama}</span>
                            {coastal && <span className="text-[10px] text-[#0369A1]">⚓</span>}
                          </div>
                          <div className="text-[11px] text-[#57534E] truncate">
                            {stOwner ? engine.full(stOwner) : 'Kosong'} · {CULTURE_MAP_COLORS[st.budaya]?.nama || st.budaya}
                          </div>
                        </div>
                        {stOwner && (
                          <button
                            type="button"
                            onClick={() => engine.go('ch', stOwner.id)}
                            className="text-[11px] font-semibold text-[#9A6614] hover:underline shrink-0 cursor-pointer"
                          >
                            Lihat
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selTitle && (() => {
                const succ = engine.getTitleSuccessionHistory(selTitle.id);
                if (succ.entries.length <= 1 && !succ.priorNote) return null;
                return (
                  <div className="pt-2 space-y-1.5">
                    <div className="font-semibold text-[#44403C] uppercase tracking-wider text-[11px]">
                      Urutan Penguasa {selTitle.nama} (Ke-{succ.currentOrdinal})
                    </div>
                    {succ.priorNote && (
                      <div className="text-[10px] text-[#78716C] italic">
                        {succ.priorNote}
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto border border-[#E6E1D3] rounded divide-y divide-[#E6E1D3] bg-[#FAF8F2]">
                      {succ.entries.slice().reverse().map((ent) => (
                        <div
                          key={`${ent.order}-${ent.displayName}`}
                          className={`px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] ${
                            ent.isCurrent ? 'bg-[#FEF3C7]/70 font-semibold text-[#1C1917]' : 'text-[#44403C]'
                          }`}
                        >
                          <div className="min-w-0 truncate">
                            <span className="font-num text-[#78350F] mr-1">#{ent.order}</span>
                            <span>{ent.displayName}</span>
                            {ent.julukan && <span className="text-[#78716C]"> &ldquo;{ent.julukan}&rdquo;</span>}
                            {ent.dinastiNama && <span className="text-[#78716C]"> · {ent.dinastiNama}</span>}
                          </div>
                          <span className="font-num text-[10px] text-[#57534E] shrink-0">
                            {ent.dari}–{ent.sampai}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
