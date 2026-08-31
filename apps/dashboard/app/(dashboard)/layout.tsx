import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { RouteGuard } from "@/components/layout/RouteGuard"


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <Header />
      <main className="md:ml-[220px] pt-16 md:pt-16 px-4 sm:px-6 pb-8 max-w-[1400px] mx-auto">
        <RouteGuard>{children}</RouteGuard>
      </main>
    </div>
  )
}
