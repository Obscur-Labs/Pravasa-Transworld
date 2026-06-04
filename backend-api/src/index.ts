import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/database";
import { initCloudinary } from "./config/cloudinary";

import http from "http";
import { initSocket } from "./utils/socket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

const REQUIRED_ENV = ['JWT_SECRET', 'MONGODB_URI', 'EMAIL_USER', 'EMAIL_PASS'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[STARTUP] Missing required env vars: ${missing.join(', ')}`);
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

(async () => {
  try {
    await connectDB();
    initCloudinary();
    server.listen(PORT, () => {
      console.log(`Pravasa Transworld API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
