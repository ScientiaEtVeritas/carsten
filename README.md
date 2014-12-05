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

Optional: Set the YouTube token for detecting video duration and video title. (You can obtain one via https://code.google.com/apis/console)
```
export YOUTUBE_TOKEN=abyafsdfsdfsrgstgsgf
```

Optional: Set the Vimeo token for detecting video duration and video title. (You can obtain one via https://developer.vimeo.com/)
```
export VIMEO_TOKEN=bdgdgdgwojgjjsdgojlf
```

Optional: Set another default channel, defaults to #global.
```
export DEFAULT_CHANNEL=#main
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

In case of default settings you can open http://localhost:3000 in your browser of choice.

Show Casts
----------

To display carsts you need to install a carsten receiver. 
There is another repository for the carsten receiver: https://github.com/carst-it/carsten-receiver

You can install a carsten receiver on every device, so it's possible to install it on a Raspberry Pi connected to a TV for the best carsten experience.

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
 2. You have to set up the Carsten endpoint once. You can set up more than one Carsten endpoint. Enter your Carsten URL and a channel at Configuration and click "Add new configuration".
 3. Now you can click on that specific configuration to carst a tab to all receivers that have subcribed to the channel you have provided on that endpoint.
 4. After carsting something, the carsts queue appears and you can change positions of carsts or delete them.
