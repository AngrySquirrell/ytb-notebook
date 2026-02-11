import { invoke } from "@tauri-apps/api/core";
import { createContext, ReactNode, useContext } from "react";
import { CaptionItems, YoutubeVideoMetadata } from "../types/video";

interface YoutubeProviderProps {
  children: ReactNode;
}

interface YoutubeContextType {
  getTranscripts: (videoId: string) => Promise<CaptionItems>;
  getVideoData: (url: string) => Promise<YoutubeVideoMetadata | null>;
}

const YoutubeContext = createContext<YoutubeContextType | undefined>(undefined);

export function YoutubeProvider({ children }: YoutubeProviderProps) {
  const getTranscripts = async (videoId: string): Promise<CaptionItems> => {
    try {
      const response = await invoke<any>("get_youtube_captions", {
        videoId,
      });

      if (response && response.events) {
        return response.events.map((event: any) => ({
          text: event.segs
            ? event.segs.map((seg: any) => seg.utf8).join("")
            : "",
          start: event.tStartMs,
          duration: event.dDurationMs,
        }));
      }

      return [];
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
      return [];
    }
  };
  const getVideoData = async (
    url: string,
  ): Promise<YoutubeVideoMetadata | null> => {
    try {
      const response = await invoke<YoutubeVideoMetadata>(
        "get_youtube_videodata",
        {
          url,
        },
      );
      console.log("Video data retrieved:", response);
      return response;
    } catch (error) {
      console.error("Error fetching video data:", error);
      return null;
    }
  };

  return (
    <YoutubeContext.Provider value={{ getTranscripts, getVideoData }}>
      {children}
    </YoutubeContext.Provider>
  );
}

export function useYoutube() {
  const context = useContext(YoutubeContext);
  if (!context) {
    throw new Error("useYoutube must be used within a YoutubeProvider");
  }
  return context;
}
