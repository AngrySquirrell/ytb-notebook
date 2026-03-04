import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Container,
  Flex,
  Loader,
  Paper,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import { query } from "@wiscale/tauri-plugin-velesdb";

type EmbeddingPayload = {
  video_url?: string;
  iframe_url?: string;
  title?: string;
  channel?: string;
  chunk?: string;
  chunk_index?: number;
  model?: string;
  embedding?: number[];
  timestamp?: [number, number]; // start and end time in seconds
};

type EmbeddingRow = {
  id: number;
  payload: EmbeddingPayload;
  vectorDimension: number;
};

type QueryResultRow = {
  id?: number;
  vector?: number[];
  payload?: Record<string, unknown>;
};

const VectorialDatabase = () => {
  const [rows, setRows] = useState<EmbeddingRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmbeddings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await query({
        query: "SELECT * FROM embeddings LIMIT 500",
      });
      console.log("Raw query response:", response);
      const mappedRows = (response.results || []).map((result, index) => {
        const row = result as QueryResultRow;
        const payload = (row.payload || {}) as EmbeddingPayload;
        const vectorDimension =
          row.vector?.length || payload.embedding?.length || 0;

        return {
          id: typeof row.id === "number" ? row.id : index,
          payload,
          vectorDimension,
        };
      });

      setRows(mappedRows);
    } catch (e) {
      console.error("Error loading embeddings:", e);
      setError("Impossible de charger la table embeddings.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmbeddings();
  }, [fetchEmbeddings]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const payload = row.payload;
      const haystack = [
        String(row.id),
        payload.title || "",
        payload.channel || "",
        payload.video_url || "",
        payload.model || "",
        payload.chunk || "",
        String(payload.chunk_index ?? ""),
        String(row.vectorDimension),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [rows, search]);

  return (
    <Container p="md" fluid>
      <Flex justify="space-between" align="center" mb="md">
        <div>
          <Title order={3}>Vectorial database</Title>
          <Text c="dimmed" size="sm">
            Vue table de la collection embeddings (VelesDB)
          </Text>
        </div>
        <Tooltip label="Rafraîchir">
          <ActionIcon variant="light" size="lg" onClick={fetchEmbeddings}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Flex>

      <TextInput
        mb="md"
        placeholder="Rechercher par titre, chaîne, chunk, URL, model..."
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
      />

      {loading ? (
        <Flex justify="center" py="xl">
          <Loader />
        </Flex>
      ) : error ? (
        <Paper p="md" withBorder>
          <Text c="red.4">{error}</Text>
        </Paper>
      ) : filteredRows.length === 0 ? (
        <Paper p="md" withBorder>
          <Text>Aucun embedding trouvé.</Text>
        </Paper>
      ) : (
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>Channel</Table.Th>
                {/* <Table.Th>Chunk index</Table.Th> */}
                <Table.Th>Chunk preview</Table.Th>
                {/* <Table.Th>Model</Table.Th> */}
                {/* <Table.Th>Vector dim</Table.Th> */}
                <Table.Th>Video</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredRows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Badge variant="light">{row.id}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500} maw={240} lineClamp={2}>
                      {row.payload.title || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {row.payload.timestamp
                        ? `${row.payload.timestamp[0].toFixed(0)}s - ${row.payload.timestamp[1].toFixed(0)}s`
                        : "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{row.payload.channel || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" maw={460} lineClamp={3}>
                      {row.payload.chunk || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {row.payload.video_url ? (
                      <Anchor href={row.payload.video_url} target="_blank">
                        Open
                      </Anchor>
                    ) : (
                      <Text size="sm">-</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Container>
  );
};

export default VectorialDatabase;
