import { FeatureValue } from '@darkfeature/sdk-javascript'

export function hasValue(value: FeatureValue): boolean {
  return value !== null && value !== undefined
}
