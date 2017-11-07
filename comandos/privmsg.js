function Privmsg(param, cl)
{
    //param[1] é o nick para o qual a mensagem será enviada
    if(param[1])
    { 

        var msg = "";

        for(var i = 2; i < param.length ; i++)
        {
            msg += param[i] + " ";
        }

        cl.irc_client.say(param[1], msg);

        cl.emit('envio-privmsg',cl.nick+': ' + msg);
                    
        
    } 

}

module.exports = Privmsg;
