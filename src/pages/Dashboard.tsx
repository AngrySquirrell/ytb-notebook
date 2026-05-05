import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  Progress,
  Select,
  SelectProps,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck, IconRobot } from "@tabler/icons-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import YoutubeCard from "../components/YoutubeCard";
import { useDatabase } from "../providers/useDatabase";
import { useLLM } from "../providers/useLLM";
import { useYoutube } from "../providers/useYoutube";
import { handleYoutubeURI } from "../script/handleYoutubeURI";
import { YoutubeAvailableCaptions, YoutubeVideoMetadata } from "../types/video";

const PREVIEW_STEPS = [
  "Validation du lien",
  "Récupération des métadonnées",
  "Récupération des langues",
  "Prêt",
];

const ANALYZE_STEPS = [
  "Validation de la vidéo",
  "Récupération de la transcription",
  "Sauvegarde",
  "Génération des embeddings",
  "Terminé",
];

const Dashboard = () => {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=xEN85i57UmM");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>("en");
  const [debouncedUrl] = useDebouncedValue(url, 500);
  const { getVideoData, getTranscripts, getAvailableCaptionsList } =
    useYoutube();
  const { saveVideo } = useDatabase();
  const { generateEmbeddingsForVideo, error: llmError } = useLLM();
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<YoutubeVideoMetadata | null>(null);
  const [availableCaptions, setAvailableCaptions] =
    useState<YoutubeAvailableCaptions | null>(null);

  const [error, setError] = useState<string | ReactNode | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentFlow, setCurrentFlow] = useState<"preview" | "analyze">(
    "preview",
  );

  useEffect(() => {
    const fetchVideo = async () => {
      if (!debouncedUrl) {
        setVideoData(null);
        setError(null);
        setCurrentFlow("preview");
        setCurrentStep(0);
        return;
      }

      setCurrentFlow("preview");
      setCurrentStep(0);
      const youtubeData = handleYoutubeURI(debouncedUrl);
      if (youtubeData.error) {
        setError("Lien YouTube invalide");
        setVideoData(null);
        setAvailableCaptions(null);
        setCurrentStep(0);
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentStep(1);
      const data = await getVideoData(youtubeData.uri);

      setCurrentStep(2);
      const data2 = await getAvailableCaptionsList(youtubeData.id);

      setLoading(false);

      if (data) {
        setVideoData(data);
      } else {
        setError("Impossible de récupérer les informations de la vidéo");
        setVideoData(null);
      }
      if (data2) {
        setAvailableCaptions(data2);
      } else {
        setError(
          "Impossible de récupérer la liste des sous-titres disponibles",
        );
        setAvailableCaptions(null);
      }

      setCurrentStep(3);
    };

    fetchVideo();
  }, [debouncedUrl]);

  useEffect(() => {
    if (llmError) {
      setError(llmError);
    }
  }, [llmError]);

  const renderSelectOption: SelectProps["renderOption"] = ({
    option,
    checked,
  }) => (
    <Group gap="xs">
      {checked && <IconCheck style={{ marginInlineStart: "auto" }} />}
      <Group gap={8}>
        {option.label?.includes("(auto-generated)") ? (
          <Text>{option.label.replace(" (auto-generated)", "")}</Text>
        ) : (
          <Text>{option.label}</Text>
        )}
        {option.label?.includes("(auto-generated)") && (
          <IconRobot size={16} color="gray" />
        )}
      </Group>
    </Group>
  );

  const languageSelect = useMemo(() => {
    return (
      <Select
        label="Language"
        data={
          availableCaptions?.available_languages?.map((c) => ({
            value: c.is_generated
              ? c.language_code + "_generated"
              : c.language_code,
            label: c.language,
          })) || []
        }
        onChange={(value) => setSelectedLanguage(value)}
        value={selectedLanguage}
        renderOption={renderSelectOption}
      />
    );
  }, [availableCaptions, selectedLanguage]);

  const steps = currentFlow === "analyze" ? ANALYZE_STEPS : PREVIEW_STEPS;
  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <Container p="md">
      <Flex direction={"column"} gap={16}>
        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="sm" fw={500}>
              {currentFlow === "analyze"
                ? "Progression de l'analyse"
                : "Progression du chargement"}
            </Text>
            <Text size="xs" c="dimmed">
              Étape {Math.min(currentStep + 1, steps.length)} / {steps.length}
            </Text>
          </Group>
          <Progress value={progressValue} animated={loading} />
          <Text size="xs" c="dimmed" mt={6}>
            {steps[Math.min(currentStep, steps.length - 1)]}
          </Text>
        </Box>

        <Flex flex={1} gap={16} w={"100%"} justify={"space-between"}>
          <TextInput
            label="YouTube link"
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
            error={error}
            w={"100%"}
          />

          <Box w={180}>{languageSelect}</Box>
        </Flex>

        {loading && <YoutubeCard skeleton />}

        {videoData && !loading && (
          <Flex w={"100%"} direction={"column"}>
            <YoutubeCard videoData={videoData} skeleton={false} />
            <Button
              mt="md"
              variant="outline"
              color="blue"
              loading={currentFlow === "analyze" && loading}
              onClick={async () => {
                try {
                  setError(null);
                  setCurrentFlow("analyze");
                  setCurrentStep(0);
                  const youtubeData = handleYoutubeURI(debouncedUrl);
                  if (youtubeData.error) {
                    setError("Lien YouTube invalide");
                    return;
                  }
                  let sanitizedLanguage = selectedLanguage || "en";
                  if (sanitizedLanguage.endsWith("_generated")) {
                    sanitizedLanguage = sanitizedLanguage.replace(
                      "_generated",
                      "",
                    );
                  }
                  setCurrentStep(1);
                  let res = await getTranscripts(
                    youtubeData.id,
                    sanitizedLanguage,
                  );

                  if (!res || !res.captions || !res.chunks) {
                    setError("Impossible de récupérer la transcription");
                    return;
                  }

                  const videoToStore = {
                    youtubeUrl: youtubeData.uri,
                    metadata: {
                      title: videoData.title,
                      channel: videoData.channelName,
                      views: parseInt(videoData.viewCount),
                      likes: videoData.likesAmount
                        ? parseInt(videoData.likesAmount)
                        : 0,
                      publishedDate: videoData.publishDate,
                      transcript: res.metadata,
                    },
                    captions: res.chunks,
                    iframeURL: `https://www.youtube.com/embed/${youtubeData.id}`,
                    transcription: res.captions,
                  };

                  setCurrentStep(2);
                  await saveVideo(videoToStore);

                  setCurrentStep(3);
                  const embeddedCount = await generateEmbeddingsForVideo(
                    videoToStore,
                  ).catch(() => null);

                  // LLM errors are surfaced by useLLM.error and mirrored via the llmError useEffect.
                  if (embeddedCount === null) {
                    return;
                  }

                  setCurrentStep(4);
                } catch (e) {
                  setError("Erreur pendant l'analyse de la vidéo");
                }
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
