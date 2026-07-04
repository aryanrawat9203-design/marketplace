// Thin abstraction so the chatbot API route never talks to a vendor SDK
// directly - swapping providers (or adding a second one to A/B test) means
// implementing this interface and changing one line in getAIProvider().

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { CHATBOT_CONFIG } from "./config";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export interface AIProvider {
  generateReply(params: { system: string; messages: ChatMessage[] }): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateReply({
    system,
    messages,
  }: {
    system: string;
    messages: ChatMessage[];
  }): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      output_config: { effort: "low" },
    });

    if (response.stop_reason === "refusal") {
      return "I'm not able to help with that one - try rephrasing, or reach human support at /contact.";
    }

    const text = response.content.find((b) => b.type === "text");
    return text && "text" in text ? text.text.trim() : "";
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateReply({
    system,
    messages,
  }: {
    system: string;
    messages: ChatMessage[];
  }): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 500,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    return completion.choices[0]?.message?.content?.trim() ?? "";
  }
}

let cached: AIProvider | null = null;

export function getAIProvider(): AIProvider | null {
  if (cached) return cached;

  if (CHATBOT_CONFIG.aiProvider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    cached = new OpenAIProvider(apiKey, CHATBOT_CONFIG.aiModel);
    return cached;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  cached = new AnthropicProvider(apiKey, CHATBOT_CONFIG.aiModel);
  return cached;
}
