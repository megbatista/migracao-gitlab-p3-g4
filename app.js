var express = require('express');  // módulo express
var app = express();		   // objeto express
var bodyParser = require('body-parser');  // processa corpo de requests
var cookieParser = require('cookie-parser');  // processa cookies
var irc = require('irc');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));

var path = require('path');	// módulo usado para lidar com caminhos de arquivos

var proxies = {}; // mapa de proxys
var proxy_id = 0;

function proxy(id, servidor, nick, canal) {
	var cache = []; // cache de mensagens

	var irc_client = new irc.Client(
			servidor, 
			nick,
			{channels: [canal],});

	irc_client.addListener('message'+canal, function (from, message) {
	    console.log(from + ' => '+ canal +': ' + message);
	    cache.push(	{"timestamp":Date.now(), 
			"nick":from,
			"msg":message} );
	});
	irc_client.addListener('error', function(message) {
	    console.log('error: ', message);
	});
	irc_client.addListener('mode', function(message) {
	    console.log('mode: ', message);
	});
	proxies[id] = { "cache":cache, "irc_client":irc_client  };

  


	return proxies[id];
}

app.get('/', function (req, res) {
  if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {
	proxy_id++;
	var p =	proxy(	proxy_id,
			req.cookies.servidor,
			req.cookies.nick, 
			req.cookies.canal);
	res.cookie('id', proxy_id);
  	res.sendFile(path.join(__dirname, '/index.html'));
  }
  else {
        res.sendFile(path.join(__dirname, '/login.html'));
  }
});

app.get('/obter_mensagem/:timestamp', function (req, res) {
  var id = req.cookies.id;
  res.append('Content-type', 'application/json');
  res.send(proxies[id].cache);
});

app.post('/gravar_mensagem', function (req, res) {
  proxies[req.cookies.id].cache.push(req.body);
  var irc_client = proxies[req.cookies.id].irc_client;
  irc_client.say(irc_client.opt.channels[0], req.body.msg );
  res.end();
});

app.get('/mode/:usuario/:args', function (req, res){
  var usuario = req.params.usuario;
  var args = req.params.args;
  //var retorno = '{"usuario":'+usuario+','+
  //		  '"args":"'+args+'}';
  
  var irc_client = proxies[req.cookies.id].irc_client;
  var retorno = irc_client.send("mode", usuario, args);
  res.send(retorno);
});
app.get('/mode/', function (req, res){
  
  var irc_client = proxies[req.cookies.id].irc_client;
  var retorno = irc_client.send("mode", req.cookies.nick);
  res.send(retorno);
});


app.post('/login', function (req, res) { 
   res.cookie('nick', req.body.nome);
   res.cookie('canal', req.body.canal);
   res.cookie('servidor', req.body.servidor);
   res.redirect('/');
});

app.listen(3000, function () {				
  console.log('Example app listening on port 3000!');	
});
