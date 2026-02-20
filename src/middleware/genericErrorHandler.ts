import {NextFunction, Request, Response} from "express";

export function handleGenericError(err: Error, req: Request, res: Response, _next: NextFunction) {
    const status: number = (err as any).status || 500;
    if (status >= 500) console.error(err);
    res.status(status);

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.code = status;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.render('error');
}