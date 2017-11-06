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
//var Part = require('./comandos/part');

io.use(socketio_cookieParser); //usa esse processador de cookies dentro do socketio
//configuranco dos middlewares do express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));


var proxy_id = 0;

//O sistema inicia aqui, quando fazemos a requisicao para localhost:3000
app.get('/', function (req, res) {
	
	//Formato req.cookies: {"nick":"Gustavo","canal":"#sd1","servidor":"ircd","id":"1","io":"JL1ReXHlc7_NLAZiAAAC"}
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) 
	{		
		proxy_id++;
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
	
	var client = socket;

	client.nick =  socket.request.headers.cookie.nick;
	client.servidor = socket.request.headers.cookie.servidor;
	client.canal = socket.request.headers.cookie.canal;

	

	//cria o cliente irc
	var irc_client = new irc.Client(client.servidor, client.nick);

	//o cliente irc vai ouvir respostas do servidor irc atraves dos eventos abaixo
	//e a resposta sera repassada deste servidor para o index.html onde tem outros
	//eventos com o mesmo nome preparados para trata-los
	irc_client.addListener('registered', function(message){
		socket.emit('registrado', "Voce esta registrado no irc");
	});

	irc_client.addListener('motd', function(motd){
		socket.emit('motd', '<pre>'+motd+'</pre>');
		Join(client, client.canal, proxy_id);
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

	irc_client.addListener('message', function(nick, to, text, msg){
		
		console.log('mensagem: ' + msg);
		var mensagem = '&lt' + nick + '&gt ' + text;
		console.log('<' + nick + '>' + text);
		socket.emit('message',mensagem);
	});

	client.irc_client = irc_client;




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

				case '/PRIVMSG' : Privmsg(comando, client);
				break;

//				case '/LIST' : List(client);
				break;

				case '/PING' : Ping(client);
				break;

				case '/JOIN' : Join(client, comando[1]);
				break;

//				case '/PART' : Part(client, comando);
//				break;

			}

		}
		else
		{
			PrivmsgChannel(msg, client);
		}
	});
});

app.post('/login', function (req, res) 
{ 
   res.cookie('nick', req.body.nome);

   if(req.body.canal[0]!='#')
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
