import { app } from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`🛡️  LedgerGuard API Gateway running on http://localhost:${PORT}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   - Asymmetric JWT & Tenant Context: ACTIVE`);
  console.log(`=============================================================`);
});
