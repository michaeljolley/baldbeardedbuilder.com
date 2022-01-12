import config from '../modules/config'

const fs = require('fs')
const path = require('path')
const Parser = require('rss-parser')
const parser = new Parser({
  customFields: {
    item: ['media:group', 'media:thumbnail'],
  },
})

const fetchVideos = async () => {
  const feed = await parser.parseURL(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${config.youtubeChannelId}`
  )
  const videos = feed.items.map((item) => {
    return {
      title: item.title,
      link: item.link,
      id: item.id.replace('yt:video:', ''),
      thumbnail: item['media:group']['media:thumbnail'][0].$.url,
      date: item.pubDate,
      description: item['media:group']['media:description'][0],
    }
  })

  const videoPath = path.join(__dirname, `../content/videos`)
  if (!fs.existsSync(videoPath)) {
    fs.mkdirSync(videoPath)
  }

  videos.forEach((video) => {
    const data = `---
id: ${video.id}
date: ${new Date(video.date).toISOString().substring(0, 10)}
title: ${video.title}
slug: ${video.id}
thumbnail: ${video.thumbnail}
link: ${video.link}
description: ${video.title}
---

${video.description}`
    fs.writeFileSync(`${videoPath}/${video.id}.md`, data)
  })
}

export default async function (moduleOptions) {
  await fetchVideos()
}
