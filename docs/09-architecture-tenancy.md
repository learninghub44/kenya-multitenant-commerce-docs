# Architecture and Tenant Isolation

## Shape
Start with a modular monolith: web app, server-side domain services, Postgres, provider adapters, and background jobs only where needed. Split services only for a demonstrated reason.

## Tenant resolution
Normalize hostname, reject malformed hostnames, reserve platform/system slugs, and map hostname to active tenant on the server. For dashboard requests, authenticate user and verify active membership/permission. Never accept an untrusted tenant ID as authorization.

## Subdomains
Each store receives a slug subdomain. Confirm wildcard DNS, TLS certificates, and routing support on the selected hosting plan before committing. Prevent collisions, reserved names, and takeover of inactive slugs. Custom domains can be a later phase.

## Request flow
Resolve tenant → check tenant status → authenticate merchant actor where needed → authorize operation → execute domain operation with trusted tenant context → database RLS independently constrains rows → write audit/observability event without secrets.

## Boundaries
Public storefront reads published catalogue only. Merchant dashboard reads/writes tenant-owned resources by permission. Webhooks verify provider event and map it to a payment attempt server-side. Platform admin requires explicit role and audit. Background jobs carry tenant and system-actor context.

## Caching and failures
Use tenant-aware cache keys. Never cache authenticated tenant data as public content. Purge storefront cache on product publishing or price changes. Unknown/disabled tenants get safe unavailable/not-found pages. Provider/database failures must not return fake success or fake data.