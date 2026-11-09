import type { AuthenticatedUser } from "../middleware/auth.ts";

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}
