'use client'

import './Sidebar.css'
import { IoClose } from 'react-icons/io5'
import { useRouter } from 'next/navigation'
import { IoPersonOutline } from 'react-icons/io5'
import { LuRuler } from 'react-icons/lu'
import { HiOutlineShoppingBag } from 'react-icons/hi'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const mainNavItems = [
  { name: 'My Account', path: '/customer/profile', icon: <IoPersonOutline size={20} /> },
  { name: 'Saved Measurements', path: '/customer/measurements', icon: <LuRuler size={20} /> },
  { name: 'My Orders', path: '#', icon: <HiOutlineShoppingBag size={20} /> },
]

const secondaryNavItems = [
  { name: 'Create a Tailor Account', path: '#' },
  { name: 'Contact Us', path: '#' }
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter()

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <button onClick={onClose} className="close-button" style={{ fontSize: 18 }}>
          <IoClose size={25} />
          Close
        </button>
      </div>

      <nav>
        <ul className="nav-list">
          {mainNavItems.map((item) => (
            <li key={item.name} className="nav-item">
              <a 
                href={item.path}
                className="nav-link"
                onClick={(e) => {
                  e.preventDefault()
                  onClose()
                  router.push(item.path)
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.name}
              </a>
            </li>
          ))}
        </ul>

        <div className="secondary-nav">
          <ul className="nav-list">
            {secondaryNavItems.map((item) => (
              <li key={item.name} className="nav-item">
                <a href={item.path} className="nav-link">{item.name}</a>
              </li>
            ))}
          </ul>

          <div className="nav-list contact-info">
            <p>Can we help you?</p>
            <p>+1.866.STITCH</p>
          </div>
        </div>
      </nav>
    </div>
  )
}

