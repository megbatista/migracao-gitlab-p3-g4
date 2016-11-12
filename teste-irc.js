var irc = require('irc');

var servidor = 'irc.freenode.net';
var nick = 'testes';
var canal = '#sd1-ec-2016-2';
var dentro_do_canal = false;

var client = new irc.Client( 	servidor,
				nick,
				{ channels: [ canal ],}
);


// disparado quando o cliente estiver conectado
client.addListener('registered', function(message) {
  console.log('conectado:'+JSON.stringify(message));
});

// disparado quando entrar no canal
client.addListener('join', function(message) {
  dentro_do_canal = true;
  console.log('entrou em canal:'+JSON.stringify(message));
  // somente pode-se enviar mensagem depois de entrar no canal
  client.say(canal, "entrei no canal");
  client.say(canal, "iniciei a listagem de usuários no canal");
   client.send('names', canal);
  client.say(canal, "alterando a flag como invisível");
  // na prática é difrente da RFC: https://tools.ietf.org/html/rfc2812#section-3.1.5
  // somente funciona se o argumento for o canal e o usuário for operador
  // a flag 'a' (away) não funciona, vide comando away
  client.send('mode', canal, '+i');

  //client.say(canal, "iniciei a listagem de canais");
  //client.list();
});

// lista todas mensagens recebidas (muitas)
// muito útil para debugar
client.addListener('raw', function(message) {
  console.log('mensagem recebida:'+JSON.stringify(message));
});

// disparado quando iniciar a listagem de canal
client.addListener('channellist_start', function() {
  console.log('iniciei a listagem de canal');
});

// disparado quando uma flag (mode) for atribuida
client.addListener('+mode', function(channel,by,mode,argument,message) {
  console.log('ocorreu alteração de mode:');
  console.log('canal:'+channel+' by:'+by+' mode:'
              +mode+' argument:'+argument+' message:'+message);
});


/*
// lista cada canal listado (podem ser muitos)
client.addListener('channellist_item', function(channel_info) {
  console.log('item da lista de canais: '+JSON.stringify(channel_info));
});
*/

// disparado quando finalizar a listagem de canal
client.addListener('names', function(channel, nicks) {
  var lista = channel+JSON.stringify(nicks);
  console.log('listagem de nicks do canal: '+lista);
  if (dentro_do_canal)
    client.say(canal, "lista de nicks do canal: "+lista);
});

// disparado quando finalizar a listagem de canal
client.addListener('channellist', function() {
  console.log('fim da listagem de canal');
  client.disconnect();
  console.log('testes terminados, desconectando...');
});

// disparado quando receber uma mensagem no canal
client.addListener('message'+canal, function (from, message) {
    console.log(from + ' => '+canal+': ' + message);
});

// disparado quando ocorrer um erro
client.addListener('error', function(message) {
    console.log('error: ', message);
});
