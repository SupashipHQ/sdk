import {
  Component,
  Input,
  TemplateRef,
  inject,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { Subscription } from 'rxjs'
import { FeatureService } from './services'
import { FeatureOptions, QueryResult } from './types'
import { FeatureValue } from '@darkfeature/sdk-javascript'
import { hasValue } from './utils'

@Component({
  selector: 'dark-feature',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container [ngSwitch]="currentVariation()">
      <ng-container *ngFor="let variation of variationKeys">
        <ng-container *ngSwitchCase="variation">
          <ng-container
            *ngTemplateOutlet="
              variations[variation];
              context: { $implicit: featureData(), variation: variation }
            "
          ></ng-container>
        </ng-container>
      </ng-container>
    </ng-container>
  `,
})
export class DarkFeatureComponent implements OnInit, OnDestroy {
  @Input({ required: true }) feature!: string
  @Input() fallback?: FeatureValue
  @Input() context?: Record<string, unknown>
  @Input() shouldFetch = true
  @Input({ required: true }) variations!: Record<string, TemplateRef<unknown>>
  @Input() loading?: string

  private readonly featureService = inject(FeatureService)
  private subscription?: Subscription

  protected readonly featureData = signal<FeatureValue>(null)
  protected readonly isLoading = signal<boolean>(false)

  protected readonly currentVariation = computed(() => {
    if (this.isLoading() && this.loading && this.variations[this.loading]) {
      return this.loading
    }

    if (this.isLoading()) {
      return null
    }

    const effectiveValue = hasValue(this.featureData())
      ? this.featureData()
      : (this.fallback ?? null)

    if (!hasValue(effectiveValue)) {
      return null
    }

    const valueKey = String(effectiveValue)
    return this.variations[valueKey] ? valueKey : null
  })

  protected readonly variationKeys = computed(() => Object.keys(this.variations || {}))

  ngOnInit(): void {
    const options: FeatureOptions = {
      fallback: this.fallback,
      context: this.context,
      shouldFetch: this.shouldFetch,
    }

    this.subscription = this.featureService
      .getFeature(this.feature, options)
      .subscribe((result: QueryResult<FeatureValue>) => {
        this.featureData.set(result.data ?? null)
        this.isLoading.set(result.isLoading)
      })
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe()
  }
}
