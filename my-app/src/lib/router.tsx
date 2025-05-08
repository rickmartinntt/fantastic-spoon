import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Route, RootRoute } from "@tanstack/react-router";
import React from "react";
import HomePage from "../pages/HomePage";

const rootRoute = new RootRoute();
const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const routeTree = rootRoute.addChildren([homeRoute]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => React.createElement("h1", null, "404 Not Found"),
});
export { router, RouterProvider };