function executarComandoNick(param, client)
{
	if(param)
	{
		var oldnick = client.nick;
		client.nick = param;
		client.irc_client.emit('nick', oldnick, client.nick, client.canal);
		client.broadcast.emit('mudanca-de-nick', oldnick+' mudou seu nick para '+client.nick)
	}
}

module.exports = executarComandoNick;