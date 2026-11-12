import { useEffect, type ReactNode } from 'react';
import { Layout } from './components/Layout';
import { CoachScreen } from './screens/Coach';
import { HomeScreen } from './screens/Home';
import { ProgressScreen } from './screens/Progress';
import { PageHeader } from './components/ui';
import { AcademyHome, ExerciseScreen, FeedbackScreen, LessonScreen, PathScreen } from './screens/Academy';
import { navigate, useRoute, type Route } from './lib/router';
import { useStore } from './lib/store';
import { CoachStep, GoalsStep, StrengthsStep, Welcome } from './screens/Onboarding';
import { DraftEditor, IdeaInbox, NewProject, ProjectScreen, RevisionHistory, StudioHome } from './screens/Studio';
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
      return <HomeScreen />;
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
      return <StudioHome />;
    case 'ideas':
      return <IdeaInbox />;
    case 'new-project':
      return <NewProject ideaId={route.query.get('idea') ?? undefined} />;
    case 'project':
      return <ProjectScreen key={p.projectId} projectId={p.projectId} />;
    case 'draft':
      return <DraftEditor key={p.draftId} draftId={p.draftId} />;
    case 'history':
      return <RevisionHistory key={p.draftId} draftId={p.draftId} />;
    case 'profile':
      return <ProfileScreen />;
    case 'evidence':
      return <EvidenceScreen key={p.observationId} id={p.observationId} />;
    case 'coach':
      return <CoachScreen key={`${route.query.get('ctx') ?? 'none'}:${route.query.get('id') ?? ''}`} query={route.query} />;
    case 'progress':
      return <ProgressScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <><PageHeader space="neutral" title="Page not found" /><a className="btn" href="#/">Go home</a></>;
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
