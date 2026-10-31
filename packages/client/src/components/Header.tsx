import React from 'react';
import { Activity, Wifi, ShieldCheck, Zap } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  fps: number;
  throughput: number;
}

export const Header: React.FC<HeaderProps> = ({ isConnected, fps, throughput }) => {
  return (
    <header style={{
      height: '60px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 50,
      position: 'relative'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)'
        }}>
          <Zap size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              FleetDash
            </h1>
            <span style={{
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              fontWeight: 600
            }}>
              MERN v1.0
            </span>
          </div>
          <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
            Event-Driven Fleet Telemetry & Geospatial Breach Engine
          </p>
        </div>
      </div>

      {/* Real-time Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Binary Transport Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <Wifi size={14} color={isConnected ? '#10b981' : '#f43f5e'} />
          <span style={{ color: isConnected ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
            {isConnected ? 'STREAM: BINARY (ArrayBuffer)' : 'OFFLINE'}
          </span>
        </div>

        {/* Viewport FPS SLA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <Activity size={14} color={fps >= 55 ? '#10b981' : '#f59e0b'} />
          <span style={{ color: '#cbd5e1' }}>Viewport:</span>
          <span style={{ color: fps >= 55 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
            {fps} FPS
          </span>
        </div>

        {/* Ingestion Throughput */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '5px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <ShieldCheck size={14} color="#3b82f6" />
          <span style={{ color: '#cbd5e1' }}>Throughput:</span>
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>
            {throughput.toLocaleString()} pts/s
          </span>
        </div>
      </div>
    </header>
  );
};

