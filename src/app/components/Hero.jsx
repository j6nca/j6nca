import React from 'react'
import Image from 'next/image'

const Hero = () => {
  return (
    <section>
      <div className='grid grid-cols-1 lg:grid-cols-12'>
        <div className='col-span-6'>
          <h1 className='col-span-6 text-xl md:text-4xl'>
            <code className='font-extrabold'>Hello World</code>, I&apos;m Jon <span className='highlight'>[j6n]</span>
          </h1>
          <br />
          <p className='text-sm md:text-2xl'>
            I am an observability and reliability engineer and a maker-of-things based in Toronto, Canada.
            I have an interest in homelab and game development.
            My hobbies involve custom keyboards, cooking, fishing, and video games.
            View what I&apos;m currently working on <a className='highlight' href='https://trello.com/b/7yMlHI5q/todos'>here</a> or check out my <a className='highlight' href='https://notes.j6n.ca'>blog</a>.
            Reach me at:&nbsp;
            <a className='highlight' href='mailto:me@j6n.ca'>me@j6n.ca</a>.
            You can download my cv <a className='highlight' href='./resume' target='_blank'>here</a> or, alternatively, view it via this request: <br />
            <code className="font-mono font-bold">
              curl https://j6n.ca/resume.json
            </code>
          </p>
        </div>
        <div className='col-span-1'></div>
        <div className='col-span-5 py-20'>
          <div>
            {/* <div className='rounded-full bg-[#181818] w-[200px] h-[200px] lg:w-[250px] lg:h-[250px] absolute transform top-1/2 left-1/2 '></div> */}
            <Image
              src='https://res.cloudinary.com/drwjkxxud/image/upload/v1738628474/MVIMG_20190823_132041_boaeqe_c_crop_w_3024_h_3024_ar_1_1_g_auto_ywcnjl.jpg'
              alt='linkedin display picture'
              width={300}
              height={300}
              className='rounded-full'
            />

          </div>
        </div>
        <div className='col-span-12'>
          <iframe src="https://trello.com/b/7yMlHI5q" title="todos"></iframe>
        </div>
      </div>
    </section>
  )
}

export default Hero
