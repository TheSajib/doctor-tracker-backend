import { asyncHandler } from "../async-handler.js";
import { HttpError } from "../errors.js";
import { authenticate } from "./service.js";

export function requireAuth(config) {
  return asyncHandler(async (req, _res, next) => {
    const header = req.get("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match) {
      throw new HttpError(401, "Sign in required.", "unauthorized");
    }
    const auth = await authenticate(match[1], config);
    req.user = auth.user;
    req.auth = { jti: auth.jti };
    next();
  });
}
