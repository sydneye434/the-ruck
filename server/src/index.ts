// Developed by Sydney Edwards
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

