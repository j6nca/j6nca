import React from 'react'
import Image from 'next/image'

const ContactItem = ({
  link,
  name
}) => {
  return (
    <div>
      <li className='inline-flex items-center'>
        <a href={`${link}`}>
          <Image
            src={`./images/${name}.svg`}
            alt={`${name} logo`}
            width={25}
            height={25}
          />
        </a>
      </li>
    </div>
  )
}

export default ContactItem