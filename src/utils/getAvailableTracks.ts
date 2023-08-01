export async function getAvailableCaptionTracks(
  url: string
): Promise<CaptionTrack[]> {
  const text = await fetch(url).then((res) => res.text());
  if (!text) {
    throw new Error("No text found");
  }
  const splittedText = text.split('"captions":');
  if (splittedText.length < 2) {
    throw new Error("No captions found");
  }
  const captions = JSON.parse(
    splittedText[1].split(',"videoDetails')[0].replace("\n", "")
  );
  return captions.playerCaptionsTracklistRenderer.captionTracks;
}
