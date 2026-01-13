import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";
// @ts-ignore - no types available
import input from "input";

interface TelegramConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

interface JobPost {
  messageId: number;
  text: string;
  date: Date;
  channelUsername: string;
}

export class TelegramScraper {
  private client: TelegramClient | null = null;
  private config: TelegramConfig;
  private sessionString: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.sessionString = config.sessionString || "";
  }

  async connect(): Promise<void> {
    const session = new StringSession(this.sessionString);
    this.client = new TelegramClient(session, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
    });

    await this.client.start({
      phoneNumber: async () => await input.text("Please enter your phone number: "),
      password: async () => await input.text("Please enter your password: "),
      phoneCode: async () => await input.text("Please enter the code you received: "),
      onError: (err) => console.error("Telegram connection error:", err),
    });

    console.log("Connected to Telegram!");
    console.log("Session string:", this.client.session.save());
  }

  async getChannelMessages(channelUsername: string, limit: number = 100): Promise<JobPost[]> {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    try {
      const channel = await this.client.getEntity(channelUsername);
      const messages = await this.client.getMessages(channel, { limit });

      const jobPosts: JobPost[] = [];

      for (const message of messages) {
        if (message instanceof Api.Message && message.message) {
          jobPosts.push({
            messageId: message.id,
            text: message.message,
            date: new Date(message.date * 1000),
            channelUsername,
          });
        }
      }

      return jobPosts;
    } catch (error) {
      console.error(`Error fetching messages from ${channelUsername}:`, error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  getSessionString(): string {
    return this.client?.session.save() || this.sessionString;
  }
}

/**
 * Parse job information from Telegram message text
 * This is a basic parser - can be enhanced based on actual message formats
 */
export function parseJobFromMessage(message: JobPost): {
  title?: string;
  company?: string;
  location?: string;
  description: string;
  tags: string[];
  applyUrl?: string;
} {
  const text = message.text;
  const lines = text.split("\n");

  // Extract URLs (apply links)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  const applyUrl = urls[0];

  // Extract hashtags as tags
  const hashtagRegex = /#(\w+)/g;
  const tags: string[] = [];
  let hashtagMatch;
  while ((hashtagMatch = hashtagRegex.exec(text)) !== null) {
    tags.push(hashtagMatch[1]);
  }

  // Try to extract title (usually first line or after emoji)
  let title = lines[0]?.replace(/[📢💼🔥⚡️]/g, "").trim();
  if (title && title.length > 100) {
    title = title.substring(0, 100);
  }

  // Try to extract company name (look for patterns like "@ Company" or "Company is hiring")
  let company: string | undefined;
  const companyMatch = text.match(/@\s*([A-Z][a-zA-Z0-9\s]+?)(?:\s+is\s+hiring|\s+seeks|\n|$)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  }

  // Try to extract location (look for patterns like "Location:", "Remote", country names)
  let location: string | undefined;
  const locationMatch = text.match(/(?:Location|Based in|Office):\s*([^\n]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  } else if (text.toLowerCase().includes("remote")) {
    location = "Remote";
  }

  return {
    title,
    company,
    location,
    description: text,
    tags,
    applyUrl,
  };
}
