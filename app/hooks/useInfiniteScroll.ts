import { useState, useEffect, useCallback } from 'react'

export function useInfiniteScroll(callback: () => void, hasMore: boolean) {
  const [isFetching, setIsFetching] = useState(false)

  const handleScroll = useCallback(() => {
    if (!hasMore || 
        window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || 
        isFetching) return
    setIsFetching(true)
  }, [isFetching, hasMore])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (!isFetching) return
    callback()
  }, [isFetching, callback])

  return { isFetching, setIsFetching }
}

