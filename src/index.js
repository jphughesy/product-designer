import React from 'react'
import ReactDOM from 'react-dom'
import { fabric } from "fabric"
import { FabricJSCanvas, useFabricJSEditor } from "fabricjs-react"

// Styles
import './fonts.css'
import './index.css'

// Icons
import {ReactComponent as BackIcon} from './img/back-icon.svg'
import {ReactComponent as BottleIcon} from './img/bottle-icon.svg'
import {ReactComponent as UploadIcon} from './img/upload-icon.svg'
import {ReactComponent as GalleryIcon} from './img/gallery-icon.svg'
import {ReactComponent as PencilIcon} from './img/pencil-icon.svg'

// Bottle images
import ProductImage from './img/bottle-mockup.png'

// Label images
import LabelImageGlossy from './img/label-material-glossy.webp'
import LabelImagePlant from './img/label-material-plant.webp'
import LabelImageRock from './img/label-material-rock.webp'

// Menus
import ProductMenu from './menus/ProductMenu'
import UploadMenu from './menus/UploadMenu'
import TemplateMenu from './menus/TemplateMenu'
import EditorMenu from './menus/EditorMenu'

// Canvas for preview
import PreviewCanvas from './Canvas'
import Editor from './EditorNew'

let productImg = new Image()
productImg.src = ProductImage

let backgroundImg = new Image()
backgroundImg.src = LabelImageGlossy

var imgRatio;
productImg.onload = () => {
    imgRatio = productImg.height/productImg.width
}

// Define dimensions (in mm)
var productHeight = 145
var productWidth = 65
var previewHeight = 70
var previewWidth = 60
var previewX = 5.5
var previewY = 58

// Layers
var layers = [
    {
        'type' : 'text',
        'text' : 'Test text',
        'x' : 0,
        'y' : 0,
        'width' : 100,
        'height' : 20
    }
]

const changePreviewBackground = (img) => {
    backgroundImg.src = img
}

const drawPreview = (ctx, frameCount) => {
        var height, width

        if( ctx.canvas.width * imgRatio > ctx.canvas.height ) {
            height = ctx.canvas.height
            width = ctx.canvas.height/imgRatio
        } else {
            height = ctx.canvas.width*imgRatio
            width = ctx.canvas.width
        }

        let offsetX = ctx.canvas.width / 2 - width / 2
        let offsetY = ctx.canvas.height / 2 - height / 2
        let pxRatioW = width / productWidth
        let pxRatioH = height / productHeight

        // Draw the product
        ctx.drawImage(productImg, offsetX, offsetY, width, height)

        // Draw the preview area
        ctx.fillStyle = '#FAFAF7'
        ctx.fillRect(offsetX + previewX * pxRatioW, offsetY + previewY * pxRatioH, previewWidth * pxRatioW, previewHeight * pxRatioH)
        ctx.drawImage(backgroundImg, offsetX + previewX * pxRatioW, offsetY + previewY * pxRatioH, previewWidth * pxRatioW, previewHeight * pxRatioH)

        // Draw the layers
        for( var i = 0; i < layers.length; i++ ) {
            if( layers[i].type === 'text' ) {
                //ctx.font = '48px serif';
                //ctx.fillText( 'Hello world', 10, 50 )
            }
        }

}

class Window extends React.Component {
    render() {
        return (
            <div className="window" id="window">
                <Menu />
                <Preview />
            </div>
        );
    }
}

class Menu extends React.Component {

    constructor() {
        super()
        this.state = {
            menuPage: null,
            active: false
        }
    }

    changeLabel = (e) => {
        
        var img

        switch( e.target.value ) {
            case 'glossy':
                img = LabelImageGlossy
                break
            case 'plant':
                img = LabelImagePlant
                break
            case 'rock':
                img = LabelImageRock
                break
            default:
                img = LabelImageGlossy
                break
        }

        changePreviewBackground(img)

    }

    changeMenuPage = ( page ) => {

        let activeState = true

        if( this.state.menuPage === page && this.state.active === true )
            activeState = false

        this.setState(state => ({
            menuPage: page,
            active: activeState
        }))

    }

    toggleMenuPage = () => {
        this.setState(state => ({
            active: !this.state.active
        }))
    }

