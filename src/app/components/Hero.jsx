import React from 'react'
import Image from 'next/image'

const Hero = () => {
  return (
    <section>
      <div className='grid grid-cols-1 lg:grid-cols-12'>
        <div className='col-span-6'>
          <h1 className='col-span-6 text-4xl'>
            <code className='font-extrabold'>Hello World</code>, I'm Jon [j6n]
          </h1>
          <br/>
          <p className='text-lg'>
            I am a site reliability engineer with an interest in homelab and game development.
            My hobbies involve keyboards, cooking, fishing, video games, and music.
            Reach me at:&nbsp;
            <a href = 'mailto:me@j6n.ca'>me@j6n.ca</a>. 
            You can <a href = '/resume.pdf' target='_blank'>download my cv here</a> or, alternatively, view it via this request: <br/>
            <code className="font-mono font-bold">
              curl https://blablahblah
            </code>
          </p>
        </div>
        <div className='col-span-1'></div>
        <div className='col-span-5'>
          <div>
            {/* <div className='rounded-full bg-[#181818] w-[200px] h-[200px] lg:w-[250px] lg:h-[250px] absolute transform top-1/2 left-1/2 '></div> */}
            <Image
              src='/images/linkedin.jpg'
              alt='linkedin display picture'
              width={300}
              height={300}
              className='rounded-full'
            />
            
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero