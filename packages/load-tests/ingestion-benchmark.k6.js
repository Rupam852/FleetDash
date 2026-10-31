import http from 'k6/http';
import { check, sleep } from 'k6';

// FleetDash k6 Ingestion Benchmark: 2,000 req/sec Target
export const options = {
  scenarios: {
    constant_rate_ingestion: {
      executor: 'constant-arrival-rate',
      rate: 2000,              // 2,000 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    // Zero data omission requirement: 100% of requests must succeed
    http_req_failed: ['rate==0.00'],
    // 95% of ingestion requests must respond under 20ms
    http_req_duration: ['p(95)<20'],
  },
};

export default function () {
  const url = 'http://localhost:4000/api/v1/telemetry/ingest';
  const vehicleIdNum = Math.floor(Math.random() * 5000) + 1;
  const payload = JSON.stringify({
    vId: `VH-${vehicleIdNum.toString().padStart(4, '0')}`,
    lat: 12.92 + (Math.random() - 0.5) * 0.1,
    lng: 77.64 + (Math.random() - 0.5) * 0.1,
    spd: Math.floor(Math.random() * 90) + 20,
    hdg: Math.floor(Math.random() * 360),
    fuel: Math.floor(Math.random() * 50) + 50,
    ts: Date.now(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 202': (r) => r.status === 202,
  });
}

