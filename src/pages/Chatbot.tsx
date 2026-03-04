import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Flex,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  createCollection,
  listCollections,
  query,
  upsert,
} from "@wiscale/tauri-plugin-velesdb";
import { useLLM } from "../providers/useLLM";
import Markdown from "react-markdown";
import { IconExternalLink } from "@tabler/icons-react";

const CHAT_HISTORY_COLLECTION = "chat_history";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatHistoryEntry = {
  id: number;
  question: string;
  answer: string;
  created_at: string;
  matches: {
    id: number;
    text: string;
    score: number;
    video_url: string;
    timestamp?: [number, number];
  }[];
};

type QueryRow = {
  id?: number;
  payload?: Record<string, unknown>;
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash >>> 0;
}

const Chatbot = () => {
  const { chatWithRag, loading, error } = useLLM();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const [lastSources, setLastSources] = useState<
    {
      id: number;
      text: string;
      score: number;
      video_url: string;
      timestamp?: [number, number];
    }[]
  >([]);

  const ensureHistoryCollection = useCallback(async () => {
    const collections = await listCollections();
    const exists = collections.some(
      (collection) => collection.name === CHAT_HISTORY_COLLECTION,
    );

    if (!exists) {
      await createCollection({
        name: CHAT_HISTORY_COLLECTION,
        dimension: 1,
      });
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      await ensureHistoryCollection();
      const response = await query({
        query: `SELECT * FROM ${CHAT_HISTORY_COLLECTION}`,
      });

      const rows = (response.results || []) as QueryRow[];
      const parsedHistory = rows
        .map((row, index) => {
          const payload = row.payload || {};
          return {
            id: typeof row.id === "number" ? row.id : index,
            question: String(payload.question || ""),
            answer: String(payload.answer || ""),
            created_at: String(payload.created_at || ""),
            matches: (payload.matches || []) as ChatHistoryEntry["matches"],
          };
        })
        .filter((entry) => entry.question && entry.answer)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

      setHistory(parsedHistory);
      setMessages(
        parsedHistory.flatMap((entry) => [
          { role: "user" as const, content: entry.question },
          { role: "assistant" as const, content: entry.answer },
        ]),
      );

      if (parsedHistory.length > 0) {
        setLastSources(parsedHistory[parsedHistory.length - 1].matches || []);
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [ensureHistoryCollection]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");

    try {
      const result = await chatWithRag(trimmed, { topK: 5 });
      const historyEntry: ChatHistoryEntry = {
        id: hashCode(`${trimmed}:${Date.now()}`),
        question: trimmed,
        answer: result.answer,
        created_at: new Date().toISOString(),
        matches: result.matches,
      };

      await ensureHistoryCollection();
      await upsert({
        collection: CHAT_HISTORY_COLLECTION,
        points: [
          {
            id: historyEntry.id,
            vector: [0],
            payload: historyEntry as unknown as Record<string, unknown>,
          },
        ],
      });

      setHistory((prev) => [...prev, historyEntry]);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.answer },
      ]);
      setLastSources(result.matches);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erreur lors de la génération";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erreur: ${message}` },
      ]);
      setLastSources([]);
    }
  };

  return (
    <Container p="md" fluid>
      <Stack gap="md">
        <div>
          <Title order={3}>Chatbot</Title>
          <Text size="sm" c="dimmed">
            Discussion avec Mistral + RAG local (embeddings VelesDB)
          </Text>
          <Text size="xs" c="dimmed">
            Historique: {history.length} échange(s)
          </Text>
        </div>

        <Paper withBorder p="md">
          <Textarea
            label="Votre question"
            placeholder="Posez une question sur les vidéos analysées..."
            minRows={3}
            value={question}
            onChange={(event) => setQuestion(event.currentTarget.value)}
          />
          <Flex justify="flex-end" mt="md">
            <Button onClick={onAsk} loading={loading || historyLoading}>
              Envoyer
            </Button>
          </Flex>
          {error && (
            <Text mt="sm" c="red.4" size="sm">
              {error}
            </Text>
          )}
        </Paper>

        <Paper withBorder p="md">
          <Text fw={600} mb="sm">
            Conversation
          </Text>
          {historyLoading ? (
            <Text size="sm" c="dimmed">
              Chargement de l'historique...
            </Text>
          ) : messages.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aucune question pour le moment.
            </Text>
          ) : (
            <ScrollArea h={320}>
              <Stack gap="sm">
                {messages.map((message, index) => (
                  <Paper key={index} p="md" withBorder>
                    <Text size="xs" c="dimmed" mb={4}>
                      {message.role === "user" ? "Vous" : "Assistant"}
                    </Text>
                    {/* <Text size="sm" style={{ whiteSpace: "pre-wrap" }}> */}
                    <Markdown>{message.content}</Markdown>
                    {/* </Text> */}
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Paper>

        <Paper withBorder p="md">
          <Text fw={600} mb="sm">
            Sources RAG
          </Text>
          {lastSources.length === 0 ? (
            <Text size="sm" c="dimmed">
              Les sources apparaissent après une question.
            </Text>
          ) : (
            <Stack gap="sm">
              {lastSources.map((source) => (
                <Paper key={source.id} p="sm" withBorder>
                  <Flex justify="space-between" align="center" mb={6}>
                    <Group gap={16}>
                      <Badge variant="light">
                        Score {source.score.toFixed(4)}
                      </Badge>
                      <Badge variant="light">
                        Timestamp{" "}
                        {source.timestamp
                          ? `${source.timestamp[0].toFixed(0)}s - ${source.timestamp[1].toFixed(0)}s`
                          : "-"}
                      </Badge>
                    </Group>
                    <UnstyledButton
                      size="xs"
                      c="dimmed"
                      component="a"
                      href={
                        source.video_url +
                        "&t=" +
                        (source.timestamp
                          ? source.timestamp[0].toFixed(0)
                          : "0") +
                        "s"
                      }
                      target="_blank"
                    >
                      {source.video_url +
                        "&t=" +
                        (source.timestamp
                          ? source.timestamp[0].toFixed(0)
                          : "0") +
                        "s"}{" "}
                      <IconExternalLink size={14} style={{ marginLeft: 4 }} />
                    </UnstyledButton>
                  </Flex>
                  <Text size="sm" lineClamp={4}>
                    {source.text}
                  </Text>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
};

export default Chatbot;
