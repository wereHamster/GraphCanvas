/*
	Class:    	ContextMenu
	Author:   	David Walsh
	Website:    http://davidwalsh.name
	Version:  	1.0
	Date:     	1/20/2009
	
	SAMPLE USAGE AT BOTTOM OF THIS FILE
	
*/


var ContextMenu = new Class({

	//implements
	Implements: [Options,Events],

	//options
	options: {
		actions: {},
		menu: 'contextmenu',
		offsets: { x:0, y:0 },
		onShow: $empty,
		onHide: $empty,
		onClick: $empty,
		fadeSpeed: 100
	},
	
	//initialization
	initialize: function(options) {
		//set options
		this.setOptions(options)
		
		//option diffs menu
		this.menu = $(this.options.menu);
				
		//fx
		this.fx = new Fx.Tween(this.menu, { property: 'opacity', duration:this.options.fadeSpeed });
		
		//hide and begin the listener
		this.hide();
		
		/* menu items */
		this.menu.getElements('a').each(function(item) {
			item.addEvent('click',function(e) {
				if(!item.hasClass('disabled')) {
					this.execute(item.get('href').split('#')[1]);
					this.fireEvent('click',[item,e]);
				}
			}.bind(this));
		},this);
		
		$(document.body).addEvent('click', function() {
			this.hide();
		}.bind(this));
		
		//hide the menu
		this.menu.setStyles({ 'position':'absolute','top':'-900000px', 'display':'block' });
	},
	
	//show menu
	show: function(x, y) {
		if(this.options.disabled)
			return this;
			
		this.menu.setStyles({
			top: (y + this.options.offsets.y),
			left: (x + this.options.offsets.x),
			position: 'absolute',
			'z-index': '2000'
		});
		
		this.fx.start(1);
		this.fireEvent('show');
		this.shown = true;
		
		return this;
	},
	
	//hide the menu
	hide: function() {
		if(this.shown)
		{
			this.fx.start(0);
			this.fireEvent('hide');
			this.shown = false;
		}
		return this;
	},
	
	//disable an item
	disableItem: function(item) {
		this.menu.getElements('a[href$=' + item + ']').addClass('disabled');
		return this;
	},
	
	//enable an item
	enableItem: function(item) {
		this.menu.getElements('a[href$=' + item + ']').removeClass('disabled');
		return this;
	},
	
	//diable the entire menu
	disable: function() {
		this.options.disabled = true;
		return this;
	},
	
	//enable the entire menu
	enable: function() {
		this.options.disabled = false;
		return this;
	},
	
	//execute an action
	execute: function(action) {
		if(this.options.actions[action]) {
			this.options.actions[action](this);
		}
		return this;
	}
	
});

/* usage 
//once the DOM is ready
window.addEvent('domready', function() {
	var context = new ContextMenu({
		targets: 'a',
		menu: 'contextmenu',
		actions: {
			copy: function(element,ref) {
				element.setStyle('color','#090');
				alert('You selected the element that says: "' + element.get('text') + '."  I just changed the color green.');
				alert('Disabling the menu to show each individual action can control the menu instance.');
				ref.disable();
			}
		}
	});
	
	$('enable').addEvent('click',function(e) { e.stop(); context.enable(); alert('Menu Enabled.'); });
	$('disable').addEvent('click',function(e) { e.stop(); context.disable(); alert('Menu Disabled.'); });
	
	$('enable-copy').addEvent('click',function(e) { e.stop(); context.enableItem('copy'); alert('Copy Item Enabled.'); });
	$('disable-copy').addEvent('click',function(e) { e.stop(); context.disableItem('copy'); alert('Copy Item Disabled.'); });
	
});
*/