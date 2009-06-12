
var GraphEntity = new Class({
	initialize: function(id, attr) {
		this.id = id;
		this.attr = attr;
	},
	
	rgbToHsl: function(r, g, b) {
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;

		if (max == min) {
			h = s = 0; // achromatic
		} else {
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
        	}
    	    h /= 6;
		}

		return [h, s, l];
	},
	
	parseColor: function(color) {
		var re = /^(\w{2})(\w{2})(\w{2})$/, bits = re.exec(color.substr(1, 6));
		return this.rgbToHsl(parseInt(bits[1], 16), parseInt(bits[2], 16), parseInt(bits[3], 16));
	},
	
	getColor: function(name, highlight) {
		var color = this.parseColor(this.attr[name]);
		return 'hsl('+color[0]*360+','+color[1]*100+'%,'+Math.min(color[2]*highlight, 100)+'%)';
	},
});

var GraphNode = new Class({
	Extends: GraphEntity,
	
	initialize: function(cv, id, attr) {
		this.parent(id, attr);
		
		this.edge = $H();
		$H(attr.edges).each(function(edge, id) {
			this.edge[id] = new GraphEdge(cv, id, edge);
		}, this);
		
		this.attr.width = cv.xform(this.attr.width * 72);
		this.attr.height = cv.xform(this.attr.height * 72);
		
		this.attr.pos[0] = cv.xform(this.attr.pos[0]);
		this.attr.pos[1] = cv.canvas.height - cv.xform(this.attr.pos[1]) - 16;
	},
	
	roundedRect: function(cx, x, y, w, h, r) {
		cx.moveTo(x, y + r);
		cx.lineTo(x, y + h - r);
		cx.quadraticCurveTo(x, y + h, x + r, y + h);
		cx.lineTo(x + w - r, y + h);
		cx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
		cx.lineTo(x + w, y + r);
		cx.quadraticCurveTo(x + w, y , x + w - r, y);
		cx.lineTo(x + r, y);
		cx.quadraticCurveTo(x, y, x, y + r);
	},

	draw: function(cv, cx) {
		cx.lineWidth = 3;

		var w = this.attr.width, h = this.attr.height;
		var x = this.attr.pos[0] + 8, y = this.attr.pos[1] - h / 2 + 8;
      
		cx.fillStyle = cx.strokeStyle = this.getColor('color', 100);
		cx.beginPath();
		this.roundedRect(cx, x - w / 2, y, w, h, 8);
		cx.fill();
      
		cx.fillStyle = cx.strokeStyle = this.getColor('color', 130);
		cx.beginPath();
		this.roundedRect(cx, x - w / 2, y, w, h, 8);
		cx.stroke();
      
		cx.fillStyle = cx.strokeStyle = this.attr.fontcolor;

		cx.save();
		cx.translate(x, y + 4);
      
		this.attr.label.split('\\n').forEach(function(text, i) {
			cx.drawTextCenter('sans', cv.options.fontSize, 0, (i + 1) * (cx.fontAscent('sans', cv.options.fontSize) + 4), text);
		}, this);
      
		cx.restore();
	},
	
	test: function(cv, cx, x, y) {
		for (var key in this.edge) {
			if (this.edge.hasOwnProperty(key)) {
					var ret = this.edge[key].test(cv, cx, x, y);
					if (ret !== false)
						return [ this, ret, key ];
			}
		}
		
		var w = this.attr.width, h = this.attr.height;
		if (x - 8 < this.attr.pos[0] - w / 2)
			return false;
		else if (x - 8 > this.attr.pos[0] + w / 2)
			return false;
		else if (y - 8 < this.attr.pos[1] - h / 2)
			return false;
		else if (y - 8 > this.attr.pos[1] + h / 2)
			return false;
                                          
		return [ this ];
	},
	
	drawEdge: function(cv, cx, id) {
		if (id) {
			this.edge[id].draw(cv, cx);
		} else {
			this.edge.each(function(edge, id) {
				edge.draw(cv, cx);	
			}, this);
		}
	},
});

