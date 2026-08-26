"use client";

import {
  useEffect,
  useState,
} from "react";

export default function ThemeToggle({
  inline = false,
}: {
  inline?: boolean;
}) {
  const [
    theme,
    setTheme,
  ] =
    useState<
      "light" | "dark"
    >("light");

  useEffect(() => {
    const saved =
      window.localStorage.getItem(
        "dreamwear-theme",
      );

    const prefersDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

    const nextTheme =
      saved === "dark" ||
      saved === "light"
        ? saved
        : prefersDark
        ? "dark"
        : "light";

    setTheme(nextTheme);

    document.documentElement
      .classList.toggle(
        "dark",
        nextTheme === "dark",
      );
  }, []);

  function toggleTheme() {
    const nextTheme =
      theme === "dark"
        ? "light"
        : "dark";

    setTheme(nextTheme);

    window.localStorage.setItem(
      "dreamwear-theme",
      nextTheme,
    );

    document.documentElement
      .classList.toggle(
        "dark",
        nextTheme === "dark",
      );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={
        theme === "dark"
          ? "Gunakan mode terang"
          : "Gunakan mode gelap"
      }
      className={[
        "flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50",
        inline
          ? ""
          : "fixed right-4 top-24 z-[150]",
      ].join(" ")}
    >
      {theme === "dark"
        ? "☀"
        : "☾"}
    </button>
  );
}
