# Windows Setup Guide - LLM Maps Integration

## Prerequisites

### System Requirements

- Windows 10/11 (64-bit)
- Minimum 8GB RAM (16GB recommended)
- 20GB free disk space
- Internet connection

### Required Software

1. **Node.js** (v18 or higher)
2. **Docker Desktop for Windows**
3. **Git for Windows**
4. **Ollama for Windows**

## Quick Start

### 1. Clone Repository

````powershell
git clone <repository-url>
cd llm-maps-integration
``` {data-source-line="2306"}

### 2. Configure Environment
```powershell
Copy-Item .env.example .env
# Edit .env with your Google Maps API key {#edit-env-with-your-google-maps-api-key  data-source-line="2311"}
notepad .env
``` {data-source-line="2313"}

### 3. Run Setup Script
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup.ps1
``` {data-source-line="2319"}

### 4. Start Application
```powershell
.\scripts\start.ps1
``` {data-source-line="2324"}

### 5. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- API Documentation: http://localhost:5000/api-docs

## Manual Setup

### Step 1: Install Chocolatey
```powershell
# Run as Administrator {#run-as-administrator  data-source-line="2335"}
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
``` {data-source-line="2339"}

### Step 2: Install Dependencies
```powershell
choco install nodejs-lts git vscode -y
npm install -g yarn
``` {data-source-line="2345"}

### Step 3: Install Docker Desktop
1. Download from: https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe
2. Run installer and follow instructions
3. Enable WSL 2 backend when prompted

### Step 4: Install Ollama
1. Download from: https://ollama.ai/download/windows
2. Install and run Ollama
3. Download model:
```powershell
ollama pull mistral:7b-instruct-q4_0
``` {data-source-line="2358"}

### Step 5: Start Redis
```powershell
docker run --name redis -p 6379:6379 -d redis:alpine
``` {data-source-line="2363"}

### Step 6: Install Project Dependencies
```powershell
# Backend {#backend  data-source-line="2367"}
cd backend
npm install

# Frontend {#frontend  data-source-line="2371"}
cd ..\frontend
npm install
``` {data-source-line="2374"}

### Step 7: Start Services
```powershell
# Terminal 1: Backend {#terminal-1-backend  data-source-line="2378"}
cd backend
npm run dev

# Terminal 2: Frontend {#terminal-2-frontend  data-source-line="2382"}
cd frontend
npm start
``` {data-source-line="2385"}

## Configuration

### Google Maps API Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Create API key and restrict it
5. Add key to `.env` file

### Environment Variables
Edit `.env` file with your configuration:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
LLM_MODEL=mistral:7b-instruct-q4_0
REDIS_HOST=localhost
PORT=5000
``` {data-source-line="2407"}

## Troubleshooting

### Docker not starting
- Ensure virtualization is enabled in BIOS
- Enable Hyper-V and WSL 2 features
- Restart computer after installation

### Ollama not responding
```powershell
# Check if Ollama is running {#check-if-ollama-is-running  data-source-line="2418"}
ollama list

# Restart Ollama {#restart-ollama  data-source-line="2421"}
Stop-Process -Name ollama -Force
Start-Process ollama serve
``` {data-source-line="2424"}

### Port already in use
```powershell
# Find process using port {#find-process-using-port  data-source-line="2428"}
netstat -ano | findstr :5000

# Kill process by PID {#kill-process-by-pid  data-source-line="2431"}
taskkill /PID <PID> /F
``` {data-source-line="2433"}

### Redis connection failed
```powershell
# Check if Redis container is running {#check-if-redis-container-is-running  data-source-line="2437"}
docker ps

# Start Redis if not running {#start-redis-if-not-running  data-source-line="2440"}
docker start redis
``` {data-source-line="2442"}

## Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- Thunder Client (API testing)
- Docker
- GitLens

### Testing
```powershell
# Run backend tests {#run-backend-tests  data-source-line="2456"}
cd backend
npm test

# Run frontend tests {#run-frontend-tests  data-source-line="2460"}
cd frontend
npm test

# Run system tests {#run-system-tests  data-source-line="2464"}
.\scripts\test.ps1
``` {data-source-line="2466"}

### Monitoring
```powershell
# Monitor all services {#monitor-all-services  data-source-line="2470"}
.\scripts\monitor.ps1

# View logs {#view-logs  data-source-line="2473"}
docker logs llm-maps-backend
docker logs llm-maps-redis
``` {data-source-line="2476"}

## Production Deployment

### Using Docker Compose
```powershell
# Build and start all services {#build-and-start-all-services  data-source-line="2482"}
docker-compose up -d

# Stop all services {#stop-all-services  data-source-line="2485"}
docker-compose down

