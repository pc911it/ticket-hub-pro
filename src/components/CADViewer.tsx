import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import DxfParser from 'dxf-parser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2,
  Grid3X3,
  Box,
  AlertCircle,
  Loader2,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

interface CADViewerProps {
  modelUrl: string;
  modelType: string | null;
  modelName: string;
}

interface DxfEntity {
  type: string;
  vertices?: Array<{ x: number; y: number; z?: number }>;
  center?: { x: number; y: number; z?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  layer?: string;
  color?: number;
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  points?: Array<{ x: number; y: number; z?: number }>;
  shape?: boolean;
  position?: { x: number; y: number; z?: number };
  text?: string;
  height?: number;
  extrusionDirection?: { x: number; y: number; z: number };
}

interface ParsedDxf {
  entities: DxfEntity[];
  tables?: {
    layer?: {
      layers?: Record<string, { color?: number; name: string }>;
    };
  };
}

// Color mapping for AutoCAD color indices
const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', // Red
  2: '#FFFF00', // Yellow
  3: '#00FF00', // Green
  4: '#00FFFF', // Cyan
  5: '#0000FF', // Blue
  6: '#FF00FF', // Magenta
  7: '#FFFFFF', // White/Black
  8: '#808080', // Gray
  9: '#C0C0C0', // Light Gray
};

function getColor(colorIndex?: number): string {
  if (!colorIndex || colorIndex === 0 || colorIndex === 256) {
    return '#CCCCCC'; // Default gray
  }
  return ACI_COLORS[colorIndex] || '#CCCCCC';
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-white">Loading CAD file...</p>
      </div>
    </Html>
  );
}

// 2D DXF Renderer Component
function DXF2DRenderer({ 
  dxf, 
  visibleLayers,
  wallHeight 
}: { 
  dxf: ParsedDxf; 
  visibleLayers: Set<string>;
  wallHeight: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!groupRef.current || !dxf?.entities) return;
    
    // Clear existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    const entities = dxf.entities;
    
    entities.forEach((entity) => {
      // Skip if layer is hidden
      if (entity.layer && !visibleLayers.has(entity.layer)) return;
      
      const color = new THREE.Color(getColor(entity.color));
      const material = new THREE.LineBasicMaterial({ color, linewidth: 1 });
      const meshMaterial = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      
      switch (entity.type) {
        case 'LINE': {
          if (entity.startPoint && entity.endPoint) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(entity.startPoint.x, entity.startPoint.y, 0),
              new THREE.Vector3(entity.endPoint.x, entity.endPoint.y, 0)
            ]);
            const line = new THREE.Line(geometry, material);
            groupRef.current?.add(line);
          }
          break;
        }
        
        case 'LWPOLYLINE':
        case 'POLYLINE': {
          if (entity.vertices && entity.vertices.length > 1) {
            const points = entity.vertices.map(v => 
              new THREE.Vector3(v.x, v.y, v.z || 0)
            );
            
            // Close the shape if needed
            if (entity.shape && points.length > 2) {
              points.push(points[0].clone());
            }
            
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, material);
            groupRef.current?.add(line);
          }
          break;
        }
        
        case 'CIRCLE': {
          if (entity.center && entity.radius) {
            const segments = Math.max(32, Math.ceil(entity.radius * 4));
            const geometry = new THREE.CircleGeometry(entity.radius, segments);
            geometry.translate(entity.center.x, entity.center.y, 0);
            
            // Create outline instead of filled circle
            const edgesGeometry = new THREE.EdgesGeometry(geometry);
            const circle = new THREE.LineSegments(edgesGeometry, material);
            groupRef.current?.add(circle);
          }
          break;
        }
        
        case 'ARC': {
          if (entity.center && entity.radius) {
            const startAngle = (entity.startAngle || 0) * Math.PI / 180;
            const endAngle = (entity.endAngle || 360) * Math.PI / 180;
            
            const curve = new THREE.EllipseCurve(
              entity.center.x, entity.center.y,
              entity.radius, entity.radius,
              startAngle, endAngle,
              false, 0
            );
            
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const arc = new THREE.Line(geometry, material);
            groupRef.current?.add(arc);
          }
          break;
        }
        
        case 'ELLIPSE': {
          if (entity.center) {
            // Simplified ellipse rendering
            const curve = new THREE.EllipseCurve(
              entity.center.x, entity.center.y,
              entity.radius || 1, (entity.radius || 1) * 0.5,
              0, 2 * Math.PI,
              false, 0
            );
            
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const ellipse = new THREE.Line(geometry, material);
            groupRef.current?.add(ellipse);
          }
          break;
        }
        
        case 'POINT': {
          if (entity.position) {
            const geometry = new THREE.SphereGeometry(0.1, 8, 8);
            const point = new THREE.Mesh(geometry, meshMaterial);
            point.position.set(entity.position.x, entity.position.y, 0);
            groupRef.current?.add(point);
          }
          break;
        }
        
        case 'SPLINE': {
          if (entity.points && entity.points.length > 1) {
            const splinePoints = entity.points.map(p => 
              new THREE.Vector3(p.x, p.y, p.z || 0)
            );
            const curve = new THREE.CatmullRomCurve3(splinePoints);
            const points = curve.getPoints(50);
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const spline = new THREE.Line(geometry, material);
            groupRef.current?.add(spline);
          }
          break;
        }
        
        case 'TEXT':
        case 'MTEXT': {
          // Text entities are rendered as placeholder boxes
          if (entity.position) {
            const size = entity.height || 1;
            const geometry = new THREE.PlaneGeometry(size * 3, size);
            geometry.translate(entity.position.x, entity.position.y, 0);
            const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ 
              color: color, 
              transparent: true, 
              opacity: 0.3 
            }));
            groupRef.current?.add(plane);
          }
          break;
        }
      }
    });
    
    // Center the model
    if (groupRef.current.children.length > 0) {
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      groupRef.current.position.sub(center);
    }
  }, [dxf, visibleLayers]);
  
  return <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]} />;
}

