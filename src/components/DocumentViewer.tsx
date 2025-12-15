import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight,
  RotateCw,
  Download,
  FileText,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

interface DocumentViewerProps {
  documents: Document[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

export const DocumentViewer = ({ 
  documents, 
  initialIndex = 0, 
  open, 
  onClose 
}: DocumentViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents[currentIndex];
  const isImage = currentDoc?.file_type?.startsWith('image/');
  const isPdf = currentDoc?.file_type === 'application/pdf' || currentDoc?.file_name?.endsWith('.pdf');

  useEffect(() => {
    setCurrentIndex(initialIndex);
    resetView();
  }, [initialIndex, open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          resetView();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, documents.length, isFullscreen]);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      resetView();
    }
  };

  const goToNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetView();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen not supported');
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1 && isImage) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && isImage && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentDoc.file_url;
    link.download = currentDoc.file_name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentDoc) return null;

  return (
    <Dialog open={open} onOpenChange={onClose} modal={false}>
      <DialogContent 
        ref={containerRef}
        className={cn(
          "p-0 gap-0 border-0 bg-black/95 fixed inset-0 z-[100]",
          isFullscreen 
            ? "w-screen h-screen max-w-none max-h-none rounded-none" 
            : "w-[95vw] h-[90vh] max-w-6xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Document Viewer - {currentDoc?.file_name}</DialogTitle>
        </VisuallyHidden>
        {/* Header toolbar */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2 text-white">
            {isImage ? (
              <ImageIcon className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
              {currentDoc.file_name}
            </span>
            <span className="text-xs text-white/60">
              ({currentIndex + 1} / {documents.length})
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content area */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden relative h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: zoom > 1 && isImage ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {isImage ? (
            <img
              src={currentDoc.file_url}
              alt={currentDoc.file_name}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              }}
              draggable={false}
            />
          ) : isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-white p-8">
              <FileText className="h-20 w-20 mb-6 text-red-400" />
              <p className="text-xl font-medium mb-2">{currentDoc.file_name}</p>
              <p className="text-sm text-white/60 mb-6 text-center max-w-md">
                PDF preview is blocked by your browser's security settings. Click below to view the document.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="default" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.open(currentDoc.file_url, '_blank', 'noopener,noreferrer'); 
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open PDF in New Tab
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-white text-center p-8">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">{currentDoc.file_name}</p>
              <p className="text-sm text-white/60 mb-4">Preview not available for this file type</p>
              <Button variant="secondary" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {documents.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 z-40",
                "h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "sm:h-14 sm:w-14"
              )}
            >
              <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              disabled={currentIndex === documents.length - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 z-40",
                "h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "sm:h-14 sm:w-14"
              )}
            >
              <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          </>
        )}

        {/* Bottom toolbar */}
        <div className="absolute bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-1 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
              disabled={zoom <= 0.25}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            >
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <span className="text-white text-xs sm:text-sm font-medium min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
              disabled={zoom >= 4}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {isImage && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              >
                <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Thumbnail strip for multiple documents */}
        {documents.length > 1 && (
          <div className="absolute bottom-16 left-0 right-0 z-40 flex justify-center px-4">
            <div className="flex gap-2 overflow-x-auto max-w-full p-2 bg-black/60 rounded-lg scrollbar-thin scrollbar-thumb-white/30">
              {documents.map((doc, index) => (
                <button
                  key={doc.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                    resetView();
                  }}
                  className={cn(
                    "flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden border-2 transition-all",
                    index === currentIndex 
                      ? "border-primary ring-2 ring-primary/50" 
                      : "border-transparent hover:border-white/50"
                  )}
                >
                  {doc.file_type?.startsWith('image/') ? (
                    <img 
                      src={doc.file_url} 
                      alt={doc.file_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
