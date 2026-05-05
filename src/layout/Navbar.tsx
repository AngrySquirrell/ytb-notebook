import {
  ActionIcon,
  Avatar,
  Button,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconSettings, IconVideoPlus } from "@tabler/icons-react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../providers/useAuth";

const Navbar = () => {
  const { isAuthenticated, userData, signIn, signOut, loading, error } =
    useAuth();
  const n = useNavigate();

  return (
    <Stack
      h="100%"
      p="md"
      justify="space-between"
      style={{ borderRight: "1px solid var(--mantine-color-gray-3)" }}
    >
      <Stack gap="sm">
        <Text size="xs" fw={500} c="dimmed" tt="uppercase">
          Menu
        </Text>

        <Button rightSection={<IconVideoPlus />} component={NavLink} to={"/"}>
          <Group>
            <Text size="sm" fw={500}>
              Submit a video
            </Text>
          </Group>
        </Button>

        <Divider my="sm" mx={24} />

        <Button variant="light" component={NavLink} to={"/embedded-videos"}>
          <Group>
            <Text size="sm" fw={500}>
              Embedded videos
            </Text>
          </Group>
        </Button>

        <Button variant="light" component={NavLink} to={"/vectorial-database"}>
          <Group>
            <Text size="sm" fw={500}>
              Vectorial database
            </Text>
          </Group>
        </Button>

        <Button variant="light" component={NavLink} to={"/chatbot"}>
          <Group>
            <Text size="sm" fw={500}>
              Chatbot
            </Text>
          </Group>
        </Button>
      </Stack>

      <div
        style={{
          borderTop: "1px solid var(--mantine-color-gray-3)",
          paddingTop: "1rem",
        }}
      >
        {isAuthenticated && userData ? (
          <Menu shadow="md" width={260} position="right-end">
            <Menu.Target>
              <UnstyledButton
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                }}
              >
                <Group gap="xs">
                  <Avatar
                    src={userData.picture}
                    radius="xl"
                    alt={userData.name}
                  />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <Text size="sm" fw={500} truncate="end">
                      {userData.name}
                    </Text>
                    <Text c="dimmed" size="xs" truncate="end">
                      {userData.email}
                    </Text>
                  </div>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Compte utilisateur</Menu.Label>
              <Menu.Item onClick={() => n("/settings")}>Settings</Menu.Item>
              <Menu.Item onClick={() => signOut()} color="red">
                Log out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Group justify="space-between" w={"100%"} align="center" gap={4}>
            <Button
              variant="light"
              onClick={() => signIn()}
              flex={"1"}
              size="md"
              loading={loading}
              color={error ? "red" : undefined}
            >
              {error ? "Reessayer la connexion" : "Sign in with Google"}
            </Button>
            <ActionIcon
              variant="light"
              onClick={() => n("/settings")}
              size={"42px"}
            >
              <IconSettings />
            </ActionIcon>
          </Group>
        )}
      </div>
    </Stack>
  );
};

export default Navbar;