var GraphEdge = new Class({
	Extends: GraphEntity,
	
	initialize: function(cv, id, attr) {
		this.parent(id, attr);
		
		this.attr.pos.each(function(pos) {
			pos[0] = cv.xform(pos[0]);
			pos[1] = cv.canvas.height - cv.xform(pos[1]) - 16;
		}, this);
		
		if (this.attr.lp) {
			this.attr.lp[0] = cv.xform(this.attr.lp[0]);
			this.attr.lp[1] = cv.canvas.height - cv.xform(this.attr.lp[1]) - 16;
		}
	},
	
	pathCommands: [
		function(x, y) { this.lineTo(x + 0.001, y); },
		function(x, y) { this.lineTo(x, y); },
		function(x1, y1, x2, y2) { this.quadraticCurveTo(x1, y1, x2, y2); },
		function(x1, y1, x2, y2, x3, y3) { this.bezierCurveTo(x1, y1, x2, y2, x3, y3); }
	],
	
	draw: function(cv, cx) {
		cx.lineWidth = Math.min(this.attr.penwidth * 10, 4);
		cx.strokeStyle = cx.fillStyle = this.attr.color;
         
		cx.beginPath();
      
		cx.moveTo(this.attr.pos[1][0] + 8, this.attr.pos[1][1] + 8);
		for (var i = 1; i < this.attr.pos.length - 1; ) {
			var order = Math.min(4, this.attr.pos.length - i), coords = [];
			for (var j = 1; j < order; ++j) {
				coords.push(this.attr.pos[i + j][0] + 8);
				coords.push(this.attr.pos[i + j][1] + 8);
			}
			
			this.pathCommands[order - 1].apply(cx, coords);
			i += order - 1;
		}
      
		cx.stroke();

		var length = this.attr.pos.length;		
		var x1 = this.attr.pos[0][0] + 8, y1 = this.attr.pos[0][1] + 8;
		var x2 = this.attr.pos[length - 1][0] + 8, y2 = this.attr.pos[length - 1][1] + 8;

		cx.beginPath();
		cx.moveTo(x1, y1);
		if (Math.floor(x1) == Math.floor(x2)) {
			cx.lineTo(x1 - Math.abs(y2 - y1) / 2, y2);
			cx.lineTo(x1 + Math.abs(y2 - y1) / 2, y2);
		} else {
			var m = -(x2 - x1) / (y2 - y1), d = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) / 2;
			var dx = Math.sqrt(Math.pow(d, 2) / (1 + Math.pow(m, 2)));
			cx.lineTo(x2 + dx, y2 + dx * m);
			cx.lineTo(x2 - dx, y2 - dx * m);
		}
		cx.fill();

		cx.strokeStyle = cx.fillStyle = this.attr.fontcolor;
		if (this.attr.lp) {
			var x = this.attr.lp[0] + 8 + 4, y = this.attr.lp[1] + 8;
			cx.drawTextCenter('sans', cv.options.fontSize, x, y, this.attr.label);
		}
	},
	
	test: function(cv, cx, x, y) {
		if (this.attr.lp) {
			var w = cx.measureText('sans', cv.options.fontSize, this.attr.label);
			var h = cx.fontAscent('sans', cv.options.fontSize);
                 
			if (x - 8 - 4 < this.attr.lp[0] - w / 2)
				return false;
			else if (x - 8 - 4 > this.attr.lp[0] + w / 2)
				return false;
			else if (y - 8 < this.attr.lp[1] - h / 2)
				return false;
			else if (y - 8 > this.attr.lp[1] + h / 2)
				return false;

			return this; 
		}
		
		return false;
	},
});

