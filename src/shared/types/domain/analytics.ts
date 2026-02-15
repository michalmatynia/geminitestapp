import type {
  AnalyticsEventDto,
  AnalyticsSummaryDto,
  CreateAnalyticsEventDto,
  AnalyticsScopeDto,
  AnalyticsEventTypeDto,
  AnalyticsUtmDto,
  AnalyticsViewportDto,
  AnalyticsScreenDto,
  AnalyticsConnectionInfoDto
} from '../../contracts/analytics';
export type { 
  AnalyticsEventDto, 
  AnalyticsSummaryDto, 
  CreateAnalyticsEventDto,
  AnalyticsScopeDto,
  AnalyticsEventTypeDto,
  AnalyticsUtmDto,
  AnalyticsViewportDto,
  AnalyticsScreenDto,
  AnalyticsConnectionInfoDto
};

export type AnalyticsScope = AnalyticsScopeDto;

export type AnalyticsEventType = AnalyticsEventTypeDto;

export type AnalyticsUtm = AnalyticsUtmDto;

export type AnalyticsViewport = AnalyticsViewportDto;

export type AnalyticsScreen = AnalyticsScreenDto;

export type AnalyticsConnectionInfo = AnalyticsConnectionInfoDto;

export type AnalyticsEventCreateInput = CreateAnalyticsEventDto;
