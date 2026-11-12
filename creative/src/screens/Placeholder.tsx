import { PageHeader, type Space } from '../components/ui';

/** Stand-in for screens not built yet: shows the screen-map entry so navigation can be tested end to end. */
export function Placeholder({ id, title, space, purpose, links = [] }: {
  id: string;
  title: string;
  space: Space;
  purpose: string;
  links?: { href: string; label: string }[];
}) {
  return (
    <>
      <PageHeader space={space} title={title} />
      <div className="card soft">
        <p className="small muted" style={{ marginBottom: 4 }}>Screen {id} · coming in a later step</p>
        <p style={{ margin: 0 }}>{purpose}</p>
      </div>
      {links.length > 0 && (
        <div className="row">
          {links.map((l) => <a key={l.href} className="btn" href={l.href}>{l.label}</a>)}
        </div>
      )}
    </>
  );
}
