'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import './SecDialog.css'

interface SecDialogProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (question1: string, answer1: string, question2: string, answer2: string) => void
    onVerify: (answer1: string, answer2: string) => void
}

export function SecDialog({ isOpen, onClose, onSubmit, onVerify }: SecDialogProps) {
    const [question1, setQuestion1] = useState('')
    const [answer1, setAnswer1] = useState('')
    const [question2, setQuestion2] = useState('')
    const [answer2, setAnswer2] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errors, setErrors] = useState<{
        question1?: string
        answer1?: string
        question2?: string
        answer2?: string
    }>({})
    const [isVerifying, setIsVerifying] = useState(true)

    const securityQuestions = [
        "What was the name of your first pet?",
        "In which city were you born?",
        "What was your mother's maiden name?",
        "What was the name of your first school?",
        "What is your favorite book?",
        "What was your childhood nickname?",
        "What is the name of the street you grew up on?",
        "What is your favorite movie?"
    ]

    const validateForm = () => {
        const newErrors: typeof errors = {}

        if (isVerifying) {
            if (!answer1) newErrors.answer1 = 'Answer is required'
            if (!answer2) newErrors.answer2 = 'Answer is required'
        } else {
            if (!question1) newErrors.question1 = 'Please select a security question'
            if (!answer1) newErrors.answer1 = 'Answer is required'
            if (!question2) newErrors.question2 = 'Please select a security question'
            if (!answer2) newErrors.answer2 = 'Answer is required'
            if (question1 === question2) newErrors.question2 = 'Please select a different question'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return

        try {
            setIsLoading(true)
            if (isVerifying) {
                await onVerify(answer1, answer2)
            } else {
                await onSubmit(question1, answer1, question2, answer2)
            }
        } catch (error) {
            console.error('Security questions error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    if (typeof window !== 'undefined') {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
    }

    return (
        <div className={`secDialog ${isOpen ? 'open' : ''}`} onClick={handleBackgroundClick}>
            <div className="sec-container">
                <div className="sec-card">
                    <div className="sec-header">
                        {!isVerifying ? 
                        <h1 className="sec-title">Set Security Questions</h1>
                        :
                        <h1 className="sec-title">Answer Security Questions</h1>
                        }
                        <p className="sec-subtitle">
                            {!isVerifying 
                                ? 'This will be used each time to access your "Tailor" account'
                                : 'Please answer your security questions to continue'
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="sec-form">
                        {!isVerifying ? (
                            <>
                                <div className="form-group">
                                    <label htmlFor="question1" className="form-label">Security Question 1</label>
                                    <select
                                        id="question1"
                                        className="form-select"
                                        value={question1}
                                        onChange={(e) => setQuestion1(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select a question</option>
                                        {securityQuestions.map((q) => (
                                            <option key={q} value={q}>{q}</option>
                                        ))}
                                    </select>
                                    {errors.question1 && <span className="form-error">{errors.question1}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="answer1" className="form-label">Answer 1</label>
                                    <input
                                        id="answer1"
                                        type="text"
                                        className="form-input"
                                        value={answer1}
                                        onChange={(e) => setAnswer1(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    {errors.answer1 && <span className="form-error">{errors.answer1}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="question2" className="form-label">Security Question 2</label>
                                    <select
                                        id="question2"
                                        className="form-select"
                                        value={question2}
                                        onChange={(e) => setQuestion2(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select a question</option>
                                        {securityQuestions.map((q) => (
                                            <option key={q} value={q}>{q}</option>
                                        ))}
                                    </select>
                                    {errors.question2 && <span className="form-error">{errors.question2}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="answer2" className="form-label">Answer 2</label>
                                    <input
                                        id="answer2"
                                        type="text"
                                        className="form-input"
                                        value={answer2}
                                        onChange={(e) => setAnswer2(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    {errors.answer2 && <span className="form-error">{errors.answer2}</span>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label htmlFor="answer1" className="form-label">Answer 1</label>
                                    <input
                                        id="answer1"
                                        type="text"
                                        className="form-input"
                                        value={answer1}
                                        onChange={(e) => setAnswer1(e.target.value)}
                                        disabled={isLoading}
                                        placeholder="Enter your answer to the first security question"
                                    />
                                    {errors.answer1 && <span className="form-error">{errors.answer1}</span>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="answer2" className="form-label">Answer 2</label>
                                    <input
                                        id="answer2"
                                        type="text"
                                        className="form-input"
                                        value={answer2}
                                        onChange={(e) => setAnswer2(e.target.value)}
                                        disabled={isLoading}
                                        placeholder="Enter your answer to the second security question"
                                    />
                                    {errors.answer2 && <span className="form-error">{errors.answer2}</span>}
                                </div>
                            </>
                        )}

                        <button type="submit" className="submit-button" disabled={isLoading}>
                            {isLoading && <Loader2 className="loading-spinner" size={16} />}
                            {!isVerifying ? 'Save Security Questions' : 'Verify Answers'}
                        </button>
                    </form>

                    <div className="sec-footer">
                        {!isVerifying ? (
                            <>
                                
                                <a href="#" onClick={() => setIsVerifying(true)}> Already set up security questions?</a>
                            </>
                        ) : (
                            <>
                                <a href="#" onClick={() => setIsVerifying(false)}>Set up security questions now!</a>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
