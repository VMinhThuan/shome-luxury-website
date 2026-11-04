const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env.local") });
require("dotenv").config();
const express = require("express");
const compression = require("compression");
const connectDB = require("./src/config/db");
const routes = require("./src/routes");
const { hostnameRouting } = require("./src/middleware/hostnameRouting");

const app = express();
const PORT = process.env.PORT || 3030;

// Performance & Security Settings
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.set("view cache", process.env.NODE_ENV === "production");

// Enable Gzip / Brotli compression for text responses
app.use(compression({ threshold: 0 }));

// Hostname routing must run before static files and database access. It uses
// only the direct Host header; X-Forwarded-Host is not trusted for policy.
app.use(hostnameRouting);

// Set view engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static directory with fresh HTTP caching & ETag support
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1h",
  etag: true,
  lastModified: true
}));

// Serverless DB Connection Middleware (Ensures MongoDB is connected before routes run)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB Connection Middleware Error:", err.message);
    return res.status(500).json({
      success: false,
      message: `Database Connection Error: ${err.message}`
    });
  }
});


// Routes
app.use("/", routes);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]:", err);
  const status = err.status || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : err.code === 11000 ? 409 : 500);
  return res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// Start Server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
