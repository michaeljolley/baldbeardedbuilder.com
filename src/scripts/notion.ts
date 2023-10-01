import { Client } from '@notionhq/client';

import type { ScheduledEvent } from '@type/scheduledEvent';

export async function getEvents(): Promise<ScheduledEvent[]> {
  const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });
  const pages = await notion.databases.query({
    database_id: import.meta.env.NOTION_CONTENT_DATABASE_ID,
    filter: {
      and: [
        {
          property: 'Status',
          status: {
            equals: '📆 Staged',
          },
        },
        {
          or: [
            {
              property: 'Type',
              select: {
                equals: 'Long Form Video',
              },
            },
            {
              property: 'Type',
              select: {
                equals: 'Livestream',
              },
            },
            {
              property: 'Type',
              select: {
                equals: 'Short Form Video',
              },
            },
            {
              property: 'Type',
              select: {
                equals: 'Blog',
              },
            },
          ],
        },
      ],
    },
  });

  const events = pages.results
    .map((page) => {
      let type = ""
      switch (page.properties.Type.select.name) {
        case 'Long Form Video':
        case 'Short Form Video':
          type = 'YouTube'
          break;
        case 'Livestream':
          type = 'Twitch'
          break;
        case 'Blog':
          type = 'Blog'
          break;
      }
      return {
        id: page.id,
        title: page.properties.Name.title[0].plain_text,
        description: page.properties.Description.rich_text[0].plain_text,
        date: new Date(page.properties['Release Date'].date.start),
        type: type
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .splice(0, 5);

  return events;
}
