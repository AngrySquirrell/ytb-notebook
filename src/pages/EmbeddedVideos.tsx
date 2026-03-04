import { useCallback, useEffect, useState } from "react";
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
  Title,
  Tooltip,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useDatabase, Video } from "../providers/useDatabase";

const EmbeddedVideos = () => {
  const { getVideos } = useDatabase();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (e) {
      console.error("Error loading embedded videos:", e);
      setError("Impossible de charger les vidéos enregistrées.");
    } finally {
      setLoading(false);
    }
  }, [getVideos]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  return (
    <Container p="md" fluid>
      <Flex justify="space-between" align="center" mb="md">
        <div>
          <Title order={3}>Embedded videos</Title>
          <Text c="dimmed" size="sm">
            Vue table des vidéos stockées dans VelesDB
          </Text>
        </div>
        <Tooltip label="Rafraîchir">
          <ActionIcon variant="light" size="lg" onClick={fetchVideos}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Flex>

      {loading ? (
        <Flex justify="center" py="xl">
          <Loader />
        </Flex>
      ) : error ? (
        <Paper p="md" withBorder>
          <Text c="red.4">{error}</Text>
        </Paper>
      ) : videos.length === 0 ? (
        <Paper p="md" withBorder>
          <Text>Aucune vidéo enregistrée pour le moment.</Text>
        </Paper>
      ) : (
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Video</Table.Th>
                <Table.Th>Title</Table.Th>
                <Table.Th>Channel</Table.Th>
                <Table.Th>Views</Table.Th>
                {/* <Table.Th>Likes</Table.Th> */}
                <Table.Th>Date</Table.Th>
                <Table.Th>Caption</Table.Th>
                <Table.Th>Transcript</Table.Th>
                <Table.Th>Link</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {videos.map((video) => (
                <Table.Tr key={video.youtubeUrl}>
                  <Table.Td>
                    <iframe
                      width="220"
                      height="124"
                      src={video.iframeURL}
                      title={video.metadata?.title || "YouTube video"}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      style={{ border: 0, borderRadius: 8 }}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500} maw={320} lineClamp={3}>
                      {video.metadata?.title || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{video.metadata?.channel || "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light">{video.metadata?.views ?? 0}</Badge>
                  </Table.Td>
                  {/* <Table.Td>
                    <Badge variant="light">{video.metadata?.likes ?? 0}</Badge>
                  </Table.Td> */}
                  <Table.Td>
                    <Text size="sm">
                      {video.metadata?.publishedDate || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{video.captions?.length ?? 0} items</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {video.transcription?.length ?? 0} chars
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Anchor href={video.youtubeUrl} target="_blank">
                      Open
                    </Anchor>
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

export default EmbeddedVideos;
