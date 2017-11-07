function Join(client, channel, canais)
{
    if(channel && channel[0]!='#') channel = '#'+channel;
    if(client.canal) client.leave(client.canal);
    client.join(channel);
    client.irc_client.join(client.canal);

    id = canais.indexOf(client.canal);
    client.canal = channel;
    canais[id] = channel;    
    
    client.irc_client.emit('join', client.canal);
    client.broadcast.to(client.canal).emit('join-channel', client.nick);
}

module.exports = Join;