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

var servidor;

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

        	irc_clients[msg.id].addListener('motd', function(motd){
				console.log('[irc-proxy] Comando MOTD: Resposta recebida do servidor IRC...');
				var fila =  "user_"+msg.id;
				enviarParaCliente(fila, {"msg":"<pre>"+motd+"<pre>", 
					"nick": "IRC Server", "timestamp":Date.now()});
			});
			
			irc_clients[msg.id].addListener('nick', function(oldnick, newnick, channels, message){
				console.log('[irc-proxy] Comando NICK: Resposta recebida do servidor IRC.. ')
				var fila = "user_"+msg.id;
				enviarParaCliente(fila, {"msg":"Voce alterou seu nick para "+newnick, 
					"nick": newnick, "timestamp":Date.now()});

				enviarParaClientes({"msg":oldnick+" alterou seu nick para "+ newnick,
				"nick": "IRC Server", 
				"timestamp":Date.now()});
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

			irc_clients[id].addListener('whois', function(info) {
			var txt = (			"<br>"+
								"nick:"+ info.nick+"<br>"+
								"user: "+info.user+"<br>"+
								"host: "+info.host+"<br>"+
								"realname: "+info.realname+"<br>"+
								"channels: "+info.channels+"<br>"+
								"server: "+info.server+"<br>"+
								"serverinfo: "+info.serverinfo+"<br>"+
								"operator: "+info.operator+"<br>"+"<br>");

			var msg = new Buffer(JSON.stringify(txt));
			amqp_ch.assertQueue("whois_"+id, {durable: false});
			amqp_ch.sendToQueue("whois_"+id, msg);
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

				case'/WHOIS':
					irc_clients[msg.id].whois(comando[1]);
			    	break;
			}


		}
		else irc_clients[msg.id].say(msg.canal, msg.msg);

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




