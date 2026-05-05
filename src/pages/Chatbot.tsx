import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
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
  deleteCollection,
  listCollections,
  query,
  upsert,
} from "@wiscale/tauri-plugin-velesdb";
import { useLLM } from "../providers/useLLM";
import Markdown from "react-markdown";
import { IconExternalLink, IconPlane, IconTrash } from "@tabler/icons-react";

const CHAT_HISTORY_COLLECTION = "chat_history";

type Interaction = {
  id: string | number;
  question: string;
  answer: string | null;
  sources?: ChatHistoryEntry["matches"];
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
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  const conversationViewportRef = useRef<HTMLDivElement>(null);

  const scrollConversationToBottom = useCallback(() => {
    const viewport = conversationViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

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
      setInteractions(
        parsedHistory.map((entry) => ({
          id: entry.id,
          question: entry.question,
          answer: entry.answer,
          sources: entry.matches || [],
        })),
      );
    } catch (e) {
      console.error("Error loading chat history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [ensureHistoryCollection]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollConversationToBottom();
  }, [interactions, loading, historyLoading, scrollConversationToBottom]);

  const clearHistory = async () => {
    try {
      await deleteCollection(CHAT_HISTORY_COLLECTION);
      setHistory([]);
      setInteractions([]);
      await ensureHistoryCollection();
    } catch (e) {
      console.error("Error clearing chat history", e);
    }
  };

  const onAsk = async () => {
    if (loading || historyLoading) return;

    const trimmed = question.trim();
    if (!trimmed) return;

    const temporaryId = Date.now();
    setInteractions((prev) => [
      ...prev,
      { id: temporaryId, question: trimmed, answer: null },
    ]);
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
      setInteractions((prev) =>
        prev.map((i) =>
          i.id === temporaryId
            ? {
                ...i,
                id: historyEntry.id,
                answer: result.answer,
                sources: result.matches,
              }
            : i,
        ),
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erreur lors de la génération";
      setInteractions((prev) =>
        prev.map((i) =>
          i.id === temporaryId ? { ...i, answer: `Erreur: ${message}` } : i,
        ),
      );
    }
  };

  return (
    <Container p="md" size="lg" fluid h="calc(100vh - 32px)">
      <Flex direction="column" gap="md" h="100%">
        <Flex justify="space-between" align="flex-end">
          <div>
            <Title order={3}>Chatbot</Title>
            <Text size="xs" c="dimmed">
              Historique: {history.length} échange(s)
            </Text>
          </div>
          {interactions.length > 0 && (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconTrash size={14} />}
              onClick={clearHistory}
            >
              Effacer
            </Button>
          )}
        </Flex>

        <Paper withBorder p="md" style={{ flex: 1, minHeight: 0 }}>
          <Stack gap="md" h="100%">
            <Text fw={600}>Conversation</Text>

            {historyLoading ? (
              <Text size="sm" c="dimmed">
                Chargement de l'historique...
              </Text>
            ) : (
              <ScrollArea
                style={{ flex: 1, minHeight: 0 }}
                viewportRef={conversationViewportRef}
              >
                <Stack gap="sm">
                  {interactions.length === 0 && (
                    <Text size="sm" c="dimmed">
                      Aucune question pour le moment.
                    </Text>
                  )}

                  {interactions.map((interaction) => (
                    <Flex key={interaction.id} justify="flex-start">
                      <Paper
                        withBorder
                        p="md"
                        w="fit-content"
                        maw="100%"
                        style={{
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {/* the collapsed "quote" question */}
                        <Text
                          size="sm"
                          c="dimmed"
                          lineClamp={1}
                          title={interaction.question}
                          mb={interaction.answer ? "sm" : 0}
                          style={{
                            borderLeft: "3px solid var(--mantine-color-blue-6)",
                            paddingLeft: "8px",
                            fontStyle: "italic",
                          }}
                        >
                          {interaction.question}
                        </Text>

                        {interaction.answer ? (
                          <>
                            <Markdown>{interaction.answer}</Markdown>

                            {/* rag sources */}
                            {interaction.sources &&
                              interaction.sources.length > 0 && (
                                <Stack gap="xs" mt="sm">
                                  <Text size="xs" fw={600} c="dimmed">
                                    Sources RAG
                                  </Text>
                                  {interaction.sources.map((source) => (
                                    <Paper key={source.id} p="xs" withBorder>
                                      <Flex
                                        justify="space-between"
                                        align="center"
                                        wrap="wrap"
                                        gap="xs"
                                      >
                                        <Group gap={8}>
                                          <Badge size="sm" variant="light">
                                            Confiance {source.score.toFixed(4)}
                                          </Badge>
                                          <Badge size="sm" variant="light">
                                            {source.timestamp
                                              ? `${source.timestamp[0].toFixed(0)}s - ${source.timestamp[1].toFixed(0)}s`
                                              : "Sans timestamp"}
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
                                          Ouvrir la source
                                          <IconExternalLink
                                            size={14}
                                            style={{ marginLeft: 4 }}
                                          />
                                        </UnstyledButton>
                                      </Flex>
                                    </Paper>
                                  ))}
                                </Stack>
                              )}
                          </>
                        ) : (
                          <Text size="sm" c="dimmed" mt="sm">
                            L'assistant réfléchit...
                          </Text>
                        )}
                      </Paper>
                    </Flex>
                  ))}
                </Stack>
              </ScrollArea>
            )}
          </Stack>
        </Paper>

        <Box
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            // width: "100%",
          }}
        >
          <Textarea
            placeholder="Posez une question sur les vidéos analysées..."
            value={question}
            autosize
            minRows={4}
            maxRows={10}
            onChange={(event) => setQuestion(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAsk();
              }
            }}
            flex={1}
            rightSectionWidth={72}
            rightSection={
              <ActionIcon
                color="blue"
                variant="filled"
                onClick={onAsk}
                disabled={loading || historyLoading}
                mr={32}
              >
                <IconPlane size={16} />
              </ActionIcon>
            }
          />

          {error && (
            <Text c="red.4" size="sm">
              {error}
            </Text>
          )}
        </Box>
      </Flex>
    </Container>
  );
};

export default Chatbot;
