import { Services } from "@/components/sections/services/Services";
import { Experience } from "@/components/sections/experience/Experience";
import { Testimonials } from "@/components/sections/testimonials/Testimonials";
import { Work } from "@/components/sections/work/Work";
import { selectedProjects } from "@/data/projects";
import { Hero } from "@/components/sections/hero/Hero";
import { Contact } from "@/components/sections/contact/Contact";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <Hero />
      <Work projects={selectedProjects} headingLevel={2} viewAllHref="/work" />
      <Services />
      <Experience />
      <Testimonials />
      <Contact />
    </main>
  );
}
