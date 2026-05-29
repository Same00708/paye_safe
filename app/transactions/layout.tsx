import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
