import React from 'react'
import Reveal from './Reveal'
import ContactItem from './ContactItem'

const Contact = () => {
  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <Reveal>
          <span className="eyebrow">05 — Contact</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="section-title">
            Let&apos;s <span className="gradient-text">build something</span>.
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="contact-lead">
            Got an idea, a role, or just want to talk homelabs and observability?
            My inbox is open.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="hero-cta" style={{ justifyContent: 'center' }}>
            <a className="btn btn-primary" href="mailto:me@j6n.ca">
              me@j6n.ca
            </a>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <ul className="socials">
            <ContactItem link="https://github.com/j6nca" name="github" />
            <ContactItem link="https://blog.j6n.ca" name="blog" />
            <ContactItem link="https://meow.j6n.dev" name="kube-cats" />
            <ContactItem link="https://monkeytype.com/profile/j6n" name="monkeytype" />
            <ContactItem link="mailto:me@j6n.ca" name="email" />
            <ContactItem link="https://www.linkedin.com/in/j6n" name="linkedin" />
            <ContactItem link="./resume" name="resume" />
          </ul>
        </Reveal>

        <Reveal delay={320}>
          <div className="curl">
            <span className="dollar">$</span>
            <span>curl https://j6n.ca/resume.json</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default Contact
