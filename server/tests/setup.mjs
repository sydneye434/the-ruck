// Developed by Sydney Edwards
// Must load before any server modules so JSON repositories use isolated test data.
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DATA_DIR = path.join(__dirname, "test-data");
