import botbuilder from 'botbuilder'
import express from 'express'
import uuid from 'node-uuid'
import R from 'ramda'
import Promise from 'bluebird'
import mimetype from 'mimetype'
import Rx from 'rxjs/Rx'
import broidSchemas from 'broid-schemas'
import { Logger, defaults } from 'broid-helpers'

import Parser from './parser'

export default class Adapter {
  constructor (options) {
    options.http = defaults(options.http || {}, {
      webhook_url: 'http://localhost:8080',
      port: 8080,
      host: '0.0.0.0',
    })

    this.options = defaults(options, {
      service_id: uuid.v4(),
      log_level: null,
      http: {
        webhook_url: 'http://localhost:8080',
        port: 8080,
        host: '0.0.0.0',
      },
    })

    this._storeUsers = new Map()
    this._storeAddress = new Map()

    this.session_connector = new botbuilder.ChatConnector({
      appId: this.options.token,
      appPassword: this.options.token_secret,
    })

    this.session = new botbuilder.UniversalBot(this.session_connector)
    this.formatter = new Parser({
      service_id: this.options.service_id,
      debug: this.options.log_level ? 'debug' : null,
    })
  }

  serviceID () {
    return this.options.service_id
  }

  connect () {
    if (this._connected) {
      return Rx.Observable.of({ type: 'connected', service_id: this.serviceID() })
    }

    this._connected = true
    this.server = express()
    this.server.post('/', this.session_connector.listen())

    this.server.listen(this.options.http.port, this.options.http.host, () =>
      Logger.info(`Server Webhook listening on ${this.options.http.host}:${this.options.http.port}`))

    return Rx.Observable.of({ type: 'connected', service_id: this.serviceID() })
  }

  disconnect () {
    return Promise.reject(new Error('Not supported'))
  }

  channels () {
    return Promise.reject(new Error('Not supported'))
  }

  users () {
    return Promise.resolve(R.values(this._storeUsers))
  }

  addresses (id) {
    if (this._storeAddress[id]) { return Promise.resolve(this._storeAddress[id]) }
    return Promise.reject(new Error(`Address ${id} not found`))
  }

  listen () {
    return Rx.Observable.create((observer) => {
      observer.next({ type: 'authenticated', service_id: this.serviceID() })

      this.session.dialog('/', (event) => {
        this._storeAddress.set(R.path(['message', 'address', 'id'], event), R.path(['message', 'address'], event))
        this._storeUsers.set(R.path(['message', 'user', 'id'], event), R.path(['message', 'user'], event))

        Promise.resolve(event.message)
          .then(this.formatter.format.bind(this.formatter))
          .then(formatted => [formatted, broidSchemas(formatted, R.prop('type', formatted || {})
            ? formatted.type.toLowerCase() : 'create')])
          .spread(formatted => {

            if (formatted) { observer.next(formatted) }
          })
          .catch(error => Logger.error(error))
      })

      // Note that this is optional, you do not have to return
      // this if you require no cleanup
      return () => Logger.debug('disposed')
    })
  }

  send (data) {
    return broidSchemas(data, 'send').then(() => {
      const context = R.path(['object', 'context', 'content'], data)
      const content = R.path(['object', 'content'], data)
      const name = R.path(['object', 'name'], data)
      const type = R.path(['object', 'type'], data)
      const context_arr = R.split('#', context)
      const address_id = context_arr[0]

      let address = this._storeAddress.get(address_id)

      if (!address) {
        if (R.length(context_arr) !== 4) {
          return Promise.reject(new Error('Context value should use the form: address.id#address.conversation.id#channelId#bot.id'))
        }

        const conversation_id = context_arr[1]
        const channel_id = context_arr[2]
        const bot_id = context_arr[3]
        const user_id = R.path(['to', 'id'], data)

        address = {
          useAuth: true,
          id: address_id,
          channelId: channel_id,
          serviceUrl: `https://${channel_id}.botframework.com`,
          conversation: {
            id: conversation_id,
          },
          user: {
            id: user_id,
          },
          bot: {
            id: bot_id,
          },
        }
      }

      // Process attachment
      const attachment_buttons = R.filter((attachment) => attachment.type === 'Button', R.path(['object', 'attachment'], data) || [])
      const message_buttons = R.map(button => {
        if (button.mediaType === 'text/html') {
          return botbuilder.CardAction.openUrl(null, button.url, button.name || button.content)
        } else if (button.mediaType === 'audio/telephone-event') {
          return botbuilder.CardAction.call(null, `tel:${button.url}`, button.name || button.content)
        }
        return botbuilder.CardAction.imBack(null, button.url, button.name || button.content)
      }, attachment_buttons)

      let message_attachments = null
      const message_builder = new botbuilder.Message()
        .textFormat(botbuilder.TextFormat.markdown)
        .address(address)

      if (type === 'Note') {
        if (!message_buttons) {
          message_builder.text(content)
        } else {
          message_attachments = [
            new botbuilder.HeroCard(null)
              .title(name)
              .text(content)
              .buttons(message_buttons),
          ]
        }
      } else if (type === 'Image' || type === 'Video') {
        const url = R.path(['object', 'url'], data)
        const name = R.path(['object', 'name'], data)
        let hero = new botbuilder.HeroCard(null)
          .title(name)
          .text(content)

        if (message_buttons) {
          hero.buttons(message_buttons)
        }

        if (type === 'Image') {
          hero.images([botbuilder.CardImage.create(null, url)])
          hero = [hero]
        } else {
          hero = [{
            contentType: mimetype.lookup(url),
            contentUrl: url,
          }, hero]
        }

        message_attachments = hero

        // Video Card not supported by Skype
        // message_builder = new botbuilder.Message()
        //   .textFormat(botbuilder.TextFormat.markdown)
        //   .address(address)
        //   .attachments([
        //     new botbuilder.VideoCard()
        //       .title(name)
        //       .text(content)
        //       .image(botbuilder.CardImage.create(null, preview))
        //       .media([ botbuilder.CardMedia.create(null, url) ])
        //       .autoloop(true)
        //       .autostart(false)
        //       .shareable(true)
        //   ])
      }

      if (type === 'Note' || type === 'Image' || type === 'Video') {
        message_builder.attachments(message_attachments)
        return this.session.send(message_builder)
      }

      return Promise.reject(new Error('Note, Image, Video, Place are only supported.'))
    })
  }
}
