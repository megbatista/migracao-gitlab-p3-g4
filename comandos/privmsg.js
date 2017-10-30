function executarComandoPrivmsg(param, cl, clients, canais)
{

    if(param[1])
    {
        
        var msg = [];
        for(var i = 2; i < param.length ; i++)
        {
            msg[i-2] = param[i];
        }

        if(param[1][0] != '#' && clients.filter(client => client.nick === param[1]).length)
        {

            clients.forEach(function(client)
            {

                if(client.nick === param[1])
                {
                    cl.irc_client.emit('privmsg',client.nick.toString(), msg.toString());
                    client.emit('envio-privmsg',cl.nick+': ' + msg.toString());
                }
            });
        }
    }   
}

module.exports = executarComandoPrivmsg;