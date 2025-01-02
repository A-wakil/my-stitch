import * as React from "react"
import './custom-components.css'

export const CustomButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    className={`custom-button ${className || ''}`}
    ref={ref}
    {...props}
  />
))
CustomButton.displayName = "CustomButton"

export const CustomInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    className={`custom-input ${className || ''}`}
    ref={ref}
    {...props}
  />
))
CustomInput.displayName = "CustomInput"

export const CustomTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={`custom-textarea ${className || ''}`}
    ref={ref}
    {...props}
  />
))
CustomTextarea.displayName = "CustomTextarea"

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ className, ...props }) => (
  <label className={`custom-label ${className || ''}`} {...props} />
)

