/*!
 * imagesLoaded PACKAGED v5.0.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

/**
 * EvEmitter v2.1.1
 * Lil' event emitter
 * MIT License
 */

( function( global, factory ) {
  // universal module definition
  if ( typeof module == 'object' && module.exports ) {
    // CommonJS - Browserify, Webpack
    module.exports = factory();
  } else {
    // Browser globals
    global.EvEmitter = factory();
  }

}( typeof window != 'undefined' ? window : this, function() {

function EvEmitter() {}

let proto = EvEmitter.prototype;

proto.on = function( eventName, listener ) {
  if ( !eventName || !listener ) return this;

  // set events hash
  let events = this._events = this._events || {};
  // set listeners array
  let listeners = events[ eventName ] = events[ eventName ] || [];
  // only add once
  if ( !listeners.includes( listener ) ) {
    listeners.push( listener );
  }

  return this;
};

proto.once = function( eventName, listener ) {
  if ( !eventName || !listener ) return this;

  // add event
  this.on( eventName, listener );
  // set once flag
  // set onceEvents hash
  let onceEvents = this._onceEvents = this._onceEvents || {};
  // set onceListeners object
  let onceListeners = onceEvents[ eventName ] = onceEvents[ eventName ] || {};
  // set flag
  onceListeners[ listener ] = true;

  return this;
};

proto.off = function( eventName, listener ) {
  let listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) return this;

  let index = listeners.indexOf( listener );
  if ( index != -1 ) {
    listeners.splice( index, 1 );
  }

  return this;
};

proto.emitEvent = function( eventName, args ) {
  let listeners = this._events && this._events[ eventName ];
  if ( !listeners || !listeners.length ) return this;

  // copy over to avoid interference if .off() in listener
  listeners = listeners.slice( 0 );
  args = args || [];
  // once stuff
  let onceListeners = this._onceEvents && this._onceEvents[ eventName ];

  for ( let listener of listeners ) {
    let isOnce = onceListeners && onceListeners[ listener ];
    if ( isOnce ) {
      // remove listener
      // remove before trigger to prevent recursion
      this.off( eventName, listener );
      // unset once flag
      delete onceListeners[ listener ];
    }
    // trigger listener
    listener.apply( this, args );
  }

  return this;
};

proto.allOff = function() {
  delete this._events;
  delete this._onceEvents;
  return this;
};

return EvEmitter;

} ) );
/*!
 * imagesLoaded v5.0.0
 * JavaScript is all like "You images are done yet or what?"
 * MIT License
 */

