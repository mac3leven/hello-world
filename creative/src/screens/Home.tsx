// S4 Home: one useful next action with a reason, active work, recent learning, a profile insight.
// Returning after a gap shows where things were — never a missed-day warning (Journey D).

import { PageHeader } from '../components/ui';
import { exerciseById } from '../content/curriculum';
import { DIMENSION_LABEL, formatDateTime, wordCount } from '../lib/labels';
import { observationText, usableObservations } from '../lib/profile';
import { lastActivity } from '../lib/progress';
import { coachHref } from '../lib/router';
import { useStore } from '../lib/store';
import { RecommendationCard } from './Recommendations';
import { QuickCapture } from './Studio';

export function HomeScreen() {
  const { state } = useStore();
  const last = lastActivity(state);
  const away = last ? (Date.now() - Date.parse(last)) / 86_400_000 : 0;
  const project = [...state.projects].filter((p) => p.status !== 'finished').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const draft = project && [...state.drafts].filter((d) => d.projectId === project.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const attempt = [...state.attempts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const attemptEx = attempt && exerciseById(attempt.exerciseId);
  const insight = usableObservations(state).filter((o) => o.kind === 'inferred').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    ?? usableObservations(state).find((o) => o.polarity === 'strength');
  const name = state.user.name.trim();

  return (
    <>
      <PageHeader space="neutral" title={name ? `Hello, ${name}` : 'Hello'}>
        <p className="muted" style={{ margin: 0 }}>
          {!last ? 'Start with a lesson, or capture an idea — both are open to you.'
            : away >= 3 ? 'Welcome back. Here’s where things were.'
            : 'Here’s where you left off.'}
        </p>
      </PageHeader>

      <h2 className="section" style={{ marginTop: 0 }}>A suggested next step</h2>
      <RecommendationCard scope="home" />

      <div className="grid two" style={{ alignItems: 'start' }}>
        <section>
          <h2 className="section">Your work</h2>
          {project ? (
            <a className="card accent" data-space="studio" href={draft ? `#/studio/draft/${draft.id}` : `#/studio/project/${project.id}`}>
              <div className="small" style={{ color: 'var(--studio)', fontWeight: 650 }}>✍️ Studio · resume</div>
              <h3 style={{ margin: '4px 0' }}>{project.title}</h3>
              <div className="small muted">{draft ? `${draft.title} · ${wordCount(draft.text)} words · ` : ''}edited {formatDateTime(project.updatedAt)}</div>
            </a>
          ) : (
            <a className="card" data-space="studio" href="#/studio/new">
              <div className="small" style={{ color: 'var(--studio)', fontWeight: 650 }}>✍️ Studio</div>
              <h3 style={{ margin: '4px 0' }}>Start a project</h3>
              <div className="small muted">A story, script, or personal piece of your own.</div>
            </a>
          )}
          <QuickCapture compact />
        </section>

        <section>
          <h2 className="section">Recent learning</h2>
          {attempt && attemptEx ? (
            <a className="card accent" data-space="academy" href={attempt.status === 'in_progress' ? `#/academy/exercise/${attemptEx.id}` : `#/academy/attempt/${attempt.id}`}>
              <div className="small" style={{ color: 'var(--academy)', fontWeight: 650 }}>📖 Academy</div>
              <h3 style={{ margin: '4px 0' }}>{attemptEx.title}</h3>
              <div className="small muted">
                {attempt.status === 'in_progress' ? 'Draft saved' : attempt.status === 'feedback' ? 'Feedback ready' : 'Finished'} · {formatDateTime(attempt.updatedAt)}
              </div>
            </a>
          ) : (
            <a className="card" data-space="academy" href="#/academy">
              <div className="small" style={{ color: 'var(--academy)', fontWeight: 650 }}>📖 Academy</div>
              <h3 style={{ margin: '4px 0' }}>Browse learning paths</h3>
              <div className="small muted">Short lessons with focused practice.</div>
            </a>
          )}

          {insight && (
            <div className="card" data-space="profile">
              <div className="small" style={{ color: 'var(--profile)', fontWeight: 650 }}>👤 From your Creative Profile</div>
              <p style={{ margin: '4px 0' }}>{observationText(insight)}</p>
              <div className="row between small">
                <span className="muted">{DIMENSION_LABEL[insight.dimension]} · {insight.kind === 'inferred' ? 'coach noticed' : 'you said'}</span>
                <a href={`#/profile/observation/${insight.id}`}>Why? / correct</a>
              </div>
            </div>
          )}

          <div className="card" data-space="coach">
            <div className="small" style={{ color: 'var(--coach)', fontWeight: 650 }}>💬 Coach</div>
            <div className="row" style={{ marginTop: 6 }}>
              <a className="btn small" href={coachHref({ mode: 'mentor' })}>Talk something through</a>
              <a className="btn small" href={coachHref({ mode: 'partner' })}>Brainstorm</a>
            </div>
          </div>
        </section>
      </div>

      <p className="small" style={{ marginTop: 16 }}><a href="#/progress">See your progress and milestones →</a></p>
    </>
  );
}
