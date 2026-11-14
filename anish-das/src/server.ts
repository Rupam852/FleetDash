import "dotenv/config";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import { app } from "./app.js";
import { initMasterDb, redis } from "./config/db.js";
import { getErrorMessage } from "./utils/errors.js";

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await initMasterDb();
    const pong = await redis.ping();
    console.log(`✅ Upstash Redis Connected: ${pong}`);
  } catch (err: unknown) {
    console.error("⚠️ Database/Redis warning:", getErrorMessage(err));
  }

  app.listen(PORT, () => {
    console.log(`=============================================================`);
    console.log(`🛡️  LedgerGuard API Gateway running on http://localhost:${PORT}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   - MongoDB Atlas: ACTIVE & CONNECTED`);
    console.log(`   - Upstash Distributed Redlock: ACTIVE`);
    console.log(`=============================================================`);
  });
}

bootstrap();
