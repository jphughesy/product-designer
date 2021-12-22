import React from 'react';

const ProductMenu = (props) => {

    return (
        <div className="menu-page--inner">

            <h1>Product Name</h1>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tellus nisl, venenatis eu lacus nec, convallis sodales orci. Nunc malesuada magna eget ipsum lobortis condimentum. </p>
            <a href="#">View Product Details</a>
            
            <fieldset>
                {props.attributes.map(attribute => (
                    <div key={attribute.key} className="field">
                        <label htmlFor={attribute.key}>{attribute.label}</label>
                        <select name={attribute.key} id={attribute.key} onChange={attribute.onchange}>
                        {attribute.options.map(option => (
                            <option key={option.key} value={option.value} disabled={option.disabled ? 'disabled' : ''}>{option.label}</option>
                        ))}
                        </select>
                    </div>
                ))}
            </fieldset>
        </div>   
    )

}

export default ProductMenu