import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Route, RootRoute } from "@tanstack/react-router";
import React from "react";
import HomePage from "../pages/HomePage";
import UploadPage from "../pages/UploadDoc";
import BatchPage from "../pages/BatchUpload";
import PersonaPage from "../pages/Persona";
import QueryPage from "../pages/Query";
import PromptsPage from "../pages/Prompts";
import SettingsPage from "../pages/BatchUpload";
import Layout from "../pages/Layout";

const rootRoute = new RootRoute({ component: Layout });
const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// Define additional routes for each page
const uploadRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/upload",
  component: UploadPage,
});
const batchRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/batch",
  component: BatchPage,
});
const personaRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/persona",
  component: PersonaPage,
});

const queryRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/query",
  component: QueryPage,
});

const promptsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/prompts",
  component: PromptsPage,
});

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

// Add all routes to the route tree
const routeTree = rootRoute.addChildren([
  homeRoute,
  uploadRoute,
  batchRoute,
  personaRoute,
  queryRoute,
  promptsRoute,
  settingsRoute,
]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => React.createElement("h1", null, "404 Not Found"),
});
export { router, RouterProvider };