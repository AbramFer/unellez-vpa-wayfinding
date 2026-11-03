import React, { useState, useRef } from 'react';
import {
  Plus,
  Minus,
  RotateCcw,
  Clock,
  User,
  Building2,
  ArrowRight,
  X,
  Volume2,
  Square,
  QrCode,
  MapPin,
  Layers,
  Compass,
  Car,
  DoorOpen,
  Sparkles
} from 'lucide-react';
import {
  TourIconType,
  TourLandmarkStation,
  WayfindingBlock,
  WayfindingDataset
} from '../types/wayfinding';
import { MediaGalleryViewer } from './MediaGalleryViewer';

export type SelectedEntity =
  | { type: 'block'; item: WayfindingBlock }
  | { type: 'station'; item: TourLandmarkStation }
  | null;

interface InteractiveMapProps {
  dataset: WayfindingDataset;
  selected: SelectedEntity;
  currentHere: { x: number; y: number; label: string; stationNumber?: number };
  nextTourStation: TourLandmarkStation | null;
  visitedStationIds: string[];
  showTourIcons: boolean;
  onSelect: (entity: SelectedEntity) => void;
  onSetHereFromBlock: (block: WayfindingBlock) => void;
  onSetHereFromStation: (station: TourLandmarkStation) => void;
  onAdvanceToNextStation: (station: TourLandmarkStation) => void;
  onOpenQr: () => void;
  isAdminMode: boolean;
  bgMode?: 'clean' | 'aerial' | 'sketch';
  onUpdateBlockBox?: (
    blockId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
  onUpdateStationPos?: (stationId: string, x: number, y: number) => void;
}

export const KIND_LABELS: Record<WayfindingBlock['kind'], string> = {
  oficina: 'Oficinas & Cubículos',
  aula: 'Aulas & Salones de Clases',
  estacionamiento: 'Estacionamiento Vehicular',
  patio: 'Patio / Área Verde',
  bano: 'Sanitarios / Baños',
};

// Render clean custom SVG illustrations for the Guided Tour Stations (Point 5 of user request)
const renderTourSvgIllustration = (icon: TourIconType) => {
  switch (icon) {
    case 'portico':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-9 7 H9 M-7 7 V-2 M7 7 V-2 M-3 7 V1 A3 3 0 0 1 3 1 V7" />
          <path d="M-10 -2 L0 -8 L10 -2 Z" fill="rgba(255,255,255,0.25)" />
        </g>
      );
    case 'fountain':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M-8 6 H8 M-6 3 H6 L4 6 H-4 Z" />
          <path d="M0 3 V-5 M0 -5 C-3 -8 -6 -5 -5 -2 M0 -5 C3 -8 6 -5 5 -2" />
        </g>
      );
    case 'columns':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M-8 -6 H8 M-8 6 H8 M-5 -6 V6 M0 -6 V6 M5 -6 V6" />
        </g>
      );
    case 'monument':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <polygon points="0,-8 2.5,-2.5 8,-2 4,2 5,8 0,5 -5,8 -4,2 -8,-2 -2.5,-2.5" fill="rgba(255,255,255,0.25)" />
        </g>
      );
    case 'book':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M0 -5 C-3 -7 -7 -6 -8 -4 V6 C-7 4 -3 3 0 5 C3 3 7 4 8 6 V-4 C7 -6 3 -7 0 -5 Z" />
          <path d="M0 -5 V5" />
        </g>
      );
    case 'trees':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <circle cx="0" cy="-2" r="5.5" fill="rgba(255,255,255,0.25)" />
          <path d="M0 3.5 V8 M-4 8 H4" />
        </g>
      );
    case 'rotunda':
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <polygon points="-5,-6 5,-6 8,0 5,6 -5,6 -8,0" fill="rgba(255,255,255,0.25)" />
          <circle cx="0" cy="0" r="2" fill="#FFFFFF" />
        </g>
      );
    case 'water-tank':
    default:
      return (
        <g stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
          <rect x="-6" y="-7" width="12" height="7" rx="2" fill="rgba(255,255,255,0.25)" />
          <path d="M-4 0 L-6 7 M4 0 L6 7 M-6 4 H6" />
        </g>
      );
  }
};

