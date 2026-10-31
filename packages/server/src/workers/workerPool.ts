import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { VehicleTelemetry } from '@fleetdash/shared';
import { RawTelemetryInput } from './telemetryParser.worker.js';
import { CONFIG } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PendingTask {
  resolve: (value: VehicleTelemetry[]) => void;
  reject: (reason?: unknown) => void;
  timeoutId: NodeJS.Timeout;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private taskMap = new Map<string, PendingTask>();
  private currentWorkerIndex = 0;
  private taskIdCounter = 0;
  private isInitialized = false;

  constructor(private poolSize = CONFIG.WORKER_POOL_SIZE) {}

  public init(): void {
    if (this.isInitialized) return;

    // In development with tsx or production with node, find worker file
    const workerScript = path.resolve(__dirname, './telemetryParser.worker.js');

    try {
      for (let i = 0; i < this.poolSize; i++) {
        // Use tsx or direct node
        const worker = new Worker(workerScript, {
          execArgv: process.execArgv.includes('--loader') ? process.execArgv : []
        });

        worker.on('message', (msg: { id: string; success: boolean; result?: VehicleTelemetry[]; error?: string }) => {
          const task = this.taskMap.get(msg.id);
          if (task) {
            clearTimeout(task.timeoutId);
            this.taskMap.delete(msg.id);
            if (msg.success && msg.result) {
              task.resolve(msg.result);
            } else {
              task.reject(new Error(msg.error || 'Worker parsing failed'));
            }
          }
        });

        worker.on('error', (err) => {
          console.error(`[WorkerPool] Worker ${i} encountered error:`, err);
        });

        this.workers.push(worker);
      }
      this.isInitialized = true;
      console.log(`[WorkerPool] Initialized pool with ${this.poolSize} worker threads for coordinate ingestion.`);
    } catch (err) {
      console.warn('[WorkerPool] Worker thread initialization failed, falling back to synchronous inline parser:', err);
    }
  }

  public async parseCoordinates(items: RawTelemetryInput[]): Promise<VehicleTelemetry[]> {
    if (!this.isInitialized || this.workers.length === 0) {
      // Fallback inline parsing if workers unavailable
      return this.inlineParse(items);
    }

    const taskId = `task_${Date.now()}_${++this.taskIdCounter}`;
    const worker = this.workers[this.currentWorkerIndex]!;
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (this.taskMap.has(taskId)) {
          this.taskMap.delete(taskId);
          // On timeout, fallback inline
          resolve(this.inlineParse(items));
        }
      }, 2000);

      this.taskMap.set(taskId, { resolve, reject, timeoutId });
      worker.postMessage({ id: taskId, items });
    });
  }

  private inlineParse(items: RawTelemetryInput[]): VehicleTelemetry[] {
    const now = Date.now();
    return items.map((raw, idx) => {
      let numericId = 0;
      if (typeof raw.vId === 'number') {
        numericId = raw.vId;
      } else {
        const parsedNum = parseInt(String(raw.vId).replace(/\D/g, ''), 10);
        numericId = isNaN(parsedNum) ? idx + 1 : parsedNum;
      }

      return {
        numericId,
        vehicleId: typeof raw.vId === 'string' && raw.vId.startsWith('VH-') ? raw.vId : `VH-${numericId.toString().padStart(4, '0')}`,
        timestamp: raw.ts && raw.ts > 0 ? Number(raw.ts) : now,
        latitude: Number(raw.lat),
        longitude: Number(raw.lng),
        speed: Math.max(0, Math.min(220, Number(raw.spd ?? 50))),
        heading: Math.max(0, Math.min(360, Math.round(Number(raw.hdg ?? 0)))),
        fuelLevel: Math.max(0, Math.min(100, Math.round(Number(raw.fuel ?? 80)))),
        inGeofence: false
      };
    });
  }

  public terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.isInitialized = false;
  }
}

export const globalWorkerPool = new WorkerPool();

