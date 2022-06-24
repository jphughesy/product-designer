import React, { useState, useRef, useEffect } from 'react'
import ProductImage from './img/bottle-mockup-resized.png'

// Mouse locations
let lastDbleclickLocation = {
    x : 0,
    y : 0
};

let lastMouseDownLocation = {
    x : 0,
    y : 0
};

let lastMouseUpLocation = {
    x : 0,
    y : 0
};

let layers = [];

class TextLayer {
    constructor(options) {
        this.x = options.x ? options.x : 0;
        this.y = options.y ? options.y : 0;
        this.font = options.font ? options.font : 'serif';
        this.fontSize = options.fontSize ? options.fontSize : 10;
        this.fontWeight = options.fontWeight ? options.fontWeight : 'normal';
        this.fontStyle = options.fontStyle ? options.fontStyle : 'normal';
        this.fontVariant = options.fontVariant ? options.fontVariant : 'normal';
        this.align = options.align ? options.align : 'left';
        this.text = options.text ? options.text : 'Click to add text';
    }
}

class PreviewScroll {
    constructor(options) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.scrollX = 0;
        this.clipWidth = 0;
        this.dragging = false;
        this.lastScrollX = 0;
        this.pxRatio = 1;
    }

    mouseUp = (x,y) => {
        this.dragging = false;
    }

    mouseDown = (x,y) => {
        if( this.hitTest(x,y) ) {
            this.dragging = true;
            this.lastScrollX = this.scrollX;
        }
    }

    mouseMove = (x,y) => {
        if(this.dragging) {
            let pxMovedX = x - lastMouseDownLocation.x;
            this.scrollX = this.lastScrollX + pxMovedX;

            if( this.scrollX < 0 ) {
                this.scrollX = 0;
            } else if( this.scrollX + this.clipWidth > this.width ) {
                this.scrollX = this.width - this.clipWidth;
            }
        }
    }

    hitTest = (x,y) => {
        if( x > this.x + this.scrollX && x < this.x + this.scrollX + this.clipWidth && y > this.y && y < this.y + this.height )
            return true;
        else
            return false;
    }

    draw = (ctx) => {

        // Clip & fill the preview area
        ctx.save()
        ctx.beginPath()
        ctx.rect(this.x, this.y, this.width, this.height)
        ctx.clip();
        ctx.fillStyle = '#eeeeee';
        ctx.fill();
        ctx.closePath();

        // Draw the frame for the current visible area
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(this.x + this.scrollX, this.y, this.clipWidth, this.height);

        // Draw the layers
        for(var i = 0; i < layers.length; i++) {
            let pxSize = layers[i].fontSize * this.pxRatio;
            ctx.font = layers[i].fontStyle + ' ' + layers[i].fontVariant + ' ' + layers[i].fontWeight + ' ' + pxSize + 'px ' + layers[i].font
            ctx.textBaseline = 'top'
            ctx.fillStyle = '#000000'
            ctx.fillText(layers[i].text, this.x + layers[i].x, this.y + layers[i].y);
        }

        // Overlay with white to give transparent look
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(this.x, this.y, this.scrollX, this.height);
        ctx.fillRect(this.x + this.scrollX + this.clipWidth, this.y, this.width - this.scrollX - this.clipWidth, this.height);
    
        ctx.restore()
    }
}

