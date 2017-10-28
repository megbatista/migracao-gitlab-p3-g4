var express = require('express');  // módulo express
var app = express();		   // objeto express

var server = require('http').Server(app); // coloca o express dentro do servidor http

var io = require('socket.io')(server);//coloca o servidor dentro do socketio

var bodyParser = require('body-parser');  // processa corpo de requests
var cookieParser = require('cookie-parser');  // processa cookies
var irc = require('irc');// api para conectarmos com um servidor irc

var socketio_cookieParser = require('socket.io-cookie'); //processa cookies do socketio
io.use(socketio_cookieParser); //usa esse processador de cookies dentro do socketio

//configuranco dos middlewares do express
app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));


var path = require('path');	// módulo usado para lidar com caminhos de arquivos
var proxies = {}; // mapa de proxys
var nicks=[];
var proxy_id = 0;

//O sistema inicia aqui, quando fazemos a requisicao para localhost:3000
app.get('/', function (req, res) {
	
	//Formato req.cookies: {"nick":"Gustavo","canal":"#sd1","servidor":"ircd","id":"1","io":"JL1ReXHlc7_NLAZiAAAC"}
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {
		
		proxy_id++;
		nicks[proxy_id] = req.cookies.nick;
		res.cookie('id', proxy_id);
		res.sendFile(path.join(__dirname, '/index.html'));

	}else {
		res.sendFile(path.join(__dirname, '/login.html'));
	}
});

io.on('connection', function (socket) {
	
	proxies[proxy_id] = socket;
	proxies[proxy_id].nick =  nicks[proxy_id];
	socket.on('message', function (msg) {

		console.log('Messagem recebida: ', msg);
				
		if(msg.charAt(0) == '/'){

			var comando = msg.split(' ');

			switch(comando[0].toUpperCase()){
				
				case '/NICK': 
					if(comando[1]){
						var oldnick = proxies[proxy_id].nick;
						proxies[proxy_id].nick = comando[1];
						socket.broadcast.emit('mudanca-de-nick', oldnick+' mudou seu nick para '+proxies[socket.id].nick)
					}
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
