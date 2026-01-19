import { Suspense, useRef, useState, useEffect, Component, ReactNode } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RotateCcw, ZoomIn, ZoomOut, Maximize2, Box, AlertCircle, Download } from 'lucide-react';

interface Model3DViewerProps {
  modelUrl: string;
  modelType: string | null;
  modelName: string;
}

// Format info for display
const formatInfo: Record<string, { name: string; supported: boolean; description: string }> = {
  gltf: { name: 'glTF', supported: true, description: 'GL Transmission Format - Web optimized' },
  glb: { name: 'GLB', supported: true, description: 'Binary glTF - Compact web format' },
  obj: { name: 'OBJ', supported: true, description: 'Wavefront OBJ - Universal 3D format' },
  stl: { name: 'STL', supported: true, description: 'Stereolithography - 3D printing format' },
  fbx: { name: 'FBX', supported: true, description: 'Autodesk FBX - Animation format' },
  dae: { name: 'Collada', supported: true, description: 'COLLADA - Digital asset exchange' },
  ifc: { name: 'IFC', supported: false, description: 'Industry Foundation Classes - BIM format (requires specialized viewer)' },
};

// Error Boundary Class Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Viewer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

function ErrorBoundaryFallback({ error }: { error: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-center p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive font-medium">Failed to load model</p>
        <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
      </div>
    </Html>
  );
}

function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <Center>
      <primitive object={scene.clone()} />
    </Center>
  );
}

function OBJModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  
  useEffect(() => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material || (Array.isArray(child.material) && child.material.length === 0)) {
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.1
          });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [obj]);

  return (
    <Center>
      <primitive object={obj.clone()} />
    </Center>
  );
}

function STLModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  
  return (
    <Center>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color={0x888888} roughness={0.5} metalness={0.1} />
      </mesh>
    </Center>
  );
}

function FBXModel({ url }: { url: string }) {
  const fbx = useLoader(FBXLoader, url);
  
  useEffect(() => {
    fbx.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.1
          });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    const box = new THREE.Box3().setFromObject(fbx);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 10) {
      const scale = 10 / maxDim;
      fbx.scale.multiplyScalar(scale);
    }
  }, [fbx]);

  return (
    <Center>
      <primitive object={fbx.clone()} />
    </Center>
  );
}

function DAEModel({ url }: { url: string }) {
  const collada = useLoader(ColladaLoader, url);
  
  useEffect(() => {
    collada.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material) {
          child.material = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            roughness: 0.5,
            metalness: 0.1
          });
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [collada]);

  return (
    <Center>
      <primitive object={collada.scene.clone()} />
    </Center>
  );
}

