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

interface AuthConfig {
  clientId: string;
  clientSecret?: string; // Required for desktop
  scopes: string[];
  redirectUri?: string;
}

interface UserData {
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any; // For any additional fields in the ID token
}

interface AuthContextType {
  isAuthenticated: boolean;
  tokens: TokenResponse | null;
  userData: UserData | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  config: AuthConfig;
}

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [tokens, setTokens] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userData, setUserData] = useState<AuthContextType["userData"]>({});
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!tokens?.accessToken;

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const options: SignInOptions = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scopes: config.scopes,
        redirectUri: config.redirectUri,
      };

      const response = await googleSignIn(options);
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
      console.log("Sign-in successful:", response);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setError(err instanceof Error ? err.message : String(err));
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
