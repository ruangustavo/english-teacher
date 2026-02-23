import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
	const { text } = await transcribe({
		model: openai.transcription("gpt-4o-transcribe"),
		audio: audioBuffer,
	});
	return text;
}
