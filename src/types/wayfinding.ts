export type BlockKind =
  | 'oficina'          // Cuadros de oficinas / cubículos administrativos
  | 'aula'             // Aulas o salones de clases (ej. en la hilera E)
  | 'estacionamiento'  // Cuadros amarillos de estacionamiento vehicular
  | 'patio'            // Áreas verdes / jardines internos
  | 'bano';            // Sanitarios / baños (ej. CN4, NI3)

export type TourIconType =
  | 'portico'
  | 'fountain'
  | 'monument'
  | 'trees'
  | 'rotunda'
  | 'water-tank'
  | 'columns'
  | 'book';

export interface SubOfficeItem {
  id: string;
  name: string;        // Ej: "Cubículo 1: Control de Estudios"
  responsible?: string;
  schedule?: string;
}

export interface WayfindingBlock {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  kind: BlockKind;
  description: string;
  schedule: string;
  responsible: string;
  locationLabel: string;
  // Internal subdivisions (2 or more offices/cubicles inside the same box)
  subOffices: SubOfficeItem[];
  // Coordinates on the 760 x 1020 vertical canvas matching your sketch
  x: number;
  y: number;
  width: number;
  height: number;
  // Nearest point on the blue pedestrian walkway network
  doorX: number;
  doorY: number;
}

export interface TourLandmarkStation {
  id: string;
  stationNumber: number; // 1, 2, 3, 4...
  name: string;
  subtitle: string;
  icon: TourIconType;
  description: string;
  historicalNote: string;
  audioText: string;
  // Coordinates on the 760 x 1020 canvas
  x: number;
  y: number;
  // Walkway connection point
  walkwayX: number;
  walkwayY: number;
}

export interface WalkwaySegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface WayfindingDataset {
  title: string;
  subtitle: string;
  defaultHerePoint: { x: number; y: number; label: string };
  walkways: WalkwaySegment[];
  blocks: WayfindingBlock[];
  tourStations: TourLandmarkStation[];
}
