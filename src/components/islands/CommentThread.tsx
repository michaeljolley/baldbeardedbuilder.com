/*
  The comment thread.

  Hydrates on visible, which on a content page means it costs nothing until somebody
  scrolls past the end of what they came to read.

  Bodies arrive as HTML the server rendered from markdown at write time and never from
  anything a browser sent. That is the only reason this component is allowed to use
  dangerouslySetInnerHTML at all, and it is worth saying out loud next to the call.

  Every Report control is a link to /report/ with the target filled in, per the settled
  rule that reporting never opens a modal. A modal is a dead end for anybody who wants to
  add context, and a report with no context is a report nobody can act on.
*/

import { useEffect, useRef, useState } from 'preact/hooks';
import LikeButton from './LikeButton';
import { hasBody, initials, type CommentView } from '../../lib/thread';

interface Viewer {
  id: string;
  handle: string;
  name: string | null;
  avatar: string | null;
}

interface Thread {
  comments: CommentView[];
  /** Visible rows as the server counts them. The rail uses hasBody instead, because the
      server cannot know that this reader has a held comment of their own on screen. */
  total: number;
  viewer: Viewer | null;
  limits: { bodyMax: number; editWindowMinutes: number };
}

interface Props {
  kind: 'content' | 'disaster';
  targetKey: string;
  /** The build time reply count, shown until the live thread arrives. */
  initial: number;
  /** Where a Report link should send somebody back to. */
  pageUrl: string;
}

const HOST = 'michaeljolley';

