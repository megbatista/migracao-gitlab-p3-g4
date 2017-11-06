function PrivmsgChannel(msg, cl, clients, canais)
{
    cl.broadcast.to(cl.canal).emit('message', cl.nick+': ' + msg);
}
module.exports = PrivmsgChannel;