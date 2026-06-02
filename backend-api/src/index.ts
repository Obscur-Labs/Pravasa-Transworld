import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/database";
import { initCloudinary } from "./config/cloudinary";

import http from "http";
import { initSocket } from "./utils/socket";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

(async () => {
  try {
    await connectDB();
    initCloudinary();
    server.listen(PORT, () => {
      console.log(`VisaFlow API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
