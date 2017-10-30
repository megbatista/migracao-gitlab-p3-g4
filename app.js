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
var executarComandoNick = require('./comandos/nick');
var executarComandoPrivmsg = require('./comandos/privmsg');

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
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {
		
		proxy_id++;
		nicks[proxy_id] = req.cookies.nick;
		servidores[proxy_id] = req.cookies.servidor;
		canais[proxy_id] = req.cookies.canal;

		res.cookie('id', proxy_id);
		res.sendFile(path.join(__dirname, '/index.html'));

	}else {
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

	irc_client.addListener('nick', function(oldnick, newnick, channels, message){
		socket.emit('nick', {'velhonick': oldnick,
		'novonick':newnick, 
		'canais':channels,
		'mensagem':message });
	});

	irc_client.addListener('privmsg', function(to,msg)
	{
		socket.emit('privmsg',{'to':to, 'msg':msg});
		console.log("entrou no listener");
	});

	client.irc_client = irc_client;

	clients[proxy_id] = client;

	//trata as mensagens vindas da interface web(index.html)
	socket.on('message', function (msg) {

		console.log(client.nick+': '+ msg);
				
		if(msg.charAt(0) == '/'){

			var comando = msg.split(' ');
			switch(comando[0].toUpperCase()){
				
				case '/NICK': executarComandoNick(comando[1], client);
				break;

				case '/MOTD': client.irc_client.send('motd');
				break;

				case '/PRIVMSG' : executarComandoPrivmsg(comando, client, clients, canais);
				break;
			}
		}else{
			socket.broadcast.emit('message', socket.nick+': '+msg);
		}
	});
});

app.post('/login', function (req, res) { 
   res.cookie('nick', req.body.nome);
   res.cookie('canal', req.body.canal);
   res.cookie('servidor', req.body.servidor);
   res.redirect('/');
});

server.listen(3000, function () {				
  console.log('Example app listening on port 3000!');	
});
