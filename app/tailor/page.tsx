'use client'
import React from 'react'
import { useState } from 'react'
import Link from "next/link"
import { Card } from "../tailor/components/ui/card"
import { Button } from "../tailor/components/ui/button"
import styles from './page.module.css'

export default function Dashboard() {
  return (
    <div className={styles.pageContainer}>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.mainContentInner}>
          <header className={styles.header}>
            <h2 className={styles.pageTitle}>Dashboard</h2>
           
          </header>

          <div className={styles.cardsGrid}>
            <Card className={styles.card}>
              <h3>Total Designs</h3>
              <p className={styles.statNumber}>24</p>
            </Card>
            <Card className={styles.card}>
              <h3>Total Orders</h3>
              <p className={styles.statNumber}>120</p>
            </Card>
            <Card className={styles.card}>
              <h3>Revenue</h3>
              <p className={styles.statNumber}>$12,345</p>
            </Card>
            <Card className={styles.card}>
              <h3>Rating</h3>
              <p className={styles.statNumber}>4.8</p>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Designs</h3>
              <Button className={styles.viewAllButton}>
                View All Designs
              </Button>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Orders</h3>
              <Button className={styles.viewAllButton}>
                View All Orders
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}