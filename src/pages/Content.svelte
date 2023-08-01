<script lang="ts">
  import "uno.css";
  import browser from "webextension-polyfill";
  import SvelteMarkdown from "svelte-markdown";
  import { getCaption } from "../utils/getCaption";
  import { getAvailableCaptionTracks } from "../utils/getAvailableTracks";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";

  let port: browser.Runtime.Port | undefined;
  let status: Status = {
    state: "error",
    error: "Not connected",
    updatedAt: new Date(),
  };
  let captionTracks: CaptionTrack[] = [];
  let selectedCaptionTrack: CaptionTrack | undefined;
  let previousUrl = "";
  let caption = "";
  let summary = "";

  $: if (selectedCaptionTrack) {
    getCaption(selectedCaptionTrack.baseUrl).then((capt) => {
      caption = capt;
    });
  }

  onMount(() => {
    new MutationObserver(async () => {
      if (location.href !== previousUrl) {
        previousUrl = location.href;
        selectedCaptionTrack = undefined;
        captionTracks = await getAvailableCaptionTracks(location.href);
      }
    }).observe(document.body, { childList: true, subtree: true });

    port = browser.runtime.connect(undefined);
    port.onMessage.addListener((message: BackgroundMessage) => {
      if (message.type === "status") {
        status = {
          state: message.status,
          error: message.status === "error" ? message.error : "",
          updatedAt: new Date(),
        };
      }
      if (message.type === "query") {
        if (message.response.length > summary.length) {
          summary = message.response;
        }
      }
    });
    port.postMessage({ type: "status" });
  });

  async function handleGenerate() {
    if (!port) return;
    port.postMessage({ type: "query", prompt: caption });
  }
</script>

<div id="silverware-content" class="w-full bg-white rounded-xl mb-5">
  <div class="flex justify-between py-4 px-5">
    <div class="flex items-center gap-2">
      <div
        class="i-game-icons-knife-fork h-8 w-8 text-slate-400 animate-pulse"
      />
      <span class="font-mono text-2xl font-extrabold">SILVERWARE</span>
    </div>

    <div class="flex gap-2 items-center">
      {#if status.state === "error"}
        <span class="text-xl text-red-400">
          {status.error}
        </span>
      {/if}
      <div
        class="h-4 w-4 rounded-full {status.state === 'connected'
          ? 'bg-green-400'
          : status.state === 'loading'
          ? 'bg-yellow-400 animate-pulse'
          : 'bg-red-400'}"
      />
    </div>
  </div>

  {#if status.state !== "error"}
    <hr class="h-1px w-full bg-slate-300" />

    <div class="flex flex-col w-full">
      <div class="m-4">
        {#if captionTracks.length === 0}
          <span class="text-center text-2xl">No caption tracks available</span>
        {:else}
          <select
            class="p-3 w-full"
            bind:value={selectedCaptionTrack}
            disabled={status.state === "loading"}
          >
            <option value={undefined}>Select a subtitle or CC</option>
            {#each captionTracks as track (track.baseUrl)}
              <option value={track}>{track.name.simpleText}</option>
            {/each}
          </select>
        {/if}
      </div>

      {#if selectedCaptionTrack}
        <span class="text-center py-1">
          Caption length: {caption.length ?? "Loading..."} | Estimated tokens:
          {caption.length ?? "Loading..."}
        </span>

        <button
          class="border-0 cursor-pointer flex items-center gap-3 bg-transparent px-4 hover:opacity-80 text-green-700"
          on:click={handleGenerate}
          disabled={status.state === "loading"}
        >
          <div class="i-ic-sharp-summarize h-8 w-8" />
          <span class="text-2xl">Summarize</span>
        </button>

        {#if summary.length > 0}
          <div class="h-120 overflow-y-scroll px-4 text-xl" transition:slide>
            <SvelteMarkdown source={summary} />
          </div>
        {/if}

        {#if caption}
          <details>
            <summary
              class="block cursor-pointer flex items-center gap-3 hover:opacity-80 text-indigo-700 p-4"
            >
              <div class="i-ic-sharp-description h-8 w-8" />
              <span class="text-2xl">Transcript</span>
            </summary>
            <div class="h-50 overflow-y-scroll mt-3">
              <code>{caption}</code>
            </div>
          </details>
        {/if}
      {/if}
    </div>
  {/if}
</div>
