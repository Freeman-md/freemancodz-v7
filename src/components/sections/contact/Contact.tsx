import { ActionLink } from "@/components/shared/ActionLink";
import { contactEmailHref, contactSocialLinks } from "@/data/contact";
import { ContactSocialLinks } from "./ContactSocialLinks";
import styles from "./Contact.module.css";

export function Contact() {
  return (
    <section aria-labelledby="contact" className={styles.section}>
      <p className={styles.availability} data-contact-part="availability">
        <span className={styles.dot} aria-hidden="true" />
        Available for new projects
      </p>
      <h2 id="contact" tabIndex={-1} className={styles.headline}>
        <span data-contact-part="headline">
          <span className={styles.phrase}>HAVE A PROJECT</span>{" "}
          <span className={styles.phrase}>IN MIND?</span>
        </span>
      </h2>
      <p className={styles.copy} data-contact-part="copy">
        Let’s build intuitive interfaces and reliable workflows that make your
        business easier to run.
      </p>
      <div className={styles.action} data-contact-part="action">
        <ActionLink
          href={contactEmailHref}
          arrow="up-right"
          className={styles.actionLink}
        >
          Contact Me
        </ActionLink>
      </div>
      <ContactSocialLinks links={contactSocialLinks} />
    </section>
  );
}