    showMenuPage = () => {
        switch( this.state.menuPage ) {
            case 'product' :

                // Define the product attributes
                let attributes = [
                    {
                        'key' : 'attribute_size',
                        'label' : 'Size',
                        'options' : [
                            {
                                'key' : 'attribute_size_0',
                                'label' : '50ml',
                                'value' : 0
                            },
                            {
                                'key' : 'attribute_size_1',
                                'label' : '240ml',
                                'value' : 1
                            },
                            {
                                'key' : 'attribute_size_2',
                                'label' : '950ml',
                                'value' : 2
                            }
                        ]
                     },                     {
                        'key' : 'attribute_bottle',
                        'label' : 'Bottle Type',
                        'options' : [
                            {
                                'key' : 'attribute_bottle_0',
                                'label' : 'Glass',
                                'value' : 0
                            },
                            {
                                'key' : 'attribute_bottle_1',
                                'label' : 'PCR Plastic',
                                'value' : 1
                            }
                        ]
                     },  
                     {
                        'key' : 'attribute_label',
                        'label' : 'Label Type',
                        'onchange' : this.changeLabel,
                        'options' : [
                            {
                                'key' : 'attribute_label_0',
                                'label' : 'Please Select One',
                                'value' : 0,
                                'disabled' : true
                            },
                            {
                                'key' : 'attribute_label_2',
                                'label' : 'Recycled Glossy',
                                'value' : 'glossy'
                            },
                            {
                                'key' : 'attribute_label_3',
                                'label' : 'Plant Paper',
                                'value' : 'plant'
                            },
                            {
                                'key' : 'attribute_label_4',
                                'label' : 'Rock Paper',
                                'value' : 'rock'
                            }
                        ]
                    }
                ]

                return( <ProductMenu attributes={attributes} /> )
            case 'upload' :
                return( <UploadMenu /> )
            case 'template' :
                return( <TemplateMenu /> )
            case 'editor' :
                return( <EditorMenu /> )
            default :
                break
        }
    }

    render() {
        return (
            <div className={`menu ${this.state.active ? 'menu--active' : ''}`}>
                <Nav activePage={this.state.menuPage} onItemClick={this.changeMenuPage} toggleMenu={this.toggleMenuPage}  />
                <div className={this.state.active ? 'menu-page menu-page--active' : 'menu-page'}>
                    {this.showMenuPage()}
                </div>
            </div>
        );
    }
}

/*
const LayerCanvas = () => {

    const { editor, onReady } = useFabricJSEditor()

    const onLoad = () => {
        ctx.drawImage(productImg, offsetX, offsetY, width, height)
    }
    const onAddCircle = () => {
        editor?.addCircle()
    }
    const onAddRectangle = () => {
        editor?.addRectangle()
    }
    const onAddText = () => {
        editor?.addText('Test')
    }
    return (
        <div className="layers">
            <button onClick={onAddCircle}>Add circle</button>
            <button onClick={onAddRectangle}>Add Rectangle</button>
            <button onClick={onAddText}>Add Text</button>
            <FabricJSCanvas className="sample-canvas" onReady={onReady} />
        </div>
    )
}
*/

class Preview extends React.Component {
    render() {
        return (
            <div className="preview" id="preview">
                {/* <PreviewCanvas draw={drawPreview} /> */}
                <Editor />
            </div>
        )
    }
}

class Nav extends React.Component {

    showBackButton = () => {
        if( this.props.activePage )
            return( <div className="nav-hide-menu-btn"  onClick={() => this.props.toggleMenu()}><BackIcon /></div> );
    }

    render() {
        return (
            <ul className="nav">
                <NavItem active={this.props.activePage === 'product' ? true : false} icon={<BottleIcon className="icon" />} label="Edit Product" onItemClick={this.props.onItemClick} menuPage="product" />
                <NavItem active={this.props.activePage === 'upload' ? true : false} icon={<UploadIcon className="icon" />} label="Upload Artwork" onItemClick={this.props.onItemClick} menuPage="upload" />
                <NavItem active={this.props.activePage === 'template' ? true : false} icon={<GalleryIcon className="icon" />} label="Browse Templates" onItemClick={this.props.onItemClick} menuPage="template" />
                <NavItem active={this.props.activePage === 'editor' ? true : false} icon={<PencilIcon className="icon" />} label="Edit Design" onItemClick={this.props.onItemClick} menuPage="editor" />
                {this.showBackButton()}
            </ul>
        )
    }
}

class NavItem extends React.Component {
    render() {
        return (
            <li className={this.props.active ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => this.props.onItemClick( this.props.menuPage )}>
                {this.props.icon}
                <span className="label">{this.props.label}</span>
            </li>
        )
    }
}

ReactDOM.render(
    <Window />,
    document.getElementById('root')  
);