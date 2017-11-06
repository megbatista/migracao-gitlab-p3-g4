function Privmsg(param, cl, clients, canais)
{
    //param[1] é o nick para o qual a mensagem será enviada
    if(param[1])
    {  

        var msg = "";

        for(var i = 2; i < param.length ; i++)
        {
            msg += param[i] + " ";
        }

        // nick não pode começar com #.
        // filtra no array que armazena os clientes conectados o param[1] e verifica se há correspondências
        if(param[1][0] != '#' && clients.filter(client => client.nick === param[1]).length)
        {      
          
            //executa essa função para cada cliente, e verifica se cada um tem o nick igual ao informado
            clients.forEach(function(client)
            {
                if(client.nick === param[1])
                {
                    //cl é o cliente que realizou o comando privmsg e está enviado a mensagem.
                    //esse evento é emitido para o listener da app.js, e de lá o socket.emit emitirá o evento privmsg para o index.html
                    //o evento privmsg no index.html é o feedback para o cliente que realizou o comando privmsg saber que o comando foi executado com sucesso.
                    cl.irc_client.emit('privmsg',client.nick);

                    //agora emite o evento para o cliente que possui o nick igual ao param[1].
                    //o evento envio-privmsg é captado pelo index.html, de forma que quem recebeu a mensagem saiba que ela foi enviada no privado
                    client.emit('envio-privmsg',cl.nick+': ' + msg);
                    
                }
                else
                {
                    cl.irc_client.emit('error', 'O nick '+param[1]+' não foi encontrado.');
                }
            });
        }

        //TENTEATIVA DE TORNAR A PRIVMSG MAIS BONITA
        
        // var recipient = clients.filter(function(client)
        // {
        //     return client.nick === param[1];
        // });

        // if(recipient)
        // {
        //     recipient.emit('envio-privmsg', cl.nick+': ' + msg);
        //     cl.irc_client.emit('privmsg', param[1], msg);
        // }
        // else
        // {
        //     cl.irc_client.emit('error', 'O nick '+param[1]+' não foi encontrado.');
        // }


    } 

}

module.exports = Privmsg;
