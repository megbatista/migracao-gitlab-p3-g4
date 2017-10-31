function executarComandoList(client, canais)
{
    client.irc_client.emit('list', canais.toString());
}

module.exports = executarComandoList;