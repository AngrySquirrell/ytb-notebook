import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./providers/useAuth";
import { YoutubeProvider } from "./providers/useYoutube";
import { DatabaseProvider } from "./providers/useDatabase";
import { createTheme, MantineProvider } from "@mantine/core";
import { createBrowserRouter, RouterProvider } from "react-router";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import EmbeddedVideos from "./pages/EmbeddedVideos";
import VectorialDatabase from "./pages/VectorialDatabase";
import Chatbot from "./pages/Chatbot";
import { LLMProvider } from "./providers/useLLM";

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

const theme = createTheme({});

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
        <LLMProvider>
          <YoutubeProvider>
            <MantineProvider theme={theme} defaultColorScheme="dark">
              <RouterProvider router={router} />
            </MantineProvider>
          </YoutubeProvider>
        </LLMProvider>
      </DatabaseProvider>
    </AuthProvider>
  </React.StrictMode>,
);
