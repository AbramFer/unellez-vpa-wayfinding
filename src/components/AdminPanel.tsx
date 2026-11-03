import React, { useState } from 'react';
import {
  Plus,
  Save,
  Trash2,
  SplitSquareHorizontal,
  RotateCcw,
  CheckCircle2,
  X,
  Compass,
  DoorOpen
} from 'lucide-react';
import {
  BlockKind,
  TourIconType,
  TourLandmarkStation,
  WayfindingBlock
} from '../types/wayfinding';
import { SelectedEntity } from './InteractiveAerialMap';

interface AdminPanelProps {
  selected: SelectedEntity;
  onUpdateBlock: (updated: WayfindingBlock) => void;
  onUpdateStation: (updated: TourLandmarkStation) => void;
  onCreateBlock: (kind: BlockKind) => void;
  onCreateStation: () => void;
  onSubdivideBlock: (block: WayfindingBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onDeleteStation: (stationId: string) => void;
  onSaveToDisk: () => Promise<boolean>;
  onResetDefault: () => void;
  onCloseAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  selected,
  onUpdateBlock,
  onUpdateStation,
  onCreateBlock,
  onCreateStation,
  onSubdivideBlock,
  onDeleteBlock,
  onDeleteStation,
  onSaveToDisk,
  onResetDefault,
  onCloseAdmin,
}) => {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newSubOfficeName, setNewSubOfficeName] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    const ok = await onSaveToDisk();
    setIsSaving(false);
    setSaveMessage(ok ? '¡Guardado en el proyecto!' : '¡Guardado en navegador!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const addSubOffice = (block: WayfindingBlock) => {
    if (!newSubOfficeName.trim()) return;
    const updated: WayfindingBlock = {
      ...block,
      subOffices: [
        ...(block.subOffices || []),
        { id: `sub-${Date.now()}`, name: newSubOfficeName.trim() },
      ],
    };
    onUpdateBlock(updated);
    setNewSubOfficeName('');
  };

  const removeSubOffice = (block: WayfindingBlock, idx: number) => {
    const updated: WayfindingBlock = {
      ...block,
      subOffices: block.subOffices.filter((_, i) => i !== idx),
    };
    onUpdateBlock(updated);
  };

  return (
    <div className="absolute top-5 right-5 z-30 w-[355px] sm:w-[375px] max-h-[calc(100vh-110px)] overflow-y-auto bg-white rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.2)] border border-slate-200 p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
            Modo Administrador
          </span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            Editor de Oficinas y Estaciones
          </h3>
        </div>
        <button
          onClick={onCloseAdmin}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {saveMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Quick Create Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onCreateBlock('oficina')}
          className="py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva Oficina (Roja)
        </button>
        <button
          onClick={onCreateStation}
          className="py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm"
        >
          <Compass className="w-3.5 h-3.5" /> Nueva Estación Tour
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
      </button>

      {/* Edit Selected Block (Red Office / Yellow Parking) */}
      {selected?.type === 'block' && (
        <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-extrabold text-rose-600 uppercase text-[11px]">
              Editando: {selected.item.code}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSubdivideBlock(selected.item)}
                className="py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1"
              >
                <SplitSquareHorizontal className="w-3.5 h-3.5" /> Partir en 2
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${selected.item.name}"?`)) {
                    onDeleteBlock(selected.item.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nombre del Módulo
              </label>
              <input
                type="text"
                value={selected.item.name}
                onChange={(e) =>
                  onUpdateBlock({ ...selected.item, name: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Código
              </label>
              <input
                type="text"
                value={selected.item.code}
                onChange={(e) =>
                  onUpdateBlock({ ...selected.item, code: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tipo de Recuadro
              </label>
              <select
                value={selected.item.kind}
                onChange={(e) =>
                  onUpdateBlock({
                    ...selected.item,
                    kind: e.target.value as BlockKind,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
              >
                <option value="oficina">Cuadro Rojo (Oficinas)</option>
                <option value="aula">Cuadro Rojo (Aulas / Salones de Clases)</option>
                <option value="bano">Cuadro Rojo (Baños / Sanitarios)</option>
                <option value="estacionamiento">Cuadro Amarillo (Estacionamiento)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Subtítulo
              </label>
              <input
                type="text"
                value={selected.item.subtitle}
                onChange={(e) =>
                  onUpdateBlock({ ...selected.item, subtitle: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Width & Height Sliders */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Ancho ({selected.item.width}px)
              </label>
              <input
                type="range"
                min={36}
                max={320}
                value={selected.item.width}
                onChange={(e) =>
                  onUpdateBlock({
                    ...selected.item,
                    width: Number(e.target.value),
                  })
                }
                className="w-full accent-rose-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Alto ({selected.item.height}px)
              </label>
              <input
                type="range"
                min={34}
                max={260}
                value={selected.item.height}
                onChange={(e) =>
                  onUpdateBlock({
                    ...selected.item,
                    height: Number(e.target.value),
                  })
                }
                className="w-full accent-rose-600"
              />
            </div>
          </div>

          {/* Internal Sub-Offices (2 or more inside the same red box) */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-3 space-y-2">
            <label className="text-[11px] font-extrabold text-rose-900 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-rose-600" />
              Oficinas / Cubículos Internos en este Cuadro ({selected.item.subOffices.length})
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newSubOfficeName}
                onChange={(e) => setNewSubOfficeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubOffice(selected.item)}
                placeholder="Ej: Oficina B: Control de Estudios"
                className="flex-1 bg-white border border-rose-200 rounded-xl px-2.5 py-1.5 text-xs"
              />
              <button
                onClick={() => addSubOffice(selected.item)}
                className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
              >
                +
              </button>
            </div>
            <div className="space-y-1">
              {selected.item.subOffices.map((sub, idx) => (
                <div
                  key={sub.id || idx}
                  className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-rose-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">
                    {idx + 1}. {sub.name}
                  </span>
                  <button
                    onClick={() => removeSubOffice(selected.item, idx)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              value={selected.item.description}
              onChange={(e) =>
                onUpdateBlock({ ...selected.item, description: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
            />
          </div>
        </div>
      )}

      {/* Edit Selected Tour Station (Illustrated Icon) */}
      {selected?.type === 'station' && (
        <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-indigo-600 uppercase text-[11px]">
              Editando Estación {selected.item.stationNumber}
            </span>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${selected.item.name}"?`)) {
                  onDeleteStation(selected.item.id);
                }
              }}
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Nº Estación
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={selected.item.stationNumber}
                onChange={(e) =>
                  onUpdateStation({
                    ...selected.item,
                    stationNumber: Math.max(1, parseInt(e.target.value, 10) || 1),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Icono / Dibujo Superpuesto
              </label>
              <select
                value={selected.item.icon}
                onChange={(e) =>
                  onUpdateStation({
                    ...selected.item,
                    icon: e.target.value as TourIconType,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
              >
                <option value="portico">🏛 Pórtico Colonial</option>
                <option value="fountain">⛲ Fuente / Patio Claustro</option>
                <option value="columns">🏛 Galería de Columnas</option>
                <option value="monument">🎖 Hito / Despacho VPA</option>
                <option value="book">📚 Corredor Académico</option>
                <option value="trees">🌳 Jardín / Árboles</option>
                <option value="rotunda">🎪 Rotonda / Quiosco</option>
                <option value="water-tank">💧 Primer Tanque de Agua</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Nombre de la Estación
            </label>
            <input
              type="text"
              value={selected.item.name}
              onChange={(e) =>
                onUpdateStation({ ...selected.item, name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Reseña Histórica
            </label>
            <textarea
              rows={2}
              value={selected.item.historicalNote}
              onChange={(e) =>
                onUpdateStation({
                  ...selected.item,
                  historicalNote: e.target.value,
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Guion de Audio-Guía
            </label>
            <textarea
              rows={2}
              value={selected.item.audioText}
              onChange={(e) =>
                onUpdateStation({ ...selected.item, audioText: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs"
            />
          </div>
        </div>
      )}

      {!selected && (
        <div className="py-5 text-center text-xs text-slate-400">
          Haz clic en cualquier cuadro rojo, estacionamiento amarillo o icono de estación en el plano para editarlo o moverlo.
        </div>
      )}

      {/* Restore defaults */}
      <div className="border-t border-slate-100 pt-2.5 flex justify-end">
        <button
          onClick={() => {
            if (confirm('¿Restaurar el mapa original del boceto VPA?')) {
              onResetDefault();
            }
          }}
          className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 font-medium"
        >
          <RotateCcw className="w-3 h-3" /> Restaurar diseño original
        </button>
      </div>
    </div>
  );
};
