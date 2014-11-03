[![Build Status](https://travis-ci.org/carst-it/carsten.svg?branch=master)](https://travis-ci.org/carst-it/carsten)

[![ReviewNinja](http://app.review.ninja/assets/images/wereviewninja-32.png)](http://app.review.ninja/MitchK/carsten)

carsten
==========

Carsten allows you to **carst** stuff. 
Ok, more in detail: The idea is to cast things within your network to a receiver. A receiver can be anything. A TV, a projector, a Tablet. 

How we use Carsten currently:

 * Play a YouTube video
 * Start a Google Hangout on a TV
 * Monitor our CI build statuses
 * Display Doodles
 * ...

The philosophy of carst
--------------------------------------------
Carsten is...
 1. Not a way to stream content from one device to another
 2. Not meant for interaction with the carsted stuff. You just show stuff and that is what you want. If you want to interact, hook it up with your HDMI/DVI/... cable and waste a lot of time instead of showing your message.
 3. Agnostic of permissions, roles or users. If you don't want to become annoyed, just turn your receiver off.
 4. One-Click-Awesome. Don't question it.
 
How it works
------------

 1. On carsten itself, you can add a carst to a queue
 2. A receiver can ask for the current carst and do stuff with it
 3. Carsten will remove the current carst from the queue after a specific timeout
 
 
That's it.

Example Receivers
-----------------

**Receiver for Google Chrome**:
Simple Node.js web service that remotely controls a Google Chrome instance via the Chrome Debug Protocol.
https://github.com/MitchK/carsten-receiver-google-chrome

Run carsten
-----------

```
git clone https://github.com/carst-it/carsten.git
cd carsten
npm install
PORT=3000 node app.js
```

Open http://localhost:3000 in your browser of choice.

