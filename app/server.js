const http = require("http");

const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || "1.0.0";

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: "healthy", version }));
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    application: "AWS ECS Jenkins CI/CD Demo",
    version,
    message: "GitHub -> Jenkins -> Docker -> ECR -> ECS"
  }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Application listening on port ${port}`);
});
