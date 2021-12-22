import React from 'react';

const addText = () => {

}

const addImage = () => {
    
}

const EditorMenu = (props) => {
    return (
        <div className="menu-page--inner">
              <h1>Editor Menu</h1>
              <button onClick={addText()}>Add Text</button>
              <button onClick={addImage()}>Add Image</button>
        </div>
    )
}

export default EditorMenu