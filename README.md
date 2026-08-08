# Enterprise Project Management System

A comprehensive, modern project management platform built with Next.js 16, Supabase, and TypeScript. Designed for teams to collaborate on projects, manage tasks, track progress, and maintain version history.

## Features

### Core Features (MVP - Phase 1)
- **Project Management**: Create, edit, delete projects with status tracking and progress monitoring
- **Task Management**: Full task lifecycle with parent-child hierarchy, priorities, and status tracking
- **User Management**: Role-based access control (RBAC) with 5 role levels
- **Organization Structure**: Company → Departments → Teams → Members hierarchy
- **Dashboard**: Overview of projects, tasks, and team statistics
- **Change Tracking**: Version history and audit logs for projects and tasks
- **Authentication**: Secure login with Google OAuth and email/password support

### Security Features
- Row-Level Security (RLS) policies for multi-tenant data isolation
- Password hashing handled by Supabase Auth
- No hardcoded secrets or API keys
- Audit trails for all changes
- Role-based permission system
- CORS-safe client initialization

### UI/UX
- Modern minimal design with clean layouts
- Responsive design (mobile, tablet, desktop)
- Sidebar navigation with collapsible menu
- Real-time form updates
- Intuitive dialogs for create/edit operations
- Color-coded status and priority indicators
- Progress tracking visualizations

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Validation**: Zod
- **Icons**: Lucide React

## Project Structure

```
/app
  /(auth)           - Authentication pages (login, register, callback)
  /(dashboard)      - Protected dashboard routes
    /projects       - Project list and management
    /tasks          - Global task view
    /teams          - Team management
    /settings       - User and organization settings
  /api/v1           - RESTful API endpoints

/lib
  /supabase         - Supabase client configuration
  /auth             - Authentication utilities
  /db               - Database query functions
  /schemas          - Zod validation schemas
  /types            - TypeScript type definitions
  /constants        - App constants (roles, statuses, colors)

/components
  /dashboard        - Dashboard components (sidebar, header)
  /projects         - Project-related components
  /tasks            - Task-related components
  /shared           - Shared UI components

/supabase
  /migrations       - Database migration scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd project-management
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup environment variables**
```bash
cp .env.local.example .env.local
```

Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Setup Supabase**
```bash
# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

5. **Start development server**
```bash
pnpm dev
```

Visit `http://localhost:3000` to access the application.

## Database Schema

### Core Tables
- **organizations** - Company/workspace root
- **departments** - Organization departments
- **teams** - Teams within departments
- **profiles** - User profile information
- **user_roles** - Role definitions (owner, manager, team_lead, member, guest)
- **permissions** - System permissions
- **role_permissions** - RBAC mapping
- **organization_members** - User membership in organizations
- **projects** - Project records
- **project_members** - Project team assignments
- **tasks** - Work items with hierarchy support
- **task_history** - Change audit trail for tasks
- **project_history** - Change audit trail for projects

### Key Features
- Soft delete support (deleted_at field)
- Version tracking and change counting
- Audit trails for all changes
- RLS policies for data isolation
- Indexes for common queries

## API Documentation

### Authentication
- `POST /api/v1/auth/login` - Email/password login
- `GET /api/v1/auth/callback` - OAuth callback handler
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PATCH /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Tasks
- `GET /api/v1/tasks` - List tasks (with projectId filter)
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task details
- `PATCH /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task

### Organizations
- `GET /api/v1/organizations/{id}/members` - List members
- `POST /api/v1/organizations/{id}/members` - Invite member

## Role-Based Access Control

### Roles & Permissions

**Owner**: Full access to all features
- Manage organization
- Manage departments and teams
- Manage all members
- Create/edit/delete projects
- Create/edit/delete tasks
- View reports and export data

**Manager**: Administrative permissions
- View members
- Manage teams
- Create/edit projects
- Manage project members
- Create/edit tasks
- Assign tasks
- View reports

**Team Lead**: Team management permissions
- View members
- Create/edit tasks
- Assign tasks
- View reports

**Member**: Regular user permissions
- View members
- Create/edit tasks
- View reports

**Guest**: Read-only access
- View members
- View reports

## Security Best Practices

1. **No Hardcoding**: All configuration is environment-based
2. **Password Hashing**: Supabase handles secure password management
3. **RLS Policies**: Database enforces access control
4. **Audit Trails**: All changes are logged and tracked
5. **Session Management**: Secure session handling via Supabase
6. **CORS Protection**: Properly configured CORS headers
7. **Input Validation**: Zod schemas validate all inputs
8. **Soft Delete**: Data is soft-deleted for recoverability

## Deployment

### Deploy to Vercel

1. **Connect GitHub repository**
```bash
# Push to GitHub
git push origin main
```

2. **Create Vercel project**
- Visit https://vercel.com/new
- Import your GitHub repository
- Add environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_URL`

3. **Deploy**
- Vercel will automatically detect Next.js and configure deployment
- Your app will be live at `https://your-app.vercel.app`

## Development Workflow

### Creating New Features
1. Create database schema via migrations
2. Add API routes in `/api/v1`
3. Create validation schemas in `/lib/schemas`
4. Add database queries in `/lib/db/queries`
5. Create UI components in `/components`
6. Connect components to API

### Running Migrations
```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations
supabase db push
```

### Viewing Logs
```bash
# Watch logs in development
pnpm dev

# View Vercel logs
vercel logs <project-name>
```

## Future Enhancements (Phase 2+)

- [ ] Bug/Issue tracking with severity levels
- [ ] Automated workflows and status transitions
- [ ] Advanced reporting and analytics
- [ ] Team velocity tracking and burndown charts
- [ ] File uploads and asset management
- [ ] Email notifications and reminders
- [ ] Real-time collaboration with WebSockets
- [ ] Mobile app (React Native)
- [ ] API rate limiting and caching
- [ ] Advanced permission customization
- [ ] Integration APIs (Slack, GitHub, etc.)
- [ ] Document management and versioning

## Troubleshooting

### Common Issues

**Login redirect loop**
- Check `NEXT_PUBLIC_APP_URL` environment variable
- Ensure callback URL is configured in Supabase

**RLS policy errors**
- Verify user is authenticated
- Check RLS policies in Supabase dashboard
- Ensure user has proper permissions

**Database connection errors**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project status
- Ensure database migrations have been run

**API 401 Unauthorized**
- Ensure valid authentication token in Authorization header
- Check session validity in Supabase

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Contact support team

## Roadmap

### Q1 2024
- Enhanced reporting dashboard
- Team performance metrics
- Bulk operations

### Q2 2024
- Mobile app (iOS/Android)
- Advanced workflow automation
- Third-party integrations

### Q3 2024
- AI-powered task recommendations
- Predictive analytics
- Advanced resource planning
