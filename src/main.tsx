import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./providers/useAuth";
import { YoutubeProvider } from "./providers/useYoutube";
import { DatabaseProvider, useDatabase } from "./providers/useDatabase";
import { createTheme, MantineProvider } from "@mantine/core";
import { createBrowserRouter, RouterProvider } from "react-router";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import EmbeddedVideos from "./pages/EmbeddedVideos";
import VectorialDatabase from "./pages/VectorialDatabase";
import Chatbot from "./pages/Chatbot";
import { LLMProvider } from "./providers/useLLM";
import { ModalsProvider } from "@mantine/modals";
import { APP_THEMES } from "./themes/index";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Dashboard />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
      {
        path: "/embedded-videos",
        element: <EmbeddedVideos />,
      },
      {
        path: "/vectorial-database",
        element: <VectorialDatabase />,
      },
      {
        path: "/chatbot",
        element: <Chatbot />,
      },
    ],
  },
]);

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useDatabase();
  const themeName = settings?.theme || "Mantine";
  const theme = createTheme(APP_THEMES[themeName] || {});

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider
      config={{
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        scopes: (
          import.meta.env.VITE_GOOGLE_SCOPES || "email profile openid"
        ).split(" "),
        redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI,
      }}
    >
      <DatabaseProvider>
        <AppThemeProvider>
          <LLMProvider>
            <YoutubeProvider>
              <RouterProvider router={router} />
            </YoutubeProvider>
          </LLMProvider>
        </AppThemeProvider>
      </DatabaseProvider>
    </AuthProvider>
  </React.StrictMode>,
);
