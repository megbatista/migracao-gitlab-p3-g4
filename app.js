var express = require('express');  // módulo express
var app = express();		   // objeto express
var server = require('http').Server(app); // coloca o express dentro do servidor http
var io = require('socket.io')(server);//coloca o servidor dentro do socketio
var bodyParser = require('body-parser');  // processa corpo de requests
var cookieParser = require('cookie-parser');  // processa cookies
var irc = require('irc');// api para conectarmos com um servidor irc
var socketio_cookieParser = require('socket.io-cookie'); //processa cookies do socketio
var path = require('path');	// módulo usado para lidar com caminhos de arquivos

//comandos

var Nick = require('./comandos/nick');
var Privmsg = require('./comandos/privmsg');
var List = require('./comandos/list');
var Ping = require('./comandos/ping');
var Join = require('./comandos/join');
var PrivmsgChannel = require('./comandos/privmsg-channel');
var executarComandoInvite = require('./comandos/invite');
var executarComandoWhois = require('./comandos/whois');


io.use(socketio_cookieParser); //usa esse processador de cookies dentro do socketio
//configuranco dos middlewares do express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));

var proxies = {}; // mapa de proxys
var clients = [];

var nicks=[];
var servidores=[];
var canais=[];
var proxy_id = 0;
var irc_client;

//O sistema inicia aqui, quando fazemos a requisicao para localhost:3000
app.get('/', function (req, res) {
	
	//Formato req.cookies: {"nick":"Gustavo","canal":"#sd1","servidor":"ircd","id":"1","io":"JL1ReXHlc7_NLAZiAAAC"}
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) 
	{		
		proxy_id++;

		nicks[proxy_id] = req.cookies.nick;
		servidores[proxy_id] = req.cookies.servidor;
		canais[proxy_id] = req.cookies.canal;

		//console.log('nick: '+req.cookies.nick+' servidor: '+req.cookies.servidor+' canal: '+req.cookies.canal);

		res.cookie('id', proxy_id);
		res.sendFile(path.join(__dirname, '/index.html'));		

	}
	else 
	{
		res.sendFile(path.join(__dirname, '/login.html'));
	}
});

//conecta cliente e servidor via websocket
io.on('connection', function (socket) {
	
	proxies[proxy_id] = socket;
	
	var client = socket;
	
	client.nick =  nicks[proxy_id];
	client.servidor = servidores[proxy_id];
	client.canal = canais[proxy_id];

	//cria o cliente irc
	irc_client = new irc.Client(client.servidor, client.nick);

	//o cliente irc vai ouvir respostas do servidor irc atraves dos eventos abaixo
	//e a resposta sera repassada deste servidor para o index.html onde tem outros
	//eventos com o mesmo nome preparados para trata-los
	irc_client.addListener('registered', function(message){
		socket.emit('registrado', "Voce esta registrado no irc");
	});

	irc_client.addListener('motd', function(motd){
		socket.emit('motd', '<pre>'+motd+'</pre>');
	});

	irc_client.addListener('error', function(message){
		socket.emit('erro', 'Um erro ocorreu: '+message);
	});

	irc_client.addListener('nick', function(oldnick, newnick, channels){
		socket.emit('nick', {'velhonick': oldnick,
		'novonick':newnick, 
		'canais':channels });
	});

	irc_client.addListener('privmsg', function(to)
	{
		socket.emit('privmsg', to);
	});

	irc_client.addListener('envio-privmsg', function(to)
	{
		socket.emit('envio-privmsg', to);
	});


	irc_client.addListener('list', function(channels)
	{
		socket.emit('list', channels);
	});

	irc_client.addListener('pingpong', function(pong)
	{
		socket.emit('pingpong', pong);
	});


	irc_client.addListener('join', function(channel)
	{
		socket.emit('join', channel);
	});
	
	irc_client.addListener('quit', function(nick, reason, channels, message){
		socket.broadcast.emit('quit', nick);
		client.disconnect();
	});

	irc_client.addListener('invite', function(channel, from, message) {
		socket.emit('invite', {'canal': channel, 'from': from, 'msg': message});
	});
	
	irc_client.addListener('whois', function(info)
	{
		socket.emit('whois', info);
	});

	client.irc_client = irc_client;

	Join(client, client.canal, canais);

	clients[proxy_id] = client;

	//trata as mensagens vindas da interface web(index.html)
	socket.on('message', function (msg) {

		console.log(client.nick+': '+ msg);
				
		if(msg.charAt(0) == '/')
		{

			var comando = msg.split(' ');

			switch(comando[0].toUpperCase())
			{
				
				case '/NICK': Nick(comando[1], client);
				break;

				case '/MOTD': client.irc_client.send('motd');
				break;

				case '/PRIVMSG' : Privmsg(comando, client, clients, canais);
				break;

				case '/LIST' : List(client, canais);
				break;

				case '/QUIT': client.irc_client.emit('quit', client.nick, msg, client.canal.toString());
				break;

				case '/INVITE': executarComandoInvite(comando[1], comando[2], client.nick, clients);
                break;

				case '/PING' : Ping(client);
				break;

				case '/JOIN' : Join(client, comando[1], canais);							   
				break;

				case '/WHOIS': executarComandoWhois(comando[1],client);
				break;
			}

		}
		else
		{
			PrivmsgChannel(msg, client, clients, canais);
		}
	});
});

app.post('/login', function (req, res) 
{ 
	res.cookie('nick', req.body.nome);

	if(req.body.canal && req.body.canal[0]!='#')
	{
			req.body.canal = '#'+req.body.canal;
	}

	res.cookie('canal', req.body.canal);
	res.cookie('servidor', req.body.servidor);
	res.redirect('/');
});

server.listen(3000, function () {				
  console.log('Example app listening on port 3000!');	
});
