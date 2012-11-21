// Usage: call .paletteList() on every jQuery object next to which you'd like
//   a color picker. .paletteList() can take an options hash.
//
//
// Options hash:
//   colors [array]: list of colors.
//   hover [boolean - false]: value specifying whether to trigger off of hover
//          events.
//
//
// API:
//   The instance API is bound to the original target element and can be
//   returned by calling paletteList on it with a string argument of "api".
//
//   E.g., if you initialized with:
//     $( "#test" ).paletteList();
//   You can then get the API object with:
//     $( "#test" ).paletteList( "api" );
//
//   The API object has the following values:
//     options [hash]: the options passed in on init (plus defaults)
//     colors [array]: the array of colors
//     index [int]: the selected color's index in the array
//     visible [boolean]: whether or not the palette list is visible
//     lineHeight [px]: the calculated height and width of the swatches
//     id [int]: the instance id
//     elements [hash]: references to all the generated markup
//
//   The API object has the following methods:
//     toggleColors( boolean? ): toggle/set visibilty of colors palette
//                               optional boolean sets true = visible
//     nextColor(): Moves to the next color in the array
//     previousColor(): Moves to the previous color in the array
//     setColor( int ): Moves to a color in the array based on int as index
//     findColor( string ): returns index of color in array. Not found is -1
//     getColor(): Returns the string value of the currently selected color
//     addColor( string ): Adds the color based on string value to the end of
//                         the color array
//                         Returns the index of the newly added color (if the
//                         color already exists in the array, it returns that
//                         index)
//
//
// Events:
//   When a color is selected, an event of "setcolor.palettelist" is fired on
//   the current color swatch. That event emits two arguments, the event
//   object and the instance api.
//   An example usage is the following:
//
//   $( document ).bind( "setcolor.palettelist", function( e, api ) {
//     alert( api.getColor() ); // Alerts the value of the selected color
//   } );
//
//
// Global Defaults:
//   You can override the default options globally by setting them in
//   $.paletteList.options
//   Note, this will not affect already initialized instances of paletteList.

