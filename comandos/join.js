function Join(client, channel)
{
    if(channel[0]!='#') return;
    if(client.channel) client.leave(client.channel);
    client.join(channel);
    client.channel = channel;
    
    client.irc_client.emit('join', client.channel);
    client.broadcast.to(client.channel).emit('join-channel', client.nick);

}

module.exports = Join;