# View logs {#view-logs-1  data-source-line="2488"}
docker-compose logs -f
``` {data-source-line="2490"}

### Environment-specific configs
- Development: `.env.development`
- Production: `.env.production`
- Testing: `.env.test`

## Performance Optimization

### Windows-specific optimizations
1. Exclude project folders from Windows Defender scanning
2. Use WSL 2 for better Docker performance
3. Allocate sufficient resources to Docker Desktop
4. Enable developer mode in Windows settings

### Resource allocation
Docker Desktop Settings:
- CPUs: 4+
- Memory: 4GB+
- Swap: 1GB
- Disk image size: 20GB+
Update main README (README.md):
# LLM Maps Integration - React + Node.js + Windows

A local LLM-powered system for finding places using natural language queries, built with React frontend and Node.js backend, optimized for Windows development.

## 🚀 Features

- **AI-Powered Search**: Natural language processing via local LLM (Mistral/Llama)
- **Google Maps Integration**: Real-time place search and validation
- **React Frontend**: Modern, responsive UI with Material-UI
- **Node.js Backend**: Fast, scalable API with Express
- **Redis Caching**: Improved performance with intelligent caching
- **Windows Optimized**: Native Windows support with PowerShell scripts
- **TypeScript**: Type-safe frontend development
- **Docker Support**: Easy deployment and scaling

## 📋 Prerequisites

### Windows System Requirements
- Windows 10/11 (64-bit)
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space
- WSL 2 enabled (for Docker)

### Required Software
- Node.js 18+
- Docker Desktop for Windows
- Git for Windows
- Ollama for Windows

## 🛠️ Quick Start

### 1. Clone Repository
```powershell
git clone <repository-url>
cd llm-maps-integration
``` {data-source-line="2550"}

### 2. Configure Environment
```powershell
Copy-Item .env.example .env
# Edit .env with your Google Maps API key {#edit-env-with-your-google-maps-api-key-1  data-source-line="2555"}
``` {data-source-line="2556"}

### 3. Run Setup
```powershell
.\scripts\setup.ps1
``` {data-source-line="2561"}

### 4. Start Application
```powershell
.\scripts\start.ps1
``` {data-source-line="2566"}

### 5. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## 🏗️ Architecture

┌─────────────┐ ┌──────────────┐ ┌─────────────┐
│ React │────▶│ Node.js │────▶│ Local LLM │
│ Frontend │◀────│ Backend │ │ (Ollama) │
│ (3000) │ │ (5000) │ │ (11434) │
└─────────────┘ └──────────────┘ └─────────────┘
│
▼
┌──────────────┐ ┌─────────────┐
│ Redis │ │ Google Maps │
│ Cache │ │ API │
│ (6379) │ └─────────────┘
└──────────────┘

## 📁 Project Structure

llm-maps-integration/
├── backend/ # Node.js backend
│ ├── src/
│ │ ├── config/ # Configuration files
│ │ ├── controllers/ # Route controllers
│ │ ├── services/ # Business logic
│ │ ├── middleware/ # Express middleware
│ │ ├── routes/ # API routes
│ │ └── server.js # Main server file
│ ├── tests/ # Backend tests
│ └── package.json
│
├── frontend/ # React frontend
│ ├── src/
│ │ ├── components/ # React components
│ │ ├── services/ # API services
│ │ ├── types/ # TypeScript types
│ │ └── App.tsx # Main app component
│ ├── public/
│ └── package.json
│
│
├── docker/ # Docker configurations
├── docs/ # Documentation
└── .env.example # Environment template

## 🔧 Configuration

### Environment Variables
```env
# Google Maps {#google-maps  data-source-line="2629"}
GOOGLE_MAPS_API_KEY=your_api_key_here

# LLM Configuration {#llm-configuration  data-source-line="2632"}
LLM_PROVIDER=ollama
LLM_MODEL=mistral:7b-instruct-q4_0

# Server Ports {#server-ports  data-source-line="2636"}
PORT=5000
CLIENT_PORT=3000

# Redis {#redis  data-source-line="2640"}
REDIS_HOST=localhost
REDIS_PORT=6379
``` {data-source-line="2643"}

## 🧪 Testing

### Run Tests
```powershell
# System tests {#system-tests  data-source-line="2649"}
.\scripts\test.ps1

# Backend tests {#backend-tests  data-source-line="2652"}
cd backend && npm test

# Frontend tests {#frontend-tests  data-source-line="2655"}
cd frontend && npm test
``` {data-source-line="2657"}

### Monitor Services
```powershell
.\scripts\monitor.ps1
``` {data-source-line="2662"}

## 📊 API Documentation

### Endpoints

#### POST /api/query
Search for places based on natural language query
```json
{
  "prompt": "Find ramen restaurants in Bandung",
  "user_location": { "lat": -6.9667, "lng": 107.6073 },
  "max_results": 5,
  "use_cache": true
}
``` {data-source-line="2677"}

#### GET /api/place/:placeId
Get detailed information about a specific place

#### POST /api/nearby
Search for nearby places
```json
{
  "location": { "lat": -6.9667, "lng": 107.6073 },
  "place_type": "restaurant",
  "radius": 1000
}
``` {data-source-line="2690"}

## 🚢 Deployment

### Using Docker
```powershell
# Build and run with Docker Compose {#build-and-run-with-docker-compose  data-source-line="2696"}
docker-compose up -d

# Stop services {#stop-services  data-source-line="2699"}
docker-compose down
``` {data-source-line="2701"}

### Manual Deployment
See [Windows Setup Guide](docs/SETUP_WINDOWS.md) for detailed instructions.

## 🔐 Security

- API keys stored in environment variables
- Server-side only Google Maps API calls
- Rate limiting implemented
- Input validation and sanitization
- CORS configured for frontend origin

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check [Troubleshooting Guide](docs/SETUP_WINDOWS.md#troubleshooting)
- Open an issue on GitHub
- Contact support team

## 🎯 Roadmap

- [ ] Add more LLM model options
- [ ] Implement user authentication
- [ ] Add voice input support
- [ ] Create mobile app version
- [ ] Add multilingual support
- [ ] Implement advanced caching strategies
- [ ] Add real-time collaboration features

## 👥 Team

- Backend Development: Node.js/Express
- Frontend Development: React/TypeScript
- LLM Integration: Ollama/Mistral
- Maps Integration: Google Maps Platform

---

Built with ❤️ for Windows developers
````
