const express = require("express");
const path = require("path");
const compression = require("compression");
const routes = require("./src/routes");

const app = express();
const PORT = process.env.PORT || 3030;

// Performance & Security Settings
app.disable("x-powered-by");
app.set("view cache", true);

// Enable Gzip / Brotli compression for text responses (HTML, CSS, JS, SVG)
app.use(compression({ threshold: 0 }));

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

// Routes
app.use("/", routes);

// Start Server when run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
