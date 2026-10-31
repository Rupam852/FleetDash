import { VehicleTelemetry, GeofenceZone } from '@fleetdash/shared';

export interface ViewportTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private isRunning = false;

  // Telemetry buffer kept outside React state
  private vehicles = new Map<number, VehicleTelemetry>();
  private geofences: GeofenceZone[] = [];
  private selectedVehicleId: string | null = null;

  // Viewport navigation
  public transform: ViewportTransform = {
    offsetX: 0,
    offsetY: 0,
    scale: 6500 // Map scale projection
  };

  // Geo bounds center (Bengaluru region)
  private centerLat = 12.9716;
  private centerLng = 77.5946;

  // Performance telemetry
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 60;
  private onFpsUpdate?: (fps: number) => void;
  private onVehicleSelect?: (vehicle: VehicleTelemetry | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    options?: {
      onFpsUpdate?: (fps: number) => void;
      onVehicleSelect?: (vehicle: VehicleTelemetry | null) => void;
    }
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.onFpsUpdate = options?.onFpsUpdate;
    this.onVehicleSelect = options?.onVehicleSelect;

    this.initEvents();
  }

  public setGeofences(zones: GeofenceZone[]): void {
    this.geofences = zones;
  }

  /**
   * Fast batch update from binary ArrayBuffer decoder
   * Directly mutates the memory buffer without triggering React DOM re-renders!
   */
  public updateVehiclesBatch(newVehicles: VehicleTelemetry[]): void {
    for (let i = 0; i < newVehicles.length; i++) {
      const v = newVehicles[i]!;
      this.vehicles.set(v.numericId, v);
    }
  }

  public getVehiclesCount(): number {
    return this.vehicles.size;
  }

  public setSelectedVehicle(vehicleId: string | null): void {
    this.selectedVehicleId = vehicleId;
    if (vehicleId) {
      // Find and center on vehicle
      for (const v of this.vehicles.values()) {
        if (v.vehicleId === vehicleId) {
          this.centerOn(v.latitude, v.longitude);
          if (this.onVehicleSelect) this.onVehicleSelect(v);
          break;
        }
      }
    }
  }

  public centerOn(lat: number, lng: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.transform.offsetX = width / 2 - (lng - this.centerLng) * this.transform.scale;
    this.transform.offsetY = height / 2 + (lat - this.centerLat) * this.transform.scale;
  }

  public resetView(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.transform = {
      offsetX: width / 2,
      offsetY: height / 2,
      scale: 6500
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.resetView();

    const renderLoop = (timestamp: number) => {
      this.render();

      // FPS Calculation
      this.frameCount++;
      const elapsed = timestamp - this.lastFrameTime;
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFrameTime = timestamp;
        if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
      }

      if (this.isRunning) {
        this.animFrameId = requestAnimationFrame(renderLoop);
      }
    };

    this.animFrameId = requestAnimationFrame(renderLoop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Fast clear screen
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw background spatial grid
    this.drawGrid(ctx, width, height);

    // Draw Geofence Polygons
    this.drawGeofences(ctx);

    // Draw high-density moving vehicles (thousands of objects at 60 FPS)
    this.drawVehicles(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    const gridSize = 60;
    const startX = this.transform.offsetX % gridSize;
    const startY = this.transform.offsetY % gridSize;

    ctx.beginPath();
    for (let x = startX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = startY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private project(lat: number, lng: number): [number, number] {
    const x = this.transform.offsetX + (lng - this.centerLng) * this.transform.scale;
    const y = this.transform.offsetY - (lat - this.centerLat) * this.transform.scale;
    return [x, y];
  }

  private drawGeofences(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.geofences.length; i++) {
      const gf = this.geofences[i]!;
      const coords = gf.coordinates;
      if (coords.length < 3) continue;

      ctx.save();
      ctx.beginPath();

      const [firstLng, firstLat] = coords[0]!;
      const [startX, startY] = this.project(firstLat, firstLng);
      ctx.moveTo(startX, startY);

      for (let j = 1; j < coords.length; j++) {
        const [cLng, cLat] = coords[j]!;
        const [px, py] = this.project(cLat, cLng);
        ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Translucent fill
      ctx.fillStyle = gf.color + '22';
      ctx.fill();

      // Border glow
      ctx.strokeStyle = gf.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Label
      ctx.font = '600 11px JetBrains Mono, monospace';
      ctx.fillStyle = gf.color;
      ctx.fillText(`⚑ ${gf.name}`, startX + 8, startY + 16);
      ctx.restore();
    }
  }

  private drawVehicles(ctx: CanvasRenderingContext2D): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (const v of this.vehicles.values()) {
      const [x, y] = this.project(v.latitude, v.longitude);

      // Frustum Culling: Skip offscreen vehicles to preserve 60 FPS
      if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
        continue;
      }

      const isSelected = this.selectedVehicleId === v.vehicleId;
      const isInBreach = v.inGeofence;

      ctx.save();
      ctx.translate(x, y);

      // Rotate canvas according to vehicle heading angle
      const rad = (v.heading * Math.PI) / 180;
      ctx.rotate(rad);

      // Select vehicle color
      if (isInBreach) {
        ctx.fillStyle = '#f43f5e'; // Bright Rose/Red for geofence breach
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
      } else if (isSelected) {
        ctx.fillStyle = '#38bdf8'; // Sky Blue
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
      } else if (v.speed > 80) {
        ctx.fillStyle = '#f59e0b'; // Amber for high speed
      } else {
        ctx.fillStyle = '#10b981'; // Emerald Green
      }

      // Draw aerodynamic vehicle chevron
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(0, 3);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();

      if (isSelected || isInBreach) {
        ctx.restore();
        ctx.save();
        ctx.translate(x, y);
        // Vehicle label
        ctx.font = '700 10px JetBrains Mono, monospace';
        ctx.fillStyle = isInBreach ? '#f43f5e' : '#e2e8f0';
        ctx.fillText(v.vehicleId, 8, -6);
        ctx.font = '500 9px JetBrains Mono, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${Math.round(v.speed)} km/h`, 8, 4);
      }

      ctx.restore();
    }
  }

  private initEvents(): void {
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        this.transform.offsetX += dx;
        this.transform.offsetY += dy;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const mouseX = e.clientX - this.canvas.getBoundingClientRect().left;
      const mouseY = e.clientY - this.canvas.getBoundingClientRect().top;

      this.transform.offsetX = mouseX - (mouseX - this.transform.offsetX) * zoomFactor;
      this.transform.offsetY = mouseY - (mouseY - this.transform.offsetY) * zoomFactor;
      this.transform.scale *= zoomFactor;
      // Clamp zoom
      this.transform.scale = Math.max(1000, Math.min(100000, this.transform.scale));
    }, { passive: false });

    // Click to select vehicle
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let closestVehicle: VehicleTelemetry | null = null;
      let minDistance = 15; // Pixel hit tolerance

      for (const v of this.vehicles.values()) {
        const [vx, vy] = this.project(v.latitude, v.longitude);
        const dist = Math.hypot(vx - clickX, vy - clickY);
        if (dist < minDistance) {
          minDistance = dist;
          closestVehicle = v;
        }
      }

      this.selectedVehicleId = closestVehicle ? closestVehicle.vehicleId : null;
      if (this.onVehicleSelect) {
        this.onVehicleSelect(closestVehicle);
      }
    });
  }
}

