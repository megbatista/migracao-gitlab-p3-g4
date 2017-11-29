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
		

		irc_clients[id].addListener('message', function (nick, to, text, msg){
	
			console.log('<' + nick + '>' + text);
			
			enviarParaCliente(id, {
				 "timestamp": Date.now(), 
				 "nick": nick,
				 "msg": text
			});
		});
		
		irc_clients[id].addListener('error', function(message) {
			console.log('error: ', message);
		});

		irc_clients[id].addListener('motd', function(motd) {
			message = new Buffer(motd);
			amqp_ch.assertQueue("motd_"+id, {durable: false});
			amqp_ch.sendToQueue("motd_"+id, message);
		});

		irc_clients[id].addListener('ping', function(pong) {
			var msg = new Buffer(JSON.stringify(pong));
			amqp_ch.assertQueue("ping_"+id, {durable: false});
			amqp_ch.sendToQueue("ping_"+id, msg);
		});
		
		irc_clients[id].addListener('join', function(canal, nick, message) {

            enviarParaCliente(id, {
                "timestamp": Date.now(),
                "nick": nick,
				"canal":canal,
                "msg": " "
            });
			console.log(nick+' entrou no canal'+ canal);
		});
        
        irc_clients[id].addListener('part', function(canal, nick, reason, message) {

            enviarParaCliente(id, {
                "timestamp": Date.now(),
                "nick": nick,
                "canal": "",
                "msg": " "
            });
            console.log(nick+' saiu do canal'+ canal);
		});


		proxies[id] = irc_clients[id];
	});
	
	receberDoCliente("gravar_mensagem", function (msg) {
		
		var i;
		var privmsg = "";
        var channelmsg = "";
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
							
							irc_clients[msg.id].say(comando[1], '(Privado) '+privmsg);

						}
							
					}
					
				break;
				
				case '/JOIN':
					
					if(comando[1])
                    {
                        if (comando[1][0]!='#')comando[1] = '#'+comando[1];
                        irc_clients[msg.id].say(comando[1], '[SAIU DO CANAL]');
                        irc_clients[msg.id].part(comando[1]);
                        irc_clients[msg.id].join(comando[1]);
                        irc_clients[msg.id].say(comando[1], '[ENTROU NO CANAL]');
                        
                    }

				break;

                case '/PART':

                    if(comando[1])
                    {
                        if (comando[1][0]!='#')comando[1] = '#'+comando[1];
                        irc_clients[msg.id].say(comando[1], '[SAIU DO CANAL]');
                        irc_clients[msg.id].part(comando[1]);

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




