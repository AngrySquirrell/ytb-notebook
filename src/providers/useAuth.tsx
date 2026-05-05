import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  signIn as googleSignIn,
  signOut as googleSignOut,
  refreshToken as googleRefreshToken,
  TokenResponse,
  SignInOptions,
} from "@choochmeque/tauri-plugin-google-auth-api";
import { AuthConfig, UserData } from "../types/auth";
import { SUCCESS_HTML_RESPONSE } from "../script/constants";
// import successHTML from "../assets/success.html";

interface AuthContextType {
  isAuthenticated: boolean;
  tokens: TokenResponse | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  restoreSession: (tokens: TokenResponse) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
}

const SIGN_IN_TIMEOUT_MS = 90_000;

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [tokens, setTokens] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userData, setUserData] = useState<AuthContextType["userData"]>({});
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!tokens?.accessToken;

  const _parseJWT = (token: string) => {
    try {
      const payload = token.split(".")[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (err) {
      console.error("Failed to parse JWT:", err);
      return null;
    }
  };

  const getSignInErrorMessage = (err: unknown): string => {
    const message = err instanceof Error ? err.message : String(err || "");
    const normalized = message.toLowerCase();

    if (
      normalized.includes("cancel") ||
      normalized.includes("closed") ||
      normalized.includes("aborted") ||
      normalized.includes("denied")
    ) {
      return "Connexion annulée ou fenêtre fermée.";
    }

    if (normalized.includes("timeout")) {
      return "La connexion a expiré. Réessaie.";
    }

    return message || "Echec de la connexion Google.";
  };

  const restoreSession = useCallback((tokens: TokenResponse) => {
    setTokens(tokens);
    if (tokens.idToken) {
      const idTokenData = _parseJWT(tokens.idToken);
      setUserData({
        email: idTokenData?.email,
        name: idTokenData?.name,
        picture: idTokenData?.picture,
        given_name: idTokenData?.given_name,
        family_name: idTokenData?.family_name,
        ...idTokenData,
      });
    }
  }, []);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const desktopCompatibleRedirectUri =
        config.redirectUri && config.redirectUri.startsWith("http://localhost")
          ? config.redirectUri
          : undefined;

      const options: SignInOptions = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scopes: config.scopes,
        redirectUri: desktopCompatibleRedirectUri,
        successHtmlResponse: SUCCESS_HTML_RESPONSE,
      };

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "Sign-in timeout: auth window closed or no response from provider",
            ),
          );
        }, SIGN_IN_TIMEOUT_MS);
      });

      const response = await Promise.race([
        googleSignIn(options),
        timeoutPromise,
      ]);
      if (!response) throw new Error("User cancelled the sign-in process");
      setTokens(response);
      const idTokenData = _parseJWT(response.idToken!);
      setUserData({
        email: idTokenData?.email,
        name: idTokenData?.name,
        picture: idTokenData?.picture,
        given_name: idTokenData?.given_name,
        family_name: idTokenData?.family_name,
        ...idTokenData, // Include any additional fields from the ID token
      });

      console.log("Sign-in successful:", { response, userData: idTokenData });
    } catch (err: unknown) {
      console.error("Sign in failed:", err);
      setError(getSignInErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [config]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await googleSignOut({
        accessToken: tokens?.accessToken,
      });
      setTokens(null);
      console.log("User signed out");
    } catch (err: any) {
      console.error("Sign out failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  const refresh = useCallback(async () => {
    if (!tokens?.refreshToken) {
      setError("No refresh token available");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await googleRefreshToken({
        refreshToken: tokens.refreshToken,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scopes: config.scopes,
      });

      setTokens((prev) => (prev ? { ...prev, ...response } : response));
      console.log("Refreshed tokens:", response);
    } catch (err: any) {
      console.error("Token refresh failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [config, tokens]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        tokens,
        userData,
        loading,
        error,
        signIn,
        signOut,
        refresh,
        restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
