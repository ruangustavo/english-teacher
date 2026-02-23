import { start } from "./whatsapp.ts";

start().catch((err) => {
	console.error("Failed to start bot:", err);
});
