import "express";

declare module "express-serve-static-core" {
    interface Locals {
        data?: any;
        version: string;
        message?: string;
        code?: number;
        error?: any;
    }
}

export {};