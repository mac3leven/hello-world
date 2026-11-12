import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { AcademyHome, ExerciseScreen, FeedbackScreen, LessonScreen, PathScreen } from './screens/Academy';
import { navigate, useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { CoachStep, GoalsStep, StrengthsStep, Welcome } from './screens/Onboarding';
import { Placeholder } from './screens/Placeholder';
import { EvidenceScreen, ProfileScreen } from './screens/Profile';
import { SettingsScreen } from './screens/Settings';

const ONBOARDING = new Set(['welcome', 'onboarding-goals', 'onboarding-strengths', 'onboarding-coach']);
const WIDE = new Set(['draft', 'history', 'feedback', 'studio', 'academy']);

function screenFor(route: Route): ReactNode {
  const p = route.params;
  switch (route.name) {
    case 'welcome':
      return <Welcome />;
    case 'onboarding-goals':
      return <GoalsStep />;
    case 'onboarding-strengths':
      return <StrengthsStep />;
    case 'onboarding-coach':
      return <CoachStep />;
    case 'home':
      return <Placeholder id="S4" space="neutral" title="Home" purpose="One useful next action with a reason, recent work, active project, a profile insight." links={[{ href: '#/academy', label: 'Academy' }, { href: '#/studio', label: 'Studio' }, { href: '#/progress', label: 'Progress' }]} />;
    case 'academy':
      return <AcademyHome />;
    case 'path':
      return <PathScreen pathId={p.pathId} />;
    case 'lesson':
      return <LessonScreen key={p.lessonId} lessonId={p.lessonId} />;
    case 'exercise':
      return <ExerciseScreen key={p.exerciseId} exerciseId={p.exerciseId} />;
    case 'feedback':
      return <FeedbackScreen key={p.attemptId} attemptId={p.attemptId} />;
    case 'studio':
      return <Placeholder id="S5" space="studio" title="Studio" purpose="Projects, idea inbox, recent drafts, quick capture." links={[{ href: '#/studio/ideas', label: 'Idea inbox' }, { href: '#/studio/new', label: 'New project' }]} />;
    case 'ideas':
      return <Placeholder id="S6" space="studio" title="Idea inbox" purpose="Captured fragments: edit, attach to a project, archive." />;
    case 'new-project':
      return <Placeholder id="S7" space="studio" title="New project" purpose="Name, type, intent, optional goal." />;
    case 'project':
      return <Placeholder id="S8" space="studio" title="Project" purpose="Intent, status, drafts, notes, related learning links (reference only)." />;
    case 'draft':
      return <Placeholder id="S9" space="studio" title="Draft editor" purpose="Text-first writing with autosave and Editor/Mentor coach access." />;
    case 'history':
      return <Placeholder id="S10" space="studio" title="Revision history" purpose="Snapshots, compare, restore as a new version (never overwrites)." />;
    case 'profile':
      return <ProfileScreen />;
    case 'evidence':
      return <EvidenceScreen key={p.observationId} id={p.observationId} />;
    case 'coach':
      return <Placeholder id="C1" space="coach" title="Coach" purpose="Conversation, mode selector, visible context chip, proposal controls." />;
    case 'progress':
      return <Placeholder id="H1" space="neutral" title="Progress & milestones" purpose="Learning history, attempts, milestones, reflective notes. Descriptive, not competitive." />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <Placeholder id="404" space="neutral" title="Not found" purpose="That page doesn't exist." links={[{ href: '#/', label: 'Go home' }]} />;
  }
}

export default function App() {
  const route = useRoute();
  const { state } = useStore();
  const inOnboarding = ONBOARDING.has(route.name);
  const needsWelcome = !state.user.onboarded && !inOnboarding;

  useEffect(() => {
    if (needsWelcome) navigate('/welcome', { replace: true });
  }, [needsWelcome]);

  if (needsWelcome) return null;
  if (inOnboarding) return <div className="onboarding">{screenFor(route)}</div>;
  return <Layout route={route} wide={WIDE.has(route.name)}>{screenFor(route)}</Layout>;
}
