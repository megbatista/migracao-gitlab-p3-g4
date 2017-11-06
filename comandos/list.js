function List(client, canais)
{
    function onlyUnique(value, index, self) 
    { 
        return self.indexOf(value) === index;
    }
    
    var unique = canais.filter( onlyUnique );

    client.irc_client.emit('list', unique.toString());
}

module.exports = List;