import {
  Alert,
  TextInput,
  Select,
  Button,
  Container,
  Title,
  Stack,
  Paper,
  Text,
  LoadingOverlay,
  Divider,
  Checkbox,
  Group,
  Grid,
  UnstyledButton,
  Box,
  useMantineColorScheme,
  ActionIcon,
} from "@mantine/core";
import { IconSun, IconMoon } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { ClearableDatabase, useDatabase } from "../providers/useDatabase";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { APP_THEMES } from "../themes/index";

const MISTRAL_MODELS = [
  { value: "mistral-tiny", label: "Mistral Tiny" },
  { value: "mistral-small", label: "Mistral Small" },
  { value: "mistral-medium", label: "Mistral Medium" },
  { value: "mistral-large-latest", label: "Mistral Large" },
];

export default function Settings() {
  const { settings, saveSettings, clearDatabases, loading } = useDatabase();
  const [selectedDatabases, setSelectedDatabases] = useState<
    ClearableDatabase[]
  >([]);
  const [isClearing, setIsClearing] = useState(false);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const form = useForm({
    initialValues: {
      mistralToken: "",
      mistralModel: "mistral-tiny",
      googleEmbedToken: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.setValues({
        mistralToken: settings.mistralToken || "",
        mistralModel: settings.mistralModel || "mistral-tiny",
        googleEmbedToken: settings.googleEmbedToken || "",
      });
    }
  }, [settings]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      // Preserve existing authStore and theme when saving API keys
      const newSettings = {
        authStore: settings?.authStore || {},
        theme: settings?.theme || "Mantine",
        mistralToken: values.mistralToken,
        mistralModel: values.mistralModel,
        googleEmbedToken: values.googleEmbedToken,
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

  const handleClearDatabases = async () => {
    if (selectedDatabases.length === 0) {
      notifications.show({
        title: "No selection",
        message: "Select at least one database to clear",
        color: "yellow",
      });
      return;
    }

    // const shouldClear = window.confirm(
    //   `Clear selected databases: ${selectedDatabases.join(", ")}? This action cannot be undone.`,
    // );
    modals.openConfirmModal({
      title: "Confirm Clear",
      children: (
        <Text size="sm">
          Are you sure you want to clear the following databases? This action
          cannot be undone.
          <ul>
            {selectedDatabases.map((db) => (
              <li key={db}>{db}</li>
            ))}
          </ul>
        </Text>
      ),
      labels: { confirm: "Clear", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        setIsClearing(true);
        try {
          await clearDatabases(selectedDatabases);
          notifications.show({
            title: "Success",
            message: `Cleared: ${selectedDatabases.join(", ")}`,
            color: "green",
          });
          setSelectedDatabases([]);
        } catch (error) {
          notifications.show({
            title: "Error",
            message: "Failed to clear selected databases",
            color: "red",
          });
        } finally {
          setIsClearing(false);
        }
      },
    });
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="lg">
        Settings
      </Title>

      <Paper withBorder p="md" pos="relative" mb="lg">
        <LoadingOverlay visible={loading} overlayProps={{ blur: 2 }} />
        <Stack>
          <Group justify="space-between" align="center">
            <Text fw={500} size="lg">
              Interface (Thème)
            </Text>
            <ActionIcon
              onClick={() => toggleColorScheme()}
              variant="default"
              size="lg"
              aria-label="Toggle color scheme"
            >
              {colorScheme === "dark" ? (
                <IconSun size={18} stroke={1.5} />
              ) : (
                <IconMoon size={18} stroke={1.5} />
              )}
            </ActionIcon>
          </Group>

          <div>
            <Text size="sm" fw={500} mb={4}>
              Apparence
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              Les changements de thème sont appliqués et sauvegardés
              immédiatement.
            </Text>
            <Grid gutter="md">
              {Object.keys(APP_THEMES).map((themeName) => {
                const themeData = APP_THEMES[themeName];
                // Extraction des couleurs principales
                const primaryColor = themeData.primaryColor || "blue";
                const primaryColors =
                  themeData.colors?.[primaryColor] ||
                  themeData.colors?.blue ||
                  [];
                const mainColor = primaryColors[6] || "#228be6";

                // Détermination du background (dark[7] ou dark[8] selon Mantine)
                const darkColors = themeData.colors?.dark || [
                  "#ffffff",
                  "#beb3d1",
                  "#a495be",
                  "#8a78aa",
                  "#715d94",
                  "#715d94",
                  "#584872",
                  "#3e3451",
                  "#251f2f",
                  "#0b0a0d",
                ];
                const bgColor = darkColors[7] || "#25262b"; // fallback à défaut

                // Simulation de secondary et complementary
                const grayColors = themeData.colors?.gray || [
                  "#f8f9fa",
                  "#f1f3f5",
                  "#e9ecef",
                  "#dee2e6",
                  "#ced4da",
                  "#adb5bd",
                  "#868e96",
                  "#495057",
                  "#343a40",
                  "#212529",
                ];
                const secondaryColor = primaryColors[4] || "#74c0fc";
                const complementaryColor = grayColors[2] || "#e9ecef";

                const isSelected = settings?.theme === themeName;

                return (
                  <Grid.Col span={{ base: 6, sm: 4, md: 3 }} key={themeName}>
                    <UnstyledButton
                      onClick={() => {
                        if (settings) {
                          saveSettings({ ...settings, theme: themeName });
                        }
                      }}
                      style={() => ({
                        position: "relative",
                        width: "100%", // Prends toute la place de la colonne Grid
                        padding: "12px", // Fixed padding
                        border: `2px solid ${
                          isSelected
                            ? "var(--mantine-primary-color-filled)"
                            : "transparent"
                        }`,
                        borderRadius: "8px", // Fixed outer border radius
                        backgroundColor: "var(--mantine-color-body)",
                        boxShadow: "var(--mantine-shadow-xs)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: "12px", // Fixed gap
                        transition:
                          "border-color 150ms ease, transform 150ms ease",
                        // Prevent width recalculations caused by inherited box-sizing or implicit min-widths
                        boxSizing: "border-box",
                      })}
                    >
                      <Box
                        style={{
                          backgroundColor: bgColor,
                          borderRadius: "8px", // Fixed inner border radius
                          padding: "12px", // Fixed inner padding
                          border: `1px solid ${darkColors[4] || "#424242"}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px", // Fixed inner gap
                        }}
                      >
                        {/* Simulation de "skeleton" */}
                        <Box
                          style={{
                            height: "8px",
                            width: "60%",
                            backgroundColor: mainColor,
                            borderRadius: "4px", // Fixed skeleton radius
                          }}
                        />
                        <Box
                          style={{
                            height: "8px",
                            width: "40%",
                            backgroundColor: secondaryColor,
                            borderRadius: "4px", // Fixed skeleton radius
                          }}
                        />
                        <Group gap={6} mt={4}>
                          <Box
                            style={{
                              width: "16px",
                              height: "16px",
                              backgroundColor: complementaryColor,
                              borderRadius: "50%",
                            }}
                          />
                          <Box
                            style={{
                              flex: 1,
                              height: "8px",
                              backgroundColor: darkColors[5] || "#3b3b3b",
                              borderRadius: "4px", // Fixed skeleton radius
                            }}
                          />
                        </Group>
                      </Box>

                      <Text
                        fw={500}
                        size="sm"
                        ta="center"
                        style={{ margin: 0, padding: 0, lineHeight: 1 }}
                      >
                        {themeName}
                      </Text>
                    </UnstyledButton>
                  </Grid.Col>
                );
              })}
            </Grid>
          </div>
        </Stack>
      </Paper>

      <Paper withBorder p="md" pos="relative" mb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Text fw={500} size="lg">
              Google Embedding Configuration
            </Text>

            <TextInput
              label="API Token"
              placeholder="Enter your Google AI Studio API token"
              description={
                <>
                  You can get a token here:{" "}
                  <a
                    href="https://aistudio.google.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                  >
                    https://aistudio.google.com/api-keys
                  </a>
                </>
              }
              type="password"
              {...form.getInputProps("googleEmbedToken")}
            />
            <Divider my="sm" />
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

            <Divider my="sm" />

            <Text fw={500} size="lg" c="red.7">
              Danger zone
            </Text>
            <Alert color="red" variant="light">
              Clearing databases deletes all stored vectors and payloads for the
              selected collections.
            </Alert>

            <Checkbox.Group
              label="Databases to clear"
              value={selectedDatabases}
              onChange={(value) =>
                setSelectedDatabases(value as ClearableDatabase[])
              }
            >
              <Stack gap="xs" mt="xs">
                <Checkbox value="embeddings" label="Embeddings" />
                <Checkbox value="videos" label="Videos" />
                <Checkbox value="chat_history" label="Chat History" />
              </Stack>
            </Checkbox.Group>

            <Button
              color="red"
              variant="filled"
              onClick={handleClearDatabases}
              loading={isClearing}
              disabled={selectedDatabases.length === 0 || loading}
            >
              Clear selected databases
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
