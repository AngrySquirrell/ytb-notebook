import {
  Card,
  Image,
  Text,
  Badge,
  Group,
  Avatar,
  Stack,
  Tooltip,
  Skeleton,
  UnstyledButton,
  Flex,
} from "@mantine/core";
import { YoutubeVideoMetadata } from "../types/video";
import "./YoutubeCard.css";

interface YoutubeCardProps {
  videoData: YoutubeVideoMetadata;
  skeleton?: false;
}
interface YoutubeCardSkeletonProps {
  skeleton: true;
  videoData?: never;
}

const YoutubeCard = ({
  videoData,
  skeleton = false,
}: YoutubeCardProps | YoutubeCardSkeletonProps) => {
  const formatDuration = (secondsStr: string) => {
    const seconds = parseInt(secondsStr, 10);
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };
  const formatViews = (viewsStr: string) => {
    const views = parseInt(viewsStr, 10);
    if (isNaN(views)) return viewsStr;
    if (views >= 1_000_000_000) return (views / 1_000_000_000).toFixed(1) + "B";
    if (views >= 1_000_000) return (views / 1_000_000).toFixed(1) + "M";
    if (views >= 1_000) return (views / 1_000).toFixed(1) + "K";
    return views.toString();
  };
  if (skeleton) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section>
          <Skeleton height={250} mb="xl" />
        </Card.Section>
        <div style={{ marginTop: 15 }}>
          <Group justify="space-between" align="start">
            <Skeleton width="70%" height={24} mb={6} />
            <Skeleton width={50} height={24} mb={6} />
          </Group>
        </div>
        <Group mt="md" align="center">
          <Skeleton circle width={40} height={40} />
          <div style={{ flex: 1 }}>
            <Skeleton width="50%" height={16} mb={4} />
            <Skeleton width="30%" height={12} />
          </div>
        </Group>
        <Skeleton height={60} mt="sm" />
        <Card.Section inheritPadding py="xs" withBorder mt="md">
          <Group justify="space-apart" grow>
            <Stack gap={0} align="center">
              <Skeleton width={40} height={12} mb={4} />
              <Skeleton width={30} height={16} />
            </Stack>
            <Stack
              gap={0}
              align="center"
              style={{
                borderLeft: "1px solid var(--mantine-color-dark-4)",
                borderRight: "1px solid var(--mantine-color-dark-4)",
              }}
            >
              <Skeleton width={40} height={12} mb={4} />
              <Skeleton width={30} height={16} />
            </Stack>
            <Stack gap={0} align="center">
              <Skeleton width={40} height={12} mb={4} />
              <Skeleton width={30} height={16} />
            </Stack>
          </Group>
        </Card.Section>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src={videoData?.thumbnail}
          height={250}
          alt={videoData?.title}
          fit="cover"
          fallbackSrc="https://placehold.co/600x400?text=No+Image"
        />
      </Card.Section>

      <div style={{ marginTop: 15 }}>
        <Group justify="space-between" align="start">
          <Text fw={700} size="lg" lineClamp={2} style={{ flex: 1 }}>
            {videoData?.title}
          </Text>
          <Badge color="gray" variant="light">
            {formatDuration(videoData?.duration || "0")}
          </Badge>
        </Group>
      </div>

      <Flex mt="md" align="center" gap={8} w={"fit-content"}>
        <UnstyledButton
          component="a"
          href={`https://www.youtube.com/channel${videoData?.channelUrl}`}
          target="_blank"
          style={{
            textDecoration: "none",
            color: "inherit",
            borderRadius: "4px",
          }}
          className="youtubeChannel"
        >
          <Group gap={6} p={4}>
            <Avatar src={videoData?.channelAvatar} radius="xl" size="md" />
            <div style={{ flex: 1 }}>
              <Group gap={6}>
                <Text size="sm" fw={600}>
                  {videoData?.channelName}
                </Text>
                {videoData?.isVerified && (
                  <Text size="xs" c="blue">
                    ✓
                  </Text>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {videoData?.subscriberCount}
              </Text>
            </div>
          </Group>
        </UnstyledButton>
      </Flex>

      <Text size="sm" c="dimmed" lineClamp={3} mt="sm">
        {videoData?.description}
      </Text>

      <Card.Section inheritPadding py="xs" withBorder mt="md">
        <Group justify="space-apart" grow>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Views
            </Text>
            <Tooltip
              label={`${videoData?.viewCount || "0"} views`}
              withArrow
              position="top"
            >
              <Text size="sm" fw={500}>
                {formatViews(videoData?.viewCount || "0")}
              </Text>
            </Tooltip>
          </Stack>
          <Stack
            gap={0}
            align="center"
            style={{
              borderLeft: "1px solid var(--mantine-color-dark-4)",
              borderRight: "1px solid var(--mantine-color-dark-4)",
            }}
          >
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Likes
            </Text>
            <Text size="sm" fw={500}>
              {videoData?.likesAmount || "N/A"}
            </Text>
          </Stack>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Published on
            </Text>
            <Text size="sm" fw={500}>
              {videoData?.publishDate
                ? `${new Date(videoData.publishDate).toLocaleDateString()} - ${new Date(videoData.publishDate).toLocaleTimeString()}`
                : "N/A"}
            </Text>
          </Stack>
        </Group>
      </Card.Section>
    </Card>
  );
};

export default YoutubeCard;
