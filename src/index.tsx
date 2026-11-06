import React from "react";
import { createRoot } from "react-dom/client";
import { i18nReady } from "./lib/i18n";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

// Load the language first, so the first render isn't untranslated keys.
i18nReady()
  .then(() => import("./App"))
  .then(({ default: App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  );
