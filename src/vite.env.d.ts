/// <reference types="svelte" />
/// <reference types="vite/client" />

type ContentMessage =
  | {
      type: "status";
    }
  | {
      type: "query";
      prompt: string;
    };

type BackgroundMessage =
  | {
      type: "status";
      status: "loading" | "connected";
    }
  | {
      type: "status";
      status: "error";
      error: string;
    }
  | {
      type: "query";
      response: string;
    };

type StatusMessage = Extract<BackgroundMessage, { type: "status" }>;

type Status =
  | {
      state: "loading" | "connected";
      updatedAt: Date;
    }
  | {
      state: "error";
      error: string;
      updatedAt: Date;
    };

type Message = ContentMessage | BackgroundMessage;

type CaptionTrack = {
  baseUrl: string;
  name: {
    simpleText: string;
  };
  vssId: string;
  languageCode: string;
  kind: string;
  isTranslatable: boolean;
};
