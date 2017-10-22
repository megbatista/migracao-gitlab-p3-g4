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
var proxy_id = 0;

//O sistema inicia aqui, quando fazemos a requisicao para localhost:3000
app.get('/', function (req, res) {
	//verifica se as propriedades req.cookies estao preenchidas, ou entao redirecionada para o arquivo login.html
	//Formato req.cookies: {"nick":"Gustavo","canal":"#sd1","servidor":"ircd","id":"1","io":"JL1ReXHlc7_NLAZiAAAC"}
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {
		proxy_id++;
		//proxy(proxy_id, req.cookies.servidor, req.cookies.nick, req.cookies.canal, socket);
		io.on('connection', (socket)=>{
			socket.emit('me conectei', {});
			socket.nick = req.cookies.nick;
			socket.numid = req.cookies.id;
			socket.servidor = req.cookies.servidor;
			socket.canal = req.cookies.canal;
			socket.irc_client = new irc.Client(socket.servidor, socket.nick, {channels:[socket.canal]});
			socket.irc_client.send('motd');
			proxies[socket.nick] = socket;
			socket.irc_client.addListener('motd', function(motd){
				socket.emit('motd', motd);
			});
		});
		res.cookie('id', proxy_id);
		res.sendFile(path.join(__dirname, '/index.html'));
		
		//no index.html sera criado o websocket que acionara o evento ´connection´ deste servidor
		// ir para io.on(connection...

	}else {
		res.sendFile(path.join(__dirname, '/login.html'));
	}
});

//quando estabelece a conexao com o cliente na interface web,
// o socketio gera o websocket e ele e recebido aqui como parametro socket
io.on('connection', function (socket) {


	console.log(socket.request.headers.cookie);
	proxies[socket.request.headers.cookie.nick].irc_client.send('motd');
	//fica ouvindo mensagens enviadas pela interface web com o evento ´message´
	socket.on('message', function (msg) {

		console.log('Messagem recebida: ', msg);
		
		if(msg.charAt(0) == '/'){
			var comando = msg.split(' ');
			switch(comando[0].toUpperCase()){
				case '/NICK': 
					if(comando[1]){
						var oldnick = proxies[socket.id].nick;
						proxies[socket.id].nick = comando[1];
						socket.broadcast.emit('mudanca-de-nick', oldnick+' mudou seu nick para '+proxies[socket.id].nick)
					}
				break;
			}
		}else{
			socket.broadcast.emit('message', socket.nick+': '+msg);
		}
	});
});


app.post('/gravar_mensagem', function (req, res) {
  // proxies[req.cookies.id].cache.push(req.body);
 // var irc_client = proxies[req.cookies.id].irc_client;
  //irc_client.say(irc_client.opt.channels[0], req.body.msg );
  //res.end();
 console.log(req);
//  res.redirect('/');
});

app.get('/mode/:usuario/:args', function (req, res){
  var usuario = req.params.usuario;
  var args = req.params.args;
  var irc_client = proxies[req.cookies.id].irc_client;
  var retorno = irc_client.send("mode", usuario, args);
  res.send(retorno);
});
app.get('/mode/', function (req, res){
  
  var irc_client = proxies[req.cookies.id].irc_client;
  var retorno = irc_client.send("mode", req.cookies.nick);
  res.send(retorno);
});

//No login.html, e submetido um formulario usando o verbo http post que e mapeado aqui
//adiciona na resposta do servidor na propriedade cookie os valores enviados pelo navegador
app.post('/login', function (req, res) { 
   res.cookie('nick', req.body.nome);
   res.cookie('canal', req.body.canal);
   res.cookie('servidor', req.body.servidor);
   res.redirect('/');
});

server.listen(3000, function () {				
  console.log('Example app listening on port 3000!');	
});
