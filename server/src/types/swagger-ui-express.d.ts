declare module "swagger-ui-express" {
  import type { RequestHandler } from "express";

  const swaggerUi: {
    serve: RequestHandler;
    // swaggerUi.setup spec => RequestHandler
    setup: (...args: any[]) => RequestHandler;
  };

  export default swaggerUi;
}

