import type { Boom } from "@hapi/boom";
import makeWASocket, {
	type ConnectionState,
	DisconnectReason,
	downloadMediaMessage,
	getContentType,
	useMultiFileAuthState,
	type WAMessage,
} from "baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";
import { addMessage, getMessages, resetSession } from "./session.ts";
import { chat } from "./teacher.ts";
import { transcribeAudio } from "./transcription.ts";

async function extractUserMessage(msg: WAMessage): Promise<string | null> {
	const content = msg.message;
	if (!content) return null;

	const contentType = getContentType(content);

	if (contentType === "audioMessage") {
		const buffer = await downloadMediaMessage(msg, "buffer", {});
		return transcribeAudio(buffer);
	}

	return content.conversation ?? content.extendedTextMessage?.text ?? null;
}

function isResetCommand(text: string): boolean {
	const normalized = text.trim().toLowerCase();
	return normalized === "reset" || normalized === "/reset";
}

function onQR(qr: string): void {
	console.log("QR code received, scan with your WhatsApp:");
	qrcode.generate(qr, { small: true });
}

function onConnectionClose(
	lastDisconnect: ConnectionState["lastDisconnect"],
): void {
	const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
		?.statusCode;
	const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

	console.log(
		"Connection closed. Reconnect:",
		shouldReconnect,
		"status:",
		statusCode,
	);

	if (shouldReconnect) {
		start().catch(console.error);
	} else {
		console.log(
			"Logged out of WhatsApp. Delete auth_info_baileys folder to log in again.",
		);
	}
}

const logger = pino({ level: "silent" });

export async function start(): Promise<void> {
	const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

	const sock = makeWASocket({ auth: state, logger });

	async function withTyping<T>(jid: string, fn: () => Promise<T>): Promise<T> {
		await sock.sendPresenceUpdate("composing", jid);
		try {
			return await fn();
		} finally {
			await sock.sendPresenceUpdate("paused", jid);
		}
	}

	sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
		if (qr) onQR(qr);
		if (connection === "close") onConnectionClose(lastDisconnect);
		if (connection === "open") console.log("Connected to WhatsApp!");
	});

	sock.ev.on("creds.update", saveCreds);

	sock.ev.on("messages.upsert", async ({ messages, type }) => {
		if (type !== "notify") return;

		for (const msg of messages) {
			const jid = msg.key.remoteJid;
			if (!jid || msg.key.fromMe) continue;

			try {
				const userText = await extractUserMessage(msg);
				if (!userText) continue;

				if (isResetCommand(userText)) {
					resetSession(jid);
					await sock.sendMessage(jid, {
						text: "Session reset! Send me a message to start a new conversation.",
					});
					continue;
				}

				await withTyping(jid, async () => {
					addMessage(jid, "user", userText);
					const { response, feedback } = await chat(getMessages(jid));
					addMessage(jid, "assistant", response);

					await sock.sendMessage(jid, { text: response });
					if (feedback) {
						await sock.sendMessage(jid, { text: feedback });
					}
				});
			} catch (err) {
				console.error("Error processing message:", err);
				await sock.sendMessage(jid, {
					text: "Sorry, something went wrong. Try again!",
				});
			}
		}
	});
}
