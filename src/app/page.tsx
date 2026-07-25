import LaptopScene from './components/laptop/LaptopScene'
import { getResume } from './lib/resume'
import { getContributions } from './lib/contributions'

export default async function Home() {
  const data = await getResume()
  const contributions = await getContributions()

  return (
    <>
      <div className="progress-bar" aria-hidden="true" />
      <main className="shell">
        <LaptopScene data={data} contributions={contributions} />
      </main>
    </>
  )
}
