import React, { useState, useRef, useEffect } from 'react'
// import { fabric } from "fabric"
// import { render } from 'react-dom'
import ProductImage from './img/bottle-mockup-resized.png'

// var imgRatio;
// var fabricCanvas = null;

const Editor = props => {

    const [hover, setHover] = useState(0)
    // const editorRef = useRef(null)
    const bgRef = useRef(null)

    var pxRatio = 1
    var rotateOffset = 0

    const previewSizeMm = {
        x : 7,
        y : 90,
        height : 60,
        width : 188,
        clipWidth: 61
    }

    const productSizeMm = {
        height : 172,
        width : 68
    }

    // Get the preview size in px
    const getPreviewSize = () => {
        return {
            x : previewSizeMm.x * pxRatio,
            y : previewSizeMm.y * pxRatio,
            height : previewSizeMm.height * pxRatio,
            width : previewSizeMm.width * pxRatio,
            clipWidth : previewSizeMm.clipWidth * pxRatio
        }
    }

    // Get the product size in px
    const getProductSize = () => {
        return { 
            width : productSizeMm.width * pxRatio,
            height : productSizeMm.height * pxRatio
        }
    }   

    // The layer class
    class Layer {
        constructor(options) {
            if( options ) {
                this.x = options.x ? options.x : 0
                this.y = options.y ? options.y : 0
                this.width = options.width ? options.width : getPreviewSize().clipWidth
                this.height = options.height ? options.height : 10
                this.text = options.text ? options.text : 'Click to add text'
            }
            return this
        }
    
        getPxSize = () => {
            return {
                width : this.width * pxRatio,
                height : this.height * pxRatio
            }
        }

        getPxPosition = () => {
            return {
                x : this.x * pxRatio,
                y : this.y * pxRatio,
            }
        }
        
    }

    // The layer objects
    var layers = [
        new Layer({
            x : 0,
            y : 0,
            height : 10,
            text : 'Add text...'
        })
    ]

    const onMouseEnterHandler = () => {
        setHover(true)
    }

    const onMouseLeaveHandler = () => {
        setHover(false)
    } 

    const getSomething = () => {
        return pxRatio;
    }

    const onMouseMoveHandler = () => {

        /*
        // Check if we're hovering over a layer
        for( var i = 0; i < layers.length; i++ ) {
            var layer = layers[i]
            let bounds = bgRef.current.getBoundingClientRect()
            let mouseX = e.clientX - bounds.left + 100 // find out where the 100 is coming from
            let mouseY = e.clientY - bounds.top
            // var x = offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x

            // console.log( offsetX )

            // console.log( mouseX, mouseY )
            // console.log( x )

            /*
            
            var offsetY = bgRef.current.height / 2 - getProductSize().height / 2
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x
            var y = offsetY + getPreviewSize().y + layers[i].getPxPosition().y
            // console.log(x, x + layers[i].getPxSize().width)
            // console.log( e.clientX )
            if( e.clientX - bounds.left > x && e.clientY > y && e.clientX - bounds.left < (x + layers[i].getPxSize().width) ) {
                console.log( 'yes' )
            }

        }
        */
    }

    const resizeEditor = () => {
        // When the editor is resized, we need to scale the pixel ratio accordingly
        var dpr = window.devicePixelRatio || 1
        var elHeight = document.getElementById("editor-container").clientHeight
        var elWidth = document.getElementById("editor-container").clientWidth

        bgRef.current.width = elWidth * dpr
        bgRef.current.height = elHeight * dpr

        if( elWidth * ( productSizeMm.height / productSizeMm.width ) > elHeight ) {
            pxRatio = elHeight / productSizeMm.height
        } else {
            pxRatio = elWidth / productSizeMm.width
        }

        console.log( getSomething() )

    }

    useEffect(() => {

        // The background canvas
        const bgImg = new Image() 
        bgImg.src = ProductImage
        bgImg.onload = () => {
            resizeEditor()
            draw()
        }

        // The editor canvas
        // const fabricCanvas = new fabric.Canvas( 'editor', {} )
        // fabricCanvas.backgroundColor = "#efefef"

        // Function to resize both canvas
        const draw = () => {
            const ctx = bgRef.current.getContext('2d')

            var offsetX = bgRef.current.width / 2 - getProductSize().width / 2
            var offsetY = bgRef.current.height / 2 - getProductSize().height / 2

            ctx.drawImage(bgImg, offsetX, offsetY, getProductSize().width, getProductSize().height)

            ctx.beginPath()
            ctx.rect(offsetX + getPreviewSize().x, offsetY + getPreviewSize().y, getPreviewSize().clipWidth, getPreviewSize().height)
            ctx.clip();
            ctx.closePath();

            ctx.fillStyle = '#efefef'
            ctx.fillRect(offsetX - rotateOffset + getPreviewSize().x, offsetY + getPreviewSize().y, getPreviewSize().width, getPreviewSize().height)

            for( var i = 0; i < layers.length; i++ ) {
                if( layers[i].text ) {
                    ctx.fillStyle = '#000000'
                    ctx.font = layers[i].getPxSize().height + 'px sans-serif'
                    ctx.textBaseline = 'top'
                    var x = offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x
                    var y = offsetY + getPreviewSize().y + layers[i].getPxPosition().y
                    ctx.fillText(layers[i].text, x, y, layers[i].getPxSize().width)
                    /*
                    ctx.fillStyle = '#000000'
                    var h = layers[i].mmH * pxRatio
                    var w = layers[i].mmW ? layers[i].mmW : undefined
                    var x = offsetX - rotateOffset + getPreviewSize().x + layers[i].mmX * pxRatio
                    var y = offsetY + getPreviewSize().y + layers[i].mmY * pxRatio
                    ctx.font = h + 'px sans-serif'
                    ctx.textBaseline = 'top'
                    ctx.fillText(layers[i].text, x, y, w)
                    */
                }
            }

            /*
            var previewOffsetX = offsetX + previewX * pxRatio
            var previewOffsetY =  offsetY + previewY * pxRatio
            fabricCanvas.getElement().parentElement.style.position = 'absolute'
            fabricCanvas.getElement().parentElement.style.left = previewOffsetX + 'px'
            fabricCanvas.getElement().parentElement.style.top = previewOffsetY + 'px'
            fabricCanvas.setHeight(previewHeight * pxRatio)
            fabricCanvas.setWidth(previewWidth * pxRatio)

            fabricCanvas.setZoom( 1 );

            for( var i = 0; i < layers.length; i++ ) {
                if( !layers[i].el ) {
                    layers[i].el = new fabric.IText( layers[i].text )
                    fabricCanvas.add( layers[i].el )
                }

                layers[i].el.set({
                    left: layers[i].mmX * pxRatio,
                    top: layers[i].mmY * pxRatio,
                    fontSize: layers[i].mmH * pxRatio,
                })
            }
            */
        }

        // Observe resize to scale accordingly
        new ResizeObserver( () => {
            resizeEditor()
            draw()
        }).observe(document.getElementById('preview'))

    }, [])

    return <div className="editor-container" id="editor-container"><canvas id="background" className="background" ref={bgRef} onMouseEnter={onMouseEnterHandler} onMouseMove={onMouseMoveHandler} onMouseLeave={onMouseLeaveHandler} />{/*<canvas id="editor" className="editor" ref={editorRef} />*/}</div>

}

export default Editor