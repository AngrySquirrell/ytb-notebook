import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  createCollection,
  listCollections,
  query,
  upsert,
} from "@wiscale/tauri-plugin-velesdb";
import { useDatabase, Video } from "./useDatabase";
import { IconExternalLink } from "@tabler/icons-react";
import { NavLink } from "react-router";
import { Box, Group, UnstyledButton } from "@mantine/core";

const EMBEDDINGS_COLLECTION = "embeddings";
const EMBEDDINGS_DIMENSION = 768;
const DEFAULT_EMBEDDING_MODEL = "google/gemini-embedding-2-preview";

interface GoogleEmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

interface CaptionItem {
  text: string;
  start: number;
  duration: number;
}

export interface RagChunk {
  id: number;
  text: string;
  score: number;
  video_url: string;
  timestamp?: [number, number]; // in seconds, optional. [start, end]
  chunk_index: number;
}

export interface ChatWithRagResult {
  answer: string;
  context: string;
  matches: RagChunk[];
}

interface UseLLMContextType {
  loading: boolean;
  error: string | ReactNode | null;
  generateEmbeddingsForVideo: (
    video: Video,
    options?: { model?: string; chunkSize?: number },
  ) => Promise<number>;
  retrieveContext: (
    question: string,
    options?: { topK?: number; model?: string },
  ) => Promise<RagChunk[]>;
  chatWithRag: (
    question: string,
    options?: { topK?: number; model?: string; embeddingModel?: string },
  ) => Promise<ChatWithRagResult>;
}

type QueryRow = {
  id?: number;
  vector?: number[];
  payload?: Record<string, unknown>;
};

const LLMContext = createContext<UseLLMContextType | undefined>(undefined);

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash >>> 0;
}

