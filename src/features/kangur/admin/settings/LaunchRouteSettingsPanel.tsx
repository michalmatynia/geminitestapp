import { FormSection, Badge, Button } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../components/KangurAdminCard';

export function LaunchRouteSettingsPanel({ launchRoute, setLaunchRoute, options, activeTarget, className }: any) {
  return (
    <FormSection
      title='App launch route'
      description='Switch the default Kangur launch target.'
      className={className}
    >
      <KangurAdminCard>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='text-sm font-semibold text-foreground'>Default launch route</div>
            <Badge variant={launchRoute === 'dedicated_app' ? 'warning' : 'secondary'}>
              {launchRoute === 'dedicated_app' ? 'Dedicated app' : 'Mobile web view'}
            </Badge>
          </div>
          <div className='grid gap-3 md:grid-cols-2'>
            {options.map((option: any) => {
              const isActive = launchRoute === option.value;
              return (
                <Button
                  key={option.value}
                  variant={isActive ? 'secondary' : 'outline'}
                  className='h-auto min-h-28 w-full flex-col items-start justify-start gap-3 whitespace-normal px-4 py-4 text-left'
                  onClick={() => setLaunchRoute(option.value)}
                >
                  <span className='text-sm font-semibold'>{option.label}</span>
                  <span className='text-xs leading-relaxed text-muted-foreground'>{option.description}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </KangurAdminCard>
    </FormSection>
  );
}
