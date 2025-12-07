import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Cleanup scanner on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setIsScanning(false);
      setError(null);
      setIsReady(false);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(console.error);
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    }
  }, [isOpen]);

  // Initialize scanner when DOM element is ready
  const initializeScanner = useCallback(() => {
    const element = document.getElementById("barcode-reader");
    if (element && !scannerRef.current) {
      scannerRef.current = new Html5Qrcode("barcode-reader");
      setIsReady(true);
    }
  }, []);

  // Use a small delay to ensure DOM is rendered
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(initializeScanner, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initializeScanner]);

  const startScanning = async () => {
    if (!scannerRef.current) {
      initializeScanner();
      if (!scannerRef.current) {
        setError("Scanner not ready. Please try again.");
        return;
      }
    }
    
    setError(null);
    setIsScanning(true);

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          onClose();
        },
        () => {} // Ignore errors during scanning
      );
    } catch (err) {
      setError("Unable to access camera. Please ensure camera permissions are granted.");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan Barcode / QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            id="barcode-reader" 
            className="w-full min-h-[300px] bg-muted rounded-lg overflow-hidden"
          />
          
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          
          <div className="flex gap-2 justify-center">
            {!isScanning ? (
              <Button onClick={startScanning} className="gap-2" disabled={!isReady}>
                <Camera className="h-4 w-4" />
                {isReady ? "Start Camera" : "Initializing..."}
              </Button>
            ) : (
              <Button variant="destructive" onClick={stopScanning} className="gap-2">
                <X className="h-4 w-4" />
                Stop Scanning
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Point your camera at a barcode or QR code to scan
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
