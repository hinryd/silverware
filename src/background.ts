import browser from "webextension-polyfill";
import { Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";
import { parse } from "marked";

class ChatGPT {
  token: string | undefined;
  keepAlive: number | undefined;
  status = new Subject<Status>();

  constructor() {
    this.authenticate();
    this.mountKeepAlive("error");
  }

  mountKeepAlive(state: Status["state"]) {
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
    }
    this.keepAlive = setInterval(
      async () => {
        await this.authenticate();
      },
      state === "error" ? 1000 * 15 : 1000 * 60 * 30
    );
  }

  async authenticate() {
    try {
      const res = await fetch("https://chat.openai.com/api/auth/session");
      if (res.status === 403) {
        throw new Error("Refresh Cloudflare");
      }
      if (!res.ok) {
        throw new Error("Failed to refresh session");
      }
      const data = await res.json();
      if (!data.accessToken) {
        throw new Error("Unauthorized");
      }

      this.token = data.accessToken;
      this.status.next({
        state: "connected",
        updatedAt: new Date(),
      });
    } catch (err) {
      if (err instanceof Error) {
        this.status.next({
          state: "error",
          error: err.message,
          updatedAt: new Date(),
        });
      } else {
        console.error("UNKNOWN ERROR", err);
      }
    }
  }

  async sendPrompt(prompt: string) {
    try {
      await this.authenticate();
      const res = await fetch(
        "https://chat.openai.com/backend-api/conversation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({
            action: "next",
            parent_message_id: uuidv4(),
            model: "gpt-3.5-turbo",
            messages: [
              {
                id: uuidv4(),
                author: {
                  role: "user",
                },
                content: {
                  content_type: "text",
                  parts: [prompt],
                },
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      if (!res.body) {
        throw new Error("No response body");
      }

      return res.body;
    } catch (err) {
      if (err instanceof Error) {
        this.status.next({
          state: "error",
          error: err.message,
          updatedAt: new Date(),
        });
      } else {
        console.error("UNKNOWN ERROR", err);
      }
    }
  }
}

const chatGPT = new ChatGPT();

browser.runtime.onConnect.addListener((port) => {
  const subscription = chatGPT.status.subscribe(async (status) => {
    port.postMessage({
      type: "status",
      status: status.state,
      error: status.state === "error" ? status.error : undefined,
    });
    // chatGPT.mountKeepAlive(status.state);
  });

  port.onMessage.addListener(async (message: ContentMessage) => {
    if (message.type === "status") {
      await chatGPT.authenticate();
    }
    if (message.type === "query") {
      chatGPT.status.next({ state: "loading", updatedAt: new Date() });
      const stream = await chatGPT.sendPrompt(
        `Summarize the video transcript into bulletpoints, choose an appropriate emoji and keyword for each point, like the template:

      - Emoji ***Keyword*** Bulletpoint
      
      ` + message.prompt
      );
      if (!stream) return;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          chatGPT.status.next({ state: "connected", updatedAt: new Date() });
          break;
        }
        const str =
          new TextDecoder()
            .decode(value)
            .split(`"parts": [\"`)
            .at(1)
            ?.split(`"]}`)
            .at(0) ?? "";
        if (!str) continue;
        console.log(str);
        port.postMessage({ type: "query", response: str });
      }
    }
  });

  port.onDisconnect.addListener((port) => {
    subscription.unsubscribe();
  });
});
