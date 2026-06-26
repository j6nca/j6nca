import React from 'react'

const ContactItem = ({ link, name }) => {
  return (
    <li>
      <a className="social" href={link} aria-label={name}>
        <img src={`./images/${name}.svg`} alt={`${name} logo`} width={22} height={22} />
      </a>
    </li>
  )
}

export default ContactItem
