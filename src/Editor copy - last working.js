import React, { useState, useRef, useEffect } from 'react'
import ProductImage from './img/bottle-mockup-resized.png'

const Editor = props => {

    const [hover, setHover] = useState(0)
    // const [targetLayer, setTargetLayer] = useState(0)
    // const [activeLayer, setActiveLayer] = useState(0)
    const bgRef = useRef(null)

    var pxRatio = 1
    var rotateOffset = 0
    var targetLayer = null
    var activeLayer = null
    var editingLayer = null
    var snappingLayerX = null
    var snappingLayerY = null
    var cursorLocation = 0
    var dragging = false
    var snapDirection
    var snapLayers = []

    var activeLayers = []

    var snap = {
        layer : null,
        xAlign : null,
        yAlign : null
    }

    var textCursor = {
        x : null,
        y : null
    }

    var textSelection = {
        startLine : 0,
        startChar : 0,
        endLine : 0,
        endChar : 0
    }

    var lastClickLocation
    var lastMouseDownLocation

    const bgImg = new Image() 
    bgImg.src = ProductImage
    bgImg.onload = () => {
        resizeEditor()
        draw()
    }

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
                // this.width = options.width ? options.width : getPreviewSize().clipWidth
                this.font = options.font ? options.font : 'serif'
                this.fontSize = options.fontSize ? options.fontSize : 10
                this.fontWeight = options.fontWeight ? options.fontWeight : 'normal'
                this.fontStyle = options.fontStyle ? options.fontStyle : 'normal'
                this.fontVariant = options.fontVariant ? options.fontVariant : 'normal'
                this.align = options.align ? options.align : 'left'
                // this.maxWidth = options.maxWidth ? options.maxWidth : undefined
                this.text = options.text ? options.text : 'Click to add text'
            }
            return this
        }

        getTextLines = () => {
            return this.text.split('\n')
        }

        getPxHeight = () => {
            return this.fontSize * pxRatio * this.getTextLines().length
        }
    
        getPxSize = () => {
            const ctx = bgRef.current.getContext('2d')
            var lines = this.getTextLines()
            var width = 0
            for(var i = 0; i < lines.length; i++) {
                ctx.font = this.fontStyle + ' ' + this.fontVariant + ' ' + this.fontWeight + ' ' + (this.fontSize * pxRatio) + 'px ' + this.font
                //ctx.textBaseline = 'top'
                //ctx.textAlign = this.align
                var lineWidth = 0
                var characters = lines[i].split('')
                // For some reason this is getting the wrong size for some text:
                // var lineWidth = ctx.measureText(lines[i]).width
                // so step through the characters intead
                for( var j = 0; j < characters.length; j++ )
                    lineWidth += ctx.measureText(characters[j]).width

                if(lineWidth > width)
                    width = lineWidth
            }
            return {
                width : width,
                height : this.getPxHeight(),
                fontSize : this.fontSize * pxRatio
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
            x : 6,
            y : 31,
            fontSize : 5.4,
            font : 'Helvetica',
            fontStyle : 'oblique',
            fontVariant : 'normal',
            fontWeight : '800',
            text : 'Moisturizing\nShampoo',
        }),
        new Layer({
            x : 31,
            y : 37,
            fontSize : 5.4,
            font : 'Helvetica',
            fontWeight : '200',
            align : 'left',
            text : '/'    
        }),
        new Layer({
            x : 33.5,
            y : 38.5,
            fontSize : 2.2,
            font : 'Helvetica',
            fontWeight : '200',
            align : 'left',
            text : '240ml'          
        }),
        new Layer({
            x : 6,
            y : 43,
            fontSize : 2,
            font : 'Helvetica',
            align : 'left',
            text : 'Lightweight repair for dry, dehydrated hair.\nwww.recology.co.uk'
        })
    ]

    const setCursor = () => {

        if( targetLayer !== null ) {
            if( targetLayer == editingLayer ) {
                bgRef.current.style.cursor = 'text'
            } else if( targetLayer == activeLayer ) {
                bgRef.current.style.cursor = 'move'
            } else {
                bgRef.current.style.cursor = 'pointer'
            }
        } else {
            bgRef.current.style.cursor = 'default'
        }

    }

    const getTextSelectionCharacter = (mouseX,mouseY) => {
        const ctx = bgRef.current.getContext('2d')
        let offsetX = bgRef.current.width / 2 - getProductSize().width / 2
        let offsetY = bgRef.current.height / 2 - getProductSize().height / 2

        var currentLine = 0
        var currentCharacter = 0
        var lines = layers[editingLayer].getTextLines()
        for( var i = 0; i < lines.length; i++ ) {
            var y = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * i
            if( mouseY > y ) {
                currentLine = i
                textCursor.y = y
            }
        }
    
        /*
        // v1
        var characters = lines[currentLine].split('')
        var textWidth = 0;
        for( var i = 0; i < characters.length + 1; i++ ) {
            ctx.font = layers[editingLayer].getPxSize().fontSize + 'px ' + layers[editingLayer].font
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + textWidth
            if( mouseX > x ) {
                currentCharacter = i
                textCursor.x = x
            }
            textWidth += ctx.measureText(characters[i]).width
        }
        */

        var alignOffsetX = 0
        var lineWidth = ctx.measureText(lines[currentLine]).width
        if( layers[editingLayer].align == 'center' )
            alignOffsetX = layers[editingLayer].getPxSize().width / 2 - lineWidth / 2

        // v2
        var characters = lines[currentLine].split('')
        var textWidth = 0;
        for( var i = 0; i < lines[currentLine].split('').length + 1; i++ ) {
            var text = lines[currentLine].slice(0,i)
            var textWidth = ctx.measureText(text).width
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + textWidth + alignOffsetX
            if( mouseX > x ) {
                currentCharacter = i
                textCursor.x = x
            }
        }

        // var alignOffsetX = 0
        //if( layers[editingLayer].align == 'center' )
        //    alignOffsetX = layers[editingLayer].getPxSize().width / 2 - lineWidth / 2

        return {
            line : currentLine,
            character : currentCharacter
        }
    }

    const deleteMultipleText = () => {
                 
        var lines = layers[editingLayer].getTextLines()
        var newLines = []

        // We have multiple text to delete!
        for( var i = textSelection.startLine; i <= textSelection.endLine; i++ ) {

            var lineText = lines[i]
            var start = 0
            var end = lineText.length

            if( i == textSelection.startLine )
                start = textSelection.startChar
            if( i == textSelection.endLine )
                end = textSelection.endChar

            var newText = lineText.slice(0,start) + lineText.slice(end,lineText.length)

            if( i > textSelection.startLine ) {
                // Add to previous line
                newLines[newLines.length-1] = newLines[newLines.length-1] + newText
            } else if( newText ) {
                // Add to new line 
                newLines.push(newText)   
            }

        }

        lines.splice(textSelection.startLine,(textSelection.endLine - textSelection.startLine + 1), ...newLines)

        textSelection.endLine = textSelection.startLine
        textSelection.endChar = textSelection.startChar
                
        layers[editingLayer].text = lines.join( "\n" )
        draw()
 
    }

    const checkSnap = (x, y, w, h) => {

        var snap = {
            layer : null,
            xAlign : null,
            yAlign : null 
        }

        snapLayers = []
    
        var activeLeft = x
        var activeRight = x + w
        var activeCenterX = activeLeft + w/2
        var activeTop = y
        var activeBottom = y + h
        var activeCenterY = activeTop + h/2

        for(var i = 0; i < layers.length; i++ ) {

            if( i !== activeLayer ) {
                var left = layers[i].getPxPosition().x
                var centerX = left + layers[i].getPxSize().width/2
                var right = left + layers[i].getPxSize().width
                var top = layers[i].getPxPosition().y
                var bottom = top + layers[i].getPxSize().height
                var centerY = top + layers[i].getPxSize().height/2

                if( activeLeft - left < 5 && activeLeft - left > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'left'
                    })
                }

                if( activeRight - right < 5 && activeRight - right > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'right'
                    })        
                }

                if( activeCenterX - centerX < 5 && activeCenterX - centerX > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'centerX'
                    }) 
                }

                if( activeTop - top < 5 && activeTop - top > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'top'
                    }) 
                }

                if( activeBottom - bottom < 5 && activeBottom - bottom > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'bottom'
                    }) 
                }

                if( activeCenterY - centerY < 5 && activeCenterY - centerY > -5 ) {
                    snapLayers.push({
                        layer : i,
                        type : 'centerY'
                    }) 
                }

            }

        }

        return snapLayers

    }

    const onKeyDownHandler = (e) => {

        if( e.keyCode == 39 ) {
            // Right
            if( editingLayer !== null ) {
                var lines = layers[editingLayer].getTextLines()
                if( textSelection.endChar !== lines[textSelection.endLine].length ) {
                    textSelection.startChar = ++textSelection.endChar
                } else if( textSelection.endLine !== lines.length - 1) {
                    textSelection.startLine = ++textSelection.endLine
                    textSelection.startChar = textSelection.endChar = 0
                }
            } else if( activeLayer !== null ) {
                layers[activeLayer].x += 1 / pxRatio
                if( layers[activeLayer].getPxPosition().x + layers[activeLayer].getPxSize().width > getPreviewSize().clipWidth )
                    layers[activeLayer].x = (getPreviewSize().clipWidth - layers[activeLayer].getPxSize().width) / pxRatio
            }
            draw()
        } else if( e.keyCode == 37 ) {
            // Left
            if( editingLayer !== null ) {
                var lines = layers[editingLayer].getTextLines()
                if( textSelection.endChar !== 0 ) {
                    textSelection.startChar = --textSelection.endChar
                } else if( textSelection.endLine !== 0 ) {
                    textSelection.startLine = --textSelection.endLine
                    textSelection.startChar = textSelection.endChar = lines[textSelection.endLine].length
                }
            } else if( activeLayer !== null ) {
                layers[activeLayer].x -= 1 / pxRatio
                if( layers[activeLayer].x < 0 )
                    layers[activeLayer].x = 0
            }

            draw()

        } else if( e.keyCode == 38 ) {
            // Up
            if( editingLayer !== null ) {
                var lines = layers[editingLayer].getTextLines()
                if( textSelection.startLine > 0 ) {
                    textSelection.endLine = --textSelection.startLine
                    if( textSelection.endChar > lines[textSelection.startLine].length )
                        textSelection.startChar = textSelection.endChar = lines[textSelection.startLine].length
                    else 
                        textSelection.startChar = textSelection.endChar
                }
            } else if( activeLayer !== null ) {
                layers[activeLayer].y -= 1 / pxRatio
                if( layers[activeLayer].y < 0 )
                    layers[activeLayer].y = 0
            }
            draw()
        } else if( e.keyCode == 40 ) {
            // Down
            if( editingLayer !== null ) {
                var lines = layers[editingLayer].getTextLines()
                if( textSelection.endLine < lines.length - 1 ) {
                    textSelection.endLine = ++textSelection.startLine
                    if( textSelection.endChar > lines[textSelection.startLine].length )
                        textSelection.startChar = textSelection.endChar = lines[textSelection.startLine].length
                    else 
                        textSelection.startChar = textSelection.endChar
                } 
            } else if( activeLayer !== null ) {
                layers[activeLayer].y += 1 / pxRatio
                if( layers[activeLayer].getPxPosition().y + layers[activeLayer].getPxSize().height > getPreviewSize().height )
                  layers[activeLayer].y = (getPreviewSize().height - layers[activeLayer].getPxSize().height) / pxRatio
            }
            draw()

        } if( e.keyCode == 13 ) {
            // Enter
            if( editingLayer !== null ) {

                var lines = layers[editingLayer].getTextLines()

                if( textSelection.startChar == textSelection.endChar && textSelection.startLine == textSelection.endLine ) {
                    var str = '\n'
                    // Add a hair space on blank lines - not really needed
                    // if( textSelection.startChar == 0 )
                    //    str = String.fromCharCode(8202) + str

                    lines[textSelection.startLine] = lines[textSelection.startLine].slice(0,textSelection.startChar) + str + lines[textSelection.startLine].slice(textSelection.startChar)
                    textSelection.startChar = textSelection.endChar = 0
                    textSelection.startLine++
                    textSelection.endLine++
                }
                
                layers[editingLayer].text = lines.join( "\n" )
                draw()
            }
        } else if( e.keyCode == 8 ) {
            // Backspace
            if( editingLayer !== null ) {
                if( textSelection.startChar == textSelection.endChar && textSelection.startLine == textSelection.endLine ) {
                    var lines = layers[editingLayer].getTextLines()
                    if( textSelection.startChar > 0 ) {
                        // Remove the previous character
                        lines[textSelection.startLine] = lines[textSelection.startLine].slice(0, textSelection.startChar - 1) + lines[textSelection.startLine].slice(textSelection.startChar)
                        textSelection.startChar--
                        textSelection.endChar--
                    } else {
                        // If we're not on the first line, merge with previous line
                        if( textSelection.startLine > 0 ) {
                            var originalLength = lines[textSelection.startLine - 1].length
                            lines[textSelection.startLine - 1] = lines[textSelection.startLine - 1] + lines[textSelection.startLine]
                            lines.splice(textSelection.startLine, 1)
                            textSelection.startLine--
                            textSelection.endLine--
                            textSelection.startChar = textSelection.endChar = originalLength
                        }
                    }
                    layers[editingLayer].text = lines.join( "\n" )
                    draw()
                }  else {
                    deleteMultipleText()
                }
            
            }
        } else if( e.keyCode == 46 ) {
            // Delete
            if( editingLayer !== null ) {
                if( textSelection.startChar == textSelection.endChar && textSelection.startLine == textSelection.endLine ) {
                    var lines = layers[editingLayer].getTextLines()
                    if( textSelection.endChar == lines[textSelection.endLine].length ) {
                        // If we're not on the last line, merge with next line
                        if( textSelection.endLine !== lines.length  - 1) {
                            var originalLength = lines[textSelection.startLine].length
                            lines[textSelection.startLine] = lines[textSelection.startLine] + lines[textSelection.startLine + 1]
                            lines.splice(textSelection.startLine + 1, 1)
                        }
                    } else {
                        lines[textSelection.startLine] = lines[textSelection.startLine].slice(0, textSelection.startChar) + lines[textSelection.startLine].slice(textSelection.startChar + 1)
                    }
                    layers[editingLayer].text = lines.join( "\n" )
                    draw()
                } else {
                    deleteMultipleText()
                }
            } else if( activeLayer !== null ) {
                layers.splice( activeLayer, 1 )
                activeLayer = null
                targetLayer = null
                draw()
            }
        } else if(String.fromCharCode(e.keyCode).match(/(\w|\s)/g)) {
            // Character
            if( editingLayer !== null ) {
                if( textSelection.startChar !== textSelection.endChar || textSelection.startLine !== textSelection.endLine ) {
                    deleteMultipleText()
                }

                var lines = layers[editingLayer].getTextLines()

                lines[textSelection.startLine] = lines[textSelection.startLine].slice(0,textSelection.startChar) + e.key + lines[textSelection.startLine].slice(textSelection.startChar)
                textSelection.startChar++
                textSelection.endChar++
    
                layers[editingLayer].text = lines.join( "\n" )
                draw()
            }
        }
    }

    const onKeyPressHandler = (e) => {
        /*        
        if( editingLayer !== null ) {
            var lines = layers[editingLayer].getTextLines()
            if( textSelection.startChar == textSelection.endChar && textSelection.startLine == textSelection.endLine ) {
                lines[textSelection.startLine] = lines[textSelection.startLine].slice(0,textSelection.startChar) + e.key + lines[textSelection.startLine].slice(textSelection.startChar)
                textSelection.startChar++
                textSelection.endChar++
            }

            layers[editingLayer].text = lines.join( "\n" )
            draw()
        }
        */
    }

    const onDblclickHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect()
        let mouseX = e.clientX - bounds.left
        let mouseY = e.clientY - bounds.top

        if( editingLayer !== null ) {
            textSelection.startChar = 0
            textSelection.endChar = layers[editingLayer].getTextLines()[textSelection.startLine].length
            draw()
        } else if( targetLayer !== null ) {
            editingLayer = targetLayer

            var textSelectionCharacter = getTextSelectionCharacter(mouseX,mouseY)
            textSelection.startLine = textSelectionCharacter.line
            textSelection.startChar = textSelectionCharacter.character
            textSelection.endLine = textSelectionCharacter.line
            textSelection.endChar = textSelectionCharacter.character

            draw()
        }

        setCursor()

    }

    const onMouseDownHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect()
        let mouseX = e.clientX - bounds.left
        let mouseY = e.clientY - bounds.top

        dragging = true

        lastMouseDownLocation = {
            x : mouseX,
            y : mouseY
        }

        if( targetLayer !== null ) {
            activeLayer = targetLayer
            // Save the layer position, we'll need it if we move the layer
            layers[activeLayer].tempX = layers[activeLayer].getPxPosition().x
            layers[activeLayer].tempY = layers[activeLayer].getPxPosition().y
            draw()
        }

        if( editingLayer !== null ) {
            var textSelectionCharacter = getTextSelectionCharacter(mouseX,mouseY)
            textSelection.startLine = textSelectionCharacter.line
            textSelection.startChar = textSelectionCharacter.character
            textSelection.endLine = textSelectionCharacter.line
            textSelection.endChar = textSelectionCharacter.character
            draw()
        }

        if( activeLayer !== targetLayer ) {
            activeLayer = null
            draw()
        }
        
        if( editingLayer !== targetLayer ) {
            editingLayer = null
            draw()
        }

        setCursor()

    }

    const onMouseUpHandler = (e) => {

        let bounds = bgRef.current.getBoundingClientRect()
        let mouseX = e.clientX - bounds.left
        let mouseY = e.clientY - bounds.top

        dragging = false

        lastClickLocation = {
            x : mouseX,
            y : mouseY
        }
        
        // Swap round the text selection if necessary
        if( textSelection.startLine > textSelection.endLine || (textSelection.startLine == textSelection.endLine && textSelection.startChar > textSelection.endChar))
            [textSelection.startLine, textSelection.endLine, textSelection.startChar, textSelection.endChar] = [textSelection.endLine, textSelection.startLine, textSelection.endChar, textSelection.startChar]
        
        // Remove snap layers
        snapLayers = [] 

    }

    const onMouseEnterHandler = (e) => {
        // setHover(true)
    }

    const onMouseLeaveHandler = (e) => {
        // setHover(false)
    } 

    const onMouseMoveHandler = (e) => {

        let offsetX = bgRef.current.width / 2 - getProductSize().width / 2
        let offsetY = bgRef.current.height / 2 - getProductSize().height / 2
        let bounds = bgRef.current.getBoundingClientRect()
        let mouseX = e.clientX - bounds.left
        let mouseY = e.clientY - bounds.top

        let target = false

        for( var i = 0; i < layers.length; i++ ) {  
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x
            var y = offsetY + getPreviewSize().y + layers[i].getPxPosition().y
            if( mouseX > x && mouseY > y && mouseX < x + layers[i].getPxSize().width && mouseY < y + layers[i].getPxSize().height ) {
                target = i
            }
        }

        if( dragging == true && editingLayer !== null ) {
            var textSelectionCharacter = getTextSelectionCharacter(mouseX,mouseY)
            textSelection.endLine = textSelectionCharacter.line
            textSelection.endChar = textSelectionCharacter.character
        
            draw()
        } else if( dragging == true && activeLayer !== null ) {
            var pxMovedX = mouseX - lastMouseDownLocation.x
            var pxMovedY = mouseY - lastMouseDownLocation.y
            var newX = (layers[activeLayer].tempX + pxMovedX)
            var newY = (layers[activeLayer].tempY + pxMovedY)

            /*
            snappingLayerX = null
            snappingLayerY = null
            var snappingX = newX
            var snappingY = newY
            */

            // Check any layers / out of bounds
            if( newX < 0 )
                newX = 0

            if( newY < 0 )
                newY = 0

            if( newX + layers[activeLayer].getPxSize().width > getPreviewSize().clipWidth )
                newX = getPreviewSize().clipWidth - layers[activeLayer].getPxSize().width

            if( newY + layers[activeLayer].getPxSize().height > getPreviewSize().height )
                newY = getPreviewSize().height - layers[activeLayer].getPxSize().height 

            // Check snap alignments 
            checkSnap( newX, newY, layers[activeLayer].getPxSize().width, layers[activeLayer].getPxSize().height)
            
            for( var i = 0; i < snapLayers.length; i++ ) {
                switch( snapLayers[i].type ) {
                    case 'left' :
                        newX = layers[snapLayers[i].layer].getPxPosition().x
                        break
                    case 'right' : 
                        newX = layers[snapLayers[i].layer].getPxPosition().x + layers[snapLayers[i].layer].getPxSize().width - layers[activeLayer].getPxSize().width
                        break
                    case 'centerX' :
                        newX = layers[snapLayers[i].layer].getPxPosition().x + layers[snapLayers[i].layer].getPxSize().width/2 - layers[activeLayer].getPxSize().width/2
                        break
                    case 'top' :
                        newY = layers[snapLayers[i].layer].getPxPosition().y
                        break
                    case 'bottom' :
                        newY = layers[snapLayers[i].layer].getPxPosition().y + layers[snapLayers[i].layer].getPxSize().height - layers[activeLayer].getPxSize().height
                        break
                    case 'centerY' :
                        newY = layers[snapLayers[i].layer].getPxPosition().y + layers[snapLayers[i].layer].getPxSize().height/2 - layers[activeLayer].getPxSize().height/2
                        break
                }
            }

            /*
            // Check for any alignments
            snappingX = newX
            snappingY = newY

            for(var i = 0; i < layers.length; i++ ) {

                if( i !== activeLayer ) {
                    var left = layers[i].getPxPosition().x
                    var right = left + layers[i].getPxSize().width
                    var top = layers[i].getPxPosition().y
                    var bottom = top + layers[i].getPxSize().height
                    //var centerX = (left + right) / 2
                    //var centerY = (top + bottom) / 2
                    if( left - newX  < 10 && left - newX > -10 ) {
                        snappingX = left
                    }
                    
                    if( right - layers[activeLayer].getPxSize().width - newX < 10 && right - layers[activeLayer].getPxSize().width - newX > -10 ) {
                        snappingX = right - layers[activeLayer].getPxSize().width
                    }
                    
                    if( right - newX < 10 && right - newX > -10 ) {
                        snappingX = right
                    }

                    var textLines = layers[i].getTextLines()
                    for( var j = 0; j < textLines.length; j++ ) {
                        var lineTop = top + layers[i].getPxSize().fontSize * j
                        if( lineTop - newY < 10 && lineTop - newY > -10 ) {
                            snappingY = lineTop
                        }
                    }

                    if( bottom - newY < 10 && bottom - newY > -10 ) {
                        snappingY = bottom
                    }

                    if( top - layers[activeLayer].getPxSize().height - newY < 10 && top - layers[activeLayer].getPxSize().height - newY > -10 ) {
                        console.log('bottom')
                        snappingY = top - layers[activeLayer].getPxSize().height
                    }

                    if( snappingX !== newX ) {
                        snappingLayerX = i
                    }

                    if( snappingY !== newY ) {
                        snappingLayerY = i
                    }

                }
            }

            if( snappingLayerX )
                newX = snappingX
            
            if( snappingLayerY )
                newY = snappingY
            
            */

            // Set the x & y (in mm)
            layers[activeLayer].x = newX  / pxRatio
            layers[activeLayer].y = newY / pxRatio


            draw()
        }

        if( target !== false ) {
            targetLayer = target
            draw()
        } else {
            targetLayer = null
            draw()
        }

        setCursor()

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

    }

    const draw = () => {

        const ctx = bgRef.current.getContext('2d')
        ctx.globalCompositeOperation = 'source-over'

        ctx.clearRect(0,0, bgRef.current.width, bgRef.current.height )
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, bgRef.current.width, bgRef.current.height )

        var offsetX = bgRef.current.width / 2 - getProductSize().width / 2
        var offsetY = bgRef.current.height / 2 - getProductSize().height / 2

        ctx.drawImage(bgImg, offsetX, offsetY, getProductSize().width, getProductSize().height)

        ctx.save()
        ctx.beginPath()
        ctx.rect(offsetX + getPreviewSize().x, offsetY + getPreviewSize().y, getPreviewSize().clipWidth, getPreviewSize().height)
        ctx.clip();
        ctx.closePath();

        ctx.fillStyle = '#efefef'
        ctx.fillRect(offsetX - rotateOffset + getPreviewSize().x, offsetY + getPreviewSize().y, getPreviewSize().width, getPreviewSize().height)

        // If end char is before start char, swap them over
        var startLine = textSelection.startLine
        var startChar = textSelection.startChar
        var endLine = textSelection.endLine
        var endChar = textSelection.endChar
        if( startLine > endLine || (startLine == endLine && startChar > endChar))
            [startLine, endLine, startChar, endChar] = [endLine, startLine, endChar, startChar]
        
        // Draw text layers v2
        for( var i = 0; i < layers.length; i++ ) {
            if( layers[i].text ) {
                ctx.font = layers[i].fontStyle + ' ' + layers[i].fontVariant + ' ' + layers[i].fontWeight + ' ' + layers[i].getPxSize().fontSize + 'px ' + layers[i].font
                ctx.textBaseline = 'top'
                //ctx.textAlign = layers[i].align
                var lines = layers[i].getTextLines()
                for( var j = 0; j < lines.length; j++) {
                    var alignOffsetX = 0

                    if( layers[i].align == 'center' ) {
                        var textWidth = ctx.measureText(lines[j]).width
                        alignOffsetX = layers[i].getPxSize().width / 2 - textWidth / 2
                    }

                    ctx.fillStyle = '#000'
                    var textX = Math.round(offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x + alignOffsetX)
                    var textY = Math.round(offsetY + getPreviewSize().y + layers[i].getPxPosition().y + layers[i].getPxSize().fontSize * j)
                    ctx.fillText(lines[j], textX, textY)
                }
            }
        }

        // Draw text layers v1
        /*
        for( var i = 0; i < layers.length; i++ ) {
            if( layers[i].text ) {
                ctx.font = layers[i].getPxSize().fontSize + 'px sans-serif'
                ctx.textBaseline = 'top'
                var lines = layers[i].getTextLines()
                for( var j = 0; j < lines.length; j++) {
                    ctx.fillStyle = '#000000'

                    // Todo: printing characters individually messes up the kerning
                    // ctx.fillText('Test', Math.round(offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x), Math.round(offsetY + getPreviewSize().y + layers[i].getPxPosition().y + layers[i].getPxSize().fontSize * j))

                    // Print each letter separately so we can control the colour
                    var characters = lines[j].split('')
                    var textWidth = 0
                    for( var l = 0; l < characters.length; l++ ) {
                        ctx.fillStyle = '#000000'
                        var characterWidth = ctx.measureText( characters[l] ).width
                        var characterSelected = false

                        if( editingLayer == i ) {
                            if( startLine < j ) {
                                if( endLine > j )
                                    characterSelected = true
                                else if( endLine == j && endChar > l )
                                    characterSelected = true
                            } else if( startLine == j ) {
                                if( endLine > j && startChar <= l )
                                    characterSelected = true
                                else if( endLine == j && startChar <= l && endChar  > l )
                                    characterSelected = true
                            }
                        }

                        var x = Math.round(offsetX - rotateOffset + getPreviewSize().x + layers[i].getPxPosition().x + textWidth)
                        var y = Math.round(offsetY + getPreviewSize().y + layers[i].getPxPosition().y + layers[i].getPxSize().fontSize * j)

                        if( characterSelected == true ) {
                            ctx.fillStyle = '#6495ED'
                            ctx.fillRect( x, y, characterWidth + 1, layers[i].getPxSize().fontSize + 1 )
                            ctx.fillStyle = '#ffffff'    
                        }
                        
                        ctx.fillText(characters[l], x, y)
                        
                        textWidth += characterWidth

                    }
                }

            }
        }
        */

        ctx.restore()

        ctx.globalCompositeOperation = 'difference'

        // If we have a target, draw a box around it
        if( targetLayer !== null ) {
            var boxMargin = 0
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[targetLayer].getPxPosition().x - boxMargin
            var y = offsetY + getPreviewSize().y + layers[targetLayer].getPxPosition().y - boxMargin
            var width = layers[targetLayer].getPxSize().width + boxMargin * 2
            var height = layers[targetLayer].getPxSize().height + boxMargin * 2
            ctx.setLineDash([5, 3])
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'
            ctx.strokeRect(x, y, width, height)
        }

        // Same goes for active layers
        if( activeLayer !== null ) {
            var boxMargin = 0
            var x = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x - boxMargin
            var y = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y - boxMargin
            var width = layers[activeLayer].getPxSize().width + boxMargin * 2
            var height = layers[activeLayer].getPxSize().height + boxMargin * 2
            ctx.strokeStyle = 'rgba(255,255,255,1)'
            ctx.strokeRect(x, y, width, height)
        }

        // Draw snap line guides
        for( var i = 0; i < snapLayers.length; i++ ) {
            var x1, y1, x2, y2

            switch( snapLayers[i].type ) {
                case 'left' :
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y
                    break
                case 'right' :
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x + layers[activeLayer].getPxSize().width
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x + layers[snapLayers[i].layer].getPxSize().width
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y
                    break
                case 'centerX' : 
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x + layers[activeLayer].getPxSize().width/2
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x + layers[snapLayers[i].layer].getPxSize().width/2
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y
                    break
                case 'top' : 
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y
                    break
                case 'bottom' :
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y + layers[activeLayer].getPxSize().height
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y + layers[snapLayers[i].layer].getPxSize().height
                    break
                case 'centerY' :
                    x1 = offsetX - rotateOffset + getPreviewSize().x + layers[activeLayer].getPxPosition().x
                    y1 = offsetY + getPreviewSize().y + layers[activeLayer].getPxPosition().y + layers[activeLayer].getPxSize().height / 2
                    x2 = offsetX - rotateOffset + getPreviewSize().x + layers[snapLayers[i].layer].getPxPosition().x
                    y2 = offsetY + getPreviewSize().y + layers[snapLayers[i].layer].getPxPosition().y + layers[snapLayers[i].layer].getPxSize().height / 2
                    break
            }

            if( x1 == x2 || y1 == y2 ) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255,255,0,0.3)'
                ctx.moveTo(x1, y1)
                ctx.lineTo(x2, y2)
                ctx.stroke()
            }
        }
        
        if( editingLayer !== null ) {

            var lines = layers[editingLayer].getTextLines()

            ctx.font = layers[editingLayer].fontStyle + ' ' + layers[editingLayer].fontVariant + ' ' + layers[editingLayer].fontWeight + ' ' + layers[editingLayer].getPxSize().fontSize + 'px ' + layers[editingLayer].font
            //ctx.textBaseline = 'top'
            //ctx.textAlign = layers[editingLayer].align
            
            // v1
            /*
            var chars = lines[textSelection.startLine].slice(0,textSelection.startChar).split('')
            ctx.font = layers[editingLayer].getPxSize().fontSize + 'px sans-serif'
            var textWidth = 0
            for( var i = 0; i < chars.length; i++ ) {
                textWidth += ctx.measureText( chars[i] ).width
            } 
            */

            // v2
            // Get the line width, and remove redunant width
            // Just measuring the text up to the start point sometimes misses out kerning
            var lineWidth = ctx.measureText(lines[textSelection.startLine]).width
            var redudantWidth = ctx.measureText(lines[textSelection.startLine].slice(textSelection.startChar)).width
            var textWidth = lineWidth - redudantWidth
            var alignOffsetX = 0

            if( layers[editingLayer].align == 'center' )
                alignOffsetX = layers[editingLayer].getPxSize().width / 2 - lineWidth / 2

            // Draw cursor at starting character
            var cursorX = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + textWidth + alignOffsetX
            var cursorY = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * textSelection.startLine
            ctx.fillStyle = 'rgba(255,255,255,0.8)'
            ctx.fillRect(Math.round(cursorX), Math.round(cursorY), 1, layers[editingLayer].getPxSize().fontSize)
            
            // If the selection start is after the end, swap them round
            var selectStartLine = textSelection.startLine
            var selectStartChar = textSelection.startChar
            var selectEndLine = textSelection.endLine
            var selectEndChar = textSelection.endChar

            if( selectStartLine > selectEndLine || (selectStartLine == selectEndLine && selectStartChar > selectEndChar))
                [selectStartLine, selectEndLine, selectStartChar, selectEndChar] = [selectEndLine, selectStartLine, selectEndChar, selectStartChar]


            // If we have multiple characters selected, highlight the text
            for(var i = selectStartLine; i <= selectEndLine; i++) {

                // Get the start position
                var startChar = 0;
                var endChar = lines[i].length
                if( i == selectStartLine )
                    startChar = selectStartChar
                if( i == selectEndLine )
                    endChar = selectEndChar

                // If its the first line, get the start point
                var lineWidth = ctx.measureText(lines[i]).width
                var startOffset = 0
                if(i == selectStartLine ) {
                    var redudantWidth = ctx.measureText(lines[i].slice(selectStartChar)).width
                    startOffset = lineWidth - redudantWidth
                }

                // Get offset if text isn't aligned left
                var alignOffsetX = 0
                if( layers[editingLayer].align == 'center' )
                    alignOffsetX = layers[editingLayer].getPxSize().width / 2 - lineWidth / 2

                //var startTextWidth = ctx.measureText(lines[textSelection.startLine].slice(0,startChar) ).width
                var fullTextWidth = ctx.measureText(lines[i].slice(startChar,endChar) ).width
                var startX = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + startOffset + alignOffsetX
                var startY = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * i
                
                ctx.globalCompositeOperation = 'screen'
                ctx.fillStyle = '#6495ED'
                // ctx.fillStyle = '#ffffff'
                ctx.fillRect(startX, startY, fullTextWidth, layers[editingLayer].getPxSize().fontSize)
            }        

        }


        /*
        if( editingLayer !== null ) {

            var lines = layers[editingLayer].getTextLines()
            var chars = lines[textSelection.startLine].slice(0,textSelection.startChar).split('')
            ctx.font = layers[editingLayer].getPxSize().fontSize + 'px sans-serif'
            var textWidth = 0
            for( var i = 0; i < chars.length; i++ ) {
                textWidth += ctx.measureText( chars[i] ).width
            } 

            // Draw cursor at starting character
            var cursorX = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + textWidth
            var cursorY = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * textSelection.startLine
            ctx.fillStyle = 'rgba(0,0,0,0.8)'
            ctx.fillRect(Math.round(cursorX), Math.round(cursorY), 1, layers[editingLayer].getPxSize().fontSize)
        }
        */

        // Show text selection
        /*
        if( editingLayer !== null ) {

            var lines = layers[editingLayer].getTextLines()
            var textWidth = ctx.measureText(lines[textSelection.startLine].slice(0,textSelection.startChar) ).width

            // Draw cursor at starting character
            var cursorX = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + textWidth
            var cursorY = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * textSelection.startLine
            ctx.fillRect(cursorX, cursorY, 2, layers[editingLayer].getPxSize().fontSize)

            // If we have multiple characters selected, draw a box underneath
            for(var i = textSelection.startLine; i <= textSelection.endLine; i++) {
                // Get the start position
                var startChar = 0;
                var endChar = lines[i].length
                if( i == textSelection.startLine )
                    startChar = textSelection.startChar
                if( i == textSelection.endLine )
                    endChar = textSelection.endChar

                var startTextWidth = ctx.measureText(lines[textSelection.startLine].slice(0,startChar) ).width
                var fullTextWidth = ctx.measureText(lines[i].slice(startChar,endChar) ).width
                var startX = offsetX - rotateOffset + getPreviewSize().x + layers[editingLayer].getPxPosition().x + startTextWidth
                var startY = offsetY + getPreviewSize().y + layers[editingLayer].getPxPosition().y + layers[editingLayer].getPxSize().fontSize * i
                
                ctx.fillStyle = '#6495ED'
                ctx.fillRect(startX, startY, fullTextWidth, layers[editingLayer].getPxSize().fontSize)
            }
        }
        */

        ctx.save()

        ctx.beginPath()
        ctx.rect(offsetX + getPreviewSize().x, offsetY + getPreviewSize().y, getPreviewSize().clipWidth, getPreviewSize().height)
        ctx.clip();
        ctx.closePath();

        ctx.restore()

    }

    useEffect(() => {

       draw()

        // Observe resize to scale accordingly
        new ResizeObserver( () => {
            resizeEditor()
            draw()
        }).observe(document.getElementById('preview'))

        // Add mouse event handlers
        bgRef.current.addEventListener( "mousemove", onMouseMoveHandler )
        bgRef.current.addEventListener( "mouseenter", onMouseEnterHandler )
        bgRef.current.addEventListener( "mouseleave", onMouseLeaveHandler )
        bgRef.current.addEventListener( "mouseup", onMouseUpHandler )
        bgRef.current.addEventListener( "mousedown", onMouseDownHandler )
        window.addEventListener( "keypress", onKeyPressHandler );
        window.addEventListener( "keydown", onKeyDownHandler );
        bgRef.current.addEventListener( "dblclick", onDblclickHandler );

        return () => {
            bgRef.current.removeEventListener( "mousemove", onMouseMoveHandler )
            bgRef.current.removeEventListener( "mouseenter", onMouseEnterHandler )
            bgRef.current.removeEventListener( "mouseleave", onMouseLeaveHandler )
            bgRef.current.removeEventListener( "mouseup", onMouseUpHandler )
            bgRef.current.removeEventListener( "mousedown", onMouseDownHandler )
            window.removeEventListener( "keypress", onKeyPressHandler )
            window.removeEventListener( "keydown", onKeyDownHandler )
            bgRef.current.removeEventListener( "dblclick", onDblclickHandler )
        }

    }, [])

    return <div className="editor-container" id="editor-container"><canvas id="background" className="background" ref={bgRef} />{/*<canvas id="editor" className="editor" ref={editorRef} />*/}</div>

}

export default Editor