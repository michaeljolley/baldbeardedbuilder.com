import { Fragment } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { THEMES, THEME_STORAGE_KEY } from '../../lib/themes.generated';

const SWATCH_VARS = ['--bg', '--accent', '--sev-error', '--sev-warn', '--sev-info'];

/*
  The swatch carries its own data-theme, which is what lets a single element preview a
  theme the page is not currently using. themes.css scopes every token to [data-theme],
  not to :root, so the var() lookups inside resolve against the preview and not the page.
*/
function Swatch({ id }: { id: string }) {
  return (
    <span class="swatch" data-theme={id}>
      {SWATCH_VARS.map((v) => (
        <i key={v} style={{ background: `var(${v})` }} />
      ))}
    </span>
  );
}

export default function ThemePicker() {
  const [current, setCurrent] = useState<string>(THEMES[0].id);
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // The inline no FOUC script has already picked and applied a theme by the time this
  // hydrates, so the island adopts what is on the document rather than deciding again.
  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme');
    if (applied) setCurrent(applied);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const apply = (id: string) => {
    document.documentElement.setAttribute('data-theme', id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      /* private mode, the choice just does not persist */
    }
    setCurrent(id);
    close();
    btnRef.current?.focus();
  };

  const label = THEMES.find((t) => t.id === current)?.name ?? current;

  /*
    Disclosure, not a menu. A role="menu" cannot legally contain the Dark and Light
    headings the design calls for, and a theme switcher is a set of controls rather than
    a set of commands, so aria-expanded on the trigger is the honest pattern.
  */
  return (
    <div class="themer" ref={hostRef}>
      <button
        class="themer-btn"
        type="button"
        ref={btnRef}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls="themer-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Swatch id={current} />
        <span class="themer-label">{label}</span>
        <span class="caret" aria-hidden="true">
          {'\u25BE'}
        </span>
      </button>
      <div class="themer-menu" id="themer-menu" hidden={!open} aria-label="Choose a theme">
        {(['dark', 'light'] as const).map((scheme) => (
          <Fragment key={scheme}>
            <h4>{scheme === 'dark' ? 'Dark' : 'Light'}</h4>
            {THEMES.filter((t) => t.scheme === scheme).map((t) => (
              <button
                key={t.id}
                type="button"
                aria-current={t.id === current ? 'true' : 'false'}
                onClick={() => apply(t.id)}
              >
                <Swatch id={t.id} />
                <span>{t.name}</span>
              </button>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
