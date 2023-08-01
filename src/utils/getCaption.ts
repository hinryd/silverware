export async function getCaption(trackUrl: string) {
  if (trackUrl === "") return "";
  const text = await fetch(trackUrl).then((res) => res.text());
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const textNodes = doc.getElementsByTagName("text");
  return Array.from(textNodes)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("- ", "")
    .replaceAll("\n", " ")
    .replaceAll(",000", "000");
}
