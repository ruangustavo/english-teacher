import type { ModelMessage } from "ai";

interface Session {
	messages: ModelMessage[];
	lastActivity: number;
}

const sessions = new Map<string, Session>();
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function isExpired(session: Session): boolean {
	return Date.now() - session.lastActivity > TTL_MS;
}

export function getMessages(jid: string): ModelMessage[] {
	const session = sessions.get(jid);
	if (!session || isExpired(session)) {
		sessions.delete(jid);
		return [];
	}
	return session.messages;
}

export function addMessage(
	jid: string,
	role: "user" | "assistant",
	content: string,
): void {
	let session = sessions.get(jid);
	if (!session || isExpired(session)) {
		session = { messages: [], lastActivity: Date.now() };
		sessions.set(jid, session);
	}
	session.messages.push({ role, content });
	session.lastActivity = Date.now();
}

export function resetSession(jid: string): void {
	sessions.delete(jid);
}