// 3D DXF Renderer Component (with wall extrusion)
function DXF3DRenderer({ 
  dxf, 
  visibleLayers,
  wallHeight 
}: { 
  dxf: ParsedDxf; 
  visibleLayers: Set<string>;
  wallHeight: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!groupRef.current || !dxf?.entities) return;
    
    // Clear existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    const entities = dxf.entities;
    
    entities.forEach((entity) => {
      // Skip if layer is hidden
      if (entity.layer && !visibleLayers.has(entity.layer)) return;
      
      const color = new THREE.Color(getColor(entity.color));
      const material = new THREE.MeshStandardMaterial({ 
        color, 
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1
      });
      const lineMaterial = new THREE.LineBasicMaterial({ color });
      
      switch (entity.type) {
        case 'LINE': {
          if (entity.startPoint && entity.endPoint) {
            // Create a wall from the line
            const start = new THREE.Vector3(entity.startPoint.x, 0, -entity.startPoint.y);
            const end = new THREE.Vector3(entity.endPoint.x, 0, -entity.endPoint.y);
            
            const length = start.distanceTo(end);
            const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            
            const wallGeometry = new THREE.BoxGeometry(length, wallHeight, 0.1);
            const wall = new THREE.Mesh(wallGeometry, material);
            
            wall.position.copy(midPoint);
            wall.position.y = wallHeight / 2;
            
            // Rotate wall to align with line
            const angle = Math.atan2(end.z - start.z, end.x - start.x);
            wall.rotation.y = -angle;
            
            groupRef.current?.add(wall);
          }
          break;
        }
        
        case 'LWPOLYLINE':
        case 'POLYLINE': {
          if (entity.vertices && entity.vertices.length > 1) {
            // Create walls along polyline segments
            for (let i = 0; i < entity.vertices.length - 1; i++) {
              const v1 = entity.vertices[i];
              const v2 = entity.vertices[i + 1];
              
              const start = new THREE.Vector3(v1.x, 0, -v1.y);
              const end = new THREE.Vector3(v2.x, 0, -v2.y);
              
              const length = start.distanceTo(end);
              const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
              
              const wallGeometry = new THREE.BoxGeometry(length, wallHeight, 0.15);
              const wall = new THREE.Mesh(wallGeometry, material);
              
              wall.position.copy(midPoint);
              wall.position.y = wallHeight / 2;
              
              const angle = Math.atan2(end.z - start.z, end.x - start.x);
              wall.rotation.y = -angle;
              
              groupRef.current?.add(wall);
            }
            
            // Close the shape if needed
            if (entity.shape && entity.vertices.length > 2) {
              const v1 = entity.vertices[entity.vertices.length - 1];
              const v2 = entity.vertices[0];
              
              const start = new THREE.Vector3(v1.x, 0, -v1.y);
              const end = new THREE.Vector3(v2.x, 0, -v2.y);
              
              const length = start.distanceTo(end);
              const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
              
              const wallGeometry = new THREE.BoxGeometry(length, wallHeight, 0.15);
              const wall = new THREE.Mesh(wallGeometry, material);
              
              wall.position.copy(midPoint);
              wall.position.y = wallHeight / 2;
              
              const angle = Math.atan2(end.z - start.z, end.x - start.x);
              wall.rotation.y = -angle;
              
              groupRef.current?.add(wall);
            }
          }
          break;
        }
        
        case 'CIRCLE': {
          if (entity.center && entity.radius) {
            // Create a cylinder for circles in 3D
            const geometry = new THREE.CylinderGeometry(
              entity.radius, entity.radius, wallHeight, 32
            );
            const cylinder = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
              color,
              transparent: true,
              opacity: 0.3,
              roughness: 0.5
            }));
            cylinder.position.set(entity.center.x, wallHeight / 2, -entity.center.y);
            groupRef.current?.add(cylinder);
          }
          break;
        }
        
        case 'ARC': {
          if (entity.center && entity.radius) {
            // Create arc wall
            const startAngle = (entity.startAngle || 0) * Math.PI / 180;
            const endAngle = (entity.endAngle || 360) * Math.PI / 180;
            const arcAngle = endAngle - startAngle;
            
            const shape = new THREE.Shape();
            shape.absarc(0, 0, entity.radius, startAngle, endAngle, false);
            shape.absarc(0, 0, entity.radius - 0.1, endAngle, startAngle, true);
            
            const extrudeSettings = {
              steps: 1,
              depth: wallHeight,
              bevelEnabled: false
            };
            
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const arcMesh = new THREE.Mesh(geometry, material);
            arcMesh.position.set(entity.center.x, 0, -entity.center.y);
            arcMesh.rotation.x = -Math.PI / 2;
            groupRef.current?.add(arcMesh);
          }
          break;
        }
      }
    });
    
    // Add floor plane
    if (groupRef.current.children.length > 0) {
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      const floorGeometry = new THREE.PlaneGeometry(size.x * 1.5, size.z * 1.5);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444, 
        roughness: 0.9,
        metalness: 0
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(center.x, 0, center.z);
      floor.receiveShadow = true;
      groupRef.current.add(floor);
      
      // Center the entire group
      groupRef.current.position.x = -center.x;
      groupRef.current.position.z = -center.z;
    }
  }, [dxf, visibleLayers, wallHeight]);
  
  return <group ref={groupRef} />;
}

