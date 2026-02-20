import "express-session";
import {User} from "../modules/database/entities/user/User";

declare global {
    namespace Express {
        interface Request {
            resource?: Record<string, any>;
            additional?: Record<string, any>[];
            flash(type: string, message?: any): void;
        }
    }
}

declare module "express-session" {
    interface SessionData {
        user?: User | null;
        guest?: any | null;
        tokens?: any;
        oidc?: { code_verifier: string; state: string; nonce?: string };
    }
}