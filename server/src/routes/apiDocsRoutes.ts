// Developed by Sydney Edwards
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "../docs/openapi";

export const apiDocsRoutes = Router();

apiDocsRoutes.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

apiDocsRoutes.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    swaggerOptions: {
      docExpansion: "none"
    }
  })
);

