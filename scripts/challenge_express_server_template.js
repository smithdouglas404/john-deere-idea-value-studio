const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Requested health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    repository: "challenge-dealer-service-efficiency",
    organization: "Inflexcvi",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.send("John Deere Idea Value Studio — Challenge Repository Starter (Express.js)");
});

// Graceful JSON response for unknown routes.
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `No route found for ${req.method} ${req.originalUrl}`,
    statusCode: 404,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Challenge starter server listening on port ${port}`);
  });
}

module.exports = app;
