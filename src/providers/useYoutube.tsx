import { invoke } from "@tauri-apps/api/core";
import { createContext, ReactNode, useContext } from "react";

interface YoutubeProviderProps {
  children: ReactNode;
}

interface CaptionItem {
  text: string;
  start: number;
  duration: number;
}
interface YoutubeContextType {
  getTranscripts: (videoId: string) => Promise<CaptionItem[]>;
}

const YoutubeContext = createContext<YoutubeContextType | undefined>(undefined);

export function YoutubeProvider({ children }: YoutubeProviderProps) {
  const getTranscripts = async (videoId: string): Promise<CaptionItem[]> => {
    try {
      const captions = await invoke<CaptionItem[]>("get_youtube_captions", {
        videoId,
      });
      console.log("Sous-titres récupérés :", captions);
      return captions;
    } catch (error) {
      console.error("Erreur lors de la récupération :", error);
    }
    return [];
  };

  return (
    <YoutubeContext.Provider value={{ getTranscripts }}>
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
