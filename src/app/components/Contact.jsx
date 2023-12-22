import React from 'react'
import Image from 'next/image'
import ContactItem from './ContactItem'

const Contact = () => {
  return (
    <section>
        <ul className='flex flex-col sm:flex-row'>
            <ContactItem link='https://github.com/j6nca' name='github'/>
            <ContactItem link='https://www.linkedin.com/in/j6n' name='linkedin'/>
            <ContactItem link='https://blog.j6n.ca' name='blog'/>
            <ContactItem link='mailto:me@j6n.ca' name='email'/>
        </ul>
    </section>
  )
}

export default Contact