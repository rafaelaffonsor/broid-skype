# Broid Skype Parser

Broid allows you to connect your application/bot to multiple messaging channels.

It provides a higher level API to manage several messaging platforms at once, and lets you focus on your core business by using a open and unique format to talk to the entire world.

## Getting started

The following examples use yarn package manager but you can use npm.

`connect` and `listen` method return [a observable](http://reactivex.io/rxjs/).

### Connect to Slack

```javascript
import broidSkype from 'broid-skype'

const skype = new broidSkype({
  token: 'xxxxx',
  token_secret: 'xxxxxx',
})

skype.connect()
  .subscribe({
    next: data => console.log(data),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  })
```

### Receive a message

```javascript
skype.listen()
  .subscribe({
    next: data => console.log(`Received message: ${data}`),
    error: err => console.error(`Something went wrong: ${err.message}`),
    complete: () => console.log('complete'),
  })
```

### Post a message

To send a message, the format should use the [broid-schemas](https://github.com/broidhq/broid-schemas).

```javascript
const message_formated = '...'

skype.send(message_formated)
  .then(() => console.log("ok"))
  .catch(err => console.error(err))
```

## Buttons supported

| mediaType        | Action types  | Content of value property  |
| ---------------- |:-------------:| --------------------------|
| text/html        | open-url      | URL to be opened in the built-in browser. |
| audio/telephone-event | call     | Destination for a call in following format: "tel:123123123123". |
|                       | imBack   | Text of message which client will sent back as ordinary chat message. |


## Examples of messages

### Message received

- A simple direct message received from Sally

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "published": 1482903365195,
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "skype"
  },
  "actor": {
    "type": "Person",
    "name": "Sally",
    "id": "2932680234"
  },
  "object": {
    "type": "Note",
    "content": "hello world",
    "id": "814382944357937155",
    "context": {
      "type": "Object",
      "content": "xxxxxxx#29:xxxxxxx#skype#28:xxxxxxxx"
    }
  },
  "target": {
    "type": "Person",
    "name": "MyBot",
    "id": "1132680234"
  }
}
```

- A image received from Sally

```json
{
 "@context": "https://www.w3.org/ns/activitystreams",
 "published": 1483147401733,
 "type": "Create",
 "generator": {
   "id": "bf4ef3de-486b-40ea-80e1-e8d5af86d81c",
   "type": "Service",
   "name": "skype"
 },
 "actor": {
   "id": "29:xxxxxxxxx",
   "type": "Person",
   "name": "Sally"
 },
 "target": {
   "type": "Person",
   "name": "MyBot",
   "id": "28:xxxxxxxxxxxx"
 },
 "object": {
   "type": "Image",
   "id": "1483147401729",
   "context": {
     "type": "Object",
     "name": "address_id",
     "content": "xxxxxxx#29:xxxxxxxxxxxx#skype#28:xxxxxxxxxxxx"
   },
   "url": "https://apis.skype.com/v2/attachments/0-cus-d1-432cb4158e59c36bc0814217ecf46318/views/original",
   "mediaType": "image/jpeg",
   "name": "image_name.jpg"
 }
}

```


### Send a message

- Send a simple message

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "skype"
  },
  "object": {
    "type": "Note",
    "content": "hello world",
    "context": {
      "type": "Object",
      "name": "address_id",
      "content": "xxxxxxx#29:xxxxxxxxxxxx#skype#28:xxxxxxxxxxxx"
    }
  },
  "to": {
    "type": "Person",
    "id": "2932680234"
  }
}
```

- Send a Image, Video

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "skype"
  },
  "object": {
    "content": "hello world",
    "type": "Image",
    "url": "https://unsplash.it/200/300",
    "context": {
      "type": "Object",
      "name": "address_id",
      "content": "xxxxxxx#29:xxxxxxxxxxxx#skype#28:xxxxxxxxxxxx"
    }    
  },
  "to": {
    "type": "Person",
    "id": "2932680234"
  }
}
```


- Send quick reply message

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "Create",
  "generator": {
    "id": "f6e92eb6-f69e-4eae-8158-06613461cf3a",
    "type": "Service",
    "name": "skype"
  },
  "object": {
    "type": "Note",
    "content": "hello world",
    "attachment": [{
        "type": "Button",
        "content": "Broid's website",
        "name": "broid",
        "mediaType": "text/html",
        "url": "https://www.broid.ai"
    }, {
        "type": "Button",
        "content": "Falken's Maze",
        "name": "maze",
        "url": "value_maze"
    }],
    "context": {
      "type": "Object",
      "name": "address_id",
      "content": "xxxxxxx#29:xxxxxxxxxxxx#skype#28:xxxxxxxxxxxx"
    }    
  },
  "to": {
    "type": "Person",
    "id": "2932680234"
  }
}
```

## License

Copyright (c) [2016] Broid.AI

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
