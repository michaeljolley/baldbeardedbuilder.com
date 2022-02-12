import titleCase from 'ap-style-title-case'

export default (title, tags) => {
  const titleString = `/l_text:Cairo_56_bold_line_spacing_-45:${encodeURI(titleCase(title))},g_north_west,x_65,y_225,w_900,c_fit,co_rgb:FFFFFF`;
  const tagString = tags ? `/l_text:Cairo_24_regular_letter_spacing_4:${tags.map((t) => `%23${t.toLowerCase()}`).join('%20')},g_north_west,x_65,y_265,co_rgb:03ffdf` : '';

  return `https://res.cloudinary.com/dk3rdh3yo/image/upload/b_rgb:000${tagString}${titleString}/ograph-base.png`
}
