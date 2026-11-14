import type { Metadata } from "next";
import AuthShell from "../auth/auth-shell";
import AuthForm from "../auth/auth-form";

export const metadata: Metadata = { title: "Create an account | Commerce Workspace" };

export default function RegisterPage() {
  return (
    <AuthShell
      headline="Your business, "
      accent="one workspace."
      summary="Manage your shop and daily operations in one place."
      points={["Publish your products", "Track stock and orders", "Work with your team"]}
      shopLink
      compact
    >
      <AuthForm variant="register" />
    </AuthShell>
  );
}
