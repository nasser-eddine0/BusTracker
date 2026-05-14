import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const LanguageContext = createContext({ lang: "fr", dir: "ltr", t: (k) => k, setLang: () => {} });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("app-lang") || "ar");

  const setLang = useCallback((nextLang) => {
    setLangState(nextLang);
    localStorage.setItem("app-lang", nextLang);
  }, []);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const t = useCallback(
    (key) => translations[lang]?.[key] || translations.fr?.[key] || key,
    [lang]
  );

  const value = useMemo(() => ({ lang, dir, t, setLang }), [dir, lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LangSwitcher({ className = "" }) {
  const { lang, setLang } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "fr" ? "ar" : "fr")}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-main transition hover:bg-accent-soft ${className}`}
    >
      {lang === "fr" ? "العربية" : "Français"}
    </button>
  );
}
