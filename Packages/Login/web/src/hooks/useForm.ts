import { useState, useCallback, useMemo } from 'react'
import { UseFormReturn, FormState } from '../types'

export interface FormConfig<T> {
    initialValues: T
    validate?: (values: T) => Record<keyof T, string>
    onSubmit?: (values: T) => Promise<void>
}

export function useForm<T extends Record<string, any>>(config: FormConfig<T>): UseFormReturn<T> {
    // 状态管理
    const [values, setValuesState] = useState<T>(config.initialValues)
    const [errors, setErrorsState] = useState<Record<keyof T, string>>({} as Record<keyof T, string>)
    const [touched, setTouchedState] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // 计算属性
    const isDirty = useMemo(() => {
        return JSON.stringify(values) !== JSON.stringify(config.initialValues)
    }, [values, config.initialValues])

    const isValid = useMemo(() => {
        return Object.values(errors).every(error => !error)
    }, [errors])

    // 方法
    const setValue = useCallback((field: keyof T, value: any) => {
        setValuesState(prev => ({ ...prev, [field]: value }))
        // 清除该字段的错误
        if (errors[field]) {
            setErrorsState(prev => ({ ...prev, [field]: '' }))
        }
    }, [errors])

    const setValues = useCallback((newValues: Partial<T>) => {
        setValuesState(prev => ({ ...prev, ...newValues }))
    }, [])

    const setError = useCallback((field: keyof T, error: string) => {
        setErrorsState(prev => ({ ...prev, [field]: error }))
    }, [])

    const setErrors = useCallback((newErrors: Record<keyof T, string>) => {
        setErrorsState(newErrors)
    }, [])

    const setTouched = useCallback((field: keyof T, touchedValue: boolean) => {
        setTouchedState(prev => ({ ...prev, [field]: touchedValue }))
    }, [])

    const setTouchedAll = useCallback((touchedValue: boolean) => {
        const newTouched = {} as Record<keyof T, boolean>
        Object.keys(values).forEach(key => {
            newTouched[key as keyof T] = touchedValue
        })
        setTouchedState(newTouched)
    }, [values])

    // 事件处理
    const handleChange = useCallback((field: keyof T) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
        setValue(field, value)
    }, [setValue])

    const handleBlur = useCallback((field: keyof T) => () => {
        setTouched(field, true)

        // 如果配置了验证函数，执行验证
        if (config.validate) {
            const validationErrors = config.validate(values)
            if (validationErrors[field]) {
                setError(field, validationErrors[field])
            }
        }
    }, [setTouched, setError, values, config.validate])

    const handleSubmit = useCallback((onSubmit?: (values: T) => Promise<void>) => {
        return async (event?: React.FormEvent) => {
            if (event) {
                event.preventDefault()
            }

            setIsSubmitting(true)

            try {
                // 标记所有字段为已触摸
                setTouchedAll(true)

                // 执行验证
                if (config.validate) {
                    const validationErrors = config.validate(values)
                    setErrors(validationErrors)

                    // 如果有错误，停止提交
                    if (Object.values(validationErrors).some(error => error)) {
                        return
                    }
                }

                // 调用提交函数
                const submitFn = onSubmit || config.onSubmit
                if (submitFn) {
                    await submitFn(values)
                }
            } catch (error) {
                console.error('Form submission error:', error)
            } finally {
                setIsSubmitting(false)
            }
        }
    }, [values, config.validate, config.onSubmit, setErrors, setTouchedAll])

    // 工具方法
    const reset = useCallback(() => {
        setValuesState(config.initialValues)
        setErrorsState({} as Record<keyof T, string>)
        setTouchedState({} as Record<keyof T, boolean>)
        setIsSubmitting(false)
    }, [config.initialValues])

    const resetErrors = useCallback(() => {
        setErrorsState({} as Record<keyof T, string>)
    }, [])

    const validate = useCallback(() => {
        if (!config.validate) return true

        const validationErrors = config.validate(values)
        setErrors(validationErrors)

        return Object.values(validationErrors).every(error => !error)
    }, [values, config.validate, setErrors])

    const getFieldError = useCallback((field: keyof T): string => {
        return errors[field] || ''
    }, [errors])

    const hasFieldError = useCallback((field: keyof T): boolean => {
        return !!errors[field]
    }, [errors])

    const isFieldTouched = useCallback((field: keyof T): boolean => {
        return !!touched[field]
    }, [touched])

    return {
        // 状态
        values,
        errors,
        touched,
        isValid,
        isDirty,
        isSubmitting,
        // 方法
        setValue,
        setValues,
        setError,
        setErrors,
        setTouched,
        setTouchedAll,
        // 事件处理
        handleChange,
        handleBlur,
        handleSubmit,
        // 工具方法
        reset,
        resetErrors,
        validate,
        getFieldError,
        hasFieldError,
        isFieldTouched
    }
}

// 简化表单Hook
export function useSimpleForm<T extends Record<string, any>>(initialValues: T) {
    return useForm<T>({ initialValues })
}

// 字段Hook
export function useField<T>(initialValue: T) {
    const [value, setValue] = useState<T>(initialValue)
    const [error, setError] = useState<string>('')
    const [touched, setTouched] = useState(false)

    const handleChange = useCallback((newValue: T) => {
        setValue(newValue)
        if (error) setError('')
    }, [error])

    const handleBlur = useCallback(() => {
        setTouched(true)
    }, [])

    const reset = useCallback(() => {
        setValue(initialValue)
        setError('')
        setTouched(false)
    }, [initialValue])

    return {
        value,
        error,
        touched,
        handleChange,
        handleBlur,
        setError,
        reset
    }
} 