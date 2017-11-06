function Join(client, channel, canais, proxy_id)
{
    if(channel[0]!='#') channel = '#'+channel;
    if(client.canal) client.leave(client.canal);
    client.join(channel);
    client.canal = channel;
    canais[proxy_id] = channel;
    
    client.irc_client.emit('join', client.canal);
    client.broadcast.to(client.canal).emit('join-channel', client.nick);

}

module.exports = Join;