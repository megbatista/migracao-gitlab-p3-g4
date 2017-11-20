var express = require('express');            // módulo express
var app = express();	                       // objeto express
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


// Estabelece conexão com o servidor AMQP
amqp.connect('amqp://localhost', function(err, conn) {

  conn.createChannel(function(err, ch) {

    amqp_conn = conn;
    amqp_ch = ch;
  });
});


function enviarParaServidor (comando, msg) {

  msg = new Buffer(JSON.stringify(msg));

  amqp_ch.assertQueue(comando, {durable: false});
  amqp_ch.sendToQueue(comando, msg);
  console.log(" [app] Sent %s", msg);
}

function receberDoServidor (id, callback) {

  amqp_ch.assertQueue("user_"+id, {durable: false});

  console.log(" [app] Waiting messages for "+ id);
  
  amqp_ch.consume("user_"+id, function(msg) {

    console.log(" [app] Received %s", msg.content.toString());
    callback(JSON.parse(msg.content.toString()));

  }, {noAck: true});
}

// Realiza login gravando dados nos cookies
app.post('/login', function (req, res) { 

  res.cookie('nick', req.body.nome);
  res.cookie('canal', req.body.canal);
  res.cookie('servidor', req.body.servidor);
  res.redirect('/');
});

// Faz o registro de conexão com o servidor IRC
app.get('/', function (req, res) {

  if ( req.cookies.servidor && req.cookies.nick  && req.cookies.canal ) {

    id_gen++; // Cria um ID para o usuário
    id = id_gen;

    // Cria um cache de mensagens
    users[id] = {cache: [{
      "timestamp": Date.now(), 
      "nick": "IRC Server",
      "msg": "Bem vindo ao servidor IRC"}]}; 

    res.cookie('id', id); // Seta o ID nos cookies do cliente

    var target = 'registro_conexao';
    var msg = {
      id: id, 
      servidor: req.cookies.servidor,
      nick: req.cookies.nick, 
      canal: req.cookies.canal
    };

    users[id].id       = id;
    users[id].servidor = msg.servidor;
    users[id].nick     = msg.nick;
    users[id].canal    = msg.canal;

    // Envia registro de conexão para o servidor
    enviarParaServidor(target, msg);
    
    // Se inscreve para receber mensagens endereçadas a este usuário
    receberDoServidor(id, function (msg) {

      // Adiciona mensagem ao cache do usuário
      users[id].cache.push(msg);
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
  var response = users[id].cache;
  users.cache = [];

  res.append('Content-type', 'application/json');
  res.send(response);
});

// Envia uma mensagem para o servidor IRC
app.post('/gravar_mensagem', function (req, res) {

  // Adiciona mensagem enviada ao cache do usuário
  users[req.cookies.id].cache.push(req.body);
  
  enviarParaServidor("gravar_mensagem", {
    canal: users[req.cookies.id].canal, 
    msg: req.body.msg
  });
  
  res.end();
});

app.listen(3000, function () {

  console.log('Example app listening on port 3000!');	
});