import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { RouteGuard } from "@/components/layout/RouteGuard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <Header />
      <main className="ml-[220px] pt-14 p-6 max-w-[1200px]">
        <RouteGuard>{children}</RouteGuard>
      </main>
    </div>
  )
}
