import Goomy from "./Goomy.json";
import Mantine from "./Mantine.json";
import Murkrow from "./Murkrow.json";
import Remoraid from "./Remoraid.json";
import Sylveon from "./Sylveon.json";
import Vivillan from "./Vivillan.json";

export const APP_THEMES: Record<string, any> = {
  Goomy,
  Mantine,
  Murkrow,
  Remoraid,
  Sylveon,
  Vivillan,
};

export type AppThemeName = keyof typeof APP_THEMES;
