var express = require('express');            // módulo express
var app = express();	                    // objeto express
var bodyParser = require('body-parser');     // processa corpo de requests
var cookieParser = require('cookie-parser'); // processa cookies
var path = require('path');                  // caminho de arquivos
var amqp = require('amqplib/callback_api');  // comunicação amqp

app.use(bodyParser.json());
app.use(bodyParser.urlencoded( { extended: true } ));
app.use(cookieParser());
app.use(express.static('public'));

var id_gen = 0; // Gerador de ID
var users = {}; // Usuários
var amqp_conn;
var amqp_ch;

// Estabelece conexão com o servidor AMQP antes de qualquer cliente se conectar
amqp.connect('amqp://localhost', function(err, conn) {
	conn.createChannel(function(err, ch) {
		amqp_conn = conn;
		amqp_ch = ch;
	});
});

app.post('/login', function (req, res) { 	
	res.cookie('nick', req.body.nome);
	if(req.body.canal && req.body.canal[0]!='#'){
		req.body.canal = '#'+req.body.canal;
	}
	res.cookie('canal', req.body.canal);
	res.cookie('servidor', req.body.servidor);
	res.redirect('/');
});

// Faz o registro de conexão com o servidor IRC
app.get('/', function (req, res) {
	if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {
		id_gen++; // Cria um ID para o usuário
		var id = id_gen;
		users[id] = {cache: [{
			"timestamp": Date.now(), 
	  		 "nick": "IRC Server",
	  		 "msg": "Bem vindo ao servidor IRC"}]}; 
	
	   res.cookie('id', id);
	   
	   var msg = { "id": id, 	"servidor": req.cookies.servidor, "nick": req.cookies.nick, 
		"canal": req.cookies.canal };
	
	   users[id].id       = msg.id;
	   users[id].servidor = msg.servidor;
	   users[id].nick     = msg.nick;
	   users[id].canal    = msg.canal;
	   
	   // Envia registro de conexão para o servidor
	   enviarParaServidor("registro_conexao", msg);
	   //formato msg : msg, nick, timestamp
	   receberBroadcast(function(msg){
		   var i =0;
			for(i = 0; i < 1000; i++){
				if(users[i]){
					users[i].cache.push(msg);
				}
			}
	   });

	   // Se inscreve para receber mensagens endereçadas a este usuário
	   receberDoServidor(id, function (id_real, msg) {
		   console.log("[app] Armazenando mensagem do servidor no buffer do %s [user_%d]: %s", users[id_real].nick, users[id_real].id, JSON.stringify(msg));
		   if(msg.nick != "IRC Server"){
		  	 users[id_real].nick = msg.nick;
		   }
		   users[id_real].cache.push(msg);
	   });
	   res.sendFile(path.join(__dirname, '/index.html'));
	}
	else {
		res.sendFile(path.join(__dirname, '/login.html'));
	}
});

// Obtém mensagens armazenadas em cache (via polling)
app.get('/obter_mensagem/:timestamp', function (req, res) {
	var id = req.cookies.id;
	res.cookie('nick', users[id].nick);
	var response = users[id].cache;
	users[id].cache = [];
	
	res.append('Content-type', 'application/json');
	res.send(response);
});

// Envia uma mensagem para o servidor IRC
app.post('/gravar_mensagem', function (req, res) {
	console.log('[app] Armazenando mensagem digitada no buffer do %s [user_%d]: %s', req.cookies.nick, req.cookies.id, JSON.stringify(req.body));
	users[req.cookies.id].cache.push(req.body);
	enviarParaServidor("gravar_mensagem", {
		"id": req.cookies.id,
		"nick": users[req.cookies.id].nick,
		"canal": users[req.cookies.id].canal, 
		"msg": req.body.msg
	});
	res.end();
});

function enviarParaServidor (fila, msg) {
	msg = new Buffer(JSON.stringify(msg));
	amqp_ch.assertQueue(fila, {durable: false});
	amqp_ch.sendToQueue(fila, msg);
	console.log(" [app] Enviando mensagem para a fila %s: %s", fila, msg);	
}

//se inscreve na fila user_<id> para receber mensagens que sao armazenadas no cache
function receberDoServidor (id, callback) {
	amqp_ch.assertQueue("user_"+id, {durable: false});
	console.log(" [app] Aguardando mensagens para a fila: user_"+ id);
	amqp_ch.consume("user_"+id, function(msg) {
		console.log(" [app] Recebido para a fila  user_"+id+": "+msg.content.toString());
		callback(id, JSON.parse(msg.content.toString()));
	}, {noAck: true});
}

function receberBroadcast(callback){
	   var ex = 'logs';

    amqp_ch.assertExchange(ex, 'fanout', {durable: false});

    amqp_ch.assertQueue('', {exclusive: true}, function(err, q) {
      console.log(" [app] Aguardando mensagens na fila de broadcast generica %s.", q.queue);
      amqp_ch.bindQueue(q.queue, ex, '');

      amqp_ch.consume(q.queue, function(msg) {
        console.log(" [app] Recebida na fila de broadcast generica %s", msg.content.toString());
		callback(JSON.parse(msg.content.toString()));
      }, {noAck: true});
    });
}

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');	
});
