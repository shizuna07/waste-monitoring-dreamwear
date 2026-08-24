"use client";

import {
  useEffect,
  useState,
} from "react";

type Theme =
  | "light"
  | "dark";

export default function ThemeToggle() {
  const [
    theme,
    setTheme,
  ] =
    useState<Theme>(
      "light",
    );

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "dreamwear-theme",
      ) as Theme | null;

    const systemDark =
      window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

    const initialTheme:
      Theme =
        saved ??
        (
          systemDark
            ? "dark"
            : "light"
        );

    setTheme(
      initialTheme,
    );

    document
      .documentElement
      .classList
      .toggle(
        "dark",
        initialTheme ===
          "dark",
      );
  }, []);

  function toggleTheme() {
    const nextTheme:
      Theme =
        theme === "dark"
          ? "light"
          : "dark";

    setTheme(
      nextTheme,
    );

    localStorage.setItem(
      "dreamwear-theme",
      nextTheme,
    );

    document
      .documentElement
      .classList
      .toggle(
        "dark",
        nextTheme ===
          "dark",
      );
  }

  return (
    <button
      type="button"
      onClick={
        toggleTheme
      }
      aria-label="Ubah tema"
      title={
        theme === "dark"
          ? "Gunakan mode terang"
          : "Gunakan mode gelap"
      }
      className="
        fixed
        right-4
        top-24
        z-[150]
        flex
        h-11
        w-11
        items-center
        justify-center
        rounded-full
        border
        border-slate-200
        bg-white
        text-xl
        shadow-lg
        transition
        hover:scale-105
        dark:border-slate-700
        dark:bg-slate-800
      "
    >
      {theme ===
      "dark"
        ? "☀️"
        : "🌙"}
    </button>
  );
}
