import { promises as fs } from 'fs';

export default async function Page() {
  const file = await fs.readFile(process.cwd() + '/src/app/resume/resume.json', 'utf8');
  const data = JSON.parse(file);
  return <div className='resume'>
    <div className="splitline">
      <div className="left">
        <h1> {data.basics.name} </h1>
        <p> {data.basics.label} </p>
        <p> {data.basics.location.city}, {data.basics.location.region} </p>
        <p> {data.education[0].area} @ {data.education[0].institution}</p>
      </div>

      <div className="right">
        <a href={data.basics.url}> {data.basics.url} </a><br/>
        <a> {data.basics.email} </a><br/>
        {data.basics.profiles && data.basics.profiles.map((item, i) => (
          <div key={i}>
            <a href={item.url}> {item.url} </a>
          </div>
          ))
        }
      </div>
      <br style={{clear: "both"}}/>
    </div>
    
    <div>
      <h2> Skills </h2>
      {data.skills && data.skills.map((skill, s) => (
        <div key={s}>
          <h3> {skill.name} </h3>
          <p> {skill.keywords.join(', ')}</p>
        </div>
        ))
      }
    </div>

    <div>
      <h2> Work Experience </h2>
      {data.work && data.work.map((item, i) => (
        <div key={i}>
          
          <div className="splitline">
            <div className="left">
              <h3> {item.position} @ {item.name} </h3>
            </div>

            <div className="right">
              <h3> ({item.startDate} - {item.endDate}) </h3>
            </div>
            <br style={{clear: "both"}}/>
          </div>
          
          <ul>
          {item.highlights && item.highlights.map((highlight, h) => (
            <li key={h}> {highlight} </li>
            ))
          }
          </ul>
        </div>
        ))
      }
    </div>
    <div>
      <h2> Projects </h2>
      {data.projects && data.projects.map((item, i) => (
        <div key={i}>
          <div className="splitline">
            <div className="left">
              <h3> {item.name} </h3>
            </div>

            <div className="right">
              <h3> ({item.startDate} - {item.endDate}) </h3>
            </div>
            <br style={{clear: "both"}}/>
          </div>
          <ul>
            <li> {item.description} </li>
          </ul>
        </div>
        ))
      }
    </div>
    
  </div>
}