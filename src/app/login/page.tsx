import type { Metadata } from "next";
import AuthShell from "../auth/auth-shell";
import AuthForm from "../auth/auth-form";

export const metadata: Metadata = { title: "Sign in | Commerce Workspace" };

export default function LoginPage() {
  return (
    <AuthShell
      headline="Welcome "
      accent="back."
      summary="Your products, stock and orders are here."
      points={["Review orders", "Update your catalogue", "Manage your shop"]}
      shopLink
      compact
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
