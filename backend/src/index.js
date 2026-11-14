import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

// Import app AFTER dotenv so env vars (e.g. CORS_ORIGIN) are available at module load
const { default: app } = await import("./app.js");
const { default: connectDB } = await import("./db/index.js");

connectDB()
  .then(() => {
    const port = process.env.PORT || 8000;
    const server = app.listen(port, () => {
      console.log(`\n Server is running on port ${port}`);
    });
    server.on("error", (error) => {
      console.log("Server error: ", error);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.log("Error in connecting to DB: ", err);
  });
