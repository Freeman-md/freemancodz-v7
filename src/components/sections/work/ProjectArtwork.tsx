import Image from "next/image";
import type { Project } from "@/data/projects";
import { PaymentPreview } from "./artwork/PaymentPreview";
import { WorkflowPreview } from "./artwork/WorkflowPreview";
import { InterfaceStudiesPreview } from "./artwork/InterfaceStudiesPreview";
import { SequencerPreview } from "./artwork/SequencerPreview";
import { RecoveryPreview } from "./artwork/RecoveryPreview";
import styles from "./ProjectArtwork.module.css";

const projectImageSizes =
  "(min-width: 1440px) 406px, (min-width: 1280px) calc((100vw - 220px) / 3), (min-width: 1024px) calc((100vw - 190px) / 2), (min-width: 768px) calc((100vw - 78px) / 2), calc(100vw - 50px)";

export function ProjectArtwork({ project }: { project: Project }) {
  let artwork;
  switch (project.artwork) {
    case "image": {
      if (!project.image) {
        throw new Error(`Missing image for ${project.id}`);
      }
      artwork = (
        <Image
          src={project.image.src}
          width={project.image.width}
          height={project.image.height}
          alt={project.image.alt}
          style={{ objectPosition: project.image.position }}
          sizes={projectImageSizes}
          className={styles.image}
        />
      );
      break;
    }
    case "payment":
      artwork = <PaymentPreview />;
      break;
    case "workflow":
      artwork = <WorkflowPreview />;
      break;
    case "studies":
      artwork = <InterfaceStudiesPreview />;
      break;
    case "sequencer":
      artwork = <SequencerPreview />;
      break;
    case "recovery":
      artwork = <RecoveryPreview />;
      break;
  }
  return <div className={styles.artwork}>{artwork}</div>;
}
