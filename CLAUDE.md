# Claude Code Instructions for Finauraa

## Project Overview

Finauraa is an AI-powered personal finance app for Bahrain with Open Banking integration (Tarabut Gateway), built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, and Supabase.

## Documentation Rules

**IMPORTANT**: When making code changes, always update the relevant documentation files:

| Change Type | Update File(s) |
|-------------|----------------|
| New/modified page | `docs/ARCHITECTURE.md` (Pages section) |
| New/modified component | `docs/ARCHITECTURE.md` (Components section) |
| New/modified AI rich card | `docs/ARCHITECTURE.md` (AI Rich Content Cards section) |
| New/modified dialog/sheet | `docs/ARCHITECTURE.md` (Dialogs, Sheets & Modals section) |
| New/modified API endpoint | `docs/ARCHITECTURE.md` (API Reference section) |
| Database schema changes | `docs/ARCHITECTURE.md` (Database Schema section) |
| New/modified hook | `docs/ARCHITECTURE.md` (Hooks section) |
| New/modified types | `docs/ARCHITECTURE.md` (Types section) |
| Design pattern changes | `docs/ARCHITECTURE.md` (Design Patterns section) |
| Pricing/feature changes | `docs/PRICING.md` and `README.md` |
| Compliance/consent changes | `docs/Openbanking_audit.md` |
| Major feature additions | `README.md` (Key Features section) |

**Update counts** when adding/removing:
- Pages (currently 20)
- Components (currently ~110)
- API endpoints (currently 60+)
- Database tables (currently 21)
- Hooks (currently 10)
- AI rich cards (currently 13)
- Dialogs/sheets (currently 18)

## Design Patterns to Follow

### Content Width
- `max-w-2xl` - List pages, settings pages
- `max-w-4xl` - Dashboard pages, analytics pages

### Grid Layouts
- 60/40 split: `lg:grid-cols-5` with `lg:col-span-3` (left) and `lg:col-span-2` (right)

### Skeleton Loaders
- Page-level: Pulse dots pattern
- Component-level: Match actual content structure

### Navigation Active State
- Desktop: `app-sidebar.tsx`
- Mobile: `dashboard-bottom-nav.tsx`
- Special case: `/dashboard/accounts` should also match `/dashboard`

### Bottom Padding
- Add `pb-24` to scrollable content for mobile bottom nav clearance

## Code Style

- Use Phosphor Icons (not Lucide)
- Use shadcn/ui components from `@/components/ui`
- Currency: BHD (3 decimal places) - use `formatCurrency()` from `lib/utils.ts`
- Date formatting: use `lib/date-utils.ts` utilities

## Key Files

| Purpose | File |
|---------|------|
| Feature limits | `lib/features.ts` |
| Currency formatting | `lib/utils.ts` |
| Date formatting | `lib/date-utils.ts` |
| AI context | `lib/ai/data-privacy.ts`, `lib/ai/finance-manager.ts` |
| Types | `lib/types.ts` |
| Rich content renderer | `components/chat/rich-content.tsx` |
| Desktop nav | `components/app-sidebar.tsx` |
| Mobile nav | `components/dashboard/dashboard-bottom-nav.tsx` |

## Testing Checklist

Before completing changes:
- [ ] Desktop layout works
- [ ] Mobile layout works (check bottom nav clearance)
- [ ] Skeleton loader matches content structure
- [ ] Navigation active states correct
- [ ] Documentation updated
