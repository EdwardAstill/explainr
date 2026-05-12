import { straight } from "./straight";
import { curve } from "./curve";
import { orthogonal } from "./orthogonal";
import { routeAround } from "./routeAround";

export { straight } from "./straight";
export { curve } from "./curve";
export { orthogonal } from "./orthogonal";
export { routeAround } from "./routeAround";

export const edge = { straight, curve, orthogonal, routeAround };

export * from "./ports";
export { straightWithPorts, curveWithPorts, orthogonalWithPorts } from "./router";
