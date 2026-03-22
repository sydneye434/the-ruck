// Developed by Sydney Edwards
import { createApp } from "./app";
import { startBurndownScheduler } from "./scheduler/burndownScheduler";

const port = Number(process.env.PORT ?? 3001);

const app = createApp();
startBurndownScheduler();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