function chunkText(text: string, chunkSize: number): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > chunkSize && current) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) {
    chunks.push(current.trim());
  }

  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) {
    return -1;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return -1;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function googleEmbeddings(
  token: string,
  model: string,
  input: string[],
): Promise<GoogleEmbeddingResponse> {
  const embeddings = await invoke<number[][]>("generate_embedding", {
    apiToken: token,
    model,
    chunks: input,
  });

  return {
    data: (embeddings || []).map((embedding) => ({ embedding })),
  };
}

interface LLMProviderProps {
  children: ReactNode;
}

export function LLMProvider({ children }: LLMProviderProps) {
  const { settings } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | ReactNode | null>(null);

  const ensureEmbeddingsCollection = useCallback(async () => {
    const collections = await listCollections();
    const hasEmbeddings = collections.some(
      (collection) => collection.name === EMBEDDINGS_COLLECTION,
    );

    if (!hasEmbeddings) {
      await createCollection({
        name: EMBEDDINGS_COLLECTION,
        dimension: EMBEDDINGS_DIMENSION,
      });
    }
  }, []);

  const generateEmbeddingsForVideo = useCallback<
    UseLLMContextType["generateEmbeddingsForVideo"]
  >(
    async (video, options) => {
      const token = settings?.googleEmbedToken?.trim();
      if (!token) {
        setError(
          <UnstyledButton component={NavLink} to="/settings">
            <Group gap={4}>
              Missing Google AI token in settings. Change it here{" "}
              <Box mt={4} ml={1}>
                <IconExternalLink size={14} />
              </Box>
            </Group>
          </UnstyledButton>,
        );
        throw new Error("Google AI token missing in settings.");
      }

      const embeddingModel = DEFAULT_EMBEDDING_MODEL;
      const chunkSize = options?.chunkSize || 600;
      const source =
        video.transcription || video.captions.map((c) => c.text).join(" ");
      let chunks = chunkText(source, chunkSize);

      const mistralToken = settings?.mistralToken?.trim();
      if (mistralToken && video.captions?.length) {
        try {
          const refinedChunks = await invoke<string[]>(
            "generate_context_chunks",
            {
              apiToken: mistralToken,
              captions: video.captions as CaptionItem[],
            },
          );
          if (refinedChunks?.length) {
            chunks = refinedChunks;
          }
        } catch (e) {
          console.warn("Fallback to local chunking for embeddings:", e);
        }
      }

      if (chunks.length === 0) {
        return 0;
      }

      setLoading(true);
      setError(null);

      try {
        await ensureEmbeddingsCollection();
        const embeddingsResponse = await googleEmbeddings(
          token,
          embeddingModel,
          chunks,
        );
        const embeddings = (embeddingsResponse.data || []).map(
          (item) => item.embedding,
        );

        const points = embeddings.map((vector, index) => ({
          id: hashCode(`${video.youtubeUrl}:${embeddingModel}:${index}`),
          vector,
          payload: {
            video_url: video.youtubeUrl,
            iframe_url: video.iframeURL,
            title: video.metadata?.title,
            channel: video.metadata?.channel,
            chunk: chunks[index],
            chunk_index: index,
            model: embeddingModel,
            embedding: vector,
            timestamp: video.captions?.[index]
              ? [
                  video.captions[index].start,
                  video.captions[index].start + video.captions[index].duration,
                ]
              : undefined,
          } as Record<string, unknown>,
        }));

        await upsert({
          collection: EMBEDDINGS_COLLECTION,
          points,
        });

        return points.length;
      } finally {
        setLoading(false);
      }
    },
    [ensureEmbeddingsCollection, settings?.googleEmbedToken],
  );

  const retrieveContext = useCallback<UseLLMContextType["retrieveContext"]>(
    async (question, options) => {
      const token = settings?.googleEmbedToken?.trim();
      if (!token) {
        setError(
          <UnstyledButton component={NavLink} to="/settings">
            <Group gap={4}>
              Missing Google AI token in settings. Change it here{" "}
              <Box mt={4} ml={1}>
                <IconExternalLink size={14} />
              </Box>
            </Group>
          </UnstyledButton>,
        );
        throw new Error("Google AI token missing in settings.");
      }

      const topK = options?.topK || 5;
      const embeddingModel = DEFAULT_EMBEDDING_MODEL;

      setLoading(true);
      setError(null);

      try {
        await ensureEmbeddingsCollection();
        const embeddingsResponse = await googleEmbeddings(
          token,
          embeddingModel,
          [question],
        );
        const [questionVector] = (embeddingsResponse.data || []).map(
          (item) => item.embedding,
        );

        if (!questionVector) {
          return [];
        }

        const response = await query({
          query: `SELECT * FROM ${EMBEDDINGS_COLLECTION}`,
        });

        const rows = (response.results || []) as QueryRow[];

        const scored = rows
          .map((row, index) => {
            const payload = row.payload || {};
            const payloadVector = payload.embedding as number[] | undefined;
            const vector = row.vector || payloadVector || [];
            const chunkText = String(payload.chunk || "");
            const videoUrl = String(payload.video_url || "");
            const chunkIndex = Number(payload.chunk_index || 0);
            const timestamp = payload.timestamp as [number, number] | undefined;
            const id = typeof row.id === "number" ? row.id : index;

            return {
              id,
              text: chunkText,
              score: cosineSimilarity(questionVector, vector),
              video_url: videoUrl,
              chunk_index: chunkIndex,
              timestamp,
            } as RagChunk;
          })
          .filter((item) => item.text && item.score > -1)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        return scored;
      } finally {
        setLoading(false);
      }
    },
    [ensureEmbeddingsCollection, settings?.googleEmbedToken],
  );

  const chatWithRag = useCallback<UseLLMContextType["chatWithRag"]>(
    async (question, options) => {
      const mistralToken = settings?.mistralToken?.trim();
      if (!mistralToken) {
        throw new Error("Token Mistral manquant dans les settings.");
      }

      const model =
        options?.model || settings?.mistralModel || "mistral-small-latest";
      const matches = await retrieveContext(question, {
        topK: options?.topK,
        model: options?.embeddingModel,
      });

      const context = matches
        .map(
          (match, index) =>
            `[Source ${index + 1}] (video: ${match.video_url}, score: ${match.score.toFixed(4)})\n${match.text}`,
        )
        .join("\n\n");

      setLoading(true);
      setError(null);

      try {
        const answer = await invoke<string>("generate_chatbot_answer", {
          apiToken: mistralToken,
          model,
          question,
          context,
        });

        return {
          answer,
          context,
          matches,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [retrieveContext, settings?.mistralModel, settings?.mistralToken],
  );

  const value = useMemo(
    () => ({
      loading,
      error,
      generateEmbeddingsForVideo,
      retrieveContext,
      chatWithRag,
    }),
    [chatWithRag, error, generateEmbeddingsForVideo, loading, retrieveContext],
  );

  return <LLMContext.Provider value={value}>{children}</LLMContext.Provider>;
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (!context) {
    throw new Error("useLLM must be used within a LLMProvider");
  }
  return context;
}
