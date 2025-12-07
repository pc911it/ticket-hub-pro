import { useEffect, useRef, useState } from "react";
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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !scannerRef.current) {
      scannerRef.current = new Html5Qrcode("barcode-reader");
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!scannerRef.current) return;
    
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
            ref={containerRef}
            className="w-full min-h-[300px] bg-muted rounded-lg overflow-hidden"
          />
          
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          
          <div className="flex gap-2 justify-center">
            {!isScanning ? (
              <Button onClick={startScanning} className="gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
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
