import SiteSwitch from './components/SiteSwitch'
import { getResume } from './lib/resume'
import { getContributions } from './lib/contributions'

export default async function Home() {
  const data = await getResume()
  const contributions = await getContributions()

  return <SiteSwitch data={data} contributions={contributions} />
}
