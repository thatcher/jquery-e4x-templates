/*
 A Django Style Templating language leveraging the power of e4x and jQuery
*/
(function($, _){
 
    var cache = {},
		stateMapCache = {},
		blockMapCache = {},
		log;
	
    _.x = function(o){
        return new XMLList(_.js2xml(o));
    };
    
    _.fn.x = function(){
        return new XMLList(_.js2xml(this));
    };
    
    $.e4x = function(url, model, is_root){
    	//log = log||$.logger("E4X");
        var e4x;
        url = (  $.env ? $.env('templates') : '' ) + url;
        //log.debug("loading e4x : %s", url);
		if(!cache[url]){
	        $.ajax({
	            url: url,
	            type: "GET",
	            dataType:"text",
	            async:false,
	            success: function(text){
					//log.debug('Loaded E4X \n\n%s\n\n', text);
	                var base, block, blockMap = {};
					if(is_root){
						//we need to render out the block hierarchy
						//and cache the result so we don't waste time on each 
						//actual render with static block logic
						cache[url] = e4x_eval(text, blockMap, model, true).toString();
					}else{
						cache[url] =  e4x_eval(text, blockMap, model, false).toString();
					} 
					blockMapCache[url] = blockMap;
					//log.info("template %s : first pass complete", url);
					
					//causes template to be added to file monitor
					try{load(url)}catch(e){};           
	            }, 
				error:function(xhr, status, e){
					//log.error("Error Loading E4X Template : %s", url).exception(e);
	                cache[url] = e4x_eval("\n<e4x><h3>Error Loading: "+url+'\n\n'+e.toString()+"</h3></e4x>", null, model, true).toXMLString();  
				}
	        });  
		}
		//log.info("template %s :  rendering cached template", url);     
		return e4x_eval(cache[url], blockMapCache[url], model, false);
    };
    
    var e4x_eval = function(text, blockMap, model, deep){
		var xml_settings = XML.settings();
		
    	var extend = function(url){
    		return $.e4x(url, model, false);
    	}
        var _$ = model;
        
        var evaluated;
		evaluated = eval("(function(){"+
            "return new XMLList("+text+");"+
        "})();"); 
					
		//all blocks are treated in document order
		var blocks = evaluated..block,
			compiled,
			rendered,
			parent,
			block, id; 
			
		if(deep){
			//first loop through and make sure we know
			//which blocks are part of the final cascade
			for each(block in blocks){
				if( !block.@id ){
					//if it doesn't have an id it's not
					//a valid block and we throw it out
					//with the bath water
					delete block;
				}else{
					id = block.@id .toString();
					if(!blockMap[id]){
						//store the default block
						//log.debug("step 1: found block %s", id);
						blockMap[id] = block.*.copy();
						delete block.*;
					}else{
						//replace the default block
						//log.debug("step 1: found override block %s", id);
						blockMap[id] = block.*.copy();
						delete block.*;
						delete block;
					}
				}
			}
			//now loop through the final remaining blocks
			//log.debug("cascaded with blocks \n\n %s", evaluated.toXMLString());
			if(evaluated.elements().length() > 0){
				compiled = evaluated.*[0].copy();
				//log.debug("step 2 (should have no reference to e4x elements): \n\n %s", compiled.toXMLString());
				blocks = compiled..block;
				delete evaluated;
				for each(block in blocks){
					id = block.@id. toString();
					//log.debug('step 2: check block '+id);
					if(!blockMap[id]){
						//log.debug('step 2: deleting block '+id);
						delete block;
					}
					//log.debug('step 2: replacing block '+id + ' (length :'+blockMap[id].length()+')');
					compiled..block.(@id == id)[0] = blockMap[id]||'';
				}
				
				//finally replace each <e4x> element with it's children
				for each(var e4x in compiled..e4x){
					//log.debug('replacing <e4x>');
					e4x = e4x.children();
				}
				
				rendered = compiled.copy();
				delete compiled;
			}
			
		}
		rendered = rendered||evaluated;
		XML.setSettings(xml_settings);
		return rendered;
		
    };

})(jQuery, jsPath);