( function( window, factory ) {
  // universal module definition
  if ( typeof module == 'object' && module.exports ) {
    // CommonJS
    module.exports = factory( window, require('ev-emitter') );
  } else {
    // browser global
    window.imagesLoaded = factory( window, window.EvEmitter );
  }

} )( typeof window !== 'undefined' ? window : this,
    function factory( window, EvEmitter ) {

let $ = window.jQuery;
let console = window.console;

// -------------------------- helpers -------------------------- //

// turn element or nodeList into an array
function makeArray( obj ) {
  // use object if already an array
  if ( Array.isArray( obj ) ) return obj;

  let isArrayLike = typeof obj == 'object' && typeof obj.length == 'number';
  // convert nodeList to array
  if ( isArrayLike ) return [ ...obj ];

  // array of single index
  return [ obj ];
}

// -------------------------- imagesLoaded -------------------------- //

/**
 * @param {[Array, Element, NodeList, String]} elem
 * @param {[Object, Function]} options - if function, use as callback
 * @param {Function} onAlways - callback function
 * @returns {ImagesLoaded}
 */
function ImagesLoaded( elem, options, onAlways ) {
  // coerce ImagesLoaded() without new, to be new ImagesLoaded()
  if ( !( this instanceof ImagesLoaded ) ) {
    return new ImagesLoaded( elem, options, onAlways );
  }
  // use elem as selector string
  let queryElem = elem;
  if ( typeof elem == 'string' ) {
    queryElem = document.querySelectorAll( elem );
  }
  // bail if bad element
  if ( !queryElem ) {
    console.error(`Bad element for imagesLoaded ${queryElem || elem}`);
    return;
  }

  this.elements = makeArray( queryElem );
  this.options = {};
  // shift arguments if no options set
  if ( typeof options == 'function' ) {
    onAlways = options;
  } else {
    Object.assign( this.options, options );
  }

  if ( onAlways ) this.on( 'always', onAlways );

  this.getImages();
  // add jQuery Deferred object
  if ( $ ) this.jqDeferred = new $.Deferred();

  // HACK check async to allow time to bind listeners
  setTimeout( this.check.bind( this ) );
}

ImagesLoaded.prototype = Object.create( EvEmitter.prototype );

ImagesLoaded.prototype.getImages = function() {
  this.images = [];

  // filter & find items if we have an item selector
  this.elements.forEach( this.addElementImages, this );
};

const elementNodeTypes = [ 1, 9, 11 ];

/**
 * @param {Node} elem
 */
ImagesLoaded.prototype.addElementImages = function( elem ) {
  // filter siblings
  if ( elem.nodeName === 'IMG' ) {
    this.addImage( elem );
  }
  // get background image on element
  if ( this.options.background === true ) {
    this.addElementBackgroundImages( elem );
  }

  // find children
  // no non-element nodes, #143
  let { nodeType } = elem;
  if ( !nodeType || !elementNodeTypes.includes( nodeType ) ) return;

  let childImgs = elem.querySelectorAll('img');
  // concat childElems to filterFound array
  for ( let img of childImgs ) {
    this.addImage( img );
  }

  // get child background images
  if ( typeof this.options.background == 'string' ) {
    let children = elem.querySelectorAll( this.options.background );
    for ( let child of children ) {
      this.addElementBackgroundImages( child );
    }
  }
};

const reURL = /url\((['"])?(.*?)\1\)/gi;

ImagesLoaded.prototype.addElementBackgroundImages = function( elem ) {
  let style = getComputedStyle( elem );
  // Firefox returns null if in a hidden iframe https://bugzil.la/548397
  if ( !style ) return;

  // get url inside url("...")
  let matches = reURL.exec( style.backgroundImage );
  while ( matches !== null ) {
    let url = matches && matches[2];
    if ( url ) {
      this.addBackground( url, elem );
    }
    matches = reURL.exec( style.backgroundImage );
  }
};

/**
 * @param {Image} img
 */
ImagesLoaded.prototype.addImage = function( img ) {
  let loadingImage = new LoadingImage( img );
  this.images.push( loadingImage );
};

ImagesLoaded.prototype.addBackground = function( url, elem ) {
  let background = new Background( url, elem );
  this.images.push( background );
};

ImagesLoaded.prototype.check = function() {
  this.progressedCount = 0;
  this.hasAnyBroken = false;
  // complete if no images
  if ( !this.images.length ) {
    this.complete();
    return;
  }

  /* eslint-disable-next-line func-style */
  let onProgress = ( image, elem, message ) => {
    // HACK - Chrome triggers event before object properties have changed. #83
    setTimeout( () => {
      this.progress( image, elem, message );
    } );
  };

  this.images.forEach( function( loadingImage ) {
    loadingImage.once( 'progress', onProgress );
    loadingImage.check();
  } );
};

ImagesLoaded.prototype.progress = function( image, elem, message ) {
  this.progressedCount++;
  this.hasAnyBroken = this.hasAnyBroken || !image.isLoaded;
  // progress event
  this.emitEvent( 'progress', [ this, image, elem ] );
  if ( this.jqDeferred && this.jqDeferred.notify ) {
    this.jqDeferred.notify( this, image );
  }
  // check if completed
  if ( this.progressedCount === this.images.length ) {
    this.complete();
  }

  if ( this.options.debug && console ) {
    console.log( `progress: ${message}`, image, elem );
  }
};

ImagesLoaded.prototype.complete = function() {
  let eventName = this.hasAnyBroken ? 'fail' : 'done';
  this.isComplete = true;
  this.emitEvent( eventName, [ this ] );
  this.emitEvent( 'always', [ this ] );
  if ( this.jqDeferred ) {
    let jqMethod = this.hasAnyBroken ? 'reject' : 'resolve';
    this.jqDeferred[ jqMethod ]( this );
  }
};

// --------------------------  -------------------------- //

function LoadingImage( img ) {
  this.img = img;
}

LoadingImage.prototype = Object.create( EvEmitter.prototype );

LoadingImage.prototype.check = function() {
  // If complete is true and browser supports natural sizes,
  // try to check for image status manually.
  let isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    // report based on naturalWidth
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    return;
  }

  // If none of the checks above matched, simulate loading on detached element.
  this.proxyImage = new Image();
  // add crossOrigin attribute. #204
  if ( this.img.crossOrigin ) {
    this.proxyImage.crossOrigin = this.img.crossOrigin;
  }
  this.proxyImage.addEventListener( 'load', this );
  this.proxyImage.addEventListener( 'error', this );
  // bind to image as well for Firefox. #191
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.proxyImage.src = this.img.currentSrc || this.img.src;
};

LoadingImage.prototype.getIsImageComplete = function() {
  // check for non-zero, non-undefined naturalWidth
  // fixes Safari+InfiniteScroll+Masonry bug infinite-scroll#671
  return this.img.complete && this.img.naturalWidth;
};

LoadingImage.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  let { parentNode } = this.img;
  // emit progress with parent <picture> or self <img>
  let elem = parentNode.nodeName === 'PICTURE' ? parentNode : this.img;
  this.emitEvent( 'progress', [ this, elem, message ] );
};

// ----- events ----- //

// trigger specified handler for event type
LoadingImage.prototype.handleEvent = function( event ) {
  let method = 'on' + event.type;
  if ( this[ method ] ) {
    this[ method ]( event );
  }
};

LoadingImage.prototype.onload = function() {
  this.confirm( true, 'onload' );
  this.unbindEvents();
};

LoadingImage.prototype.onerror = function() {
  this.confirm( false, 'onerror' );
  this.unbindEvents();
};

LoadingImage.prototype.unbindEvents = function() {
  this.proxyImage.removeEventListener( 'load', this );
  this.proxyImage.removeEventListener( 'error', this );
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

// -------------------------- Background -------------------------- //

function Background( url, element ) {
  this.url = url;
  this.element = element;
  this.img = new Image();
}

// inherit LoadingImage prototype
Background.prototype = Object.create( LoadingImage.prototype );

Background.prototype.check = function() {
  this.img.addEventListener( 'load', this );
  this.img.addEventListener( 'error', this );
  this.img.src = this.url;
  // check if image is already complete
  let isComplete = this.getIsImageComplete();
  if ( isComplete ) {
    this.confirm( this.img.naturalWidth !== 0, 'naturalWidth' );
    this.unbindEvents();
  }
};

Background.prototype.unbindEvents = function() {
  this.img.removeEventListener( 'load', this );
  this.img.removeEventListener( 'error', this );
};

Background.prototype.confirm = function( isLoaded, message ) {
  this.isLoaded = isLoaded;
  this.emitEvent( 'progress', [ this, this.element, message ] );
};

// -------------------------- jQuery -------------------------- //

ImagesLoaded.makeJQueryPlugin = function( jQuery ) {
  jQuery = jQuery || window.jQuery;
  if ( !jQuery ) return;

  // set local variable
  $ = jQuery;
  // $().imagesLoaded()
  $.fn.imagesLoaded = function( options, onAlways ) {
    let instance = new ImagesLoaded( this, options, onAlways );
    return instance.jqDeferred.promise( $( this ) );
  };
};
// try making plugin
ImagesLoaded.makeJQueryPlugin();

// --------------------------  -------------------------- //

return ImagesLoaded;

});


/********* Utility *********/

const MathUtils = {
  // Linear interpolation
  lerp: (a, b, n) => (1 - n) * a + n * b,
  // Distance between two points
  distance: (x1,y1,x2,y2) => Math.hypot(x2-x1, y2-y1)
}

// Get the mouse position inside the corresponding DOM element
const getMousePos = (e) => {
  let x = e.layerX
  let y = e.layerY
  
  return {x: x, y: y};
}

// Defines an Image object
class Image {
  constructor(el) {
    this.DOM = {el: el};
    // Image deafult styles
    this.defaultStyle = {
      scale: 1,
      x: 0,
      y: 0,
      opacity: 0
    };
    // Get sizes/position
    this.getRect();
    // Init/bind events
    this.initEvents();
  }
        
  initEvents() {
    // On resize get updated sizes/position
    window.addEventListener('resize', () => this.resize());
  }
        
  resize() {
    // Reset styles to default
    gsap.set(this.DOM.el, this.defaultStyle);
    // Get sizes/position
    this.getRect();
  }
        
  getRect() {
    this.rect = this.DOM.el.getBoundingClientRect();
  }

  isActive() {
    // Check if image is animating or if it's visible
    return gsap.isTweening(this.DOM.el) || this.DOM.el.style.opacity != 0;
  }
}

// Defines an ImageTrail object
class ImageTrail {
  constructor(list, mouseThreshold, opacityFrom, scaleFrom, opacityTo, scaleTo, mainDuration, mainEase, fadeOutDuration, fadeOutDelay, fadeOutEase, resetIndex, resetIndexDelay) {
    // Images container
    this.DOM = { content: list };
    // Array of Image objs, one per image element
    this.images = [];
    [...this.DOM.content.querySelectorAll('img')].forEach(img => this.images.push(new Image(img)));
    // Total number of images
    this.imagesTotal = this.images.length;
    // Upcoming image index
    this.imgPosition = 0;
    // zIndex value to apply to the upcoming image
    this.zIndexVal = 1;
    // Mouse distance required to show the next image
    this.threshold = mouseThreshold;
    // Number of frames rendered (used if the reset index parameter is set to true)
    this.frameCount = 0;
    // If set to true, it resets the image trail index everytime the cursor enters the component
    this.resetIndex = resetIndex === null ? "false" : resetIndex
    // The number of frames after which the image trail index is resetted if the reset index parameter is set to true
    this.resetIndexDelay = isNaN(resetIndexDelay) ? 200 : resetIndexDelay
    // The initial opacity value for each image in the trail
    this.opacityFrom = isNaN(opacityFrom) ? 0.5 : opacityFrom
    // The initial scale value for each image in the trail
    this.scaleFrom = isNaN(scaleFrom) ? 0.5 : scaleFrom
    // The opacity value each image is animated to
    this.opacityTo = isNaN(opacityTo) ? 1 : opacityTo
    // The scale value each image is animated to
    this.scaleTo = isNaN(scaleTo) ? 1 : scaleTo
    // The duration of the first part of the animation
    this.mainDuration = isNaN(mainDuration) ? 0.5 : mainDuration
    // The easing function for the first part of the animation
    this.mainEase = mainEase === null ? 'power3' : mainEase
    // The duration of the fade-out part of the animation
    this.fadeOutDuration = isNaN(fadeOutDuration) ? 0.5 : fadeOutDuration
    // The amount of time to wait before the fade-out part of the animation
    this.fadeOutDelay = isNaN(fadeOutDelay) ? 0.5 : fadeOutDelay
    // The easing function for the fade-out animation
    this.fadeOutEase = fadeOutEase === null ? 'power3' : fadeOutEase
    // Store mouse positions relative to the component the trail image is in
    // mousePos: current mouse position
    // cacheMousePos: previous mouse position
    // lastMousePos: last last recorded mouse position (at the time the last image was shown)
    this.mousePos = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }
    this.cacheMousePos = { x: 0, y: 0 }
    // When set to true prevents the request animation frame function to be fired
    this.stopAnimationFrame = false
  }
        
  render() {
      // Get distance between the current mouse position and the position of the previous image
      let distance = MathUtils.distance(this.mousePos.x, this.mousePos.y, this.lastMousePos.x, this.lastMousePos.y);//getMouseDistance();
      // Cache previous mouse position
      this.cacheMousePos.x = MathUtils.lerp(this.cacheMousePos.x || this.mousePos.x, this.mousePos.x, 0.1);
      this.cacheMousePos.y = MathUtils.lerp(this.cacheMousePos.y || this.mousePos.y, this.mousePos.y, 0.1);

      // If the mouse moved more than [this.threshold] then show the next image
      if (distance > this.threshold) {
          this.showNextImage();

          ++this.zIndexVal;
          this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition+1 : 0;

          this.lastMousePos = this.mousePos;
      }

      // Check when mousemove stops and all images are inactive (not visible and not animating)
      let isIdle = true
      for (let img of this.images) {
          if (img.isActive()) {
              isIdle = false
              break;
          }
      }

      if(isIdle) {
        // Increase the frame count value
        this.frameCount++

        // Reset the image position index if the reset index is set to true
        if(this.resetIndex === "true" && this.frameCount >= this.resetIndexDelay) {
          this.frameCount = 0
          this.imgPosition = 0
        }
      }

      // Reset z-index initial value
      if (isIdle && this.zIndexVal !== 1) {
          this.zIndexVal = 1
      }

      // Loop..
      if(!this.stopAnimationFrame)
      requestAnimationFrame(() => this.render())
  }

  showNextImage() {
    // Show image at position [this.imgPosition]
    const img = this.images[this.imgPosition]
    // Kill any tween on the image
    gsap.killTweensOf(img.DOM.el)

    gsap.timeline()
    // Show the image
    .set(img.DOM.el, {
        opacity: this.opacityFrom,
        scale: this.scaleFrom,
        zIndex: this.zIndexVal,
        x: this.cacheMousePos.x - img.rect.width / 2,
        y: this.cacheMousePos.y - img.rect.height / 2
    })
    // Animate position, opacity, and scale
    .to(img.DOM.el, {
        ease: this.mainEase,
        x: this.mousePos.x - img.rect.width / 2,
        y: this.mousePos.y - img.rect.height / 2,
        opacity: this.opacityTo,
        scale: this.scaleTo,
        duration: this.mainDuration,
        delay: 0
    })
    // then make it disappear
    .to(img.DOM.el, {
        ease: this.fadeOutEase,
        opacity: 0,
        scale: this.scaleFrom,
        duration: this.fadeOutDuration,
        delay: this.fadeOutDelay
    })
  }
}

// The actual trail image components, which is an array of all the containers where the trail image effect will take place
const components = document.querySelectorAll('[fc-trail-image = component]')

// An array to store all the image trail objects that will be instanced
let imageTrails = []

// Loops through all the components to generate the corresponding image trail object
for(let i = 0; i < components.length; i++)
{
  // A list of all the images inside the current component
  const list = components[i].querySelector('[fc-trail-image = list]')
  
  // Mouse distance required to show the next image
  const mouseThreshold = parseInt(components[i].getAttribute('fc-trail-image-threshold'))
  
  // The initial opacity value for each image
  const opacityFrom = parseFloat(components[i].getAttribute('fc-trail-image-opacity-from'))
  
  // The initial scale value for all the images
  const scaleFrom = parseFloat(components[i].getAttribute('fc-trail-image-scale-from'))
  
  // The opacity value all the images will be animated to
  const opacityTo = parseFloat(components[i].getAttribute('fc-trail-image-opacity-to'))
  
  // The scale value all the images will be animated to
  const scaleTo = parseFloat(components[i].getAttribute('fc-trail-image-scale-to'))
  
  // The duration of the first part of the animation
  const mainDuration = parseFloat(components[i].getAttribute('fc-trail-image-main-duration'))
  
  // The easing function for the first part of the animation
  const mainEase = components[i].getAttribute('fc-trail-image-main-ease')
  
  // The duration of the fade-out part of the animation
  const fadeOutDuration = parseFloat(components[i].getAttribute('fc-trail-image-fade-out-duration'))
  
  // The time to wait before the fade out part of the animation
  const fadeOutDelay = parseFloat(components[i].getAttribute('fc-trail-image-fade-out-delay'))
  
  // The easing function of the fade-out part of the animation
  const fadeOutEase = components[i].getAttribute('fc-trail-image-fade-out-ease')
  
  // If set to true, it resets the image position index after the amount of frames specified
  // with the resetIndexDelay parameter
  const resetIndex = components[i].getAttribute('fc-trail-image-reset-index')
  
  // The amount of frames after which the image position index of the trail il resetted
  // (if the resetIndex parameter is set to true)
  const resetIndexDelay = parseInt(components[i].getAttribute('fc-trail-image-reset-index-delay'))

  // Get the mouse position relative to the component
  components[i].addEventListener('mousemove', function(ev) {
    if(imageTrails[i].resetIndex === "true" && imageTrails[i].frameCount > 0)
      imageTrails[i].frameCount = 0

    imageTrails[i].mousePos = getMousePos(ev)
  })

  // The rendering starts again and image position index is resetted if the resetIndex parameter is set to true
  components[i].addEventListener("mouseenter", function(e) { 

    imageTrails[i].stopAnimationFrame = false
    requestAnimationFrame(() => imageTrails[i].render());

    if(imageTrails[i].resetIndex === "true") {
      imageTrails[i].imgPosition = 0
      imageTrails[i].frameCount = 0
    }
  })

  // Stop the rendering of the images
  components[i].addEventListener("mouseleave", function(e) { 
    imageTrails[i].stopAnimationFrame = true
  })

  // Loads all the images for the current component and then instatiates the corresponding image trail object
  imagesLoaded(list.querySelectorAll('img'), function(instance) {
    console.log('all images are loaded')
    imageTrails.push(new ImageTrail(list, mouseThreshold, opacityFrom, scaleFrom, opacityTo, scaleTo, mainDuration, mainEase,
    fadeOutDuration, fadeOutDelay, fadeOutEase, resetIndex, resetIndexDelay))
  });
}
