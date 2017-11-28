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

var servidor;

function inicializar() {
	
	receberDoCliente("registro_conexao", function (msg) {
		
		console.log('irc-proxy.js: recebeu registro de conexão');
		
		var id       = msg.id;
		servidor     = msg.servidor;
		var nick     = msg.nick;
		var canal    = msg.canal;

		irc_clients[id] = new irc.Client(
			servidor, 
			nick,
			{channels: [canal]}
		);		
		
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

		irc_clients[id].addListener('motd', function(motd) {
			message = new Buffer(motd);
			amqp_ch.assertQueue("motd_", {durable: false});
			amqp_ch.sendToQueue("motd_", message);
		});

		irc_clients[id].addListener('ping', function(pong) {
			var msg = new Buffer(JSON.stringify(pong));
			amqp_ch.assertQueue("ping_", {durable: false});
			amqp_ch.sendToQueue("ping_", msg);
		});

		proxies[id] = irc_clients[id];
	});
	
	receberDoCliente("gravar_mensagem", function (msg) {
		
		
		var i;
        var privmsg = "";
		var mensagem = msg.msg;
		if(mensagem.charAt(0) == '/')
		{

			var comando = mensagem.split(' ');
			
			switch(comando[0].toUpperCase())
			{	
				case '/MOTD':
					irc_clients[msg.id].send('motd');
				break;

				case '/PING':
					irc_clients[msg.id].emit('ping', servidor);
				break;
                
                case '/PRIVMSG':
                    if(comando[1])
                    {
                        if(comando[2])
                        {
                            for(i=2;i<comando.length;i++)
                            {
                                privmsg += comando[i] + " ";
                            }
                        }
                            
                        irc_clients[msg.id].say(comando[1], '(Privado) '+privmsg);
                    }
				break;
                
			}

		}
		else irc_clients[msg.id].say(msg.canal, msg.msg);


	});

}

function receberDoCliente (canal, callback) {
	
	amqp_ch.assertQueue(canal, {durable: false});
	
	console.log(" [irc] Waiting for messages in "+canal);
	
	amqp_ch.consume(canal, function(msg) {
		
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




