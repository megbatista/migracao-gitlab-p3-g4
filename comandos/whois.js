function executarComandoWhois(param, client){
    
    if(param){

		client.irc_client.whois(param);
	}
}

module.exports = executarComandoWhois;