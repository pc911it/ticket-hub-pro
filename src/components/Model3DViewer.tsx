import { Suspense, useRef, useState, useEffect, Component, ReactNode, useCallback } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, Html, useProgress } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, RotateCcw, ZoomIn, ZoomOut, Maximize2, Box, AlertCircle, Download, RefreshCw } from 'lucide-react';

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

// Check WebGL support
function checkWebGLSupport(): { supported: boolean; message: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null
      || canvas.getContext('webgl') as WebGLRenderingContext | null
      || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    
    if (!gl) {
      return { 
        supported: false, 
        message: 'WebGL is not supported by your browser. Try updating your browser or using Chrome/Firefox.' 
      };
    }
    
    // Check for common WebGL issues
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      console.log('WebGL Renderer:', renderer);
      
      // Check for software rendering (often causes issues)
      if (renderer && (renderer.toLowerCase().includes('swiftshader') || renderer.toLowerCase().includes('llvmpipe'))) {
        return { 
          supported: true, 
          message: 'Software rendering detected - 3D performance may be limited.' 
        };
      }
    }
    
    return { supported: true, message: '' };
  } catch (e) {
    return { 
      supported: false, 
      message: 'Failed to initialize WebGL. Your device may not support 3D rendering.' 
    };
  }
}

// Error Boundary Class Component
class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Viewer Error:', error, errorInfo);
    this.props.onError?.();
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
        <p className="text-sm text-white">{progress.toFixed(0)}% loaded</p>
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
        <p className="text-xs text-white/60 max-w-xs">{error}</p>
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
}: { 
  modelUrl: string; 
  modelType: string | null;
  autoRotate: boolean;
  controlsRef: React.RefObject<any>;
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
      
      <Suspense fallback={<Loader />}>
        <ModelRenderer url={modelUrl} type={modelType} />
      </Suspense>
      
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

// Fallback viewer for when WebGL fails
function FallbackViewer({ 
  modelUrl, 
  modelName, 
  modelType,
  onRetry 
}: { 
  modelUrl: string; 
  modelName: string;
  modelType: string | null;
  onRetry: () => void;
}) {
  const info = formatInfo[modelType?.toLowerCase() || ''] || { name: modelType?.toUpperCase() || 'Unknown', supported: false };
  
  return (
    <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8">
        <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">3D Preview Unavailable</h3>
        <Badge variant="secondary" className="mb-4">{info.name}</Badge>
        <p className="text-white/60 mb-6 max-w-md">
          The 3D viewer couldn't load on this device. This may be due to browser limitations, 
          WebGL support, or network restrictions.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild>
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <Download className="h-4 w-4 mr-2" />
              Download Model
            </a>
          </Button>
        </div>
        <p className="text-xs text-white/40 mt-4">
          Tip: Try using Chrome or Firefox with hardware acceleration enabled
        </p>
      </div>
    </div>
  );
}

export default function Model3DViewer({ modelUrl, modelType, modelName }: Model3DViewerProps) {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewerState, setViewerState] = useState<'loading' | 'ready' | 'error' | 'webgl-error'>('loading');
  const [webglMessage, setWebglMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  
  const info = formatInfo[modelType?.toLowerCase() || ''] || { name: modelType?.toUpperCase() || 'Unknown', supported: false, description: '' };
  
  const supportedFormats = ['gltf', 'glb', 'obj', 'stl', 'fbx', 'dae'];
  const isSupported = supportedFormats.includes(modelType?.toLowerCase() || '');

  // Check WebGL and validate URL on mount
  useEffect(() => {
    setViewerState('loading');
    
    // Check WebGL support first
    const webglCheck = checkWebGLSupport();
    if (!webglCheck.supported) {
      setWebglMessage(webglCheck.message);
      setViewerState('webgl-error');
      return;
    }
    
    if (webglCheck.message) {
      setWebglMessage(webglCheck.message);
    }
    
    // Validate URL
    if (!modelUrl) {
      setViewerState('error');
      return;
    }
    
    // Give canvas time to initialize (longer on first load)
    const delay = retryCount === 0 ? 500 : 300;
    const timer = setTimeout(() => {
      setViewerState('ready');
    }, delay);
    
    return () => clearTimeout(timer);
  }, [modelUrl, modelType, retryCount]);
  
  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  const handleError = useCallback(() => {
    setViewerState('error');
  }, []);
  
  if (!isSupported) {
    return (
      <UnsupportedFormatMessage 
        modelUrl={modelUrl} 
        modelType={modelType || ''} 
        modelName={modelName} 
      />
    );
  }

  // WebGL not supported
  if (viewerState === 'webgl-error') {
    return (
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">WebGL Not Available</h3>
          <p className="text-white/60 mb-4 max-w-md">{webglMessage}</p>
          <Button asChild>
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <Download className="h-4 w-4 mr-2" />
              Download Model
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (viewerState === 'error') {
    return (
      <FallbackViewer 
        modelUrl={modelUrl} 
        modelName={modelName}
        modelType={modelType}
        onRetry={handleRetry}
      />
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
          {webglMessage && (
            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
              {webglMessage}
            </Badge>
          )}
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
        {viewerState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Initializing 3D viewer...</p>
            </div>
          </div>
        )}
        
        {viewerState === 'ready' && modelUrl && (
          <ErrorBoundary
            fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <FallbackViewer 
                  modelUrl={modelUrl} 
                  modelName={modelName}
                  modelType={modelType}
                  onRetry={handleRetry}
                />
              </div>
            }
            onError={handleError}
          >
            <Canvas
              camera={{ position: [5, 5, 5], fov: 50 }}
              style={{ width: '100%', height: '100%' }}
              shadows
              gl={{ 
                antialias: true, 
                alpha: false,
                powerPreference: 'default',
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true
              }}
              onCreated={({ gl }) => {
                console.log('Canvas created, renderer:', gl.getContext().getParameter(gl.getContext().VERSION));
              }}
              onError={(e) => {
                console.error('Canvas error:', e);
                setViewerState('error');
              }}
            >
              <ErrorBoundary
                fallback={<ErrorBoundaryFallback error="Model loading failed. Try downloading the file." />}
                onError={handleError}
              >
                <Scene
                  modelUrl={modelUrl}
                  modelType={modelType}
                  autoRotate={autoRotate}
                  controlsRef={controlsRef}
                />
              </ErrorBoundary>
            </Canvas>
          </ErrorBoundary>
        )}
      </div>

      <p className="text-xs text-muted-foreground p-2 text-center bg-background/50">
        Drag to rotate • Scroll to zoom • Shift+drag to pan
      </p>
    </div>
  );
}