// Scene setup for 2D view
function Scene2D({ 
  dxf, 
  visibleLayers,
  wallHeight,
  controlsRef 
}: { 
  dxf: ParsedDxf; 
  visibleLayers: Set<string>;
  wallHeight: number;
  controlsRef: React.RefObject<any>;
}) {
  return (
    <>
      <ambientLight intensity={1} />
      <Suspense fallback={<Loader />}>
        <DXF2DRenderer dxf={dxf} visibleLayers={visibleLayers} wallHeight={wallHeight} />
      </Suspense>
      <OrbitControls 
        ref={controlsRef}
        enableRotate={false}
        enablePan={true}
        enableZoom={true}
        minZoom={0.1}
        maxZoom={10}
      />
      <gridHelper args={[1000, 100, 0x444444, 0x222222]} rotation={[0, 0, 0]} />
    </>
  );
}

// Scene setup for 3D view
function Scene3D({ 
  dxf, 
  visibleLayers,
  wallHeight,
  autoRotate,
  controlsRef 
}: { 
  dxf: ParsedDxf; 
  visibleLayers: Set<string>;
  wallHeight: number;
  autoRotate: boolean;
  controlsRef: React.RefObject<any>;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      
      <Suspense fallback={<Loader />}>
        <DXF3DRenderer dxf={dxf} visibleLayers={visibleLayers} wallHeight={wallHeight} />
      </Suspense>
      
      <OrbitControls 
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={500}
      />
      <Environment preset="apartment" />
      <gridHelper args={[1000, 100, 0x444444, 0x222222]} />
    </>
  );
}

