import { AppShell } from "@mantine/core";
import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { Outlet } from "react-router";
import "./App.css";
import Navbar from "./layout/Navbar";

function App() {
  // const { tokens, userData, signIn, signOut } = useAuth();
  const [opened, { toggle }] = useDisclosure();
  return (
    <AppShell
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Navbar p={0}>
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
