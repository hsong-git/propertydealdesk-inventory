import { neutralUnavailable, methodNotAllowed } from "../../_lib/http.js";
export const onRequestGet = () => neutralUnavailable();
export const onRequest = (context) => context.request.method === "GET" ? onRequestGet(context) : methodNotAllowed("GET");
