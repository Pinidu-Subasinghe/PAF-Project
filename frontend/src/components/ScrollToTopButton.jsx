import { useEffect, useState } from 'react'
import { HiArrowUp } from 'react-icons/hi2'

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-50 rounded-full 
      bg-blue-600 text-white 
      p-3 shadow-xl 
      transition-all duration-300 ease-in-out 
      hover:bg-blue-700 hover:scale-110
      ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 translate-y-3'
      }`}
    >
      <HiArrowUp className="h-5 w-5" />
    </button>
  )
}