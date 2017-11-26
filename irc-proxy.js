var irc = require('irc');
var amqp = require('amqplib/callback_api');

var proxies = {}; // mapa de proxys
var amqp_conn;
var amqp_ch;
var irc_clients = {};

// Conexão com o servidor AMQP
amqp.connect('amqp://localhost', function(err, conn) {
	
	conn.createChannel(function(err, ch) {
		
		amqp_conn = conn;
		amqp_ch = ch;
		
		inicializar();
	});
});

function inicializar() {
	
	receberDoCliente("registro_conexao", function (msg) {
		
		console.log('irc-proxy.js: recebeu registro de conexão');
		
		var id       = msg.id;
		var servidor = msg.servidor;
		var nick     = msg.nick;
		var canal    = msg.canal;
		
		irc_clients[id] = new irc.Client(servidor, nick);


		irc_clients[id].addListener('registered', function(message){
			enviarParaCliente(id, message);
		});		
		
		irc_clients[id].addListener('message'+canal, function (from, message) {
			
			console.log(from + ' => '+ canal +': ' + message);
			
			enviarParaCliente(id, {
				"timestamp": Date.now(), 
				"nick": from,
				"msg": message
			});
		});
		
		irc_clients[id].addListener('error', function(message) {
			console.log('error: ', message);
		});
		
		proxies[id] = irc_clients[id];
	});
	
	receberDoCliente("gravar_mensagem", function (msg) {
		console.log('A mensagem recebida no irc-proxy foi: '+ msg);
		//irc_clients[msg.id].say(msg.canal, msg);
	});
}

function receberDoCliente (fila, callback) {
	
	amqp_ch.assertQueue(fila, {durable: false});
	
	console.log(" [irc] Waiting for messages in "+fila);
	
	amqp_ch.consume(fila, function(msg) {
		
		console.log(" [irc] Received %s", msg.content.toString());
		callback(JSON.parse(msg.content.toString()));
		
	}, {noAck: true});
}

function enviarParaCliente (id, msg) {
	
	msg = new Buffer(JSON.stringify(msg));
	
	amqp_ch.assertQueue("user_"+id, {durable: false});
	amqp_ch.sendToQueue("user_"+id, msg);
	console.log(" [irc] Sent to ID "+id+ ": "+msg);
}




