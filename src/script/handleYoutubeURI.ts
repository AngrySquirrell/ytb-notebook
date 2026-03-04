export interface YoutubeURIResult {
  uri: string;
  id: string;
  error: boolean;
}

const YOUTUBE_ID_PATTERN = /^[0-9A-Za-z_-]{11}$/;

function isYoutubeVideoId(value: string): boolean {
  return YOUTUBE_ID_PATTERN.test(value);
}

function asUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(`https://${value}`);
    } catch {
      return null;
    }
  }
}

function extractYoutubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const cleanPath = url.pathname.replace(/^\/+/, "");

  if (host.includes("youtu.be")) {
    const id = cleanPath.split("/")[0] || "";
    return isYoutubeVideoId(id) ? id : null;
  }

  if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
    const watchId = url.searchParams.get("v") || "";
    if (isYoutubeVideoId(watchId)) {
      return watchId;
    }

    const pathParts = cleanPath.split("/");
    const markerIndex = pathParts.findIndex((part) =>
      ["embed", "shorts", "live", "v"].includes(part),
    );

    if (markerIndex >= 0) {
      const id = pathParts[markerIndex + 1] || "";
      return isYoutubeVideoId(id) ? id : null;
    }
  }

  return null;
}

export function handleYoutubeURI(value: string): YoutubeURIResult {
  const input = value.trim();

  if (!input) {
    return { uri: "", id: "", error: true };
  }

  if (isYoutubeVideoId(input)) {
    return {
      uri: `https://www.youtube.com/watch?v=${input}`,
      id: input,
      error: false,
    };
  }

  const url = asUrl(input);
  if (!url) {
    return { uri: "", id: "", error: true };
  }

  const id = extractYoutubeIdFromUrl(url);
  if (!id) {
    return { uri: "", id: "", error: true };
  }

  return {
    uri: `https://www.youtube.com/watch?v=${id}`,
    id,
    error: false,
  };
}

export default handleYoutubeURI;
