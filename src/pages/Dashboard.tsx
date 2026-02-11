import React, { useEffect, useState } from "react";
import {
  TextInput,
  Stack,
  Loader,
  Flex,
  Container,
  Button,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useYoutube } from "../providers/useYoutube";
import { YoutubeVideoMetadata } from "../types/video";
import YoutubeCard from "../components/YoutubeCard";
import { useDatabase } from "../providers/useDatabase";

const regexURL = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
const regexVideoId = /([0-9A-Za-z_-]{11})(?:\?|&|$)/;

const Dashboard = () => {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=xEN85i57UmM");
  const [debouncedUrl] = useDebouncedValue(url, 500);
  const { getVideoData, getTranscripts } = useYoutube();
  const { saveVideo } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<YoutubeVideoMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValidYoutubeUrl = (url: string) => {
    return regexURL.test(url) || regexVideoId.test(url);
  };

  useEffect(() => {
    const fetchVideo = async () => {
      if (!debouncedUrl) {
        setVideoData(null);
        setError(null);
        return;
      }

      if (!isValidYoutubeUrl(debouncedUrl)) {
        setError("Lien YouTube invalide");
        setVideoData(null);
        return;
      }

      setLoading(true);
      setError(null);
      const uri = regexURL.test(debouncedUrl)
        ? debouncedUrl
        : `https://www.youtube.com/watch?v=${debouncedUrl}`;
      const data = await getVideoData(uri);
      setLoading(false);

      if (data) {
        setVideoData(data);
      } else {
        setError("Impossible de récupérer les informations de la vidéo");
        setVideoData(null);
      }
    };

    fetchVideo();
  }, [debouncedUrl]);

  return (
    <Container p="md">
      <Flex direction={"column"} gap={16}>
        <TextInput
          label="Lien YouTube"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
          error={error}
        />

        {loading && <YoutubeCard skeleton />}

        {videoData && !loading && (
          <Flex w={"100%"} direction={"column"}>
            <YoutubeCard videoData={videoData} skeleton={false} />
            <Button
              mt="md"
              variant="outline"
              color="blue"
              onClick={async () => {
                let caption = await getTranscripts(debouncedUrl);
                await saveVideo({
                  youtubeUrl: debouncedUrl,
                  metadata: {
                    title: videoData.title,
                    channel: videoData.channelName,
                    views: parseInt(videoData.viewCount),
                    likes: videoData.likesAmount
                      ? parseInt(videoData.likesAmount)
                      : 0,
                    publishedDate: videoData.publishDate,
                  },
                  captions: caption,
                  iframeURL: `https://www.youtube.com/embed/${videoData.videoId}`,
                  transcription: caption.map((c) => c.text).join("\n"),
                });
                console.log("Transcripts:", caption);
              }}
            >
              Summarize and Analyze
            </Button>
          </Flex>
        )}
      </Flex>
    </Container>
  );
};

export default Dashboard;
