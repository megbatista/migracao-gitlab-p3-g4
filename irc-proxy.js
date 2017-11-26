var irc = require('irc');
var amqp = require('amqplib/callback_api');

var amqp_conn;
var amqp_ch;
var irc_clients = {};
var canais = {}

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
		console.log('[irc-proxy] Iniciando registro da conexao no servidor IRC');
		irc_clients[msg.id] = new irc.Client(msg.servidor, msg.nick);
		irc_clients[msg.id].addListener('registered', function(message){
			console.log('[irc-proxy] Registro de conexao: resposta recebida do servidor IRC [sucesso!]');
			console.log('[irc-proxy] Solicitando mensagem do dia...');
			irc_clients[msg.id].send('motd');
			var mensagem = { "timestamp": Date.now(), "nick":"IRC Server", "msg":message.args[1] }
			enviarParaCliente("user_"+msg.id, mensagem);
		});		
		
		irc_clients[msg.id].addListener('message'+msg.canal, function (from, message) {
			enviarParaCliente(msg.id, {
				"timestamp": Date.now(), 
				"nick": from,
				"msg": message
			});
		});

		irc_clients[msg.id].addListener('motd', function(motd){
				console.log('[irc-proxy] Comando MOTD: Resposta recebida do servidor IRC...');
				var fila =  "user_"+msg.id;
				enviarParaCliente(fila, {"msg":"<pre>"+motd+"<pre>", 
					"nick": "IRC Server", "timestamp":Date.now()});
			});
		
		irc_clients[msg.id].addListener('error', function(message) {
			console.log('[irc-proxy] Registro de conexao: resposta recebida do servidor IRC [falha :(]');
			console.log('error: ', message);
		});
	});

		//formato msg: id, nick, canal, msg
		receberDoCliente("gravar_mensagem", function (msg) {
			var mensagem = msg.msg.split(' ');
			
			switch(mensagem[0].toUpperCase()){
				case '/NICK':
				 console.log('[irc-proxy] Enviando /NICK para Servidor IRC...');
				 irc_clients[msg.id].send('nick', mensagem[1]);
				 console.log('[irc-proxy] Enviado /NICK...')
				break;
				case '/MOTD': 
					console.log('[irc-proxy] Enviando /MOTD para Servidor IRC...');
					irc_clients[msg.id].send('motd');
					console.log('[irc-proxy] Enviado /MOTD');
				break;
			}

			irc_clients[msg.id].addListener('nick', function(oldnick, newnick, channels, message){
				console.log('[irc-proxy] Comando NICK: Resposta recebida do servidor IRC.. ')
				var fila = "user_"+msg.id;
				enviarParaCliente(fila, {"msg":"Voce alterou seu nick para "+newnick, 
					"nick": "IRC Server", "timestamp":Date.now()});

				enviarParaClientes({"msg":oldnick+" alterou seu nick para "+ newnick,
				"nick": "IRC Server", 
				"timestamp":Date.now()});
			});

			irc_clients[msg.id].addListener('motd', function(motd){
				console.log('[irc-proxy] Comando MOTD: Resposta recebida do servidor IRC...');
				var fila =  "user_"+msg.id;
				enviarParaCliente(fila, {"msg":"<pre>"+motd+"<pre>", 
					"nick": "IRC Server", "timestamp":Date.now()});
			});
		});

}

function enviarParaClientes(mensagem){
	var ex = 'logs';
	amqp_ch.assertExchange(ex, 'fanout', {durable:false});
	amqp_ch.publish(ex, '', new Buffer(JSON.stringify(mensagem)));
	console.log('[irc-proxy] Enviado para fila generica de broadcast: %s', JSON.stringify(mensagem));
}

function receberDoCliente (fila, callback) {
	
	amqp_ch.assertQueue(fila, {durable: false});
	console.log(" [irc-proxy] Aguardando mensagens na "+fila);
	amqp_ch.consume(fila, function(msg) {
		
		console.log(" [irc-proxy] Recebido da fila %s: %s",fila, msg.content.toString());
		callback(JSON.parse(msg.content.toString()));
		
	}, {noAck: true});
}

function enviarParaCliente (fila, mensagem) {
	
	mensagem = new Buffer(JSON.stringify(mensagem));
	
	amqp_ch.assertQueue(fila, {durable: false});
	amqp_ch.sendToQueue(fila, mensagem);
	console.log(" [irc-proxy] Enviado para a "+fila+ ": "+mensagem);
}