class ProductArea {
    constructor(options) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.clipWidth = 20;
        if( options.img ) {
            this.img = new Image();
            this.img.src = options.img;
        }
    }   

    draw = (ctx) => {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class PreviewArea {
    constructor(options) {
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        if( options.bgImg ) {   
            this.bgImg = new Image();
            this.bgImg.src = options.bgImg;
        }
        this.bgCol = options.bgCol;
    }

    draw = (ctx) => {

        // Draw the background
        if( this.bgImg ) {
            ctx.drawImage(this.bgImg, this.x, this.y, this.width, this.height);    
        } else {
            ctx.fillStyle = this.bgCol;
            ctx.fillRect(this.x, this.y, this.width, this.height);  
        }

        // Draw the layers
        for(var i = 0; i < layers.length; i++) {

        }

    }
}

const Editor = props => {

    const bgRef = useRef(null);

    let dragging = false;

    // The product dimensions in mm
    const productDimensions = {
        width : 68,
        height : 172,
        previewWidth : 188,
        previewHeight : 60,
        previewX : 7,
        previewY : 90,
        clipWidth : 61,
        clipHeight : 60,    
    }

    // Create an instance of the product area
    // This is used for drawing the product image to the canvas
    const productArea = new ProductArea({
        img : ProductImage
    });

    // If there is an image, we need to redraw the canvas when it loads
    if( productArea.img ) {
        productArea.img.onload = () => {
            draw();
        }
    }

    // Create an instance of the preview area
    // This is used for drawing the personalization area (label, sticker etc.)
    const previewArea = new PreviewArea({
        bgImg : false,
        bgCol : 'red'
    });

    // If the area has a background image, redraw when it loads
    if( previewArea.bgImg ) {
        previewArea.bgImg.onload = () => {
            draw();
        }
    }

    // Create an instance of the scroll bar
    const previewScroll = new PreviewScroll;

    // Get the layers - these will be provided by a json template
    layers[0] = new TextLayer({
        x : 0,
        y : 0,
        fontSize : 5.4,
        font : 'Helvetica',
        fontStyle : 'oblique',
        fontVariant : 'normal',
        fontWeight : '800',
        text : 'Moisturizing\nShampoo test test test test test test test test test test test test test',
    });

    // The handler functions
    const onKeyDownHandler = (e) => {
        switch( e.keyCode ) {
            case 39 :
                // Right pressed
                break;
            case 37 :
                // Left pressed
                break;
            case 38 :
                // Up pressed 
                break;
            case 40 : 
                // Down pressed
                break;
            case 13 :
                // Enter pressed
                break;
            case 8 :
                // Backspace pressed
                break;
            case 36 : 
                // Delete pressed
                break;
            default :
                if(String.fromCharCode(e.keyCode).match(/(\w|\s)/g)) {
                    // Character pressed
                }
                break;
        }
    }

    const onDblclickHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        lastDbleclickLocation.x = {
            x : mouseX,
            y : mouseY
        };

    }

    const onMouseDownHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        dragging = true;

        lastMouseDownLocation = {
            x : mouseX,
            y : mouseY
        };

        previewScroll.mouseDown(mouseX, mouseY);

    }

    const onMouseUpHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        dragging = false;

        lastMouseUpLocation = {
            x : mouseX,
            y : mouseY
        };

        previewScroll.mouseUp(mouseX, mouseY);
        
    }

    const onMouseMoveHandler = (e) => {
        // We only want coordinates relative to the bounding rectangle
        let bounds = bgRef.current.getBoundingClientRect()
        let mouseX = e.clientX - bounds.left
        let mouseY = e.clientY - bounds.top

        previewScroll.mouseMove(mouseX, mouseY);

        draw();

    }

    const onResizeHandler = () => {
        // Get the device pixel ratio (default is 1)
        //let dpr = window.devicePixelRatio || 1;
        let dpr = 1;
        let pxRatio = 1; // for mm -> px conversions

        // Get the container element width & height
        let elHeight = document.getElementById("editor-container").clientHeight;
        let elWidth = document.getElementById("editor-container").clientWidth;

        // Set the canvas element width & height
        bgRef.current.width = elWidth * dpr;
        bgRef.current.height = elHeight * dpr;

        // Calculate the new scroll area size & position
        let maxScrollHeight = 120;
        let scrollMargin = 20;

        if( maxScrollHeight / productDimensions.previewHeight * productDimensions.previewWidth > bgRef.current.width ) {
            previewScroll.width = bgRef.current.width;
            previewScroll.height = bgRef.current.width / productDimensions.previewWidth * productDimensions.previewHeight;
        } else {
            previewScroll.width = maxScrollHeight / productDimensions.previewHeight * productDimensions.previewWidth;
            previewScroll.height = maxScrollHeight;    
        }
        previewScroll.clipWidth = productDimensions.clipWidth / productDimensions.previewWidth * previewScroll.width;
        previewScroll.pxRatio = previewScroll.width / productDimensions.previewWidth;
        previewScroll.x = bgRef.current.width / 2 - previewScroll.width / 2;
        previewScroll.y = 0;

        // Set the pixel ratio for the product area (for mm -> px conversions)
        if( bgRef.current.width * ( productDimensions.height / productDimensions.width ) > (bgRef.current.height - previewScroll.height - scrollMargin) )
            productArea.pxRatio = (bgRef.current.height - previewScroll.height - scrollMargin) / productDimensions.height;
        else
            productArea.pxRatio = bgRef.current.width / productDimensions.width;

        // Calculate the new product area size & position
        productArea.width = productDimensions.width * productArea.pxRatio;
        productArea.height = productDimensions.height * productArea.pxRatio;
        productArea.x = bgRef.current.width / 2 - productArea.width / 2;
        productArea.y = (bgRef.current.height - previewScroll.height - scrollMargin) / 2 - productArea.height / 2 + previewScroll.height + scrollMargin;

        // Calculate the new preview area size & position
        previewArea.pxRatio = productArea.pxRatio;
        previewArea.width = productDimensions.clipWidth * previewArea.pxRatio;
        previewArea.height = productDimensions.clipHeight * previewArea.pxRatio;
        previewArea.x = productArea.x + productDimensions.previewX * previewArea.pxRatio;
        previewArea.y = productArea.y + productDimensions.previewY * previewArea.pxRatio;

    }

    const draw = () => {
        // Get the context
        const ctx = bgRef.current.getContext('2d');

        // Clear the whole canvas and fill with the background colour
        ctx.clearRect(0,0, bgRef.current.width, bgRef.current.height );
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, bgRef.current.width, bgRef.current.height );

        // Reset anything that needs resetting
        ctx.globalCompositeOperation = 'source-over';

        productArea.draw(ctx);
        previewArea.draw(ctx);
        previewScroll.draw(ctx);
    }

    useEffect(() => {

       draw();

        // Observe resize to scale accordingly
        new ResizeObserver( () => {
            onResizeHandler();
            draw();
        }).observe(document.getElementById('preview'))

        // Add mouse event handlers
        bgRef.current.addEventListener( "mousemove", onMouseMoveHandler );
        bgRef.current.addEventListener( "mouseup", onMouseUpHandler );
        bgRef.current.addEventListener( "mousedown", onMouseDownHandler );
        window.addEventListener( "keydown", onKeyDownHandler );
        bgRef.current.addEventListener( "dblclick", onDblclickHandler );

        return () => {
            bgRef.current.removeEventListener( "mousemove", onMouseMoveHandler );
            bgRef.current.removeEventListener( "mouseup", onMouseUpHandler );
            bgRef.current.removeEventListener( "mousedown", onMouseDownHandler );
            window.removeEventListener( "keydown", onKeyDownHandler );
            bgRef.current.removeEventListener( "dblclick", onDblclickHandler );
        }

    }, [])

    return <div className="editor-container" id="editor-container"><canvas id="background" className="background" ref={bgRef} />{}</div>

}

export default Editor