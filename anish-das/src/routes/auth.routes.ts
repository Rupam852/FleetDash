import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authRouter = Router();

authRouter.post("/login", (req: Request, res: Response) => {
  const { email, tenantId, organizationId, password } = req.body;

  if (!email || !tenantId) {
    return res.status(400).json({ error: "Email and tenantId are required." });
  }

  const jwtSecret = process.env.JWT_SECRET || "ledgerguard_super_secret_jwt_key_2026_infotact";
  const org = organizationId || `org_${tenantId}`;

  const token = jwt.sign(
    {
      sub: `user_${Date.now()}`,
      email,
      tenantId: tenantId.toLowerCase().trim(),
      organizationId: org,
      role: "FINANCE_OPERATOR",
    },
    jwtSecret,
    { expiresIn: "8h" }
  );

  return res.json({
    message: "Authentication successful",
    token,
    user: {
      email,
      tenantId: tenantId.toLowerCase().trim(),
      organizationId: org,
      role: "FINANCE_OPERATOR",
    },
  });
});
