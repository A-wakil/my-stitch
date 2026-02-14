'use client'

import './Sidebar.css'
import { IoClose } from 'react-icons/io5'
import { useRouter } from 'next/navigation'
import { IoPersonOutline } from 'react-icons/io5'
import { LuRuler } from 'react-icons/lu'
import { HiOutlineShoppingBag } from 'react-icons/hi'
import { LuScissors } from 'react-icons/lu'
import { HiOutlineMail } from 'react-icons/hi'


interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  user: any
  toggleAuthDialog: () => void
}

const mainNavItems = [
  { name: 'My Account', path: '/customer/profile', icon: <IoPersonOutline size={20} /> },
  { name: 'Measurements', path: '/customer/measurements', icon: <LuRuler size={20} /> },
  { name: 'Orders', path: '/customer/orders', icon: <HiOutlineShoppingBag size={20} /> },
]

const secondaryNavItems = [
  { name: 'My Tailor Account', path: '/tailor', icon: <LuScissors size={20} /> },
  { name: 'Contact Us', path: 'mailto:abdulwakil.ola@gmail.com', icon: <HiOutlineMail size={20} /> },
]

export function Sidebar({ isOpen, onClose, user, toggleAuthDialog }: SidebarProps) {
  const router = useRouter()

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button onClick={onClose} className="close-button" style={{ fontSize: 18 }} data-tooltip="Close">
            <IoClose size={25} />
            <span className='close-btn-txt'>Close</span>
          </button>
        </div>

        <nav>
          <ul className="nav-list">
            {mainNavItems.map((item) => (
              <li key={item.name} className="nav-item">
                <a 
                  href={item.path}
                  className="nav-link"
                  data-tooltip={item.name}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!user) {
                      toggleAuthDialog();
                    } else {
                      onClose();
                      router.push(item.path);
                    }
                  }}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.name}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="secondary-nav">
            <ul className="nav-list">
              {secondaryNavItems.map((item) => (
                <li key={item.name} className="nav-item">
                  {item.path.startsWith('mailto:') ? (
                    <a 
                      href={item.path} 
                      className="nav-link"
                      data-tooltip={item.name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.name}</span>
                    </a>
                  ) : (
                    <a 
                      href={item.path}
                      className="nav-link"
                      data-tooltip={item.name}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!user) {
                          toggleAuthDialog();
                        } else {
                          onClose();
                          router.push(item.path);
                        }
                      }}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-text">{item.name}</span>
                    </a>
                  )}
                </li>
              ))}
            </ul>

            {/* <div className="nav-list contact-info">
              <p>Can we help you?</p>
              <p>+1.866.STITCH</p>
            </div> */}
          </div>
        </nav>
      </div>
    </>
  )
}

