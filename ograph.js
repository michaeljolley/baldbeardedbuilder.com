import { readdir, readFile, writeFile } from 'fs/promises'
import matter from 'gray-matter'
import { apStyleTitleCase } from 'ap-style-title-case'
import { stringify } from 'yaml'
import cld from 'cloudinary'
import dotenv from 'dotenv'
import { intro, outro, spinner, log } from '@clack/prompts'

dotenv.config()

const directory = './src/content/blog'
const cloudinary = cld.v2

cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function updateFrontMatter(filename) {
  const filepath = `${directory}/${filename}`

  const { data: frontMatter, content } = matter(await readFile(filepath))

  try {
    // If an ograph url is not present, generate and save it
    if (!frontMatter.ograph || frontMatter.ograph === '') {
      const ograph = await calculateOgraph(frontMatter, filename)

      frontMatter.ograph = ograph

      const newContent = `---\n${stringify(frontMatter)}---\n${content}`

      await writeFile(filepath, newContent)
    }
    log.info(`✅ ${filepath}`)
  } catch (error) {
    log.error(`❌ ${filepath}`)
  }
}

export async function calculateOgraph(frontMatter, filename) {
  if (!frontMatter.image) return ''

  const imageId = frontMatter.image.replace(/.+\/v\d+/, '')

  const ographUrl = cloudinary.url(imageId, {
    transformation: [
      // Set a black background
      {
        background: 'black',
        width: 1200,
        height: 630,
        crop: 'scale',
      },
      // Gradient over image
      {
        effect: 'gradient_fade:30',
        y: -0.9,
        background: 'black',
      },
      // Title of post
      {
        overlay: {
          font_family: 'Poppins',
          font_size: 56,
          font_weight: 'bold',
          line_spacing: -25,
          text: apStyleTitleCase(frontMatter.title),
        },
        color: 'white',
        gravity: 'south_west',
        x: 80,
        y: 100,
        width: 1000,
        crop: 'fit',
      },
    ],
  })

  const { secure_url: ographSecureUrl } = await cloudinary.uploader.upload(
    ographUrl,
    {
      public_id: 'ograph',
      folder: `/blog/${filename.replace(/\.md$/, '')}`,
      overwrite: true,
    }
  )

  return ographSecureUrl
}

async function main() {
  intro(`BBB: Ograph Generator`)

  const readFileSpinner = spinner()
  readFileSpinner.start('Reading files')
  const filenames = await readdir(directory)
  const markdownFilenames = filenames.filter((f) => f.endsWith('.md'))
  readFileSpinner.stop(`Read ${markdownFilenames.length} files`)

  const ographSpinner = spinner()
  ographSpinner.start('Generating ographs')
  await Promise.all(markdownFilenames.map(updateFrontMatter))
  ographSpinner.stop()
  outro("That's all folks!")
}

main().catch(console.error)
