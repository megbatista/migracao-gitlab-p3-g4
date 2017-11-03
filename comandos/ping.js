function Ping(client)
{
    //tive que mudar o nome do evento de 'ping pra 'pingpong' em todo lugar pq tava acontecendo uma coisa estranha,
    //a mensagem Pong: undefined tava aparecendo mais ou menos de 10 em 10 segundos no chat, não sei pq
    client.irc_client.emit('pingpong', client.servidor);
}

module.exports = Ping;