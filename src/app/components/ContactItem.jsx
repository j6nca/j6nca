import React from 'react'
import Image from 'next/image'

const ContactItem = ({
    link,
    name
}) => {
  return (
    <li className='inline-flex items-center gap-x-2.5 px-2'>
        <a href={`${link}`}>
            <Image
            src={`/images/${name}.svg`}
            alt={`${name} logo`}
            width={25}
            height={25}
            />
        </a>
    </li>
  )
}

export default ContactItem