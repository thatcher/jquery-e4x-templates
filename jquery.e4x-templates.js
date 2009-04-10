/*
 A Django Style Templating language leveraging the power of e4x and jQuery
*/
(function($, $$){
 
    var cache = {};
	blockMapCache = {};
	var log;
	
    $.e4x = function(url, model){
    	log = log||$.logger("E4X");
        var e4x;
        log.debug("loading e4x : "+ url);
		if(!cache[url]){
	        $.ajax({
	            url: "app/views/templates/"+url,
	            type: "GET",
	            dataType:"text",
	            async:false,
	            success: function(text){
	                var base, block, blockMap = {};
	                log.debug("got e4x template \n"+ text);
	                cache[url] = e4x_eval(text, blockMap, model, true).toXMLString();     
					blockMapCache[url] = blockMap;
					log.info("template %s : first pass complete", url).
						debug("\n\n result of first pass : \n\n%s", cache[url]); 
					
					//causes template to be added to file monitor
					try{load("app/views/templates/"+url)}catch(e){};           
	            }, 
				error:function(xhr, status, e){
					log.error("Error Loading E4X Template : %s", status).
						exception(e);
				}
	        });  
		}
		log.info("template %s :  rendering cached template", url);     
		return e4x_eval(cache[url], blockMapCache[url], model, false);
    };
    
    var e4x_eval = function(text, blockMap, model, deep){
		var xml_settings = XML.settings();
        //XML.ignoreWhitespace = false;
		
		var extend = $.e4x;
		
		// the underscore is the key to our template language
		var _ = function(fn){
			return '{' + fn + '}';
		};
		
		for(var prop in model||{}){
			_[prop]  = model[prop];
		}
		
        var evaluated;
		if(text.match(/^\s*<>/)){
			evaluated = eval("(function(){"+
	            "return new XMLList("+text+");"+
	        "})();");	
		}else{
			evaluated = eval("(function(){"+
	            "return new XMLList(<e4x>"+text+"</e4x>);"+
	        "})();").*[0];	
		}
					
		var blocks = evaluated..block,
			compiled,
			rendered,
			parent,
			block, id; 
			
		if(deep){
			//first loop through and make sure we know
			//which blocks are part of the final cascade
			for each(block in blocks){
				if(!block.@id){
					//if it doesn't have an id it's not
					//a valid block and we throw it out
					//with the bath water
					delete block;
				}else{
					id = block.@id.toString();
					if(!blockMap[id]){
						log.debug("found block %s", id);
						blockMap[id] = block.*.copy();
						delete block.*;
					}else{
						log.debug("found override block %s", id);
						blockMap[id] = block.*.copy();
						delete block.*;
						delete block;
					}
				}
			}
			//now loop through the final remaining blocks
			log.debug("cascaded with blocks \n\n %s", evaluated.toXMLString());
			compiled = evaluated.copy();
			log.debug("compiled \n\n %s", compiled.toXMLString());
			blocks = compiled..block;
			delete evaluated;
			for each(block in blocks){
				id = block.@id.toString();
				log.debug("\n\n\n\n REPLACING BLOCK %s \n\n\n\n WITH %s", id, blockMap[id]);
				if(!blockMap[id]){
					delete block;
				}
				compiled..block.(@id == id)[0] = blockMap[id]||'';
				log.debug("after replacement \n\n %s", compiled.toXMLString());
				/*if (parent) {
					parent = block.parent();
					delete parent.block;
					parent.appendChild(blockMap[id]);
				}*/
			}
			rendered = compiled.copy();
			delete compiled;
		}
		rendered = rendered||evaluated;
		log.debug("\n\n\n FINAL :\n\n\n", rendered);
		XML.setSettings(xml_settings);
		return rendered;
		
    };

})(jQuery, Claypool);