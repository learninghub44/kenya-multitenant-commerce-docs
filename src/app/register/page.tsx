import type { Metadata } from "next";
import AuthShell from "../auth/auth-shell";
import AuthForm from "../auth/auth-form";

export const metadata: Metadata = { title: "Create your free account — Commerce Workspace" };

export default function RegisterPage() {
  return (
    <AuthShell
      headline="Open your online shop "
      accent="in minutes."
      summary="Everything you need to sell online and keep your business organised."
      points={["Your own shop link customers can share", "Stock that stays accurate as you sell", "Orders from request to fulfilment"]}
      shopLink
    >
      <AuthForm variant="register" />
    </AuthShell>
  );
}
