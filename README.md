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

We have a public chrome extension, so you can carst every tab with one click! Awesome! You can also start a receiver directly with the extension.

You can download the chrome extension for carsten from: https://chrome.google.com/webstore/detail/carsten/iajlnlmlcidjdpjgdjkkopijgfellabb
 
Carsten Plugins
--------------------------

You want to manipulate time duration, title or icon of the carst? Then you can place your new plugin in the "plugin"-folder of carsten with a unique file name, it's at the same time the plugin name.

In that file you have to create an regular expression to match against the user input string.

Example of url.js:

```
this.expression = new RegExp("^((http|https)://)|(www.)", "i");
```

Than you need to create a function executed after a successful matching. That function has params and a callback as that parameters. 

```
this.fn = function(params, callback) {};
```

The params object has the following attributes:

```
context: for the access to the socket connection, http request, database etc.
match: match array of your created expression
input: input string of user (e.g. an url, a playlist)
inputDuration: duration set by the user
channel: selected channel
```

The callback you have to execute needs your manipulated data in the following pattern:

```
callback({
    status: true,
    info: {
         icon: '',
         title: '',
         duration: '',
         url: ''
     }
 });
```

In fatal error cases you can callback this:

```
callback({
    status: false
 });
```
