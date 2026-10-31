import React from 'react';
import { GeofenceAlert } from '@fleetdash/shared';
import { AlertTriangle, MapPin, Gauge, Trash2 } from 'lucide-react';

interface AlertsSidebarProps {
  alerts: GeofenceAlert[];
  latestAlert: GeofenceAlert | null;
  onSelectVehicle: (vehicleId: string) => void;
  onClearAlerts: () => void;
}

export const AlertsSidebar: React.FC<AlertsSidebarProps> = ({
  alerts,
  latestAlert,
  onSelectVehicle,
  onClearAlerts
}) => {
  return (
    <aside style={{
      width: '340px',
      height: 'calc(100vh - 60px)',
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 40
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#f43f5e" />
          <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', color: '#f8fafc' }}>
            Live Geospatial Alerts
          </h2>
          <span style={{
            background: 'rgba(244, 63, 94, 0.2)',
            color: '#f43f5e',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            padding: '1px 6px',
            borderRadius: '10px',
            fontWeight: 700
          }}>
            {alerts.length}
          </span>
        </div>

        {alerts.length > 0 && (
          <button
            onClick={onClearAlerts}
            title="Clear alerts"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Latest Alert Flash Banner */}
      {latestAlert && (
        <div style={{
          padding: '12px 16px',
          margin: '12px 16px 0 16px',
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#f43f5e', fontFamily: 'JetBrains Mono, monospace' }}>
              ⚡ REAL-TIME BREACH
            </span>
            <span style={{ fontSize: '10px', color: '#fda4af', fontFamily: 'JetBrains Mono, monospace' }}>
              {new Date(latestAlert.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
            {latestAlert.vehicleId} breached {latestAlert.geofenceName}
          </div>
        </div>
      )}

      {/* Alert Feed List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {alerts.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            textAlign: 'center',
            gap: '8px',
            padding: '20px'
          }}>
            <MapPin size={32} opacity={0.3} />
            <p style={{ fontSize: '13px' }}>No active geofence breaches detected.</p>
            <p style={{ fontSize: '11px', color: '#475569' }}>
              Turf.js boundary checks are actively evaluating all coordinates.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.alertId}
              onClick={() => onSelectVehicle(alert.vehicleId)}
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: '12px',
                  color: '#38bdf8'
                }}>
                  {alert.vehicleId}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#64748b'
                }}>
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>
                {alert.message}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                  <Gauge size={12} color="#f59e0b" />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{Math.round(alert.speed)} km/h</span>
                </div>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  color: '#f43f5e',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  {alert.type}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};