function UnsupportedFormatMessage({ 
  modelUrl, 
  modelType, 
  modelName 
}: { 
  modelUrl: string; 
  modelType: string; 
  modelName: string;
}) {
  const info = formatInfo[modelType] || { name: modelType?.toUpperCase(), supported: false, description: 'Unknown format' };
  
  return (
    <div className="flex-1 bg-muted rounded-lg flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8">
        <Box className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
        <Badge variant="outline" className="mb-4">{info.name}</Badge>
        <p className="text-muted-foreground mb-4 max-w-md">
          {info.description}
          <br />
          <span className="text-sm">Download the model to view it in a compatible 3D application.</span>
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <Download className="h-4 w-4 mr-2" />
              Download Model
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModelRenderer({ url, type }: { url: string; type: string | null }) {
  switch (type?.toLowerCase()) {
    case 'gltf':
    case 'glb':
      return <GLTFModel url={url} />;
    case 'obj':
      return <OBJModel url={url} />;
    case 'stl':
      return <STLModel url={url} />;
    case 'fbx':
      return <FBXModel url={url} />;
    case 'dae':
      return <DAEModel url={url} />;
    default:
      return null;
  }
}

function Scene({ 
  modelUrl, 
  modelType, 
  autoRotate,
  controlsRef,
  onError
}: { 
  modelUrl: string; 
  modelType: string | null;
  autoRotate: boolean;
  controlsRef: React.RefObject<any>;
  onError: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      
      <ErrorBoundary fallback={<ErrorBoundaryFallback error="Could not load the 3D model. The file may be corrupted or in an incompatible format." />}>
        <Suspense fallback={<Loader />}>
          <ModelRenderer url={modelUrl} type={modelType} />
        </Suspense>
      </ErrorBoundary>
      
      <OrbitControls 
        ref={controlsRef}
        autoRotate={autoRotate}
        autoRotateSpeed={1}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.5}
        maxDistance={200}
      />
      <Environment preset="city" />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </>
  );
}

export default function Model3DViewer({ modelUrl, modelType, modelName }: Model3DViewerProps) {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  const info = formatInfo[modelType?.toLowerCase() || ''] || { name: modelType?.toUpperCase() || 'Unknown', supported: false, description: '' };
  
  const supportedFormats = ['gltf', 'glb', 'obj', 'stl', 'fbx', 'dae'];
  const isSupported = supportedFormats.includes(modelType?.toLowerCase() || '');
  
  useEffect(() => {
    // Reset error state when model changes
    setHasError(false);
    setInitError(null);
    setIsCanvasReady(false);
    
    // Validate URL before attempting to load
    if (!modelUrl) {
      setInitError('No model URL provided');
      return;
    }
    
    // Give canvas time to initialize
    const timer = setTimeout(() => setIsCanvasReady(true), 200);
    return () => clearTimeout(timer);
  }, [modelUrl, modelType]);
  
  if (!isSupported) {
    return (
      <UnsupportedFormatMessage 
        modelUrl={modelUrl} 
        modelType={modelType || ''} 
        modelName={modelName} 
      />
    );
  }

  if (initError) {
    return (
      <div className="flex-1 bg-muted rounded-lg flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Cannot Load Model</h3>
          <p className="text-muted-foreground mb-4 max-w-md">{initError}</p>
          <Button asChild>
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <Download className="h-4 w-4 mr-2" />
              Download Instead
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex-1 bg-muted rounded-lg flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to Load Model</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            The model could not be loaded. This may be due to CORS restrictions, 
            file corruption, or an incompatible format.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => {
              setHasError(false);
              setIsCanvasReady(false);
              setTimeout(() => setIsCanvasReady(true), 200);
            }}>
              Try Again
            </Button>
            <Button asChild>
              <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
                <Download className="h-4 w-4 mr-2" />
                Download Instead
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleZoomIn = () => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const currentDistance = controls.getDistance?.() || 10;
      controls.dollyTo?.(currentDistance * 0.7, true);
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const currentDistance = controls.getDistance?.() || 10;
      controls.dollyTo?.(currentDistance * 1.3, true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-[400px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-background/50 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{info.name}</Badge>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant={autoRotate ? "default" : "outline"} 
            size="sm" 
            onClick={() => setAutoRotate(!autoRotate)}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Auto-rotate
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Download
          </a>
        </Button>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-lg overflow-hidden relative">
        {isCanvasReady && modelUrl && (
          <ErrorBoundary
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-white mb-2">Failed to initialize 3D viewer</p>
                  <p className="text-white/60 text-sm mb-4">Your browser may not support WebGL or the model format.</p>
                  <Button asChild variant="secondary">
                    <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Model
                    </a>
                  </Button>
                </div>
              </div>
            }
          >
            <Canvas
              camera={{ position: [5, 5, 5], fov: 50 }}
              style={{ width: '100%', height: '100%' }}
              shadows
              gl={{ 
                antialias: true, 
                alpha: false,
                powerPreference: 'high-performance',
                failIfMajorPerformanceCaveat: false
              }}
              onError={(e) => {
                console.error('Canvas error:', e);
                setHasError(true);
              }}
            >
              <Scene
                modelUrl={modelUrl}
                modelType={modelType}
                autoRotate={autoRotate}
                controlsRef={controlsRef}
                onError={() => setHasError(true)}
              />
            </Canvas>
          </ErrorBoundary>
        )}
        {!isCanvasReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Initializing 3D viewer...</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground p-2 text-center bg-background/50">
        Drag to rotate • Scroll to zoom • Shift+drag to pan
      </p>
    </div>
  );
}
