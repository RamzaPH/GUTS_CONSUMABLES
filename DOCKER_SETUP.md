# Docker Setup Guide para sa Guts Inventory

## Prerequisites
- Docker installed (https://www.docker.com/products/docker-desktop)
- Docker Compose (kasama na sa Docker Desktop)

## Quick Start

### 1. Clone o navigate sa project folder
```bash
cd path/to/Guts-Inventory
```

### 2. I-build at i-run ang containers
```bash
docker compose up --build
```

Hintayin hanggang makita mo:
- MySQL running
- Backend running sa port 5000
- Frontend running sa port 80

### 3. Access ang application
- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Direct Backend**: http://localhost:5000

## Mga Useful Commands

### Build containers
```bash
docker compose build
```

### Run in background
```bash
docker compose up -d
```

### Stop containers
```bash
docker compose down
```

### View logs
```bash
docker compose logs -f
```

### View specific service logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql
```

### Access MySQL
```bash
docker exec -it guts_mysql mysql -u guts_user -p guts_db
# Password: guts_password
```

### Run seed script
```bash
docker exec -it guts_backend npm run seed
```

## Database Configuration
- **Host**: mysql (from 'backend' container)
- **Host**: localhost:3306 (from your PC)
- **Database**: guts_db
- **User**: guts_user
- **Password**: guts_password

## Troubleshooting

### Port already in use
```bash
# Change ports sa docker-compose.yml
# Para sa MySQL: "3307:3306"
# Para sa Backend: "5001:5000"
# Para sa Frontend: "8080:80"
```

### Database connection error
```bash
# Make sure MySQL service is healthy
docker compose ps

# Restart services
docker compose restart
```

### Changes not reflected
```bash
# Rebuild lang
docker compose up --build
```

## Production Notes
- Baguhin ang passwords sa `docker-compose.yml`
- Set `CORS_ORIGIN` sa actual domain mo kapag maglalagay ka na ng custom domain
- Use volume mounting para sa data persistence
- Add logging configuration

## Tailscale Deployment
1. Install Tailscale on the host machine and authenticate it into your tailnet.
2. Start the Docker stack with `docker compose up -d --build`.
3. Verify Tailscale is running with `tailscale status`.
4. Access the app locally at `http://localhost`.
5. From another tailnet device, open `http://<host-tailscale-ip>/`.
6. If desired, expose the service through Tailscale using `tailscale serve http://localhost:80`.

> Note: Docker is already binding the frontend to port 80, so the host Tailscale IP can serve the app directly.
