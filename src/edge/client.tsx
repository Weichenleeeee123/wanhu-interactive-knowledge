import { createRoot } from "react-dom/client";
import Home from "../app/page";
import { Workshop } from "../components/Workshop";
import { Reader } from "../components/Reader";
import { WorkLibrary } from "../components/WorkLibrary";
import "../app/globals.css";
const path = window.location.pathname;
createRoot(document.getElementById("root")!).render(
  path === "/create" ? (
    <Workshop />
  ) : path === "/view" ? (
    <Reader />
  ) : path === "/library" ? (
    <WorkLibrary />
  ) : (
    <Home />
  ),
);
