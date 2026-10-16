// Click-to-play video (rich text videoEmbed, lib/portable-text.ts): the facade is a
// link to the video with its poster; a click swaps in the privacy-enhanced player.
export function initVideos() {
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[data-video]')
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    const frame = document.createElement('iframe')
    frame.src = link.dataset.video!
    frame.title = link.dataset.videoTitle || 'Video'
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
    frame.allowFullscreen = true
    frame.className = 'pt-video__frame'
    link.replaceWith(frame)
    frame.focus()
  })
}
