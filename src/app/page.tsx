import EditorialHome from './components/EditorialHome'
import { getResume } from './lib/resume'

export default async function Home() {
  const data = await getResume()
  return <EditorialHome data={data} />
}
