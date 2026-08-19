# John Deere Idea Value Studio — Mac & Docker Desktop Local Migration Guide

This guide details how to pull and run the **John Deere Idea Value Studio** locally on your Mac using **Docker Desktop**.

---

## Prerequisites

1. **Docker Desktop for Mac**: Installed and running [1].
2. **Git**: Installed on your Mac (`git --version`) [2].

---

## Step 1: Clone Your Repository

Open your terminal and clone your repository from GitHub:

```bash
git clone https://github.com/smithdouglas404/john-deere-idea-value-studio.git
cd john-deere-idea-value-studio
```

---

## Step 2: Configure Environment Variables

Create your local `.env` file based on the provided configuration:

```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://root:rootpassword@db:3306/john_deere_studio
JWT_SECRET=your-secure-local-jwt-secret
EOF
```

*(Optional)* If you want real Claude AI specialist agent evaluations to execute locally, add your Anthropic API key to `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Step 3: Build and Run with Docker Compose

Spin up both the MySQL database container and the application container with a single command:

```bash
docker compose up --build -d
```

Docker Desktop will:
1. Start a persistent MySQL 8 database (`jd_studio_mysql`) with persistent volume storage.
2. Build the production multi-stage Node.js container for the full-stack application (React 19, tRPC, Drizzle ORM).
3. Bind the application to port `3000`.

---

## Step 4: Access Your Local Studio

Once running, open your browser and navigate to:

👉 **http://localhost:3000**

You will land directly on the **Innovation Portfolio** home screen, with full access to:
- The Submitter crowdsourcing intake and community voting.
- The Owner Executive Decision Cockpit with financial economics and document previews.
- The Hackathon Judge Cockpit with specialist Claude evaluation lenses (Security, Cloud Architecture, Code Delivery, UX/UI, Value & Feasibility).

---

## Useful Docker Commands

- **View container logs:**
  ```bash
  docker compose logs -f app
  ```
- **Stop containers (preserving data):**
  ```bash
  docker compose stop
  ```
- **Tear down containers and reset local database:**
  ```bash
  docker compose down -v
  ```
