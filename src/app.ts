import createError from 'http-errors';
import express, {NextFunction, Request, Response} from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import session from 'express-session';
import flash from 'express-flash';

import indexRouter from './routes';
import apiRouter from './routes/api';
import usersRouter from './routes/users';
import helpRouter from './routes/help';
import restaurantsRouter from './routes/restaurants';
import suggestRouter from './routes/suggest';
import importRouter from './routes/import';
import syncRouter from './routes/sync';
import syncAlertsRouter from './routes/syncAlerts';
import providersRouter from './routes/providers';
import healthRouter from './routes/health';
import settings from './modules/settings';
import {handleGenericError} from './middleware/genericErrorHandler';
import {requestIdMiddleware} from './middleware/requestIdMiddleware';
import logger from './modules/logger';

// Version aus package.json lesen
import {version} from '../package.json';
import {AppDataSource} from "./modules/database/dataSource";
import {Session} from "./modules/database/entities/session/Session";
import {TypeormStore} from "connect-typeorm";

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(requestIdMiddleware);
app.use(pinoHttp({logger, genReqId: (req) => req.id}));

// Basic Content-Security-Policy header
app.use((_req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'unsafe-inline'",
            "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
            "font-src 'self' https://cdn.jsdelivr.net",
            "img-src 'self' data:",
            "connect-src 'self'",
        ].join('; '),
    );
    next();
});

app.use(express.json({limit: '25mb'})); // Increased limit for large import payloads
app.use(express.urlencoded({extended: true, limit: '25mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ensure dataSource is initialized before this
const sessionRepository = AppDataSource.getRepository(Session);

// If behind a proxy (Heroku/NGINX), enable this so secure cookies work:
app.set("trust proxy", 1);

app.use(
    session({
        secret: settings.value.sessionSecret,
        resave: false,
        saveUninitialized: false,
        cookie: {
            // 1 day (match store TTL below)
            maxAge: 1000 * 60 * 60 * 24,
            secure: process.env.NODE_ENV === "production", // HTTPS only in prod
            sameSite: "lax",
            httpOnly: true,
        },
        store: new TypeormStore({
            cleanupLimit: 2,          // prune expired sessions periodically
            limitSubquery: false,
            ttl: 60 * 60 * 24,        // seconds (1 day)
        }).connect(sessionRepository),
    })
);

app.use(flash());

app.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.user = req.session.user;
    res.locals.version = version;
    res.locals.settings = {
        localLoginEnabled: settings.value.localLoginEnabled,
        oidcEnabled: settings.value.oidcEnabled,
        oidcName: settings.value.oidcName,
        rootUrl: settings.value.rootUrl,
        imprintUrl: settings.value.imprintUrl,
        privacyPolicyUrl: settings.value.privacyPolicyUrl,
    };
    next();
});

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/users', usersRouter);
app.use('/help', helpRouter);
app.use('/restaurants', restaurantsRouter);
app.use('/suggest', suggestRouter);
app.use('/import', importRouter);
app.use('/api/sync', syncRouter);
app.use('/sync/alerts', syncAlertsRouter);
app.use('/providers', providersRouter);

app.use('/health', healthRouter);
app.get('/healthz', (_req, res) => res.redirect(301, '/health'));

// catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
    next(createError(404));
});

// error handler
app.use(handleGenericError);

export default app;