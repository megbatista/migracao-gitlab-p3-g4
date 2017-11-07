function PrivmsgChannel(msg, cl)
{
    cl.broadcast.to(cl.canal).emit('message', cl.nick+': ' + msg);
    cl.irc_client.say(cl.canal, msg);
}
module.exports = PrivmsgChannel;
