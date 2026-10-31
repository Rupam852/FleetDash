import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header.js';
import { AlertsSidebar } from './components/AlertsSidebar.js';
import { ControlPanel } from './components/ControlPanel.js';
import { CanvasEngine } from './engine/CanvasEngine.js';
import { useBinaryTelemetry } from './hooks/useBinaryTelemetry.js';
import { VehicleTelemetry } from '@fleetdash/shared';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasEngineRef = useRef<CanvasEngine | null>(null);

  const [fps, setFps] = useState(60);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleTelemetry | null>(null);

  // High-frequency binary telemetry stream hook
  const {
    isConnected,
    alerts,
    latestAlert,
    throughputPps,
    activeVehiclesCount,
    clearAlerts
  } = useBinaryTelemetry({
    socketUrl: 'http://localhost:4000',
    canvasEngineRef
  });

  // Handle window resizing to keep Canvas full resolution
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !canvasEngineRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth - 340;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight - 60;
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    // Set initial size
    canvas.width = canvas.parentElement?.clientWidth || window.innerWidth - 340;
    canvas.height = canvas.parentElement?.clientHeight || window.innerHeight - 60;

    // Initialize custom Canvas 2D engine decoupled from React state
    const engine = new CanvasEngine(canvas, {
      onFpsUpdate: (currentFps) => setFps(currentFps),
      onVehicleSelect: (v) => setSelectedVehicle(v)
    });

    canvasEngineRef.current = engine;
    engine.start();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.stop();
    };
  }, [handleResize]);

  const handleSelectVehicle = (vehicleId: string) => {
    if (canvasEngineRef.current) {
      canvasEngineRef.current.setSelectedVehicle(vehicleId);
    }
  };

  const handleResetView = () => {
    if (canvasEngineRef.current) {
      canvasEngineRef.current.resetView();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Navigation */}
      <Header
        isConnected={isConnected}
        fps={fps}
        throughput={throughputPps}
      />

      {/* Main Workspace: Canvas Map & Alerts Sidebar */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Map Viewport Area */}
        <div style={{ flex: 1, position: 'relative', height: '100%', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: 'grab'
            }}
          />

          {/* Interactive Control & SLA Benchmark Panel */}
          <ControlPanel
            activeCount={activeVehiclesCount}
            onResetView={handleResetView}
            selectedVehicle={selectedVehicle}
          />
        </div>

        {/* Real-Time Geospatial Alerts Sidebar */}
        <AlertsSidebar
          alerts={alerts}
          latestAlert={latestAlert}
          onSelectVehicle={handleSelectVehicle}
          onClearAlerts={clearAlerts}
        />
      </div>
    </div>
  );
};

export default App;

