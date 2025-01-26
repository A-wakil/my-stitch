import { Sidebar } from "./components/dashboard/sidebar"
import { Header } from "./components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
    <Header />
      <div className="flex flex-col flex-1 overflow-hidden">
      <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 w-full">{children}</main>
      </div>
    </div>
  )
}

