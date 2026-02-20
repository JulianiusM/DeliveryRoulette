import "express";
import {User} from "../modules/database/entities/user/User";
import {Settings} from "../modules/settings";
import {TokenEndpointResponse} from "openid-client";

declare module "express-flash" {
    import {RequestHandler} from "express";
    function flash(): RequestHandler;
    export default flash;
}

declare module "express" {
    // Inject additional properties on express.Request
    interface Request {
        resource?: Record<string, any>;
        additional?: Record<string, any>[];
    }
}

declare module "express-serve-static-core" {
    interface Locals {
        data?: any,
        user?: User | null,
        version: string,
        settings?: Partial<Settings>,
    }
}

declare module "express-session" {
    interface SessionData {
        user?: User | null;
        tokens?: TokenEndpointResponse;
        oidc?: { code_verifier: string; state: string; nonce?: string };
    }
}

export {};