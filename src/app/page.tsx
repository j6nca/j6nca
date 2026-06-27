import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Contact from './components/Contact'
import { getResume } from './lib/resume'
import { getContributions } from './lib/contributions'

export default async function Home() {
  const data = await getResume()
  const contributions = await getContributions()

  return (
    <>
      <div className="progress-bar" aria-hidden="true" />
      <main className="shell">
        <Hero name={data.basics.name} label={data.basics.label} />
        <About />
        <Experience work={data.work} />
        <Projects projects={data.projects} contributions={contributions} />
        <Skills skills={data.skills} />
        <Contact />
        <footer className="footer">
          © {data.basics.name} · built with Next.js · curl j6n.ca/resume.json
        </footer>
      </main>
    </>
  )
}
