import path from 'path'

const findAsset = async (publicId) => {
  const { $cloudinary } = require('@nuxtjs/cloudinary')
  return await $cloudinary.explicit(publicId, {
    type: 'upload',
  })
}

const uploadAsset = async (path, publicId) => {
  const { $cloudinary } = require('@nuxtjs/cloudinary')
  return await $cloudinary.upload(path, {
    public_id: publicId,
  })
}

const getAsset = async (path, publicId) => {
  let asset = await findAsset(publicId)

  if (!asset) {
    asset = await uploadAsset(path, publicId)
  }

  return asset || null
}

const loadCover = async (document, slug, root) => {
  // load cover image if needed
  if (document.cover && document.cover.startsWith('./')) {
    const publicId = `${slug}-${document.cover
      .replace('./', '')
      .replace(path.extname(document.cover), '')}`
    const coverPath = path.join(
      root,
      'content',
      document.dir,
      document.cover.replace('./', '')
    )

    document.cover = await getAsset(coverPath, publicId)
    document.cover.secure_url = document.cover.secure_url.replace(
      '/image/upload/',
      '/image/upload/f_auto,q_auto,w_1200,h_600,c_fit/'
    )
  }
}

const loadOgraph = async (document, slug, root) => {
  // load ograph image if needed
  if (document.ograph && document.ograph.startsWith('./')) {
    const publicId = `${slug}-${document.ograph
      .replace('./', '')
      .replace(path.extname(document.ograph), '')}`
    const ographPath = path.join(
      root,
      'content',
      document.dir,
      document.ograph.replace('./', '')
    )

    document.ograph = await getAsset(ographPath, publicId)
    document.ograph.secure_url = document.ograph.secure_url.replace(
      '/image/upload/',
      '/image/upload/f_auto,q_auto,w_1200,h_600,c_fit/'
    )
  }
}

const copyAssets = async (document, slug, root) => {
  const reviewTag = async (el) => {
    if (el.tag && el.tag === 'v-image') {
      const filename = el.props.src.replace('./', '')
      const publicId = `${slug}-${filename.replace(path.extname(filename), '')}`

      const imagePath = path.join(
        root,
        'content',
        document.path.replace('/index', ''),
        filename
      )

      const asset = await getAsset(imagePath, publicId)
      el.props.src = asset.public_id
    }

    if (el.children) {
      for (let i = 0; i < el.children.length; i++) {
        await reviewTag(el.children[i])
      }
    }
  }

  await loadCover(document, slug, root)
  await loadOgraph(document, slug, root)

  if (document.body && document.body.children) {
    document.body.children.forEach((el) => {
      reviewTag(el)
    })
  }
}
export default {
  copyAssets,
}
