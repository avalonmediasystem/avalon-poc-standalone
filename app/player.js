import HashHandler from './hash_handler'
import IIIFParser from './iiif_parser'
import QualitySelector from './quality_selector'
import 'mediaelement'
import '../node_modules/mediaelement/src/css/mediaelementplayer.css'

/**
 * @class Player
 * @classdesc Class representing a MediaelementJS player wrapper
 */
export default class Player {
  constructor (options) {
    this.iiifParser = new IIIFParser()
    this.manifest = options.manifest
    this.configObj = options.configObj

    // Initial contentObject to build player from
    this.contentObj = options.contentObj

    // Track current player by item.type ie. 'Audio' or 'Video'
    this.currentPlayerType = ''

    // Instance of player
    this.player = undefined

    this.playerElId = 'iiif-av-player'

    // Render initial player
    this.render(this.contentObj)
  }

  /**
   * This will add urls to labels in the structure navigation if they have the class .implicit
   * @function Player#addUrlsForParents
   * @return {void}
   * TODO: Revisit and fix this
   */
  addUrlsForParents () {
    try {
      var parentStopTimes = document.querySelectorAll('.implicit')
      parentStopTimes.forEach((el) => {
        let lastTimeIndex = el.querySelectorAll('.explicit').length - 1
        let childStartStopTime = this.getTimeFromUrl(el.querySelectorAll('.explicit')[lastTimeIndex].querySelector('a').href)
        let newTime = this.replaceTimeInUrl(el.querySelector('.media-structure-uri').href, childStartStopTime)

        let label = el.querySelector('li').textContent
        el.querySelector('li').textContent = ''

        let link = document.createElement('a')
        link.setAttribute('class', 'media-structure-uri')
        link.setAttribute('href', newTime)
        link.text = label
        el.querySelector('li').appendChild(link)
      })
    } catch (e) {
      console.log(e)
    }
  }

  /**
   * Completely remove the current player and it's Mediaelement instance
   * @function Player#destroyPlayerInstance
   * @return {void}
   */
  destroyPlayerInstance () {
    // Remove Mediaelement instance
    if (!this.player.paused) {
      this.player.pause()
    }
    this.player.remove()

    // Clear media tag (<audio> or <video>) from DOM
    let tagName = (this.currentPlayerType === 'Audio') ? 'audio' : 'video'
    let tagNameEl = document.getElementsByTagName(tagName)[0]
    tagNameEl.parentNode.removeChild(tagNameEl)
  }

  /**
   * This takes a url generated by this software (not a URI from the manifest) and returns an object with start/stop in seconds and the duration in milliseconds
   * @function Player#getTimeFromUrl
   * @param {string} url - URL string value
   * @return {Object} - Time key/value object giving start and stop times
   */
  getTimeFromUrl (url) {
    let re = new RegExp(/\d*,\d*/)
    let time = url.match(re)[0]
    let splitTime = time.split(',')
    return {
      start: splitTime[0],
      stop: splitTime[1]
    }
  }

  /**
   * Generate player markup (<audio> or <video>) depending on type of contentObj processed
   * @function Player#generatePlayerMarkup
   * @param {Object} item - Item object for media file
   * @returns {string} markup - <audio> or <video> markup HTML string
   */
  generatePlayerMarkup (contentObj, item) {
    let markup = ''
    let subtitlesObj = this.iiifParser.getSubtitles(contentObj)
    let dimensions = this.iiifParser.getPlayerDimensions(this.manifest, contentObj, item)

    // Audio File
    if (item.type === 'Audio') {
      markup = `<audio width="100%" controls id="${this.playerElId}" data-mejsoptions='{"stretching": "responsive"}'>
          <source src="${item.id}" type="audio/mp3" data-quality="${item.label}">
        </audio>`
    }
    // Video File
    if (item.type === 'Video') {
      markup = `<video class="av-player-controls" id="${this.playerElId}" class="mejs__player" height="${dimensions.height}" width="${dimensions.width}" controls data-mejsoptions='{"pluginPath": "", "alwaysShowControls": "true"}'>
          <source src="${item.id}" type="video/mp4">
          <track kind="subtitles" src="${subtitlesObj.id}" srclang="${subtitlesObj.language}">
        </video>`
    }
    return markup
  }

  /**
   * Creates the quality selector markup
   * @function Player#qualitySelectorMarkup
   * @returns {Object} renderChoices() - A QualitySelector class function which renders choices.
   */
  qualitySelectorMarkup () {
    let qs = new QualitySelector()
    let choices = qs.qualityChoices(this.manifest, '', [])

    return qs.renderChoices(choices)
  }

  /**
   * Create the player html tag (audio or video), and instantiate MediaElementPlayer
   * @function Player#render
   * @param {Object} contentObj - Object representing the media content item
   * @param {string} qualityLevel - Quality level desired ie: 'Low', 'High', 'Medium', etc.
   * @return {void}
   **/
  render (contentObj, qualityLevel = 'Medium') {
    // Get current item in manifest to render
    let item = this.iiifParser.getContentItem(contentObj, qualityLevel)

    // Generate HTML5 markup which Mediaelement will hook into
    let playerMarkup = this.generatePlayerMarkup(contentObj, item)

    // TODO: Use this to hardcode external source files for testing
    // let playerMarkup = `<video class='av-player-controls' id="${this.playerElId}" class="mejs__player" height="480" width="640" controls data-mejsoptions='{"pluginPath": "", "alwaysShowControls": "true"}'>
    //     <source src="https://mallorn.dlib.indiana.edu/streams/02a21687-f628-45f2-b002-9f8987cc908e/085d7022-4134-4d3e-8baf-9e0e386f9c8c/videoshort.mp4" type="application/vnd.apple.mpegURL">
    //   </video>`

    // Update environmental vars
    this.currentPlayerType = item.type
    this.contentObj = contentObj

    // Insert HTML5 tag markup
    document.getElementById(this.configObj.playerWrapperId).innerHTML = playerMarkup

    // Instantiate MediaElement player
    this.player = new MediaElementPlayer(this.playerElId, {}) // eslint-disable-line

    // This enables the custom quality selector
    // TODO: Fix this if we want it working
    // document.getElementById(this.playerElId).insertAdjacentHTML('beforeend', this.qualitySelectorMarkup())

    this.hashHandler = new HashHandler({
      'playerClass': this
    })
  }

  /**
   * This will replace the /time/345,536/ with a new time when given object like this: { start: 230 , stop : 340 }
   * @function Player#replaceTimeInUrl
   * @param {string} url - Url string
   * @param {Object} childStartStopTime
   * @return {string} url - Start stop time key value for url hash
   */
  replaceTimeInUrl (url, childStartStopTime) {
    let startTime = this.getTimeFromUrl(url)
    let ourStart = startTime.start
    let theirStop = childStartStopTime.stop
    let newTimeString = `/time/${ourStart},${theirStop}/`
    let oldTime = (`/time/${startTime.start},${startTime.stop}/`)

    return url.replace(oldTime, newTimeString)
  }
}
