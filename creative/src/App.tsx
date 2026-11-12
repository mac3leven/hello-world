import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
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
      return <Placeholder id="A1" space="academy" title="Academy" purpose="Learning paths, where you left off, recommended practice." links={[{ href: '#/academy/path/seeing', label: 'A learning path' }]} />;
    case 'path':
      return <Placeholder id="A2" space="academy" title={`Learning path: ${p.pathId}`} purpose="Path purpose, lessons in suggested (never locked) order, progress." links={[{ href: '#/academy/lesson/specific-detail', label: 'A lesson' }]} />;
    case 'lesson':
      return <Placeholder id="A3" space="academy" title={`Lesson: ${p.lessonId}`} purpose="Concept, marked examples, practice invitation, ask the Instructor." links={[{ href: '#/academy/exercise/ex-kitchen', label: 'Its exercise' }]} />;
    case 'exercise':
      return <Placeholder id="A4" space="academy" title={`Exercise: ${p.exerciseId}`} purpose="Prompt, intention, response editor, save and submit for Academy feedback." />;
    case 'feedback':
      return <Placeholder id="A5" space="academy" title="Feedback & revision" purpose="Strengths, craft observations, questions, revise and compare, optional explicit link to Studio." />;
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
