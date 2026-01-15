import { Suspense, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, Html, useProgress } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { ExternalLink, RotateCcw, ZoomIn, ZoomOut, Maximize2, Box } from 'lucide-react';

interface Model3DViewerProps {
  modelUrl: string;
  modelType: string | null;
  modelName: string;
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

function GLTFModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene} />
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
  return (
    <div className="flex-1 bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center p-8">
        <Box className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Preview Not Available</h3>
        <p className="text-muted-foreground mb-4">
          {modelType?.toUpperCase()} files cannot be previewed directly in the browser.
          <br />
          Download the model to view it in a compatible 3D application.
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild>
            <a href={modelUrl} target="_blank" rel="noopener noreferrer" download={modelName}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Download Model
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Model type: {modelType?.toUpperCase() || 'Unknown'}
        </p>
      </div>
    </div>
  );
}

export default function Model3DViewer({ modelUrl, modelType, modelName }: Model3DViewerProps) {
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  
  // Check if the format is viewable in browser
  const isGLTF = modelType === 'gltf' || modelType === 'glb';
  
  // For non-GLTF formats, show download message
  if (!isGLTF) {
    return (
      <UnsupportedFormatMessage 
        modelUrl={modelUrl} 
        modelType={modelType || ''} 
        modelName={modelName} 
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
      const currentDistance = controls.getDistance();
      controls.dollyTo(currentDistance * 0.7, true);
    }
  };

  const handleZoomOut = () => {
    if (controlsRef.current) {
      const controls = controlsRef.current;
      const currentDistance = controls.getDistance();
      controls.dollyTo(currentDistance * 1.3, true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-background/50">
        <div className="flex items-center gap-2">
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
      <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-800 rounded-b-lg overflow-hidden min-h-0">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Suspense fallback={<Loader />}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            <GLTFModel url={modelUrl} />
            <OrbitControls 
              ref={controlsRef}
              autoRotate={autoRotate}
              autoRotateSpeed={1}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={1}
              maxDistance={100}
            />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      <p className="text-xs text-muted-foreground p-2 text-center bg-background/50">
        Drag to rotate • Scroll to zoom • Shift+drag to pan
      </p>
    </div>
  );
}
