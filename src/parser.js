import uuid from 'node-uuid'
import R from 'ramda'
import mimetype from 'mimetype'
import { cleanNulls } from 'broid-helpers'

export default class Formatter {
  constructor (options) {
    this.options = options
  }

  _createIdentifier () {
    return uuid.v4()
  }

  createActivityStream (raw) {
    let timestamp = Math.floor(Date.now() / 1000)
    if (raw.timestamp) {
      const dateCreatedAt = new Date(raw.timestamp)
      timestamp = dateCreatedAt.getTime()
    }

    return {
      '@context': 'https://www.w3.org/ns/activitystreams',
      published: timestamp,
      type: 'Create',
      generator: {
        id: this.options.service_id,
        type: 'Service',
        name: 'skype',
      },
    }
  }

  createActor (source) {
    return {
      id: source.id,
      type: 'Person',
      name: source.name,
    }
  }

  createTarget (address) {
    const data = {
      type: 'Person',
      name: R.path(['bot', 'name'], address),
      id: R.path(['bot', 'id'], address),
    }

    if (R.path(['conversation', 'isGroup'], address)) {
      data.type = 'Group'
    }

    return data
  }

  format (raw_) {
    const raw = cleanNulls(raw_)
    if (!raw || R.isEmpty(raw)) { return Promise.resolve(null) }

    const attachments_image = R.filter(attachment => attachment.contentType.startsWith('image'), raw.attachments)
    const attachments_video = R.filter(attachment => attachment.contentType.startsWith('video')
      || attachment.contentType === 'application/octet-stream', raw.attachments)

    const activitystreams = this.createActivityStream(raw)
    activitystreams.actor = this.createActor(raw.user)
    activitystreams.target = this.createTarget(raw.address)
    activitystreams.object = {
      type: 'Note',
      id: R.path(['address', 'id'], raw) || this._createIdentifier(),
      context: {
        type: 'Object',
        name: 'address_id',
        content: `${R.path(['address', 'id'], raw)}#${R.path(['address', 'conversation', 'id'],
            raw)}#${R.path(['address', 'channelId'], raw)}#${R.path(['address', 'bot', 'id'], raw)}`,
      },
    }

    if (!R.isEmpty(raw.text)) { activitystreams.object.content = raw.text }

    if (!R.isEmpty(attachments_image)) {
      activitystreams.object.type = 'Image'
      activitystreams.object.url = attachments_image[0].contentUrl
      activitystreams.object.mediaType = mimetype.lookup(attachments_image[0].name)
      activitystreams.object.name = attachments_image[0].name
    } else if (!R.isEmpty(attachments_video)) {
      activitystreams.object.type = 'Video'
      activitystreams.object.url = attachments_video[0].contentUrl
      activitystreams.object.mediaType = mimetype.lookup(attachments_video[0].name)
      activitystreams.object.name = attachments_video[0].name
    }

    return Promise.resolve(activitystreams)
  }
}
