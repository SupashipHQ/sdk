import { useDarkFeature } from './DarkFeatureProvider'

export const useFeature = async (
  featureKey: string,
  defaultValue: boolean = false
): Promise<boolean> => {
  const darkFeature = useDarkFeature()

  if (!darkFeature) {
    return defaultValue
  }

  try {
    const value = await darkFeature.getFeature(featureKey, defaultValue)
    return Boolean(value)
  } catch (error) {
    return defaultValue
  }
}
