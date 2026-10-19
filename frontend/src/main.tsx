import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Toast, Toaster } from "./components/ui/toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Toast.Provider timeout={2500} limit={1}>
      <App />
      <Toaster />
    </Toast.Provider>
  </React.StrictMode>
);
