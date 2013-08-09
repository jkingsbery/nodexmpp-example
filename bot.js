var request = require('request'); // github.com/mikeal/request
var sys = require('sys');
var util = require('util');
var xmpp = require('node-xmpp');
 
// Config (get details from https://www.hipchat.com/account/xmpp)
var jid="jamie@localhost";
var password=process.env.PASSWORD;
var room_jid="room@localhost";
var room_nick="jamie";
var UUID=Math.floor(Math.random()*256);
var fullId=jid + '/bot'+UUID;
    var cl = new xmpp.Client({
	    jid: fullId,
	    password: password
	});
 
// Log all data received
cl.on('data', function(d) {
  util.log("[data in] " + d);
});
 
// Once connected, set available presence and join room
cl.on('online', function() {
	cl.send(new xmpp.Message({ type: 'chat' }).c('body').t("Hello there from " + UUID));
	util.log("We're online!");
 
	// set ourselves as online
	cl.send(new xmpp.Element('presence', { type: 'available' }).
		c('show').t('chat')
		);
 
	// join room (and request no chat history)
	cl.send(new xmpp.Element('presence', { to: room_jid+'/'+room_nick }).
		c('x', { xmlns: 'http://jabber.org/protocol/muc' })
		);
 
	// send keepalive data or server will disconnect us after 150s of inactivity
	setInterval(function() {
		cl.send(new xmpp.Message({ type: 'chat' }).c('body').t(UUID + " Checking in."));
	    }, 15000);
    });
 
cl.on('stanza', function(stanza) {
	
	

	// always log error stanzas
	if (stanza.attrs.type == 'error') {
	    util.log('[error] ' + stanza);
	    return;
	}
 
	// ignore everything that isn't a room message
	if (!stanza.is('message') || !stanza.attrs.type == 'groupchat') {
	    return;
	}
 
	// ignore messages we sent
	if (stanza.attrs.from == room_jid+'/'+room_nick) {
	    return;
	}
 
	var body = stanza.getChild('body');
	// message without body is probably a topic change
	if (!body) {
	    return;
	}
	var message = body.getText();
 
	// Look for messages like "!weather 94085"
	if (message.indexOf('!weather') === 0) {
	    var search = message.substring(9);
	    util.log('Fetching weather for: "' + search + '"');
 
	    // hit Yahoo API
	    var query = 'select item from weather.forecast where location = "'+search+'"';
	    var uri = 'http://query.yahooapis.com/v1/public/yql?format=json&q='+encodeURIComponent(query);
	    request({'uri': uri}, function(error, response, body) {
		    body = JSON.parse(body);
		    var item = body.query.results.channel.item;
		    if (!item.condition) {
			response = item.title;
		    } else {
			response = item.title+': '+item.condition.temp+' degrees and '+item.condition.text;
		    }
 
		    // send response
		    cl.send(new xmpp.Element('message', { to: room_jid+'/'+room_nick, type: 'groupchat' }).
			    c('body').t(response)
			    );
		});
	}else{
	    util.log("[msg] " + message);
	}
    });


