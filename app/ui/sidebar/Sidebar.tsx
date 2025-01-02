'use client'

import './Sidebar.css'
import { IoClose } from 'react-icons/io5'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const mainNavItems = [
  'Men',
  'Women',
  'Boys & Girls',

]

const secondaryNavItems = [
  'Create a Tailor Account',
  'Contact Us'
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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
            <li key={item} className="nav-item">
              <a href="#" className="nav-link">{item}</a>
            </li>
          ))}
        </ul>

        <div className="secondary-nav">
          <ul className="nav-list">
            {secondaryNavItems.map((item) => (
              <li key={item} className="nav-item">
                <a href="#" className="nav-link">{item}</a>
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

