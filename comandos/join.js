function Join(client, channel, canais)
{
    if(channel[0]!='#') channel = '#'+channel;
    if(client.canal) client.leave(client.canal);
    client.join(channel);
    id = canais.indexOf(client.canal);
    client.canal = channel;
    canais[id] = channel;
    
    client.irc_client.join(client.canal);
    client.broadcast.to(client.canal).emit('join-channel', client.nick);

}

module.exports = Join;