(function( $, window, undefined ) {
  var _id = 0,
      PaletteList,
      elements,
      prefix = "pl-";

  elements = {
    placeholder: $( "<div></div>", { "class": prefix + "placeholder" } ),
    container: $( "<div></div>", { "class": prefix + "container" } ),
    current: $( "<div></div>", { "class": prefix + "current" } ),
    viewport: $( "<div></div>", { "class": prefix + "viewport" } ),
    list: $( "<ul></ul>", { "class": prefix + "list" } ),
    color: $( "<li></li>", { "class": prefix + "color" } ),
    link: $( "<a></a>", { "class": prefix + "link", href: "#" } )
  };

  PaletteList = function( element, id, options ) {
    var self = this,
        opts = $.extend( {}, $.paletteList.options, options );

    self.options = opts;
    self.colors = [];
    self.index = null;
    self.visible = false;
    self.lineHeight = null;
    self.id = id;
    self.documentKeyHandler = null;
    self.documentClickHandler = null;
    self.elements = {
      target: $( element ),
      colors: []
    };

    self.build();
    self.attach();

    return self;
  };

  $.extend( PaletteList.prototype, {

    attach: function() {
      if ( this.options.targetIsTrigger ) return;
      this.elements.target.after( this.elements.placeholder );
    },

    build: function() {
      var e = this.elements;

      e.placeholder = elements.placeholder.clone();
      e.container = elements.container.clone().appendTo( e.placeholder );
      e.current = elements.current.clone().appendTo( e.container );
      e.currentLink = elements.link.clone().appendTo( e.current );
      e.viewport = elements.viewport.clone().appendTo( document.body );
      e.list = elements.list.clone().appendTo( e.viewport );

      this.initDimensions();
      this.buildColors();
      this.bindEvents();
      this.setDocumentHandlers();
      this.setColor( 0 );
    },

    bindEvents: function() {
      var self = this,
          triggerElem;

      if ( this.options.hover ) {
        this.elements.container.on({
          "mouseenter": function( e ) {
            self.toggleColors( true );
          },
          "mouseleave": function( e ) {
            self.toggleColors( false );
          }
        });
        this.elements.list.on( {
          "mouseenter": function( e ) {
            self.setColor( +$( this ).attr( "data-index" ) );
            return false;
          }
        }, "." + prefix + "link" );
      }

      triggerElem = this.elements[ self.options.targetIsTrigger ? "target" : "currentLink" ];

      triggerElem.on( "click", function( e ) {
        if ( ! self.options.hover ) {
          self.toggleColors();
        }
        return false;
      } );

      this.elements.list.on( "click", "." + prefix + "link", function( e ) {
        var index = +$( this ).attr( "data-index" );
        if ( ! e.shiftKey ) {
          self.setColor( index );
          self.toggleColors( false );
        } else {
          self.removeColor( index );
        }
      } );

      this.elements.list.on( "click", function( e ) {
        return false;
      } );
    },

    initDimensions: function() {
      var e = this.elements,
          lineHeight = this.lineHeight = window.getComputedStyle( e.target[0] ).lineHeight,
          width = { width: lineHeight },
          height = { height: lineHeight },
          left = { left: lineHeight };

      e.placeholder.css( $.extend({}, width, height) );
      e.currentLink.css( $.extend({}, width, height) );

    },

    buildColors: function() {
      var self = this;
      $.each( self.options.colors, function() {
        self.addColor( this );
      } );
    },

    setDocumentHandlers: function() {
      var self = this;
      self.documentKeyHandler = function( e ) {
        if ( e.keyCode === 37 || e.keyCode === 38 ) {
          self.previousColor();
          return false;
        } else if ( e.keyCode === 39 || e.keyCode === 40 ) {
          self.nextColor();
          return false;
        } else if ( e.keyCode === 27 || e.keyCode === 13 || e.keyCode === 32 ) {
          if ( ! e.shiftKey ) {
            self.toggleColors( false );
          } else {
            // No shiftkey support yet
            self.toggleColors( false );
          }
          return false;
        } else if ( e.keyCode >= 49 && e.keyCode <= 57 ) {
          self.setColor( e.keyCode - 49 );
          if ( self.index === e.keyCode - 49 ) {
            self.toggleColors( false );
          }
          return false;
        }
      };
      self.documentClickHandler = function( e ) {
        self.toggleColors( false );
        return false;
      };
    },

    bindDocument: function() {
      var self = this;
      $( document ).on( "keydown", this.documentKeyHandler );
      $( document ).on( "click", this.documentClickHandler );
    },

    unbindDocument: function() {
      var self = this;
      $( document ).off( "keydown", this.documentKeyHandler );
      $( document ).off( "click", this.documentClickHandler );
    },

    setPaletteWidth: function() {
      var width = ( parseInt(this.lineHeight, 10) + 5 ) * this.colors.length;
      this.elements.list.width( width );
    },

    toggleColors: function( visible ) {
      if ( visible == undefined ) {
        visible = !this.visible;
      }
      if ( visible ) {

        var target = this.elements[ this.options.targetIsTrigger ? "target" : "placeholder" ],
            offset = target.offset(),
            coords;
        var moved = ( target.outerHeight() - parseInt( this.lineHeight, 10 ) - 10 ) / 2;
        coords = {
          top: offset.top + moved +  "px",
          left: offset.left + target.outerWidth() + 5 + "px"
        };
        this.elements.viewport.css( coords );
        this.elements.viewport.show();
        this.visible = true;
        this.bindDocument();
      } else {
        this.unbindDocument();
        this.visible = false;
        this.elements.viewport.hide();
      }
    },

    nextColor: function() {
      this.setColor( this.index + 1 );
    },

    previousColor: function() {
      this.setColor( this.index - 1 );
    },

    setColor: function( index ) {
      if ( index >= 0 && index <= this.colors.length - 1 ) {
        var color = this.colors[ index ];
        this.index = index;
        this.elements.currentLink.css( "background-color", color );
        this.elements.current.attr( "data-color", color );
        this.elements.current.trigger( "setcolor.palettelist", this );
      }
    },

    removeColor: function( index ) {
      if ( index >= 0 && index <= this.colors.length - 1 && this.index !== index ) {
        this.elements.colors.splice( index, 1 )[0].remove();
        this.colors.splice( index, 1 );
        this.setPaletteWidth();
        this.cleanupColors();
        if ( this.index > index ) {
          this.index--;
        }
      }
    },

    cleanupColors: function() {
      $.each( this.elements.colors, function( index, element ) {
        var $link = $( "." + prefix + "link", element );
        $link.attr( "data-index", index );
      } );
    },

    findColor: function( hex ) {
      return $.inArray( hex, this.colors );
    },

    getColor: function() {
      return this.colors[ this.index ];
    },

    addColor: function( hex ) {
      var colors = this.colors,
          elements = this.elements,
          findIndex = this.findColor( hex );

      if ( findIndex !== -1 ) {
        return findIndex;
      }
      elements.colors.push( this._newColor( hex, colors.length ).appendTo( elements.list ) );
      colors.push( hex );
      this.setPaletteWidth();
      return colors.length - 1;
    },

    _newColor: function( hex, index ) {
      var element = elements.color.clone();
          link = elements.link.clone();
      link.css({
        "background-color": hex,
        "width": this.lineHeight,
        "height": this.lineHeight,
        "display": "block"
      });
      if ( index != undefined ) {
        link.attr( "data-index", index );
      }
      element.append( link );
      return element;
    }

  } );

 $.paletteList = {
    options: {
      colors: [ "red", "orange", "yellow", "green", "blue", "indigo", "violet" ],
      hover: false,
      targetIsTrigger: false
    }
  };

  $.fn.paletteList = function( options ){

    if ( typeof options === "string" ) {
      if ( this.length === 1 && this.data( "paletteList" ) ) {
        if ( options === "api" ) {
          return this.data( "paletteList" );
        } else {
          options = {};
        }
      } else {
        options = {};
      }
    }

    return this.each(function() {
      if ( $.data( this, "paletteList" ) === undefined ) {
        $.data( this, "paletteList", new PaletteList( this, _id++, options ) );
      }
    });
  };

 }( jQuery, this ));