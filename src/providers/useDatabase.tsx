import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  createCollection,
  upsert,
  getPoints,
  query,
  listCollections,
} from "@wiscale/tauri-plugin-velesdb";
import { useAuth } from "./useAuth";
import { TokenResponse } from "@choochmeque/tauri-plugin-google-auth-api";
import { CaptionItems } from "../types/video";

// --- Types ---

export interface VideoMetadata {
  title: string;
  channel: string;
  views: number;
  likes: number;
  publishedDate: string;
}

export interface Video {
  youtubeUrl: string;
  transcription: string;
  captions: CaptionItems;
  iframeURL: string;
  metadata: VideoMetadata;
}

export interface Settings {
  authStore: Partial<TokenResponse>; // Store tokens
  mistralToken: string;
  mistralModel: string;
}

interface DatabaseContextType {
  saveVideo: (video: Video) => Promise<void>;
  getVideos: () => Promise<Video[]>;
  saveSettings: (settings: Settings) => Promise<void>;
  getSettings: () => Promise<Settings | null>;
  settings: Settings | null;
  loading: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined,
);

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash >>> 0; // Ensure positive
}

const SETTINGS_COLLECTION = "settings";
const VIDEOS_COLLECTION = "videos";
const EMBEDDINGS_COLLECTION = "embeddings";
const SETTINGS_ID = 1;

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { restoreSession, tokens } = useAuth();
  const [settings, setLocalSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const collections = await listCollections();
        const collectionNames = collections.map((c) => c.name);

        if (!collectionNames.includes(SETTINGS_COLLECTION)) {
          await createCollection({ name: SETTINGS_COLLECTION, dimension: 1 });
        }
        if (!collectionNames.includes(VIDEOS_COLLECTION)) {
          await createCollection({ name: VIDEOS_COLLECTION, dimension: 1 });
        }
        if (!collectionNames.includes(EMBEDDINGS_COLLECTION)) {
          await createCollection({
            name: EMBEDDINGS_COLLECTION,
            dimension: 1024,
          });
        }

        // Load settings
        const loadedSettings = await fetchSettings();
        if (loadedSettings) {
          setLocalSettings(loadedSettings);
          // Restore Auth
          if (
            loadedSettings.authStore &&
            Object.keys(loadedSettings.authStore).length > 0
          ) {
            restoreSession(loadedSettings.authStore as TokenResponse);
          }
        }
      } catch (err) {
        console.error("Failed to initialize database:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [restoreSession]);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    try {
      await upsert({
        collection: SETTINGS_COLLECTION,
        points: [
          {
            id: SETTINGS_ID,
            vector: [0],
            payload: newSettings as unknown as Record<string, unknown>,
          },
        ],
      });
      setLocalSettings(newSettings);
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, []);

  // Sync auth tokens to settings when they change
  useEffect(() => {
    console.log([
      tokens,
      tokens?.accessToken,
      tokens?.idToken,
      settings,
      saveSettings,
    ]);
    // if (settings) {
    const currentStore = (settings as Settings)?.authStore;
    const newStore = tokens || {};

    if (JSON.stringify(currentStore) !== JSON.stringify(newStore)) {
      const newSettings = { ...settings, authStore: newStore };
      saveSettings(newSettings as Settings);
    }
    // }
  }, [tokens, tokens?.accessToken, tokens?.idToken, settings, saveSettings]);

  const fetchSettings = async (): Promise<Settings | null> => {
    try {
      const points = await getPoints({
        collection: SETTINGS_COLLECTION,
        ids: [SETTINGS_ID],
      });
      if (points && points[0] && points[0].payload) {
        return points[0].payload as unknown as Settings;
      }
      return null;
    } catch (e) {
      console.error("Error fetching settings:", e);
      return null;
    }
  };

  const saveVideo = useCallback(async (video: Video) => {
    try {
      const id = hashCode(video.youtubeUrl);
      await upsert({
        collection: VIDEOS_COLLECTION,
        points: [
          {
            id,
            vector: [0],
            payload: video as unknown as Record<string, unknown>,
          },
        ],
      });
    } catch (e) {
      console.error("Error saving video:", e);
      throw e;
    }
  }, []);

  const getVideos = useCallback(async (): Promise<Video[]> => {
    try {
      const response = await query({
        query: `SELECT * FROM ${VIDEOS_COLLECTION}`,
      });

      return response.results.map((r) => r.payload as unknown as Video);
    } catch (e) {
      console.error("Error fetching videos:", e);
      return [];
    }
  }, []);

  //   const generateEmbedding = (video: Video): number[] => {
  //     // use invoke to generate embedding from video metadata and transcription
  //   };

  const fetchData = async () => {
    console.log({
      videos: await getVideos(),
      settings: await fetchSettings(),
    });
  };
  fetchData();

  return (
    <DatabaseContext.Provider
      value={{
        saveVideo,
        getVideos,
        saveSettings,
        getSettings: fetchSettings,
        settings,
        loading,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}
