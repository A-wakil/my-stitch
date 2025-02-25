import { Sidebar } from "./components/dashboard/sidebar"
import { Header } from "./components/dashboard/header"
import { ProfileProvider } from "../context/ProfileContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileProvider>
      <Sidebar />
      <div style={{ marginLeft: '250px' }}>
        <Header />
        <main className="p-4 bg-gray-100">
          {children}
        </main>
      </div>
    </ProfileProvider>
  )
}

