# Document Management System (DMS)

A comprehensive, enterprise-grade Document Management System built with Next.js, MySQL, and modern web technologies.

## Features

### Core Features
- **User Authentication**: Email/password authentication with NextAuth.js
- **RBAC (Role-Based Access Control)**: Admin, Manager, Editor, Viewer roles
- **Document Upload**: Single and bulk upload with metadata support
- **Document Preview**: PDF, images, office files via viewer
- **Versioning**: Complete version history with rollback capability
- **Document Workflow**: Assign documents with tracking until completion
- **Check-in/Check-out**: Document locking mechanism
- **Full-text Search**: Meilisearch integration with OCR text
- **OCR Processing**: Background OCR job for searchable documents
- **Audit Log**: Complete activity history tracking
- **File Integrity**: SHA-256 hashing for all documents
- **Virus Scanning**: ClamAV integration for malware detection
- **Notifications**: Email and webhook notifications
- **Shareable Links**: Expiring share links with password protection

### Technical Stack
- **Frontend**: Next.js 14 with React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MySQL with Prisma ORM
- **Search**: Meilisearch
- **Queue**: BullMQ with Redis
- **File Storage**: Local filesystem
- **OCR**: Tesseract OCR
- **Virus Scan**: ClamAV

## Project Structure

```
dms-nextjs/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── documents/     # Document CRUD, upload, download
│   │   │   ├── workflows/     # Workflow management
│   │   │   ├── search/        # Full-text search
│   │   │   └── ...
│   │   ├── (auth)/           # Auth pages (login, register)
│   │   └── (dashboard)/      # Protected dashboard pages
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   └── layout/           # Layout components
│   ├── lib/
│   │   ├── auth.ts           # Authentication utilities
│   │   ├── prisma.ts         # Database client
│   │   ├── storage.ts        # File storage utilities
│   │   ├── search.ts         # Meilisearch integration
│   │   ├── queue.ts          # BullMQ job queue
│   │   ├── ocr.ts            # OCR processing
│   │   ├── virus-scan.ts     # ClamAV integration
│   │   └── ...
│   ├── types/                # TypeScript types
│   └── workers/              # Background job workers
├── docker/                   # Docker configurations
├── Dockerfile               # Production Dockerfile
├── Dockerfile.worker        # Worker Dockerfile
└── docker-compose.yml       # Local development setup
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- MySQL 8.0 (or use Docker)
- Redis (or use Docker)

### Local Development

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd dms-nextjs
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker Compose**:
```bash
docker-compose up -d mysql redis meilisearch
```

4. **Run database migrations**:
```bash
npx prisma migrate dev
npx prisma db seed  # Optional: seed with sample data
```

5. **Start the development server**:
```bash
npm run dev
```

6. **Access the application**:
- Application: http://localhost:3000
- Meilisearch: http://localhost:7700

### Full Docker Deployment

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Run migrations inside the container
docker-compose exec app npx prisma migrate deploy
```

## API Examples

### Authentication

**Register a new user**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Doe"
  }'
```

### Document Upload

```bash
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/document.pdf" \
  -F "title=My Document" \
  -F "description=Document description" \
  -F "documentType=CONTRACT"
```

### Document Download

```bash
curl -X GET http://localhost:3000/api/documents/<id>/download \
  -H "Authorization: Bearer <token>" \
  -o document.pdf
```

### Search Documents

```bash
curl -X GET "http://localhost:3000/api/search?q=contract&type=CONTRACT" \
  -H "Authorization: Bearer <token>"
```

## Coolify Deployment

### Step 1: Create a New Service

1. Log in to your Coolify dashboard
2. Click "New Service" → "Docker Compose"
3. Connect your Git repository

### Step 2: Configure Environment Variables

Add the following environment variables in Coolify:

```
DATABASE_URL=mysql://user:password@mysql:3306/dms
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secret-key-min-32-chars
MEILISEARCH_API_KEY=your-meilisearch-master-key
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_PASSWORD=your-db-password
```

### Step 3: Configure Volumes

Ensure persistent volumes are configured for:
- MySQL data: `/var/lib/mysql`
- Redis data: `/data`
- Meilisearch data: `/meili_data`
- Upload data: `/data/uploads`

### Step 4: Configure Domain

1. Set up your domain in Coolify
2. Enable HTTPS with automatic SSL
3. Update `NEXTAUTH_URL` to match your domain

### Step 5: Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Run database migrations:
   ```bash
   coolify exec dms-app -- npx prisma migrate deploy
   ```

## Security Recommendations

1. **Environment Variables**:
   - Use strong, unique secrets for `NEXTAUTH_SECRET`
   - Rotate database passwords regularly
   - Never commit `.env` files to version control

2. **Network Security**:
   - Use HTTPS in production
   - Configure firewall rules
   - Use internal Docker networks

3. **Access Control**:
   - Implement IP whitelisting for admin access
   - Enable 2FA for admin accounts (future feature)
   - Regular audit log review

4. **Data Protection**:
   - Enable encryption at rest for MySQL
   - Use encrypted volumes for file storage
   - Regular security scans with ClamAV

## Backup Strategy

### Database Backup

```bash
# Manual backup
docker-compose exec mysql mysqldump -u root -p dms > backup.sql

# Automated daily backup (add to crontab)
0 2 * * * docker-compose exec -T mysql mysqldump -u root -p dms | gzip > /backups/dms-$(date +\%Y\%m\%d).sql.gz
```

### File Storage Backup

```bash
# Sync uploads to backup location
rsync -avz /data/uploads/ /backup/uploads/

# Or use Docker volume backup
docker run --rm -v dms_upload_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
```

## Scaling Recommendations

1. **Horizontal Scaling**:
   - Deploy multiple app containers behind a load balancer
   - Use Redis for session storage (already configured)
   - Use managed MySQL with read replicas

2. **Storage Scaling**:
   - Migrate to object storage (S3, MinIO) for large deployments
   - Implement CDN for static assets

3. **Search Scaling**:
   - Deploy Meilisearch cluster for high availability
   - Consider Elasticsearch for very large datasets

4. **Background Jobs**:
   - Scale worker containers independently
   - Monitor queue depths and adjust concurrency

## Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:3000/api/health

# Service-specific checks
curl http://localhost:7700/health  # Meilisearch
redis-cli ping                      # Redis
mysqladmin ping                     # MySQL
```

### Recommended Monitoring Stack

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **Loki**: Log aggregation

## Database Schema

The system uses the following main entities:
- **Users**: Authentication and authorization
- **Documents**: File metadata and content
- **DocumentVersions**: Version history
- **Folders**: Document organization
- **Tags**: Categorization
- **Workflows**: Document approval processes
- **AuditLogs**: Activity tracking
- **Notifications**: User alerts
- **ShareLinks**: External sharing

## License

MIT License - See LICENSE file for details.

## Support

For issues and feature requests, please open an issue on GitHub.
