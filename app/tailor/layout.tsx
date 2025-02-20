import { Sidebar } from "./components/dashboard/sidebar"
import { Header } from "./components/dashboard/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <Sidebar />
      <div style={{ marginLeft: '250px' }}>
        <Header />
        <main className="p-4 bg-gray-100" style={{marginTop: '4rem'}}>
          {children}
        </main>
      </div>
    </div>
  )
}

