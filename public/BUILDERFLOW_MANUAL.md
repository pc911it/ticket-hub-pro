# BuilderFlow User Manual

## Complete Feature Documentation

**Version:** 1.0  
**Last Updated:** January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [User Portals](#user-portals)
4. [Project Management](#project-management)
5. [Sales & CRM](#sales--crm)
6. [Field Operations](#field-operations)
7. [Financial Management](#financial-management)
8. [Inventory & Resources](#inventory--resources)
9. [Communication & Support](#communication--support)
10. [Administration](#administration)
11. [Super Admin Features](#super-admin-features)

---

## Overview

BuilderFlow is a comprehensive construction and project management platform designed for contractors, builders, and service companies. It provides end-to-end management of projects, clients, employees, inventory, and billing.

### Key Capabilities
- Multi-tenant SaaS platform supporting multiple companies
- Role-based access control (Super Admin, Company Admin, Employee, Agent, Client)
- Real-time notifications and alerts
- Mobile-responsive design with native app support (iOS/Android)
- Integrated payment processing (Square/Stripe)

---

## Getting Started

### Authentication (`/auth`)
- **Email/Password Login** - Standard email and password authentication
- **Google Sign-In** - OAuth integration with Google accounts
- **Phone/SMS Login** - OTP-based authentication via phone number
- **Password Recovery** - Self-service password reset functionality
- **Password Strength Validation** - Real-time password strength indicator

### Company Registration (`/register-company`)
- Multi-step registration wizard
- Plan selection (subscription tiers)
- Seat/user allocation
- Promo code support for discounts
- Credit card setup with Square integration
- Business configuration options

### Account States
- **Pending Approval** (`/pending-approval`) - Waiting for admin approval
- **Upgrade Required** (`/upgrade`) - Subscription upgrade needed

---

## User Portals

### 1. Dispatcher Dashboard (`/admin`)
The main command center for dispatching and operations.

**Features:**
- Real-time call queue management
- Agent availability status
- Live map with agent locations
- Quick ticket creation
- Priority-based call routing
- Notification center

### 2. Client Dashboard (`/client`)
Self-service portal for clients to track their projects.

**Features:**
- Project overview and status
- Document access and downloads
- Invoice viewing and payment
- Change order approvals
- Direct messaging with project team
- Notification preferences
- Signature capture for approvals

### 3. Employee Portal (`/employee`)
Dedicated interface for company staff.

**Features:**
- Time tracking and clock in/out
- Assigned ticket management
- Team chat functionality
- Weekly/monthly time summaries
- Break tracking
- Personal task dashboard

### 4. Agent/Field Worker Portal (`/agent`)
Mobile-optimized interface for field technicians.

**Features:**
- Job queue and routing
- Material usage tracking
- Photo documentation
- Signature capture
- GPS check-in/check-out
- Barcode scanning
- Offline support

---

## Project Management

### Projects (`/admin/projects`)
Comprehensive project lifecycle management.

**Features:**
- Project creation and templates
- Status tracking (Active, On Hold, Completed)
- Client assignment
- Budget allocation
- Timeline management
- Team assignment

### Project Dashboard (`/admin/projects/:projectId`)
Detailed project overview with all related information.

**Includes:**
- Project milestones and Gantt charts
- Activity timeline
- Attached documents
- Project chat/comments
- Budget vs actual tracking
- Related tickets and work orders

### 3D Floor Plans (`/admin/floor-plans`)
Interactive floor plan management.

**Features:**
- 3D model viewer (Three.js)
- Floor plan uploads
- Interactive annotations
- AI-powered takeoff sessions
- Measurement tools

### Construction Plans (`/admin/plans`)
Document management for construction drawings.

**Features:**
- Plan set uploads
- Version control
- Markup tools
- Distribution tracking

### Mood Boards (`/admin/mood-boards`)
Visual design collaboration.

**Features:**
- Image collections
- Client presentation mode
- Design inspiration boards

---

## Sales & CRM

### Leads Management (`/admin/leads`)
Track potential customers from first contact to conversion.

**Features:**
- Lead capture forms
- Status pipeline (New, Contacted, Qualified, Won, Lost)
- Follow-up scheduling
- Source tracking
- Conversion analytics

### Bids (`/admin/bids`)
Proposal and estimate generation.

**Features:**
- Bid creation with line items
- Pricing templates
- Client approval workflow
- Internal approval process
- Convert to invoice functionality
- Bid attachments
- Activity logging

### Estimates (`/admin/client-billing`)
Formal cost estimates for clients.

**Features:**
- Line item breakdown
- Valid until dates
- Email delivery
- Accept/decline tracking
- Convert to invoice

### Contracts (`/admin/contracts`)
Digital contract management.

**Features:**
- Contract templates
- E-signature capture
- Client and company signatures
- Status tracking (Draft, Sent, Viewed, Signed)
- Document attachments

### Follow-Ups (`/admin/follow-ups`)
Automated and manual reminder system.

**Features:**
- Task reminders
- Client follow-ups
- Lead nurturing
- Warranty expiration alerts
- Priority levels
- Snooze functionality

---

## Field Operations

### Tickets (`/admin/tickets`)
Service ticket and work order management.

**Features:**
- Ticket creation and assignment
- Priority levels (Low, Normal, High, Urgent)
- Status workflow
- Time tracking
- Photo attachments
- Customer communication

### Work Orders (`/admin/work-orders`)
Detailed work order management.

**Features:**
- Job specifications
- Material requirements
- Labor allocation
- PDF generation
- Client signatures
- Completion tracking

### Daily Logs (`/admin/daily-logs`)
Construction daily reporting.

**Features:**
- Weather conditions
- Crew tracking
- Work performed documentation
- Materials used
- Equipment on site
- Visitor logs
- Photo documentation
- Safety incidents
- Approval workflow

### Punch Lists (`/admin/punch-lists`)
Pre-completion deficiency tracking.

**Features:**
- Item-by-item tracking
- Photo evidence
- Assignment to trades
- Completion verification
- Status filtering

### Inspections (`/admin/inspections`)
Quality control and inspection management.

**Features:**
- Inspection scheduling
- Checklist templates
- Pass/fail tracking
- Photo documentation
- Inspector assignment
- Reinspection scheduling

### RFIs (Requests for Information) (`/admin/rfis`)
Project clarification management.

**Features:**
- RFI creation and numbering
- Assignee tracking
- Response deadlines
- Status workflow
- Reference to drawings/specs
- Response history

### Submittals (`/admin/submittals`)
Material and product approval tracking.

**Features:**
- Submittal packages
- Approval workflow
- Revision tracking
- Specification references
- Contractor assignments

### Permits (`/admin/permits`)
Building permit management.

**Features:**
- Permit applications
- Inspection scheduling
- Expiration tracking
- Document uploads
- Status monitoring

### Change Orders (`/admin/change-orders`)
Project modification management.

**Features:**
- Change request documentation
- Cost impact calculation
- Schedule impact days
- Client approval workflow
- Signature capture
- Convert from RFIs

---

## Financial Management

### Client Billing (`/admin/client-billing`)
Invoice and payment management.

**Features:**
- Invoice creation
- Line item management
- Payment tracking
- Email delivery
- Payment reminders
- Square/Stripe integration
- Recurring billing

### Invoices
**Features:**
- Custom invoice numbering
- Due date tracking
- Partial payments
- Late fee calculation
- PDF generation
- Email delivery
- Payment status

### Estimates
**Features:**
- Estimate creation
- Expiration dates
- Accept/decline tracking
- Convert to invoice
- Line item templates

### Billing Settings (`/admin/billing`)
Company subscription and billing management.

**Features:**
- Subscription plan management
- Payment method updates
- Billing history
- Usage tracking
- Plan upgrades

### Payment Settings (`/admin/payment-settings`)
Payment gateway configuration.

**Features:**
- Square integration setup
- Stripe integration setup
- Environment selection (Sandbox/Production)
- Location/merchant settings

### Budgeting (`/admin/budgeting`)
Project budget management.

**Features:**
- Budget creation per project
- Line item categories
- Estimated vs actual tracking
- Cost codes
- Variance analysis

### Cost Calculator (`/admin/cost-calculator`)
Estimation and pricing tools.

**Features:**
- Cost templates
- Labor rate calculations
- Material pricing
- Markup percentages
- Crew size factors

---

## Inventory & Resources

### Inventory Management (`/admin/inventory`)
Stock and materials tracking.

**Features:**
- Item catalog with SKUs
- Stock levels and alerts
- Category organization
- Barcode support
- Location tracking
- Reorder points
- Unit conversions

### Inventory Reports (`/admin/inventory/reports`)
Stock analysis and reporting.

**Features:**
- Stock level reports
- Usage trends
- Low stock alerts
- Value calculations
- Export functionality

### Purchase Orders (`/admin/inventory/orders`)
Procurement management.

**Features:**
- PO creation
- Supplier selection
- Line items
- Approval workflow
- Receipt tracking
- Email to suppliers

### Suppliers (`/admin/inventory/suppliers`)
Vendor management.

**Features:**
- Supplier directory
- Contact information
- Payment terms
- Order history
- Performance tracking

### Product Library (`/admin/product-library`)
Master product catalog.

**Features:**
- Product database
- Specifications
- Pricing tiers
- Image gallery
- Category hierarchy

### Equipment (`/admin/equipment`)
Asset and equipment management.

**Features:**
- Equipment registry
- Vehicle tracking (VIN, license plates)
- Service schedules
- Maintenance logs
- Fuel tracking
- Insurance expiry
- Assignment to projects

### Subcontractors (`/admin/subcontractors`)
Trade partner management.

**Features:**
- Subcontractor directory
- Trade classifications
- Insurance tracking
- Rating/reviews
- Assignment history

### Selections (`/admin/selections`)
Client selection and allowance tracking.

**Features:**
- Selection categories
- Allowance budgets
- Client choices
- Approval workflow
- Overage/underage tracking

### Warranties (`/admin/warranties`)
Warranty management system.

**Features:**
- Warranty registration
- Expiration tracking
- Claim management
- Follow-up reminders
- Document storage

---

## Communication & Support

### Calendar (`/admin/calendar`)
Scheduling and appointments.

**Features:**
- Event creation
- Team calendars
- Client appointments
- Project milestones
- Reminder notifications
- Calendar integration

### Notifications (`/admin/notifications`)
Central notification hub.

**Features:**
- Real-time alerts
- Push notifications
- Email notifications
- In-app notifications
- Notification preferences

### Updates (`/admin/updates`)
Project update broadcasting.

**Features:**
- Status updates
- Team announcements
- Client notifications
- Update history

### Chat Tickets (`/admin/chat-tickets`)
Integrated messaging and ticketing.

**Features:**
- Ticket creation from chats
- Threaded conversations
- File attachments
- Status tracking

### Live Support Chats (`/admin/live-chats`)
Real-time customer support.

**Features:**
- Live chat widget
- Visitor information
- Chat history
- Canned responses
- Transfer capabilities

### Support Tickets (`/admin/support-tickets`)
Internal support system.

**Features:**
- Ticket submission
- Priority levels
- Assignment routing
- Resolution tracking
- SLA monitoring

### Company Support (`/admin/support`)
Company-specific support access.

**Features:**
- Help requests
- Documentation access
- Training resources

---

## Administration

### Employees (`/admin/employees`)
Staff management.

**Features:**
- Employee directory
- Role assignments
- Contact information
- Status (Active/Inactive)
- Permission management

### Users (`/admin/users`)
User account administration.

**Features:**
- User creation
- Role assignment
- Access control
- Password resets
- Activity logs

### Clients (`/admin/clients`)
Customer relationship management.

**Features:**
- Client directory
- Contact information
- Project associations
- Communication history
- Portal access management

### Time Reports (`/admin/time-reports`)
Employee time tracking.

**Features:**
- Time entry review
- Approval workflow
- Payroll integration
- Overtime tracking
- Export capabilities

### Service Types (`/admin/service-types`)
Service catalog management.

**Features:**
- Service definitions
- Pricing configuration
- Active/inactive status
- Category organization

### Company Settings (`/admin/settings`)
Organization configuration.

**Features:**
- Company profile
- Logo and branding
- Business settings
- Partnership management
- Feature toggles

### Trash (`/admin/trash`)
Deleted items recovery.

**Features:**
- Soft-deleted records
- Restore functionality
- Permanent deletion
- Multi-entity support

---

## Super Admin Features

*Available only to platform administrators*

### Super Admin Dashboard (`/admin/super-dashboard`)
Platform-wide overview.

**Features:**
- Company count and statistics
- Revenue metrics
- Active user counts
- System health monitoring
- Recent registrations

### Company Approvals (`/admin/company-approvals`)
New company verification.

**Features:**
- Pending company review
- Approval/rejection workflow
- Company details verification
- Notes and communication

### Create Company (`/admin/create-company`)
Manual company creation.

**Features:**
- Direct company setup
- Owner assignment
- Plan selection
- Promo code application

### Platform Billing (`/admin/platform-billing`)
Platform-wide financial overview.

**Features:**
- Revenue by company
- Subscription analytics
- Payment status overview
- Billing history
- Plan distribution charts

### Promo Codes (`/admin/promo-codes`)
Promotional code management.

**Features:**
- Code generation
- Discount types (percentage/fixed)
- Trial extensions
- Usage limits
- Expiration dates
- Usage tracking

### Company Features (`/admin/company-features`)
Feature flag management.

**Features:**
- Per-company feature enablement
- Usage limits
- Override defaults
- Plan-based features

---

## Technical Features

### Security
- Row-level security (RLS) on all data
- Role-based access control
- Session timeout management
- Password strength requirements
- Rate limiting on authentication

### Integrations
- **Square** - Payment processing
- **Stripe** - Alternative payment processing
- **Mapbox** - Location and mapping
- **Twilio** - SMS and phone verification

### Real-time Features
- Live notifications
- Real-time chat
- Agent location tracking
- Instant data synchronization

### Mobile Support
- Responsive web design
- iOS native app (via Capacitor)
- Android native app (via Capacitor)
- Offline capabilities

### File Management
- Document uploads
- Image compression
- PDF generation
- Barcode scanning
- Signature capture

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `Ctrl/Cmd + K` |
| New Ticket | `Ctrl/Cmd + N` |
| Save | `Ctrl/Cmd + S` |

---

## Support

For assistance, use the support chat widget available on every page or submit a support ticket through the admin panel.

---

*BuilderFlow - Construction Management Made Simple*
