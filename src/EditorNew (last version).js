import React, { useState, useRef, useEffect } from 'react'
const ProductImageFrames = require.context('./img/animation', true);

// Mouse locations
let lastDblclickLocation = {
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

let lastMouseMoveLocation = {
    x : 0,
    y : 0
}

let scrollOffsetX = 0;

class HitBox {
    constructor(options  = {}) {
        this.x = options.x ? options.x : 0;
        this.y = options.y ? options.y : 0;
        this.width = options.width ? options.width : 0;
        this.height = options.height ? options.height : 0;
        this.scaleX = 1;
        this.scaleY = 1;
    }

    containsPoint = (x,y) => {
        // Check if point is within the hit box
        if( x > this.x && x < this.x + this.width * this.scaleX && y > this.y && y < this.y + this.height * this.scaleY )
            return true;
        else
            return false;
    }

    containsAreaFully = (x,y,w,h) => {
        // Check if an area is fully within the hit box
        if( x > this.x && x + w < this.x + this.width * this.scaleX && y > this.y && y + h < this.y + this.height * this.scaleY )
            return true;
        else
            return false;
    }

    containsAreaPartially = (x,y,width,height) => {
        // Check if an area is partially within the hit box
        if( 
            (
                ((this.x >= x && this.x <= x + width) || (this.x + this.width * this.scaleX >= x && this.x + this.width * this.scaleX <= x + width) || (x > this.x && x + width <= this.x + this.width * this.scaleX))
                && 
                ((this.y >= y && this.y <= y + height) || (this.y + this.height * this.scaleY >= y && this.y + this.height * this.scaleY <= y + height) || (y > this.y && y + height <= this.y + this.height * this.scaleY))
            )
        ) {
            return true;
        } else {
            return false;
        }
    }
}

class SelectionBox extends HitBox {
    constructor(options = {}) {
        super(options);
        this.ctx = options.ctx ? options.ctx : null;
        this.color = options.color ? options.color : 'orange';
        this.dragging = false;
    }

    clearSelectionBox = () => {
        // Clear the bounding box and any contained layers
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.containedLayers = [];      
    }

    startDrag = (x,y) => {
        this.clearSelectionBox();
        this.x = x;
        this.y = y;
        this.dragging = true;
    }

    stopDrag = () => {
        this.clearSelectionBox();
        this.dragging = false;
    }

    mouseMove = (x,y) => {
        if( this.dragging ) {
            this.x = (lastMouseDownLocation.x > x ) ? x : lastMouseDownLocation.x;
            this.y = (lastMouseDownLocation.y > y ) ? y : lastMouseDownLocation.y;
            this.width = (lastMouseDownLocation.x > x ) ? lastMouseDownLocation.x - x : x - lastMouseDownLocation.x;
            this.height = (lastMouseDownLocation.y > y ) ? lastMouseDownLocation.y - y : y - lastMouseDownLocation.y;
        }
    }

    draw = () => {
        if( this.dragging ) {
            this.ctx.strokeStyle = this.color;
            this.ctx.strokeRect(this.x, this.y, this.width, this.height);
            this.ctx.globalAlpha = 0.2;
            this.ctx.fillStyle = this.color;
            this.ctx.fillRect(this.x, this.y, this.width, this.height);
            this.ctx.globalAlpha = 1;
        }
    }

}

class BoundingBox extends HitBox {
    constructor(options = {}) {
        super(options);
        this.ctx = options.ctx ? options.ctx : null;
        this.relativeX = 0;
        this.relativeY = 0;
        this.nodeSize = 6;
        this.visible = false;
        this.nodes = {
            topLeft : new HitBox,
            topCenter : new HitBox,
            topRight : new HitBox,
            centerLeft : new HitBox,
            centerRight : new HitBox,
            bottomLeft : new HitBox,
            bottomCenter : new HitBox,
            bottomRight : new HitBox
        };
        this.containedLayers = [];
        
        for(let key in this.nodes) {
            this.nodes[key].width = this.nodeSize;
            this.nodes[key].height = this.nodeSize;
        }
    }

    calculateSizeAndPosition = () => {
        if( this.containedLayers.length > 0 ) {
            // Get bounding box of contained layers
            if( this.containedLayers.length > 1 ) {
                // There's multiple layers, so we need to compare them to find the bounding box
                this.x = this.relativeX = this.y = this.relativeY = Number.POSITIVE_INFINITY;
                var bottom = 0;
                var right = 0;
                
                for( var i = 0; i < this.containedLayers.length; i++ ) {
                    var layer = this.containedLayers[i];
                    if(layer.x < this.x) {
                        this.relativeX = layer.relativeX;
                        this.x = layer.x;
                    }

                    if(layer.y < this.y) {
                        this.relativeY = layer.relativeY;
                        this.y = layer.y;
                    }

                    if(layer.x + (layer.width * layer.scaleX) > right)
                        right = layer.x + layer.width * layer.scaleX;

                    if(layer.y + layer.height * layer.scaleY > bottom)
                        bottom = layer.y + layer.height * layer.scaleY;
                }

                this.width = right - this.x;
                this.height = bottom - this.y;
                
            } else {
                // There's only one layer so get the dimensions directly
                var layer = this.containedLayers[0];

                // Todo: work on rotation selection box
                /*
                var theta = layer.rotation * Math.PI / 180;
                var topLeft = [layer.x, layer.y];
                var topRight = [layer.x + layer.width * layer.scaleX, layer.y];
                var bottomLeft = [layer.x, layer.y + layer.height * layer.scaleY];
                var bottomRight = [layer.x + layer.width * layer.scaleX, layer.y + layer.height * layer.scaleY];
                var origin = [layer.x + layer.width * layer.scaleX / 2, layer.y + layer.height * layer.scaleY / 2];

                var newTopLeft = rotatePoint(topLeft, origin, theta);
                var newTopRight = rotatePoint(topRight, origin, theta);
                var newBottomLeft = rotatePoint(bottomLeft, origin, theta);
                var newBottomRight = rotatePoint(bottomRight, origin, theta);

                ctx.beginPath();
                ctx.moveTo(newTopLeft[0], newTopLeft[1]);
                ctx.lineTo(newTopRight[0], newTopRight[1]);
                ctx.lineTo(newBottomRight[0], newBottomRight[1]);
                ctx.lineTo(newBottomLeft[0], newBottomLeft[1]);
                ctx.lineTo(newTopLeft[0], newTopLeft[1]);
                ctx.stroke();
                */

                this.x = layer.x;
                this.y = layer.y;
                this.relativeX = layer.relativeX;
                this.relativeY = layer.relativeY;
                this.width = layer.width * layer.scaleX;
                this.height = layer.height * layer.scaleY;

            }

            this.calculateNodePositions();
        } else {
            this.x = 0;
            this.y = 0;
            this.relativeX = 0;
            this.relativeY = 0;
            this.width = 0;
            this.height = 0;

            this.calculateNodePositions();
        }
    }

    calculateNodePositions = () => {
        this.nodes.topLeft.x = this.nodes.centerLeft.x = this.nodes.bottomLeft.x = this.x - this.nodeSize/2;
        this.nodes.topRight.x = this.nodes.centerRight.x = this.nodes.bottomRight.x = this.x + this.width - this.nodeSize/2;
        this.nodes.topCenter.x = this.nodes.bottomCenter.x = this.x + this.width/2 - this.nodeSize/2;
        this.nodes.topLeft.y = this.nodes.topCenter.y = this.nodes.topRight.y = this.y - this.nodeSize/2;
        this.nodes.bottomRight.y = this.nodes.bottomCenter.y = this.nodes.bottomLeft.y = this.y + this.height - this.nodeSize/2;
        this.nodes.centerLeft.y = this.nodes.centerRight.y = this.y + this.height/2 - this.nodeSize/2;
    }

    nodeHitTest = (x,y) => {
        for(let key in this.nodes) {
            if( this.nodes[key].containsPoint(x,y))
                return key;
        }

        return false;
    }

    clearLayers = () => {
        // Clear any contained layers
        this.containedLayers = [];    
        this.calculateSizeAndPosition();  
    }

    selectLayers = (layers) => {
        this.containedLayers = layers;
        this.calculateSizeAndPosition();
    }

    setConstraints = (x,y,w,h) => {
        this.constraintLeft = x;
        this.constraintTop = y;
        this.constraintRight = x + w;
        this.constraintBottom = y + h;
    }

    mouseDown = (x,y) => {

    }

    mouseUp = (x,y) => {
        
    }

    mouseMove = (mouseX,mouseY) => {
        
        // If we're dragging, move the bounding box & any contained layers
        if( this.dragging ) {
            // Get new positions
            var amountMovedX = mouseX - lastMouseMoveLocation.x;
            var amountMovedY = mouseY - lastMouseMoveLocation.y;
            var newX = this.x + amountMovedX;
            var newY = this.y + amountMovedY;

             // Check if any layers are out of bounds
             // This might seem overkill, but we want people to be able
             // to click and drag across the clone & actual preview area
             // so we can't just constrain the bounding box.
            for( var i = 0; i < this.containedLayers.length; i++ ) {
                var layer = this.containedLayers[i];

                if( layer.relativeX + amountMovedX < 0 ) {
                    newX = layer.offsetX - layer.x + this.x;
                    if( layer.offsetX < this.x + amountMovedX )
                        newX += layer.clipWidth;
                }

                if( layer.relativeY + amountMovedY < 0 )
                    newY = layer.offsetY;

                if( layer.relativeX + layer.width * layer.scaleX + amountMovedX > layer.maxRelativeX )
                    newX = layer.maxRelativeX - layer.width * layer.scaleX + layer.offsetX - layer.x + this.x;

                if( layer.relativeY + layer.height * layer.scaleY + amountMovedY > layer.maxRelativeY )
                    newY = layer.maxRelativeY - layer.height * layer.scaleY + layer.offsetY - layer.y + this.y;
            }

            // Move the layers
            for( var i = 0; i < this.containedLayers.length; i++ ) {
                var layer = this.containedLayers[i];
                var newLayerRelativeX = layer.relativeX + (newX - this.x);
                var newLayerRelativeY = layer.relativeY + (newY - this.y);
                layer.setRelativePosition( newLayerRelativeX, newLayerRelativeY );
            }

            this.x = newX;
            this.y = newY;

            this.calculateNodePositions();
            
        }


        // If we're resizing, resize the bounding box & any contained layers
        if( this.resizing !== false ) {
            var amountMovedX = mouseX - lastMouseMoveLocation.x;
            var amountMovedY = mouseY - lastMouseMoveLocation.y;
            var newX = this.x;
            var newY = this.y;
            var newWidth = this.width;
            var newHeight = this.height;
                        
            if( this.resizing == 'topLeft' || this.resizing == 'centerLeft' || this.resizing == 'bottomLeft' ) {
                newX = this.x + amountMovedX;
                newWidth = this.width - amountMovedX;         
            }

            if( this.resizing == 'topRight' || this.resizing == 'centerRight' || this.resizing == 'bottomRight' ) {
                newWidth = this.width + amountMovedX;
            }

            if( this.resizing == 'bottomLeft' || this.resizing == 'bottomRight' || this.resizing == 'topLeft' || this.resizing == 'topRight' ) {
                newHeight = this.height * (newWidth / this.width);
            }

            if( this.resizing == 'topLeft' || this.resizing == 'topRight' ) {
                newY = this.y + this.height - newHeight;  
            }

            if( this.resizing == 'topCenter' ) {
                newY = this.y + amountMovedY;
                newHeight = this.height - amountMovedY;
            }

            if( this.resizing == 'bottomCenter' ) {
                newHeight = this.height + amountMovedY;
            }

            // Check the layers to make sure none are going out of bounds
            for( var i = 0; i < this.containedLayers.length; i++ ) {
                var layer = this.containedLayers[i];

                if( layer.relativeX + newX - this.x < 0 ) {
                    newX = layer.offsetX - layer.x + this.x;
                    if( layer.offsetX < this.x + amountMovedX )
                        newX += layer.clipWidth;

                    newWidth = this.width + this.x - newX;
                    newHeight = this.height * (newWidth / this.width);
                    newY = this.y + this.height - newHeight;
                }

                if( layer.relativeY + newY - this.y < 0 ) {
                    newY = layer.offsetY;
                    newHeight = this.height + this.y - newY;
                    newWidth = this.width * (newHeight / this.height);
                    newX = this.x + this.width - newWidth;
                }
            }

            var scaleX = newWidth / this.width;
            var scaleY = newHeight / this.height;

            // Resize the layers
            for( var i = 0; i < this.containedLayers.length; i++ ) {
                var layer = this.containedLayers[i];                

                // Scale up the px & mm positions
                layer.scaleX = layer.scaleX * scaleX;         
                layer.scaleY = layer.scaleY * scaleY;

                // Find the difference needed to keep the position relative to the bounding box
                var diffX = (newX + (layer.x - this.x) * scaleX) - layer.x;
                var diffY = (newY + (layer.y - this.y) * scaleY) - layer.y;

                //layer.setRelativePosition( layer.relativeX + (newX - this.x), layer.relativeY + (newY - this.y) );
                layer.setRelativePosition( layer.relativeX + diffX, layer.relativeY + diffY );

                if( layer instanceof TextLayer ) {
                    // Update text height and stretch values
                    let letterHeight = document.getElementById('letter-height');
                    letterHeight.value = Math.round( layer.fontSize_mm * layer.scaleY * 100) / 100;
                    let letterStretch = document.getElementById('letter-stretch');
                    letterStretch.value = Math.round( layer.scaleX / layer.scaleY * 100) / 100;                
                }
            }

            this.calculateSizeAndPosition();
            this.calculateNodePositions();

            /*
            newBoundingBoxX = labelArea.x + newBoundingBoxRelativeX;
            newBoundingBoxY = labelArea.y + newBoundingBoxRelativeY;
            
            if( newBoundingBoxX + newBoundingBoxWidth < previewArea.x )
                newBoundingBoxX += maxScroll;

            var scaleX = newBoundingBoxWidth / boundingBox.width;
            var scaleY = newBoundingBoxHeight / boundingBox.height;

            // Todo: Lock proportions
            // Todo: (hold down shift, make sure proportions are maintained in the right direction)

            // Resize layers
            let selectedLayers = getSelectedLayers();
            for( var i = 0; i < selectedLayers.length; i++ ) {
                var layer = layers[selectedLayers[i]];                

                // Scale up the px & mm positions
                layer.scaleX = layer.scaleX * scaleX;         
                layer.scaleY = layer.scaleY * scaleY;
                var diffX = (newBoundingBoxX + (layer.x - boundingBox.x) * scaleX) - layer.x;
                var diffY = (newBoundingBoxY + (layer.y - boundingBox.y) * scaleY) - layer.y;
                layer.x_mm += diffX / productImagePxRatio;
                layer.y_mm += diffY / productImagePxRatio;

                if( layer instanceof TextLayer ) {
                    // Update height values
                    let letterHeight = document.getElementById('letter-height');
                    letterHeight.value = Math.round( layer.fontSize_mm * layer.scaleY * 100) / 100;
                    let letterStretch = document.getElementById('letter-stretch');
                    letterStretch.value = Math.round( layer.scaleX / layer.scaleY * 100) / 100;                
                }

            }

            boundingBox.x = newBoundingBoxX;
            boundingBox.y = newBoundingBoxY;
            boundingBox.width = newBoundingBoxWidth;
            boundingBox.height = newBoundingBoxHeight;
            boundingBox.calculateNodePositions();
            */

            /*
            if( resizing ) {

                var newBoundingBoxX = boundingBox.x;
                var newBoundingBoxY = boundingBox.y;
                var newBoundingBoxRelativeX = boundingBox.relativeX;
                var newBoundingBoxRelativeY = boundingBox.relativeY;
                var newBoundingBoxWidth = boundingBox.width;
                var newBoundingBoxHeight = boundingBox.height;
    
                switch(resizing) {
                    case 'topLeft' :
                        // Free transform:
                        // newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                        // newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;
    
                        // if( newBoundingBoxRelativeX < 0 )
                        //    newBoundingBoxRelativeX = 0;
                        //else
                        //    newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;
    
                        //if( newBoundingBoxRelativeY < 0 )
                        //    newBoundingBoxRelativeY = 0;
                        //else
                        //    newBoundingBoxHeight = boundingBox.height - mouseY + lastMouseMoveLocation.y;
    
                        // Proportional transform:
                        newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                        if( newBoundingBoxRelativeX < 0)
                            newBoundingBoxRelativeX = 0;
                        else
                            newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;
    
                        newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                        newBoundingBoxRelativeY = boundingBox.relativeY + boundingBox.height - newBoundingBoxHeight;
    
                        if( newBoundingBoxRelativeY < 0 ) {
                            // This is probably all a bit overkill but oh well
                            // Todo: figure out a better way to do this
                            newBoundingBoxRelativeY = 0;
                            var diffY = boundingBox.relativeY - newBoundingBoxRelativeY;
                            newBoundingBoxHeight = boundingBox.height + diffY;
                            newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                            newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                        }
    
                    break;
                    case 'topCenter' : 
                        newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;
    
                        if( newBoundingBoxRelativeY < 0 ) 
                            newBoundingBoxRelativeY = 0;
    
                        newBoundingBoxHeight = boundingBox.height - newBoundingBoxRelativeY + boundingBox.relativeY;
                        break;
                    case 'topRight' :
                        // Free transform:
                        // newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;
                        // newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
    
                        // if( newBoundingBoxRelativeY < 0 )
                        //     newBoundingBoxRelativeY = 0;
                        // else
                        //     newBoundingBoxHeight = boundingBox.height - mouseY + lastMouseMoveLocation.y;
                        // 
                        // if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                        //     newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
    
                        // Proportional transform:
                        newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                        if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width ) {
                            newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
                        }
    
                        newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                        newBoundingBoxRelativeY = boundingBox.relativeY + boundingBox.height - newBoundingBoxHeight;
    
                        if( newBoundingBoxRelativeY < 0 ) {
                            newBoundingBoxRelativeY = 0;
    
                            var diffY = boundingBox.relativeY - newBoundingBoxRelativeY;
                            newBoundingBoxHeight = boundingBox.height + diffY;
    
                            newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                            newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                        }
    
                        break;
                    case 'centerLeft' :
                        newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
    
                        if( newBoundingBoxRelativeX < 0 )
                            newBoundingBoxRelativeX = 0;
                        
                        newBoundingBoxWidth = boundingBox.width - newBoundingBoxRelativeX + boundingBox.relativeX;
    
                        break;
                    case 'centerRight' : 
                        newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
    
                        if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                            newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
                            
                        break;
                    case 'bottomLeft' :
                        // Free transform:
                        // newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                        // newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;
    
                        // if( newBoundingBoxRelativeX < 0 )
                        //     newBoundingBoxRelativeX = 0;
                        // else
                        //     newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;
    
                        // if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                        //     newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
    
                        // Proportional transform:
                        newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                        if( newBoundingBoxRelativeX < 0 )
                            newBoundingBoxRelativeX = 0;
                        else
                            newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;
    
                        newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
    
                        if( newBoundingBoxRelativeY + newBoundingBoxHeight > labelArea.height ) {
                            newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
                            newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                            newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                        }
    
                        break;
                    case 'bottomCenter' :
                        newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;
    
                        if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                            newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
    
                        break;
                    case 'bottomRight' : 
                        // Free transform:
                        // newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                        // newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;
    
                        // if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                        //     newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
    
                        // if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                        //     newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
    
                        // Proportional transform:
                        newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                        if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                            newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
    
                        newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                        if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height ) {
                            newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
                            newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                        }
    
                        break;
                }
    
                // Stop flipping
                if( newBoundingBoxWidth < 1 ) {
                    newBoundingBoxWidth = 1;
                    newBoundingBoxRelativeX = boundingBox.relativeX;
                }
    
                if( newBoundingBoxHeight < 1 ) {
                    newBoundingBoxHeight = 1;
                    newBoundingBoxRelativeY = boundingBox.relativeY;
                }
    
                newBoundingBoxX = labelArea.x + newBoundingBoxRelativeX;
                newBoundingBoxY = labelArea.y + newBoundingBoxRelativeY;
                
                if( newBoundingBoxX + newBoundingBoxWidth < previewArea.x )
                    newBoundingBoxX += maxScroll;
    
                var scaleX = newBoundingBoxWidth / boundingBox.width;
                var scaleY = newBoundingBoxHeight / boundingBox.height;
    
                // Todo: Lock proportions
                // Todo: (hold down shift, make sure proportions are maintained in the right direction)
    
                // Resize layers
                let selectedLayers = getSelectedLayers();
                for( var i = 0; i < selectedLayers.length; i++ ) {
                    var layer = layers[selectedLayers[i]];                
    
                    // Scale up the px & mm positions
                    layer.scaleX = layer.scaleX * scaleX;         
                    layer.scaleY = layer.scaleY * scaleY;
                    var diffX = (newBoundingBoxX + (layer.x - boundingBox.x) * scaleX) - layer.x;
                    var diffY = (newBoundingBoxY + (layer.y - boundingBox.y) * scaleY) - layer.y;
                    layer.x_mm += diffX / productImagePxRatio;
                    layer.y_mm += diffY / productImagePxRatio;
    
                    if( layer instanceof TextLayer ) {
                        // Update height values
                        let letterHeight = document.getElementById('letter-height');
                        letterHeight.value = Math.round( layer.fontSize_mm * layer.scaleY * 100) / 100;
                        let letterStretch = document.getElementById('letter-stretch');
                        letterStretch.value = Math.round( layer.scaleX / layer.scaleY * 100) / 100;                
                    }
    
                }
    
                boundingBox.x = newBoundingBoxX;
                boundingBox.y = newBoundingBoxY;
                boundingBox.width = newBoundingBoxWidth;
                boundingBox.height = newBoundingBoxHeight;
                boundingBox.calculateNodePositions();
            } 
            */
        }
    }

    startDrag = () => {
        this.dragging = true;
    }

    stopDrag = () => {
        console.log( 'stop drag' );
        this.dragging = false;
    }

    startResize = (x,y) => {
        this.resizing = this.nodeHitTest(x,y);
    }

    stopResize = () => {
        this.resizing = false;
    }

    drawAtPoint = (x, y) => {

        // Only draw if there are contained layers
        if( this.containedLayers.length > 0 ) {
            this.ctx.strokeStyle = 'blue';
            this.ctx.strokeRect(x, y, this.width, this.height);

            // Set resize nodes
            this.ctx.fillStyle = 'white';
            for(let key in this.nodes) {
                this.ctx.strokeRect(this.nodes[key].x, this.nodes[key].y, this.nodes[key].width, this.nodes[key].height);
                this.ctx.fillRect(this.nodes[key].x, this.nodes[key].y, this.nodes[key].width, this.nodes[key].height);
            }
        }
    }

    drawAbsolute = () => {
        this.drawAtPoint(this.x, this.y);
    }   

    drawRelative = () => {
        this.drawAtPoint(this.relativeX, this.relativeY);
    }
    
}

class Layer extends HitBox {
    constructor(options = {}) {
        super(options);
        this.z = options.z ? options.z : 0;
        this.ctx = options.ctx ? options.ctx : null;
        this.x_mm = options.x_mm ? options.x_mm : 0;
        this.y_mm = options.y_mm ? options.y_mm : 0;
        this.relativeX = 0;
        this.relativeY = 0;
        this.width_mm = options.width_mm ? options.width_mm : 0;
        this.height_mm = options.height_mm ? options.height_mm : 0;
        this.selected = options.selected ? options.selected : false;
        this.editing = options.editing ? options.editing : false;
        this.rotation = options.rotation ? options.rotation : 0;
        this.ratio = options.ratio ? options.ratio : 1; // The mm to px ratio
        this.clipX = 0;
        this.clipWidth = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    setMmPosition = (x,y) => {
        this.x_mm = x;
        this.y_mm = y;
        this.relativeX = this.x_mm * this.ratio;
        this.relativeY = this.y_mm * this.ratio;
        this.x = this.relativeX + this.offsetX;
        this.y = this.relativeY + this.offsetY;
        this.setCloneOffset();
    }

    setRelativePosition = (x,y) => {
        this.relativeX = x;
        this.relativeY = y;
        this.x_mm = this.relativeX / this.ratio;
        this.y_mm = this.relativeY / this.ratio;
        this.x = this.relativeX + this.offsetX;
        this.y = this.relativeY + this.offsetY;
        this.setCloneOffset();
    }

    setAbsolutePosition = (x,y) => {
        this.x = x;
        this.y = y;
        this.relativeX = this.x - this.offsetX;
        this.relativeY = this.y - this.offsetY;
        this.x_mm = this.relativeX / this.ratio;
        this.y_mm = this.relativeY / this.ratio;
        this.setCloneOffset();
    }

    setCloneOffset = () => {
        // If the layer is less than the clip box
        // add the clip width so the x is relative to the clone
        if( this.x + this.width * this.scaleX < this.clipX ) {
            this.x += this.clipWidth;
        }          
    }

    drawAbsolute = () => {
        this.drawAtPoint(this.x, this.y);
    }   

    drawRelative = () => {
        this.drawAtPoint(this.relativeX, this.relativeY);
    }

    edit = () => {
        return false;
    }

}

class TextLayer extends Layer {
    constructor(options = {}) {
        super(options);
        this.font = options.font ? options.font : 'serif';
        this.fontSize = options.fontSize ? options.fontSize : 0;
        this.fontWeight = options.fontWeight ? options.fontWeight : 'normal';
        this.fontStyle = options.fontStyle ? options.fontStyle : 'normal';
        this.fontVariant = options.fontVariant ? options.fontVariant : 'normal';
        this.underline = options.underline ? options.underline : false;
        this.align = options.align ? options.align : 'left';
        this.text = options.text ? options.text : 'Click to add text';
        this.color = options.color ? options.color : '#000000';
        this.fontSize_mm = options.fontSize_mm ? options.fontSize_mm : 0;
        this.selectStartCharacter = 0;
        this.selectEndCharacter = 0;
    }

    getTextLines = () => {
        return this.text.split('\n');
    }

    calculateWidth = () => {
        var lines = this.getTextLines();
        var width = 0;
        for(var i = 0; i < lines.length; i++) {
            this.ctx.font = this.fontStyle + ' ' + this.fontVariant + ' ' + this.fontWeight + ' ' + this.fontSize + 'px ' + this.font;
            var lineWidth = 0;
            var characters = lines[i].split('');

            // Step through each character to measure the width
            for( var j = 0; j < characters.length; j++ )
                lineWidth += this.ctx.measureText(characters[j]).width;

            if(lineWidth > width)
                width = lineWidth;
        }
        return width;
    }

    calculateHeight = () => {
        return this.fontSize * this.getTextLines().length;
    }

    drawAtPoint = (x,y) => {
    
        var rotation_degs = this.rotation,
        rotation_rads = rotation_degs / (180/Math.PI),
        angle_sine = Math.sin(rotation_rads),
        angle_cosine = Math.cos(rotation_rads);

        this.ctx.setTransform(angle_cosine * this.scaleX, angle_sine * this.scaleX, -angle_sine * this.scaleY, angle_cosine * this.scaleY, x + this.width * this.scaleX / 2, y + this.height * this.scaleY / 2);
        this.ctx.translate(-this.width / 2, -this.height / 2);

        // Rotate!
        // this.ctx.translate(this.width / 2, this.height / 2);
        // this.ctx.rotate(this.rotation*Math.PI/180);
        // this.ctx.translate(-this.width / 2, -this.height / 2);

        // Scale!
        // this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, x , y );  


        this.ctx.font = this.fontStyle + ' ' + this.fontVariant + ' ' + this.fontWeight + ' ' + this.fontSize + 'px ' + this.font;
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = this.color;

        // Draw each line
        let lines = this.getTextLines();
        for( var i = 0; i < lines.length; i++) {
            this.ctx.fillText(lines[i], 0, this.fontSize * i);
            if( this.underline ) {
                var width = this.ctx.measureText(lines[i]).width;
                this.ctx.fillRect(0, this.fontSize * (i + 1) - this.fontSize * 0.15, width, this.fontSize/15);
            }
        }

        if( this.editing ) {
            this.ctx.fillRect(this.x, this.y, 5, 5);
            var startCharacterPos = this.getCharacterPosition( this.selectStartCharacter );
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(startCharacterPos.x, startCharacterPos.y, 2, this.fontSize);
            var endCharacterPos = this.getCharacterPosition( this.selectEndCharacter );

            console.log( this.selectStartCharacter.line !== this.selectStartCharacter.character, this.selectEndCharacter.line !== this.selectEndCharacter.character );

            if(  this.selectStartCharacter.line !== this.selectEndCharacter.line || this.selectStartCharacter.character !==  this.selectEndCharacter.character ) {
                this.ctx.fillStyle = 'blue';
                this.ctx.fillRect(startCharacterPos.x, startCharacterPos.y, endCharacterPos.x - startCharacterPos.x, this.fontSize);
            }
        }

        this.ctx.setTransform(1,0,0,1,0,0);

        // this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // If selected, draw an outline
        /*
        if( this.selected ) {
            if( this.editing )
                this.ctx.strokeStyle = 'red';
            else
                this.ctx.strokeStyle = 'blue';
      
            this.ctx.setLineDash([5, 2]);
            this.ctx.strokeRect(x, y, this.calculateWidth(), this.calculateHeight());
            this.ctx.setLineDash([0,0]);
        }
        */
    }

    drawAbsolute = () => {
        this.drawAtPoint(this.x, this.y);
    }   

    drawRelative = () => {
        this.drawAtPoint(this.relativeX, this.relativeY);
    }

    rotate = (deg) => {
        this.rotation = deg;
    }

    getCharacterAtPoint(mouseX, mouseY) {
        this.ctx.font = this.fontStyle + ' ' + this.fontVariant + ' ' + this.fontWeight + ' ' + this.fontSize + 'px ' + this.font;

        var currentLine = 0;
        var currentCharacter = 0;
        var lines = this.getTextLines();
        for( var i = 0; i < lines.length; i++ ) {
            var y = this.y + this.fontSize * i;
            if( mouseY > y ) {
                currentLine = i;
            }
        }

        for( var i = 0; i < lines[currentLine].split('').length + 1; i++ ) {
            var text = lines[currentLine].slice(0,i);
            var textWidth = this.ctx.measureText(text).width;
            var x = this.x + textWidth * this.scaleX;
            if( mouseX > x ) {
                currentCharacter = i
            }
        }

        return {
            line : currentLine,
            character : currentCharacter
        }
    }

    getCharacterPosition(character) {
        this.ctx.font = this.fontStyle + ' ' + this.fontVariant + ' ' + this.fontWeight + ' ' + this.fontSize + 'px ' + this.font;
        var y =  this.fontSize * character.line;
        var x = 0;
        var lines = this.getTextLines();
        /*
        for( var i = 0; i < character.character + 1; i++ ) {
            var text = lines[character.line].slice(0,i);
            var textWidth = this.ctx.measureText(text).width;
            x = textWidth;
        }
        */

        var text = lines[character.line].slice(0,character.character);
        var x = this.ctx.measureText(text).width;
        var character = lines[character.line][character.character];
        var width = this.ctx.measureText(character).width;

        return {
            x : x,
            y : y,
            width : width
        };
    }

    onDblclick = (mouseX,mouseY) => {
        this.selectStartCharacter = this.getCharacterAtPoint(mouseX, mouseY);
        this.selectEndCharacter = this.selectStartCharacter;
    }

    onDrag = (mouseX,mouseY) => {
        this.selectEndCharacter = this.getCharacterAtPoint(mouseX, mouseY);
    }

}

class ShapeLayer extends Layer {
    constructor(options = {}) {
        super(options);
        this.color = options.color ? options.color : '#000000';
        this.svg = options.svg ? options.svg : '<svg></svg>';
        this.img = new Image();
        this.img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(this.svg);
    } 

    drawElement = (element) => {
        let path = new Path2D();

        var transform = element.getAttribute('transform');

        if( transform ) {
            let translate = transform.split('translate(').pop().split(')')[0];
            translate = translate.split(' ');
            if( !translate[0] )
                translate[0] = 0;
            if( !translate[1] )
                translate[1] = 0;
            this.ctx.translate(translate[0], translate[1]);
        }

        /*
        <svg xmlns="http://www.w3.org/2000/svg" width="380" height="111" viewBox="0 0 380 111">
            <rect id="Rectangle_104" data-name="Rectangle 104" width="111" height="111"/>
            <circle id="Ellipse_11" data-name="Ellipse 11" cx="55.5" cy="55.5" r="55.5" transform="translate(126)"/>
            <path id="Polygon_2" data-name="Polygon 2" d="M64,0l64,111H0Z" transform="translate(252)"/>
        </svg>
        */

        switch( element.tagName ) {
            case 'g' :
                for(var i = 0; i < element.children.length; i++ ) {
                    this.drawElement(element.children[i]);
                }
                break;
            case 'rect' : 
                var rectX = element.getAttribute('x') ? element.getAttribute('x') : 0;
                var rectY = element.getAttribute('y') ? element.getAttribute('y') : 0;
                var width = element.getAttribute('width');
                var height = element.getAttribute('height');
                path.rect(rectX, rectY, width, height);
                break;
            case 'path' : 
                path = new Path2D( element.getAttribute('d') );
                break;
            case 'circle' : 
                var circX = element.getAttribute('cx');
                var circY = element.getAttribute('cy');
                var circR = element.getAttribute('r');
                path.arc(circX, circY, circR, 0, 360, false)
                break;
            case 'polygon' :
                var points = element.getAttribute('points').split(' ');
                for(var j = 0; j < points.length - 1; j++) {
                    var pointsSplit = points[j].split(',');
                    var polyX = pointsSplit[0];
                    var polyY = pointsSplit[1];
                    if( j == 0 ) {
                        path.moveTo(polyX, polyY);
                    } else {
                        path.lineTo(polyX, polyY);
                    }
                }
                break;
        }   
        this.ctx.fillStyle = this.color;
        this.ctx.fill(path); 

        if( transform ) {
            let translate = transform.split('translate(').pop().split(')')[0];
            translate = translate.split(' ');
            if( !translate[0] )
                translate[0] = 0;
            if( !translate[1] )
                translate[1] = 0;
            this.ctx.translate(-translate[0], -translate[1]);
        }
    }

    drawAtPoint = (x,y) => {
        var parser = new DOMParser();
        var document = parser.parseFromString(this.svg, "image/svg+xml");
        var svg = document.getElementsByTagName("svg")[0];
        var viewbox = svg.getAttribute('viewBox').split(/\s+|,/);

        this.ctx.setTransform(this.width/viewbox[2] * this.scaleX, 0, 0, this.height/viewbox[3] * this.scaleY, x, y);  
        
        for(var i = 0; i < svg.children.length; i++ ) {
            this.drawElement(svg.children[i]);
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);  
    }

    draw = () => {
        var parser = new DOMParser();
        var document = parser.parseFromString(this.svg, "image/svg+xml");
        var svg = document.getElementsByTagName("svg")[0];
        var viewbox = svg.getAttribute('viewBox').split(/\s+|,/);

        this.ctx.setTransform(this.width/viewbox[2], 0, 0, this.height/viewbox[3], this.x, this.y);  
        
        for(var i = 0; i < svg.children.length; i++ ) {

            let path = new Path2D();

            switch( svg.children[i].tagName ) {
                case 'rect' : 
                    var x = svg.children[i].getAttribute('x') ? svg.children[i].getAttribute('x') : 0;
                    var y = svg.children[i].getAttribute('y') ? svg.children[i].getAttribute('y') : 0;
                    var width = svg.children[i].getAttribute('width');
                    var height = svg.children[i].getAttribute('height');
                    path.rect(x, y, width, height);
                    break;
                case 'path' : 
                    path = new Path2D( svg.children[i].getAttribute('d') );
                    break;
                case 'circle' : 
                    var x = svg.children[i].getAttribute('cx');
                    var y = svg.children[i].getAttribute('cy');
                    var r = svg.children[i].getAttribute('r');
                    path.arc(x, y, r, 0, 360, false)
                    break;
                case 'polygon' :
                    var points = svg.children[i].getAttribute('points').split(' ');
                    for(var j = 0; j < points.length - 1; j++) {
                        var pointsSplit = points[j].split(',');
                        var x = pointsSplit[0];
                        var y = pointsSplit[1];
                        if( j == 0 ) {
                            path.moveTo(x, y);
                        } else {
                            path.lineTo(x, y);
                        }
                    }
                    break;
            }   
            
            this.ctx.fillStyle = this.color;
            this.ctx.fill(path); 
        }

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);  
    }
}

class ImageLayer extends Layer {
    constructor(options = {}) {
        super(options);
        this.src = options.src ? options.src : '';
    };

    draw = () => {
        if( this.src )
            this.ctx.drawImage(this.src, this.x, this.y, this.width, this.height);
    }
}

const Editor = props => {

    const bgRef = useRef(null);
    let ctx = null;

    let moving = false;
    let dragging = false;
    let dragging2 = false;
    let scrolling = false;
    let resizing = false;
    let editingLayer = false;
    let selecting = false;

    let selectedLayer = false;

    let labelView = false;

    // The label canvas
    let labelCanvas = document.createElement('canvas');
    let labelContext = labelCanvas.getContext('2d');

    // The rotation / scroll amount as a percentage (0-1)
    let scrollAmount = 0;
    let scrollPx = 0;
    let maxScroll = 0;

    // The zoom amount (percentage between 50 - 200)
    let zoom = 100;

    // The product image area
    let productImageFrames = [];
    let productImageFrameLength = 48;
    let currentProductImageFrame = 0;
    let productImagePxRatio = 0;
    
    let productArea = new ImageLayer;
    let previewArea = new HitBox;
    let labelArea = new HitBox;
    let labelBackground = new ShapeLayer;
    let boundingBox = new BoundingBox;
    let selectionBox = new SelectionBox;

    // The interval used for the rotate buttons
    let scrollInterval = 0;

    // The product dimensions in mm
    // Todo: consider putting these in both px and mm, so we only need to calculate once on resize
    // rather than using the productImagePxRatio multiplier anywhere else (gets confusing! avoiding for now)
    const productDimensions = {
        width : 78,
        height : 188,
        previewWidth : 190,
        previewHeight : 65,
        previewX : 8.7,
        previewY : 95,
        clipWidth : 60.6,
        clipHeight : 65,    
        circumference : 192
    }

    // The template layers
    let layers = [];

    const getSelectedLayers = (e) => {
        let selectedLayers = [];
        for(var i = 0; i < layers.length; i++) {
            if( layers[i].selected )
                selectedLayers.push(i);
        }
        return selectedLayers;
    }

    const clearSelectedLayers = (e) => {
        let selectedLayers = getSelectedLayers();
        for( var i = 0; i < selectedLayers.length; i++ ) {
            layers[selectedLayers[i]].selected = false;
        }
    }

    const handleZoom = (e) => {
        zoom = e.target.value;
        document.getElementById('zoom-text').innerHTML = zoom + " %";
        draw();
    }   

    const setScroll = (newAmount) => {
        scrollX( newAmount - scrollPx );
    }

    const animateScroll = (newAmount) => {
        let amount =  newAmount - scrollPx;
        for(let i = 0; i < Math.abs(amount); i++) {
            setTimeout(function() { 
                requestAnimationFrame(function(timestamp){
                    if( amount > 0 ) 
                        scrollX(1);
                    else
                        scrollX(-1);
                });
            }, i );
        }
    }

    const scrollFront = (e) => {
        if( scrollAmount > 0.5 )
            animateScroll(maxScroll - (maxScroll - labelArea.width));
        else
            animateScroll(-(maxScroll - labelArea.width));
    }

    const scrollBack = (e) => {
        animateScroll( Math.round(maxScroll - previewArea.width) );
    }

    const scrollLeftStart = (e) => {
        scrollInterval = setInterval( function(){
            scrollX(1);
        }, 1 );
    }

    const scrollRightStart = (e) => {
        scrollInterval = setInterval( function(){
            scrollX(-1);
        }, 1 );
    }

    const scrollIntervalEnd = (e) => {
        if(scrollInterval != 0 ) {
            clearInterval(scrollInterval);
            scrollInterval = 0;
        }
    }

    const toggleLabelView = (e) => {
        labelView = !labelView;
        draw();
    }

    const rotatePoint = (point, origin, theta) => {
        var px = Math.cos(theta) * (point[0] - origin[0]) - Math.sin(theta) * (point[1] - origin[1]) + origin[0];
        var py = Math.sin(theta) * (point[0] - origin[0]) + Math.cos(theta) * (point[1] - origin[1]) + origin[1];
        return [px,py];
    }

    const resetBoundingBox = () => {
        /*
        let selectedLayers = getSelectedLayers();
        if( selectedLayers.length > 0 ) {
            // Get bounding box of selected layers
            if( selectedLayers.length > 1 ) {
                // There's multiple layers, so we need to compare them to find the bounding box
                boundingBox.x = boundingBox.relativeX = boundingBox.y = boundingBox.relativeY = Number.POSITIVE_INFINITY;
                let bottom = 0;
                let right = 0;
                
                for( var i = 0; i < selectedLayers.length; i++ ) {
                    if(layers[selectedLayers[i]].x < boundingBox.x) {
                        boundingBox.relativeX = layers[selectedLayers[i]].relativeX;
                        boundingBox.x = layers[selectedLayers[i]].x;
                    }

                    if(layers[selectedLayers[i]].y < boundingBox.y) {
                        boundingBox.relativeY = layers[selectedLayers[i]].relativeY;
                        boundingBox.y = layers[selectedLayers[i]].y;
                    }

                    if(layers[selectedLayers[i]].x + (layers[selectedLayers[i]].width * layers[selectedLayers[i]].scaleX) > right)
                        right = layers[selectedLayers[i]].x + layers[selectedLayers[i]].width * layers[selectedLayers[i]].scaleX;

                    if(layers[selectedLayers[i]].y + layers[selectedLayers[i]].height * layers[selectedLayers[i]].scaleY > bottom)
                        bottom = layers[selectedLayers[i]].y + layers[selectedLayers[i]].height * layers[selectedLayers[i]].scaleY;
                }

                boundingBox.width = right - boundingBox.x;
                boundingBox.height = bottom - boundingBox.y;
                
            } else {
                // There's only one layer so get the dimensions directly
                var layer = layers[selectedLayers[0]];

                // Perform any translations/transformations
                // var h = layer.height * layer.scaleY * Math.abs(Math.cos(layer.rotation)) + layer.width * layer.scaleX * Math.abs(Math.sin(layer.rotation));
                // var w = layer.width * layer.scaleX * Math.abs(Math.cos(layer.rotation)) + layer.height * layer.scaleY * Math.abs(Math.sin(layer.rotation));

                // Todo: work on rotation selection box

                var theta = layer.rotation * Math.PI / 180;
                var topLeft = [layer.x, layer.y];
                var topRight = [layer.x + layer.width * layer.scaleX, layer.y];
                var bottomLeft = [layer.x, layer.y + layer.height * layer.scaleY];
                var bottomRight = [layer.x + layer.width * layer.scaleX, layer.y + layer.height * layer.scaleY];
                var origin = [layer.x + layer.width * layer.scaleX / 2, layer.y + layer.height * layer.scaleY / 2];

                var newTopLeft = rotatePoint(topLeft, origin, theta);
                var newTopRight = rotatePoint(topRight, origin, theta);
                var newBottomLeft = rotatePoint(bottomLeft, origin, theta);
                var newBottomRight = rotatePoint(bottomRight, origin, theta);

                ctx.beginPath();
                ctx.moveTo(newTopLeft[0], newTopLeft[1]);
                ctx.lineTo(newTopRight[0], newTopRight[1]);
                ctx.lineTo(newBottomRight[0], newBottomRight[1]);
                ctx.lineTo(newBottomLeft[0], newBottomLeft[1]);
                ctx.lineTo(newTopLeft[0], newTopLeft[1]);
                ctx.stroke();

                boundingBox.x = layer.x;
                boundingBox.y = layer.y;
                boundingBox.relativeX = layer.relativeX;
                boundingBox.relativeY = layer.relativeY;
                boundingBox.width = layer.width * layer.scaleX;
                boundingBox.height = layer.height * layer.scaleY;

            }

            boundingBox.calculateNodePositions();
            boundingBox.visible = true;
            return boundingBox;
        } else {
            boundingBox.x = 0;
            boundingBox.y = 0;
            boundingBox.relativeX = 0;
            boundingBox.relativeY = 0;
            boundingBox.width = 0;
            boundingBox.height = 0;
            boundingBox.visible = false;
            return false;
        }
        */
    }

    const toggleToolbar = () => {
        let type = '';

        if( selectedLayer instanceof TextLayer == true )
            type = 'text';

        document.getElementById('text-toolbar').style.display = 'none';
        switch( type ) {
            case 'text' :
                document.getElementById('text-toolbar').style.display = 'flex';

                // Set font type
                let fontInput = document.getElementById('font-input');
                fontInput.value = selectedLayer.font;

                let letterHeight = document.getElementById('letter-height');
                letterHeight.value = Math.round( selectedLayer.fontSize_mm * selectedLayer.scaleY * 100) / 100;

                let letterStretch = document.getElementById('letter-stretch');
                letterStretch.value = Math.round( selectedLayer.scaleX / selectedLayer.scaleY * 100) / 100;

                let toggleBold = document.getElementById('toggle-bold');
                if( selectedLayer.fontWeight == 'bold' )
                    toggleBold.checked = true;
                else
                    toggleBold.checked = false;

                let toggleItalic = document.getElementById('toggle-italic');
                if( selectedLayer.fontStyle == 'italic' )
                    toggleItalic.checked = true;
                else
                    toggleItalic.checked = false;

                let toggleUnderline = document.getElementById('toggle-underline');
                toggleUnderline.checked = selectedLayer.underline;

                let colorSelect = document.getElementById('color-select');
                colorSelect.value = selectedLayer.color;

                break;
        }

    }

    const changeFont = (e) => {
        selectedLayer.font = e.target.value;
        draw();
    }

    const resizeFont = (e) => {      
        selectedLayer.fontSize_mm = e.target.value / selectedLayer.scaleY;
        selectedLayer.fontSize = selectedLayer.fontSize_mm * productImagePxRatio;
        selectedLayer.width = selectedLayer.calculateWidth();
        selectedLayer.height = selectedLayer.calculateHeight();
        boundingBox.calculateSizeAndPosition();
        draw();
    }

    const stretchFont = (e) => {
        selectedLayer.scaleX = e.target.value * selectedLayer.scaleY;
        selectedLayer.width = selectedLayer.calculateWidth();
        selectedLayer.height = selectedLayer.calculateHeight();
        boundingBox.calculateSizeAndPosition();
        draw();
    }

    const toggleBold = (e) => {
        if( e.target.checked ) 
            selectedLayer.fontWeight = 'bold';
        else 
            selectedLayer.fontWeight = 'normal';

        draw();
    }

    const toggleItalic = (e) => {
        if( e.target.checked ) 
            selectedLayer.fontStyle = 'italic';
        else 
            selectedLayer.fontStyle = 'normal';

        draw();
    }

    const toggleUnderline = (e) => {
        selectedLayer.underline = e.target.checked;

        draw();
    }

    const changeColor = (e) => {
        selectedLayer.color = e.target.value;

        draw();    
    }

    const rotateClockwise = (e) => {
        selectedLayer.rotate( selectedLayer.rotation + 45 );

        draw();
    }

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
                console.log('enter');
                break;
            case 8 :
                // Backspace pressed
                console.log('backspace');
                break;
            case 46 : 
                // Delete pressed
                let selectedLayers = getSelectedLayers();
                for(var i = 0; i < selectedLayers.length; i++ ) {
                    layers.splice(selectedLayers[i], 1);
                    selectedLayers.splice(i,1);
                }
                draw();
                break;
            default :
                if(e.ctrlKey) {
                    // CTRL is held down
                    if((e.keyCode == 65 || e.keyCode == 97)) {
                        // CTRL + A pressed
                    }
                } else if(String.fromCharCode(e.keyCode).match(/(\w|\s)/g)) {
                    // Character pressed
                }
                break;
        }
    }

    const onDblclickHandler = (e) => {
        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;
        let selectedLayers = getSelectedLayers();

        /*
        if( selectedLayers.length == 1 ) {
            // There's just the one selected layer, edit it!
            editingLayer = layers[selectedLayers[0]];
            editingLayer.editing = true;
            editingLayer.onDblclick(mouseX,mouseY);
        } else if( selectedLayers.length > 1 ) {
            // There's multiple layers, clear the others and just edit the one that's been clicked
            // If multiple are clicked, choose the one with the higher z-index
            let selectedLayer = false;
            for( var i = 0; i < layers.length; i++ ) {
                if( layers[i].containsPoint( mouseX, mouseY ) && ( selectedLayer == false || layers[selectedLayer].z < layers[i].z )) {
                    // We've clicked in a layer, and the z-index is higher than any other selected layer
                    selectedLayer = i;
                }
            }

            // Clear other selections and set the clicked layer to selected
            if(selectedLayer !== false ) {
                clearSelectedLayers();
                layers[selectedLayer].selected = true;
                layers[selectedLayer].editing = true;
                editingLayer = layers[selectedLayers[0]];
            }
        }
        */

        lastDblclickLocation.x = {
            x : mouseX,
            y : mouseY
        };

        draw();

    }

    const onMouseDownHandler = (e) => {
        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;
        // let selectedLayers = getSelectedLayers();

        var dragging = true;
        var clickedLayer = null;

        // Check if we've clicked on a layer
        for( var i = 0; i < layers.length; i++ ) {
            if( layers[i].containsPoint( mouseX, mouseY ) ) {
                // We've clicked in a layer
                // Todo: sort out index of layers array so it's used as a z-index
                clickedLayer = i;
            }
        }

        if( boundingBox.nodeHitTest(mouseX, mouseY) !== false ) {
            // We've clicked inside a bounding box resize node
            boundingBox.startResize(mouseX, mouseY);
        } else if( clickedLayer == null ) {
            // No layers clicked, reset the selection box
            selectionBox.startDrag(mouseX, mouseY);
            // Reset the bounding box
            boundingBox.clearLayers();
        } else {
            selectedLayer = layers[clickedLayer];
            toggleToolbar();

            if( boundingBox.containsPoint(mouseX, mouseY) ) {              
                // We've clicked inside the bounding box
                boundingBox.startDrag();
            } else {
                boundingBox.selectLayers([layers[clickedLayer]]);
                boundingBox.startDrag();
            }
        }

        /*
        dragging2 = true;

        if( editingLayer !== false ) {
            if( !editingLayer.containsPoint(mouseX, mouseY) ) {
                // Clicked off editing layer, set to false
                editingLayer.editing = false;
                editingLayer = false;
            }
        }

        if( selectedLayers.length > 0 ) {
            // We have selected layers. Check if we're clicking on resize nodes
            resizing = boundingBox.nodeHitTest(mouseX, mouseY);

            if( !resizing && !editingLayer ) {
                // No resizing going on, check if we're moving the bounding box
                if( boundingBox.containsPoint( mouseX, mouseY ) )
                    moving = true;
            }
        }

        if( !moving && !resizing && !editingLayer ) {
            clearSelectedLayers();

            // Check if we've clicked on a layer
            let selectedLayer = false;
            for( var i = 0; i < layers.length; i++ ) {
                if( layers[i].containsPoint( mouseX, mouseY ) && ( selectedLayer == false || layers[selectedLayer].z < layers[i].z )) {
                    // We've clicked in a layer, and the z-index is higher than any other selected layer
                    selectedLayer = i;
                }
            }

            if( selectedLayer !== false ) {
                selectedLayers = [selectedLayer]
                layers[selectedLayer].selected = true;
                moving = true;       
            } else {
                // Reset the selection box
                selectedLayers = [];
                selectionBox.x = mouseX;
                selectionBox.y = mouseY;
                selectionBox.width = 0;
                selectionBox.height = 0;
                dragging = true;
            }
        }

        // Display toolbar
        if( selectedLayers.length == 1 ) {
            if( layers[selectedLayers[0]] instanceof TextLayer == true ) {
                toggleToolbar('text');
            }
            if( layers[selectedLayers[0]] instanceof ShapeLayer == true ) {
                toggleToolbar('shape');
            }
        } else if( selectedLayers.length > 1 ) {
            toggleToolbar('multi');
        } else {
            toggleToolbar(false);
        }

        if( !previewArea.containsPoint(mouseX, mouseY) ) {
            // Clicked outside the preview area - rotate the product when dragged
            // Temporarily disabled
            // scrolling = true;
        }
        */

        lastMouseDownLocation = {
            x : mouseX,
            y : mouseY
        };

        draw();
    }

    const onMouseUpHandler = (e) => {
        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        if( selectionBox.dragging ) {
            // Get all layers within the selection box
            var selectedLayers = [];
            for(var i = 0; i < layers.length; i++) {
                if( selectionBox.containsAreaPartially(layers[i].x, layers[i].y, layers[i].width * layers[i].scaleX, layers[i].height * layers[i].scaleY) ) {
                    selectedLayers.push(layers[i]);
                    layers[i].selected = true;
                }
            }
            
            // Set the bounding box selected layers
            boundingBox.selectLayers(selectedLayers);

            // Stop draggin
            selectionBox.stopDrag();            
        }

        if( boundingBox.dragging ) {
            boundingBox.stopDrag();
        }

        if( boundingBox.resizing ) {
            boundingBox.stopResize();
        }

        /*
        dragging2 = false;

        if(resizing)
            resizing = false;

        if(dragging) {
            // Check if any layers are in the selection box
            for(var i = 0; i < layers.length; i++) {
                if( selectionBox.containsAreaPartially(layers[i].x, layers[i].y, layers[i].width * layers[i].scaleX, layers[i].height * layers[i].scaleY) )
                    layers[i].selected = true;
            }
            dragging = false;
        }

        if(scrolling)
            scrolling = false;

        if(moving)
            moving = false;
        */

        lastMouseUpLocation = {
            x : mouseX,
            y : mouseY
        }; 

        draw();
    }

    const onMouseMoveHandler = (e) => {
        // We only want coordinates relative to the bounding rectangle
        let bounds = bgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - bounds.left;
        let mouseY = e.clientY - bounds.top;

        if( selectionBox.dragging ) {
            selectionBox.mouseMove(mouseX, mouseY);
        }

        var limitLeft = labelArea.x;
        var limitRight = labelArea.x + labelArea.width;

        if( lastMouseDownLocation.x > labelArea.x + labelArea.width ) {
            limitLeft += maxScroll;
            limitRight += maxScroll;
        }

        if( boundingBox.dragging 
            //&&
            //(( mouseX > limitLeft || mouseX < lastMouseMoveLocation.x) && (mouseY > previewArea.y || mouseY < lastMouseMoveLocation.y ))
            //&&
            //(( mouseX < limitRight || mouseX > lastMouseMoveLocation.x) && (mouseY < previewArea.y + previewArea.height || mouseY > lastMouseMoveLocation.y ))
            ) {
            boundingBox.mouseMove(mouseX, mouseY);
        } else if( boundingBox.resizing) {
            boundingBox.mouseMove(mouseX, mouseY );
        }

        /*
        // Handle cursor changes - to move into it's own function
        if( boundingBox.nodes.topLeft.containsPoint(mouseX, mouseY) || boundingBox.nodes.bottomRight.containsPoint(mouseX, mouseY) ) {
            bgRef.current.style.cursor = 'se-resize';
        } else if( boundingBox.nodes.topRight.containsPoint(mouseX, mouseY) || boundingBox.nodes.bottomLeft.containsPoint(mouseX, mouseY) ) {
            bgRef.current.style.cursor = 'sw-resize';
        } else if( boundingBox.nodes.centerLeft.containsPoint(mouseX, mouseY) || boundingBox.nodes.centerRight.containsPoint(mouseX, mouseY) ) {
            bgRef.current.style.cursor = 'w-resize';
        } else if( boundingBox.nodes.topCenter.containsPoint(mouseX, mouseY) || boundingBox.nodes.bottomCenter.containsPoint(mouseX, mouseY) ) {
            bgRef.current.style.cursor = 'n-resize';       
        } else if( !resizing ) {
            bgRef.current.style.cursor = 'default';
        }

        if( resizing ) {

            var newBoundingBoxX = boundingBox.x;
            var newBoundingBoxY = boundingBox.y;
            var newBoundingBoxRelativeX = boundingBox.relativeX;
            var newBoundingBoxRelativeY = boundingBox.relativeY;
            var newBoundingBoxWidth = boundingBox.width;
            var newBoundingBoxHeight = boundingBox.height;

            switch(resizing) {
                case 'topLeft' :
                    // Free transform:
                    // newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                    // newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;

                    // if( newBoundingBoxRelativeX < 0 )
                    //    newBoundingBoxRelativeX = 0;
                    //else
                    //    newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;

                    //if( newBoundingBoxRelativeY < 0 )
                    //    newBoundingBoxRelativeY = 0;
                    //else
                    //    newBoundingBoxHeight = boundingBox.height - mouseY + lastMouseMoveLocation.y;

                    // Proportional transform:
                    newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                    if( newBoundingBoxRelativeX < 0)
                        newBoundingBoxRelativeX = 0;
                    else
                        newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;

                    newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                    newBoundingBoxRelativeY = boundingBox.relativeY + boundingBox.height - newBoundingBoxHeight;

                    if( newBoundingBoxRelativeY < 0 ) {
                        // This is probably all a bit overkill but oh well
                        // Todo: figure out a better way to do this
                        newBoundingBoxRelativeY = 0;
                        var diffY = boundingBox.relativeY - newBoundingBoxRelativeY;
                        newBoundingBoxHeight = boundingBox.height + diffY;
                        newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                        newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                    }

                break;
                case 'topCenter' : 
                    newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;

                    if( newBoundingBoxRelativeY < 0 ) 
                        newBoundingBoxRelativeY = 0;

                    newBoundingBoxHeight = boundingBox.height - newBoundingBoxRelativeY + boundingBox.relativeY;
                    break;
                case 'topRight' :
                    // Free transform:
                    // newBoundingBoxRelativeY = boundingBox.relativeY + mouseY - lastMouseMoveLocation.y;
                    // newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;

                    // if( newBoundingBoxRelativeY < 0 )
                    //     newBoundingBoxRelativeY = 0;
                    // else
                    //     newBoundingBoxHeight = boundingBox.height - mouseY + lastMouseMoveLocation.y;
                    // 
                    // if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                    //     newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;

                    // Proportional transform:
                    newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                    if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width ) {
                        newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
                    }

                    newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                    newBoundingBoxRelativeY = boundingBox.relativeY + boundingBox.height - newBoundingBoxHeight;

                    if( newBoundingBoxRelativeY < 0 ) {
                        newBoundingBoxRelativeY = 0;

                        var diffY = boundingBox.relativeY - newBoundingBoxRelativeY;
                        newBoundingBoxHeight = boundingBox.height + diffY;

                        newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                        newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                    }

                    break;
                case 'centerLeft' :
                    newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;

                    if( newBoundingBoxRelativeX < 0 )
                        newBoundingBoxRelativeX = 0;
                    
                    newBoundingBoxWidth = boundingBox.width - newBoundingBoxRelativeX + boundingBox.relativeX;

                    break;
                case 'centerRight' : 
                    newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;

                    if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                        newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;
                        
                    break;
                case 'bottomLeft' :
                    // Free transform:
                    // newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                    // newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;

                    // if( newBoundingBoxRelativeX < 0 )
                    //     newBoundingBoxRelativeX = 0;
                    // else
                    //     newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;

                    // if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                    //     newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;

                    // Proportional transform:
                    newBoundingBoxRelativeX = boundingBox.relativeX + mouseX - lastMouseMoveLocation.x;
                    if( newBoundingBoxRelativeX < 0 )
                        newBoundingBoxRelativeX = 0;
                    else
                        newBoundingBoxWidth = boundingBox.width - mouseX + lastMouseMoveLocation.x;

                    newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);

                    if( newBoundingBoxRelativeY + newBoundingBoxHeight > labelArea.height ) {
                        newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
                        newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                        newBoundingBoxRelativeX = boundingBox.relativeX + boundingBox.width - newBoundingBoxWidth;
                    }

                    break;
                case 'bottomCenter' :
                    newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;

                    if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                        newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;

                    break;
                case 'bottomRight' : 
                    // Free transform:
                    // newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                    // newBoundingBoxHeight = boundingBox.height + mouseY - lastMouseMoveLocation.y;

                    // if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                    //     newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;

                    // if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height )
                    //     newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;

                    // Proportional transform:
                    newBoundingBoxWidth = boundingBox.width + mouseX - lastMouseMoveLocation.x;
                    if( newBoundingBoxRelativeX + newBoundingBoxWidth >= labelArea.width )
                        newBoundingBoxWidth = labelArea.width - newBoundingBoxRelativeX;

                    newBoundingBoxHeight = boundingBox.height * (newBoundingBoxWidth / boundingBox.width);
                    if( newBoundingBoxRelativeY + newBoundingBoxHeight >= labelArea.height ) {
                        newBoundingBoxHeight = labelArea.height - newBoundingBoxRelativeY;
                        newBoundingBoxWidth = boundingBox.width * (newBoundingBoxHeight / boundingBox.height);
                    }

                    break;
            }

            // Stop flipping
            if( newBoundingBoxWidth < 1 ) {
                newBoundingBoxWidth = 1;
                newBoundingBoxRelativeX = boundingBox.relativeX;
            }

            if( newBoundingBoxHeight < 1 ) {
                newBoundingBoxHeight = 1;
                newBoundingBoxRelativeY = boundingBox.relativeY;
            }

            newBoundingBoxX = labelArea.x + newBoundingBoxRelativeX;
            newBoundingBoxY = labelArea.y + newBoundingBoxRelativeY;
            
            if( newBoundingBoxX + newBoundingBoxWidth < previewArea.x )
                newBoundingBoxX += maxScroll;

            var scaleX = newBoundingBoxWidth / boundingBox.width;
            var scaleY = newBoundingBoxHeight / boundingBox.height;

            // Todo: Lock proportions
            // Todo: (hold down shift, make sure proportions are maintained in the right direction)

            // Resize layers
            let selectedLayers = getSelectedLayers();
            for( var i = 0; i < selectedLayers.length; i++ ) {
                var layer = layers[selectedLayers[i]];                

                // Scale up the px & mm positions
                layer.scaleX = layer.scaleX * scaleX;         
                layer.scaleY = layer.scaleY * scaleY;
                var diffX = (newBoundingBoxX + (layer.x - boundingBox.x) * scaleX) - layer.x;
                var diffY = (newBoundingBoxY + (layer.y - boundingBox.y) * scaleY) - layer.y;
                layer.x_mm += diffX / productImagePxRatio;
                layer.y_mm += diffY / productImagePxRatio;

                if( layer instanceof TextLayer ) {
                    // Update height values
                    let letterHeight = document.getElementById('letter-height');
                    letterHeight.value = Math.round( layer.fontSize_mm * layer.scaleY * 100) / 100;
                    let letterStretch = document.getElementById('letter-stretch');
                    letterStretch.value = Math.round( layer.scaleX / layer.scaleY * 100) / 100;                
                }

            }

            boundingBox.x = newBoundingBoxX;
            boundingBox.y = newBoundingBoxY;
            boundingBox.width = newBoundingBoxWidth;
            boundingBox.height = newBoundingBoxHeight;
            boundingBox.calculateNodePositions();
        } 

        if( editingLayer && dragging2 ) {
            editingLayer.onDrag(mouseX, mouseY);
        }
        
        if( moving ) {
            let selectedLayers = getSelectedLayers();
            if( selectedLayers.length > 0 ) {

                // Get new positions
                var amountMovedX = mouseX - lastMouseMoveLocation.x;
                var amountMovedY = mouseY - lastMouseMoveLocation.y;
                var newBoundingBoxRelativeX = boundingBox.relativeX + amountMovedX;
                var newBoundingBoxRelativeY = boundingBox.relativeY + amountMovedY;

                // Constrain to label
                if( newBoundingBoxRelativeX < 0 )
                    newBoundingBoxRelativeX = 0;
                if( newBoundingBoxRelativeY < 0 )
                    newBoundingBoxRelativeY = 0;
                if( newBoundingBoxRelativeX + boundingBox.width > labelArea.width )
                    newBoundingBoxRelativeX = labelArea.width - boundingBox.width;
                if( newBoundingBoxRelativeY + boundingBox.height > labelArea.height )
                    newBoundingBoxRelativeY = labelArea.height - boundingBox.height;

                // Set the absolute position
                newBoundingBoxX = labelArea.x + newBoundingBoxRelativeX;
                newBoundingBoxY = labelArea.y + newBoundingBoxRelativeY;
                
                if( newBoundingBoxX + newBoundingBoxWidth < previewArea.x )
                    newBoundingBoxX += maxScroll;

                // Set new positions
                for( var i = 0; i < selectedLayers.length; i++ ) {

                    var layer = layers[selectedLayers[i]];
                    var originalDiffX = layer.relativeX - boundingBox.relativeX;
                    var originalDiffY = layer.relativeY - boundingBox.relativeY;

                    layer.x = newBoundingBoxX + originalDiffX;
                    layer.y = newBoundingBoxY + originalDiffY;
                    layer.relativeX = newBoundingBoxRelativeX + originalDiffX;
                    layer.relativeY = newBoundingBoxRelativeY + originalDiffY;
                    layer.x_mm = layer.relativeX / productImagePxRatio;
                    layer.y_mm = layer.relativeY / productImagePxRatio;
                }
            }   
        } 
        
        if( dragging ) {
            selectionBox.x = (lastMouseDownLocation.x > mouseX ) ? mouseX : lastMouseDownLocation.x;
            selectionBox.y = (lastMouseDownLocation.y > mouseY ) ? mouseY : lastMouseDownLocation.y;
            selectionBox.width = (lastMouseDownLocation.x > mouseX ) ? lastMouseDownLocation.x - mouseX : mouseX - lastMouseDownLocation.x;
            selectionBox.height = (lastMouseDownLocation.y > mouseY ) ? lastMouseDownLocation.y - mouseY : mouseY - lastMouseDownLocation.y;
        } 
        
        if( scrolling ) {
            scrollX(lastMouseMoveLocation.x - mouseX);
        }
        */

        lastMouseMoveLocation = {
            x : mouseX,
            y : mouseY
        }

        draw();

    }

    const scrollX = (px) => {

        // No animation version:
        px = Math.round(px);
        scrollPx += px;

        if( scrollPx < 0 )
            scrollPx = maxScroll + scrollPx;
    
        if( scrollPx > maxScroll ) 
            scrollPx = scrollPx - maxScroll;

        scrollAmount = 1 / maxScroll * scrollPx;

        labelArea.x = previewArea.x - scrollPx;

        draw();

        // Rewrite this - put scroll & animate in separate function
        /*
        for(let i = 0; i < Math.abs(px); i++) {
            setTimeout(function() { 
                requestAnimationFrame(function(timestamp){
                    if( px > 0 ) 
                        scrollPx++;
                    else
                        scrollPx--;

                    if( scrollPx < 0 )
                        scrollPx = maxScroll + scrollPx;
                    
                    if( scrollPx > maxScroll ) 
                        scrollPx = scrollPx - maxScroll;

                    scrollAmount = 1 / maxScroll * scrollPx;

                    labelArea.x = previewArea.x - scrollPx;

                    draw();
                });
            }, i );
        }
        */

    }

    const onResizeHandler = () => {
        // To do: split out some of this function, not all of it is necessary on every draw

        // Get the device pixel ratio (default is 1)
        let dpr = window.devicePixelRatio || 1;

        // Get the container element width & height
        let elHeight = bgRef.current.clientHeight;
        let elWidth = bgRef.current.clientWidth;

        // Set the canvas element width & height
        bgRef.current.width = elWidth * dpr;
        bgRef.current.height = elHeight * dpr;

        // Set the pixel ratio for the product area (for mm -> px conversions)
        if( !labelView ) {
            if( bgRef.current.width * ( productDimensions.height / productDimensions.width ) > bgRef.current.height )
                productImagePxRatio = bgRef.current.height / productDimensions.height * (zoom / 100);
            else
                productImagePxRatio = bgRef.current.width / productDimensions.width * (zoom / 100);
        } else {
            if( bgRef.current.width * ( productDimensions.previewHeight / productDimensions.previewWidth ) > bgRef.current.height )
                productImagePxRatio = bgRef.current.height / productDimensions.previewHeight * (zoom / 100);
            else
                productImagePxRatio = bgRef.current.width / productDimensions.previewWidth * (zoom / 100);          
        }

        // Set Y offset dependent on zoom (we want to center on the preview rather than the product)
        let offsetY = 0

        if( !labelView ) {
            if( zoom > 100 )
                offsetY = ( productDimensions.previewY * productImagePxRatio - bgRef.current.height * zoom / 200 + productDimensions.clipHeight * productImagePxRatio / 2 ) * (zoom - 100) / 100;
        } else {
            if( zoom > 100 )
                offsetY = ( productDimensions.previewY * productImagePxRatio - bgRef.current.height * zoom / 200 + productDimensions.clipHeight * productImagePxRatio / 2 ) * (zoom - 100) / 100;
        }

        // Set the max scroll width & scroll pixels
        maxScroll = productDimensions.circumference * productImagePxRatio;
        scrollPx = maxScroll * scrollAmount;

        if( labelView && zoom <= 100 ) {
            scrollPx = 0;
            scrollAmount = 0;
        }

        // Calculate the new product area size & position
        if( !labelView ) {
            productArea.width = productDimensions.width * productImagePxRatio;
            productArea.height = productDimensions.height * productImagePxRatio;
            productArea.x = bgRef.current.width / 2 - productArea.width / 2;
            productArea.y = bgRef.current.height / 2 - productArea.height / 2 - offsetY;
            productArea.absoluteX = productArea.x;
            productArea.absoluteY = productArea.y;      
            productArea.relativeX = productArea.x;
            productArea.relativeY = productArea.y;
            productArea.width_mm = productDimensions.width;
            productArea.height_mm = productDimensions.height;
            productArea.x_mm = productArea.x / productImagePxRatio;
            productArea.y_mm = productArea.y / productImagePxRatio;
        }

        // Calculate the preview area size & position
        if( !labelView ) {
            previewArea.width = productDimensions.clipWidth * productImagePxRatio;
            previewArea.height = productDimensions.clipHeight * productImagePxRatio;
            previewArea.x = productArea.x + productDimensions.previewX * productImagePxRatio;
            previewArea.y = productArea.y + productDimensions.previewY * productImagePxRatio;
            previewArea.width_mm = productDimensions.clipWidth;
            previewArea.height_mm = productDimensions.clipHeight;
            previewArea.x_mm = previewArea.x / productImagePxRatio;
            previewArea.y_mm = previewArea.y / productImagePxRatio;
        } else {
            previewArea.width = bgRef.current.width;
            previewArea.height = bgRef.current.height;
            previewArea.x = 0;
            previewArea.y = 0;
            previewArea.width_mm = previewArea.width / productImagePxRatio;
            previewArea.height_mm = previewArea.width / productImagePxRatio;
            previewArea.x_mm = previewArea.x / productImagePxRatio;
            previewArea.y_mm = previewArea.y / productImagePxRatio;     
        }

        // Calculate the new label area size & position
        if( !labelView ) {
            labelArea.width = productDimensions.previewWidth * productImagePxRatio;
            labelArea.height = productDimensions.previewHeight * productImagePxRatio;
            labelArea.x = previewArea.x - (maxScroll * scrollAmount);
            labelArea.y = previewArea.y;
            labelArea.width_mm = productDimensions.previewWidth;
            labelArea.height_mm = productDimensions.previewHeight;
            labelArea.x_mm = labelArea.x / productImagePxRatio;
            labelArea.y_mm = labelArea.y / productImagePxRatio;
        } else {
            labelArea.width = previewArea.width * zoom / 100;
            labelArea.height = previewArea.width * (productDimensions.previewHeight / productDimensions.previewWidth) * zoom / 100;
            labelArea.x = previewArea.width / 2 - labelArea.width / 2 - (maxScroll * scrollAmount);
            labelArea.y = previewArea.height / 2 - labelArea.height / 2;
            labelArea.width_mm = labelArea.width / productImagePxRatio;
            labelArea.height_mm = labelArea.height / productImagePxRatio;
            labelArea.x_mm = labelArea.x / productImagePxRatio;
            labelArea.y_mm = labelArea.y / productImagePxRatio;
        }

        // Calculate the label background size & position relative to the label area
        labelBackground.width = labelArea.width;
        labelBackground.height = labelArea.height;
        labelBackground.x = 0;
        labelBackground.y = 0;
        labelBackground.absoluteX = labelBackground.x;
        labelBackground.absoluteY = labelBackground.y;      
        labelBackground.relativeX = labelBackground.x;
        labelBackground.relativeY = labelBackground.y;
        labelBackground.width_mm = labelArea.width_mm;
        labelBackground.height_mm = labelArea.height_mm;
        labelBackground.x_mm = 0;
        labelBackground.y_mm = 0;

        // Set the bounding box constraints
        boundingBox.constraintLeft = labelArea.x + maxScroll;
        boundingBox.constraintTop = labelArea.y;
        boundingBox.constraintRight = boundingBox.constraintLeft + labelArea.width;
        boundingBox.constraintBottom = boundingBox.constraintTop + labelArea.height;

        // Calculate the layer sizes & position relative to the label area
        // The template saves the size in mm rather than px
        for(var i = 0; i < layers.length; i++) {    
            layers[i].ratio = productImagePxRatio;
            layers[i].clipX = previewArea.x;
            layers[i].clipWidth = maxScroll;
            layers[i].offsetX = labelArea.x;
            layers[i].offsetY = labelArea.y;
            layers[i].maxRelativeY = labelArea.height;
            layers[i].maxRelativeX = labelArea.width;
            layers[i].setMmPosition( layers[i].x_mm, layers[i].y_mm );

            if( layers[i] instanceof TextLayer == true ) {
                layers[i].fontSize = layers[i].fontSize_mm * productImagePxRatio;
                layers[i].width = layers[i].calculateWidth();
                layers[i].height = layers[i].calculateHeight();
            } else if (layers[i] instanceof ImageLayer == true ) {
                console.log('image layer');
            } else if( layers[i] instanceof ShapeLayer == true ) {
                layers[i].width = layers[i].width_mm * productImagePxRatio;
                layers[i].height = layers[i].height_mm * productImagePxRatio;
            }
        }

        // Set the label canvas width & height
        labelCanvas.width = labelArea.width * dpr;
        labelCanvas.height = labelArea.height * dpr;

    }

    const init = () => {
        // Set the context
        ctx = bgRef.current.getContext('2d');

        // Set the label options
        labelBackground.x = 0;
        labelBackground.y = 0;
        labelBackground.color = '#eeeeee';
        labelBackground.svg = '<svg x="0px" y="0px" width="400px" height="100px" viewBox="0 0 400 100" enable-background="new 0 0 400 100" xml:space="preserve"><rect width="400" height="100"/></svg>';
        labelBackground.ctx = labelContext;

        // Set the selection & bounding box context
        selectionBox.ctx = ctx;

        var logoSvg =   `
            <svg id="Group_24" data-name="Group 24" xmlns="http://www.w3.org/2000/svg" width="195.182" height="195.184" viewBox="0 0 195.182 195.184">
                <path id="Path_459" data-name="Path 459" d="M124.48,224.709c22.237,0,36.138-9.137,36.138-31.174,0-19.856-13.5-30.381-36.138-30.381H98.389a97.167,97.167,0,0,0-21.751,61.4c0,.052,0,.105,0,.157H124.48Z" transform="translate(-76.638 -126.959)" fill="#9fab96"/>
                <path id="Path_460" data-name="Path 460" d="M143.523,193.426c0,.27.038.507.042.77h-.042v.025c0,12.3,5.191,21.008,14.512,25.86a71.681,71.681,0,0,1,23.61-3.579H226.89a97.111,97.111,0,0,0-21.526-53.453H179.659C157.025,163.049,143.523,173.57,143.523,193.426Z" transform="translate(-32.07 -127.029)" fill="#9fab96"/>
                <path id="Path_461" data-name="Path 461" d="M123.535,204.978H76.864a97.582,97.582,0,0,0,97.216,89.3q2.555,0,5.081-.132l-28.624-45.878Z" transform="translate(-76.487 -99.09)" fill="#9fab96"/>
                <path id="Path_462" data-name="Path 462" d="M166.114,270.221v-.8c0-13.832,5.624-23.985,15.489-30.4-9.865-6.415-15.489-16.565-15.489-30.4v-.795c0-25.417,18.865-38.518,48.447-38.518h16.285a97.53,97.53,0,0,0-136.722.177h16.717c29.584,0,48.449,13.1,48.449,38.519,0,23.627-14.694,35.938-36.336,38.717l55.764,88.54a97.3,97.3,0,0,0,52.127-26.527H214.562C184.979,308.739,166.114,295.636,166.114,270.221Z" transform="translate(-64.986 -141.433)" fill="#9fab96"/>
                <path id="Path_463" data-name="Path 463" d="M179.659,200.012c-8.615,0-15.9,1.536-21.624,4.521-9.322,4.852-14.512,13.557-14.512,25.857,0,.272.038.508.042.772h-.042v.027c0,19.856,13.5,30.377,36.136,30.377h25.705a97.165,97.165,0,0,0,21.887-61.553H179.659Z" transform="translate(-32.07 -102.399)" fill="#9fab96"/>
            </svg>
        `;

        var wordMarkSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="872.06" height="143.359" viewBox="0 0 872.06 143.359">
                <g id="Group_96" data-name="Group 96" transform="translate(-523.97 -576.412)">
                    <path id="Path_451" data-name="Path 451" d="M311.448,295.893c.4.8,0,1.391-.795,1.391h-9.33a2.007,2.007,0,0,1-1.391-.795l-10.525-17.077-27-43.285H226.467l.4,59.965a1.053,1.053,0,0,1-1.193,1.191h-8.138a1.053,1.053,0,0,1-1.191-1.191l.4-72.078-.4-64.529a1.053,1.053,0,0,1,1.191-1.191h43.682c29.583,0,48.449,13.1,48.449,38.519,0,23.629-14.694,35.938-36.336,38.719ZM226.864,166.435l-.4,58.175v3.378H263.2c22.239,0,36.138-9.135,36.138-31.174,0-19.856-13.5-30.379-36.138-30.379Z" transform="translate(307.629 420.302)" fill="#9e685b"/>
                    <path id="Path_452" data-name="Path 452" d="M332.207,227.869c0-43.682,23.429-70.885,61.948-70.885,26.408,0,49.64,12.908,55.2,48.249.2.993-.2,1.39-.992,1.39h-7.945a1.448,1.448,0,0,1-1.388-1.19c-4.371-28.793-22.636-40.111-45.07-40.111-32.365,0-51.032,25.217-51.032,62.746,0,43.282,19.458,63.936,51.032,63.936,25.612,0,44.077-14.7,46.063-43.09a1.147,1.147,0,0,1,1.191-1.191h8.14c.793,0,1.195.4.993,1.39-3.178,33.359-25.018,51.23-56.192,51.23C354.841,300.343,332.207,274.928,332.207,227.869Z" transform="translate(384.836 419.428)" fill="#9e685b"/>
                    <path id="Path_453" data-name="Path 453" d="M407.392,228.465c0-44.278,25.415-71.481,63.934-71.481,38.321,0,63.738,27,63.738,71.676,0,44.478-25.615,71.683-63.938,71.683S407.392,272.743,407.392,228.465Zm116.949.195c0-39.509-20.649-63.338-53.215-63.338-32.762,0-53.013,23.829-53.013,63.338S438.763,292,471.126,292C503.692,292,524.341,268.374,524.341,228.66Z" transform="translate(434.935 419.428)" fill="#9e685b"/>
                    <path id="Path_454" data-name="Path 454" d="M568.517,290.334v5.759a1.056,1.056,0,0,1-1.2,1.191H492.467a1.056,1.056,0,0,1-1.195-1.191l.4-74.459-.4-62.148a1.056,1.056,0,0,1,1.195-1.191h8.14a1.053,1.053,0,0,1,1.191,1.191l-.6,62.148.6,67.51h65.521A1.055,1.055,0,0,1,568.517,290.334Z" transform="translate(490.828 420.302)" fill="#9e685b"/>
                    <path id="Path_455" data-name="Path 455" d="M531.427,228.465c0-44.278,25.415-71.481,63.939-71.481,38.316,0,63.734,27,63.734,71.676,0,44.478-25.613,71.683-63.939,71.683S531.427,272.743,531.427,228.465Zm116.952.195c0-39.509-20.649-63.338-53.218-63.338-32.757,0-53.011,23.829-53.011,63.338S562.8,292,595.161,292C627.73,292,648.379,268.374,648.379,228.66Z" transform="translate(517.585 419.428)" fill="#9e685b"/>
                    <path id="Path_456" data-name="Path 456" d="M612.808,228.465c0-44.278,25.613-71.481,59.958-71.481,28.994,0,49.047,15.289,55.006,44.478.195.991-.4,1.39-1.191,1.39h-8.147a1.266,1.266,0,0,1-1.191-.993c-4.559-24.224-21.044-36.536-44.271-36.536-28.6,0-49.447,23.235-49.447,63.338,0,39.316,20.849,63.344,49.642,63.344,31.572,0,47.657-22.044,47.657-55.4H673.361a1.144,1.144,0,0,1-1.19-1.19v-5.561a1.056,1.056,0,0,1,1.19-1.195h56.393c.6,0,1.191.4,1.191,1.393.8,44.275-19.258,70.29-57.779,70.29C638.223,300.343,612.808,272.743,612.808,228.465Z" transform="translate(571.812 419.428)" fill="#9e685b"/>
                    <path id="Path_457" data-name="Path 457" d="M723.952,296.093l.2-48.844-44.673-87.565c-.4-.993,0-1.39.792-1.39H689.4a1.322,1.322,0,0,1,1.386.792l39.117,78.233,39.511-78.233a1.339,1.339,0,0,1,1.4-.792h8.138c.792,0,1.188.4.792,1.39l-45.463,88.16.195,48.249a1.054,1.054,0,0,1-1.191,1.191h-8.14A1.051,1.051,0,0,1,723.952,296.093Z" transform="translate(616.131 420.302)" fill="#9e685b"/>
                    <path id="Path_458" data-name="Path 458" d="M368.038,289.45H322.9c-22.634,0-36.136-10.521-36.136-30.378v-.027h.042c0-.263-.042-.5-.042-.772,0-12.3,5.191-21,14.512-25.857,5.729-2.984,13.009-4.521,21.624-4.521h36.2c.06,0,.078-.04.13-.043a1.027,1.027,0,0,0,1.068-1.148v-5.757a1.056,1.056,0,0,0-1.2-1.191H324.888a71.68,71.68,0,0,0-23.61,3.579c-9.322-4.852-14.512-13.561-14.512-25.86v-.025h.042c0-.263-.042-.5-.042-.77,0-19.856,13.5-30.377,36.136-30.377h44.536a1.057,1.057,0,0,0,1.2-1.193v-5.757a1.054,1.054,0,0,0-1.2-1.19h-42.55c-29.583,0-48.449,13.1-48.449,38.518v.795c0,13.836,5.624,23.985,15.489,30.4-9.865,6.412-15.489,16.565-15.489,30.4v.8c0,25.415,18.866,38.518,48.449,38.518h43.15a1.055,1.055,0,0,0,1.2-1.191v-5.757A1.054,1.054,0,0,0,368.038,289.45Z" transform="translate(347.675 420.215)" fill="#9e685b"/>
                </g>
            </svg>
        `;

        var waveSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="27.531" height="170.08" viewBox="0 0 27.531 170.08">
        <g id="Group_97" data-name="Group 97" transform="translate(-572.169 -465.9)">
          <path id="Path_882" data-name="Path 882" d="M599.7,468.067q-.54-1.08-1.073-2.167h-.565q.81,1.658,1.638,3.3Z" fill="#919b83"/>
          <path id="Path_883" data-name="Path 883" d="M599.7,473.52c-1.307-2.5-2.6-5.047-3.86-7.62h-.565c1.44,2.947,2.926,5.852,4.425,8.708Z" fill="#919b83"/>
          <path id="Path_884" data-name="Path 884" d="M599.7,478.786c-2.236-4.184-4.495-8.489-6.647-12.886h-.565c2.331,4.773,4.791,9.443,7.212,13.962Z" fill="#919b83"/>
          <path id="Path_885" data-name="Path 885" d="M599.7,485.058v-1.073c-.2-.379-.4-.747-.6-1.128-2.926-5.44-5.975-11.121-8.831-16.957H589.7c2.887,5.912,5.975,11.665,8.936,17.172C599,483.742,599.343,484.393,599.7,485.058Z" fill="#919b83"/>
          <path id="Path_886" data-name="Path 886" d="M599.345,489.6l.355.68v-1.088q-1.659-3.132-3.39-6.337c-2.926-5.44-5.975-11.121-8.832-16.957h-.564c2.888,5.912,5.975,11.665,8.936,17.172Q597.626,486.375,599.345,489.6Z" fill="#919b83"/>
          <path id="Path_887" data-name="Path 887" d="M596.557,489.6q.946,1.8,1.866,3.567l.592,1.131c.23.441.456.882.685,1.323v-1.1l-.224-.433-.59-1.131q-.921-1.76-1.867-3.567-1.71-3.228-3.5-6.535c-2.925-5.44-5.974-11.121-8.831-16.957h-.564c2.888,5.912,5.975,11.665,8.935,17.172C594.247,485.274,595.419,487.452,596.557,489.6Z" fill="#919b83"/>
          <path id="Path_888" data-name="Path 888" d="M597.918,635.98h.517c.144-.981.3-1.961.469-2.941q.364-2.079.8-4.156V626.5c-.477,2.152-.925,4.307-1.3,6.463C598.221,633.966,598.064,634.973,597.918,635.98Z" fill="#919b83"/>
          <path id="Path_889" data-name="Path 889" d="M593.769,489.6q.948,1.8,1.867,3.567l.591,1.131q1.767,3.383,3.473,6.77v-1.121q-1.482-2.933-3.012-5.859l-.589-1.131q-.921-1.76-1.868-3.567c-1.139-2.152-2.311-4.331-3.5-6.535-2.925-5.44-5.974-11.121-8.831-16.957h-.563c2.887,5.912,5.973,11.665,8.934,17.172C591.46,485.274,592.631,487.452,593.769,489.6Z" fill="#919b83"/>
          <path id="Path_890" data-name="Path 890" d="M595.131,635.98h.517c.144-.981.3-1.961.469-2.941.92-5.24,2.174-10.478,3.583-15.677V615.42c-1.617,5.808-3.059,11.67-4.09,17.541C595.434,633.966,595.277,634.973,595.131,635.98Z" fill="#919b83"/>
          <path id="Path_891" data-name="Path 891" d="M590.982,489.6q.949,1.8,1.868,3.567l.59,1.131c2.171,4.156,4.283,8.31,6.26,12.5v-1.19c-1.845-3.858-3.8-7.689-5.8-11.521l-.59-1.131q-.921-1.76-1.868-3.567c-1.138-2.152-2.31-4.331-3.5-6.535-2.926-5.44-5.975-11.121-8.831-16.957h-.563c2.886,5.912,5.974,11.665,8.935,17.172C588.673,485.274,589.843,487.452,590.982,489.6Z" fill="#919b83"/>
          <path id="Path_892" data-name="Path 892" d="M592.344,635.98h.518c.144-.981.3-1.961.469-2.941a220.961,220.961,0,0,1,6.369-25.371v-1.759a230.627,230.627,0,0,0-6.877,27.052C592.646,633.966,592.49,634.973,592.344,635.98Z" fill="#919b83"/>
          <path id="Path_893" data-name="Path 893" d="M590.036,632.961c-.177,1.005-.333,2.012-.479,3.019h.517c.144-.981.3-1.961.469-2.941,1.97-11.226,5.44-22.441,8.8-33.289l.359-1.162v-1.732q-.425,1.377-.853,2.761C595.485,610.477,592.011,621.705,590.036,632.961Z" fill="#919b83"/>
          <path id="Path_894" data-name="Path 894" d="M588.2,489.6q.947,1.8,1.865,3.567l.592,1.131c3.232,6.187,6.339,12.369,9.047,18.678v-1.3c-2.6-5.933-5.54-11.758-8.586-17.589l-.59-1.131c-.613-1.173-1.232-2.364-1.868-3.567-1.137-2.152-2.309-4.331-3.5-6.535-2.925-5.44-5.974-11.121-8.83-16.957h-.563c2.886,5.912,5.973,11.665,8.934,17.172Q586.481,486.375,588.2,489.6Z" fill="#919b83"/>
          <path id="Path_895" data-name="Path 895" d="M587.249,632.961c-.177,1.005-.333,2.012-.48,3.019h.519c.144-.981.3-1.961.469-2.941,1.969-11.226,5.44-22.441,8.8-33.289,1.077-3.48,2.137-6.917,3.146-10.322v-1.809c-1.151,3.951-2.386,7.946-3.64,12C592.7,610.477,589.224,621.705,587.249,632.961Z" fill="#919b83"/>
          <path id="Path_896" data-name="Path 896" d="M585.409,489.6q.946,1.8,1.865,3.567l.592,1.131A221.208,221.208,0,0,1,599.7,519.95v-1.492a230.557,230.557,0,0,0-11.373-24.368l-.59-1.131q-.918-1.76-1.868-3.567c-1.139-2.152-2.31-4.331-3.5-6.535-2.926-5.44-5.975-11.121-8.83-16.957h-.565c2.887,5.912,5.974,11.665,8.935,17.172Q583.692,486.375,585.409,489.6Z" fill="#919b83"/>
          <path id="Path_897" data-name="Path 897" d="M582.622,489.6q.948,1.8,1.866,3.567l.59,1.131c5.829,11.158,11.268,22.3,14.622,34.213v-1.869c-3.393-11.3-8.6-21.917-14.159-32.554l-.591-1.131q-.918-1.76-1.867-3.567c-1.14-2.152-2.311-4.331-3.5-6.535-2.448-4.551-4.982-9.274-7.418-14.112v1.132c2.294,4.518,4.665,8.93,6.958,13.195C580.311,485.274,581.483,487.452,582.622,489.6Z" fill="#919b83"/>
          <path id="Path_898" data-name="Path 898" d="M584.462,632.961c-.177,1.005-.333,2.012-.48,3.019h.519c.143-.981.3-1.961.469-2.941,1.968-11.226,5.441-22.441,8.8-33.289,2.141-6.921,4.23-13.675,5.932-20.33v-2.133c-1.781,7.3-4.07,14.713-6.428,22.33C589.911,610.477,586.436,621.705,584.462,632.961Z" fill="#919b83"/>
          <path id="Path_899" data-name="Path 899" d="M579.834,489.6c.634,1.2,1.253,2.392,1.867,3.567l.591,1.131c7.994,15.3,15.273,30.562,17.408,47.859v-3.572c-2.631-15.927-9.476-30.2-16.945-44.5l-.592-1.131q-.917-1.76-1.867-3.567c-1.139-2.152-2.311-4.331-3.5-6.535-1.525-2.834-3.082-5.737-4.63-8.69v1.087c1.4,2.651,2.8,5.263,4.172,7.818C577.524,485.274,578.7,487.452,579.834,489.6Z" fill="#919b83"/>
          <path id="Path_900" data-name="Path 900" d="M581.675,632.961c-.177,1.005-.333,2.012-.48,3.019h.519c.143-.981.3-1.961.469-2.941,1.968-11.226,5.439-22.441,8.8-33.289,3.578-11.557,7-22.646,8.721-33.59v-3.687c-1.463,12.087-5.248,24.329-9.215,37.144C587.124,610.477,583.649,621.705,581.675,632.961Z" fill="#919b83"/>
          <path id="Path_901" data-name="Path 901" d="M598.054,553.8c.009-.512.013-1.028.013-1.535,0,.507-.005,1.023-.014,1.535-.279,14.988-4.933,30.023-9.861,45.945-3.357,10.848-6.828,22.063-8.8,33.289,1.97-11.226,5.443-22.441,8.8-33.289C593.12,583.828,597.774,568.793,598.054,553.8Z" fill="#919b83"/>
          <path id="Path_902" data-name="Path 902" d="M597.278,545.607c-1.529-18.735-9.251-34.993-17.773-51.307C588.026,510.614,595.749,526.872,597.278,545.607Z" fill="#919b83"/>
          <path id="Path_903" data-name="Path 903" d="M577.047,489.6q.948,1.8,1.866,3.567l.592,1.131c8.522,16.314,16.244,32.572,17.773,51.307.219,2.677.311,5.405.261,8.19-.278,14.924-4.923,29.931-9.841,45.82-3.36,10.86-6.836,22.088-8.81,33.344-.177,1.005-.333,2.012-.48,3.019h.518c.143-.981.3-1.961.468-2.941,1.97-11.226,5.441-22.441,8.8-33.289,4.928-15.922,9.582-30.957,9.861-45.945.009-.512.014-1.028.014-1.535,0-21.7-8.556-39.909-18.1-58.18l-.59-1.131q-.918-1.76-1.868-3.567c-1.138-2.152-2.311-4.331-3.495-6.535q-.917-1.7-1.844-3.434v1.071l1.385,2.578C574.737,485.274,575.908,487.452,577.047,489.6Z" fill="#919b83"/>
          <path id="Path_904" data-name="Path 904" d="M576.127,493.169l.59,1.131c9.741,18.644,18.435,37.216,18.035,59.5-.277,14.924-4.923,29.931-9.841,45.82-3.361,10.86-6.836,22.088-8.81,33.344-.177,1.005-.333,2.012-.48,3.019h.519c.143-.981.3-1.961.468-2.941,1.969-11.226,5.44-22.441,8.8-33.289,4.927-15.922,9.581-30.957,9.861-45.945.009-.512.013-1.028.013-1.535,0-21.7-8.555-39.909-18.1-58.18l-.591-1.131q-.918-1.76-1.867-3.567c-.831-1.571-1.694-3.171-2.553-4.77v1.072c.7,1.3,1.41,2.621,2.092,3.908Q575.209,491.406,576.127,493.169Z" fill="#919b83"/>
          <path id="Path_905" data-name="Path 905" d="M573.821,633.039c1.969-11.226,5.44-22.441,8.8-33.289,4.928-15.922,9.582-30.957,9.861-45.945.009-.512.014-1.028.014-1.535,0-21.7-8.557-39.909-18.1-58.18l-.59-1.131c-.535-1.026-1.081-2.07-1.633-3.12v1.1c.391.747.786,1.5,1.171,2.235l.591,1.131c9.739,18.644,18.433,37.216,18.034,59.5-.279,14.924-4.923,29.931-9.841,45.82-3.361,10.86-6.836,22.088-8.811,33.344-.176,1.005-.333,2.012-.479,3.019h.518C573.5,635,573.649,634.019,573.821,633.039Z" fill="#919b83"/>
          <path id="Path_906" data-name="Path 906" d="M589.692,553.8c.01-.512.014-1.028.014-1.535,0-21.268-8.224-39.184-17.537-57.091v1.1c9.312,17.985,17.393,36.026,17.008,57.519-.278,14.924-4.922,29.931-9.84,45.82-2.564,8.282-5.189,16.78-7.168,25.34v2.381c2.019-9.313,4.874-18.577,7.662-27.588C584.759,583.828,589.413,568.793,589.692,553.8Z" fill="#919b83"/>
          <path id="Path_907" data-name="Path 907" d="M586.905,553.8c.01-.512.014-1.028.014-1.535,0-19.118-6.643-35.525-14.75-51.654v1.136c8.078,16.2,14.567,32.73,14.221,52.045-.278,14.924-4.922,29.931-9.84,45.82-1.488,4.8-2.99,9.682-4.381,14.6V616.1c1.522-5.51,3.212-10.974,4.875-16.347C581.972,583.828,586.626,568.793,586.905,553.8Z" fill="#919b83"/>
          <path id="Path_908" data-name="Path 908" d="M584.118,553.8c.01-.512.014-1.028.014-1.535,0-16.867-5.177-31.624-11.963-45.941v1.191c6.726,14.385,11.739,29.247,11.433,46.277-.277,14.924-4.921,29.931-9.839,45.82q-.8,2.574-1.594,5.177v1.757q1.038-3.419,2.088-6.8C579.185,583.828,583.839,568.793,584.118,553.8Z" fill="#919b83"/>
          <path id="Path_909" data-name="Path 909" d="M581.345,552.27c0-14.468-3.812-27.38-9.176-39.8v1.307c5.267,12.459,8.908,25.443,8.646,40.017-.255,13.707-4.2,27.487-8.646,41.954v1.737c4.66-15.087,8.9-29.407,9.162-43.683C581.341,553.293,581.345,552.777,581.345,552.27Z" fill="#919b83"/>
          <path id="Path_910" data-name="Path 910" d="M578.558,552.27a92.833,92.833,0,0,0-6.389-32.883v1.506a90.97,90.97,0,0,1,5.86,32.9c-.2,10.736-2.664,21.518-5.86,32.638v1.846c3.444-11.761,6.163-23.133,6.374-34.476C578.552,553.293,578.558,552.777,578.558,552.27Z" fill="#919b83"/>
          <path id="Path_911" data-name="Path 911" d="M572.169,527.807h0a87.627,87.627,0,0,1,3.6,24.462A87.6,87.6,0,0,0,572.169,527.807Z" fill="#919b83"/>
          <path id="Path_912" data-name="Path 912" d="M575.77,552.27a87.627,87.627,0,0,0-3.6-24.462v1.9a86.123,86.123,0,0,1,3.072,24.089,105.166,105.166,0,0,1-3.072,22.078v2.175a109.45,109.45,0,0,0,3.587-24.245C575.766,553.293,575.77,552.777,575.77,552.27Z" fill="#919b83"/>
          <path id="Path_913" data-name="Path 913" d="M572.983,552.27a83.339,83.339,0,0,0-.814-11.548v4.651a82.364,82.364,0,0,1,.285,8.424c-.033,1.792-.133,3.586-.285,5.382v4.646a87.628,87.628,0,0,0,.8-10.02C572.978,553.293,572.983,552.777,572.983,552.27Z" fill="#919b83"/>
        </g>
      </svg>            
        `;
      

        // Set the layers - testing purposes only
        layers.push(
            new ShapeLayer({
                x_mm : 0,
                y_mm : 0,
                width_mm : 10,
                height_mm : 65,
                color: '#9FAA95',
                svg : waveSvg,
                ctx : labelContext,
                z : 1
            }),
            new ShapeLayer({
                x_mm : 13,
                y_mm: 24,
                width_mm: 33.3,
                height_mm: 5.474,
                color: '#9E685B',
                svg : wordMarkSvg,
                ctx : labelContext,
                z : 2
            }),
            new ShapeLayer({
                x_mm : 13,
                y_mm: 5,
                width_mm: 10,
                height_mm: 10,
                color: '#9FAA95',
                svg : logoSvg,
                ctx : labelContext,
                z : 2
            }),
            new TextLayer({
                x_mm : 13,
                y_mm : 30,
                fontSize_mm : 8,
                font : 'Forma DJR Banner',
                fontWeight : '300',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'SHAMPOO',
                color : '#000000',
                ctx : labelContext,
                z : 0,
            }),
            new TextLayer({
                x_mm : 155,
                y_mm : 20,
                fontSize_mm : 5,
                font : 'Open Sans',
                fontWeight : '400',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'Product2\nName',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),
            new TextLayer({
                x_mm : 13,
                y_mm : 40,
                fontSize_mm : 2.5,
                font : 'Typewriter Condensed',
                fontWeight : '600',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'FOR:',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),
            new TextLayer({
                x_mm : 22,
                y_mm : 40,
                fontSize_mm : 2.5,
                font : 'Typewriter Condensed',
                fontWeight : '400',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'All hair types',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),     
            new TextLayer({
                x_mm : 13,
                y_mm : 43,
                fontSize_mm : 2.5,
                font : 'Typewriter Condensed',
                fontWeight : '600',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'WITH:',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),
            new TextLayer({
                x_mm : 22,
                y_mm : 43,
                fontSize_mm : 1.8,
                font : 'Typewriter Condensed',
                fontWeight : '400',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'Marula, Prickly Pear, Kalahari\nMelon, Shea Butter, Baobab',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),           
            new TextLayer({
                x_mm : 13,
                y_mm : 50,
                fontSize_mm : 2.2,
                font : 'Typewriter Condensed',
                fontWeight : '400',
                fontStyle : 'normal',
                fontVariant : 'normal',
                align : 'left',
                text : 'Moisturizes and strengthens hair\nwith organic, natural ingredients',
                color : '#000000',
                ctx : labelContext,
                z : 1
            }),
            new ShapeLayer({
                x_mm : 13,
                y_mm: 48,
                width_mm: 33.3,
                height_mm: 0.25,
                color: '#9E685B',
                ctx : labelContext,
                z : 2,
                svg : '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="1" viewBox="0 0 300 1"><rect id="Rectangle_105" data-name="Rectangle 105" width="300" height="1"/></svg>',
            }),
            new ShapeLayer({
                x_mm : 13,
                y_mm: 38,
                width_mm: 33.3,
                height_mm: 0.25,
                color: '#9E685B',
                ctx : labelContext,
                z : 2,
                svg : '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="1" viewBox="0 0 300 1"><rect id="Rectangle_105" data-name="Rectangle 105" width="300" height="1"/></svg>',
            })
        );    

        
        // Set the intitial scroll
        if( !labelView )
            scrollAmount = 0.99;

        // Set the product area context
        productArea.ctx = ctx;
        boundingBox.ctx = ctx;

        // Load the product image frames
        for(var i = 0; i < productImageFrameLength; i++) {
            productImageFrames[i] = new Image();
            productImageFrames[i].src = ProductImageFrames('./' + i + '.png').default;
        }

        // Once the first image has loaded, set the source
        currentProductImageFrame = 0;
        productImageFrames[currentProductImageFrame].onload = function() {
            productArea.src = productImageFrames[currentProductImageFrame];
        }

        // Once the last image has loaded, draw the preview
        productImageFrames[productImageFrameLength - 1].onload = function() {
            draw();
        }

    }

    const draw = () => {
        // Calculate positions
        onResizeHandler();

        // Clear the whole canvas and fill with the background colour
        ctx.clearRect(0,0, bgRef.current.width, bgRef.current.height );
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, bgRef.current.width, bgRef.current.height );

        // Reset anything that needs resetting
        ctx.globalCompositeOperation = 'source-over';

        // Draw the product background
        if( !labelView ) {
            // Set the product background image
            productArea.src = productImageFrames[ Math.floor( (productImageFrameLength - 1) * scrollAmount ) ];
            productArea.draw();
        }

        // Draw the label background
        labelBackground.draw();

        // Clip the preview area
        /*
        ctx.save()
        ctx.beginPath()
        ctx.rect(previewArea.x, previewArea.y, previewArea.width, previewArea.height);
        ctx.closePath();
        ctx.clip();
        */

        ctx.fillStyle = '#ffffff';

        // Draw the layers
        for( var i = 0; i < layers.length; i++ ) {
            // Draw relative to the label
            // labelContext.save();
            // labelContext.scale( layers[i].scaleX, layers[i].scaleY );
            layers[i].drawRelative();
            // labelContext.restore();

            /*
            if( layers[i] instanceof TextLayer == true ) {
                break;
            } else if (layers[i] instanceof ImageLayer == true ) {
                break;
            } else if( layers[i] instanceof TextLayer == true ) {
                break;
            }
            */
        }

        // Put the label & a wraparound clone onto the main canvas
        ctx.drawImage(labelCanvas, labelArea.x, labelArea.y, labelArea.width, labelArea.height);
        if( !labelView || zoom > 100 ) {
            ctx.drawImage(labelCanvas, labelArea.x + maxScroll, labelArea.y);
        }

        ctx.restore();

        // Draw the selection box
        /*
        if( dragging & !scrolling ) {
            ctx.strokeStyle = 'orange';
            ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = 'orange';
            ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
            ctx.globalAlpha = 1;
        }
        */
        selectionBox.draw();

        // Draw the bounding box
        // resetBoundingBox();
        boundingBox.drawAbsolute();

        // ctx.fillStyle = 'black';
        // ctx.fillRect(lastMouseMoveLocation.x - 5, lastMouseMoveLocation.y - 5, 10, 10);

        // If we're editing a layer, draw the toolbar
        /*
        if( editingLayer ) {
            ctx.fillStyle = 'blue';
        }
        */

    }

    useEffect(() => {
        init();

        // Observe resize to scale accordingly
        new ResizeObserver( () => {
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

    return  <div className="editor-container" id="editor-container">
                <canvas id="background" className="background" ref={bgRef} />
                <ul className="toolbar" id="text-toolbar">
                    <li>
                        <span>Font:</span>
                        <select id="font-input" onChange={changeFont}>
                            <option value="Arial">Arial</option>
                            <option value="Georgia" >Georgia</option>
                            <option value="Open Sans" >Open Sans</option>
                        </select>
                    </li>
                    <li>
                        <span>Letter Height (mm):</span>
                        <input type="number" id="letter-height" name="letter-height" defaultValue="5" step="1" min="1" max="20" onChange={resizeFont} />
                    </li>
                    <li>
                        <span>Stretch X:</span>
                        <input type="number" id="letter-stretch" name="letter-stretch" defaultValue="1" step="0.1" min="0.01" max="10" onChange={stretchFont} />
                    </li>
                    <li>
                        <span>Font Style:</span>
                        <input type="checkbox" id="toggle-bold" onChange={toggleBold} />
                        <input type="checkbox" id="toggle-underline" onChange={toggleUnderline} />
                        <input type="checkbox" id="toggle-italic" onChange={toggleItalic} />
                    </li>
                    <li>
                        <span>Colour:</span>
                        <input type="color" value="#000000" id="color-select" onChange={changeColor} />
                    </li>
                    <li>
                        <span>Rotate:</span>
                        <button type="rotate" onClick={rotateClockwise}>90</button>
                    </li>
                </ul>
                <div className="controls">
                    <input type="range" id="zoom" name="zoom" min="50" max="200" defaultValue={zoom} step="10" onChange={handleZoom} /><span id="zoom-text">{zoom} %</span>
                    <button onClick={scrollFront}>F</button>
                    <button onMouseDown={scrollLeftStart} onMouseUp={scrollIntervalEnd}>L</button>
                    <button onMouseDown={scrollRightStart} onMouseUp={scrollIntervalEnd}>R</button>
                    <button onClick={scrollBack}>B</button>
                    <button onClick={toggleLabelView}>Change View</button>
                </div>
                {}
            </div>
}

export default Editor