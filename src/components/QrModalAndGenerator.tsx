import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Printer,
  Smartphone,
  Copy,
  Check,
  X,
  Compass,
  Building2
} from 'lucide-react';
import { TourLandmarkStation, WayfindingBlock } from '../types/wayfinding';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: WayfindingBlock[];
  tourStations: TourLandmarkStation[];
  onSimulateScanStation: (station: TourLandmarkStation) => void;
  onSimulateScanBlock: (block: WayfindingBlock) => void;
}

export const QrModalAndGenerator: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  blocks,
  tourStations,
  onSimulateScanStation,
  onSimulateScanBlock,
}) => {
  const [tab, setTab] = useState<'stations' | 'blocks'>('stations');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>(
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://vpa.unellez.edu.ve'
  );

  if (!isOpen) return null;

  const buildUrl = (paramKey: string, id: string) => {
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/?${paramKey}=${encodeURIComponent(id)}&scan=1`;
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Central de Códigos QR — Estaciones del Recorrido y Oficinas VPA
              </h2>
              <p className="text-xs text-slate-500">
                Escanea cualquier estación o módulo de oficinas para ubicarte en el pasillo peatonal y ver la ruta hacia la siguiente parada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Láminas QR
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('stations')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                tab === 'stations'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Estaciones de la Visita Guiada ({tourStations.length})
            </button>
            <button
              onClick={() => setTab('blocks')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                tab === 'blocks'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Módulos de Oficinas y Estacionamientos ({blocks.length})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              URL Base:
            </span>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* QR Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
          {tab === 'stations'
            ? tourStations.map((st) => {
                const url = buildUrl('station', st.id);
                return (
                  <div
                    key={st.id}
                    className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                          ESTACIÓN {st.stationNumber}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Visita Guiada VPA
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {st.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">{st.subtitle}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center my-1">
                      <QRCodeSVG value={url} size={136} level="M" />
                      <span className="mt-2 text-[10px] font-extrabold tracking-wider uppercase text-indigo-700">
                        UNELLEZ VPA • ESTACIÓN {st.stationNumber}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2 print:hidden">
                      <button
                        onClick={() => {
                          onSimulateScanStation(st);
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Simular Escaneo de Estación {st.stationNumber}
                      </button>

                      <button
                        onClick={() => handleCopy(st.id, url)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1"
                      >
                        {copiedId === st.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Enlace QR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            : blocks.map((b) => {
                const url = buildUrl('zone', b.id);
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          {b.code}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {b.subOffices.length} sub-espacios
                        </span>
                      </div>
                      <h3 className="font-extrabold text-sm text-slate-900">
                        {b.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">{b.subtitle}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center my-1">
                      <QRCodeSVG value={url} size={132} level="M" />
                      <span className="mt-2 text-[10px] font-extrabold tracking-wider uppercase text-slate-600">
                        UNELLEZ VPA • {b.code}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2 print:hidden">
                      <button
                        onClick={() => {
                          onSimulateScanBlock(b);
                          onClose();
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        Simular Escaneo QR Aquí
                      </button>
                      <button
                        onClick={() => handleCopy(b.id, url)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1"
                      >
                        {copiedId === b.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Enlace QR
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};
