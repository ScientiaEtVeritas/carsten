[![Build Status](https://travis-ci.org/carst-it/carsten.svg?branch=master)](https://travis-ci.org/carst-it/carsten)

[![ReviewNinja](http://app.review.ninja/assets/images/wereviewninja-32.png)](http://app.review.ninja/MitchK/carsten)

carsten
==========

Carsten allows you to **carst** stuff. 
Ok, more in detail: The idea is to cast things within your network to a receiver. A receiver can be anything. A TV, a projector, a Tablet. 

How we use Carsten currently:

 * Play a YouTube video
 * Start a Google Hangout on a TV
 * Monitor our CI build statuses of Drone.io or Jenkins
 * Display Doodles
 * ...

The philosophy of carst
--------------------------------------------
Carsten is...

 1. Not meant for interaction with the carsted stuff. You just show stuff and that is what you want. If you want to interact, hook it up with your HDMI/DVI/... cable and waste a lot of time instead of showing your message.
 2. Agnostic of permissions, roles or users. If you don't want to become annoyed, just turn your receiver off.
 3. One-Click-Awesome. Don't question it.
 
How it works
------------

 1. On carsten itself, you can add a carst to a queue
 2. A receiver can ask for the current carst and do stuff with it

That's it.

Install Carsten
-----------

Clone it from GitHub and install Carsten's dependencies
```
git clone https://github.com/carst-it/carsten.git
cd carsten
npm install
```

Set Environment Variables
-------------------------
For the following steps, you can replace "export" with "set" on Windows.

Optional: Set the port of Carsten.
```
export PORT=3000
```

Optional: Set the YouTube token. (You can obtain one via https://code.google.com/apis/console)
```
export YOUTUBE_TOKEN=abyafsdfsdfsrgstgsgf
```

Optional: Set a HTTP proxy, if you are behind a corporate firewall.
```
export HTTP_PROXY=http://proxy:8080
```

Run Carsten
-----------
```
npm start
```

Open http://localhost:3000 in your browser of choice.

Install Chrome Extension
------------------------

Currently, we haven't published the chrome extension yet. You need to install it manually.

 1. Open your Carsten instance in the browser
 2. Download the Chrome Extension as a .crx file
 3. Open the .crx in a file browser
 4. Open in Chrome: chrome://extensions
 5. Drag the .crx file into the Chrome Window

Use The Chrome Extension
------------------------

 1. If you want to carst a Browser Tab, you can click on the Monitor Icon on the upper-right corner.
 2. You have to set up the Carsten endpoint once. Enter your Carsten URL.
 3. Now you can click on "Send this Tab" to carst a tab to all receivers that have subcribed to the channel you have provided.

