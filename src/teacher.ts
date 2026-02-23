import { openai } from "@ai-sdk/openai";
import { generateText, type ModelMessage, stepCountIs, tool } from "ai";
import { z } from "zod";

const conversationPrompt = `
You are a friendly, native English conversation partner helping an advanced English speaker practice their conversational skills.

## Conversation
- Have natural conversations on any topic the user brings up
- End with a follow-up question to keep the conversation flowing
- Be conversational, not academic; keep responses concise

## Transcription Awareness
If the user's message was transcribed from audio, pay close attention to how words were transcribed — unusual spellings often indicate mispronunciation.

## Output Structure
Your output has two separate parts:
1. **Main reply** (your text response): ONLY the conversational response. Never include corrections, feedback, or the 📝 emoji here.
2. **giveFeedback tool**: ONLY the correction, as a separate message. Call this ONLY for the most recent user message — never for earlier messages in the conversation history. Your main reply and the feedback are sent as two different WhatsApp messages.

## Feedback Formatting (WhatsApp — use literal characters)
- ~text~ = strikethrough (what the student said wrong)
- *text* = bold (the correction)
- Wrong word inside tildes, correct word in asterisks — never merge them into one span
- To remove a word: ~word~
- To add a word: *word*

## Explanation
Provide a short, clear explanation of _why_ the correction is needed. 1–2 sentences max.

# Examples

<user_message>I have 20 years old.</user_message>
<feedback>I ~have~ *am* 20 years old</feedback>
<explanation>In English, we use "to be" (am/is/are) to express age, not "to have".</explanation>`;

export async function chat(messages: ModelMessage[]) {
	const result = await generateText({
		model: openai("gpt-4o"),
		system: conversationPrompt,
		messages,
		stopWhen: stepCountIs(2),
		tools: {
			giveFeedback: tool({
				description:
					"Output ONLY the correction for the most recent user message. Never correct earlier messages in the conversation. This becomes a separate WhatsApp message. Do not include your conversational reply here. Use only when worth correcting.",
				inputSchema: z.object({
					feedback: z
						.string()
						.describe(
							"Write the FULL sentence with ALL words — including parts that are already correct. Only mark the errors: ~wrong~ *correct*. Example: 'I ~have~ *am* 20 years old.' Never omit words. Never just write the correction alone.",
						),
					explanation: z
						.string()
						.describe(
							"A short explanation (1-2 sentences) of why the correction is needed.",
						),
				}),
				execute: async ({ feedback, explanation }) => ({
					feedback,
					explanation,
				}),
			}),
		},
	});

	const feedbackResult = result.steps
		.flatMap((s) => s.toolResults)
		.find(
			(r): r is Extract<typeof r, { toolName: "giveFeedback" }> =>
				r.toolName === "giveFeedback",
		);

	const feedback = feedbackResult
		? `📝 ${feedbackResult.output.feedback}\n\n${feedbackResult.output.explanation}`
		: null;

	return { response: result.text, feedback };
}