/* Relative for the first week, then a date. "312 days ago" is not a thing anybody reads. */
function when(iso: string): string {
  const then = new Date(iso);
  const mins = Math.floor((Date.now() - then.getTime()) / 60000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return then.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CommentThread({ kind, targetKey, initial, pageUrl }: Props) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const composer = useRef<HTMLTextAreaElement>(null);

  async function load() {
    try {
      const res = await fetch(
        `/api/comments/?kind=${kind}&key=${encodeURIComponent(targetKey)}`
      );
      if (!res.ok) throw new Error(String(res.status));
      setThread(await res.json());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    load();
  }, [kind, targetKey]);

  /*
    Counted from what is actually on screen for this reader, not from the server total.
    The build time number is the fallback until live data lands.
  */
  const total = thread ? thread.comments.filter(hasBody).length : initial;
  const viewer = thread?.viewer ?? null;
  const bodyMax = thread?.limits.bodyMax ?? 10_000;

  function startReply(id: string) {
    setEditing(null);
    setReplyTo(id);
    setDraft('');
    setNotice('');
    /* Focus after the box exists, so the caret lands where the reader is looking. */
    requestAnimationFrame(() => composer.current?.focus());
  }

  function startEdit(comment: CommentView) {
    setReplyTo(null);
    setEditing(comment.id);
    /* The stored markdown is not sent to the browser, so an edit starts from the rendered
       text rather than the source. Better than an empty box, and the window is short. */
    setDraft(comment.html ? htmlToText(comment.html) : '');
    setNotice('');
    requestAnimationFrame(() => composer.current?.focus());
  }

  function cancel() {
    setReplyTo(null);
    setEditing(null);
    setDraft('');
    setNotice('');
  }

  async function submit(event: Event) {
    event.preventDefault();
    if (busy || !draft.trim()) return;

    setBusy(true);
    setNotice('');

    try {
      const res = editing
        ? await fetch('/api/comments/', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: editing, body: draft })
          })
        : await fetch('/api/comments/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ kind, key: targetKey, parentId: replyTo, body: draft })
          });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNotice(payload.error ?? 'That did not post.');
        return;
      }

      if (payload.held) {
        setNotice('Posted, waiting on a look. Only you can see it for now.');
      }

      const held = Boolean(payload.held);
      cancel();
      if (held) setNotice('Posted, waiting on a look. Only you can see it for now.');
      await load();
    } catch {
      setNotice('That did not post.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/comments/?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setNotice(payload.error ?? 'That did not delete.');
        return;
      }
      await load();
    } catch {
      setNotice('That did not delete.');
    } finally {
      setBusy(false);
    }
  }

  const composing = replyTo === null && editing === null;

  return (
    <div class="shell">
      <aside class="rail">
        {/*
          At zero there is nothing to count, so the rail stays empty rather than
          announcing "0 replies" above an invitation to write the first one. A count
          is a fact about a conversation, and there is no conversation yet.
        */}
        {total > 0 && (
          <p class="eyebrow">
            {total} {total === 1 ? 'reply' : 'replies'}
          </p>
        )}
      </aside>

      <div>
        {viewer ? (
          composing && (
            <Composer
              inputRef={composer}
              value={draft}
              onInput={setDraft}
              onSubmit={submit}
              busy={busy}
              max={bodyMax}
              label="Add a reply"
              action="Post reply"
              who={viewer.handle}
            />
          )
        ) : (
          <p class="note c-signedout">
            <a href={`/signin/?next=${encodeURIComponent(pageUrl)}`}>Sign in</a>{' '}
            to join in. Reading needs nothing.
          </p>
        )}

        {notice && (
          <p class="note c-notice" role="status" aria-live="polite">
            {notice}
          </p>
        )}

        {loadFailed && (
          <p class="note" role="status">
            {total > 0
              ? 'The live replies did not load, so that count is from the last build. '
              : 'The replies did not load. '}
            <button class="linkish" type="button" onClick={load}>Try again</button>
          </p>
        )}

        {thread && thread.comments.length === 0 && (
          <p class="note c-empty">No replies yet. Yours would be the first.</p>
        )}

        {thread?.comments.map((c) => {
          const body = hasBody(c);

          /*
            A row with no body carries no name and no initials, whatever put it in that
            state. Naming somebody whose comment was removed leaves a permanent public
            marker saying this specific person had something taken down, which every
            reader scrolls past, on a site whose whole posture is that nobody gets dunked
            on. Note the asymmetry it fixes: deleting your own account is a choice you
            made and was already anonymised, while having a comment removed is done to
            you and was not.

            Same predicate as the rail count on purpose. If a reader can read it, its
            author is named and it counts as a reply. If they cannot, neither.

            The timestamp stays so the thread keeps its shape and any reply still sits
            visibly under something.
          */
          const named = body ? c.authorHandle : null;

          return (
          <article
            key={c.id}
            class={c.parentId ? 'comment reply' : 'comment'}
            id={`c-${c.id}`}
          >
            <div class={named === HOST ? 'av host' : 'av'} aria-hidden="true">
              {c.authorAvatar && body ? (
                <img src={c.authorAvatar} alt="" width="32" height="32" loading="lazy" />
              ) : body ? (
                initials(c.authorName, c.authorHandle)
              ) : (
                '?'
              )}
            </div>

            <div>
              <div class="chead">
                {body && (
                  <span class="who">
                    {c.authorHandle ? (
                      <a href={`/builders/${c.authorHandle}/`} rel="nofollow">
                        {c.authorHandle}
                      </a>
                    ) : (
                      <span>somebody</span>
                    )}
                  </span>
                )}
                <span>{when(c.createdAt)}</span>
                {c.editedAt && <span class="c-edited">edited</span>}
                {c.held && <span class="badge">waiting on a look</span>}
              </div>

              {body ? (
                <>
                  {/* Server rendered from markdown at write time through the allow list in
                      src/lib/markdown.ts. Nothing a browser sent ever reaches here. */}
                  <div class="cbody" dangerouslySetInnerHTML={{ __html: c.html ?? '' }} />

                  <div class="cacts">
                    <LikeButton
                      kind="comment"
                      targetKey={c.id}
                      initial={c.likes}
                      label="this comment"
                      compact
                    />
                    {c.mine && !c.parentId && (
                      <button type="button" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                    )}
                    {c.mine && (
                      <button type="button" onClick={() => remove(c.id)}>
                        Delete
                      </button>
                    )}
                    {viewer && !c.parentId && c.status === 'visible' && (
                      <button type="button" onClick={() => startReply(c.id)}>
                        Reply
                      </button>
                    )}
                    {/* Nothing useful happens when you report yourself, and the flow ends
                        on the conduct page. Delete is the control you wanted. */}
                    {!c.mine && (
                      <a
                        class="rep"
                        href={`/report/?type=comment&ref=${c.id}&target=${encodeURIComponent(`${pageUrl}#c-${c.id}`)}`}
                      >
                        Report
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div class="cbody c-tomb">
                  <p>{c.tombstone === 'account deleted' ? 'This person deleted their account.' : 'This comment was removed.'}</p>
                </div>
              )}

              {(replyTo === c.id || editing === c.id) && (
                <Composer
                  inputRef={composer}
                  value={draft}
                  onInput={setDraft}
                  onSubmit={submit}
                  onCancel={cancel}
                  busy={busy}
                  max={bodyMax}
                  label={editing ? 'Edit your comment' : `Reply to ${c.authorHandle ?? 'this'}`}
                  action={editing ? 'Save' : 'Post reply'}
                  who={viewer?.handle ?? ''}
                />
              )}
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}

interface ComposerProps {
  inputRef: { current: HTMLTextAreaElement | null };
  value: string;
  onInput: (value: string) => void;
  onSubmit: (event: Event) => void;
  onCancel?: () => void;
  busy: boolean;
  max: number;
  label: string;
  action: string;
  who: string;
}

function Composer({
  inputRef,
  value,
  onInput,
  onSubmit,
  onCancel,
  busy,
  max,
  label,
  action,
  who
}: ComposerProps) {
  const id = `c-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const over = value.length > max;

  return (
    <form class="composer" onSubmit={onSubmit}>
      <label for={id}>{label}</label>
      <textarea
        id={id}
        ref={inputRef}
        value={value}
        maxLength={max}
        onInput={(e) => onInput((e.target as HTMLTextAreaElement).value)}
        placeholder="Markdown works. So do code fences, if you need to show the loop that got you."
      />
      <div class="composer-foot">
        <span>
          Signed in as <b>{who}</b>
        </span>
        <span class="composer-btns">
          {onCancel && (
            <button class="btn" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button class="btn primary" type="submit" aria-busy={busy} aria-disabled={busy || over}>
            {busy ? 'Posting' : action}
          </button>
        </span>
      </div>
    </form>
  );
}

/*
  Rendered HTML back to something editable.

  The markdown source is deliberately not sent to the browser, because a thread is a read
  surface and shipping every original alongside every rendering doubles it for one person
  who might press Edit. Within the fifteen minute window this is close enough to what was
  typed, and the alternative is an empty box.
*/
function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  for (const pre of Array.from(doc.querySelectorAll('pre'))) {
    const lang = pre.getAttribute('data-lang') ?? '';
    pre.replaceWith(doc.createTextNode(`\n\`\`\`${lang}\n${pre.textContent ?? ''}\n\`\`\`\n`));
  }

  return (doc.body.textContent ?? '').trim();
}
