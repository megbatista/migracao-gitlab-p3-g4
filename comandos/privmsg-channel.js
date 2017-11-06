function PrivmsgChannel(msg, cl, clients, canais)
{
    // if(canais.filter(canal => canal === cl.canal).length)
    // {
    //     clients.forEach(function(client)
    //     {
    //         if(client.canal === cl.canal && client.nick != cl.nick)
    //         {
    //             client.emit('message',cl.nick+': ' + msg);
    //         }
    //     });
    // }

    cl.broadcast.to(cl.canal).emit('message', cl.nick+': ' + msg);
}
module.exports = PrivmsgChannel;