import { Button, ButtonGroup, TextInput } from "@mantine/core";
import "@mantine/core/styles.css";
import "./App.css";
import { useAuth } from "./providers/useAuth";
import { useYoutube } from "./providers/useYoutube";
import { useState } from "react";

function App() {
  const { tokens, userData, signIn, signOut } = useAuth();
  const { getTranscripts } = useYoutube();

  const [youtubeID, setYoutubeID] = useState("o4e-Kt02rfc");

  return (
    <main className="container">
      <ButtonGroup>
        <Button onClick={signIn}>Login</Button>
        <Button onClick={signOut}>Logout</Button>
      </ButtonGroup>
      <pre>{JSON.stringify(tokens, null, 2)}</pre>
      <pre>{JSON.stringify(userData, null, 2)}</pre>
      {tokens?.accessToken ? (
        <>
          <TextInput
            value={youtubeID}
            onChange={(event) => setYoutubeID(event.currentTarget.value)}
            placeholder="Enter YouTube video ID"
          />
          <Button onClick={() => getTranscripts(youtubeID)}>
            Get Transcripts
          </Button>
        </>
      ) : null}
    </main>
  );
}

export default App;
