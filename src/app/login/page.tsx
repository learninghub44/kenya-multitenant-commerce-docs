import type { Metadata } from "next";
import AuthShell from "../auth/auth-shell";
import AuthForm from "../auth/auth-form";

export const metadata: Metadata = { title: "Sign in — Commerce Workspace" };

export default function LoginPage() {
  return (
    <AuthShell
      headline="Your shop is "
      accent="open for business."
      summary="Pick up where you left off: products, stock and new orders are waiting."
      points={["Check new order requests", "Update stock and prices", "Share your shop link"]}
      shopLink
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
