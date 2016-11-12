/*
  Adiciona <mensagem> no <elemento_id>. 
*/
function adiciona_mensagem(mensagem,elemento_id,timestamp) {
	var novo_elemento = document.createElement('div');
	novo_elemento.id = "mensagem"+timestamp;
	document.getElementById(elemento_id).appendChild(novo_elemento);
	document.getElementById('mensagem'+timestamp).innerHTML=mensagem;
}

/*
  Transforma timestamp em formato HH:MM:SS
*/
function timestamp_to_date( timestamp ) {
	var date = new Date( timestamp );
	var hours = date.getHours();
	var s_hours = hours < 10 ? "0"+hours : ""+hours;
	var minutes = date.getMinutes();
	var s_minutes = minutes < 10 ? "0"+minutes : ""+minutes;
	var seconds = date.getSeconds();
	var s_seconds = seconds < 10 ? "0"+seconds : ""+seconds;
	return s_hours + ":" + s_minutes + ":" + s_seconds;
}

function iniciar(elemento_id) {
	$("#status").text("Conectado - irc://"+
			Cookies.get("nick")+"@"+
			Cookies.get("servidor")+"/"+
			Cookies.get("canal"));
	carrega_mensagens(elemento_id,0);
}

/*
  Carrega as mensagens ocorridas após o <timestamp>,
  acrescentando-as no <elemento_id>
*/
var novo_timestamp="0";
function carrega_mensagens(elemento_id, timestamp) {
	var mensagem = "";
	var horario = "";
	$.get("obter_mensagem/"+timestamp, function(data,status) {
		if ( status == "success" ) {
		    var linhas = data;
		    for ( var i = linhas.length-1; i >= 0; i-- ) {
		    	horario = timestamp_to_date(linhas[i].timestamp);
			mensagem = 
				"["+horario+" - "+
				linhas[i].nick+"]: "+
		                linhas[i].msg;
			novo_timestamp = linhas[i].timestamp;
		    	adiciona_mensagem(mensagem,elemento_id,novo_timestamp);
			}
		}
		else {
		    alert("erro: "+status);
		}
		}
	);
	t = setTimeout( 
		function() { 
			carrega_mensagens(elemento_id,novo_timestamp) 
		}, 
		1000);		
}

/*
   Submete a mensagem dos valores contidos s elementos identificados 
   como <elem_id_nome> e <elem_id_mensagem>
*/
function submete_mensagem(elem_id_mensagem) {
	var mensagem= document.getElementById(elem_id_mensagem).value;
	var msg = '{"timestamp":'+Date.now()+','+
		  '"nick":"'+Cookies.get("nick")+'",'+
                  '"msg":"'+mensagem+'"}';
	$.ajax({
		type: "post",
		url: "/gravar_mensagem",
		data: msg,
		success: 
		function(data,status) {
			if (status == "success") {
			    // nada por enquanto
			}
			else {
				alert("erro:"+status);
			}
		},
		contentType: "application/json",
		dataType: "json"
		});
}

function trocarMode(elemento){

	var usuario = Cookies.get("nick");
	var args = $("#"+elemento).val();
	var comando = "mode/"+usuario+"/"+args;
$.get(comando, function(data,status) {
		if ( status == "success" ) {
		    
		alert(comando);
}
		});
}
