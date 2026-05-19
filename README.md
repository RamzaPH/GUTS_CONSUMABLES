# GUTS Inventory Management System

A professional inventory management system for TESDA built with:
Frontend: React 19 + Vite + Tailwind CSS
Backend: Express.js + Sequelize ORM
Database: MySQL 8.0
Real-time: Socket.IO
Authentication: JWT + bcryptjs

## Features

User Management- Admin can create staff and admin accounts  
Real-time Notifications- Live updates on stock changes  
Activity Logs- Complete audit trail with pagination (10 items/page)  
Real-time Stock Updates - Instant quantity changes across dashboards  
Category Management - EIM, SMAW, CSS categories  
Archive System- Soft delete with restore capability  
PDF Reports - Export inventory records as PDF  
Dark Mode Ready - Professional dark red theme  

## Prerequisites

- Docker & Docker Compose
- Or Manually:
  - Node.js 18+ (Backend)
  - Node.js 22+ (Frontend)
  - MySQL 8.0

## Quick Start with Docker

```bash
# Clone the repository
git clone <your-repo-url>
cd Guts-Inventory

# Start all services
docker compose up -d

# Initialize default users (admin/admin123456, staff/staff123456)
docker compose exec backend npm run init-auth

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:5000/api
```

## Default Credentials

- **Admin**: `admin` / `admin123456`
- **Staff**: `staff` / `staff123456`

⚠️ **Change passwords after first login!**

## Manual Setup (Without Docker)

### Backend
```bash
cd Backend
npm install
# Create .env with DATABASE_URL, JWT_SECRET, etc
npm start
```

### Frontend
```bash
cd Frontend
npm install
npm run dev
```

### Database
Create MySQL database and run migrations (Sequelize will auto-sync models)

## Project Structure

```
Guts-Inventory/
├── Backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   └── server.js
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── api/
│   │   └── styles/
│   └── vite.config.js
├── docker-compose.yml
└── README.md
```

## Key Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (public)
- `POST /api/auth/admin/create-user` - Create user (admin only)
- `GET /api/auth/profile` - Get current user

### Inventory
- `GET /api/inventory` - Get all items grouped by category
- `GET /api/inventory/:category` - Get items by category
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `PATCH /api/inventory/:id/stock` - Update stock (in/out)
- `PATCH /api/inventory/:id/archive` - Archive item
- `PATCH /api/inventory/:id/restore` - Restore item

### History
- `GET /api/history` - Get activity logs
- `GET /api/history?itemId=:id` - Get logs for specific item

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read/all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## Real-time Socket.IO Events

**Server Emits:**
- `new_notification` - New activity notification
- `stock_updated` - Stock quantity changed

**Client Emits:**
- `user_connect` - Register user for notifications

## Development

### Running in Development Mode

```bash
# Terminal 1: Backend
cd Backend
npm run dev

# Terminal 2: Frontend
cd Frontend
npm run dev

# Terminal 3: MySQL (if running locally)
docker run -d \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=guts_inventory \
  -p 3306:3306 \
  mysql:8.0
```

### Building for Production

```bash
# Backend
cd Backend
npm run build

# Frontend
cd Frontend
npm run build
```

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=5000
DATABASE_URL=mysql://user:password@localhost:3306/guts_inventory
JWT_SECRET=your-secret-key-here
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Commit with clear messages
4. Push and create a merge request

## License

Property of The Vail Academy

## Support

For issues or questions, contact the development team.
