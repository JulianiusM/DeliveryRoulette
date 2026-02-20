declare module "express-flash" {
    import {RequestHandler} from "express";
    function flash(): RequestHandler;
    export default flash;
}
