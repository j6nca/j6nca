import React from 'react'
import Image from 'next/image'

const Hero = () => {
  const imageStyle =
  {
    display: 'block',
    margin: 'auto',
    width: '30vh',
    height: '30vh',
  };
  return (
    <section>
      <div className='grid grid-cols-1 lg:grid-cols-8'>
        <div className='col-span-8'>
          <h1 className='col-span-8 text-xl md:text-4xl'>
            <code className='font-extrabold'>Hello World</code>, I&apos;m Jon <span className='highlight'>[j6n]</span>
          </h1>
          <br />
          <p className='text-sm md:text-2xl'>
            I am a DevOps Engineer and a maker-of-things based in Toronto, Canada.
            I have an interest in homelab, observability and game development.
            My hobbies involve custom keyboards, cooking, fishing, and video games.
            View what I&apos;m currently working on <a className='highlight' href='https://trello.com/b/7yMlHI5q/todos'>here</a>, dive into my <a className='highlight' href='https://notes.j6n.ca'>blog</a>, or check out what I&apos;m running in my <a className='highlight' href='https://meow.j6n.dev'>homelab</a>.
            Reach me at:&nbsp;
            <a className='highlight' href='mailto:me@j6n.ca'>me@j6n.ca</a>.
            You can download my cv <a className='highlight' href='./resume' target='_blank'>here</a> or, alternatively, view it via this request: <br />
            <code className="font-mono font-bold">
              curl https://j6n.ca/resume.json
            </code>
          </p>
        </div>
        <div className='col-span-8 py-20'>
          <div>
            {/* <div className='rounded-full bg-[#181818] w-[200px] h-[200px] lg:w-[250px] lg:h-[250px] absolute transform top-1/2 left-1/2 '></div> */}
            <Image
              src='https://res.cloudinary.com/drwjkxxud/image/upload/v1738628474/MVIMG_20190823_132041_boaeqe_c_crop_w_3024_h_3024_ar_1_1_g_auto_ywcnjl.jpg'
              alt='linkedin display picture'
              className='rounded-full'
              style={imageStyle}
            />

          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
