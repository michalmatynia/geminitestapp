import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurPanelIntro,
  KangurSelectField,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { cn } from '@/shared/utils';

export function KangurParentDashboardLearnerManagementWidget(): React.JSX.Element | null {
  const {
    activeLearner,
    canAccessDashboard,
    createForm,
    editForm,
    feedback,
    handleCreateLearner,
    handleSaveLearner,
    isSubmitting,
    learners,
    selectLearner,
    updateCreateField,
    updateEditField,
  } = useKangurParentDashboardRuntime();
  const { entry: learnerManagementContent } = useKangurPageContentEntry(
    'parent-dashboard-learner-management'
  );

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel className='flex flex-col gap-5' padding='lg' surface='mistStrong' variant='soft'>
        <KangurPanelIntro
          className='gap-1.5'
          eyebrow='Profile uczniów'
          title={
            learnerManagementContent?.title ?? 'Zarządzaj profilami bez opuszczania panelu'
          }
          titleAs='h2'
          titleClassName='text-lg font-bold tracking-[-0.02em]'
          description={
            learnerManagementContent?.summary ??
            'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.'
          }
          descriptionClassName='max-w-2xl'
        />

        <div className='grid gap-3 min-[420px]:grid-cols-2'>
          {learners.map((learner) => {
            const isActiveLearner = learner.id === activeLearner?.id;
            const initial = learner.displayName.trim().charAt(0).toUpperCase() || '?';
            return (
              <KangurIconSummaryOptionCard
                accent='indigo'
                aria-pressed={isActiveLearner}
                buttonClassName='rounded-[30px] px-5 py-4 text-left'
                data-doc-id='parent_learner_profile_card'
                data-testid={`parent-dashboard-learner-card-${learner.id}`}
                emphasis={isActiveLearner ? 'accent' : 'neutral'}
                key={learner.id}
                onClick={() => void selectLearner(learner.id)}
              >
                <KangurIconSummaryCardContent
                  aside={
                    <KangurStatusChip
                      accent={learner.status === 'active' ? 'emerald' : 'slate'}
                      className='uppercase tracking-wide'
                      size='sm'
                    >
                      {learner.status === 'active' ? 'Aktywny' : 'Wyłączony'}
                    </KangurStatusChip>
                  }
                  asideClassName='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'
                  className='w-full items-center'
                  contentClassName='min-w-0 flex-1'
                  description={`Login: ${learner.loginName}`}
                  descriptionClassName='text-xs'
                  footer={
                    <div
                      className={cn(
                        'text-xs font-semibold',
                        isActiveLearner
                          ? 'text-indigo-600'
                          : '[color:var(--kangur-page-muted-text)]'
                      )}
                    >
                      {isActiveLearner
                        ? 'Aktualnie wybrany profil'
                        : 'Kliknij, aby przełączyć profil'}
                    </div>
                  }
                  footerClassName='mt-2'
                  headerClassName='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'
                  icon={
                    <KangurIconBadge
                      accent={isActiveLearner ? 'indigo' : 'slate'}
                      className='shrink-0 text-lg font-extrabold'
                      data-testid={`parent-dashboard-learner-icon-${learner.id}`}
                      size='md'
                    >
                      {initial}
                    </KangurIconBadge>
                  }
                  title={learner.displayName}
                  titleClassName='font-bold leading-normal'
                />
              </KangurIconSummaryOptionCard>
            );
          })}
        </div>

        <KangurGlassPanel className='flex flex-col gap-4' padding='md' surface='solid' variant='subtle'>
          <KangurPanelIntro
            eyebrow='Nowy profil'
            description='Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.'
          />

          <div className='grid gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3'>
            <KangurTextField
              accent='indigo'
              value={createForm.displayName}
              onChange={(event) => updateCreateField('displayName', event.target.value)}
              placeholder='Imie ucznia'
            />
            <KangurTextField
              accent='indigo'
              value={createForm.loginName}
              onChange={(event) => updateCreateField('loginName', event.target.value)}
              placeholder='Login ucznia'
            />
            <KangurTextField
              accent='indigo'
              type='password'
              value={createForm.password}
              onChange={(event) => updateCreateField('password', event.target.value)}
              placeholder='Haslo ucznia'
            />
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
            <KangurButton
              className='w-full sm:w-auto'
              disabled={isSubmitting}
              onClick={() => void handleCreateLearner()}
              size='sm'
              variant='surface'
              data-doc-id='parent_create_learner'
            >
              Dodaj ucznia
            </KangurButton>
            {feedback ? <div className='text-sm [color:var(--kangur-page-muted-text)]'>{feedback}</div> : null}
          </div>
        </KangurGlassPanel>
      </KangurGlassPanel>

      {activeLearner ? (
        <KangurGlassPanel className='flex flex-col gap-4' padding='lg' surface='mistSoft' variant='soft'>
          <KangurPanelIntro
            eyebrow='Wybrany profil'
            description={
              <>
                Aktualizujesz dane ucznia{' '}
                <span className='font-semibold [color:var(--kangur-page-text)]'>
                  {activeLearner.displayName}
                </span>
                .
              </>
            }
          />
          <div className='grid gap-3 min-[420px]:grid-cols-2'>
            <KangurTextField
              accent='indigo'
              value={editForm.displayName}
              onChange={(event) => updateEditField('displayName', event.target.value)}
              placeholder='Imie ucznia'
            />
            <KangurTextField
              accent='indigo'
              value={editForm.loginName}
              onChange={(event) => updateEditField('loginName', event.target.value)}
              placeholder='Login ucznia'
            />
            <KangurTextField
              accent='indigo'
              type='password'
              value={editForm.password}
              onChange={(event) => updateEditField('password', event.target.value)}
              placeholder='Nowe hasło (opcjonalnie)'
            />
            <KangurSelectField
              accent='indigo'
              value={editForm.status}
              onChange={(event) =>
                updateEditField(
                  'status',
                  event.target.value === 'disabled' ? 'disabled' : 'active'
                )
              }
            >
              <option value='active'>Aktywny</option>
              <option value='disabled'>Wyłączony</option>
            </KangurSelectField>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center'>
            <KangurButton
              className='w-full sm:w-auto'
              disabled={isSubmitting}
              onClick={() => void handleSaveLearner()}
              size='sm'
              variant='surface'
              data-doc-id='parent_save_learner'
            >
              Zapisz ucznia
            </KangurButton>
            <div className='text-xs [color:var(--kangur-page-muted-text)]'>
              Login i hasło należą do ucznia, ale konto pozostaje własnością rodzica.
            </div>
          </div>
        </KangurGlassPanel>
      ) : null}
    </div>
  );
}
