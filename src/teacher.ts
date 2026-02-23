import { openai } from "@ai-sdk/openai";
import { generateText, type ModelMessage, stepCountIs, tool } from "ai";
import { z } from "zod";

const conversationPrompt = `You are a friendly, native English conversation partner helping an advanced English speaker practice their conversational skills.

Your role:
- Have natural conversations on any topic the user brings up
- End with a follow-up question to keep the conversation flowing
- If the user's message was transcribed from audio, pay close attention to how words were transcribed — unusual spellings often indicate mispronunciation

Style:
- Be conversational, not academic
- Keep responses concise

English feedback:
- Use the giveFeedback tool only when the student's last message has something genuinely worth correcting or improving
- Skip feedback for very short replies, greetings, or already natural messages`;

export async function chat(messages: ModelMessage[]) {
	const result = await generateText({
		model: openai("gpt-4o"),
		system: conversationPrompt,
		messages,
		stopWhen: stepCountIs(2),
		tools: {
			giveFeedback: tool({
				description:
					"Provide English feedback on the student's last message. Only call this when there is something genuinely worth correcting or improving — not for short replies or already natural messages.",
				inputSchema: z.object({
					feedback: z
						.string()
						.describe(
							"Feedback using WhatsApp formatting: ~wrong word or phrase~ *correct version*. For insertions write *[word]*. Start with 📝. Max 1-2 sentences.",
						),
				}),
				execute: async ({ feedback }) => feedback,
			}),
		},
	});

	const feedbackResult = result.steps
		.flatMap((s) => s.toolResults)
		.find((r) => r.toolName === "giveFeedback");

	return {
		response: result.text,
		feedback: feedbackResult ? String(feedbackResult.output) : null,
	};
}