export default function CADViewer({ modelUrl, modelType, modelName }: CADViewerProps) {
  const [dxf, setDxf] = useState<ParsedDxf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [autoRotate, setAutoRotate] = useState(false);
  const [wallHeight, setWallHeight] = useState(3);
  const [layers, setLayers] = useState<string[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set());
  const [showLayers, setShowLayers] = useState(false);
  const controlsRef = useRef<any>(null);

  // Parse DXF file
  useEffect(() => {
    console.log('CADViewer: modelUrl=', modelUrl, 'modelType=', modelType);
    
    const loadDxf = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('CADViewer: Fetching DXF from', modelUrl);
        const response = await fetch(modelUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch CAD file: ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('CADViewer: Received text length', text.length);
        const parser = new DxfParser();
        const parsed = parser.parse(text) as ParsedDxf;
        
        if (!parsed || !parsed.entities) {
          throw new Error('Failed to parse DXF file - no entities found');
        }
        
        setDxf(parsed);
        
        // Extract layers
        const layerSet = new Set<string>();
        parsed.entities.forEach(entity => {
          if (entity.layer) {
            layerSet.add(entity.layer);
          }
        });
        const layerArray = Array.from(layerSet).sort();
        setLayers(layerArray);
        setVisibleLayers(new Set(layerArray));
        
      } catch (err) {
        console.error('DXF parsing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CAD file');
      } finally {
        setLoading(false);
      }
    };
    
    if (modelUrl && modelType?.toLowerCase() === 'dxf') {
      loadDxf();
    } else if (modelType?.toLowerCase() === 'dwg') {
      setLoading(false);
      setError('DWG files require conversion. Please export as DXF from AutoCAD or use a conversion service.');
    } else {
      setLoading(false);
      setError('Unsupported CAD file type');
    }
  }, [modelUrl, modelType]);

  const handleReset = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  const toggleLayer = useCallback((layer: string) => {
    setVisibleLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  const toggleAllLayers = useCallback((visible: boolean) => {
    if (visible) {
      setVisibleLayers(new Set(layers));
    } else {
      setVisibleLayers(new Set());
    }
  }, [layers]);

  // Error state
  if (error) {
    return (
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">CAD Preview Unavailable</h3>
          <Badge variant="secondary" className="mb-4">{modelType?.toUpperCase()}</Badge>
          <p className="text-white/60 mb-6 max-w-md">{error}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button asChild>
              <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </a>
            </Button>
          </div>
          {modelType?.toLowerCase() === 'dwg' && (
            <p className="text-xs text-white/40 mt-4">
              Tip: Export your DWG file as DXF from AutoCAD for web viewing
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-white">Loading CAD file...</p>
        </div>
      </div>
    );
  }

  if (!dxf) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-[400px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-background/50 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <FileIcon className="h-3 w-3" />
            {modelType?.toUpperCase()} CAD
          </Badge>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as '2d' | '3d')}>
            <TabsList className="h-8">
              <TabsTrigger value="2d" className="text-xs px-3 h-7">
                <Grid3X3 className="h-3 w-3 mr-1" />
                2D Plan
              </TabsTrigger>
              <TabsTrigger value="3d" className="text-xs px-3 h-7">
                <Box className="h-3 w-3 mr-1" />
                3D View
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Badge variant="secondary" className="text-xs">
            {dxf.entities?.length || 0} entities
          </Badge>
          
          {layers.length > 0 && (
            <Button
              variant={showLayers ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLayers(!showLayers)}
              className="h-7 text-xs"
            >
              <Layers className="h-3 w-3 mr-1" />
              Layers ({visibleLayers.size}/{layers.length})
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          {viewMode === '3d' && (
            <Button 
              variant={autoRotate ? "default" : "outline"} 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setAutoRotate(!autoRotate)}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          <Button variant="outline" size="sm" asChild className="h-7">
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <Download className="h-3 w-3 mr-1" />
              Download
            </a>
          </Button>
        </div>
      </div>
      
      {/* Layer panel */}
      {showLayers && layers.length > 0 && (
        <div className="border-b bg-muted/50 p-2 max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => toggleAllLayers(true)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Show All
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 text-xs"
              onClick={() => toggleAllLayers(false)}
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Hide All
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {layers.map(layer => (
              <Badge 
                key={layer}
                variant={visibleLayers.has(layer) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleLayer(layer)}
              >
                {visibleLayers.has(layer) ? (
                  <Eye className="h-3 w-3 mr-1" />
                ) : (
                  <EyeOff className="h-3 w-3 mr-1" />
                )}
                {layer}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* 3D Wall Height control */}
      {viewMode === '3d' && (
        <div className="border-b bg-muted/30 px-3 py-1.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Wall Height:</span>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={wallHeight}
            onChange={(e) => setWallHeight(parseFloat(e.target.value))}
            className="w-24 h-1"
          />
          <span className="text-xs font-medium">{wallHeight}m</span>
        </div>
      )}
      
      {/* Canvas */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-lg">
        <Canvas
          shadows
          camera={viewMode === '2d' 
            ? { position: [0, 100, 0], fov: 50, near: 0.1, far: 2000 }
            : { position: [50, 50, 50], fov: 50, near: 0.1, far: 2000 }
          }
          gl={{ antialias: true, alpha: true }}
        >
          {viewMode === '2d' ? (
            <Scene2D 
              dxf={dxf} 
              visibleLayers={visibleLayers}
              wallHeight={wallHeight}
              controlsRef={controlsRef} 
            />
          ) : (
            <Scene3D 
              dxf={dxf} 
              visibleLayers={visibleLayers}
              wallHeight={wallHeight}
              autoRotate={autoRotate}
              controlsRef={controlsRef} 
            />
          )}
        </Canvas>
      </div>
    </div>
  );
}

// Helper component for file icon
function FileIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
