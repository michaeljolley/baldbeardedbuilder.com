import { useEffect, useState } from 'preact/hooks'

export default function SiteHeader(props: any) {
  const [animateHeader, setAnimateHeader] = useState(false)
  useEffect(() => {
    const listener = () => {
      if (window.scrollY > 10) {
        setAnimateHeader(true)
      } else setAnimateHeader(false)
    }
    window.addEventListener('scroll', listener)
    return () => {
      window.removeEventListener('scroll', listener)
    }
  }, [])

  return (
    <header className={`siteHeader ${animateHeader ? 'scrolled' : ''}`}>
      {props.children}
    </header>
  )
}
