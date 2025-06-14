# @darkfeature/sdk-angular

DarkFeature SDK for Angular applications using standalone components.

## Installation

```bash
npm install @darkfeature/sdk-angular
```

## Setup

Configure the DarkFeature providers in your Angular application:

```typescript
import { bootstrapApplication } from '@angular/platform-browser'
import { provideDarkFeature } from '@darkfeature/sdk-angular'
import { AppComponent } from './app/app.component'

bootstrapApplication(AppComponent, {
  providers: [
    provideDarkFeature({
      apiKey: 'your-api-key',
      context: {
        userId: '123',
        version: '1.0.0',
      },
    }),
    // other providers...
  ],
})
```

## Usage

### Using Services

```typescript
import { Component, inject, OnInit } from '@angular/core'
import { FeatureService } from '@darkfeature/sdk-angular'
import { Observable } from 'rxjs'

@Component({
  selector: 'app-example',
  template: `
    <div *ngIf="featureResult$ | async as result">
      <div *ngIf="result.isLoading">Loading...</div>
      <div *ngIf="result.isSuccess">Feature value: {{ result.data }}</div>
      <div *ngIf="result.isError">Error: {{ result.error?.message }}</div>
    </div>
  `,
})
export class ExampleComponent implements OnInit {
  private readonly featureService = inject(FeatureService)
  featureResult$!: Observable<any>

  ngOnInit() {
    this.featureResult$ = this.featureService.getFeature('homepage-variant', {
      fallback: 'default',
      context: { userId: '123' },
    })
  }
}
```

### Using Standalone Components

```typescript
import { Component } from '@angular/core'
import { DarkFeatureComponent } from '@darkfeature/sdk-angular'

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DarkFeatureComponent],
  template: `
    <dark-feature
      feature="homepage-variant"
      [fallback]="'default'"
      [context]="{ userId: '123' }"
      [variations]="variations"
      loading="loading"
    >
    </dark-feature>

    <ng-template #newDesign>
      <div>New Homepage Design!</div>
    </ng-template>

    <ng-template #default>
      <div>Default Homepage</div>
    </ng-template>

    <ng-template #loading>
      <div>Loading...</div>
    </ng-template>
  `,
})
export class HomeComponent {
  variations = {
    'new-design': this.newDesign,
    default: this.default,
    loading: this.loading,
  }
}
```

### Multiple Features

```typescript
import { Component, inject, OnInit } from '@angular/core'
import { FeatureService } from '@darkfeature/sdk-angular'

@Component({
  selector: 'app-dashboard',
  template: `
    <div *ngIf="featuresResult$ | async as result">
      <div *ngIf="result.isLoading">Loading features...</div>
      <div *ngIf="result.isSuccess">
        <div>Theme: {{ result.data?.theme }}</div>
        <div>Sidebar: {{ result.data?.sidebar }}</div>
        <div>Notifications: {{ result.data?.notifications }}</div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly featureService = inject(FeatureService)
  featuresResult$!: Observable<any>

  ngOnInit() {
    this.featuresResult$ = this.featureService.getFeatures({
      features: {
        theme: 'light',
        sidebar: false,
        notifications: true,
      },
      context: { userId: '123' },
    })
  }
}
```

## API

### Providers

- `provideDarkFeature(config, plugins?)` - Configure DarkFeature for dependency injection

### Services

- `FeatureService` - Main service for feature flag operations

  - `getFeature(key, options?)` - Get a single feature flag
  - `getFeatures(options)` - Get multiple feature flags
  - `invalidateFeature(key)` - Invalidate a feature from cache
  - `invalidateAllFeatures()` - Clear all feature cache

- `DarkFeatureService` - Low-level service for client access
  - `getClient()` - Get the DarkFeature client instance
  - `updateContext(context, merge?)` - Update feature evaluation context
  - `getContext()` - Get current context

### Components

- `<dark-feature>` - Standalone component for conditional rendering
  - Input: `feature` (required) - Feature flag key
  - Input: `fallback` - Fallback value
  - Input: `context` - Evaluation context
  - Input: `variations` (required) - Template variations
  - Input: `loading` - Loading state template key

## Requirements

- Angular 16.0.0 or higher
- RxJS 7.0.0 or higher

## License

MIT
