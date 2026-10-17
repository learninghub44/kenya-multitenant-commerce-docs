# Authentication

Sign-in options on `/auth`: Google, email and password, and passwordless email link. New accounts collect full name and an optional Kenyan phone number (stored in Supabase user metadata, normalised to `+254…`).

## Routes
- `/auth` create account, sign in, email link.
- `/auth/forgot-password` and `/auth/reset-password` password reset. The forgot form answers the same way whether or not the email has an account.
- `/auth/callback` completes Google sign-in, email confirmation, magic links and reset links (PKCE `code` or `token_hash`). The `next` parameter is accepted only as a same-origin path.

## Supabase setup (hosted project)
1. Authentication > URL Configuration: set Site URL to your root app URL and add Redirect URLs: `https://<root-domain>/auth/callback` and `http://localhost:3000/auth/callback`.
2. Authentication > Providers > Google: enable it and paste the OAuth client ID and secret.
3. Google Cloud Console > Credentials > OAuth client (Web): add the authorized redirect URI shown in the Supabase Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`).
4. Authentication > Providers > Email: keep "Confirm email" on and set the password minimum length to 8.
5. Optionally configure custom SMTP (for example Resend) so confirmation and reset emails are not rate-limited by the default sender.

Sign-in always happens on the root domain, never on store subdomains, so session cookies are not shared with storefronts.

## Not included
Apple sign-in and phone/SMS OTP need paid developer accounts or an SMS provider and are not enabled.