export const InteractiveAerialMap: React.FC<InteractiveMapProps> = ({
  dataset,
  selected,
  currentHere,
  nextTourStation,
  visitedStationIds,
  showTourIcons,
  onSelect,
  onSetHereFromBlock,
  onSetHereFromStation,
  onAdvanceToNextStation,
  onOpenQr,
  isAdminMode,
  bgMode = 'clean',
  onUpdateBlockBox,
  onUpdateStationPos,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTitle, setHoveredTitle] = useState<{
    name: string;
    sub: string;
    x: number;
    y: number;
  } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Admin drag state
  const [draggingBlock, setDraggingBlock] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [draggingStation, setDraggingStation] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute exact shortest path strictly along `dataset.walkways` using Dijkstra
  const activeRoutePath = React.useMemo(() => {
    if (!selected) return null;

    const startX = currentHere.x;
    const startY = currentHere.y;

    const doorX =
      selected.type === 'block' ? selected.item.doorX : selected.item.walkwayX;
    const doorY =
      selected.type === 'block' ? selected.item.doorY : selected.item.walkwayY;

    // Final connection point on the border of the selected block or station center
    let finalX =
      selected.type === 'block'
        ? selected.item.x + selected.item.width / 2
        : selected.item.x;
    let finalY =
      selected.type === 'block'
        ? selected.item.y + selected.item.height / 2
        : selected.item.y;

    if (selected.type === 'block') {
      const b = selected.item;
      finalX = Math.max(b.x, Math.min(b.x + b.width, doorX));
      finalY = Math.max(b.y, Math.min(b.y + b.height, doorY));
    }

    if (Math.hypot(startX - finalX, startY - finalY) < 6) return null;

    // 1. Project a point (px, py) onto segment (x1,y1)-(x2,y2)
    const projectOnSegment = (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return { x: x1, y: y1, dist: Math.hypot(px - x1, py - y1) };
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      const projX = Math.round(x1 + t * dx);
      const projY = Math.round(y1 + t * dy);
      return { x: projX, y: projY, dist: Math.hypot(px - projX, py - projY) };
    };

    // Find closest projection on any walkway for a given point
    const snapToWalkways = (px: number, py: number) => {
      let best = { x: px, y: py, dist: Infinity, segIdx: 0 };
      dataset.walkways.forEach((w, idx) => {
        const proj = projectOnSegment(px, py, w.x1, w.y1, w.x2, w.y2);
        if (proj.dist < best.dist) {
          best = { ...proj, segIdx: idx };
        }
      });
      return best;
    };

    const startSnap = snapToWalkways(startX, startY);
    const endSnap = snapToWalkways(doorX, doorY);

    // 2. Collect all candidate nodes on the walkway segments:
    //    endpoints, segment-to-segment intersections, plus startSnap and endSnap
    type NodePt = { id: string; x: number; y: number };
    const nodeMap = new Map<string, NodePt>();
    const addNode = (x: number, y: number): string => {
      const rx = Math.round(x);
      const ry = Math.round(y);
      const key = `${rx},${ry}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { id: key, x: rx, y: ry });
      }
      return key;
    };

    // Segment intersection helper for orthogonal/general segments
    const intersectSegments = (
      a: { x1: number; y1: number; x2: number; y2: number },
      b: { x1: number; y1: number; x2: number; y2: number }
    ) => {
      const denom =
        (b.y2 - b.y1) * (a.x2 - a.x1) - (b.x2 - b.x1) * (a.y2 - a.y1);
      if (Math.abs(denom) < 1e-6) return null;
      const ua =
        ((b.x2 - b.x1) * (a.y1 - b.y1) - (b.y2 - b.y1) * (a.x1 - b.x1)) /
        denom;
      const ub =
        ((a.x2 - a.x1) * (a.y1 - b.y1) - (a.y2 - a.y1) * (a.x1 - b.x1)) /
        denom;
      if (ua >= -0.01 && ua <= 1.01 && ub >= -0.01 && ub <= 1.01) {
        return {
          x: Math.round(a.x1 + ua * (a.x2 - a.x1)),
          y: Math.round(a.y1 + ua * (a.y2 - a.y1)),
        };
      }
      return null;
    };

    dataset.walkways.forEach((w) => {
      addNode(w.x1, w.y1);
      addNode(w.x2, w.y2);
    });

    for (let i = 0; i < dataset.walkways.length; i++) {
      for (let j = i + 1; j < dataset.walkways.length; j++) {
        const hit = intersectSegments(dataset.walkways[i], dataset.walkways[j]);
        if (hit) addNode(hit.x, hit.y);
      }
    }

    const startKey = addNode(startSnap.x, startSnap.y);
    const endKey = addNode(endSnap.x, endSnap.y);

    // 3. Build adjacency list by ordering all nodes that lie on each walkway segment
    const adj = new Map<string, Array<{ to: string; weight: number }>>();
    nodeMap.forEach((_, k) => adj.set(k, []));

    const isPointOnSegment = (
      px: number,
      py: number,
      w: { x1: number; y1: number; x2: number; y2: number }
    ) => {
      const proj = projectOnSegment(px, py, w.x1, w.y1, w.x2, w.y2);
      return proj.dist <= 2.5;
    };

    dataset.walkways.forEach((w) => {
      const nodesOnSeg: NodePt[] = [];
      nodeMap.forEach((n) => {
        if (isPointOnSegment(n.x, n.y, w)) {
          nodesOnSeg.push(n);
        }
      });
      nodesOnSeg.sort(
        (a, b) =>
          Math.hypot(a.x - w.x1, a.y - w.y1) -
          Math.hypot(b.x - w.x1, b.y - w.y1)
      );
      for (let i = 0; i < nodesOnSeg.length - 1; i++) {
        const u = nodesOnSeg[i];
        const v = nodesOnSeg[i + 1];
        const d = Math.hypot(u.x - v.x, u.y - v.y);
        adj.get(u.id)?.push({ to: v.id, weight: d });
        adj.get(v.id)?.push({ to: u.id, weight: d });
      }
    });

    // 4. Run Dijkstra from startKey to endKey
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const visited = new Set<string>();

    nodeMap.forEach((_, k) => {
      dist.set(k, Infinity);
      prev.set(k, null);
    });
    dist.set(startKey, 0);

    while (visited.size < nodeMap.size) {
      let u: string | null = null;
      let bestD = Infinity;
      dist.forEach((d, k) => {
        if (!visited.has(k) && d < bestD) {
          bestD = d;
          u = k;
        }
      });
      if (!u || u === endKey) break;
      visited.add(u);

      for (const edge of adj.get(u) || []) {
        const alt = bestD + edge.weight;
        if (alt < (dist.get(edge.to) ?? Infinity)) {
          dist.set(edge.to, alt);
          prev.set(edge.to, u);
        }
      }
    }

    // Reconstruct walkway node sequence
    const pathNodes: Array<{ x: number; y: number }> = [];
    let curr: string | null = endKey;
    while (curr) {
      const pt = nodeMap.get(curr);
      if (pt) pathNodes.unshift({ x: pt.x, y: pt.y });
      curr = prev.get(curr) || null;
    }

    // Add short connector from currentHere into startSnap and from endSnap into block border
    const fullPoints: Array<{ x: number; y: number }> = [
      { x: startX, y: startY },
      ...pathNodes,
      { x: finalX, y: finalY },
    ];

    return {
      d: fullPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' '),
      endX: finalX,
      endY: finalY,
    };
  }, [currentHere, selected, dataset.walkways]);

  const toggleSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'es-ES';
    utter.rate = 0.98;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const clientToSvg = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: Math.round(((clientX - rect.left) / rect.width) * 760),
      y: Math.round(((clientY - rect.top) / rect.height) * 1020),
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingBlock && isAdminMode && onUpdateBlockBox) {
      const pt = clientToSvg(e.clientX, e.clientY);
      const dx = pt.x - draggingBlock.startX;
      const dy = pt.y - draggingBlock.startY;
      const target = dataset.blocks.find((b) => b.id === draggingBlock.id);
      if (target) {
        onUpdateBlockBox(
          target.id,
          Math.max(60, Math.min(680 - target.width, draggingBlock.origX + dx)),
          Math.max(55, Math.min(940 - target.height, draggingBlock.origY + dy)),
          target.width,
          target.height
        );
      }
      return;
    }

    if (draggingStation && isAdminMode && onUpdateStationPos) {
      const pt = clientToSvg(e.clientX, e.clientY);
      const dx = pt.x - draggingStation.startX;
      const dy = pt.y - draggingStation.startY;
      onUpdateStationPos(
        draggingStation.id,
        Math.max(75, Math.min(685, draggingStation.origX + dx)),
        Math.max(70, Math.min(935, draggingStation.origY + dy))
      );
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingBlock(null);
    setDraggingStation(null);
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !draggingBlock && !draggingStation) {
      const t = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: t.clientX - pan.x, y: t.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanning && e.touches.length === 1) {
      const t = e.touches[0];
      setPan({
        x: t.clientX - panStart.x,
        y: t.clientY - panStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  return (
    <div
      className="relative flex-1 w-full h-full bg-[#EEF2F6] overflow-hidden flex items-center justify-center p-1.5 sm:p-5 select-none touch-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Interactive Vertical Architectural Canvas (760 x 1020 aspect ratio matching the sketch) */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition:
            isPanning || draggingBlock || draggingStation
              ? 'none'
              : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseDown={(e) => {
          if (!draggingBlock && !draggingStation) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
          }
        }}
        className="relative w-full h-full md:w-auto md:h-full md:max-h-[88vh] aspect-[760/1020] wayfinding-grid-bg rounded-2xl md:rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.1)] border border-slate-200 overflow-hidden"
      >
        {/* Optional Background Overlay (Aerial or User Sketch) */}
        {bgMode === 'aerial' && (
          <img
            src="/campus-vpa.jpg"
            alt="Captura Aérea VPA"
            className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
          />
        )}
        {bgMode === 'sketch' && (
          <img
            src="/campus-boceto.jpg"
            alt="Boceto Distribución VPA"
            className="absolute inset-0 w-full h-full object-fill opacity-40 pointer-events-none"
          />
        )}

        <svg
          ref={svgRef}
          viewBox="0 0 760 1020"
          className="w-full h-full"
          onClick={() => {
            if (!isAdminMode) onSelect(null);
          }}
        >
          {/* ==========================================================
              1. BLACK OUTER STREET FRAME (Point 1: Surrounding Streets)
             ========================================================== */}
          <g className="pointer-events-none">
            {/* Soft exterior street pavement */}
            <rect
              x="44"
              y="38"
              width="672"
              height="944"
              rx="18"
              fill={bgMode === 'clean' ? '#F8FAFC' : 'rgba(248,250,252,0.15)'}
              stroke="#0F172A"
              strokeWidth="12"
            />

            {/* Street Name Callouts on the 4 Sides of the Black Frame */}
            {/* North: CARRERA 1 */}
            <g transform="translate(380, 22)">
              <rect x="-135" y="-13" width="270" height="24" rx="12" fill="#0F172A" />
              <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="0.8">
                ⬅ CARRERA 1 (NORTE • PRIMER TANQUE)
              </text>
            </g>

            {/* South: CARRERA 3 */}
            <g transform="translate(380, 1002)">
              <rect x="-140" y="-13" width="280" height="24" rx="12" fill="#0F172A" />
              <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="0.8">
                ⬅ CARRERA 3 (FRENTE SUR PRINCIPAL)
              </text>
            </g>

            {/* West: CALLE 17 */}
            <g transform="translate(22, 510) rotate(-90)">
              <rect x="-110" y="-13" width="220" height="24" rx="12" fill="#0F172A" />
              <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="0.8">
                ⬇ CALLE 17 (COSTADO OESTE)
              </text>
            </g>

            {/* East: CALLE 16 */}
            <g transform="translate(738, 510) rotate(90)">
              <rect x="-130" y="-13" width="260" height="24" rx="12" fill="#0F172A" />
              <text x="0" y="3.5" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" letterSpacing="0.8">
                CALLE 16 (ESTE • PLAZA LAS MADRES) ⬇
              </text>
            </g>

            {/* ==========================================================
                GREEN PATIOS / GARDENS INSIDE THE CAMPUS BLOCK
               ========================================================== */}
            {/* North Forest & Rotunda Garden Area */}
            <rect
              x="60"
              y="54"
              width="640"
              height="118"
              rx="14"
              fill="#DCFCE7"
              fillOpacity={bgMode === 'clean' ? 0.65 : 0.35}
              stroke="#86EFAC"
              strokeWidth="1.5"
              strokeDasharray="6 4"
            />
            <text x="195" y="108" fill="#15803D" fontSize="11" fontWeight="700" opacity="0.8">
              🌿 Jardines del Sector Norte
            </text>

            {/* Northeast Garden (Between Yellow Parking & Right Office Column) */}
            <rect
              x="456"
              y="316"
              width="126"
              height="156"
              rx="10"
              fill="#DCFCE7"
              fillOpacity={bgMode === 'clean' ? 0.85 : 0.4}
              stroke="#86EFAC"
              strokeWidth="1.5"
            />
            <text x="519" y="392" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="800">
              🌳 Jardín
            </text>
            <text x="519" y="407" textAnchor="middle" fill="#15803D" fontSize="10" fontWeight="600">
              Claustro Norte
            </text>

            {/* Central Cloister Courtyard (Symmetrically inside the Blue Walkway Ring) */}
            <rect
              x="240"
              y="652"
              width="168"
              height="136"
              rx="10"
              fill="#DCFCE7"
              fillOpacity={bgMode === 'clean' ? 0.92 : 0.45}
              stroke="#4ADE80"
              strokeWidth="2"
            />
            <text x="324" y="704" textAnchor="middle" fill="#065F46" fontSize="11.5" fontWeight="800">
              Patio Central
            </text>
            <text x="324" y="719" textAnchor="middle" fill="#047857" fontSize="10" fontWeight="600">
              Claustro Sur
            </text>
          </g>

          {/* ==========================================================
              2. LIGHT GREY PEDESTRIAN WALKWAYS (So the Blue Route Pops!)
             ========================================================== */}
          <g className="pointer-events-none">
            {/* Outer Subtle Walkway Border */}
            {dataset.walkways.map((w) => (
              <line
                key={`${w.id}-border`}
                x1={w.x1}
                y1={w.y1}
                x2={w.x2}
                y2={w.y2}
                stroke="#CBD5E1"
                strokeWidth="20"
                strokeLinecap="round"
                opacity={bgMode === 'clean' ? 0.9 : 0.75}
              />
            ))}
            {/* Main Light Grey Walkway Surface */}
            {dataset.walkways.map((w) => (
              <line
                key={w.id}
                x1={w.x1}
                y1={w.y1}
                x2={w.x2}
                y2={w.y2}
                stroke="#E2E8F0"
                strokeWidth="16"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* ==========================================================
              3 & 4. YELLOW PARKING BOXES & RED OFFICE/CUBICLE BOXES
             ========================================================== */}
          {dataset.blocks.map((block) => {
            const isSelected =
              selected?.type === 'block' && selected.item.id === block.id;
            const isParking = block.kind === 'estacionamiento';
            const isBano = block.kind === 'bano';
            const isAula = block.kind === 'aula';

            // Clean styling faithful to user's Red (offices/classrooms/bathrooms) & Yellow (parking) with crisp dark borders
            const fillColor = isSelected
              ? '#FFFFFF'
              : isParking
              ? '#FDE047'
              : isBano
              ? '#F87171'
              : isAula
              ? '#DC2626'
              : '#EF4444';

            const textColor = isSelected
              ? '#0F172A'
              : isParking
              ? '#1E293B'
              : '#FFFFFF';

            const subCount = block.subOffices?.length || 0;

            return (
              <g
                key={block.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ type: 'block', item: block });
                }}
                onMouseEnter={() =>
                  setHoveredTitle({
                    name: block.name,
                    sub: `${block.subtitle} ${
                      subCount > 1 ? `• (${subCount} sub-espacios)` : ''
                    }`,
                    x: block.x + block.width / 2,
                    y: block.y,
                  })
                }
                onMouseLeave={() => setHoveredTitle(null)}
                onMouseDown={(e) => {
                  if (isAdminMode) {
                    e.stopPropagation();
                    onSelect({ type: 'block', item: block });
                    const pt = clientToSvg(e.clientX, e.clientY);
                    setDraggingBlock({
                      id: block.id,
                      startX: pt.x,
                      startY: pt.y,
                      origX: block.x,
                      origY: block.y,
                    });
                  }
                }}
                className={isAdminMode ? 'cursor-move' : 'cursor-pointer'}
              >
                {/* Selection Halo */}
                {isSelected && (
                  <rect
                    x={block.x - 3}
                    y={block.y - 3}
                    width={block.width + 6}
                    height={block.height + 6}
                    rx={8}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="4"
                  />
                )}

                {/* Main Box with crisp dark border like the sketch */}
                <rect
                  x={block.x}
                  y={block.y}
                  width={block.width}
                  height={block.height}
                  rx={6}
                  fill={fillColor}
                  fillOpacity={bgMode === 'clean' ? 0.94 : 0.85}
                  stroke={isSelected ? '#2563EB' : '#0F172A'}
                  strokeWidth={isSelected ? 3 : 2.5}
                />

                {/* Subtle internal subdivision lines when a red box contains 2+ internal offices */}
                {!isParking && subCount > 1 && (
                  <g className="pointer-events-none" opacity="0.45">
                    {block.width >= block.height ? (
                      <line
                        x1={block.x + block.width / 2}
                        y1={block.y + 4}
                        x2={block.x + block.width / 2}
                        y2={block.y + block.height - 4}
                        stroke={isSelected ? '#64748B' : '#450A0A'}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    ) : (
                      <line
                        x1={block.x + 4}
                        y1={block.y + block.height / 2}
                        x2={block.x + block.width - 4}
                        y2={block.y + block.height / 2}
                        stroke={isSelected ? '#64748B' : '#450A0A'}
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}
                  </g>
                )}

                {/* Box Label / Code */}
                {isParking ? (
                  <g
                    transform={`translate(${block.x + block.width / 2}, ${
                      block.y + block.height / 2
                    })`}
                    className="pointer-events-none"
                  >
                    <rect
                      x="-14"
                      y="-22"
                      width="28"
                      height="20"
                      rx="5"
                      fill="#0F172A"
                    />
                    <text
                      x="0"
                      y="-8"
                      textAnchor="middle"
                      fill="#FDE047"
                      fontSize="12"
                      fontWeight="900"
                    >
                      P
                    </text>
                    <text
                      x="0"
                      y="10"
                      textAnchor="middle"
                      fill={textColor}
                      fontSize={block.width < 100 ? '9.5' : '12'}
                      fontWeight="800"
                    >
                      {block.width < 100 ? 'Estac. B' : block.name}
                    </text>
                    {block.width >= 140 && (
                      <text
                        x="0"
                        y="24"
                        textAnchor="middle"
                        fill="#475569"
                        fontSize="10"
                        fontWeight="600"
                      >
                        {block.subtitle}
                      </text>
                    )}
                  </g>
                ) : (
                  <g
                    transform={`translate(${block.x + block.width / 2}, ${
                      block.y + block.height / 2
                    })`}
                    className="pointer-events-none"
                  >
                    <text
                      x="0"
                      y={block.height > 42 ? -2.5 : 3.5}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize={block.width < 50 ? '9' : '10'}
                      fontWeight="900"
                    >
                      {block.code.replace('OF-', '')}
                    </text>
                    {block.height > 42 && (
                      <text
                        x="0"
                        y="9.5"
                        textAnchor="middle"
                        fill={isSelected ? '#2563EB' : '#FEE2E2'}
                        fontSize="8"
                        fontWeight="800"
                      >
                        {isBano
                          ? 'WC / Baño'
                          : isAula
                          ? 'Aulas'
                          : subCount > 1
                          ? `${subCount} ofic.`
                          : 'Oficina'}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}

          {/* ==========================================================
              ACTIVE WALKING ROUTE ALONG THE LIGHT GREY WALKWAYS
             ========================================================== */}
          {activeRoutePath && (
            <g className="pointer-events-none">
              {/* Soft blue glow along the path */}
              <path
                d={activeRoutePath.d}
                fill="none"
                stroke="#93C5FD"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.55"
              />
              {/* Crisp vibrant blue animated dashed route line */}
              <path
                d={activeRoutePath.d}
                fill="none"
                stroke="#2563EB"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 8"
                className="route-line-animated"
              />
              <circle
                cx={activeRoutePath.endX}
                cy={activeRoutePath.endY}
                r="6.5"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* ==========================================================
              5. SUPERIMPOSED ILLUSTRATED TOUR STATIONS (Estación 1..8)
             ========================================================== */}
          {showTourIcons &&
            dataset.tourStations.map((station) => {
              const isSelected =
                selected?.type === 'station' && selected.item.id === station.id;
              const isVisited = visitedStationIds.includes(station.id);

              return (
                <g
                  key={station.id}
                  transform={`translate(${station.x}, ${station.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ type: 'station', item: station });
                  }}
                  onMouseEnter={() =>
                    setHoveredTitle({
                      name: station.name,
                      sub: station.subtitle,
                      x: station.x,
                      y: station.y - 24,
                    })
                  }
                  onMouseLeave={() => setHoveredTitle(null)}
                  onMouseDown={(e) => {
                    if (isAdminMode) {
                      e.stopPropagation();
                      onSelect({ type: 'station', item: station });
                      const pt = clientToSvg(e.clientX, e.clientY);
                      setDraggingStation({
                        id: station.id,
                        startX: pt.x,
                        startY: pt.y,
                        origX: station.x,
                        origY: station.y,
                      });
                    }
                  }}
                  className={isAdminMode ? 'cursor-move' : 'cursor-pointer'}
                >
                  {/* Outer Pulse Ring */}
                  {isSelected && (
                    <circle
                      r="25"
                      fill="rgba(79, 70, 229, 0.2)"
                      className="animate-ping"
                    />
                  )}

                  {/* Medallion Drop Shadow */}
                  <circle
                    cy="2"
                    r="18"
                    fill="rgba(15, 23, 42, 0.3)"
                  />

                  {/* Illustrated Station Medallion Circle */}
                  <circle
                    r="18"
                    fill={
                      isSelected
                        ? '#2563EB'
                        : isVisited
                        ? '#059669'
                        : '#4F46E5'
                    }
                    stroke="#FFFFFF"
                    strokeWidth="3"
                  />

                  {/* Custom Vector Drawing inside Medallion */}
                  {renderTourSvgIllustration(station.icon)}

                  {/* Number Badge in Top-Right of Medallion */}
                  <g transform="translate(13, -13)">
                    <circle
                      r="9"
                      fill="#F59E0B"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      y="3.5"
                      textAnchor="middle"
                      fill="#0F172A"
                      fontSize="10"
                      fontWeight="900"
                    >
                      {station.stationNumber}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* ==========================================================
              CURRENT "AQUÍ" QR MARKER ON WALKWAY
             ========================================================== */}
          <g
            transform={`translate(${currentHere.x}, ${currentHere.y})`}
            className="pointer-events-none"
          >
            <circle r="20" fill="rgba(239, 68, 68, 0.2)" />
            <circle r="13" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
            <circle r="8.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="3" />

            <g transform="translate(0, -21)">
              <rect x="-21" y="-10" width="42" height="18" rx="5" fill="#EF4444" />
              <polygon points="-4,8 4,8 0,13" fill="#EF4444" />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="900"
              >
                AQUÍ
              </text>
            </g>
          </g>

          {/* Dark Hover Tooltip */}
          {hoveredTitle && (
            <g
              transform={`translate(${Math.min(
                520,
                Math.max(60, hoveredTitle.x - 105)
              )}, ${Math.max(45, hoveredTitle.y - 52)})`}
              className="pointer-events-none"
            >
              <rect
                x="0"
                y="0"
                width="215"
                height="44"
                rx="10"
                fill="#0F172A"
                opacity="0.95"
              />
              <text x="12" y="18" fill="#FFFFFF" fontSize="11" fontWeight="800">
                {hoveredTitle.name.slice(0, 29)}
              </text>
              <text x="12" y="33" fill="#94A3B8" fontSize="9.5" fontWeight="600">
                {hoveredTitle.sub.slice(0, 34)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* ==========================================================
          RESPONSIVE DETAIL CARD (Bottom Sheet on Mobile, Right Card on Desktop)
         ========================================================== */}
      {selected && !isAdminMode && (
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="absolute inset-x-2.5 bottom-2.5 md:inset-x-auto md:bottom-auto md:top-5 md:right-5 z-30 w-auto md:w-[365px] max-h-[54dvh] md:max-h-[calc(100dvh-120px)] overflow-y-auto bg-white rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.24)] border border-slate-200/90 p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-200"
        >
          {/* Mobile Pull-Bar Indicator */}
          <div className="md:hidden w-10 h-1 rounded-full bg-slate-200 mx-auto mb-2.5" />
          {selected.type === 'block' ? (
            <>
              {/* Office / Parking Box Detail */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                      selected.item.kind === 'estacionamiento'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {KIND_LABELS[selected.item.kind]}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                    {selected.item.code}
                  </span>
                </div>

                <button
                  onClick={() => onSelect(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                {selected.item.name}
              </h3>
              <p className="text-xs font-semibold text-blue-600 mb-2">
                {selected.item.subtitle}
              </p>

              {/* Photo / Video Reference Gallery */}
              <MediaGalleryViewer
                media={selected.item.media}
                title={selected.item.name}
              />

              <p className="text-xs text-slate-600 leading-relaxed mb-3.5">
                {selected.item.description}
              </p>

              {/* Internal Sub-Offices / Cubicles List (Point 3 of User Request) */}
              {selected.item.subOffices && selected.item.subOffices.length > 0 && (
                <div className="mb-3.5">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-rose-500" />
                    Sub-espacios / Oficinas Internas ({selected.item.subOffices.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selected.item.subOffices.map((sub, i) => (
                      <div
                        key={sub.id || i}
                        className="bg-rose-50/60 border border-rose-200/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center gap-2"
                      >
                        <span className="w-5 h-5 rounded-md bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span>{sub.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Box */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-2 mb-4 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Horario: <b className="text-slate-900">{selected.item.schedule}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Responsable: <b className="text-slate-900">{selected.item.responsible}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  {selected.item.kind === 'estacionamiento' ? (
                    <Car className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span>
                    Ubicación: <b className="text-slate-900">{selected.item.locationLabel}</b>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <button
                  onClick={() => onSetHereFromBlock(selected.item)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Estoy AQUÍ (QR)
                </button>
                <button
                  onClick={onOpenQr}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  Ver Código QR
                </button>
              </div>

              <button
                onClick={() => onSelect(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Cerrar / Borrar ruta</span>
              </button>
            </>
          ) : (
            <>
              {/* Tour Station Detail (Point 5: Superimposed Guided Tour Icons) */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-black flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  ESTACIÓN {selected.item.stationNumber} DE {dataset.tourStations.length}
                </span>

                <button
                  onClick={() => onSelect(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                {selected.item.name}
              </h3>
              <p className="text-xs font-semibold text-indigo-600 mb-2">
                {selected.item.subtitle}
              </p>

              {/* Photo / Video Reference Gallery */}
              <MediaGalleryViewer
                media={selected.item.media}
                title={selected.item.name}
              />

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {selected.item.description}
              </p>

              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 mb-3.5 text-xs text-amber-950 leading-relaxed">
                <b className="font-extrabold block mb-0.5 text-amber-900">
                  🏛 Valor Patrimonial e Histórico:
                </b>
                {selected.item.historicalNote}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button
                  onClick={() => toggleSpeech(selected.item.audioText)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border transition ${
                    isSpeaking
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Parar
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> Audio
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSetHereFromStation(selected.item)}
                  className="py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Estoy AQUÍ
                </button>

                <button
                  onClick={onOpenQr}
                  className="py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-700" /> Ver QR
                </button>
              </div>

              {nextTourStation && (
                <button
                  onClick={() => onAdvanceToNextStation(nextTourStation)}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-between shadow-md shadow-indigo-600/20 transition"
                >
                  <span>
                    Siguiente: Estación {nextTourStation.stationNumber} ({nextTourStation.name.replace(/^Estación \d+:\s*/, '')})
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Top-Right (Mobile) / Bottom-Right (Desktop) Zoom Pill */}
      <div
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 md:top-auto md:bottom-5 md:right-5 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.1)] border border-slate-200/80 flex flex-col overflow-hidden"
      >
        <button
          onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.15).toFixed(2))))}
          className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border-b border-slate-100"
          title="Acercar"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))))}
          className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition border-b border-slate-100"
          title="Alejar"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-3 text-slate-500 hover:text-blue-600 hover:bg-slate-50 transition"
          title="Centrar plano"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
