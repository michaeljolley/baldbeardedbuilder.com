/*
  The like control.

  Hydrates on visible, so a reader who never scrolls to it never pays for it.

  The count it renders first is the one baked into the page at build time, which is
  honestly a little stale. It reconciles against the live number as soon as it wakes up.
  Showing a stale number briefly is better than showing a spinner where a number goes,
  because the number is the content and the spinner is not.
*/

import { useEffect, useState } from 'preact/hooks';

interface Props {
  kind: 'content' | 'disaster';
  targetKey: string;
  /** The build time count, used until the live one arrives. */
  initial: number;
  /** What the control is for, read out to anybody who cannot see the page. */
  label: string;
}

export default function LikeButton({ kind, targetKey, initial, label }: Props) {
  const [likes, setLikes] = useState(initial);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  /*
    False until this has actually woken up.

    The server renders the count, because the count is content and somebody with
    JavaScript off should still see it. It must not render a control that looks pressable
    and does nothing, so the button says so until it can do the job. First client render
    matches the server render, then the effect flips it, so nothing mismatches on hydrate.
  */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);

    let live = true;
    fetch(`/api/like/?kind=${kind}&key=${encodeURIComponent(targetKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((state) => {
        if (!live || !state) return;
        setLikes(state.likes);
        setLiked(state.liked);
      })
      .catch(() => {
        /* The baked count stays on screen. A failed reconcile is not worth a message. */
      });
    return () => {
      live = false;
    };
  }, [kind, targetKey]);

  async function toggle() {
    /*
      Guarded rather than disabled. A disabled button drops keyboard focus to the body
      mid interaction, which loses the reader's place on the page to prevent a double
      click that this guard already prevents.
    */
    if (busy || !ready) return;
    setBusy(true);
    setFailed(false);

    /*
      Move the number before the request lands. A like is not a bank transfer and the
      round trip is the only thing that would make it feel like one.
    */
    const wasLiked = liked;
    const wasCount = likes;
    setLiked(!wasLiked);
    setLikes(wasCount + (wasLiked ? -1 : 1));

    try {
      const response = await fetch('/api/like/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, key: targetKey })
      });

      if (!response.ok) throw new Error(String(response.status));

      const state = await response.json();
      setLikes(state.likes);
      setLiked(state.liked);
    } catch {
      setLiked(wasLiked);
      setLikes(wasCount);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        class={ready ? 'like' : 'like like-idle'}
        type="button"
        onClick={toggle}
        aria-pressed={ready ? liked : undefined}
        aria-disabled={!ready}
        aria-busy={busy}
      >
        <span aria-hidden="true">{liked ? '\u2665' : '\u2661'}</span> {likes}
        <span class="vh">
          {ready ? ` likes on ${label}` : ` likes on ${label}. Liking needs JavaScript.`}
        </span>
      </button>
      {/* Live so the change is announced, but polite so it waits its turn. */}
      <span class="vh" role="status" aria-live="polite">
        {failed ? 'That did not save. Try again.' : ''}
      </span>
    </>
  );
}
