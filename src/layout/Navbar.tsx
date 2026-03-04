import {
  Avatar,
  Button,
  Divider,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useAuth } from "../providers/useAuth";
import { NavLink, useNavigate } from "react-router";
import { IconVideoPlus } from "@tabler/icons-react";

const Navbar = () => {
  const { isAuthenticated, userData, signIn, signOut } = useAuth();
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
          <Button fullWidth variant="light" onClick={() => signIn()}>
            Sign in with Google
          </Button>
        )}
      </div>
    </Stack>
  );
};

export default Navbar;
