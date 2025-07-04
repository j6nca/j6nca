import React from 'react'
import Image from 'next/image'
import ContactItem from './ContactItem'

const Contact = () => {
  return (
    <section>
      <ul className='flex flex-col sm:flex-row'>
        <div className='grid grid-cols-6 gap-2'>
          <ContactItem link='https://github.com/j6nca' name='github' />
          <ContactItem link='https://notes.j6n.ca' name='blog' />
          <ContactItem link='https://meow.j6n.dev' name='kube-cats' />
          <ContactItem link='https://monkeytype.com/profile/j6n' name='monkeytype' />
          <ContactItem link='mailto:me@j6n.ca' name='email' />
          <ContactItem link='https://www.linkedin.com/in/j6n' name='linkedin' />
          <ContactItem link='./resume' name='resume' />
        </div>
      </ul>
    </section>
  )
}

export default Contact
