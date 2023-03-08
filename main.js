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

var Webflow = Webflow || [];
Webflow.push(function () {  

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

    // Instantiate the ImageTrail object
    imageTrails.push(new ImageTrail(list, mouseThreshold, opacityFrom, scaleFrom, opacityTo, scaleTo, mainDuration, mainEase,
      fadeOutDuration, fadeOutDelay, fadeOutEase, resetIndex, resetIndexDelay))
  }
});
