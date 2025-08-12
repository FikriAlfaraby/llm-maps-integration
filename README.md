# LLM Maps Integration

A powerful local LLM-powered system for finding places using natural language queries, built with a React frontend and a Node.js backend. This project is optimized for Windows development and utilizes a local LLM, so you can leverage AI-powered search without relying on external cloud services.

## 🚀 Key Features

- **AI-Powered Search**: Uses a local LLM (Ollama) for natural language processing to understand complex queries.
- **Google Maps Integration**: Integrates with Google Maps Platform to provide accurate and validated place data, directions, and more.
- **Modern Stack**: Built with a **React** frontend, a **Node.js/Express** backend, and **TypeScript** for type safety.
- **Redis Caching**: Improves performance and reduces API calls with an intelligent caching layer.
- **Docker Support**: Provides a `docker-compose` setup for streamlined deployment and scaling.

---

## 🛠️ Quick Start

This guide provides a fast path to getting the application up and running on Windows.

### Prerequisites

- Windows 10/11 (64-bit)
- **Node.js** (v18 or higher)
- **Docker Desktop for Windows**
- **Git for Windows**
- **Ollama for Windows**

### Setup

1.  **Clone the repository**:

    ```powershell
    git clone https://github.com/FikriAlfaraby/llm-maps-integration
    cd llm-maps-integration
    ```

2.  **Configure environment**:
    Copy the example file and add your **Google Maps API Key**.

    ```powershell
    Copy-Item .env.example .env
    notepad .env
    ```

3.  **Set Up the Application**:

    For more detailed instructions, including a manual setup guide, please refer to the **Windows Setup Guide** in our `docs/` folder.

4.  **Start the Application**

    Run the following scripts in two separate terminals to start the frontend and backend services.

    **Terminal 1: Backend**

    ```powershell
    cd backend
    npm run dev
    ```

    **Terminal 2: Frontend**

    ```powershell
    cd frontend
    npm start
    ```

### Access the Application

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000/api`
- **API Documentation**: `http://localhost:5000/api-docs`

---

## 📂 Project Structure

```
llm-maps-integration/
├── backend/            # Node.js backend services
├── frontend/           # React frontend application
├── docs/               # Documentation files (e.g., setup guides)
├── docker/             # Docker configurations
└── .env.example        # Environment variable template
```

---

## ⚙️ Configuration

The application's core settings are managed in the `.env` file. You can adjust the following variables:

```env
# Google Maps API key
Maps_API_KEY=your_api_key_here

# LLM model to use with Ollama
LLM_MODEL=mistral:7b-instruct-q4_0

# Ports for backend and frontend
PORT=5000
CLIENT_PORT=3000

# Redis connection details
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🚢 Deployment

For production deployments, the recommended approach is to use Docker Compose. This will build and run all services (backend, frontend, and Redis) as a single, coordinated stack.

```powershell
# Build and start all services in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```
