import { fileURLToPath } from "node:url";

export const ENGINE_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const CLIENT_ENTRY = fileURLToPath(new URL("../components/client.ts", import.meta.url));