var GraphCanvas = new Class({
	options: {
		scale: 96,
		fontSize: 10,
		
		onEnter: $empty,
		onClick: $empty,
		onLeave: $empty,
		
		onContextMenu: $empty,
	},
   
	xform: function(val) {
		return Math.floor(val * this.options.scale / 72);
	},
	
	initialize: function(data, ct, options) {
		this.setOptions(options);

		this.data = $H(data);
		this.data.nodes = $H(data.nodes);
		     
		ct.empty();
		ct = $(ct);
      
		var canvas = new Element('canvas', {
			width:  this.xform(data.size[0]) + 16 + 'px',
			height: this.xform(data.size[1]) + 16 + 'px'
		});
		ct.adopt(canvas);
      
		if (typeof(G_vmlCanvasManager) != 'undefined') {
			canvas = $(G_vmlCanvasManager.initElement(canvas));
		}

		this.canvas = canvas;
		
		this.node = $H();
		$H(data.nodes).each(function(node, id) {
			this.node[id] = new GraphNode(this, id, node);
		}, this);

		this.cx = canvas.getContext('2d');
		var canvasPos = this.canvas.getCoordinates();
       
		CanvasTextFunctions.enable(this.cx);
            
		this.hoverCanvas = new Element('canvas', {
            'styles': {
				position: 'absolute',
				left: canvasPos.left + 'px',
				top: canvasPos.top + 'px',
				zIndex: 9
			},
            
			width: canvasPos.width + 'px',
			height: canvasPos.height + 'px'
         });
        
		this.hoverCanvas.injectAfter(this.canvas);

		window.addEvent('resize', function() {
			var canvasPos = this.canvas.getCoordinates();
            
			this.hoverCanvas.setStyles({left: canvasPos.left + 'px', top: canvasPos.top + 'px'});
			this.hoverCanvas.width = canvasPos.width;
			this.hoverCanvas.height = canvasPos.height;
		}.bind(this));
  
		if (typeof(G_vmlCanvasManager) != 'undefined') {
			this.hoverCanvas = $(G_vmlCanvasManager.initElement(this.hoverCanvas));
		}
         
		this.hoverCanvasCx = this.hoverCanvas.getContext('2d');
		CanvasTextFunctions.enable(this.hoverCanvasCx);
		 
		var nodes = [];
		this.node.each(function(node) {
			nodes.push(node);
		}, this);
			
		this.drawGraph(nodes);
			
		this.draw();
	},

   // draw the points onto the canvas
   drawNode: function(cx, id) {
      new GraphNode(this, this.data.nodes[id]).draw(this, cx);
   },
    
   // draw the connection lines for a particular item
   drawEdge: function(cx, edge) {
      new GraphEdge(this, edge).draw(this, cx);
   },
   
   drawGraph: function(nodes) {
      var node = nodes.splice(0,1)[0];
      node.edge.each(function(edge, id) {
         edge.draw(this, this.cx);
      }, this);
      
      node.draw(this, this.cx);
      
      if (nodes.length > 0) {
         var self = this;
         setTimeout(function() { self.drawGraph(nodes); }, 25);
      }
   },
   
	drawParent: function(cx, node) {
		this.node.each(function(parent, pid) {
			parent.edge.each(function(edge, eid) {
				if (eid == node.id) {
					edge.draw(this, cx);
					parent.draw(this, cx);
         
					var self = this;
					if (pid != node.id)
						setTimeout(function() { self.drawParent(cx, parent); }, 25);
				}
			}, this);
		}, this);
	},
   
	drawChildren: function(cx, node) {
		node.edge.each(function(edge, id) {
			edge.draw(this, cx);
         
			var self = this, child = this.node[id];
			if (node.id != id)
				setTimeout(function() { self.drawChildren(cx, child); }, 25);
		}, this);
      
		node.draw(this, cx);
	},
	
	highlight: function(entity) {
		this.canvas.setStyle('opacity', '0.2');
		entity.draw(this, this.hoverCanvasCx);
	},
	
	restore: function() {
		this.hoverCanvasCx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.hoverCanvasCx.save();
		
		this.canvas.setStyle('opacity', '1.0');
	},
   
	draw: function() {
		$(this.hoverCanvas).addEvent('mousemove', function(e) {
			e = new Event(e);
            
			var pos = $(this.hoverCanvas).getCoordinates();
			var mpos = { x: e.page.x - pos.left, y: e.page.y - pos.top };

			var test = function(point) {
				for (var key in this.node) {
					if (this.node.hasOwnProperty(key)) {
						var ret = this.node[key].test(this, this.cx, point.x, point.y);
						if (ret !== false)
							return ret
					}
				}

				return false;
			}.bind(this);
            
			var node = test(mpos);
			if (node !== false) {
				if (this.lastMouseOver && this.lastMouseOver[0] == node[0])
					return;
				
				node[2] = this.node[node[2]];
				this.lastMouseOver = node;

				this.options.onEnter(this, this.lastMouseOver, e); 
			} else if ($defined(this.lastMouseOver)) {  
				this.options.onLeave(this, this.lastMouseOver, e); 
				delete this.lastMouseOver;
			}
		}.bind(this));
		
		$(this.hoverCanvas).addEvent('click', function(e) {         	
			if (!this.lastMouseOver)
				return false;

			this.options.onClick(this, this.lastMouseOver, e);
		}.bind(this));
         
		$(this.hoverCanvas).addEvent('contextmenu', function(e) {
			this.options.onContextMenu(this, this.lastMouseOver, e);
		}.bind(this));
	},
});
GraphCanvas.implement(new Options);

// helper class for AJAX/JSON-based graph retrieval
GraphCanvas.Remote = new Class({
    
    Extends: GraphCanvas,

    initialize: function(data, ct, options) {
        var preloadImages = function(wheelData) {
            var imageUrls = [], map = {};

            for (var i = 0, l = wheelData.length; i < l; i++) {
                if (wheelData[i]['imageUrl']) {
                    imageUrls.push(wheelData[i]['imageUrl']);
                    map[i] = imageUrls.length - 1;
                }
            }

            if (imageUrls.length == 0)
                return false;

            var images = new Asset.images(imageUrls, {
                onComplete: function() {
                    for (var j in map) {
                        wheelData[j]['image'] = images[map[j]];
                    }

                    // hack to make this.parent work within callback
                    arguments.callee._parent_ = this.initialize._parent_;
                    
                    this.parent(wheelData, ct, options);
                }.bind(this)
            });

            return true;
        }.bind(this);

        if (options && options.url) {
            new Request.JSON({
              url: options.url,
              onComplete: function(wheelData) {
                  data = wheelData;

                  // hack to make this.parent work within callback
                  arguments.callee._parent_ = this.initialize._parent_;

                  if (!preloadImages(data, ct, options))
                      this.parent(data, ct, options);
              
              }.bind(this)
            }).send();
        } else if (!preloadImages(data, ct, options)) {
          this.parent(data, ct, options);
        }
    }
});