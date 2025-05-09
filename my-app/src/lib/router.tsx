import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Route, RootRoute } from "@tanstack/react-router";
import React from "react";
import HomePage from "../pages/HomePage";
import PersonaPage from "../pages/Persona";
import QueryPage from "../pages/Query";
import PromptsPage from "../pages/Prompts";
import SettingsPage from "../pages/Settings";
import Layout from "../pages/Layout";

const rootRoute = new RootRoute({ component: Layout });
const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

// Define additional routes for each page
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