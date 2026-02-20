import createError from 'http-errors';
import express, {NextFunction, Request, Response} from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import indexRouter from './routes';
import {handleGenericError} from './middleware/genericErrorHandler';

// Version from package.json
import {version} from '../package.json';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (_req: Request, res: Response, next: NextFunction) {
    res.locals.version = version;
    next();
});

// Routes
app.use('/', indexRouter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
    res.json({ok: true});
});

// catch 404 and forward to error handler
app.use(function (_req: Request, _res: Response, next: NextFunction) {
    next(createError(404));
});

// error handler
app.use(handleGenericError);

export default app;