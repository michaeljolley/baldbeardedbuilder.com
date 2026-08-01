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

  const leadIndex = resolved.findIndex(hasSummary);
  if (leadIndex === -1) {
    throw new Error(
      'No Start here pick has a summary, so the lead card would draw a title and a meta ' +
        'line with nothing between them. Add a blurb to one of the picks in START_HERE in ' +
        'src/config/site.ts. A video needs an authored line because the videos collection ' +
        'has no description field.'
    );
  }

  if (leadIndex > 0) {
    const [lead] = resolved.splice(leadIndex, 1);
    resolved.unshift(lead);
  }

  return resolved;
}
