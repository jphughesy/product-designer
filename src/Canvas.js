import React, { useRef, useEffect } from 'react'

const Canvas = props => {
  
    const { draw, ...rest } = props
    const canvasRef = useRef(null)

    useEffect(() => {
    
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        new ResizeObserver( () => {
            var canvas = canvasRef.current
            var dpr = window.devicePixelRatio || 1
            var rect = canvas.getBoundingClientRect()
            canvas.width = rect.width * dpr
            canvas.height = rect.height * dpr
            draw(context, frameCount)
        }).observe(canvas);

        let frameCount = 0
        let animationFrameId
    
        const render = () => {
            frameCount++
            draw(context, frameCount)
            animationFrameId = window.requestAnimationFrame(render)
        }

        render()
    
        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }

    }, [draw] )
  
    return <canvas id="mockup" className="mockup" ref={canvasRef} {...rest} />
}

export default Canvas