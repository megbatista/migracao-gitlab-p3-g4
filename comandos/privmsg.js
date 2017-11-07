function Privmsg(param, cl)
{
    //param[1] é o nick para o qual a mensagem será enviada
    if(param[1])
    {
        var msg = "";

        if(param[2])
        {    
            for(var i = 2; i < param.length ; i++)
            {
                 msg += param[i] + " ";
            }
        } 

        //só funciona se estiver registrado no irc

        cl.irc_client.say(param[1],'(Privado) '+cl.nick+': '+ msg);

        cl.emit('selfMessage',param[1], msg);     
    } 

}

module.exports = Privmsg;
