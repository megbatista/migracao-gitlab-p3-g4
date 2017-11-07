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
}

var novo_timestamp="0";

function trocarMode(elemento)
{

	var usuario = Cookies.get("nick");
	var args = $("#"+elemento).val();
	var comando = "mode/"+usuario+"/"+args;
	$.get(comando, function(data,status) 
	{
		if ( status == "success" ) {		    
			alert(comando);
		}
	});

}

