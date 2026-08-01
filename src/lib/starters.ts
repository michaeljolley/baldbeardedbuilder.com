/*
  Resolving the Start here rail, and guaranteeing the lead has something to say.

  The first pick takes the wide card, which is the widest slot on the front page. A card
  that size holds a thumbnail, a two line title and a meta line, and if there is no summary
  between them the card is mostly empty. Every layout answer to that is a way of hiding
  that the lead has nothing to say, so the fix is a rule about content rather than CSS.

  Two things go wrong on their own and both are handled here.

  A video has no description. The videos collection has no description field anywhere in
  it, and the collection lives in a submodule this repo treats as read only, so an item
  arriving with an empty description is normal rather than a data error. That is what the
  optional blurb on a Starter is for.

  A pick can be changed without its blurb being written. Somebody swapping the first key
  for a different video would silently produce a bare lead, and nothing would fail. So the
  lead is not simply the first pick. It is the first pick that has a summary, and the
  others keep their order behind it. Choosing a bare video moves it out of the lead instead
  of putting a hole on the front page.

  If nothing in the rail has a summary there is no honest lead to draw, so this throws. A
  build that fails belongs to the person holding the fix, which is whoever just edited
  START_HERE.

  A third thing is guarded here that has nothing to do with the lead card. The Item
  interface says a draft stays out of every listing until its date passes, and this rail was
  the one listing that did not ask. That is now fixed at the source rather than here:
  allItems() is published only under decision 110, and itemsByKeys throws on an unpublished
  pick under decision 111.
*/

import { START_HERE, type Starter } from '../config/site';
import { itemsByKeys, type Item } from './content';

const hasSummary = (item: Item): boolean => Boolean(item.description?.trim());

/**
 * The Start here picks as items, with authored lines applied and a lead that has prose.
 *
 * Takes the picks as an argument so the rule can be exercised against cases that are not
 * the committed config. Defaults to START_HERE, which is what the page wants.
 */
export async function starterItems(picks: readonly Starter[] = START_HERE): Promise<Item[]> {
  /*
    itemsByKeys throws on a key it cannot find and returns one item per key in order, so
    indexing the picks alongside it is safe. If it ever starts dropping misses instead,
    every blurb below would attach to the wrong item, which is why this depends on the
    throw rather than on the lengths happening to match.
  */
  const items = await itemsByKeys(picks.map((s) => s.key));
  const resolved = items.map((item, n) => ({
    ...item,
    description: picks[n].blurb ?? item.description
  }));

  /*
    Picks that have not published yet no longer reach this point. Under decision 111
    itemsByKeys throws on an unpublished key, naming it and its date, so the rail cannot be
    quietly one card short.

    This used to drop them with a warning, and the argument for dropping was that failing
    would break a build on a morning when nobody edited anything. That was wrong. Drafts
    only ever become published posts, so time clears the condition and never creates it.
    The single way to reach it is to curate something that has not published, which is an
    edit somebody made and can undo.

    The floor below still earns its place. It catches a rail that is too short for reasons
    that have nothing to do with dates, such as a START_HERE trimmed to one pick.
  */
  const ready = resolved;

  if (ready.length < 2) {
    throw new Error(
      `Only ${ready.length} Start here pick(s), which is not a rail. A lead and a companion ` +
        'is the minimum. Add picks to START_HERE in src/config/site.ts.'
    );
  }

  const leadIndex = ready.findIndex(hasSummary);
  if (leadIndex === -1) {
    throw new Error(
      'No Start here pick has a summary, so the lead card would draw a title and a meta ' +
        'line with nothing between them. Add a blurb to one of the picks in START_HERE in ' +
        'src/config/site.ts. A video needs an authored line because the videos collection ' +
        'has no description field.'
    );
  }

  if (leadIndex > 0) {
    const [lead] = ready.splice(leadIndex, 1);
    ready.unshift(lead);
  }

  return ready;
}

export * from './grid-fill';
