import { invoke } from "@tauri-apps/api/core";
import { createContext, ReactNode, useContext } from "react";
import {
  CaptionItems,
  YoutubeAvailableCaptions,
  YoutubeCaptions,
  YoutubeVideoMetadata,
} from "../types/video";

interface YoutubeProviderProps {
  children: ReactNode;
}

interface YoutubeContextType {
  getTranscripts: (
    video_id: string,
    language: string,
  ) => Promise<YoutubeCaptions>;
  getVideoData: (url: string) => Promise<YoutubeVideoMetadata | null>;
  getAvailableCaptionsList: (
    video_id: string,
  ) => Promise<YoutubeAvailableCaptions | null>;
}

const YoutubeContext = createContext<YoutubeContextType | undefined>(undefined);

export function YoutubeProvider({ children }: YoutubeProviderProps) {
  const getTranscripts = async (
    video_id: string,
    language: string,
  ): Promise<YoutubeCaptions> => {
    try {
      const response = await invoke<string>("get_youtube_captions", {
        videoId: video_id,
        languages: [language], // You can modify this to fetch captions in different languages
      });

      return JSON.parse(response);
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
      return undefined as unknown as YoutubeCaptions;
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
  const getAvailableCaptionsList = async (
    video_id: string,
  ): Promise<YoutubeAvailableCaptions | null> => {
    try {
      const response = await invoke<string>(
        "get_available_youtube_captions_list",
        {
          videoId: video_id,
        },
      );
      console.log("Available captions list retrieved:", response);
      return JSON.parse(response);
    } catch (error) {
      console.error("Error fetching available captions list:", error);
      return null;
    }
  };

  return (
    <YoutubeContext.Provider
      value={{ getTranscripts, getVideoData, getAvailableCaptionsList }}
    >
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
