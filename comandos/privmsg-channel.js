function PrivmsgChannel(msg, cl, clients, canais)
{
    cl.broadcast.to(cl.canal).emit('message', cl.nick+': ' + msg);
    cl.irc_client.ctcp(cl.canal, "PRIVMSG", msg);
}
module.exports = PrivmsgChannel;
