import { createContext, useContext } from "react";

export const LanguageContext = createContext({
  lang: "fr",
  dir: "ltr",
  t: (key) => key,
  setLang: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}
