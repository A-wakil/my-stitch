import Link from "next/link"
import { Home, Scissors, User, Settings } from "lucide-react"

export function Sidebar() {
  return (
    <div className="flex flex-col w-64 bg-white border-r">
      <div className="flex items-center justify-center h-16 border-b">
        <span className="text-2xl font-semibold">Tailor Dashboard</span>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2 space-y-2">
          <li>
            <Link href="/dashboard" className="flex items-center p-2 hover:bg-gray-100 rounded">
              <Home className="mr-2" size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link href="/dashboard/designs" className="flex items-center p-2 hover:bg-gray-100 rounded">
              <Scissors className="mr-2" size={20} />
              Designs
            </Link>
          </li>
          <li>
            <Link href="/dashboard/profile" className="flex items-center p-2 hover:bg-gray-100 rounded">
              <User className="mr-2" size={20} />
              Profile
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" className="flex items-center p-2 hover:bg-gray-100 rounded">
              <Settings className="mr-2" size={20} />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

