import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./providers/useAuth";
import { YoutubeProvider } from "./providers/useYoutube";
import { createTheme, MantineProvider } from "@mantine/core";

const theme = createTheme({
  /** Put your mantine theme override here */
});

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
      <YoutubeProvider>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <App />
        </MantineProvider>
      </YoutubeProvider>
    </AuthProvider>
  </React.StrictMode>,
);
