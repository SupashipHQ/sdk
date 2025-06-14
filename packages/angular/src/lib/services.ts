import { inject, Injectable, signal } from '@angular/core'
import { Observable, of, timer } from 'rxjs'
import { catchError, map, retry, tap, startWith, shareReplay } from 'rxjs/operators'
import { DarkFeatureService } from './providers'
import { FeatureOptions, FeaturesOptions, QueryResult } from './types'
import { FeatureValue } from '@darkfeature/sdk-javascript'
import { hasValue } from './utils'

const STALE_TIME = 5 * 60 * 1000 // 5 minutes
const CACHE_TIME = 10 * 60 * 1000 // 10 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
  observable: Observable<T>
}

class QueryCache {
  private cache = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): Observable<T> | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check if stale
    if (Date.now() - entry.timestamp > STALE_TIME) {
      this.cache.delete(key)
      return undefined
    }

    return entry.observable as Observable<T>
  }

  set<T>(key: string, observable: Observable<T>): Observable<T> {
    const sharedObservable = observable.pipe(
      tap(data => {
        // Update cache entry with new data and timestamp
        const entry = this.cache.get(key)
        if (entry) {
          entry.data = data
          entry.timestamp = Date.now()
        }
      }),
      shareReplay(1)
    )

    this.cache.set(key, {
      data: undefined,
      timestamp: Date.now(),
      observable: sharedObservable,
    })

    // Auto-cleanup after cache time
    timer(CACHE_TIME).subscribe(() => {
      this.cache.delete(key)
    })

    return sharedObservable
  }

  invalidate(keyPrefix: string): void {
    for (const [key] of this.cache) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

const queryCache = new QueryCache()

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  private readonly darkFeatureService = inject(DarkFeatureService)

  private createQueryResult<T>(
    observable: Observable<T>,
    initialData?: T
  ): Observable<QueryResult<T>> {
    const isLoading = signal(true)
    const isError = signal(false)
    const isSuccess = signal(false)
    const error = signal<Error | null>(null)
    const data = signal<T | undefined>(initialData)

    return observable.pipe(
      map(result => {
        isLoading.set(false)
        isSuccess.set(true)
        isError.set(false)
        error.set(null)
        data.set(result)

        return {
          data: result,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
          isIdle: false,
          isFetching: false,
          status: 'success' as const,
        }
      }),
      catchError(err => {
        isLoading.set(false)
        isSuccess.set(false)
        isError.set(true)
        error.set(err)

        return of({
          data: data(),
          error: err,
          isLoading: false,
          isSuccess: false,
          isError: true,
          isIdle: false,
          isFetching: false,
          status: 'error' as const,
        })
      }),
      startWith({
        data: initialData,
        error: null,
        isLoading: !initialData,
        isSuccess: !!initialData,
        isError: false,
        isIdle: !initialData,
        isFetching: true,
        status: initialData ? ('success' as const) : ('loading' as const),
      })
    )
  }

  getFeature(
    featureKey: string,
    options: FeatureOptions = {}
  ): Observable<QueryResult<FeatureValue>> {
    const { fallback, context, shouldFetch = true } = options

    if (!shouldFetch) {
      return of({
        data: fallback ?? null,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isIdle: true,
        isFetching: false,
        status: 'idle',
      })
    }

    const cacheKey = `feature-${featureKey}-${JSON.stringify(context)}`
    const cached = queryCache.get<FeatureValue>(cacheKey)

    if (cached) {
      return this.createQueryResult(cached, fallback)
    }

    const client = this.darkFeatureService.getClient()
    const observable = new Observable<FeatureValue>(subscriber => {
      client
        .getFeature(featureKey, { context })
        .then(value => {
          const result = hasValue(value) ? value : (fallback ?? null)
          subscriber.next(result)
          subscriber.complete()
        })
        .catch(error => {
          if (fallback !== undefined) {
            subscriber.next(fallback)
            subscriber.complete()
          } else {
            subscriber.error(error)
          }
        })
    }).pipe(retry({ count: 3, delay: 1000 }))

    const cachedObservable = queryCache.set(cacheKey, observable)
    return this.createQueryResult(cachedObservable, fallback)
  }

  getFeatures(options: FeaturesOptions): Observable<QueryResult<Record<string, FeatureValue>>> {
    const { features, context, shouldFetch = true } = options
    const fallbackFeatures = features

    if (!shouldFetch) {
      return of({
        data: fallbackFeatures,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
        isIdle: true,
        isFetching: false,
        status: 'idle',
      })
    }

    const cacheKey = `features-${Object.keys(features).sort().join(',')}-${JSON.stringify(context)}`
    const cached = queryCache.get<Record<string, FeatureValue>>(cacheKey)

    if (cached) {
      return this.createQueryResult(cached, fallbackFeatures)
    }

    const client = this.darkFeatureService.getClient()
    const observable = new Observable<Record<string, FeatureValue>>(subscriber => {
      client
        .getFeatures({ features, context })
        .then(result => {
          const mergedResult: Record<string, FeatureValue> = {}
          for (const [key, fallback] of Object.entries(features)) {
            mergedResult[key] = hasValue(result[key]) ? result[key] : fallback
          }
          subscriber.next(mergedResult)
          subscriber.complete()
        })
        .catch(() => {
          subscriber.next(fallbackFeatures)
          subscriber.complete()
        })
    }).pipe(retry({ count: 3, delay: 1000 }))

    const cachedObservable = queryCache.set(cacheKey, observable)
    return this.createQueryResult(cachedObservable, fallbackFeatures)
  }

  invalidateFeature(featureKey: string): void {
    queryCache.invalidate(`feature-${featureKey}`)
  }

  invalidateAllFeatures(): void {
    queryCache.clear()
  }
}
