import { useState } from "react";
import { openCurriculumUrl } from "../../engine/platform/opener";
import type { WeekTeacherResource } from "../../data/weekTeacherShelfRepository";

function badgeLabel(resource: WeekTeacherResource): string {
  return resource.role.replaceAll("_", " ");
}

export function TeacherShelf({ resources }: { resources: WeekTeacherResource[] }) {
  const [error, setError] = useState<string | null>(null);

  async function openResource(url: string) {
    setError(null);
    try {
      await openCurriculumUrl(url);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (resources.length === 0) return null;

  return (
    <section className="teacher-shelf" aria-labelledby="teacher-shelf-title">
      <div className="teacher-shelf-heading">
        <div>
          <p className="section-kicker">TEACHER SHELF</p>
          <h2 id="teacher-shelf-title">Only open what the task names</h2>
          <p>Human, visual, interactive, rescue, and reference material selected for this week's exact target.</p>
        </div>
        <span>{resources.filter((resource) => resource.verified).length} verified resources</span>
      </div>

      {error ? <p role="alert">{error}</p> : null}

      <div className="teacher-shelf-grid">
        {resources.map((resource) => (
          <article className="teacher-resource-card" key={resource.id}>
            <div className="teacher-resource-meta">
              <span>{resource.modality.toUpperCase()}</span>
              <span>{resource.verified ? "VERIFIED" : "ASSIGNED"}</span>
            </div>
            <p className="section-kicker">{badgeLabel(resource)}</p>
            <h3>{resource.title}</h3>
            {resource.provider ? <p className="teacher-provider">{resource.provider}</p> : null}
            {resource.why ? <p>{resource.why}</p> : null}

            <dl className="teacher-resource-notes">
              {resource.segment ? <><dt>Stop / use</dt><dd>{resource.segment}</dd></> : null}
              {resource.use ? <><dt>Do</dt><dd>{resource.use}</dd></> : null}
              {resource.notice ? <><dt>Notice</dt><dd>{resource.notice}</dd></> : null}
            </dl>

            <button className="secondary-button teacher-open-button" onClick={() => void openResource(resource.url)} type="button">
              Open resource →
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
