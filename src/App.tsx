import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Search,
  ChevronRight,
  QrCode,
  Compass,
  Settings,
  X,
  ArrowRight,
  DoorOpen
} from 'lucide-react';
import initialDataJson from './data/wayfindingData.json';
import {
  BlockKind,
  TourLandmarkStation,
  WayfindingBlock,
  WayfindingDataset
} from './types/wayfinding';
import {
  InteractiveAerialMap,
  KIND_LABELS,
  SelectedEntity
} from './components/InteractiveAerialMap';
import { QrModalAndGenerator } from './components/QrModalAndGenerator';
import { AdminPanel } from './components/AdminPanel';

const STORAGE_KEY_DATASET = 'unellez_vpa_sketch_wayfinding_v8';
const STORAGE_KEY_VISITED = 'unellez_vpa_sketch_visited_v8';

export default function App() {
  const [dataset, setDataset] = useState<WayfindingDataset>(
    () => initialDataJson as WayfindingDataset
  );

  // Sync automatically whenever wayfindingData.json is updated in development
  useEffect(() => {
    setDataset(initialDataJson as WayfindingDataset);
  }, [initialDataJson]);

  const [visitedStationIds, setVisitedStationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VISITED);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [currentHere, setCurrentHere] = useState<{
    x: number;
    y: number;
    label: string;
    stationNumber?: number;
  }>(dataset.defaultHerePoint);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'tour' | 'oficina' | 'aula' | 'estacionamiento' | 'bano'
  >('all');
  const [showTourIcons, setShowTourIcons] = useState<boolean>(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  const sortedStations = useMemo(
    () =>
      [...dataset.tourStations].sort(
        (a, b) => a.stationNumber - b.stationNumber
      ),
    [dataset.tourStations]
  );

  // Next Tour Station helper
  const nextTourStation = useMemo(() => {
    if (selected?.type === 'station') {
      const idx = sortedStations.findIndex((s) => s.id === selected.item.id);
      if (idx >= 0 && idx < sortedStations.length - 1) {
        return sortedStations[idx + 1];
      }
    }
    if (currentHere.stationNumber) {
      const idx = sortedStations.findIndex(
        (s) => s.stationNumber === currentHere.stationNumber
      );
      if (idx >= 0 && idx < sortedStations.length - 1) {
        return sortedStations[idx + 1];
      }
    }
    return sortedStations[0] || null;
  }, [selected, currentHere, sortedStations]);

  const markStationVisited = (stationId: string) => {
    setVisitedStationIds((prev) => {
      if (prev.includes(stationId)) return prev;
      const next = [...prev, stationId];
      localStorage.setItem(STORAGE_KEY_VISITED, JSON.stringify(next));
      return next;
    });
  };

  // Detect QR URL scan parameters (?station=tour-est-1 or ?zone=of-oeste-pabellon)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stationParam = params.get('station');
    const zoneParam = params.get('zone');

    if (stationParam) {
      const st = dataset.tourStations.find(
        (s) =>
          s.id.toLowerCase() === stationParam.toLowerCase() ||
          String(s.stationNumber) === stationParam
      );
      if (st) {
        handleSimulateScanStation(st);
      }
    } else if (zoneParam) {
      const blk = dataset.blocks.find(
        (b) =>
          b.id.toLowerCase() === zoneParam.toLowerCase() ||
          b.code.toLowerCase() === zoneParam.toLowerCase()
      );
      if (blk) {
        handleSimulateScanBlock(blk);
      }
    }
  }, []);

  // Persist edits in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DATASET, JSON.stringify(dataset));
    } catch {
      // ignore
    }
  }, [dataset]);

  const handleSimulateScanStation = (station: TourLandmarkStation) => {
    setCurrentHere({
      x: station.walkwayX,
      y: station.walkwayY,
      label: station.name,
      stationNumber: station.stationNumber,
    });
    setSelected({ type: 'station', item: station });
    markStationVisited(station.id);

    const url = new URL(window.location.href);
    url.searchParams.set('station', station.id);
    url.searchParams.delete('zone');
    window.history.replaceState({}, '', url.toString());
  };

  const handleSimulateScanBlock = (block: WayfindingBlock) => {
    setCurrentHere({
      x: block.doorX,
      y: block.doorY,
      label: block.name,
    });
    setSelected({ type: 'block', item: block });

    const url = new URL(window.location.href);
    url.searchParams.set('zone', block.id);
    url.searchParams.delete('station');
    window.history.replaceState({}, '', url.toString());
  };

  const handleAdvanceToNextStation = (nextStation: TourLandmarkStation) => {
    setSelected({ type: 'station', item: nextStation });
    markStationVisited(nextStation.id);
  };

  // Filtered items for Left Sidebar
  const filteredBlocks = useMemo(() => {
    if (activeFilter === 'tour') return [];
    const q = searchQuery.trim().toLowerCase();
    return dataset.blocks.filter((b) => {
      if (activeFilter !== 'all' && b.kind !== activeFilter) return false;
      if (!q) return true;
      const inSubOffices = (b.subOffices || []).some((s) =>
        s.name.toLowerCase().includes(q)
      );
      return (
        b.name.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        inSubOffices
      );
    });
  }, [dataset.blocks, searchQuery, activeFilter]);

  const filteredStations = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'tour') return [];
    const q = searchQuery.trim().toLowerCase();
    return sortedStations.filter((s) => {
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [sortedStations, searchQuery, activeFilter]);

  // Admin handlers
  const handleUpdateBlock = (updated: WayfindingBlock) => {
    setDataset((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === updated.id ? updated : b)),
    }));
    setSelected({ type: 'block', item: updated });
  };

  const handleUpdateBlockBox = (
    blockId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    setDataset((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => {
        if (b.id !== blockId) return b;
        const updated = {
          ...b,
          x,
          y,
          width,
          height,
          doorX: x > 450 ? 592 : 225,
          doorY: Math.round(y + height / 2),
        };
        if (selected?.type === 'block' && selected.item.id === blockId) {
          setSelected({ type: 'block', item: updated });
        }
        return updated;
      }),
    }));
  };

  const handleUpdateStation = (updated: TourLandmarkStation) => {
    setDataset((prev) => ({
      ...prev,
      tourStations: prev.tourStations.map((s) =>
        s.id === updated.id ? updated : s
      ),
    }));
    setSelected({ type: 'station', item: updated });
  };

  const handleUpdateStationPos = (stationId: string, x: number, y: number) => {
    setDataset((prev) => ({
      ...prev,
      tourStations: prev.tourStations.map((s) => {
        if (s.id !== stationId) return s;
        const updated = { ...s, x, y, walkwayX: x > 450 ? 592 : 225, walkwayY: y };
        if (selected?.type === 'station' && selected.item.id === stationId) {
          setSelected({ type: 'station', item: updated });
        }
        return updated;
      }),
    }));
  };

  const handleCreateBlock = (kind: BlockKind) => {
    const num = dataset.blocks.length + 1;
    const newBlock: WayfindingBlock = {
      id: `of-vpa-${Date.now()}`,
      code: `OF-${num}`,
      name: `Nuevo Módulo ${num}`,
      subtitle: 'Oficinas & Cubículos',
      kind,
      description: 'Módulo de oficinas creado desde el panel administrador.',
      schedule: '08:00 - 16:00 hrs',
      responsible: 'Coordinación VPA',
      locationLabel: 'Recinto VPA',
      subOffices: [
        { id: 's1', name: 'Oficina Interna A' },
        { id: 's2', name: 'Oficina Interna B' },
      ],
      x: 340,
      y: 440,
      width: 65,
      height: 50,
      doorX: 372,
      doorY: 494,
    };
    setDataset((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setSelected({ type: 'block', item: newBlock });
  };

  const handleCreateStation = () => {
    const num = dataset.tourStations.length + 1;
    const newStation: TourLandmarkStation = {
      id: `tour-est-${Date.now()}`,
      stationNumber: num,
      name: `Estación ${num}: Nuevo Hito VPA`,
      subtitle: 'Punto del Recorrido Guiado',
      icon: 'monument',
      description: 'Nueva estación del recorrido guiado por QR.',
      historicalNote: 'Hito patrimonial del Antiguo Convento de San Francisco.',
      audioText: `Bienvenido a la Estación ${num} del recorrido guiado del Vicerrectorado de Producción Agrícola.`,
      x: 380,
      y: 450,
      walkwayX: 380,
      walkwayY: 494,
    };
    setDataset((prev) => ({
      ...prev,
      tourStations: [...prev.tourStations, newStation],
    }));
    setSelected({ type: 'station', item: newStation });
  };

  const handleSubdivideBlock = (block: WayfindingBlock) => {
    const isHorizontalSplit = block.width >= block.height;
    const halfW = isHorizontalSplit
      ? Math.max(36, Math.floor((block.width - 6) / 2))
      : block.width;
    const halfH = isHorizontalSplit
      ? block.height
      : Math.max(34, Math.floor((block.height - 6) / 2));

    const firstHalf: WayfindingBlock = {
      ...block,
      width: halfW,
      height: halfH,
      name: `${block.name} (A)`,
    };

    const secondHalf: WayfindingBlock = {
      ...block,
      id: `${block.id}-b-${Date.now()}`,
      code: `${block.code}B`,
      name: `${block.name} (B)`,
      x: isHorizontalSplit ? block.x + halfW + 6 : block.x,
      y: isHorizontalSplit ? block.y : block.y + halfH + 6,
      width: halfW,
      height: halfH,
    };

    setDataset((prev) => ({
      ...prev,
      blocks: prev.blocks
        .map((b) => (b.id === block.id ? firstHalf : b))
        .concat(secondHalf),
    }));
    setSelected({ type: 'block', item: secondHalf });
  };

  const handleDeleteBlock = (blockId: string) => {
    setDataset((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== blockId),
    }));
    setSelected(null);
  };

  const handleDeleteStation = (stationId: string) => {
    setDataset((prev) => ({
      ...prev,
      tourStations: prev.tourStations.filter((s) => s.id !== stationId),
    }));
    setSelected(null);
  };

  const handleSaveToDisk = async (): Promise<boolean> => {
    localStorage.setItem(STORAGE_KEY_DATASET, JSON.stringify(dataset));
    try {
      const res = await fetch('/api/save-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleResetDefault = () => {
    localStorage.removeItem(STORAGE_KEY_DATASET);
    setDataset(initialDataJson as WayfindingDataset);
    setSelected(null);
  };

  const totalFound = filteredStations.length + filteredBlocks.length;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#EEF2F6]">
      {/* Top White Header */}
      <header className="h-[66px] shrink-0 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/25">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[16px] font-extrabold text-slate-900 leading-tight">
              Directorio & Wayfinding — UNELLEZ VPA
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {dataset.subtitle}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTourIcons((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              showTourIcons
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span className="hidden md:inline">
              {showTourIcons ? 'Estaciones Visibles' : 'Mostrar Estaciones'}
            </span>
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Códigos QR</span>
          </button>

          <button
            onClick={() => setIsAdminMode((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              isAdminMode
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isAdminMode ? 'Salir de Admin' : 'Admin'}
            </span>
          </button>
        </div>
      </header>

      {/* Guided Tour Ribbon (Estación 1 -> 2 -> 3 ... -> 8) */}
      <div className="bg-white border-b border-slate-200/70 px-5 py-2 flex items-center justify-between gap-3 text-xs z-20 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-extrabold text-indigo-700 uppercase tracking-wider text-[11px] flex items-center gap-1 mr-1">
            <Compass className="w-3.5 h-3.5" />
            Visita Guiada QR:
          </span>

          {sortedStations.map((st, idx) => {
            const isSelected =
              selected?.type === 'station' && selected.item.id === st.id;
            const isVisited = visitedStationIds.includes(st.id);

            return (
              <React.Fragment key={st.id}>
                <button
                  onClick={() => handleSimulateScanStation(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition whitespace-nowrap border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isVisited
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                    {st.stationNumber}
                  </span>
                  <span>
                    {st.name.replace(/^Estación \d+:\s*/, '').split('(')[0]}
                  </span>
                </button>
                {idx < sortedStations.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Clean White Sidebar Directory */}
        <aside className="w-[330px] sm:w-[365px] shrink-0 bg-white border-r border-slate-200/80 flex flex-col h-full z-20">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar oficina, cubículo, estación..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-8 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'tour', label: '★ Estaciones Tour' },
                { id: 'oficina', label: 'Oficinas' },
                { id: 'aula', label: 'Aulas / Salones' },
                { id: 'bano', label: 'Baños (WC)' },
                { id: 'estacionamiento', label: 'Estacionamientos' },
              ].map((pill) => {
                const isActive = activeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() =>
                      setActiveFilter(pill.id as typeof activeFilter)
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-2.5 flex items-center justify-between text-xs border-b border-slate-100 bg-slate-50/40">
            <span className="text-slate-500 font-medium">
              {totalFound} espacios encontrados
            </span>
            <span className="text-blue-600 font-bold">Planta Baja VPA</span>
          </div>

          {/* Scrollable Cards List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {/* 1. Tour Stations */}
            {filteredStations.map((st) => {
              const isSelected =
                selected?.type === 'station' && selected.item.id === st.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelected({ type: 'station', item: st })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition group ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-500 shadow-sm'
                      : 'bg-white hover:bg-slate-50/80 border-slate-100 hover:border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                      ★ ESTACIÓN {st.stationNumber} • VISITA GUIADA
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 mb-0.5">
                    {st.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {st.description}
                  </p>
                </div>
              );
            })}

            {/* 2. Office / Parking Blocks */}
            {filteredBlocks.map((block) => {
              const isSelected =
                selected?.type === 'block' && selected.item.id === block.id;
              const isParking = block.kind === 'estacionamiento';

              return (
                <div
                  key={block.id}
                  onClick={() => setSelected({ type: 'block', item: block })}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition group ${
                    isSelected
                      ? 'bg-blue-50/40 border-blue-500 shadow-sm'
                      : 'bg-white hover:bg-slate-50/80 border-slate-100 hover:border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.03)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          isParking
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {KIND_LABELS[block.kind]}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {block.code}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600" />
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-900 mb-0.5">
                    {block.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">
                    {block.subtitle} — {block.description}
                  </p>

                  {/* Show sub-offices badges inside directory card */}
                  {block.subOffices && block.subOffices.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                      {block.subOffices.map((sub, i) => (
                        <span
                          key={sub.id || i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] font-semibold text-slate-600 border border-slate-200/60"
                        >
                          <DoorOpen className="w-2.5 h-2.5 text-rose-500" />
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Interactive Map Area */}
        <InteractiveAerialMap
          dataset={dataset}
          selected={selected}
          currentHere={currentHere}
          nextTourStation={nextTourStation}
          visitedStationIds={visitedStationIds}
          showTourIcons={showTourIcons}
          onSelect={setSelected}
          onSetHereFromBlock={handleSimulateScanBlock}
          onSetHereFromStation={handleSimulateScanStation}
          onAdvanceToNextStation={handleAdvanceToNextStation}
          onOpenQr={() => setIsQrModalOpen(true)}
          isAdminMode={isAdminMode}
          onUpdateBlockBox={handleUpdateBlockBox}
          onUpdateStationPos={handleUpdateStationPos}
        />

        {/* Floating Admin Panel */}
        {isAdminMode && (
          <AdminPanel
            selected={selected}
            onUpdateBlock={handleUpdateBlock}
            onUpdateStation={handleUpdateStation}
            onCreateBlock={handleCreateBlock}
            onCreateStation={handleCreateStation}
            onSubdivideBlock={handleSubdivideBlock}
            onDeleteBlock={handleDeleteBlock}
            onDeleteStation={handleDeleteStation}
            onSaveToDisk={handleSaveToDisk}
            onResetDefault={handleResetDefault}
            onCloseAdmin={() => setIsAdminMode(false)}
          />
        )}
      </div>

      {/* QR Codes Modal */}
      <QrModalAndGenerator
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        blocks={dataset.blocks}
        tourStations={sortedStations}
        onSimulateScanStation={handleSimulateScanStation}
        onSimulateScanBlock={handleSimulateScanBlock}
      />
    </div>
  );
}
