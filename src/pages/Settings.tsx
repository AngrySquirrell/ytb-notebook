import {
  TextInput,
  Select,
  Button,
  Container,
  Title,
  Stack,
  Paper,
  Text,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { useDatabase } from "../providers/useDatabase";
import { notifications } from "@mantine/notifications";

const MISTRAL_MODELS = [
  { value: "mistral-tiny", label: "Mistral Tiny" },
  { value: "mistral-small", label: "Mistral Small" },
  { value: "mistral-medium", label: "Mistral Medium" },
  { value: "mistral-large-latest", label: "Mistral Large" },
];

export default function Settings() {
  const { settings, saveSettings, loading } = useDatabase();

  const form = useForm({
    initialValues: {
      mistralToken: "",
      mistralModel: "mistral-tiny",
    },
  });

  useEffect(() => {
    if (settings) {
      form.setValues({
        mistralToken: settings.mistralToken || "",
        mistralModel: settings.mistralModel || "mistral-tiny",
      });
    }
  }, [settings]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // Preserve existing authStore when saving
      const newSettings = {
        authStore: settings?.authStore || {},
        mistralToken: values.mistralToken,
        mistralModel: values.mistralModel,
      };

      await saveSettings(newSettings);

      notifications.show({
        title: "Success",
        message: "Settings saved successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to save settings",
        color: "red",
      });
    }
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">
        Settings
      </Title>

      <Paper withBorder p="md" pos="relative">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Text fw={500} size="lg">
              Mistral AI Configuration
            </Text>

            <TextInput
              label="API Token"
              placeholder="Enter your Mistral API token"
              description="You can find this in your Mistral AI console"
              type="password"
              {...form.getInputProps("mistralToken")}
            />

            <Select
              label="Model"
              placeholder="Select a model"
              data={MISTRAL_MODELS}
              description="Choose the model to use for transcriptions and RAG"
              {...form.getInputProps("mistralModel")}
            />

            <Button type="submit" mt="md">
              Save Configuration
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
