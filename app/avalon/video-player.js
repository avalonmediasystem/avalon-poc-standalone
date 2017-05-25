import MediaPlayer from './media-player'
import HashHandler from './hash-handler'
import 'mediaelement'

export default class VideoPlayer extends MediaPlayer {
  constructor (options) {
    super(options)
    this.hashHandler = new HashHandler({'qualityChoices': this.getQualityChoices()})
    this.render()
    this.getLinks()
  }

  render (mediaFragment) {
    /**
     * @param {object} mediaFragment - a mediaFragment
     * this method creates the video element
     **/

    if (mediaFragment === undefined) { mediaFragment = this.getVideoUri().id }
    const videoElement = `<video class='av-player-controls' id="iiif-av-player" class="mejs__player" height="${this.manifest.height}" width="${this.manifest.width}" controls data-mejsoptions='{"pluginPath": "", "alwaysShowControls": "true"}'>
  <source src="${mediaFragment}" type="video/mp4">
  <track kind="subtitles" src="${this.getSubtitles().id}" srclang="${this.getSubtitles().language}" >
</video>`
    const videoStructure = this.createStructure(this.manifest['structures'], [])
    this.target.innerHTML = `<div class='av-player'><div class='av-controls'>${videoStructure}</div><div class='av-controls'>${videoElement}</div></div>`

    // Activate MediaElement
    var player = new MediaElementPlayer('iiif-av-player', {}) // eslint-disable-line

    // Start listening for changes in the hash
    this.hashHandler.bindHashChange()
    var iiifPlayer = document.getElementById('iiif-av-player')
    iiifPlayer.insertAdjacentHTML('beforeend', this.qualitySelectorMarkup())
  }
}
