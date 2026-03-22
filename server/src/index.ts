// Developed by Sydney Edwards
import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { startBurndownScheduler } from "./scheduler/burndownScheduler";
import { seedIfEmpty } from "./scripts/seed";
import { initPokerSocket } from "./sockets/pokerSocket";

const port = Number(process.env.PORT ?? 3001);
const clientOrigin =
  process.env.CLIENT_URL ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

async function main() {
  await seedIfEmpty();

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin }
  });
  initPokerSocket(io);
  startBurndownScheduler();

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

