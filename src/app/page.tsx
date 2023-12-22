import Image from 'next/image'
import Hero from "./components/Hero"
import Contact from "./components/Contact"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 container mx-auto">
      <Hero/>
      <Contact/>
    </main>
  )
}
