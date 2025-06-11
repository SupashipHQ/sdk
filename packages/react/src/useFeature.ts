import { useState, useEffect } from 'react'
import { useDarkFeature } from './provider'

export const useFeature = (featureKey: string, defaultValue: boolean = false): boolean => {
  const [featureValue, setFeatureValue] = useState<boolean>(defaultValue)
  const darkFeature = useDarkFeature()

  useEffect(() => {
    if (!darkFeature) {
      setFeatureValue(defaultValue)
      return
    }

    const fetchFeature = async (): Promise<void> => {
      try {
        const value = await darkFeature.getFeature(featureKey, { fallback: defaultValue })
        setFeatureValue(Boolean(value))
      } catch (error) {
        setFeatureValue(defaultValue)
      }
    }

    fetchFeature()
  }, [darkFeature, featureKey, defaultValue])

  return featureValue
}
