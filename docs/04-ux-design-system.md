# UX and Design System

## Direction
A calm, practical retail workspace rather than a generic analytics dashboard. Use neutral surfaces, clear typography, subtle borders, restrained accent color, purposeful spacing, and minimal decoration. Avoid excessive gradients and emoji-based navigation.

## Layout
Mobile: clear page title, one primary action, bottom navigation for frequent areas, filter sheets, sticky checkout action where useful. Desktop: sidebar, context bar, readable content width, useful table density, and detail panels where they reduce navigation. Storefront: search, category browsing, clear product cards, visible delivery/payment information, and short checkout.

## Interaction
Confirm destructive actions and explain consequences. Preserve form inputs after recoverable failures. Provide actionable validation errors. Lists need search, filters, pagination, and empty states. Never communicate success before server confirmation. Payment and inventory status must not be optimistic guesses.

## Accessibility and performance
Target WCAG 2.2 AA where practical. Use semantic headings, associated labels, keyboard navigation, visible focus, accessible status announcements, reduced-motion support, optimized responsive images, and pagination. Provide loading, empty, error, success, and permission-denied states.

## Dashboard navigation
Desktop workspaces use a persistent role-filtered sidebar and a context bar. On mobile, keep the sidebar available as an accessible drawer and expose a compact bottom navigation for the most-used destinations. Always show the current destination, preserve keyboard focus visibility, support Escape to close the drawer, and account for device safe areas.
