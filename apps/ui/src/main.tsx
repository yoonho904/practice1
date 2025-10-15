import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { ThemeProvider } from "./themes/ThemeContext.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
